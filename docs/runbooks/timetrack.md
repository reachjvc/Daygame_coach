# Time tracker runbook

What to check, and what to do, when something goes wrong with `/dashboard/time`.

## What the calendar endpoint is allowed to reach

`/api/timetrack/calendar` fetches a URL the user typed. That is a dangerous shape by default, so:

- It requires a signed-in user (`requireAuth`), and `proxy.ts` also rejects unauthenticated calls at the edge.
- Ten calls per user per minute (`rateLimitService`).
- Every address is resolved to real IP numbers and refused if any of them is loopback, private, link-local,
  unique-local, carrier-NAT, multicast or reserved (`networkGuardService`). The check runs again at the moment
  the socket opens, so a name that resolved publicly a moment ago cannot resolve privately now.
- Redirects are followed manually, three at most, each one re-checked.
- Every refusal returns the same sentence. A specific error tells an attacker what is behind an address.

**The rate limit counts in the memory of one server process.** Two instances mean twice the limit. When the app
runs as more than one instance, move the counter into Postgres or Redis. Stated limitation, not a bug.

## "I lost my tracked time"

1. Which browser and device? Until the sync work lands, a workspace lives in one browser's local storage.
2. Ask them to open Settings, Data, Export before anything else. That file is the recovery.
3. `localStorage['toggl-clone:v1']` in the browser console shows the raw workspace. If `version` is 2 it is
   from the numeric-id era and is converted on load by `stateMigrationService` — never discarded.
4. If the export is empty and the key is missing, the data is gone: local storage was cleared. There is no
   server copy yet.

## Rolling the schema back

`supabase/migrations/20260903120000_timetrack.sql` only creates things, so rolling back is
`drop table if exists public.timetrack_* cascade` plus `drop function public.timetrack_touch_updated_at()`.
Nothing else reads those tables. Do it in a transaction, and take a backup first.

## Verifying a schema change

The repo's migration history cannot be replayed from scratch — an older migration references `user_goals`,
which no migration creates — so `supabase db reset` fails. To check a timetrack migration in isolation:

    docker run -d --name tt-pg -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:15
    psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -c "create schema auth; create table auth.users (id uuid primary key); create role authenticated;"
    psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -c "create or replace function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;"
    psql -h 127.0.0.1 -p 55432 -U postgres -d postgres -f supabase/migrations/20260903120000_timetrack.sql

Then set `request.jwt.claim.sub` to one user id, `set role authenticated`, and confirm another user's rows are
invisible and unwritable. That is how this schema was checked: 18 tables, 72 policies, and a second user could
neither read, insert into, nor update the first user's rows.

## Checking that it opens with no connection

The service worker is registered only in a production build, so the dev server cannot show this. It is one
command and two minutes, and it is the difference between an app and a bookmark on a train:

    npm run build && npx next start -p 3200

Then, in a browser: open `http://localhost:3200/dashboard/time`, wait for it to settle, switch the network off
(DevTools → Network → Offline), and open the same address in a new tab. The tracker should appear, with the
timer field ready. Verified this way on 2026-09-05 on an emulated Pixel 7.

What is deliberately NOT cached: anything under `/api/`. Time entries come from the sync layer, which knows
what is queued and what is stale; a cached API answer would be a second, dumber copy of the truth.

## When something breaks

Crashes are recorded in `error_reports`. Two ways to read them:

    npx tsx scripts/list-errors.ts --hours 24
    curl -H "X-Admin-Key: $ADMIN_SECRET_KEY" https://<host>/api/admin/errors?hours=24

What is in a report: the message, where it was thrown, the page path, the browser, the build, and how many
times that same fault has happened. What is never in one: query strings, email addresses, long tokens, and
anything a person typed — stripped on the way in by `errorScrubService`, with tests.

Reports older than 30 days are deleted nightly at 03:20 UTC by `prune_error_reports()`, scheduled through
pg_cron. To run it by hand: `select public.prune_error_reports();`

## Backups

Take one:

    npx tsx scripts/backup-timetrack.ts

It writes a plain JSON file into `backups/` (git-ignored) holding every row of
every timetrack table. **Keep a copy somewhere other than the database it came
from** — a copy that dies with the original is not a copy.

Put one back:

    npx tsx scripts/restore-timetrack.ts backups/<file>.json            # says what it would do
    npx tsx scripts/restore-timetrack.ts backups/<file>.json --confirm  # actually writes

Without `--confirm` it writes nothing. It never deletes: rows are matched by
their own ids, so anything created since the backup survives, anything the
backup holds is written over the top, and running it twice changes nothing the
second time.

### The test restore, and how to repeat it

A backup nobody has restored from is a belief. This was run on 2026-09-08
against the live database:

1. Created an entry `restore proof entry`.
2. `npx tsx scripts/backup-timetrack.ts` — 111 rows.
3. Deleted the entry outright and confirmed it was gone (0 rows matched).
4. Ran the restore without `--confirm` — wrote nothing, as intended.
5. Ran it with `--confirm` — 111 rows restored.
6. The entry was back, with its duration intact. Cleaned up afterwards; the 78
   real entry rows were untouched throughout.

Repeat it after any schema change. It takes two minutes and it is the only
thing that tells you the backup is real.

### What is NOT covered

This backs up the tracker's own tables. It does not back up goals, tracking,
scenarios or anything else — those live in the same database and would need
their own export, or Supabase's whole-database backups, which are a setting in
the Supabase dashboard and are not switched on by anything here.
