import cron from "node-cron";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { cache } from "../lib/cache";

const ACTIVE_PAYMENT_GRACE_MS = 10 * 60 * 1000;

async function releaseStallIds(stallIds: string[]): Promise<void> {
  if (!stallIds.length) return;
  const { error } = await supabase
    .from("stalls")
    .update({ status: "available" })
    .in("id", stallIds);
  if (error) {
    logger.error({ err: error }, "Failed to release stalls");
  }
}

async function runCleanup(): Promise<void> {
  logger.info("Running stall hold cleanup");
  try {
    const now = new Date().toISOString();

    // ── Pass 1: Expire reservations whose hold_expires_at has passed (or is NULL) ──
    const { data: expiredReservations, error: fetchError } = await supabase
      .from("reservations")
      .select("id, stall_id")
      .eq("status", "held")
      .or(`hold_expires_at.is.null,hold_expires_at.lt.${now}`);

    if (fetchError) {
      logger.error({ err: fetchError }, "Failed to fetch expired holds");
    } else if (expiredReservations?.length) {
      const reservationIds = expiredReservations.map((r) => r.id);

      // Protect holds where the user is still actively on the Paystack page
      const paymentCutoff = new Date(Date.now() - ACTIVE_PAYMENT_GRACE_MS).toISOString();
      const { data: activePayments, error: paymentFetchErr } = await supabase
        .from("payments")
        .select("reservation_id")
        .eq("status", "pending")
        .gt("created_at", paymentCutoff)
        .in("reservation_id", reservationIds);

      if (paymentFetchErr) {
        logger.error({ err: paymentFetchErr }, "Failed to check active payments — skipping cleanup to be safe");
        return;
      }

      const protectedIds = new Set(
        (activePayments ?? []).map((p) => p.reservation_id as string)
      );

      const safeToExpire = expiredReservations.filter((r) => !protectedIds.has(r.id));

      if (safeToExpire.length) {
        const safeIds = safeToExpire.map((r) => r.id);
        const safeStallIds = safeToExpire.map((r) => r.stall_id as string).filter(Boolean);

        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("status", "pending")
          .in("reservation_id", safeIds);

        const { error: updateResErr } = await supabase
          .from("reservations")
          .update({ status: "expired" })
          .in("id", safeIds);

        if (updateResErr) {
          logger.error({ err: updateResErr }, "Failed to expire held reservations");
          return;
        }

        await releaseStallIds(safeStallIds);
        cache.invalidatePrefix("stalls:");

        logger.info(
          { expired: safeIds.length, protected: protectedIds.size },
          "Expired held reservations cleaned up"
        );
      } else if (protectedIds.size > 0) {
        logger.info(
          { protected: protectedIds.size },
          "All expired holds are actively being paid — skipping cleanup"
        );
      }
    }

    // ── Pass 2: Release orphaned held stalls (no matching held reservation) ──
    const { data: heldStalls, error: stallFetchErr } = await supabase
      .from("stalls")
      .select("id")
      .eq("status", "held");

    if (stallFetchErr) {
      logger.error({ err: stallFetchErr }, "Failed to fetch held stalls for orphan check");
      return;
    }

    if (!heldStalls?.length) return;

    const heldStallIds = heldStalls.map((s) => s.id as string);

    const { data: matchingReservations, error: resCheckErr } = await supabase
      .from("reservations")
      .select("stall_id")
      .eq("status", "held")
      .in("stall_id", heldStallIds);

    if (resCheckErr) {
      logger.error({ err: resCheckErr }, "Failed to check reservations for orphaned stalls");
      return;
    }

    const reservedStallIds = new Set(
      (matchingReservations ?? []).map((r) => r.stall_id as string)
    );

    const orphanedStallIds = heldStallIds.filter((id) => !reservedStallIds.has(id));

    if (orphanedStallIds.length) {
      await releaseStallIds(orphanedStallIds);
      cache.invalidatePrefix("stalls:");
      logger.info({ count: orphanedStallIds.length }, "Released orphaned held stalls");
    }
  } catch (err) {
    logger.error({ err }, "Unexpected error in hold cleanup job");
  }
}

export function startHoldCleanupJob(): void {
  cron.schedule("* * * * *", () => void runCleanup());
  logger.info("Hold cleanup cron job started (every minute)");

  // Run once immediately on startup to fix any stuck stalls right away
  void runCleanup();
}
