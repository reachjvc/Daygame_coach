---
paths:
  - "src/db/**"
  - "supabase/**"
---
# Database code
The one home of the rules for database code. Reading the live database, CLIs and keys: `docs/tech.md` section 4.
- All database access goes through `src/db/*Repo.ts`.
- Tables holding earned or computed data are system-only. Ask before adding any INSERT/UPDATE/DELETE RLS policy.
- RLS binds only the app's client. The service-role key, SQL editor and scripts bypass it. A rule that must always hold is a `CHECK`, `NOT NULL`, foreign key or trigger.
- Live writes happen only through a migration or the app. Never from a test or a script.
- Migrations: write `supabase/migrations/<timestamp>_*.sql`, then ask him before applying. Run `supabase migration list --remote` first (CLI 3.x: without `--remote` both commands target the local database): `db push --remote` applies every pending migration, other sessions' too.
- Reads stop at 1,000 rows without a warning. Use `readAllRows` from `src/db/paging.ts`, order by a unique key, and `chunkIds` for large `in (...)` filters.
- A screen that saves back what it loaded must load its own data, and refuse to open when that read fails.
- "It won't save" reports: check the database itself with a read-only query (`docs/tech.md` section 4).
