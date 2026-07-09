import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";

export async function getExhibitions(_req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("exhibitions")
      .select("id, name, venue, start_date, end_date, status")
      .order("start_date", { ascending: true });

    if (error) {
      logger.error({ err: error }, "Failed to fetch exhibitions");
      res.status(500).json({ error: "Failed to fetch exhibitions" });
      return;
    }

    res.json({ exhibitions: data });
  } catch (err) {
    logger.error({ err }, "Get exhibitions error");
    res.status(500).json({ error: "Internal server error" });
  }
}
