import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { AuthRequest } from "../middleware/auth";

export async function getStallStats(req: Request, res: Response): Promise<void> {
  const { exhibition_id } = req.query;

  if (!exhibition_id) {
    res.status(400).json({ error: "exhibition_id is required" });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("stalls")
      .select("status")
      .eq("exhibition_id", exhibition_id);

    if (error) {
      logger.error({ err: error }, "Failed to fetch stall stats");
      res.status(500).json({ error: "Failed to fetch stall stats" });
      return;
    }

    const total = data.length;
    const available = data.filter((s) => s.status === "available").length;
    const held = data.filter((s) => s.status === "held").length;
    const reserved = data.filter((s) => s.status === "reserved").length;

    res.json({ total, available, held, reserved });
  } catch (err) {
    logger.error({ err }, "Get stall stats error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAvailableStalls(req: AuthRequest, res: Response): Promise<void> {
  const { exhibition_id } = req.query;

  if (!exhibition_id) {
    res.status(400).json({ error: "exhibition_id is required" });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("stalls")
      .select("*")
      .eq("exhibition_id", exhibition_id)
      .eq("status", "available")
      .order("stall_number", { ascending: true });

    if (error) {
      logger.error({ err: error }, "Failed to fetch stalls");
      res.status(500).json({ error: "Failed to fetch stalls" });
      return;
    }

    res.json({ stalls: data });
  } catch (err) {
    logger.error({ err }, "Get stalls error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function holdStall(req: AuthRequest, res: Response): Promise<void> {
  const { stall_id } = req.body;
  const userId = req.user!.id;

  try {
    const { data: stall, error: stallError } = await supabase
      .from("stalls")
      .select("id, status, stall_number, price")
      .eq("id", stall_id)
      .single();

    if (stallError || !stall) {
      res.status(404).json({ error: "Stall not found" });
      return;
    }

    if (stall.status !== "available") {
      res.status(409).json({ error: "Stall is not available" });
      return;
    }

    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const reservationCode = `RES-${uuidv4().slice(0, 8).toUpperCase()}`;

    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .insert({
        id: uuidv4(),
        user_id: userId,
        stall_id,
        status: "held",
        hold_expires_at: holdExpiresAt,
        reservation_code: reservationCode,
      })
      .select()
      .single();

    if (resError) {
      if (resError.code === "23505") {
        res.status(409).json({ error: "Stall already held or reserved" });
        return;
      }
      logger.error({ err: resError }, "Failed to create reservation");
      res.status(500).json({ error: "Failed to hold stall" });
      return;
    }

    await supabase
      .from("stalls")
      .update({ status: "held" })
      .eq("id", stall_id);

    res.status(201).json({ reservation, hold_expires_at: holdExpiresAt });
  } catch (err) {
    logger.error({ err }, "Hold stall error");
    res.status(500).json({ error: "Internal server error" });
  }
}
