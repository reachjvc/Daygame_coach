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
trigger. See `20260827010000_life_answers_no_update.sql` for the trigger form.

**A read with no upper bound is a bug waiting for a heavy user.** The database
returns at most 1,000 rows per request and says nothing about it — no error, no
flag, just fewer rows than exist. It has bitten twice on real data here: a
timetrack table holding 32,126 rows returned 1,000, and a training account
holding 2,444 sets returned 1,000, so every workout in History lost its later
sets and the correction screen would have deleted them for real on the next save.

Use `readAllRows` from `src/db/paging.ts`, order by something unique (`id`, or
your order with `id` after it — rows that tie can appear in two pages and push
another off both), and chunk `in (...)` filters with `chunkIds` because those
travel in the URL and a few thousand ids is a request the proxy rejects.
`tests/unit/architecture.test.ts` counts the unpaged reads per file and the
counts may only go down.

**A screen that saves back what it loaded must load it itself.** The truncation
above only destroyed data because the correction screen edited the year-long
list it happened to be showing. Anything that replaces rows wholesale reads its
own subject, and refuses to open when that read fails.

**Verify saves at the database, not in the UI.** `supabase db query --linked` is the ground truth when the user reports "it won't save" — a swallowed `console.error` looks exactly like a success.
