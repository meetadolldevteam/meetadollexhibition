/**
 * Token blocklist — tracks revoked JTIs to invalidate tokens on logout.
 *
 * Primary storage: in-memory Map (always available, instant lookups).
 * Persistence layer: Supabase `revoked_tokens` table (best-effort — code works
 * without it, but a server restart will clear the in-memory store).
 *
 * Required SQL (run once in Supabase SQL editor):
 *   CREATE TABLE IF NOT EXISTS revoked_tokens (
 *     token_jti  TEXT PRIMARY KEY,
 *     revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *     expires_at TIMESTAMPTZ NOT NULL
 *   );
 *   CREATE INDEX IF NOT EXISTS revoked_tokens_expires_idx ON revoked_tokens (expires_at);
 */

import { supabase } from "../config/supabase";
import { logger } from "./logger";

// in-memory store: jti → expiry epoch ms
const blocklist = new Map<string, number>();

let dbAvailable = false; // set to true once we confirm the table exists

/** Load still-valid revoked tokens from Supabase on server startup. */
export async function loadBlocklistFromDb(): Promise<void> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("revoked_tokens")
      .select("token_jti, expires_at")
      .gt("expires_at", now);

    if (error) {
      logger.warn({ code: error.code }, "revoked_tokens table not yet available — using in-memory blocklist only");
      return;
    }

    dbAvailable = true;
    for (const row of data ?? []) {
      const r = row as { token_jti: string; expires_at: string };
      blocklist.set(r.token_jti, new Date(r.expires_at).getTime());
    }
    logger.info({ count: blocklist.size }, "Token blocklist loaded from DB");
  } catch (err) {
    logger.warn({ err }, "Token blocklist DB load failed — in-memory only");
  }
}

/** Revoke a token. Persists to Supabase when the table is available. */
export async function revokeToken(jti: string, expiresAt: Date): Promise<void> {
  blocklist.set(jti, expiresAt.getTime());

  if (dbAvailable) {
    try {
      const { error } = await supabase.from("revoked_tokens").insert({
        token_jti: jti,
        revoked_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });
      if (error) {
        logger.warn({ err: error }, "Could not persist revoked token to DB — in-memory only");
      }
    } catch (err) {
      logger.warn({ err }, "Exception persisting revoked token — in-memory only");
    }
  }
}

/** Returns true if the token JTI has been explicitly revoked. */
export function isRevoked(jti: string): boolean {
  const expiresAt = blocklist.get(jti);
  if (expiresAt === undefined) return false;
  if (Date.now() > expiresAt) {
    blocklist.delete(jti);
    return false;
  }
  return true;
}

/** Remove expired entries from both the in-memory store and Supabase. */
export async function cleanupExpiredTokens(): Promise<void> {
  const now = Date.now();
  let purged = 0;
  for (const [jti, expiresAt] of blocklist.entries()) {
    if (now > expiresAt) {
      blocklist.delete(jti);
      purged++;
    }
  }

  if (dbAvailable) {
    try {
      const { error } = await supabase
        .from("revoked_tokens")
        .delete()
        .lt("expires_at", new Date().toISOString());

      if (error) {
        logger.warn({ err: error }, "Could not purge expired revoked tokens from DB");
      } else {
        logger.info({ purged }, "Expired revoked tokens cleaned up");
      }
    } catch (err) {
      logger.warn({ err }, "Exception during revoked token cleanup");
    }
  } else if (purged > 0) {
    logger.info({ purged }, "Expired revoked tokens purged from in-memory store");
  }
}
