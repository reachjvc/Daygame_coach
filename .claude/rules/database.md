---
paths:
  - "src/db/**"
  - "supabase/**"
---

# Database

- All database access goes through `src/db/*Repo.ts`.
- Tables holding earned or computed data are system-only. Ask before adding any INSERT/UPDATE/DELETE RLS policy.
- RLS binds only the app's client. The service-role key, SQL editor and scripts bypass it. A rule that must always hold is a `CHECK`, `NOT NULL`, foreign key or trigger.
- Probes against live data are read-only or wrapped in `begin; … rollback;`. Live writes happen only through a migration or the app.
- Migrations: write `supabase/migrations/<timestamp>_*.sql`, then ask before applying. Run `supabase migration list --linked` first — `db push` applies every pending migration, including other people's.
- Reads are capped at 1,000 rows silently. Use `readAllRows` from `src/db/paging.ts`, order by a unique key, and `chunkIds` for large `in (...)` filters.
- A screen that saves back what it loaded must load its own data, and refuse to open when that read fails.
- "It won't save" reports: check the database itself with `npx supabase db query --linked`.
