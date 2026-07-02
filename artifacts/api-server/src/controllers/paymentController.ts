import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { sendConfirmationEmail } from "../services/email";
import { AuthRequest } from "../middleware/auth";

const FLW_BASE = "https://api.flutterwave.com/v3";

function getFlwKey(): string | null {
  const key = process.env.FLW_SECRET_KEY;
  if (!key || key.startsWith("FLWSECK_placeholder")) return null;
  return key;
}

export async function initiatePayment(req: AuthRequest, res: Response): Promise<void> {
  const flwKey = getFlwKey();
  if (!flwKey) {
    res.status(503).json({ error: "Payment gateway not yet configured. FLW_SECRET_KEY is pending." });
    return;
  }

  const { reservation_id } = req.body;
  const user = req.user!;

  try {
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .select(`
        id, amount, status, stall_id,
        stalls ( stall_number ),
        exhibitions ( name, venue )
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

    const { data: userData } = await supabase
      .from("users")
      .select("name, email, phone")
      .eq("id", user.id)
      .single();

    const txRef = `MTD-${uuidv4()}`;

    const flwResponse = await fetch(`${FLW_BASE}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${flwKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: reservation.amount,
        currency: "NGN",
        redirect_url: `${process.env.FRONTEND_URL ?? ""}/payment/callback`,
        customer: {
          email: userData?.email ?? user.email,
          name: userData?.name ?? user.email,
          phonenumber: userData?.phone ?? "",
        },
        customizations: {
          title: "Meetadoll Exhibition",
          description: `Stall reservation — ${(reservation as any).exhibitions?.name ?? ""}`,
        },
        meta: { reservation_id },
      }),
    });

    const flwData = (await flwResponse.json()) as { status: string; data?: { link: string } };

    if (flwData.status !== "success" || !flwData.data?.link) {
      logger.error({ flwData }, "Flutterwave payment initiation failed");
      res.status(502).json({ error: "Payment gateway error" });
      return;
    }

    await supabase.from("payments").insert({
      id: uuidv4(),
      reservation_id,
      user_id: user.id,
      amount: reservation.amount,
      tx_ref: txRef,
      status: "pending",
    });

    res.json({ payment_link: flwData.data.link, tx_ref: txRef });
  } catch (err) {
    logger.error({ err }, "Initiate payment error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function paymentWebhook(req: Request, res: Response): Promise<void> {
  const flwKey = getFlwKey();
  if (!flwKey) {
    res.status(503).json({ error: "Payment gateway not yet configured" });
    return;
  }

  const webhookHash = process.env.FLW_WEBHOOK_HASH;
  const signature = req.headers["verif-hash"];

  if (webhookHash && !webhookHash.startsWith("placeholder") && signature !== webhookHash) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const { event, data } = req.body;

  if (event !== "charge.completed") {
    res.status(200).json({ message: "Event ignored" });
    return;
  }

  try {
    const verifyResponse = await fetch(`${FLW_BASE}/transactions/${data.id}/verify`, {
      headers: { Authorization: `Bearer ${flwKey}` },
    });

    const verifyData = (await verifyResponse.json()) as {
      status: string;
      data?: { status: string; tx_ref: string; amount: number; currency: string; flw_ref: string };
    };

    if (verifyData.status !== "success" || verifyData.data?.status !== "successful") {
      logger.warn({ txRef: data.tx_ref }, "Payment verification failed");
      res.status(200).json({ message: "Payment not verified" });
      return;
    }

    const { tx_ref, amount, flw_ref } = verifyData.data;

    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("id, reservation_id, user_id")
      .eq("tx_ref", tx_ref)
      .single();

    if (paymentErr || !payment) {
      logger.error({ tx_ref }, "Payment record not found");
      res.status(200).json({ message: "Payment record not found" });
      return;
    }

    await supabase
      .from("payments")
      .update({ status: "successful", amount, payment_ref: flw_ref })
      .eq("tx_ref", tx_ref);

    const { data: reservation } = await supabase
      .from("reservations")
      .select(`
        id, stall_id,
        stalls ( stall_number ),
        exhibitions ( name, venue, date, organizer_contact ),
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

      const exh = (reservation as any).exhibitions;
      const stall = (reservation as any).stalls;
      const user = (reservation as any).users;

      if (user?.email) {
        await sendConfirmationEmail({
          to: user.email,
          vendorName: user.name ?? user.email,
          reservationId: reservation.id,
          stallNumber: stall?.stall_number ?? "N/A",
          amountPaid: amount,
          exhibitionName: exh?.name ?? "Meetadoll Exhibition",
          venue: exh?.venue ?? "TBD",
          date: exh?.date ?? "TBD",
          organizerContact: exh?.organizer_contact ?? "info@meetadoll.com",
        });
      }
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (err) {
    logger.error({ err }, "Webhook processing error");
    res.status(500).json({ error: "Internal server error" });
  }
}
