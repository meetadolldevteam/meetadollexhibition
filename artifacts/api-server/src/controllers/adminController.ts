import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { sendAnnouncementEmail } from "../services/email";

export async function getPaymentsSummary(_req: Request, res: Response): Promise<void> {
  try {
    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        id, amount, status,
        reservations (
          id,
          stalls ( exhibition_id, exhibitions ( id, name, venue ) )
        )
      `);

    if (error) {
      logger.error({ err: error }, "Failed to fetch payments for summary");
      res.status(500).json({ error: "Failed to fetch payment summary" });
      return;
    }

    type ExhibitionBucket = {
      id: string; name: string; venue: string;
      successful: { count: number; total: number };
      pending: { count: number; total: number };
      failed: { count: number; total: number };
    };

    const byExhibition = new Map<string, ExhibitionBucket>();
    let overallRevenue = 0;
    let overallPending = 0;
    let overallFailed = 0;

    for (const p of (payments ?? [])) {
      const reservation = (p as any).reservations;
      const stall = reservation?.stalls;
      const exh = stall?.exhibitions;
      if (!exh) continue;

      if (!byExhibition.has(exh.id)) {
        byExhibition.set(exh.id, {
          id: exh.id, name: exh.name, venue: exh.venue,
          successful: { count: 0, total: 0 },
          pending: { count: 0, total: 0 },
          failed: { count: 0, total: 0 },
        });
      }

      const bucket = byExhibition.get(exh.id)!;
      const amount = typeof p.amount === "number" ? p.amount : 0;

      if (p.status === "successful") {
        bucket.successful.count++;
        bucket.successful.total += amount;
        overallRevenue += amount;
      } else if (p.status === "pending") {
        bucket.pending.count++;
        bucket.pending.total += amount;
        overallPending += amount;
      } else {
        bucket.failed.count++;
        bucket.failed.total += amount;
        overallFailed += amount;
      }
    }

    res.json({
      exhibitions: Array.from(byExhibition.values()),
      overall: { revenue: overallRevenue, pending: overallPending, failed: overallFailed },
    });
  } catch (err) {
    logger.error({ err }, "Payments summary error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllReservations(_req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        users ( name, email ),
        stalls ( stall_number, package, price, exhibitions ( name, venue, start_date, end_date ) )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "Failed to fetch all reservations");
      res.status(500).json({ error: "Failed to fetch reservations" });
      return;
    }

    res.json({ reservations: data });
  } catch (err) {
    logger.error({ err }, "Admin get reservations error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateStall(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["available", "blocked", "reserved", "held"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(", ")}` });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("stalls")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to update stall");
      res.status(500).json({ error: "Failed to update stall" });
      return;
    }

    res.json({ stall: data });
  } catch (err) {
    logger.error({ err }, "Admin update stall error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function cancelReservation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const { data: reservation, error: fetchErr } = await supabase
      .from("reservations")
      .select("id, stall_id, status")
      .eq("id", id)
      .single();

    if (fetchErr || !reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (reservation.status !== "expired") {
      await supabase
        .from("stalls")
        .update({ status: "available" })
        .eq("id", reservation.stall_id);
    }

    res.json({ message: "Reservation cancelled" });
  } catch (err) {
    logger.error({ err }, "Admin cancel reservation error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function announceToVendors(req: Request, res: Response): Promise<void> {
  const { exhibition_id, subject, message } = req.body;

  try {
    let query = supabase
      .from("reservations")
      .select("users ( name, email ), stalls!inner ( exhibition_id )")
      .eq("status", "confirmed");

    if (exhibition_id) {
      query = query.eq("stalls.exhibition_id", exhibition_id);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ err: error }, "Failed to fetch vendors for announcement");
      res.status(500).json({ error: "Failed to fetch vendors" });
      return;
    }

    const sends = (data ?? []).map((row: any) => {
      const user = row.users;
      if (user?.email) {
        return sendAnnouncementEmail(user.email, user.name ?? user.email, subject, message);
      }
      return Promise.resolve();
    });

    await Promise.allSettled(sends);

    res.json({ message: `Announcement sent to ${sends.length} vendor(s)` });
  } catch (err) {
    logger.error({ err }, "Admin announce error");
    res.status(500).json({ error: "Internal server error" });
  }
}
