import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { startHoldCleanupJob } from "./services/holdCleanup";
import { loadBlocklistFromDb, cleanupExpiredTokens } from "./lib/tokenBlocklist";
import { generalApiRateLimiter } from "./middleware/rateLimit";

const app: Express = express();

app.set("trust proxy", 1);

// ── www → canonical redirect ──────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host ?? "";
  if (host.startsWith("www.")) {
    const code = req.method === "GET" || req.method === "HEAD" ? 301 : 308;
    return res.redirect(code, `https://meetadollexhibition.com${req.url}`);
  }
  next();
});

// ── Request timeout — 30 seconds max ─────────────────────────────────────────
// Prevents hung connections under load. Sends 503 rather than hanging forever.
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setTimeout(30_000, () => {
    logger.warn({ method: req.method, url: req.url?.split("?")[0] }, "Request timeout after 30s");
    if (!res.headersSent) {
      res.status(503).json({ error: "Request timed out. Please try again." });
    }
  });
  next();
});

// ── Compression — gzip/deflate all API responses ─────────────────────────────
app.use(compression());

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// ── CORS — allow the production domains, Vercel preview, and Replit previews ──
const productionOrigins = [
  "https://meetadollexhibition-meetadoll-exhibition-eotnci7d7.vercel.app",
  "https://meetadollexhibition.com",
  "https://www.meetadollexhibition.com",
];
const replitDevOrigins = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => `https://${d.trim()}`)
  .filter((d) => d !== "https://");

const allowedOrigins = new Set([...productionOrigins, ...replitDevOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

// ── Request logging — method, route, IP, timestamp ───────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
          ip:
            req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ??
            req.socket?.remoteAddress,
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Body parsing (rawBody preserved for webhook signature verification) ───────
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", generalApiRateLimiter, router);

// ── Global error handler ──────────────────────────────────────────────────────
// Maps known infrastructure errors to clean HTTP codes; never exposes internals.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const msg = err.message ?? "";

  // Supabase / network unreachable — return 503 instead of 500
  if (
    msg.includes("fetch failed") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("UND_ERR")
  ) {
    logger.error({ err }, "Database/network unreachable");
    res.status(503).json({ error: "Service temporarily unavailable. Please try again shortly." });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong" });
});

startHoldCleanupJob();

// Load revoked token blocklist from Supabase (best-effort, in-memory fallback)
void loadBlocklistFromDb();

// Daily cleanup of expired revoked tokens (runs at 03:00 server time)
cron.schedule("0 3 * * *", () => void cleanupExpiredTokens());
logger.info("Revoked token cleanup cron started (daily at 03:00)");

export default app;
