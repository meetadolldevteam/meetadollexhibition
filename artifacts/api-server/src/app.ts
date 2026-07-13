import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startHoldCleanupJob } from "./services/holdCleanup";
import { generalApiRateLimiter } from "./middleware/rateLimit";

const app: Express = express();

app.set("trust proxy", 1);

// ── www → canonical redirect ──────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host ?? "";
  if (host.startsWith("www.")) {
    return res.redirect(301, `https://meetadollexhibition.com${req.url}`);
  }
  next();
});

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // frontend serves its own CSP
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS — only allow the production domain + Replit dev preview URLs ─────────
const PRODUCTION_ORIGIN = "https://meetadollexhibition.com";
const replitDevOrigins = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((d) => `https://${d.trim()}`)
  .filter((d) => d !== "https://");

const allowedOrigins = new Set([PRODUCTION_ORIGIN, ...replitDevOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-to-server requests (no Origin header)
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

// ── Global error handler — never expose stack traces or internal details ──────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong" });
});

startHoldCleanupJob();

export default app;
