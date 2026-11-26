---
paths:
  - "src/db/**"
  - "supabase/**"
---
# Database
- All database access goes through `src/db/*Repo.ts`.
- Tables holding earned or computed data are system-only. Ask before adding any INSERT/UPDATE/DELETE RLS policy.
- RLS binds only the app's client. The service-role key, SQL editor and scripts bypass it. A rule that must always hold is a `CHECK`, `NOT NULL`, foreign key or trigger.
- The live database is read-only for probes. Live writes happen only through a migration or the app. Tests write only to the local test database.
- Migrations: write `supabase/migrations/<timestamp>_*.sql`, then ask before applying. Run `supabase migration list --remote` first (CLI 3.x: without `--remote` both commands target the local database): `db push --remote` applies every pending migration, including other people's.
- Reads are capped at 1,000 rows silently. Use `readAllRows` from `src/db/paging.ts`, order by a unique key, and `chunkIds` for large `in (...)` filters.
- A screen that saves back what it loaded must load its own data, and refuse to open when that read fails.
- "It won't save" reports: check the database itself with `npx supabase db query --remote --read-only "<select>"`. Never `--yes`.
- More (backups, test database traps, what is true now): `docs/tech.md`.
