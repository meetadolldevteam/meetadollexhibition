import { Response } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { AuthRequest } from "../middleware/auth";

export async function getMyReservations(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  try {
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        stalls ( stall_number, package, price, exhibitions ( name, venue, start_date, end_date ) )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "Failed to fetch reservations");
      res.status(500).json({ error: "Failed to fetch reservations" });
      return;
    }

    res.json({ reservations: data });
  } catch (err) {
    logger.error({ err }, "Get my reservations error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function cancelMyReservation(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const { data: reservation, error: fetchErr } = await supabase
      .from("reservations")
      .select("id, stall_id, status, user_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    if (!["held", "confirmed"].includes(reservation.status)) {
      res.status(400).json({ error: `Cannot cancel a reservation with status "${reservation.status}"` });
      return;
    }

    const { error: updateErr } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (updateErr) {
      logger.error({ err: updateErr }, "Failed to cancel reservation");
      res.status(500).json({ error: "Failed to cancel reservation" });
      return;
    }

    await supabase
      .from("stalls")
      .update({ status: "available" })
      .eq("id", reservation.stall_id);

    res.json({ message: "Reservation cancelled" });
  } catch (err) {
    logger.error({ err }, "Cancel my reservation error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getReservation(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin";

  try {
    let query = supabase
      .from("reservations")
      .select(`
        *,
        stalls ( stall_number, package, price, exhibitions ( name, venue, start_date, end_date ) ),
        payments ( status, amount, transaction_reference )
      `)
      .eq("id", id);

    if (!isAdmin) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    res.json({ reservation: data });
  } catch (err) {
    logger.error({ err }, "Get reservation error");
    res.status(500).json({ error: "Internal server error" });
  }
}
