import { Request, Response } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { cache } from "../lib/cache";
import { sendConfirmationEmail, sendPaymentAdminNotificationEmail } from "../services/email";
import { safeGenerateTicketPDF } from "../services/ticketGenerator";
import { AuthRequest } from "../middleware/auth";

const PAYSTACK_BASE = "https://api.paystack.co";

function getPaystackKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || key.trim() === "") return null;
  return key.trim();
}

function stallsCacheKey(exhibitionId: string): string {
  return `stalls:${exhibitionId}`;
}

function canVendorBookStall(
  vendorCategory: string | null | undefined,
  stallCategory: string | null | undefined
): boolean {
  if (!stallCategory) return true; // stall has no category restriction — allow all vendors
  if (!vendorCategory) return false; // stall is restricted but vendor has no category set — deny
  if (vendorCategory === "food") return stallCategory === "Food";
  if (vendorCategory === "fashion" || vendorCategory === "others") return stallCategory === "Fashion & Others";
  return true;
}

// ── Direct reserve + pay (no separate hold step) ─────────────────────────────
// Creates the reservation (held) and immediately initiates Paystack payment.
// On any failure after stall is claimed the stall is released back to available.
export async function initiateDirectPayment(req: AuthRequest, res: Response): Promise<void> {
  const paystackKey = getPaystackKey();
  if (!paystackKey) {
    res.status(503).json({ error: "Payment gateway not yet configured." });
    return;
  }

  const { stall_id } = req.body;
  const user = req.user!;

  try {
    // ── One-active-hold-per-user guard ────────────────────────────────────────
    const { data: existingHold } = await supabase
      .from("reservations")
      .select("id, stalls(stall_number)")
      .eq("user_id", user.id)
      .eq("status", "held")
      .limit(1)
      .maybeSingle();

    if (existingHold) {
      res.status(409).json({
        error: "You already have a stall reservation in progress. Complete or cancel it before reserving another.",
      });
      return;
    }

    // ── Fetch stall + user for category check ─────────────────────────────────
    const [stallCheck, userCheck] = await Promise.all([
      supabase.from("stalls").select("id, status, category, price, exhibition_id").eq("id", stall_id).single(),
      supabase.from("users").select("vendor_category, name, email, business_profile_complete").eq("id", user.id).single(),
    ]);

    if (stallCheck.error || !stallCheck.data) {
      res.status(404).json({ error: "Stall not found" });
      return;
    }

    const stallData = stallCheck.data as {
      id: string; status: string; category: string | null;
      price: number; exhibition_id: string;
    };
    const userData = userCheck.data as {
      vendor_category: string | null;
      name: string;
      email: string;
      business_profile_complete?: boolean;
    } | null;

    // ── Business profile gate ──────────────────────────────────────────────────
    // Vendors must complete their business profile before reserving a stall.
    if (!userData?.business_profile_complete) {
      res.status(403).json({
        error: "Please complete your business profile before reserving a stall.",
        code: "PROFILE_INCOMPLETE",
      });
      return;
    }

    if (!canVendorBookStall(userData?.vendor_category ?? null, stallData.category)) {
      res.status(403).json({
        error: "This stall is not available for your vendor category. Please select a stall in your category.",
      });
      return;
    }

    // ── Atomic stall claim ────────────────────────────────────────────────────
    const { data: claimedStall, error: claimError } = await supabase
      .from("stalls")
      .update({ status: "held" })
      .eq("id", stall_id)
      .eq("status", "available")
      .select("id, stall_number, price, exhibition_id")
      .maybeSingle();

    if (claimError) {
      logger.error({ err: claimError }, "Failed to claim stall for direct payment");
      res.status(500).json({ error: "Failed to reserve stall. Please try again." });
      return;
    }

    if (!claimedStall) {
      res.status(409).json({ error: "Sorry, this stall was just taken. Please select another." });
      return;
    }

    // ── Create reservation (held, 10-min window for Paystack) ─────────────────
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const reservationCode = `RES-${uuidv4().slice(0, 8).toUpperCase()}`;
    const reservationId = uuidv4();

    const { error: resError } = await supabase.from("reservations").insert({
      id: reservationId,
      user_id: user.id,
      stall_id,
      status: "held",
      hold_expires_at: holdExpiresAt,
      reservation_code: reservationCode,
    });

    if (resError) {
      logger.error({ err: resError }, "Reservation insert failed — releasing stall");
      await supabase.from("stalls").update({ status: "available" }).eq("id", stall_id);
      res.status(500).json({ error: "Failed to create reservation. Please try again." });
      return;
    }

    // ── Pre-generate tx reference and record pending payment FIRST ───────────
    // Inserting the pending payment record before calling Paystack ensures that
    // any concurrent self-cancellation attempt is blocked by the payment-status
    // guard in cancelMyReservation. Without this ordering a vendor could cancel
    // the held reservation in the gap between Paystack initiation and record
    // insertion, defeating the cancellation guard.
    const txRef = `MTD-${uuidv4()}`;
    const vendorEmail = userData?.email ?? user.email;
    const amount = claimedStall.price as number;
    const paymentId = uuidv4();

    // Load exhibition info for metadata
    const { data: stallExhData } = await supabase
      .from("stalls")
      .select("exhibitions(name)")
      .eq("id", stall_id)
      .single();
    const exhibitionName = (stallExhData as any)?.exhibitions?.name ?? "";

    const { error: paymentInsertErr } = await supabase.from("payments").insert({
      id: paymentId,
      reservation_id: reservationId,
      amount,
      transaction_reference: txRef,
      gateway: "paystack",
      status: "pending",
    });

    if (paymentInsertErr) {
      logger.error({ err: paymentInsertErr }, "Failed to insert pending payment — releasing reservation");
      await supabase.from("reservations").delete().eq("id", reservationId);
      await supabase.from("stalls").update({ status: "available" }).eq("id", stall_id);
      res.status(500).json({ error: "Failed to initiate payment. Please try again." });
      return;
    }

    const paystackResponse = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: vendorEmail,
        amount: Math.round(amount * 100),
        reference: txRef,
        callback_url: `https://meetadollexhibition.com/payment/callback`,
        metadata: { reservation_id: reservationId, exhibition_name: exhibitionName },
      }),
    });

    const paystackData = (await paystackResponse.json()) as {
      status: boolean;
      data?: { authorization_url: string; access_code: string; reference: string };
      message?: string;
    };

    if (!paystackData.status || !paystackData.data?.authorization_url) {
      logger.error({ paystackData }, "Paystack initiation failed — releasing reservation and payment");
      // Clean up payment record, reservation, and stall on Paystack failure
      await supabase.from("payments").delete().eq("id", paymentId);
      await supabase.from("reservations").delete().eq("id", reservationId);
      await supabase.from("stalls").update({ status: "available" }).eq("id", stall_id);
      res.status(502).json({ error: "Payment gateway error. Please try again." });
      return;
    }

    // Invalidate stall cache
    if (claimedStall.exhibition_id) {
      cache.invalidatePrefix(stallsCacheKey(claimedStall.exhibition_id as string));
    }

    logger.info({ userId: user.id, stall_id, reservationId, txRef }, "Direct payment initiated");
    res.json({ payment_link: paystackData.data.authorization_url, tx_ref: txRef });
  } catch (err) {
    logger.error({ err }, "Initiate direct payment error");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

// ── Initiate payment for an existing held reservation (kept for compatibility) ─
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

    // ── Pre-generate tx reference and record pending payment FIRST ───────────
    // Same ordering guarantee as initiateDirectPayment: inserting the pending
    // record before calling Paystack ensures the cancellation guard fires for
    // any concurrent self-cancel attempt.
    const txRef = `MTD-${uuidv4()}`;
    const paymentId = uuidv4();

    const { error: paymentInsertErr } = await supabase.from("payments").insert({
      id: paymentId,
      reservation_id,
      amount: reservationAmount,
      transaction_reference: txRef,
      gateway: "paystack",
      status: "pending",
    });

    if (paymentInsertErr) {
      logger.error({ err: paymentInsertErr }, "Failed to insert pending payment record");
      res.status(500).json({ error: "Failed to initiate payment. Please try again." });
      return;
    }

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
      logger.error({ status: paystackData.status }, "Paystack payment initiation failed — removing pending payment record");
      await supabase.from("payments").delete().eq("id", paymentId);
      res.status(502).json({ error: "Payment gateway error. Please try again." });
      return;
    }

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

    const TERMINAL_PAYMENT_STATUSES = ["success", "failed", "refunded"];
    if (TERMINAL_PAYMENT_STATUSES.includes(payment.status)) {
      logger.info({ reference, status: payment.status }, "Webhook received for terminal payment — skipping");
      res.status(200).json({ message: "Already processed" });
      return;
    }

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
      await supabase.from("payments").update({ status: "failed" }).eq("transaction_reference", reference);
      res.status(200).json({ message: "Reservation not found" });
      return;
    }

    // ── Always persist a Paystack-verified charge as successful ───────────────
    // A gateway-verified charge must never be silently discarded regardless of
    // the current reservation state. We record the payment as success first,
    // then attempt to confirm the reservation. If the reservation is already in
    // a non-held state (e.g. cancelled by admin or cron) the conditional update
    // below will match 0 rows and we log for manual reconciliation rather than
    // writing a false 'failed' status.
    await supabase
      .from("payments")
      .update({ status: "success", amount: amountNaira })
      .eq("transaction_reference", reference);

    // Confirm the reservation conditionally so a concurrent admin/cron cancellation
    // does not produce a confirmed reservation with mismatched state. If the update
    // matches 0 rows the reservation has been separately cancelled; log for
    // reconciliation but do NOT revert the payment — the charge is real.
    const { data: confirmedReservation } = await supabase
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", payment.reservation_id)
      .eq("status", "held")
      .select("id")
      .maybeSingle();

    if (!confirmedReservation) {
      logger.warn(
        { reference, reservation_id: payment.reservation_id },
        "Webhook: payment recorded as success but reservation was not in held state — manual reconciliation required"
      );
      res.status(200).json({ message: "Payment recorded; reservation requires reconciliation" });
      return;
    }

    await supabase.from("stalls").update({ status: "reserved" }).eq("id", reservation.stall_id);

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
        organizerContact: "08120201518",
        ticketPDF,
      });
    }

    const paidAt = new Date().toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      weekday: "long", year: "numeric", month: "long",
      day: "numeric", hour: "2-digit", minute: "2-digit",
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

    res.status(200).json({ message: "Webhook processed" });
  } catch (err) {
    logger.error({ err }, "Webhook processing error");
    res.status(500).json({ error: "Something went wrong" });
  }
}
