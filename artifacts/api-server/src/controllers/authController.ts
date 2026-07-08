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

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, phone, business_name } = req.body;

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
    const verificationToken = jwt.sign(
      { purpose: "email_verification", email },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        name,
        phone,
        business_name,
        role: "vendor",
        email_verified: false,
        verification_token: verificationToken,
      })
      .select("id, email, name, role")
      .single();

    if (error) {
      logger.error({ err: error }, "Failed to create user");
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    res.status(201).json({ message: "Registration successful. Please verify your email.", user });
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
      .select("id, email, name, role, password_hash, email_verified")
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

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);

    res.json({
      token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
      .select("id, email, name, role")
      .eq("id", decoded.id)
      .single();

    if (error || !user) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      res.status(401).json({ error: "Invalid refresh token", code: "TOKEN_INVALID" });
      return;
    }

    const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions);

    res.json({
      token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
      .select("id")
      .eq("verification_token", token)
      .eq("email", decoded.email)
      .single();

    if (error || !user) {
      res.status(400).json({ error: "Invalid or already-used verification token" });
      return;
    }

    await supabase
      .from("users")
      .update({ email_verified: true, verification_token: null })
      .eq("id", user.id);

    res.json({ message: "Email verified successfully" });
  } catch (err) {
    logger.error({ err }, "Email verification error");
    res.status(500).json({ error: "Internal server error" });
  }
}
