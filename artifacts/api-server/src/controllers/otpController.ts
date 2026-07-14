import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { createAndSendOtp } from "../services/otp";
import {
  signAccessToken,
  signRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../lib/tokens";

interface OtpRecord {
  id: string;
  user_id: string;
  otp_code: string;
  type: string;
  expires_at: string;
  used: boolean;
  attempts: number;
  locked_until: string | null;
  created_at: string;
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { userId, otp, type } = req.body;

  if (!userId || !otp || !type) {
    res.status(400).json({ error: "userId, otp and type are required" });
    return;
  }

  try {
    const { data: otpRecord, error: fetchErr } = await supabase
      .from("otps")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      logger.error({ err: fetchErr }, "Failed to fetch OTP record");
      res.status(500).json({ error: "Something went wrong" });
      return;
    }

    if (!otpRecord) {
      res.status(400).json({ error: "Code expired or not found. Please request a new one." });
      return;
    }

    const record = otpRecord as OtpRecord;

    // Check lockout
    if (record.locked_until && new Date(record.locked_until) > new Date()) {
      const minutes = Math.ceil(
        (new Date(record.locked_until).getTime() - Date.now()) / 60000
      );
      res.status(429).json({
        error: `Too many wrong attempts. Try again in ${minutes} minute(s).`,
        code: "OTP_LOCKED",
      });
      return;
    }

    const isMatch = await bcrypt.compare(String(otp), record.otp_code);

    if (!isMatch) {
      const newAttempts = record.attempts + 1;
      const updateData: Record<string, unknown> = { attempts: newAttempts };
      if (newAttempts >= 3) {
        updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      await supabase.from("otps").update(updateData).eq("id", record.id);

      const remaining = Math.max(0, 3 - newAttempts);
      if (remaining === 0) {
        res.status(429).json({
          error: "Too many wrong attempts. Please wait 15 minutes before trying again.",
          code: "OTP_LOCKED",
        });
      } else {
        res.status(400).json({
          error: `Incorrect code. ${remaining} attempt(s) remaining.`,
          code: "OTP_WRONG",
        });
      }
      return;
    }

    // Mark OTP as used immediately
    await supabase.from("otps").update({ used: true }).eq("id", record.id);

    // Fetch user
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, email, name, role, vendor_category")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      res.status(400).json({ error: "User not found" });
      return;
    }

    // Mark email as verified for registration flow
    if (type === "registration") {
      await supabase
        .from("users")
        .update({ email_verified: true })
        .eq("id", userId);
    }

    const u = user as typeof user & { vendor_category?: string | null };
    // Issue tokens
    const accessToken = signAccessToken({ id: u.id, email: u.email, name: u.name ?? "", role: u.role, vendor_category: u.vendor_category });
    const refreshToken = signRefreshToken(user.id);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    logger.info({ userId, type }, "OTP verified — JWT issued");
    res.json({ token: accessToken, user: { id: u.id, email: u.email, name: u.name, role: u.role, vendor_category: u.vendor_category } });
  } catch (err) {
    logger.error({ err }, "Verify OTP error");
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  const { userId, type } = req.body;

  if (!userId || !type) {
    res.status(400).json({ error: "userId and type are required" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await createAndSendOtp(user.id, user.email, type as "registration" | "login");
    res.json({ message: "A new code has been sent to your email." });
  } catch (err) {
    logger.error({ err }, "Resend OTP error");
    res.status(500).json({ error: "Something went wrong" });
  }
}

export async function sendOtpEndpoint(req: Request, res: Response): Promise<void> {
  const { userId, type } = req.body;

  if (!userId || !type) {
    res.status(400).json({ error: "userId and type are required" });
    return;
  }

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", userId)
      .single();

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await createAndSendOtp(user.id, user.email, type as "registration" | "login");
    res.json({ message: "OTP sent." });
  } catch (err) {
    logger.error({ err }, "Send OTP error");
    res.status(500).json({ error: "Something went wrong" });
  }
}
