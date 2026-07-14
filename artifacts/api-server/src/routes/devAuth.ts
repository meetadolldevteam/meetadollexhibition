import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import {
  signAccessToken,
  signRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../lib/tokens";

const router = Router();

if (process.env.NODE_ENV !== "production") {
  router.post("/dev-login", async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password required" });
      return;
    }

    try {
      const { data: user } = await supabase
        .from("users")
        .select("id, email, name, role, vendor_category, password_hash")
        .eq("email", email)
        .single();

      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const valid = await bcrypt.compare(password, (user as typeof user & { password_hash: string }).password_hash);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const u = user as typeof user & { vendor_category?: string | null };
      const accessToken = signAccessToken({
        id: u.id, email: u.email, name: u.name ?? "", role: u.role, vendor_category: u.vendor_category,
      });
      const refreshToken = signRefreshToken(u.id);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

      logger.info({ userId: u.id }, "[DEV] dev-login issued token");
      res.json({ token: accessToken, user: { id: u.id, email: u.email, name: u.name, role: u.role, vendor_category: u.vendor_category } });
    } catch (err) {
      logger.error({ err }, "[DEV] dev-login error");
      res.status(500).json({ error: "Something went wrong" });
    }
  });
}

export default router;
