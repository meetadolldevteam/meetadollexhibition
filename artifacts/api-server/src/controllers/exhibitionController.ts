import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { cache } from "../lib/cache";
import { withRetry } from "../lib/retry";

const EXHIBITIONS_CACHE_KEY = "exhibitions:list";
const EXHIBITIONS_TTL_MS = 60_000; // 60 seconds — exhibition data rarely changes

export async function getExhibitions(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1") || 1);
  const limit = Math.min(50, parseInt((req.query.limit as string) ?? "20") || 20);
  const offset = (page - 1) * limit;

  // Use cached result for the default first-page request
  const cacheKey = `${EXHIBITIONS_CACHE_KEY}:${page}:${limit}`;
  const cached = cache.get<{ exhibitions: unknown[]; total: number }>(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    res.json(cached);
    return;
  }

  try {
    const { data, error, count } = await withRetry(
      async () =>
        supabase
          .from("exhibitions")
          .select("id, name, venue, start_date, end_date, status", { count: "exact" })
          .order("start_date", { ascending: true })
          .range(offset, offset + limit - 1),
      { label: "getExhibitions" }
    );

    if (error) {
      logger.error({ err: error }, "Failed to fetch exhibitions");
      res.status(500).json({ error: "Failed to fetch exhibitions" });
      return;
    }

    const result = {
      exhibitions: data ?? [],
      total: count ?? 0,
      page,
      limit,
    };

    cache.set(cacheKey, result, EXHIBITIONS_TTL_MS);
    res.set("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Get exhibitions error");
    res.status(503).json({ error: "Service temporarily unavailable. Please try again." });
  }
}
