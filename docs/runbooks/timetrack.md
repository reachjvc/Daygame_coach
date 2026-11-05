# Time tracker runbook

What to check, and what to do, when something goes wrong with `/time`.

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

1. Look at the badge on each device first (table below). "Offline · 2 waiting" or "Not saved" means the
   change is still in that browser and has not reached the account; "Saved" means the account has it.
2. The account is the record. A read-only backup of one person's time data:
   `npx tsx scripts/backup-timetrack.ts --user <id>` (writes `backups/timetrack-<date>.json`, gitignored).
3. Each browser keeps a copy and an outbox, owned by one account since 2026-11-04 (next section):
   `toggl-clone:v1` (the copy), `toggl-clone:pending` and `toggl-clone:pending-bases` (what waits to be
   sent), `toggl-clone:offline-base` (what an opening started from, kept until the account has every change
   made before it answered), and `toggl-clone:account` (whose all of it is). If `version` in the copy is 2
   it is from the numeric-id era and is converted on load by `stateMigrationService`, never discarded.
4. Settings, Data, Export in the tracker writes the same workspace as a file; ask for it before anything
   else when the account does not have what the person expects.

## One browser, one account (since 2026-11-04)

The audit in `Plans/time-tracker-like-toggl.md` found that Log Out left the tracker in the browser, so the
next person saw the previous one's entries and could upload them into their own account. Now:

- Every `toggl-clone:` key belongs to the account named in `toggl-clone:account`; each tab also tags its
  session keys (the unstarted draft, the manual form). `/time` passes the server's user id and claims the
  browser before anything is read. Another account's copy is removed, never shown, never sent.
- A copy with no owner recorded (from before the change) is adopted by the first account that opens it,
  unless its queued rows or its kept base name another account; then it is a stranger's copy.
- **Log Out** sends what is waiting first (5 s at most). Whatever still cannot go is named, and only "Log
  out anyway" discards it. A session that ends by itself keeps the owner's copy hidden from others, so the
  same account sends it after signing in again.
- A tab whose account changed underneath it stops writing and sending, and reloads.
- **The server never trusts the browser:** the sync route uses only the session's user id, refuses rows
  named for another account (409) and versioned writes that name none, and `resolveWorkspaceId` only ever
  revives the caller's own workspace.
- Left open (narrow, matters only once a second person uses a browser): an old untagged copy with nothing
  queued is still shown to the next account, though never uploaded; and signing in through an emailed link
  does not empty the worker's stored pages (the password login does).

## Rolling the schema back

`supabase/migrations/20260903120000_timetrack.sql` only creates things, so rolling back is
`drop table if exists public.timetrack_* cascade` plus `drop function public.timetrack_touch_updated_at()`.
Nothing else reads those tables. Do it in a transaction, and take a backup first.

## How a stale copy is refused (`timetrack_push`)

Since `20261103120000_timetrack_versioned_writes.sql`, the app's pushes go through one database function,
`timetrack_push(p_batch, p_tag_sets)`, security invoker (row security applies). Each row names the server
`updated_at` it was based on; the function writes it only if that is still the stored version, and otherwise
returns the stored row under `conflicts`. The browser lays only the fields it changed onto that copy and sends
again (`src/timetrack/syncVersionService.ts`). An entry's tags travel as a whole set with the entry, and links
not in the set are deleted. A request with no `bases` (an older app, the e2e helpers) still gets the old
whole-row upsert, and so does everyone if the function is missing (PostgREST `PGRST202`).

- **Order of release:** migration first, then the code. The code also works before the migration (it falls
  back), so the order matters only for when the protection starts.
- **Way back:** `supabase/migrations/rollback/20261103120000_timetrack_versioned_writes.down.sql` drops the
  function. No data is touched; the app falls back to the upsert by itself.
- **Checked against Postgres 15 in isolation** (the steps below), as two users: a first upload of every table in
  the mapper's own shapes; a fresh write applied with its new version returned exactly; a stale write, and a write
  with no base over an existing row, both refused with the stored row returned; a stale copy unable to restart a
  stopped timer or bring back a deleted entry; a tag set replacing the links only with its entry and under its
  check; a refused constraint rolling back the whole call; a second user unable to see or write the first user's
  rows; no session and the `anon` role refused.
- **Two stops of one running timer** (the phone stopped it; a PC that had not checked yet pressed Stop
  later): the EARLIER stop wins, and the later device says "Changed on your other device". An edit of an
  already finished entry keeps the rule above: the field this device changed is laid on top.
- **A timer stopped by reconciliation at first contact** ("Another device had a timer running too") is
  queued and sent like any other change, so the account never keeps two timers running.

## What the sync badge says

The badge in the tracker's header reports two things: whether everything typed here has been sent, and when this
device last heard from the account (`src/timetrack/components/SyncBadge.tsx`, design rules D2 and D6).

| Badge | Meaning | What to do |
|---|---|---|
| **Checking…** | The tracker just opened, or the phone just woke, and the first check of the account has not answered yet. Start, Stop and Continue wait for it, three seconds at most. A tap made meanwhile runs when the answer is in; if the other device changed the running timer in between, the tap is dropped with a toast saying so. | Nothing. If it lasts past three seconds it turns into the amber "Couldn't reach the server". |
| **Saved · checked just now** / **Saved · checked 3 min ago** (a green dot on a phone) | Nothing waiting to be sent, and the account was read that long ago. | Nothing. |
| **Saved · not checked for 7 min** (amber) | Nothing waiting to be sent, but this device has not heard from the account for over five minutes, so it may not show what the other device did. | Tap the badge: it checks now. |
| **Couldn't reach the server** (amber) | The last check failed, or the first one did not answer within three seconds. The screen is this device's own copy and might be out of date. | Tap to try again; check the connection. |
| Saving 2… / Offline · 2 waiting / Not saved / Signed out / This device only | The sending side, as before. | As before. |

Tapping the badge always checks the account and sends whatever is waiting.

Behind it: a device checks the account when the tracker opens, when the page becomes visible (and from the
back-forward cache), on `focus`, on `online`, on a Realtime ping (below), and once a minute. A failed first
read is tried again the moment the connection comes back. Whatever is queued is sent at once — with
`fetch(…, { keepalive: true })`, at most 60 KB per request — when the page is hidden, closed or the tracker is
left; an upload already in the air when the tracker is left is no longer cut off. Starts and stops are stamped
with the server's clock: each answer's `Date` header tells the device how far its own clock is off
(`src/timetrack/serverClockService.ts`); a device whose clock agrees with the server's is left exactly as it is.

## The other device within seconds (Supabase Realtime)

While the tracker is open it subscribes to `postgres_changes` on `public.timetrack_entries`, filtered to the
signed-in user, through the browser's Supabase client (row security applies to the feed). Every change ping
starts a check 300 ms later. The ping carries nothing the check uses; the check reads the rows the usual way.

- **Switch it on:** `supabase/migrations/20261104120000_timetrack_entries_realtime.sql` adds the table to the
  `supabase_realtime` publication. It changes no data and is idempotent. Until it is applied no ping arrives and
  the tracker behaves as before (the minute's check and the checks above); no code change is needed either way.
- **Check it is on (read-only):**
  `select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'timetrack_entries';`
  returns one row.
- **Switch it off:** `supabase/migrations/rollback/20261104120000_timetrack_entries_realtime.down.sql` takes the
  table out of the publication. Deletes no data; the app falls back by itself.
- **Cost:** Realtime is included on every Supabase plan, the free one too; one person's pings are far under its
  limits. If a limit were ever hit, the checks above still work.
- **Checked** against Postgres 15 in isolation on 2026-11-04: applied twice (added once, then a notice), rolled
  back twice, and skipped with a notice where the publication does not exist or publishes all tables. The local
  test stack runs without Realtime (`scripts/db/test-stack.mjs`), so the browser suite cannot see pings; the
  unit test `theOtherDeviceNoticesWithinSeconds` pins the subscription and what a ping does.

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

Then, in a browser: open `http://localhost:3200/time`, wait for it to settle, switch the network off
(DevTools → Network → Offline), and open the same address in a new tab. The tracker should appear, with the
timer field ready. Verified this way on 2026-09-05 on an emulated Pixel 7.

What is deliberately NOT cached: anything under `/api/`. Time entries come from the sync layer, which knows
what is queued and what is stale; a cached API answer would be a second, dumber copy of the truth.

## Where things are since the Toggl layout (2026-11-05)

The owner may ask "where did X go". Phone (below 640px): Projects, Clients, Tags, Settings and Import/export
are under ⚙ ("Settings and more"); manual entry is ⊕; Stop at…, Switched at…, End now, Duration only and
Move to another day are in the entry sheet (its ⋮ for the last three); Select/bulk edit is a row's ⋮ →
Select; Pomodoro is the "Pomodoro" tab next to "List view". PC: the old Calendar tab is "Calendar" in the
Timer page's Calendar | List view switch; Manage is Clients / Tags / Team in the sidebar; the running
timer's Started…/Stop at…/Switched at… row is the box that opens on a click on the running time. The
running-timer notification switch is Settings › Notifications › "Running timer". Where each control came
from, phase by phase: `Plans/toggl-parity.md`, the Status notes.

How to check a screen against Toggl, and whether a first-time user can find something:
`~/.cache/daygame-research/toggl/kit/` (side-by-side screenshots; `fb.mjs`, a one-browser-per-agent driver
for findability checks). Sync regression themes: `~/.cache/daygame-research/time-audit/regression/run.sh`.

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
