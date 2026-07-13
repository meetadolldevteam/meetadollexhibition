import { Router, type IRouter, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", async (_req: Request, res: Response) => {
  const uptime = Math.floor(process.uptime());

  let dbStatus: "ok" | "error" = "ok";
  try {
    const { error } = await supabase.from("exhibitions").select("id").limit(1);
    if (error) dbStatus = "error";
  } catch {
    dbStatus = "error";
  }

  const overall = dbStatus === "ok" ? "ok" : "degraded";

  if (dbStatus === "error") {
    logger.warn("Health check: database unreachable");
  }

  res.status(overall === "ok" ? 200 : 503).json({
    status: overall,
    uptime,
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
