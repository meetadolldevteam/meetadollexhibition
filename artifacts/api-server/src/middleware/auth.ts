import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { isRevoked } from "../lib/tokenBlocklist";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string; role: string; jti?: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET not configured" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name: string;
      role: string;
      jti?: string;
    };

    // Reject tokens that have been explicitly revoked (e.g. via logout)
    if (payload.jti && isRevoked(payload.jti)) {
      res.status(401).json({ error: "Token has been revoked", code: "TOKEN_REVOKED" });
      return;
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
      return;
    }
    res.status(401).json({ error: "Invalid token", code: "TOKEN_INVALID" });
  }
}
