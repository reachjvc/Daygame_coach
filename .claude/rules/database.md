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

**A probe against live data is read-only, or it is wrapped and rolled back.**
Never run `update`, `delete` or `insert` against the real database to find
something out. On 2026-08-27 an `update life_answers set body = 'rewritten'`,
run to check whether a constraint held, destroyed a sentence a real person had
written ninety seconds earlier. It is not recoverable. The shape a probe must
take:

```sql
begin;
  -- whatever you need to find out
rollback;
```

Writes to live data happen two ways and no others: a migration file, or the app
itself. The service-role key is for reading.

**A policy is not enforcement.** RLS constrains the app's authenticated client
and nothing else — the service-role key, the SQL editor and every script you
write walk straight past it. "There is no UPDATE policy, so this cannot be
rewritten" was the claim; the probe above disproved it in one statement. If a
rule must hold for *everyone*, it is a `CHECK`, a `NOT NULL`, a foreign key or a
trigger. See `20260827_life_answers_no_update.sql` for the trigger form.

**Verify saves at the database, not in the UI.** `supabase db query --linked` is the ground truth when the user reports "it won't save" — a swallowed `console.error` looks exactly like a success.
