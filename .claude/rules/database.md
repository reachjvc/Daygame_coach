---
paths:
  - "src/db/**"
  - "supabase/**"
---

# Database & security

All database access goes through `src/db/*Repo.ts`. Direct Supabase imports anywhere else fail the architecture test.

**RLS is a stop sign.** If a table holds data that is *earned* or *computed* from user actions rather than typed in by the user, it is system-only. Do not add INSERT/UPDATE/DELETE policies for it — ask. If you're unsure whether users need a capability, ask. Never add a permissive policy "just in case."

**Migrations are deliverables, and you run them.** SQL in a plan means you write `supabase/migrations/<timestamp>_*.sql` and then apply it yourself with `supabase db push --linked` — don't hand the user a command to run. A DB-dependent task with an unapplied migration is not finished.

Two things before you push: `supabase migration list --linked` first, because `db push` applies **every** pending migration and somebody else's half-finished one is not yours to ship — if there are others pending, say so and apply only yours. And the RLS stop sign above still holds: you ask before *writing* an INSERT/UPDATE/DELETE policy, then you run the migration that contains it once it's agreed.

**Verify saves at the database, not in the UI.** `supabase db query --linked` is the ground truth when the user reports "it won't save" — a swallowed `console.error` looks exactly like a success.
