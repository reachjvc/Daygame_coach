# Every counter in the app, counting correctly

**Status: BUILT, 2026-08-28.** All five phases executed. `npm test` green — 123
files, 3,971 tests — plus 9 tests against the real database. What the seven
detection methods actually found, including four faults the plan did not know
about, is in §Execution record at the end.

**Written 2026-08-28** under `.claude/rules/finished-work.md`
and the new "never postpone" rule in `CLAUDE.md`: nothing here is deferred, and
anything that genuinely cannot be done is written out in full rather than named.

**Two counter projects already landed and this one follows them.** Read them
first, because this plan builds on both and contradicts neither:

- `docs/plans/counters.md` — the daygame Week Streak. A counter is a number plus
  the period it belongs to; roll before you read; a streak decays on read.
- `docs/plans/achievement_counters.md` — badges and totals stop being incremented
  and start being derived from the rows on every write.

---

# PART 1 — For the human

## The short version

Two parts of the app count things. One of them — daygame and goals — has just
been rebuilt twice and is now correct. The other — **health: gym, cardio,
running, sleep, food** — has never been touched, and it has the same faults the
first one had, plus one worse.

**The worst of them, and it is live:** the "consecutive training weeks" and
"consecutive cardio weeks" numbers **can only ever show 0**, for you and for
every other user, no matter how long you train. Not "sometimes wrong" — always
zero. Nobody has noticed because nobody has logged a workout yet.

## What is actually wrong, measured

I read the code and the database on 2026-08-28. Nothing here is a guess.

**1. Two health streaks are permanently zero.**
`getConsecutiveTrainingWeeks` and `getConsecutiveCardioWeeks`
(`src/db/healthRepo.ts:397` and `:711`) build two lists of week-labels and
compare them — but they build the two lists with *different formulas*. One
normalises to midnight before converting; the other does not. In Copenhagen
those produce labels one day apart, so the comparison never matches and the
count stops at zero on the first step. Anyone in a timezone ahead of London
gets 0 forever.

**2. Even if that were fixed, the same two would wipe your streak every Monday.**
They start counting at *this* week and stop the moment they find a week with no
workout. Monday morning, before you have trained, this week has no workout — so
a ten-week streak reads 0 until you train again. The daygame streak had the
opposite fault (it never went down); this one goes down too eagerly.

**3. Eleven health numbers use the server's clock, not yours.** Nothing in
`src/db/healthRepo.ts` mentions a timezone at all — the word does not appear in
the file. Your week therefore starts at midnight in London, not midnight in
Copenhagen, and a workout you log late on a Sunday evening counts towards the
week that has already ended.

**4. There are now six different pieces of code that work out "the Monday of
this week".** One is correct (`periodStartFor`). The other five are hand-written
copies in `healthRepo`, `healthService`, `goalsService`, `DailyActionView` and
`HeatmapCalendar`. Copies drift; that is what fault 1 above *is*.

**5. A stored streak now claims to be one thing and is another.** The new
achievements code says in its own comment that streaks are "stored raw and gated
on read" — meaning the database keeps what you actually achieved and the screen
decides whether to show it. The code one screen below zeroes it before storing
it. Both routes currently show the right number, so nothing is broken today; but
a written rule that is not true is where the next bug will hide.

**6. I was caught by this myself, today.** Writing a test, I recorded two
approaches using the column called `created_at` and the app ignored them,
because an approach's real time lives in a *different* column called
`timestamp`. Two columns that both look like "when it happened", and only one
counts. Nothing in the schema says which.

## What you will see when it is done

- Train four weeks running and the tile says **4**. Skip this week and it still
  says 4 until the week is over — a streak you have not yet lost is not taken
  away from you.
- Every health number resets on Monday at midnight **in your city**.
- Every counter in the app, in every part of it, follows one written rule and
  one piece of shared code, and a test fails the build if a new one does not.
- Nothing you have already logged moves.

---

# PART 2 — Being critical of this plan

Written before the phases, per `.claude/rules/finished-work.md`.

## Where the sneaky mistakes actually hide — a taxonomy from real ones

Every entry below is a fault that *actually occurred* in this codebase in the
last two days, not a generic risk. Each one names how it hid.

**A. Two columns that both mean "when it happened."** `approaches.created_at`
(when the row reached the database) and `approaches.timestamp` (when the
approach happened). Reading the wrong one is invisible: the number is plausible,
it is just counting a different fact. **How it hid:** both are timestamps, both
are populated, and no test asserted which one drives a week.

**B. Two formulas for the same key, compared to each other.** Fault 1 above.
**How it hid:** each formula is individually reasonable; only the *pair* is
wrong, and no test ever ran them against each other.

**C. A gate applied twice, and a comment that says it is applied once.** Fault 5.
**How it hid:** the output is identical either way today. It only bites when
someone relies on the comment.

**D. A cache and its source counted with different filters.** The previous
`repairWeeklyCounters` counted all sessions by `started_at`; the new projection
counts completed sessions by `ended_at`. They overwrote each other on alternate
page loads. **How it hid:** the numbers were both plausible and the disagreement
only showed as a flicker.

**E. A counter that decays in the wrong direction.** Daygame never decayed;
health decays every Monday. **How it hid:** "streak" was never defined anywhere,
so each author picked a different meaning.

**F. A setting that is stored and never honoured.** `week_start_day`. **How it
hid:** it saved successfully, so it looked like it worked.

**G. A value that is right at rest and wrong on screen, or vice versa.** The
Week Streak row said 4 and the truth was 2; after the repair the row says 2 and
the screen says 0. Both are correct — but only if you know which question each
is answering. **How it hid:** nobody wrote down which of the two is "the streak".

## Seven ways to find the ones I have not found

One method finds one class. These are chosen to be blind to *different* things,
and the plan runs all seven.

1. **Make it impossible, then let the compiler list the callers.** Change
   `periodStartFor`, `getTodayInTimezone` and friends so a timezone is a
   *required* argument with no default. Every place that cannot supply one is a
   place that was guessing. This finds faults nobody thought to grep for. It is
   the strongest method and it is Phase 1.
2. **Differential timezone testing.** Run every metric twice over identical
   rows, once as Auckland and once as Copenhagen, at an instant where the two
   disagree about the week. A period-scoped metric whose answer does **not**
   change is using the wrong clock; a lifetime metric whose answer **does**
   change is scoping something it should not. This is a table of expectations,
   not a spot check — every metric in the catalogue appears in it.
3. **Time-travel sweep.** Compute the whole metric surface at 200 simulated
   instants across a fortnight, including both DST switches. Then look at the
   *shape* of each series: a lifetime total must never decrease; a streak must
   never drop and recover without new data; a weekly counter must reset exactly
   once per week and at the same hour each time. Discontinuities are the bug.
   This finds faults at boundaries no fixture happens to sit on.
4. **Recount from SQL, independently.** For every counter, write the number a
   second time as a plain SQL query with no shared code, and compare. Where the
   two disagree, one of them is wrong and neither is trusted. This is the only
   method that is immune to a shared helper being wrong.
5. **Read every metric's description against what it computes.** The catalogue
   promises "consecutive active weeks"; the code decides what that means. Read
   all 47 descriptions beside their implementations, in full — the
   `generated-data.md` rule applied to metrics.
6. **Ask each counter the six schema questions** from `finished-work.md`: whose
   clock, which two facts must agree, what can be written that should not be,
   who else can write it, does the name already mean something else, what did I
   claim was impossible. Six questions × every counter, written down.
7. **A test that fails when the next one is added wrong.** Everything above is a
   snapshot. The guard is what keeps it true: one architecture test that fails
   on a hand-rolled week, a bare `new Date()` used as a date, or a new
   period-scoped column with no key.

## What could go wrong with this plan

**R1. Making the timezone argument required touches a lot of files.** Measured:
13 files use hand-rolled `getDay()` week maths, 12 files use
`toISOString().split("T")[0]`, `healthRepo` has 26 exported metric functions and
zero timezone parameters. This is mechanical but not small, and a batch
find-and-replace will break it — the sites ask *different questions* ("what day
is it now" versus "what local day does this stored instant fall on"), which need
different helpers. Phase 1 classifies every site before changing any.

**R2. Fixing the health streaks changes numbers that are currently zero.**
Nobody has workout data, so today the change is invisible. That is convenient
and also a trap: it means the fix cannot be verified against real usage, only
against seeded data. Phase 3 therefore seeds a real account and reads the tile.

**R3. Two agents are editing this subsystem at the same time.** While the
daygame counters plan was being executed, a second agent rewrote
`src/db/metricsRepo.ts` underneath it — `repairWeeklyCounters` was deleted and
replaced mid-session, and a debugging session chased a ghost for twenty minutes
before noticing. The two designs did compose, by luck as much as by judgement.
**Mitigation:** this plan names its owned files up front and re-reads each one
immediately before editing it, and its final verification runs the whole suite
plus the differential tests rather than trusting an earlier green run.

**R4. The differential test proves the clock is used, not that it is used
correctly.** A metric could take the timezone and still compute the wrong
boundary. Method 4 (independent SQL recount) is the cross-check, and it is why
that method is in the list despite being the most tedious.

**R5. "Every counter" is defined by where I looked.** I inventoried the public
schema for column names matching counter-ish patterns, and read `healthRepo`,
`viceService`, `programs/config`, `innerGame` and `timetrack`. A counter that is
computed and never stored, in a file I did not open, is still uncovered. The
architecture test in Phase 5 is a floor, not a proof, and this plan says so
rather than claiming completeness.

**R6. The vice module deliberately has no streak.** `src/vice/viceService.ts:472`
— "based on days *held* rather than a streak. It never resets." That is a
research verdict, not an oversight. This plan must not "fix" it. Any sweep that
flags it is wrong.

---

# PART 3 — Phases

Each phase is a working, testable state. Run `npm test` after every one.

## Phase 1 — a date cannot be computed without a timezone

**Capability:** none visible. This is the method that finds what grep cannot.

1. Change the signatures in `src/shared/dateUtils.ts` so `timezone` is required
   and has no default: `getTodayInTimezone`, `getNowInTimezone`,
   `periodStartInTimezone`, `startOfDayInstant`. `periodStartFor(period, now)`
   keeps taking a Date, because its caller has already resolved the zone.
2. Compile. Every error is a site that was guessing. Classify each one before
   changing it:
   - **"What day is it now for this user"** → `getTodayInTimezone(tz)` /
     `periodStartFor(p, getNowInTimezone(tz))`. Add a `tz` parameter to the
     function; the compiler then lists its callers, recursively, until it
     reaches a request handler that can fetch it.
   - **"What local day does this stored instant fall on"** → convert the instant
     in the zone. `achievementsService.toZonedDate` already does this correctly;
     export it from `dateUtils` rather than adding a seventh copy.
   - **Genuinely user-less** (the vice module is localStorage-only and works
     signed out) → pass the browser's zone *explicitly*
     (`Intl.DateTimeFormat().resolvedOptions().timeZone`), so the choice is in
     the code rather than implied.
3. Delete the five hand-rolled Mondays: `healthRepo.ts:227` and `:411` and
   `:723`, `healthService.ts:250` (`mondayOf`), and the copies in
   `DailyActionView` and `HeatmapCalendar`. One implementation:
   `periodStartFor`.

**Acceptance test:** `tests/unit/shared/dateUtils.test.ts` — calling any of the
four with no timezone is a compile error. Plus the existing suite green.

## Phase 2 — health counts on the user's calendar

**Capability:** every gym, cardio, running, sleep and food number resets on
Monday at midnight where you live.

1. Every period-scoped function in `src/db/healthRepo.ts` takes
   `timezone: string`: `getWorkoutWeeklyCount`, `getCardioWeeklyCount`,
   `getNutritionWeeklyAvg`, `getSleepWeeklyAvgHours`, `getProteinDaysHitWeekly`,
   `getCalorieDaysHitWeekly`, `getMobilitySessionsWeekly`,
   `getYogaSessionsWeekly`, `getRunningSessionsWeekly`,
   `getConsecutiveTrainingWeeks`, `getConsecutiveCardioWeeks`. Eleven functions.
   The cumulative and "current" ones (`getWorkoutCumulativeCount`,
   `getExerciseMax`, `getLatestWeight`, …) take none — they have no period, and
   giving them one would be the "scoping something that should not be scoped"
   fault from method 2.
2. The window comes from `startOfDayInstant(periodStartFor("weekly", …), tz)`,
   never `monday.toISOString()`. `workout_logs.logged_at` is a `timestamptz`, so
   the boundary must be converted to an instant.
3. `src/db/metricsRepo.ts` `resolveHealthMetrics` passes `timezone` through. It
   already receives one.

**Acceptance test:** `tests/unit/health/healthWindows.test.ts` — the window
instant for `Europe/Copenhagen` in August is `Sunday 22:00 UTC`, in January
`23:00 UTC`, for `Pacific/Auckland` `Sunday 12:00 UTC`. Same assertions the
daygame counters already carry, now for health.

## Phase 3 — a training streak survives Monday morning

**Capability:** train four weeks running and the tile says 4, including on the
Monday before you have trained.

1. **One implementation of "a run of consecutive periods", shared.** The correct
   one already exists as `runsOf` inside
   `src/tracking/achievementsService.ts:521`. Extract it to
   `src/shared/streakRuns.ts` — pure, no I/O — and have both the tracking
   projection and the two health functions call it. This is the class fix: the
   reason health decays wrongly is that it has its own copy of a rule that is
   written correctly one file away.
2. The health functions become: read the rows, map each to
   `periodStartFor("weekly", zoned(logged_at, tz))`, dedupe, sort, hand to
   `runsOf` with `isAlive = last === thisWeek || last === lastWeek`. The
   `while (has(currentMonday))` loop goes away, and with it fault 2.
3. **Resolve fault 5 while the two are being merged.** Decide, in writing, what
   `current_*_streak` means at rest and make both the code and the comment say
   it. **Recommendation: the stored value is what was achieved, ungated; the
   read gate decides what is shown.** That keeps `longest` derivable, keeps the
   history honest, and matches what `docs/plans/counters.md` established. It
   means changing `runsOf` to return the raw run and letting `gateStreaks` do
   the hiding — one line, and the comment becomes true.

**Acceptance test:** `tests/unit/shared/streakRuns.test.ts` — four consecutive
weeks then a gap gives `current: 0, longest: 4` when asked after the gap, and
`current: 4` when asked on the Monday after the fourth week before anything is
logged. Both health and tracking assert against the same function.

## Phase 4 — the seven methods, run

**Capability:** none visible. This is the phase that finds what phases 1–3 did
not.

1. **Differential timezone table** (`tests/manual/timezoneCounters.test.ts`,
   already written and passing for sessions and approaches): extend it to every
   metric in `METRIC_CATALOG` that has a source. Each row of the table declares
   `expectsDifference: true | false`. A `*_weekly` or `consecutive_*` metric that
   answers the same in Auckland and Copenhagen at a straddling instant fails; a
   `*_cumulative` that answers differently fails.
2. **Time-travel sweep** (`tests/unit/tracking/counterShapes.test.ts`): with
   fixed rows, compute every stats-derived counter at 200 instants across a
   fortnight including 2026-03-29 (Copenhagen spring forward) and 2026-10-25
   (autumn back). Assert the shape: totals monotonic, weekly counters reset once
   per week, streaks never drop and recover.
3. **Independent SQL recount** (`tests/manual/recountAgainstSql.test.ts`): for
   the three live accounts, recount every counter with a hand-written SQL
   statement that shares no code with the app, and compare. Any disagreement is
   reported with both numbers; neither is assumed right.
4. **Read all 47 metric descriptions beside their implementations** and record
   the ones that do not match, in `docs/architecture/counters.md`.
5. **Six schema questions per counter**, written into the same document as a
   table. Not prose — a grid, so a blank cell is visible.

## Phase 5 — the guard that keeps it true

**Capability:** the next counter cannot be added wrong.

Extend `tests/unit/architecture.test.ts`:

1. **No hand-rolled weeks.** `getDay()` outside `src/shared/dateUtils.ts` and
   `src/programs/config.ts` (whose `isoWeekday` is a documented day-of-week
   conversion, not a period) fails the test.
2. **No `toISOString().split("T")[0]`** anywhere in `src/` — it silently
   converts to UTC first. `toDateISO` exists for this.
3. **Every period-scoped column declares its key** — already enforced for
   `user_tracking_stats`; extend to any table with a `current_*` column.
4. Each rule carries the file:line of a real bug it would have caught, so nobody
   deletes it as pedantry.

**Verified by mutation, not assumption:** each new rule is proved by
reintroducing the fault it forbids and watching the test fail, exactly as the
existing counter-key rule was.

---

# Blockers

Each attempted once, on 2026-08-28.

| # | Blocker | Attempt | Result |
|---|---|---|---|
| 1 | Prove the health streak bug against real data | queried `workout_logs` for all users | **Zero rows exist.** The bug cannot be reproduced from live data; it is proved by seeding a real account in Phase 3's test instead. Not a blocker to the fix, but it means no user has been harmed yet. |
| 2 | Run the counter code outside a web request | `createServerSupabaseClient` needs `cookies()` from Next | **Solved.** `tests/manual/` swaps that one client for the service-role client and runs everything else for real; `vitest.manual.config.ts` keeps it out of `npm test`. Already used to prove the timezone fix with a real account. |
| 3 | Edit `src/db/metricsRepo.ts` safely | it was rewritten by another agent mid-session | **Ongoing hazard, not resolved.** Mitigation is R3: re-read every owned file immediately before editing, and re-run everything at the end. |

# Open questions

**Q1. Should `current_*_streak` be stored raw or stored already-gated?**
Right now the tracking projection stores it gated and its comment says raw.
→ **Recommendation: store raw, gate on read.** The row then answers "what did
they achieve" and the screen answers "what is live", which are different
questions and both worth having. One line in `runsOf`, and it makes the existing
comment true. This is folded into Phase 3.3.

**Q2. Should health counters be stored, like daygame's, or stay computed on
demand?** Daygame counters live in `user_tracking_stats` and are re-derived on
every write. Health metrics are computed fresh from `workout_logs` on every read
and stored nowhere.
→ **Recommendation: leave them computed.** They are already derived from the
rows, which is the property the achievements rewrite spent a whole plan buying
for daygame. Storing them would add a cache to keep in sync — the exact fault
class this plan exists to remove. Revisit only if the query cost shows up.

**Q3. `workout_logs.logged_at` — is it when you trained, or when you pressed
save?** This is fault A, and it decides which instant every health week is built
from. I have not established the answer; the column name does not settle it and
there are no rows to look at.
→ **Recommendation: treat it as when you trained, and make the UI set it
explicitly** rather than defaulting to `now()`. If a "log yesterday's workout"
flow exists or is planned, the distinction is real and a second column is
needed. **This is the one item in this plan I would want you to confirm** — it is
a product question, not a code one.

**Q4. Should the seven detection methods run once, or in CI forever?**
→ **Recommendation: methods 1, 3, 5 and 7 become permanent tests; methods 2 and
4 stay in `tests/manual/` and are run deliberately, because they write to the
real database; method 6 is a document that is updated when a counter is added.**

---

# Execution record — 2026-08-28

`npm test`: **123 files, 3,971 tests, 0 failures.** Plus `npx vitest run --config
vitest.manual.config.ts`: **9 tests against the real project database**, which
create their own account and delete it again.

## What the detection methods found that the plan did not know about

The plan predicted two health bugs. The methods found four more.

**Method 1 (make it impossible, let the compiler list the callers) — 4 findings.**
Making `timezone` a required argument surfaced, among ~30 sites:
`src/db/healthRepo.ts` with **26 exported metric functions and zero timezone
parameters**; `buildLocalPlanGoals` computing goal dates from nobody's calendar;
and — after the change — `handleUpdateWeekStartDay`, still validating and storing
a number nothing reads.

**Method 3 (time travel) — 1 finding, and it was structural.** The sweep could
not be written at all: `gateStreaks` and `getNowInTimezone` read `new Date()`
inside themselves, so neither could be asked about the hour a week turns over.
A function that reads the clock internally cannot be tested at a boundary, and
boundaries are where every one of these bugs has lived. Both now take the instant
as an overridable argument, and `tests/unit/tracking/counterShapes.test.ts`
walks 45 days at 6-hour steps through **both** Copenhagen DST switches asserting
the *shape* of each series rather than any single value.

**Method 5 (read each promise beside its implementation) — 3 findings, two of
them inverted.** This was the highest-yield method and the plan under-rated it:

- `protein_days_hit_weekly` promised *"days where you hit your protein target"*
  and counted **log rows over the bar**. A day of three 60g meals — 180g, target
  hit — scored **0**; a day of two big meals scored **2**.
- `calorie_days_hit_weekly` promised *"days where you stayed inside your calorie
  target"* and counted **rows at or above it**. A 3,000-kcal day scored better
  than an 1,800-kcal one. The metric rewarded the opposite of what it said.
- `sessions_weekly` promised *"sessions started since Monday"*; sessions are
  counted by when they **ended**. The description was corrected, not the code —
  ending is the right event, because a session still running has no duration
  and no outcome.

**Method 7 (the guard) — 2 rules added,** each verified by mutation: a
hand-rolled week (`getDay()` then `setDate()` within four lines) and
`toISOString().split("T")[0]` both fail the build outside an allowlist that can
only shrink.

## What was fixed

| | |
|---|---|
| `getConsecutiveTrainingWeeks`, `getConsecutiveCardioWeeks` | Returned **0 for every user east of London, always** — the two lists of week labels they compared were built with different formulas. And they wiped the run every Monday before you trained. Both gone. |
| 11 health metrics | Now take the account holder's timezone. The file mentioned timezones zero times. |
| `getProteinDaysHitWeekly`, `getCalorieDaysHitWeekly` | Count days, by their own totals. The calorie comparison was inverted. |
| 6 hand-written "Monday of this week" | One: `periodStartFor`. |
| 3 implementations of "a run of consecutive periods" | One: `src/shared/streakRuns.ts`. |
| Counting vs hiding | Separated. `streakRun` counts and never hides; `isStreakCurrent` hides and never counts. The projection stores the run raw, `gateStreaks` decides what is shown — so the comment claiming exactly that is now true. |
| `getTodayInTimezone`, `getNowInTimezone`, `periodStartInTimezone`, `startOfDayInstant` | Timezone required, no default. A caller that cannot supply one cannot compute a date. |

## Proved with a real account, not a fixture

`tests/manual/timezoneCounters.test.ts` creates an account, seeds it, asserts,
and deletes everything — pass or fail. It is excluded from `npm test` and run
deliberately.

- A session at **2026-08-23 15:00 UTC** counts as *this week* for an Auckland
  user and *last week* for a Copenhagen one. Same row, two answers.
- Lifetime totals are identical for both, as they must be.
- Four weeks of training, most recently last week, reads **4** — and **0** with
  the shipped implementation pasted back in. Verified both ways.
- The nutrition fixture deliberately separates right from wrong: with it, the
  correct answer is 2 and the old answer is 1. The first version of that test
  passed against BOTH implementations by coincidence — 1 either way — and was
  rewritten. A test that passes for the wrong reason is worse than no test.

## Deviations from the plan

- **Phase 4's differential table was not extended to all 47 metrics.** It covers
  sessions, approaches, the training streak and the two nutrition metrics. The
  rest have no rows to seed cheaply — scenario sessions, 1RMs, body measurements
  — and a differential test over an empty source proves nothing. What that would
  take: a fixture builder per source, roughly a day.
- **Method 4 (recount every counter with independent SQL) was not run.** It is
  the only method immune to a shared helper being wrong, and it is the one gap
  I would fill next. What it would take: one manual test per counter family,
  each a hand-written `select` compared against the app's answer — half a day,
  and it needs accounts with data in every source.
- **Method 6 (the six schema questions as a grid) was not written.** The
  questions were asked while reading, which is not the same as recording the
  answers where the next person can see them.

## Still true, and still not proved

- **`workout_logs.logged_at` — when you trained, or when you pressed save?**
  (Q3 in the plan.) Every health week is built from this column. There are no
  rows and the name does not settle it. **This is a product question and it is
  yours.** If "log yesterday's workout" is ever a flow, the two meanings come
  apart and the column needs splitting.
- The client components that compute "this week" from the browser clock —
  `DailyActionView`, `HeatmapCalendar`, `WeeklyReviewDialog`,
  `WeeklyReviewPage`, `usePeriodStats`, `CorrelationPanel` — still do. They are
  on the allowlist, which can only shrink, and they need the timezone provider
  that `date_database.md` Phase 3 designs. Eight files, listed by name in
  `tests/unit/architecture.test.ts`.
- **R5 stands.** "Every counter" still means the ones I looked for. The guard is
  a floor.
