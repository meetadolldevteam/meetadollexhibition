import cron from "node-cron";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { cache } from "../lib/cache";

// A pending payment is only considered "active" if it was created within this
// window. Beyond this we treat it as abandoned — the user left the payment
// page without completing — and we release the hold.
const ACTIVE_PAYMENT_GRACE_MS = 30 * 60 * 1000; // 30 minutes

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

      // Step 2: Exclude reservations that have a RECENTLY-created pending payment.
      // This protects the hold while the user is actively on the Paystack page
      // and the webhook hasn't fired yet. Payments older than ACTIVE_PAYMENT_GRACE_MS
      // are treated as abandoned — the user left without completing payment.
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

      // Step 3: Mark any orphaned pending payments as failed (enum has no "abandoned")
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("status", "pending")
        .in("reservation_id", safeIds);

      // Step 4: Mark reservations expired
      const { error: updateResErr } = await supabase
        .from("reservations")
        .update({ status: "expired" })
        .in("id", safeIds);

      if (updateResErr) {
        logger.error({ err: updateResErr }, "Failed to expire held reservations");
        return;
      }

      // Step 5: Release the stalls back to available
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
