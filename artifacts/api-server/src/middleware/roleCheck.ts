import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";

const ALL_ADMIN_ROLES = ["staff", "admin", "super_admin"];
const MANAGER_ROLES = ["admin", "super_admin"];

/**
 * Fetch the caller's current role from the database and update req.user.role.
 * This guards against privilege persistence: if an admin was demoted after
 * their access token was issued, they are blocked here rather than at expiry.
 * Must run after `authenticate` (requires req.user.id).
 */
export async function verifyRoleFromDb(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (error || !data) {
      logger.warn({ userId: req.user.id, err: error }, "Live role check: user not found");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Overwrite the role from the JWT with the live value from the database.
    // Subsequent role checks (requireAdmin, requireManagerRole, etc.) will use
    // this updated value, so a demoted admin is immediately rejected.
    req.user.role = (data as { role: string }).role;
    next();
  } catch (err) {
    logger.error({ err, userId: req.user.id }, "Live role check DB error");
    res.status(500).json({ error: "Internal server error" });
  }
}

/** Any of the three admin tiers (staff, admin, super_admin) */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!ALL_ADMIN_ROLES.includes(req.user?.role ?? "")) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/** admin or super_admin only — staff excluded */
export function requireManagerRole(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!MANAGER_ROLES.includes(req.user?.role ?? "")) {
    res.status(403).json({ error: "Manager access required" });
    return;
  }
  next();
}

/** super_admin only */
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}

/** Generic role check — pass allowed roles as arguments */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    next();
  };
}
