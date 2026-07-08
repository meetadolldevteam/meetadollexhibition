---
name: Meetadoll Supabase schema quirks
description: Real column names in the Meetadoll exhibition Supabase tables, which differ from common assumptions
---

The Supabase project backing the Meetadoll Exhibition app has a leaner schema than typically assumed. Always verify live columns before writing queries or types — do not assume standard fields like `updated_at`, `size`, `amount`, or `date` exist just because they're common conventions.

Known real columns (as of 2026-07-08):
- `users`: id, name, email, password_hash, phone, role, email_verified, created_at (no business_name, verification_token, updated_at)
- `stalls`: id, exhibition_id, stall_number, package, price, status, position, created_at (no size)
- `reservations`: id, stall_id, user_id, status, reservation_code, hold_expires_at, created_at (no amount, exhibition_id — must join through stalls)
- `payments`: id, reservation_id, amount, transaction_reference, gateway, status, created_at (no tx_ref, payment_ref, user_id — must join through reservations)
- `exhibitions`: id, name, venue, start_date, end_date, status, created_at (no date, organizer_contact)

**Why:** An earlier implementation pass assumed a richer schema and every controller had to be rewritten (nested joins like `stalls!inner`, computing amount from `stall.price` instead of a stored column, self-verifying JWTs instead of a `verification_token` column) after hitting `permission denied` and later `column does not exist` errors.

**How to apply:** Before adding new queries/controllers against this Supabase project, check the schema live (e.g. via a `SELECT * ... LIMIT 1` or the Supabase dashboard) rather than trusting prior assumptions or generic exhibition-app schema patterns.

Also: the Supabase `service_role` key had zero grants on any table when this project was first wired up (`permission denied for table ...` on every query even though the credentials were correct). Fix was running in the Supabase SQL editor:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
NOTIFY pgrst, 'reload schema';
```
If a freshly connected Supabase project returns permission errors despite correct keys, check grants before assuming the key/URL is wrong.
