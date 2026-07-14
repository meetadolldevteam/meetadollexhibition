import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { cache } from "../lib/cache";
import { withRetry } from "../lib/retry";
import { AuthRequest } from "../middleware/auth";

const STALLS_TTL_MS = 10_000;

function stallsCacheKey(exhibitionId: string): string {
  return `stalls:${exhibitionId}`;
}

/** Returns true if the vendor's category is allowed to book a stall with the given category */
function canVendorBookStall(vendorCategory: string | null | undefined, stallCategory: string | null | undefined): boolean {
  if (!vendorCategory || !stallCategory) return true; // no restriction if either is unset (backward compat)
  if (vendorCategory === "food") return stallCategory === "Food";
  // fashion + others both map to "Fashion & Others" stalls
  return stallCategory === "Fashion & Others";
}

export async function getStallStats(req: Request, res: Response): Promise<void> {
  const { exhibition_id } = req.query;

  if (!exhibition_id) {
    res.status(400).json({ error: "exhibition_id is required" });
    return;
  }

  try {
    const { data, error } = await withRetry(
      async () =>
        supabase
          .from("stalls")
          .select("status")
          .eq("exhibition_id", exhibition_id),
      { label: "getStallStats" }
    );

    if (error) {
      logger.error({ err: error }, "Failed to fetch stall stats");
      res.status(500).json({ error: "Failed to fetch stall stats" });
      return;
    }

    const rows = data as Array<{ status: string }>;
    const total = rows.length;
    const available = rows.filter((s) => s.status === "available").length;
    const held = rows.filter((s) => s.status === "held").length;
    const reserved = rows.filter((s) => s.status === "reserved").length;

    res.json({ total, available, held, reserved });
  } catch (err) {
    logger.error({ err }, "Get stall stats error");
    res.status(503).json({ error: "Service temporarily unavailable. Please try again." });
  }
}

export async function getStalls(req: Request, res: Response): Promise<void> {
  const { exhibition_id, page: pageParam, limit: limitParam } = req.query;

  if (!exhibition_id) {
    res.status(400).json({ error: "exhibition_id is required" });
    return;
  }

  const page = Math.max(1, parseInt((pageParam as string) ?? "1") || 1);
  const limit = Math.min(200, parseInt((limitParam as string) ?? "200") || 200);
  const offset = (page - 1) * limit;

  const cacheKey = `${stallsCacheKey(exhibition_id as string)}:${page}:${limit}`;
  const cached = cache.get<{ stalls: unknown[] }>(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    res.json(cached);
    return;
  }

  try {
    const { data, error } = await withRetry(
      async () =>
        supabase
          .from("stalls")
          .select("id, stall_number, status, price, package, category")
          .eq("exhibition_id", exhibition_id)
          .order("stall_number", { ascending: true })
          .range(offset, offset + limit - 1),
      { label: "getStalls" }
    );

    if (error) {
      logger.error({ err: error }, "Failed to fetch stalls");
      res.status(500).json({ error: "Failed to fetch stalls" });
      return;
    }

    const result = { stalls: data ?? [], page, limit };
    cache.set(cacheKey, result, STALLS_TTL_MS);
    res.set("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Get stalls error");
    res.status(503).json({ error: "Service temporarily unavailable. Please try again." });
  }
}

export async function holdStall(req: AuthRequest, res: Response): Promise<void> {
  const { stall_id } = req.body;
  const userId = req.user!.id;

  try {
    // ── Category check (parallel fetch) ───────────────────────────────────────
    const [stallCheck, userCheck] = await Promise.all([
      supabase.from("stalls").select("id, status, category").eq("id", stall_id).single(),
      supabase.from("users").select("vendor_category").eq("id", userId).single(),
    ]);

    if (stallCheck.error || !stallCheck.data) {
      res.status(404).json({ error: "Stall not found" });
      return;
    }

    const stallCategory = (stallCheck.data as any).category as string | null;
    const vendorCategory = (userCheck.data as any)?.vendor_category as string | null;

    if (!canVendorBookStall(vendorCategory, stallCategory)) {
      res.status(403).json({
        error: "This stall is not available for your vendor category. Please select a stall in your category.",
      });
      return;
    }

    // ── Atomic claim: UPDATE only if the stall is still 'available' ────────────
    const { data: claimedStall, error: claimError } = await supabase
      .from("stalls")
      .update({ status: "held" })
      .eq("id", stall_id)
      .eq("status", "available")
      .select("id, stall_number, price, exhibition_id")
      .maybeSingle();

    if (claimError) {
      logger.error({ err: claimError }, "Failed to claim stall");
      res.status(500).json({ error: "Failed to hold stall" });
      return;
    }

    if (!claimedStall) {
      res.status(409).json({
        error: "Sorry, this stall was just taken. Please select another.",
      });
      return;
    }

    // ── Create the reservation ────────────────────────────────────────────────
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
      logger.error({ err: resError }, "Reservation insert failed — reverting stall status");
      await supabase.from("stalls").update({ status: "available" }).eq("id", stall_id);
      res.status(500).json({ error: "Failed to hold stall" });
      return;
    }

    if (claimedStall.exhibition_id) {
      cache.invalidatePrefix(stallsCacheKey(claimedStall.exhibition_id));
    }

    res.status(201).json({ reservation, hold_expires_at: holdExpiresAt });
  } catch (err) {
    logger.error({ err }, "Hold stall error");
    res.status(500).json({ error: "Internal server error" });
  }
}
