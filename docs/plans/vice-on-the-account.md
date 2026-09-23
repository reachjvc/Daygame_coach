# The Black Box gets an account

**Supersedes the "Item 9 — should this be deployable from the start?" section of
`docs/plans/vice-black-box.md`, which said No.** That section's reasoning is
preserved below and answered rather than deleted, because it was not silly and
the thing that changed is not "we thought about it harder".

Serves `docs/product/vice-concept.md` items 1–9, and `docs/product/vision.md`
item 36 (the platform move).

---

# PART 1 — FOR YOU

## What this is about

Today your Black Box record lives in one browser, under one key,
`vice-blackbox-v1`. That means three things, all of them true right now:

- **Clear your browsing data and it is gone.** Not "degraded" — gone, with no
  copy anywhere, unless you happened to press "Save a copy" recently.
- **It was never on your phone.** Open the page there and it is empty, and the
  door — the one control this whole tool exists for, the one you would reach for
  at eleven at night — has nothing behind it.
- **A second browser is a second, diverging record.** "Load a copy" replaces
  rather than merges, so the two can never be brought back together. Whichever
  one you load, the other one's nights are gone.

The tool's own promise is a record that accumulates for years and answers you
with your own history. Every one of those three is a way the record does not
survive the year, let alone the four. **So: it is wrong, and this is the plan to
fix it.**

## What the old plan argued, and why it no longer holds

The Black Box plan argued No to a database, in September, for a reason that was
not about speed:

> You decided on 2026-09-17 to leave Supabase for a managed platform with
> Postgres on a private network. A new Supabase table today is a table that has
> to be ported next month, and it would be the 35th `auth.users` foreign key to
> repoint on the way. Building it now is writing code in order to throw it away.

Three things have changed, and only the third is an opinion.

1. **The project is adding Supabase tables today anyway.** The Life Mastery
   persistence work in flight right now adds **25 tables** and their policies in
   `supabase/migrations/20260922100000_life_plan_tables.sql`. The argument
   "don't add the 35th foreign key" was overtaken by a change that adds
   twenty-five more. Two tables for the vice record now port alongside them, in
   the same sweep, using the same repo shape.
2. **"Next month" has not been true for six weeks.** The move is still at step
   0 of its own sequence (the friend picks platform, auth library and migration
   tool), and its stated constraint is that it starts *after* the in-flight
   training rebuild lands. Anything waiting for it is waiting for an unscheduled
   date. A plan that parks your record in a browser cache until then is not a
   plan, it is a deferral with a reason attached.
3. **The cost was measured against the wrong risk.** The old section costed the
   port. It did not cost the loss. One cleared browser, one new phone, one
   "let's try Firefox" and the record is zero — and the feature's entire value
   is that it is not zero.

**What the old argument got right, and this plan keeps:** the record was written
from day one in exactly the shape database rows take — append-only, stable ids,
ISO dates, nothing derived ever stored, one file that reads or writes it. That
was Rule 4 of the original plan, and it is why this is a week of work rather
than a rescue. `blackboxStore.ts` becomes a repo and an API route, and the rest
of the module does not move.

## A security point, stated because it should be

This record is a log of a person's relapses — which nights they drank, used
porn, gambled, and what they were thinking — tied to their account.

On Supabase the database sits on the public internet and row-level security
policies are the entire wall; the browser holds the anon key by design. That is
the arrangement the 2026-09-17 decision is already about leaving. **This plan
does not make that worse than the 34 tables already there** — your field
reports, shadow work and dating answers are on the same database today — but it
does add the most sensitive rows in the app to it, and you should hear that from
me rather than find it.

Two practical consequences, neither of which changes the plan:

- It raises the value of finishing the platform move, and the vice tables belong
  in the first cut over, not the last.
- Every read and write in this plan is scoped by `user_id` **in the repo**, not
  only by a policy. That is the existing house rule and it is what actually
  survives the move, since the 66 policies get deleted rather than ported.

## The rules this plan follows

These are what I am asking you to approve. Everything else — how many tables,
how many files, how many phases — is an output and is not your decision.

**Rule 1 — The browser stays the working copy; the account becomes the durable
one.** The page reads and files with no network, exactly as it does now.
Syncing happens behind that.

> **Corrected after building it.** This rule said the page "opens, reads and
> files with no network". The *opens* is false and was never true: the route is
> server-rendered with no service worker, so reloading offline fails outright
> with `ERR_INTERNET_DISCONNECTED`. What holds is that an already-open tab keeps
> working — filing a close call with the signal cut leaves the record intact,
> the page says "Offline. 1 change is waiting on this device", and the change
> goes up by itself when signal returns, with nothing clicked. Proved in
> `blackbox.spec.ts`. Making the page itself openable offline is a service
> worker for this route, which is real work and is not done.
*If this is wrong:* the one moment the tool exists for — eleven at night, on a
phone, possibly on no signal — is the moment it shows a spinner. A tool that
needs a network at that moment is not the tool.

**Rule 2 — Two devices MERGE. Nothing is ever refused as "stale".**
Every attempt and every report has its own id and its own last-changed stamp, so
two devices are reconciled row by row, and a row neither device deleted survives
both.
*If this is wrong:* the Life Mastery answer — refuse the save, tell the person
their plan changed elsewhere — is right for one document a person edits as a
whole, and wrong here. It would make you choose which device's night to throw
away. That is the one thing a flight recorder may never ask.

**Rule 3 — A deletion leaves a note.** Removing a run or a report marks it
deleted rather than dropping the row.
*If this is wrong:* a device that was offline when you deleted something sees a
row the server no longer has, decides the server forgot it, and helpfully puts
it back. The thing you removed returns, forever, on every device.

**Rule 4 — The browser record is imported ONCE, only into an account that has
none, and is never deleted by this plan.** It stays where it is as a cache and a
fallback.
*If this is wrong:* either the import re-runs and duplicates four years, or the
one existing copy of your record is cleared on the strength of an upload nobody
confirmed landed.

**Rule 5 — A failed read never causes a write.** If the account's record cannot
be fetched, the page keeps working on the local copy and sends nothing.
*If this is wrong:* one flaky request makes the app read "unreachable" as
"empty", and the next sync uploads a thin local copy over the real record.

## What you will see, and when

Almost nothing, which is the point. Concretely, at the end:

- The page looks and behaves as it does today, with **one line added** near
  "Your copy": *Saved to your account* / *Saving…* / *Not saved — you are
  offline, nothing has been lost* / *Could not save; your record is still on
  this device*. Never a spinner over the door.
- Open it on your phone, sign in, and your history is there.
- File a close call on your phone with no signal; it arrives when signal does.
- "Save a copy" stays, and stops being your only insurance.

## Built — what actually happened

**Phases 0 to 5 executed 2026-09-23.** The two tables are applied and the record
syncs. Five defects were found, and the shape of them is the point: **every one
came from driving two real browsers, and not one was visible to a unit test.**

1. **The load decision could wipe the local record.** A marker said "already
   imported"; an empty account then answered "nothing", and that answer replaced
   a browser holding years. I had written a test asserting it as correct. The
   marker is gone — the union cannot lose a row, and a deliberately cleared
   account is distinguishable by its tombstones, which is the property the
   marker was standing in for. The identical bug hit `lifePlanSync` the same day.
2. **Postgres and JavaScript spell an instant differently.** `timestamptz` comes
   back `+00:00`, the app writes `Z`; the merge compares strings and `+` sorts
   before `.`, so a row that had been to the server and back lost every merge
   against its own twin. Normalised at the repo boundary.
3. **The page said "Saved to your account" while rows were unsent.** The state
   was whatever the last completed sync left. Caught by asking the account what
   it held at the moment the screen said saved: nothing.
4. **A second device pushed its stale copy over a tombstone**, resurrecting a
   deleted run everywhere. The load effect merged and then pushed
   `latest.current`, which React had not re-rendered yet.
5. **`newId()`'s fallback was not UUID-shaped.** Fine for a record that never
   left the browser; every insert carrying one is refused by a `UUID` column, so
   a browser without `crypto.randomUUID` — it needs a secure context, so plain
   http on a phone on the local network — would sync silently never.

Two test-quality findings worth the same attention. The e2e suite was **green by
racing the network**: a record left on the shared account arrived ~700ms after
load, so assertions made before that passed and would fail on a slower machine.
The account is part of the fixture now. And `pending` was held in state, so for
the instant between a change and the effect that noticed it the page both
claimed to be saved and told a test it was settled — the lie and the thing that
hid the lie were the same bug. It is derived during render now.

## The phases

Each is a working, testable state of the app. None of them is a half-migrated
one.

### Phase 0 — The record is ready to be in two places
Adds `updatedAt` and `deletedAt` to every attempt and report, and a per-device
`deviceId`, in `blackboxStore.ts`. Existing rows in your browser get an
`updatedAt` of the moment they are first read and no `deletedAt`. Nothing else
changes; the page is identical.
*Acceptance:* `tests/unit/vice/blackboxStore.test.ts` — a record written by the
old code loads, gains the fields, and every number on the page is unchanged.
**This rewrites what is in your browser. Blocker 3.**

### Phase 1 — The account can hold the record
Two tables, `vice_attempts` and `vice_reports`, their policies, and
`src/db/viceRepo.ts` with `readBlackBox` / `writeBlackBoxRows`. An API route at
`app/api/black-box/route.ts`. No UI change at all; nothing calls it yet.
*Acceptance:* an integration test that writes rows as user A and cannot read
them as user B, plus the architecture test's write-coverage entry.

### Phase 2 — The page reads and writes the account
`viceSyncService.ts` — pure diff/merge functions, no network, no clock, no
storage — modelled directly on `src/timetrack/syncService.ts`, which already
solves this exact problem in this codebase for rows minted on a device. A
`useBlackBoxSync` hook does the talking. The browser copy remains the source the
page renders from.
*Acceptance:* the merge cases as unit tests — two devices filing different
nights, the same row edited twice, a deletion racing an edit, a failed read.

### Phase 3 — Your existing record moves up, once
The one-time import, under Rule 4: only when the account has no rows, only when
the browser has real ones, marked so it cannot run twice.
*Acceptance:* an e2e that imports, reloads, and finds every run and report on
the account; and a second run of the same flow that imports nothing.

### Phase 4 — Deletions and undo travel
The remove-report, remove-run and undo paths built this week write tombstones
and reconcile. Reviving a run (undoing a lapse) has to carry the attempt's
changed `endedOn` with it.
*Acceptance:* an e2e across two browser contexts: delete on one, see it gone on
the other; undo a lapse on one, see the run alive on the other.

### Phase 5 — The status line, the docs, and the ledgers
The one line on screen. `docs/product/map.md` and the vice memory updated. The
unpaged-read ledger and write-coverage baseline updated — **a read of
`vice_reports` must be paged from the first line**, because PostgREST silently
returns 1,000 rows and a record that grows for years is precisely the case that
hits it. This project has already lost data twice that way.

## Your concept, item by item

| # | Verdict | Item | Where |
| --- | --- | --- | --- |
| 1 | Yes | Relapses repeat; show the times I quit and the reasons | The record survives the browser it was made in, so "accumulates" becomes true over years rather than until the next cache clear |
| 2 | Yes | Close calls, from aviation safety | `vice_reports` holds both; `went_through` is still the one field that differs |
| 3 | Yes | The important periods understood | `started_by` and `structure` move with the run row |
| 4 | Yes | Read at one specific moment | Rule 1 is this item as an engineering constraint: the door opens and answers with no network |
| 5 | Yes | Both, in combination | One record, two tables, one page — the split is by row kind, never by feature |
| 6 | Behaviour | It has to look genuinely good | The data design does not answer it. The only visible addition is one status line, and it must not sit above the door |
| 7 | Yes | What is there now is more or less useless | Nothing in the old module is touched; this is storage under the new front door |
| 8 | Yes | Clicking Vices shows the new work in isolation | Unchanged — the route and the page are untouched by this plan |
| 9 | No | It does not have to write to the website yet | **Overturned by you on 2026-09-23** — "if it's browser, it is wrong". Item 9's own escape clause was "unless a real programmer would make everything deployable from the start", and this plan is that clause being taken |

## Manual blockers

Each attempted once, with the result.

**1. Does the Supabase project accept two new tables right now?**
*Attempted:* read `supabase/migrations/` — 44 files, and the two newest
(`20260922100000`, `20260922110000`) are another session's 25-table life-plan
migration, written today and not yet applied by me. *Result:* **partial.** The
migration directory is not the schema of record (many tables were made directly
in Supabase), so whether these two apply cleanly can only be settled by running
them. Needs you, or needs me to be told to apply a migration.

**2. Is the platform move going to invalidate this before it ships?**
*Attempted:* read the decision note. *Result:* **no.** Step 0 (friend picks
platform, auth, migration tool) has not happened, and the stated constraint is
that it begins after the training rebuild lands. Nothing in this plan is
scheduled against it.

**3. Can the two-device case be tested here?**
*Attempted:* wrote and ran a two-browser-context e2e this session for the
localStorage case — it found a real bug (a second tab silently wiped the first)
and now guards it. *Result:* **done.** The same harness covers Phase 4.

## Open questions

Each with a recommendation, so none of these is a bare question.

**1. Does the record sync continuously, or on open and on change?**
*Recommendation:* **on open, and on every change, debounced.** No polling and no
timer. This record changes a handful of times a week, and a background poller on
the one page somebody opens mid-crisis is a cost with no return.

**2. Should the browser copy ever be cleared once the account holds it?**
*Recommendation:* **no, never.** It is the offline copy and the fallback, and
Rule 5 depends on it existing. It costs kilobytes.

**3. Should `vice_reports.thought` — the person's own sentence — be stored in
plain text?**
*Recommendation:* **yes, for now, and revisit at the platform move.**
Client-side encryption would mean a key that, if lost, loses the record —
trading a real risk for a worse one on a product with one user. The honest
mitigation is the private-network Postgres already decided on.

**4. What happens to a record whose clock is wrong?**
*Recommendation:* **accept it, as timetrack already does.** Last-write-wins by
`updated_at` is one person's own devices; a skewed clock costs one row's
ordering, and the alternative is a vector clock nobody needs.

---

# PART 2 — EXECUTION

## Files

**New**
- `supabase/migrations/<ts>_vice_black_box_tables.sql` — two tables, RLS,
  `UNIQUE (id, user_id)` on `vice_attempts` so a report cannot attach to another
  account's run via `(attempt_id, user_id)`.
- `src/db/viceTypes.ts` — row types, mirroring `src/db/lifePlanTypes.ts`.
- `src/db/viceRepo.ts` — the only file that talks to the database. Reads paged
  via `readAllRows` from `src/db/paging.ts`.
- `app/api/black-box/route.ts` — GET (rows since a stamp) and PUT (changed
  rows). `requireAuth` from `src/db/auth.ts`; owner stamped from the session,
  never from the body.
- `src/vice/blackbox/viceSyncService.ts` — pure. `diffRows`, `mergeIncoming`,
  `safeToSend`, modelled on `src/timetrack/syncService.ts`.
- `src/vice/blackbox/blackBoxClient.ts` — the browser's fetch side. A failed
  read returns `undefined`, never `null`; the distinction is Rule 5.
- `src/vice/blackbox/useBlackBoxSync.ts` — the hook that does the talking.
- `tests/unit/vice/viceSyncService.test.ts`, `tests/integration/viceRepo.integration.test.ts`,
  `tests/e2e/blackbox-account.spec.ts`.

**Changed**
- `src/vice/blackbox/blackboxStore.ts` — `updatedAt`, `deletedAt`, `deviceId`;
  `removeReport`/`removeAttempt` become tombstone writers.
- `src/vice/blackbox/useBlackBox.ts` — reads through the sync hook.
- `src/vice/blackboxService.ts` — every read filters `deletedAt === null`.
- `src/vice/types.ts` — the three new fields.
- `docs/plans/vice-black-box.md` — its item 9 section marked superseded.
- `tests/unit/architecture.test.ts` — `UNPAGED_READS_ALLOWED` untouched (the new
  repo is paged from line one); write-coverage baseline gains the new writes.

## Constraints that will bite

- **`blackboxService` filters tombstones or every number on the page is wrong.**
  A deleted run must leave `stats`, `runLanes`, `thoughtCosts` and `answerFor`
  at once. One filter at the top of `forVice` is the only place that can own it.
- **The architecture test forbids `fetch` outside its allowlist.** The client
  goes in its own module, as `lifePlanClient.ts` did, for that reason.
- **`tests/unit/vice/blackboxCorrections.test.ts` asserts hard deletion today.**
  It has to change with Phase 0, deliberately and in the same commit.
- **Integration tests share one connection file.** Never run them while another
  session is (`npm run ci` runs all four gates).
- **`app/api/black-box/route.ts` is a new API route**; `ALLOWED_LONG_ROUTES` is
  a ratchet and a new long route needs the work split, not an entry.

## Order

Phases run in order; each leaves the app working. Phase 0 and Phase 1 are
independent and can be done either way round. Nothing here starts before the
three blockers below are answered.
