---
paths:
  - "src/db/**"
  - "supabase/**"
---

# Database & security

All database access goes through `src/db/*Repo.ts`. Direct Supabase imports anywhere else fail the architecture test.

**RLS is a stop sign.** If a table holds data that is *earned* or *computed* from user actions rather than typed in by the user, it is system-only. Do not add INSERT/UPDATE/DELETE policies for it — ask. If you're unsure whether users need a capability, ask. Never add a permissive policy "just in case."

**Migrations are deliverables.** SQL in a plan means you write `supabase/migrations/<timestamp>_*.sql` and tell the user to run it before testing. A DB-dependent task without a migration file is not finished.

**Verify saves at the database, not in the UI.** `supabase db query --linked` is the ground truth when the user reports "it won't save" — a swallowed `console.error` looks exactly like a success.
