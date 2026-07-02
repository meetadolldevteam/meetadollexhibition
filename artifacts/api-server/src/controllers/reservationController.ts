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
        stalls ( stall_number, size, price ),
        exhibitions ( name, venue, date )
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

export async function getReservation(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === "admin";

  try {
    let query = supabase
      .from("reservations")
      .select(`
        *,
        stalls ( stall_number, size, price ),
        exhibitions ( name, venue, date ),
        payments ( status, amount, payment_ref )
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
