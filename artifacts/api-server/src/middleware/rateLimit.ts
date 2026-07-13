import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Response } from "express";
import { AuthRequest } from "./auth";

function rateLimitHandler(message: string) {
  return (_req: unknown, res: Response) => {
    res.status(429).json({ error: message });
  };
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many login attempts. Please try again in 15 minutes."),
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many registration attempts. Please try again in an hour."),
});

export const stallHoldRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).user?.id ?? ipKeyGenerator(req.ip ?? "unknown"),
  handler: rateLimitHandler("Too many stall hold attempts. Please try again in an hour."),
});

export const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many verification attempts. Please try again in 15 minutes."),
});

export const otpResendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many resend requests. Please try again in 15 minutes."),
});

export const generalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many requests. Please try again later."),
});
