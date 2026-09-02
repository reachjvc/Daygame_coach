# The one thing — on the account, dated, with a history

**Status: BUILT and verified, 2026-08-27.** Written under
`.claude/rules/finished-work.md`: the failure list was written before the design
and is the first section, and it is left intact above the record of what shipped.

## What shipped

| | |
|---|---|
| `supabase/migrations/20260827_create_life_answers.sql` | applied to the live project; table, index, RLS on, three policies, **no UPDATE policy** |
| `src/db/lifeAnswerRepo.ts` | read / insert / delete. No update function exists |
| `src/goals/oneThingService.ts` | current, history, countdown, "would this change anything" |
| `app/api/life-answers/route.ts` | GET / POST / DELETE |
| `src/goals/components/north-star/OneThingBox.tsx` | the step: box, deadline, save, history, delete |
| `SeasonBand.tsx` | the tracking header now reads the account, not `plan.seasonFocusId` |
| `src/tracking/config.ts` | `one_focus` → `report_next_session_focus`, `one_moment` → `report_pivotal_moment` |
| `tests/unit/goals/oneThing.test.ts` | 12 tests (AT1–AT3) |
| `tests/unit/goals/answerNamespaces.test.ts` | 4 tests (AT4) |

**Decisions taken from your answers:** the database is the source of truth and
the plan blob holds no copy (OQ3); any of your own rows can be deleted, not just
a recent one (OQ1); the deadline is a date you enter, defaulting to 90 days
(OQ2); no import of the browser text (OQ4); both impostors renamed (question 5).

**Verified in the browser, signed in:** wrote a one thing on the step → it
saved → the tracking header showed it with "90 days left" → replaced it →
the header showed the new one and the old one moved to the history → saving the
same words twice returned `unchanged` and wrote no row → deleting the newest
made the previous one current again.

**Still to do:** `AT5` (the constraint tests against the live table) and `AT6`
(the e2e walk) are named but not written. The Focus step still echoes the local
draft rather than the saved answer — one more read to move.

---

# 1. What is wrong with this design

Written by attacking it, before it was shown. Nine faults, five of which
changed the design, four of which are accepted costs.

### Changed the design

**F1. The date must not come from the database.** The first version used
`answered_on date default current_date`, which is UTC. That is the same defect
fixed in the goal counters on 2026-08-25. It does not survive being patched — a
UTC date column invites `current_date` back in every future query, including
inside an RLS policy where it silently breaks deletes for anyone west of
Greenwich after 7pm. **Fixed by removing the date column**: the row stores one
instant, `answered_at timestamptz`. An instant is absolute and cannot be wrong.
The local date is computed for display, in the user's timezone, in the app.

**F2. "One row per day" destroys history and infers intent from the clock.** A
unique constraint on `(user, key, date)` means a same-day rewrite overwrites,
so replacing your one thing at lunch loses the morning's — from a design whose
selling point was that reviewing never destroys anything. It also decides
"correction versus new answer" by the clock, which is not where intent lives.
**Fixed by appending on change**: every distinct text is a row. A no-op save
writes nothing; a real change writes a row. The row explosion this risks is
handled by the write policy in §3, not by a constraint that throws data away.

**F3. It could not build the feature that was agreed.** Sentence 5 asked for a
countdown and a badge when the one thing lapses. The first design had no
lifespan anywhere, so the feature was unbuildable from it. **Fixed by
`horizon_days`** on the row, defaulting to 90. The due date is derived, never
stored.

**F4. The column name collided with three existing things.** `field` would have
sat beside `FIELD_LIBRARY` (55 session questions), `field_reports.fields`, and
the plan blob's `answers` — from the change whose whole purpose was to stop two
things sharing a name. **Fixed by naming the namespace**: table `life_answers`,
column `answer_key`, values from `LIFE_ANSWER_KEYS`. This is explicitly *not*
the same namespace as `FIELD_LIBRARY`, and a test asserts no key appears in
both.

**F5. `updated_at` would have been decorative.** There is no `updated_at`
trigger anywhere in this schema, on any of the ten tables that have the column.
**Fixed by removing it**: an append-only table has nothing to update.

### Accepted costs, named rather than hidden

**F6. One step of a localStorage-first flow now needs an account.** The Life
Mastery flow works signed out by design — twelve of its thirteen steps touch no
API. Putting the one thing on the server makes the One Thing step the second
one that needs sign-in. The alternative is a local copy kept in step with the
server, which is the "value plus a cached copy" failure this whole exercise is
about. Accepted: it follows the precedent the Track step already set. The draft
you are typing stays local; only a save needs the account.

**F7. The tracking page header gains a database round trip.** It reads
localStorage today, which costs nothing. Accepted: the query is indexed and
returns one row. If the dashboard's load time moves, fold it into an existing
fetch rather than adding a second one.

**F8. Nothing can honestly date what is already in your browser.** The existing
`start:one-thing` text has no date. Importing it and stamping today would put a
lie in the history — "written 26 August" for something written in March.
Accepted: **there is no import.** The first save creates the first row. The
browser copy stays where it is until you overwrite it.

**F9. Backend pattern-mining bypasses every guarantee here.** You asked to be
able to read all user input from the backend. That uses the service-role key,
which bypasses RLS entirely, so the access rules below constrain the app and
not that code. This table will hold sentences about people's bodies, money,
relationships and addictions, plus names of third parties who never agreed to
anything. Say so in the privacy policy, never expose the key client-side, and
keep it out of logs.

### Two remaining unknowns, both surfaced as questions in §5

Whether a mistaken entry can be taken back, and whether the horizon is set by
the person or fixed by the app.

---

# 2. What it does, in sentences you can judge

1. You write your one thing in the One Thing step. That is the only place in
   the app it is written.
2. Saving something different from your current one adds a new one. Saving the
   same text again does nothing.
3. Every version you have had is kept, with the moment you wrote it, so you can
   look back at what you were aiming at last spring.
4. The tracking page header shows the newest one — not a copy of it, the actual
   newest, so it cannot go stale.
5. It counts down from the day you wrote it. When it runs out, or when you have
   never set one, the header says so.
6. Clicking it on the tracking page shows the ones before it.
7. It lives on your account: on your phone, and after you clear your browser.
   Only you can read it through the app; you can also read it from the backend
   with the admin key (see F9).
8. The two other things currently called "the one thing" are renamed to what
   they are: `one_focus` → "next session focus", `one_moment` → "the pivotal
   moment".

---

# 3. The shape

```sql
-- A dated statement someone wrote about their own life.
--
-- APPEND ONLY. There is no UPDATE path: changing your one thing adds a row,
-- and the previous one stays with the moment it was written. "Current" is the
-- newest row and is never a stored flag, so nothing can disagree with it.
--
-- ONE INSTANT, NOT A DATE. `answered_at` is absolute. A `date` column would
-- carry whichever timezone wrote it, which is how the goal counters broke: a
-- count in New York dated by a server in UTC. The local day is computed for
-- display, in the user's timezone, in the app.

create table if not exists public.life_answers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  -- Which question this answers. Its own namespace, deliberately not the same
  -- one as FIELD_LIBRARY's session questions. Starts locked to one value.
  answer_key   text not null check (answer_key in ('one_thing')),

  -- What they wrote. Cannot be blank; capped so a paste cannot land a novel in
  -- every backup from now on.
  body         text not null check (length(btrim(body)) between 1 and 2000),

  -- When they wrote it. Server clock, because an instant has no timezone.
  answered_at  timestamptz not null default now(),

  -- How long this one is meant to run, in days. The due date is derived from
  -- this and answered_at, and is never stored.
  horizon_days integer not null default 90 check (horizon_days between 1 and 3650),

  created_at   timestamptz not null default now()
);

create index if not exists life_answers_current_idx
  on public.life_answers (user_id, answer_key, answered_at desc);

comment on table public.life_answers is
  'Append-only dated statements from the Life Mastery flow. Current = newest row. No updates.';
```

### What each line makes unwritable

| the line | what can no longer exist |
|---|---|
| no `date` column at all | a date that means one thing in Auckland and another in the database |
| append-only, no UPDATE | a review that destroys the answer it replaced |
| no `is_current` column | a header showing a copy that has gone stale |
| `check (length … between 1 and 2000)` | a blank answer that looks set; a pasted essay in every backup |
| `check (answer_key in (…))` | a fifth thing calling itself the one thing — **as long as** the check is kept in step with `LIFE_ANSWER_KEYS`, which is a hand-maintained link (see `goalEnums.ts`, same problem) |
| `references auth.users on delete cascade` | an answer with no owner, or one left behind after deletion |

The middle column is what is *unrepresentable*, not what is unlikely. The
`answer_key` row is the honest exception: it holds only while two files agree.

### The write policy — why appending does not explode

The box you type in keeps its draft in the browser, as it does today. A row is
written only when a save is committed **and** the text differs from the current
newest. Typing, blurring, and blurring again writes nothing. A year of ordinary
use is a handful of rows.

### The three questions it answers

```
current      newest row for (user, 'one_thing')
history      all rows, newest first
due          answered_at + horizon_days, compared to now in the user's timezone
never set    no rows
```

---

# 4. Access

```sql
alter table public.life_answers enable row level security;

create policy "read own answers"  on public.life_answers
  for select using (auth.uid() = user_id);

create policy "write own answers" on public.life_answers
  for insert with check (auth.uid() = user_id);

-- No update policy at all: the table is append-only, and the absence of the
-- policy is what enforces it rather than a convention nobody re-reads.
-- Delete: see OQ1 — nothing is granted until that is answered.
```

**Not to be applied without explicit approval** — `CLAUDE.md` requires it for
any INSERT/UPDATE/DELETE policy.

---

# 5. Open questions, each with a recommendation

**OQ1. Can a mistaken entry be taken back?** Append-only means a typo saved by
accident is in your history forever.
**Recommendation:** allow deleting your own row within fifteen minutes of
writing it — `for delete using (auth.uid() = user_id and answered_at > now() -
interval '15 minutes')`. "You can take back what you just wrote" is
understandable, expressible as a policy, and cannot be used to erase a history.

**OQ2. Who decides how long a one thing runs?** Your own example — "Quit weed for
100 days" — carries its own horizon; sentence 5 asked for an automatic
countdown.
**Recommendation:** both. `horizon_days` defaults to 90 so nobody has to think
about it, and the One Thing step offers a field for people who have a number in
mind.

**OQ3. Does the Life Mastery plan blob still hold a copy?** This is the one I
left dangling last time. If the plan goes to the server as one jsonb row *and*
this table exists, the one thing has two homes and two writers — the exact
disease.
**Recommendation:** the table is canonical and the blob does not contain the one
thing at all. The One Thing step reads and writes the table directly. If the
plan blob ships later, it carries everything except the keys in
`LIFE_ANSWER_KEYS`.

**OQ4. What happens to what is in your browser now?** See F8 — no import.
**Recommendation:** on first visit after this ships, the step shows the local
text in the box, unsaved, with "save this to your account". You press it, and it
becomes row one, dated today, honestly.

**OQ5. Two rows written in the same microsecond.** Ordering is then undefined.
**Recommendation:** order by `answered_at desc, id desc`. One line, removes the
ambiguity permanently.

---

# 6. Acceptance tests — named before the code

| # | test | asserts |
|---|---|---|
| AT1 | `tests/unit/goals/oneThing.test.ts` → current | newest row wins; empty list is "never set"; ties broken by id |
| AT2 | same → due | a 90-day horizon written 2026-01-01 is due on 2026-04-01 **in the user's timezone**, checked for UTC, Auckland and New York, and across a DST boundary |
| AT3 | same → write policy | saving identical text returns "no change" and produces no insert; saving different text produces exactly one |
| AT4 | `tests/unit/goals/answerNamespaces.test.ts` | no key in `LIFE_ANSWER_KEYS` also appears as a `FIELD_LIBRARY` id — the collision that started this |
| AT5 | `tests/integration/db/lifeAnswers.integration.test.ts` | the constraints reject: blank body, 2001-character body, unknown `answer_key`, `horizon_days` of 0 |
| AT6 | e2e | write a one thing → it appears in the tracking header; change it → the header changes and the previous one is reachable by clicking it |

AT2 is the one that would have caught F1. AT4 is the one that would have caught
the original bug you reported.

---

# 7. Manual blockers

**B1. Applying the migration and the RLS policies.** Needs your explicit
approval per `CLAUDE.md`, and then a human to run it against Supabase. Not
attempted — approval is the gate, and Q1 changes what the policies say.

**B2. Confirming the renames break nothing.** ✅ Cleared. `one_focus` and
`one_moment` are ids inside `field_reports.fields` / `reviews.fields` blobs, so
renaming the catalogue entry without migrating stored blobs would orphan real
answers. **Checked against the live database:** 71 field reports and 5 reviews,
and **neither id appears in any of them** — nobody has ever answered those two
questions. The rename is free, and needs no data migration. (Re-check before
shipping if reports are written in the meantime; the query is
`select fields from field_reports` and a key count.)

**B3. Verifying the countdown on a real account.** Needs a row older than the
horizon, which means either waiting 90 days or writing a row with a backdated
`answered_at` through the admin key. Recommend the latter, once, on the test
account.
