import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";

export interface ActivityLogArgs {
  adminId: string;
  adminName: string;
  adminRole: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Write an entry to the activity_log table.
 * Errors are swallowed — a failed audit write must never break the main action.
 */
export async function logActivity(args: ActivityLogArgs): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    admin_id: args.adminId,
    admin_name: args.adminName,
    admin_role: args.adminRole,
    action: args.action,
    entity_type: args.entityType ?? null,
    entity_id: args.entityId ?? null,
    details: args.details ?? {},
  });
  if (error) {
    logger.warn({ err: error }, "Failed to write activity log (non-fatal)");
  }
}
