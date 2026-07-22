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
    allowedMimeTypes: ["image/jpeg", "image/png"],
    fileSizeLimit: 4 * 1024 * 1024,
  });
  if (error && !error.message.includes("already exists")) {
    logger.warn({ err: error }, "Could not ensure business-logos bucket");
  }
}

async function uploadLogo(file: MulterFile, userId: string): Promise<string | null> {
  try {
    await ensureLogosBucket();
    const ext = file.mimetype === "image/png" ? "png" : "jpg";
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("business-logos")
      .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (error) {
      logger.warn({ err: error }, "Logo upload failed — continuing without logo");
      return null;
    }
    const { data } = supabase.storage.from("business-logos").getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    logger.warn({ err }, "Logo upload exception — continuing without logo");
    return null;
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  const {
    email,
    password,
    name,
    phone,
    vendor_category,
    business_name,
    business_category,
    business_phone,
    instagram_username,
  } = req.body as Record<string, string>;

  const logoFile = (req as Request & { file?: MulterFile }).file;

  if (!business_name?.trim()) {
    res.status(422).json({ error: "Business name is required" });
    return;
  }
  if (!business_category?.trim()) {
    res.status(422).json({ error: "Business category is required" });
    return;
  }
  if (!business_phone?.trim()) {
    res.status(422).json({ error: "Business phone number is required" });
    return;
  }
  if (!instagram_username?.trim()) {
    res.status(422).json({ error: "Instagram username is required" });
    return;
  }
  if (!logoFile) {
    res.status(422).json({ error: "Business logo is required" });
    return;
  }
  if (logoFile.size > 4 * 1024 * 1024) {
    res.status(422).json({ error: "Logo file must be under 4MB" });
    return;
  }

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
    const cleanInstagram = instagram_username.replace(/^@/, "");

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
        business_name: business_name.trim(),
        business_category: business_category.trim(),
        business_phone: business_phone.trim(),
        instagram_username: cleanInstagram,
      })
      .select("id, email, name, role, vendor_category, business_name, business_category, instagram_username")
      .single();

    if (error || !user) {
      logger.error({ err: error }, "Failed to create user");
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    const logoUrl = await uploadLogo(logoFile, user.id);
    if (logoUrl) {
      await supabase.from("users").update({ business_logo_url: logoUrl }).eq("id", user.id);
    }

    await createAndSendOtp(user.id, user.email, "registration");

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
      to: user.email,
      vendorName: user.name ?? name,
      businessName: business_name.trim(),
      businessCategory: business_category.trim(),
      instagramUsername: cleanInstagram,
    });

    void sendAdminNotificationEmail({
      vendorName: user.name ?? name,
      email: user.email,
      businessName: business_name.trim(),
      businessCategory: business_category.trim(),
      businessPhone: business_phone.trim(),
      instagramUsername: cleanInstagram,
      registeredAt,
    });

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

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, name, role, password_hash")
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
      .select("id, email, name, role, vendor_category, business_name, business_category, business_logo_url, instagram_username")
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

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.json({ message: "Logged out" });
}

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

    await supabase
      .from("users")
      .update({ email_verified: true })
      .eq("id", user.id);

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    logger.error({ err }, "Email verification error");
    res.status(500).json({ error: "Internal server error" });
  }
}
