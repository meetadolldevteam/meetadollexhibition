import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

export interface AccessTokenPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  vendor_category?: string | null;
  business_name?: string | null;
  business_category?: string | null;
  business_logo_url?: string | null;
  instagram_username?: string | null;
  business_profile_complete?: boolean;
}

export interface RefreshTokenPayload {
  id: string;
  type: "refresh";
  jti: string;
}

const ACCESS_TOKEN_EXPIRY = "24h";
const REFRESH_TOKEN_EXPIRY = "7d";
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Access token lifetime in seconds — must match ACCESS_TOKEN_EXPIRY
export const ACCESS_TOKEN_EXPIRY_SECS = 24 * 60 * 60;

export const REFRESH_TOKEN_EXPIRY_SECS = 7 * 24 * 60 * 60;

export function signAccessToken(payload: AccessTokenPayload): string {
  // Include a unique jti so this token can be individually revoked on logout
  return jwt.sign(
    { ...payload, jti: randomUUID() },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function signRefreshToken(userId: string): string {
  // Include a unique jti so refresh tokens can be individually revoked on logout
  const payload: RefreshTokenPayload = { id: userId, type: "refresh", jti: randomUUID() };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as RefreshTokenPayload;
  if (decoded.type !== "refresh") {
    throw new Error("Not a refresh token");
  }
  return decoded;
}

const isProduction = process.env.NODE_ENV === "production";

export const REFRESH_COOKIE_NAME = "refresh_token";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: REFRESH_TOKEN_MAX_AGE_MS,
};
