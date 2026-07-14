import { Response } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { AuthRequest } from "../middleware/auth";
import { safeGenerateTicketPDF } from "../services/ticketGenerator";

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

export async function downloadTicket(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select(`
        id, status, user_id,
        stalls ( stall_number, package, price, category, exhibitions ( name, venue, start_date ) ),
        users ( name, email )
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    if (reservation.status !== "confirmed") {
      res.status(400).json({ error: "Ticket is only available for confirmed reservations" });
      return;
    }

    const stall = (reservation as any).stalls;
    const exh = stall?.exhibitions;
    const vendor = (reservation as any).users;
    const stallPrice: number = stall?.price ?? 0;
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

    if (!ticketPDF) {
      res.status(500).json({ error: "Failed to generate ticket" });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="meetadoll-stall-ticket.pdf"`);
    res.setHeader("Content-Length", ticketPDF.length);
    res.send(ticketPDF);
  } catch (err) {
    logger.error({ err }, "Download ticket error");
    res.status(500).json({ error: "Internal server error" });
  }
}
