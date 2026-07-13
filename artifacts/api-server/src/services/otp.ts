import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { sendOtpEmail } from "./email";

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createAndSendOtp(
  userId: string,
  email: string,
  type: "registration" | "login"
): Promise<void> {
  const code = generateOtpCode();
  const hashed = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalidate any existing unused OTPs for this user+type
  await supabase
    .from("otps")
    .update({ used: true })
    .eq("user_id", userId)
    .eq("type", type)
    .eq("used", false);

  const { error } = await supabase.from("otps").insert({
    id: uuidv4(),
    user_id: userId,
    otp_code: hashed,
    type,
    expires_at: expiresAt,
    used: false,
    attempts: 0,
  });

  if (error) {
    logger.error({ err: error }, "Failed to create OTP record");
    throw new Error("Failed to generate OTP");
  }

  await sendOtpEmail(email, code, type);
  logger.info({ userId, type }, "OTP created and email sent");
}
