import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { logger } from "../lib/logger";

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

// ── Suspicious activity limiter ───────────────────────────────────────────────
// Tracks per-user (or per-IP for unauthenticated) request counts per endpoint.
// >20 hits within a 10-minute window → block for 30 minutes + log the event.

const WINDOW_MS = 10 * 60 * 1000;   // 10 minutes
const MAX_HITS = 20;
const BLOCK_MS = 30 * 60 * 1000;    // 30 minutes

interface HitEntry { count: number; firstHit: number; }
const hitMap = new Map<string, HitEntry>();
const blockMap = new Map<string, number>(); // key → unblock timestamp

// Prune expired entries every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of blockMap.entries()) {
    if (now > expiry) blockMap.delete(key);
  }
  for (const [key, entry] of hitMap.entries()) {
    if (now - entry.firstHit > WINDOW_MS) hitMap.delete(key);
  }
}, 5 * 60 * 1000);

export function suspiciousActivityLimiter(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthRequest;
  const identity = authReq.user?.id ?? req.ip ?? "unknown";
  const key = `${identity}:${req.path}`;
  const now = Date.now();

  // If currently blocked, reject immediately
  const unblockAt = blockMap.get(key);
  if (unblockAt && now < unblockAt) {
    const remainingMin = Math.ceil((unblockAt - now) / 60_000);
    res.status(429).json({
      error: `Too many requests detected. You are temporarily blocked for ${remainingMin} more minute${remainingMin === 1 ? "" : "s"}.`,
    });
    return;
  }

  // Count this hit
  const entry = hitMap.get(key);
  if (!entry || now - entry.firstHit > WINDOW_MS) {
    hitMap.set(key, { count: 1, firstHit: now });
  } else {
    entry.count += 1;
    if (entry.count > MAX_HITS) {
      blockMap.set(key, now + BLOCK_MS);
      hitMap.delete(key);
      logger.warn(
        { identity, path: req.path, method: req.method, count: entry.count },
        "Suspicious activity detected — user blocked for 30 minutes"
      );
      res.status(429).json({
        error: "Suspicious activity detected. You have been temporarily blocked for 30 minutes.",
      });
      return;
    }
  }

  next();
}
