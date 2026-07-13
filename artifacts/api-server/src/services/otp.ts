import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../config/supabase";
import { logger } from "../lib/logger";
import { sendOtpEmail } from "./email";

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Per-user generation lock: prevents two concurrent requests from both
// generating and sending OTPs for the same user+type within the same tick.
const generationLocks = new Map<string, boolean>();

export async function createAndSendOtp(
  userId: string,
  email: string,
  type: "registration" | "login"
): Promise<void> {
  const lockKey = `${userId}:${type}`;

  // If a generation is already in-flight for this user+type, skip it.
  // The in-flight request will complete and the user will receive one OTP.
  if (generationLocks.get(lockKey)) {
    logger.warn({ userId, type }, "OTP generation already in progress — skipping duplicate");
    return;
  }

  generationLocks.set(lockKey, true);
  try {
    const code = generateOtpCode();
    const hashed = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Cancel any previous unused OTPs for this user+type before creating a new one.
    // This ensures only the latest OTP is ever valid (queue = latest wins).
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
  } finally {
    generationLocks.delete(lockKey);
  }
}
