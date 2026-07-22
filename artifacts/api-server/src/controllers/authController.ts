import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../lib/tokens";
import { createAndSendOtp } from "../services/otp";
import { sendWelcomeEmail, sendAdminNotificationEmail } from "../services/email";
import type { AuthRequest } from "../middleware/auth";

interface MulterFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

async function ensureLogosBucket(): Promise<void> {
  const { error } = await supabase.storage.createBucket("business-logos", {
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    fileSizeLimit: 4 * 1024 * 1024,
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    logger.warn({ err: error }, "Could not ensure business-logos bucket");
  }
}

async function uploadLogo(file: MulterFile, userId: string): Promise<string | null> {
  try {
    await ensureLogosBucket();
    const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : "jpg";
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) {
      logger.error(
        { err: uploadError, code: uploadError.message, userId, fileName },
        "Logo upload to Supabase Storage failed — continuing without logo"
      );
      console.error("[Logo Upload Error]", JSON.stringify(uploadError));
      return null;
    }
    const { data } = supabase.storage.from("business-logos").getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    logger.error({ err }, "Logo upload threw an exception — continuing without logo");
    console.error("[Logo Upload Exception]", err);
    return null;
  }
}

// ── Register: personal details only ──────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, phone, vendor_category } = req.body as Record<string, string>;

  try {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        name,
        phone: phone || null,
        role: "vendor",
        email_verified: false,
        vendor_category: vendor_category ?? null,
        business_profile_complete: false,
      })
      .select("id, email, name, role, vendor_category")
      .single();

    if (error || !user) {
      logger.error({ err: error }, "Failed to create user");
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    await createAndSendOtp(user.id, user.email, "registration");

    res.status(201).json({
      requiresOtp: true,
      userId: user.id,
      email: user.email,
      message: "Account created. Please check your email for the verification code.",
    });
  } catch (err) {
    logger.error({ err }, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ── Complete business profile ─────────────────────────────────────────────────
export async function completeBusinessProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as Record<string, string>;
  const business_name = body.business_name ?? "";
  const business_category = body.business_category ?? "";
  const business_phone = body.business_phone ?? null;
  const instagram_username = (body.instagram_username ?? "").replace(/^@/, "").trim();
  const logoFile = (req as AuthRequest & { file?: MulterFile }).file;

  try {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email, name, business_profile_complete")
      .eq("id", userId)
      .single();

    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (existingUser.business_profile_complete) {
      res.status(409).json({ error: "Business profile already completed" });
      return;
    }

    // Upload logo if provided — failure is non-fatal, we save the profile either way
    let logoUrl: string | null = null;
    if (logoFile) {
      logoUrl = await uploadLogo(logoFile, userId);
    }

    const updatePayload: Record<string, unknown> = {
      business_name: business_name.trim(),
      business_category: business_category.trim(),
      instagram_username: instagram_username || null,
      business_logo_url: logoUrl,
      business_profile_complete: true,
    };
    if (business_phone) {
      updatePayload.business_phone = business_phone.trim();
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) {
      logger.error({ err: updateError }, "Failed to update business profile");
      res.status(500).json({ error: "Failed to save business profile. Please try again." });
      return;
    }

    const registeredAt = new Date().toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    void sendWelcomeEmail({
      to: existingUser.email,
      vendorName: existingUser.name ?? "",
      businessName: business_name.trim(),
      businessCategory: business_category.trim(),
      instagramUsername: instagram_username || "",
    });

    void sendAdminNotificationEmail({
      vendorName: existingUser.name ?? "",
      email: existingUser.email,
      businessName: business_name.trim(),
      businessCategory: business_category.trim(),
      businessPhone: business_phone?.trim() ?? "",
      instagramUsername: instagram_username || "",
      registeredAt,
    });

    logger.info({ userId, hasLogo: !!logoUrl }, "Business profile completed");
    res.json({ success: true, message: "Business profile saved." });
  } catch (err) {
    logger.error({ err }, "Complete business profile error");
    res.status(500).json({ error: "Something went wrong saving your profile. Please try again." });
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
// Accounts on the @meetadoll.local internal domain are password-only (no OTP).
// These are internal admin accounts with no real email inbox.
const INTERNAL_DOMAIN = "@meetadoll.local";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select(`
        id, email, name, role, password_hash,
        vendor_category, business_name, business_category,
        business_logo_url, instagram_username, business_profile_complete
      `)
      .eq("email", email)
      .single();

    if (error || !user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Internal admin accounts skip OTP — issue tokens directly
    if (user.email.endsWith(INTERNAL_DOMAIN)) {
      const u = user as typeof user & {
        vendor_category?: string | null;
        business_name?: string | null;
        business_category?: string | null;
        business_logo_url?: string | null;
        instagram_username?: string | null;
        business_profile_complete?: boolean;
      };
      const accessToken = signAccessToken({
        id: u.id,
        email: u.email,
        name: u.name ?? "",
        role: u.role,
        vendor_category: u.vendor_category,
        business_name: u.business_name,
        business_category: u.business_category,
        business_logo_url: u.business_logo_url,
        instagram_username: u.instagram_username,
        business_profile_complete: u.business_profile_complete ?? false,
      });
      const refreshToken = signRefreshToken(u.id);
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
      logger.info({ userId: u.id, role: u.role }, "Internal admin login — OTP skipped");
      res.json({
        token: accessToken,
        user: {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          vendor_category: u.vendor_category,
          business_name: u.business_name,
          business_category: u.business_category,
          business_logo_url: u.business_logo_url,
          instagram_username: u.instagram_username,
          business_profile_complete: u.business_profile_complete ?? false,
        },
      });
      return;
    }

    await createAndSendOtp(user.id, user.email, "login");

    res.json({
      requiresOtp: true,
      userId: user.id,
      message: "Please check your email for the login verification code.",
    });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
}

// ── Refresh token ─────────────────────────────────────────────────────────────
export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ error: "Missing refresh token", code: "TOKEN_INVALID" });
    return;
  }

  try {
    const decoded = verifyRefreshToken(token);

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, role, vendor_category, business_name, business_category, business_logo_url, instagram_username, business_profile_complete")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      res.status(401).json({ error: "Invalid refresh token", code: "TOKEN_INVALID" });
      return;
    }

    const u = user as typeof user & {
      vendor_category?: string | null;
      business_name?: string | null;
      business_category?: string | null;
      business_logo_url?: string | null;
      instagram_username?: string | null;
      business_profile_complete?: boolean;
    };

    const accessToken = signAccessToken({
      id: u.id,
      email: u.email,
      name: u.name ?? "",
      role: u.role,
      vendor_category: u.vendor_category,
      business_name: u.business_name,
      business_category: u.business_category,
      business_logo_url: u.business_logo_url,
      instagram_username: u.instagram_username,
      business_profile_complete: u.business_profile_complete ?? false,
    });
    const newRefreshToken = signRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions);
    res.json({
      token: accessToken,
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        vendor_category: u.vendor_category,
        business_name: u.business_name,
        business_category: u.business_category,
        business_logo_url: u.business_logo_url,
        instagram_username: u.instagram_username,
        business_profile_complete: u.business_profile_complete ?? false,
      },
    });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Refresh token expired", code: "TOKEN_EXPIRED" });
      return;
    }
    res.status(401).json({ error: "Invalid refresh token", code: "TOKEN_INVALID" });
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.json({ message: "Logged out" });
}

// ── Verify email (link-based, legacy) ────────────────────────────────────────
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.body;

  try {
    let decoded: { purpose: string; email: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { purpose: string; email: string };
    } catch (jwtErr) {
      if (jwtErr instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: "Verification token has expired. Please request a new verification email." });
        return;
      }
      res.status(400).json({ error: "Invalid verification token" });
      return;
    }

    if (decoded.purpose !== "email_verification") {
      res.status(400).json({ error: "Invalid verification token" });
      return;
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, email_verified")
      .eq("email", decoded.email)
      .single();

    if (error || !user) {
      res.status(400).json({ error: "Invalid verification token" });
      return;
    }

    if (user.email_verified) {
      res.status(400).json({ error: "Email already verified" });
      return;
    }

    await supabase.from("users").update({ email_verified: true }).eq("id", user.id);
    res.json({ message: "Email verified successfully" });
  } catch (err) {
    logger.error({ err }, "Email verification error");
    res.status(500).json({ error: "Internal server error" });
  }
}
