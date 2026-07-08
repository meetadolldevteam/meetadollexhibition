---
name: Meetadoll auth architecture
description: JWT access/refresh token design and frontend API client pattern used in the Meetadoll Exhibition app
---

Auth uses a short-lived access token + long-lived refresh token split, not a single long-lived JWT or server sessions:
- Access token: JWT, 24h expiry, sent as `Authorization: Bearer` header, kept only in memory on the frontend (never localStorage).
- Refresh token: JWT, 7d expiry, stored in an httpOnly cookie, used only to hit `/api/auth/refresh` to mint a new access token.

**Why:** httpOnly cookie for the refresh token avoids XSS token theft while keeping the access token attachable to API requests without CSRF-prone cookie auth on every route. This was an explicit user requirement, not a default assumption.

**How to apply:** The frontend's `apiClient` wraps fetch with `credentials: 'include'`, attaches the in-memory access token as a Bearer header, and on a 401 with `code: TOKEN_EXPIRED`/`TOKEN_INVALID` it calls `/api/auth/refresh` once (de-duped via a shared in-flight promise) then retries the original request. All frontend API calls go through `VITE_API_URL` (set to `/api` via the artifact's env, not hardcoded) rather than root-relative paths, consistent with the shared-proxy routing convention for this monorepo.

The Meetadoll frontend has no direct Supabase calls from components — all data access goes through the Express API server, which is the sole Supabase client. Do not add `@supabase/supabase-js` back to the frontend; it was intentionally removed once the API client existed.
