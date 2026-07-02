import cron from "node-cron";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";

export function startHoldCleanupJob(): void {
  cron.schedule("*/5 * * * *", async () => {
    logger.info("Running stall hold cleanup");
    try {
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
      const stallIds = expiredReservations.map((r) => r.stall_id);

      const { error: updateResErr } = await supabase
        .from("reservations")
        .update({ status: "expired" })
        .in("id", reservationIds);

      if (updateResErr) {
        logger.error({ err: updateResErr }, "Failed to expire held reservations");
        return;
      }

      const { error: updateStallErr } = await supabase
        .from("stalls")
        .update({ status: "available" })
        .in("id", stallIds);

      if (updateStallErr) {
        logger.error({ err: updateStallErr }, "Failed to release stalls from expired holds");
        return;
      }

      logger.info({ count: reservationIds.length }, "Expired held reservations cleaned up");
    } catch (err) {
      logger.error({ err }, "Unexpected error in hold cleanup job");
    }
  });

  logger.info("Hold cleanup cron job started (every 5 minutes)");
}
