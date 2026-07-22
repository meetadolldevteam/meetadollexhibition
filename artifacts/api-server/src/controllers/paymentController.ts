import { Request, Response } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { sendConfirmationEmail, sendPaymentAdminNotificationEmail } from "../services/email";
import { safeGenerateTicketPDF } from "../services/ticketGenerator";
import { AuthRequest } from "../middleware/auth";

const PAYSTACK_BASE = "https://api.paystack.co";

function getPaystackKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || key.trim() === "") return null;
  return key.trim();
}

export async function initiatePayment(req: AuthRequest, res: Response): Promise<void> {
  const paystackKey = getPaystackKey();
  if (!paystackKey) {
    res.status(503).json({ error: "Payment gateway not yet configured." });
    return;
  }

  const { reservation_id } = req.body;
  const user = req.user!;

  try {
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .select(`
        id, status, stall_id,
        stalls ( stall_number, price, package, exhibitions ( name, venue ) )
      `)
      .eq("id", reservation_id)
      .eq("user_id", user.id)
      .single();

    if (resError || !reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    if (reservation.status !== "held") {
      res.status(400).json({ error: "Reservation is not in held status" });
      return;
    }

    // ── One pending payment per reservation ───────────────────────────────────
    // Only a single pending payment row may exist for a reservation at any time.
    // We intentionally do NOT limit this to recently-created rows: a time-
    // windowed check (e.g. "newer than 30 minutes") can be exploited by
    // re-initiating just before the window closes, which refreshes the
    // holdCleanup grace period indefinitely. Blocking on *any* pending row
    // means a new attempt is only possible once the cleanup job has marked the
    // previous payment "failed" and released the hold — closing the indefinite-
    // squat vector entirely.
    const { data: existingPending } = await supabase
      .from("payments")
      .select("id")
      .eq("reservation_id", reservation_id)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      res.status(409).json({ error: "A payment is already in progress for this reservation. Please complete it or wait for it to expire before starting a new one." });
      return;
    }

    const stallData = (reservation as any).stalls;
    const reservationAmount = stallData?.price;

    if (typeof reservationAmount !== "number") {
      logger.error({ reservation_id }, "Could not resolve reservation amount from stall price");
      res.status(500).json({ error: "Something went wrong" });
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    const txRef = `MTD-${uuidv4()}`;

    const paystackResponse = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userData?.email ?? user.email,
        amount: Math.round(reservationAmount * 100),
        reference: txRef,
        callback_url: `https://meetadollexhibition.com/payment/callback`,
        metadata: {
          reservation_id,
          exhibition_name: stallData?.exhibitions?.name ?? "",
        },
      }),
    });

    const paystackData = (await paystackResponse.json()) as {
      status: boolean;
      data?: { authorization_url: string; access_code: string; reference: string };
      message?: string;
    };

    if (!paystackData.status || !paystackData.data?.authorization_url) {
      logger.error({ status: paystackData.status }, "Paystack payment initiation failed");
      res.status(502).json({ error: "Payment gateway error. Please try again." });
      return;
    }

    await supabase.from("payments").insert({
      id: uuidv4(),
      reservation_id,
      amount: reservationAmount,
      transaction_reference: txRef,
      gateway: "paystack",
      status: "pending",
    });

    res.json({ payment_link: paystackData.data.authorization_url, tx_ref: txRef });
  } catch (err) {
    logger.error({ err }, "Initiate payment error");
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function paymentWebhook(req: Request, res: Response): Promise<void> {
  const paystackKey = getPaystackKey();
  if (!paystackKey) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  // ── Signature verification — reject immediately if missing or invalid ───────
  const signature = req.headers["x-paystack-signature"];
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!rawBody) {
    res.status(400).json({ error: "Missing request body" });
    return;
  }

  if (!signature || typeof signature !== "string") {
    logger.warn("Webhook rejected: missing x-paystack-signature header");
    res.status(401).json({ error: "Missing webhook signature" });
    return;
  }

  const expectedSignature = crypto
    .createHmac("sha512", paystackKey)
    .update(rawBody)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    logger.warn("Webhook rejected: invalid signature");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const { event, data } = req.body;

  if (event !== "charge.success") {
    res.status(200).json({ message: "Event ignored" });
    return;
  }

  try {
    const verifyResponse = await fetch(`${PAYSTACK_BASE}/transaction/verify/${data.reference}`, {
      headers: { Authorization: `Bearer ${paystackKey}` },
    });

    const verifyData = (await verifyResponse.json()) as {
      status: boolean;
      data?: { status: string; reference: string; amount: number; id: number };
    };

    if (!verifyData.status || verifyData.data?.status !== "success") {
      logger.warn({ reference: data.reference }, "Payment verification failed");
      res.status(200).json({ message: "Payment not verified" });
      return;
    }

    const { reference, amount } = verifyData.data;
    const amountNaira = amount / 100;

    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("id, reservation_id, status")
      .eq("transaction_reference", reference)
      .single();

    if (paymentErr || !payment) {
      logger.error({ reference }, "Payment record not found");
      res.status(200).json({ message: "Payment record not found" });
      return;
    }

    // ── Idempotency / terminal-state guard ───────────────────────────────────
    // Reject any reference that has already reached a terminal state.
    // "failed" and "refunded" records must never be re-promoted to "successful"
    // by a late or replayed webhook.
    const TERMINAL_PAYMENT_STATUSES = ["successful", "failed", "refunded"];
    if (TERMINAL_PAYMENT_STATUSES.includes(payment.status)) {
      logger.info({ reference, status: payment.status }, "Webhook received for terminal payment — skipping");
      res.status(200).json({ message: "Already processed" });
      return;
    }

    // ── Reservation state guard ───────────────────────────────────────────────
    // Load the reservation first and verify it is still in `held` status before
    // touching anything. Expired, cancelled, or already-confirmed reservations
    // must not be resurrected by a late Paystack callback.
    const { data: reservation } = await supabase
      .from("reservations")
      .select(`
        id, stall_id, user_id, status,
        stalls ( stall_number, package, price, category, exhibitions ( name, venue, start_date ) ),
        users ( name, email, business_name )
      `)
      .eq("id", payment.reservation_id)
      .single();

    if (!reservation) {
      logger.warn({ reference, reservation_id: payment.reservation_id }, "Webhook: reservation not found — marking payment failed");
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("transaction_reference", reference);
      res.status(200).json({ message: "Reservation not found" });
      return;
    }

    if (reservation.status !== "held") {
      logger.warn(
        { reference, reservation_id: payment.reservation_id, reservation_status: reservation.status },
        "Webhook: reservation is not in held state — refusing to confirm"
      );
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("transaction_reference", reference);
      res.status(200).json({ message: "Reservation no longer eligible for confirmation" });
      return;
    }

    await supabase
      .from("payments")
      .update({ status: "successful", amount: amountNaira })
      .eq("transaction_reference", reference);

    if (reservation) {
      await supabase
        .from("reservations")
        .update({ status: "confirmed" })
        .eq("id", payment.reservation_id);

      await supabase
        .from("stalls")
        .update({ status: "reserved" })
        .eq("id", reservation.stall_id);

      const stall = (reservation as any).stalls;
      const exh = stall?.exhibitions;
      const vendor = (reservation as any).users;
      const stallPrice: number = stall?.price ?? amountNaira;
      const tier = stallPrice >= 250000 ? "Tier 1" : "Tier 2";

      const formattedDate = (() => {
        try {
          return new Date(exh?.start_date).toLocaleDateString("en-NG", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          });
        } catch {
          return exh?.start_date ?? "TBD";
        }
      })();

      const ticketPDF = await safeGenerateTicketPDF({
        vendorName: vendor?.name ?? vendor?.email ?? "Vendor",
        stallNumber: stall?.stall_number ?? "?",
        category: stall?.category ?? "N/A",
        tier,
        price: stallPrice,
        venue: exh?.venue ?? "TBD",
        date: formattedDate,
        code: reservation.id,
        checkin: "8:00 AM",
      });

      if (vendor?.email) {
        await sendConfirmationEmail({
          to: vendor.email,
          vendorName: vendor.name ?? vendor.email,
          reservationId: reservation.id,
          stallNumber: stall?.stall_number ?? "N/A",
          stallPackage: stall?.package ?? "standard",
          amountPaid: amountNaira,
          exhibitionName: exh?.name ?? "Meetadoll Exhibition",
          venue: exh?.venue ?? "TBD",
          date: exh?.start_date ?? "TBD",
          organizerContact: "+234 906 360 4449",
          ticketPDF,
        });
      }

      const paidAt = new Date().toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      void sendPaymentAdminNotificationEmail({
        vendorName: vendor?.name ?? vendor?.email ?? "Unknown",
        email: vendor?.email ?? "N/A",
        businessName: (vendor as any)?.business_name ?? "N/A",
        stallNumber: stall?.stall_number ?? "N/A",
        stallCategory: stall?.category ?? "N/A",
        stallPackage: stall?.package ?? "N/A",
        amountPaid: amountNaira,
        transactionReference: reference,
        reservationId: reservation.id,
        exhibitionName: exh?.name ?? "Meetadoll Exhibition",
        paidAt,
      });
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (err) {
    logger.error({ err }, "Webhook processing error");
    res.status(500).json({ error: "Something went wrong" });
  }
}
