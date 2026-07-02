import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";

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
    const verificationToken = uuidv4();

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

    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.body;

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("verification_token", token)
      .single();

    if (error || !user) {
      res.status(400).json({ error: "Invalid or expired verification token" });
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
