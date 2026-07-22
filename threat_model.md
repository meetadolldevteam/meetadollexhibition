# Threat Model

## Project Overview

Meetadoll Exhibition is a publicly deployed vendor-registration and stall-booking application. The production system consists of a React/Vite single-page app in `artifacts/meetadoll-exhibition` and an Express API in `artifacts/api-server` backed by Supabase/PostgreSQL and Supabase Storage. Vendors register, verify login by emailed OTP, complete a business profile, reserve exhibition stalls, and pay through Paystack. Admin and staff users manage reservations, stalls, payments, announcements, and event operations through authenticated API routes.

Production scope assumptions for this repository:
- `artifacts/api-server` and `artifacts/meetadoll-exhibition` are production surfaces.
- `artifacts/mockup-sandbox` is dev-only unless future code or deployment config routes production traffic to it.
- The deployment is public, so all unauthenticated routes and webhook endpoints are internet-reachable.
- TLS is handled by the platform and is not a primary review target.

## Assets

- **User accounts and sessions** — vendor, staff, admin, and super-admin identities plus JWT access tokens and refresh cookies. Compromise enables account takeover and privileged actions.
- **Supabase service credentials** — the service-role key can bypass row-level protections and access database and storage resources directly.
- **Reservation and payment records** — stall holds, confirmed reservations, payment status, transaction references, and refund actions drive money flow and stall ownership.
- **Vendor PII and business data** — names, emails, phone numbers, business profile fields, and uploaded logos are exposed to the API and admin tools.
- **Operational messaging channels** — OTP emails, confirmation emails, and admin announcements can be abused for spam or user impersonation if authorization fails.

## Trust Boundaries

- **Browser to API** — all frontend requests to `/api` cross from an untrusted client into the backend. The server must authenticate and authorize every protected action.
- **API to Supabase** — the API holds a Supabase service credential and can directly read and mutate application data. Any server-side auth bypass or secret leakage becomes full data compromise.
- **API to Paystack** — payment initiation and webhook verification cross a third-party trust boundary. The app must verify payment state before updating reservations or stalls.
- **Public to authenticated/admin surfaces** — exhibitions, stall browsing, health checks, auth endpoints, and payment webhooks are public; reservation management and admin tooling must remain restricted server-side.
- **Production to dev-only utilities** — `devAuth` and `mockup-sandbox` are only acceptable outside production. Future scans should treat any production reachability here as a high-priority issue.

## Scan Anchors

- Production API entry points: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/api-server/src/controllers/*.ts`
- Highest-risk code areas: auth and JWT handling (`middleware/auth.ts`, `lib/tokens.ts`, `controllers/authController.ts`, `controllers/otpController.ts`), admin APIs (`routes/admin.ts`, `controllers/adminController.ts`), payment flow (`controllers/paymentController.ts`), and Supabase credential usage (`config/supabase.ts`)
- Public surfaces: `/api/auth/*`, `/api/exhibitions`, `/api/stalls`, `/api/healthz`, `/api/payments/webhook`
- Authenticated surfaces: stall hold, reservation APIs, payment initiation, business profile completion
- Admin-only surfaces: `/api/admin/*`
- Usually ignore as dev-only unless reachability changes: `artifacts/mockup-sandbox`, frontend `/dev-auth` route guarded by `import.meta.env.DEV`, backend `routes/devAuth.ts` guarded by `NODE_ENV !== "production"`

## Threat Categories

### Spoofing

The application relies on self-issued JWTs for vendors and admins, plus emailed OTPs for login and registration. The system must keep signing secrets out of source control, validate JWTs with production-only secrets, and ensure no development auth path is reachable in production. Payment webhooks must only trust events that pass Paystack signature verification and transaction re-verification.

### Tampering

Reservation status, stall status, payment status, refund actions, and admin operational changes are all high-value state transitions. The API must derive authorization and payment amounts server-side, restrict admin mutation routes by role, and prevent unauthenticated or cross-tenant users from changing another user's reservation or stall state.

### Information Disclosure

The API processes vendor PII, business profile data, and reservation/payment details. The system must avoid exposing service-role credentials, JWT secrets, or sensitive user data through source control, responses, logs, or overly broad admin and reservation queries. Publicly reachable endpoints must not disclose privileged internal state beyond what is intentionally public.

### Denial of Service

Public auth, OTP, stall, and webhook routes are internet-facing. The system must rate-limit abuse-prone endpoints, bound upload and request sizes, and avoid letting malformed webhook or auth traffic trigger disproportionate processing or long-lived resource exhaustion.

### Elevation of Privilege

Admin and super-admin capabilities include refunds, stall control, vendor data access, and team management. The server must enforce role checks on every admin endpoint and treat leaked signing secrets or service credentials as privilege-escalation paths because they can convert an external attacker into an authenticated admin or direct database operator.
