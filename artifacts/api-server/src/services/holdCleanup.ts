import cron from "node-cron";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { cache } from "../lib/cache";

export function startHoldCleanupJob(): void {
  cron.schedule("*/5 * * * *", async () => {
    logger.info("Running stall hold cleanup");
    try {
      // Step 1: Find reservations that are held and past their expiry time
      const { data: expiredReservations, error: fetchError } = await supabase
        .from("reservations")
        .select("id, stall_id")
        .eq("status", "held")
        .lt("hold_expires_at", new Date().toISOString());

      if (fetchError) {
        logger.error({ err: fetchError }, "Failed to fetch expired holds");
        return;
      }

      if (!expiredReservations?.length) return;

      const reservationIds = expiredReservations.map((r) => r.id);

      // Step 2: Exclude reservations that have an active (pending) payment.
      // This prevents releasing a stall while its payment is being confirmed —
      // i.e. user has clicked Pay and the Paystack webhook hasn't fired yet.
      const { data: activePayments, error: paymentFetchErr } = await supabase
        .from("payments")
        .select("reservation_id")
        .eq("status", "pending")
        .in("reservation_id", reservationIds);

      if (paymentFetchErr) {
        logger.error({ err: paymentFetchErr }, "Failed to check active payments — skipping cleanup to be safe");
        return;
      }

      const protectedIds = new Set(
        (activePayments ?? []).map((p) => p.reservation_id as string)
      );

      const safeToExpire = expiredReservations.filter(
        (r) => !protectedIds.has(r.id)
      );

      if (!safeToExpire.length) {
        if (protectedIds.size > 0) {
          logger.info(
            { protected: protectedIds.size },
            "All expired holds are actively being paid — skipping cleanup"
          );
        }
        return;
      }

      const safeIds = safeToExpire.map((r) => r.id);
      const safeStallIds = safeToExpire.map((r) => r.stall_id);

      // Step 3: Mark reservations expired
      const { error: updateResErr } = await supabase
        .from("reservations")
        .update({ status: "expired" })
        .in("id", safeIds);

      if (updateResErr) {
        logger.error({ err: updateResErr }, "Failed to expire held reservations");
        return;
      }

      // Step 4: Release the stalls back to available
      const { error: updateStallErr } = await supabase
        .from("stalls")
        .update({ status: "available" })
        .in("id", safeStallIds);

      if (updateStallErr) {
        logger.error({ err: updateStallErr }, "Failed to release stalls from expired holds");
        return;
      }

      // Invalidate stall list cache so the next grid load sees the freed stalls
      cache.invalidatePrefix("stalls:");

      logger.info(
        { expired: safeIds.length, protected: protectedIds.size },
        "Expired held reservations cleaned up"
      );
    } catch (err) {
      logger.error({ err }, "Unexpected error in hold cleanup job");
    }
  });

  logger.info("Hold cleanup cron job started (every 5 minutes)");
}
