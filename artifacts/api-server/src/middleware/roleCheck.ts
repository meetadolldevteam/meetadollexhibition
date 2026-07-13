import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

const ALL_ADMIN_ROLES = ["staff", "admin", "super_admin"];
const MANAGER_ROLES = ["admin", "super_admin"];

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
