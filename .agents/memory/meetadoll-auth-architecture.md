---
name: Meetadoll auth architecture
description: JWT access/refresh token design and frontend API client pattern used in the Meetadoll Exhibition app
---

Auth uses a short-lived access token + long-lived refresh token split, not a single long-lived JWT or server sessions:
- Access token: JWT, 24h expiry, sent as `Authorization: Bearer` header, kept only in memory on the frontend (never localStorage). Carries a unique `jti` (UUID) so it can be individually revoked on logout.
- Refresh token: JWT, 7d expiry, stored in an httpOnly cookie, used only to hit `/api/auth/refresh` to mint a new access token. Also carries a unique `jti` so it can be revoked on logout and invalidated on rotation.

**Token revocation design constraint:** Both access and refresh tokens carry a `jti` (UUID). On logout and on refresh-token rotation, both JTIs must be revoked before any page navigation or new tokens are issued — including from the inactivity auto-logout path. The blocklist is currently in-memory only (Map keyed by jti → expiry ms); persistence across restarts is a separate deliverable (Task #9). The in-memory revocation is safe because Node.js is single-threaded: `blocklist.set()` runs synchronously before the first `await` in the refresh handler, so concurrent requests with the same token are blocked.

**Admin route live role check:** All `/api/admin/*` routes run a `verifyRoleFromDb` middleware (in `roleCheck.ts`) after `authenticate`. It fetches the caller's current role from `users` and overwrites `req.user.role` before any `requireAdmin` / `requireManagerRole` / `requireSuperAdmin` check runs. This must remain in place — removing it restores the 24h privilege-persistence window for demoted admins.

**Why:** httpOnly cookie for the refresh token avoids XSS token theft while keeping the access token attachable to API requests without CSRF-prone cookie auth on every route. This was an explicit user requirement, not a default assumption.

**How to apply:** The frontend's `apiClient` wraps fetch with `credentials: 'include'`, attaches the in-memory access token as a Bearer header, and on a 401 with `code: TOKEN_EXPIRED`/`TOKEN_INVALID` it calls `/api/auth/refresh` once (de-duped via a shared in-flight promise) then retries the original request. All frontend API calls go through `VITE_API_URL` (set to `/api` via the artifact's env, not hardcoded) rather than root-relative paths, consistent with the shared-proxy routing convention for this monorepo.

The Meetadoll frontend has no direct Supabase calls from components — all data access goes through the Express API server, which is the sole Supabase client. Do not add `@supabase/supabase-js` back to the frontend; it was intentionally removed once the API client existed.
