import { Request, Response } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { sendConfirmationEmail } from "../services/email";
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
      .select("id, reservation_id")
      .eq("transaction_reference", reference)
      .single();

    if (paymentErr || !payment) {
      logger.error({ reference }, "Payment record not found");
      res.status(200).json({ message: "Payment record not found" });
      return;
    }

    await supabase
      .from("payments")
      .update({ status: "successful", amount: amountNaira })
      .eq("transaction_reference", reference);

    const { data: reservation } = await supabase
      .from("reservations")
      .select(`
        id, stall_id, user_id,
        stalls ( stall_number, package, exhibitions ( name, venue, start_date ) ),
        users ( name, email )
      `)
      .eq("id", payment.reservation_id)
      .single();

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
        });
      }
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (err) {
    logger.error({ err }, "Webhook processing error");
    res.status(500).json({ error: "Something went wrong" });
  }
}
