# Training that survives a year — plan

**Status: ALL SIX PHASES EXECUTED, 2026-09-04.** 4283 unit tests and 11 new
integration tests pass; every phase verified in a browser against seeded history.
What each phase actually turned out to be is recorded under it.

**Two of this plan's own claims were false and were corrected during execution:**
Phase 5 said `isFinalSession` was never rendered (it was, at
`TodaySessionWidget.tsx:223`) and Phase 3 said `ensureEnrollment` returned `void`
(it already returned the enrollment). Both would have sent a smaller model to
"fix" working code. Every "X is missing" in a plan is a claim, and claims get
checked before they are acted on.

---

# Part 1 — For you (plain language)

## What this is

The training feature works for a week. Most of what follows is what breaks when
somebody uses it for a *year* — plus three gaps left open by the fixes already
shipped.

Nothing here is a rewrite. Every phase is a working app state you can open and
check, and each says exactly how to check it.

## What you will be able to do, phase by phase

| Phase | What changes for the person using it |
|---|---|
| **1** | Their training data can't be lost by a bug — the database rules are tested, not just trusted. Nothing visible changes. |
| **2** | The progress line shows *when* they trained, so three months off looks like three months off instead of like three sessions. |
| **3** | Starting a program from the goals planner links it to their plan, like the other two ways already do. |
| **4** | They can see one lift across every program they have ever run — "my bench over two years", not "my bench on this program". |
| **5** | Finishing a program you *can* finish lands somewhere — archive it or run it again — instead of congratulating you and leaving you there. |
| **6** | Coming back after time off suggests what to do, per lift, instead of one generic warning. |

## What this deliberately does NOT do

- **No weight cap.** The programs here are cited from their authors. Inventing a
  ceiling would be publishing somebody else's program with our number in it. The
  app asks a question instead (already shipped).
- **No automatic deload after time off.** Same reason — no cited program has a
  rule for it. Phase 6 suggests, and the person decides.
- **No new database tables.** Everything below reads data that is already stored.

## The cost of not doing it

Phase 1 is the one with teeth. The other five are quality-of-life; Phase 1 is
about a class of bug that already cost a year of history once and was only caught
because somebody simulated a year.

---

# Part 2 — Execution

## Conventions for whoever runs this

- **Run `npm test` after every phase**, not just at the end. A phase is not done
  with a red suite.
- **Pure logic goes in `*Service.ts`, database access only in `src/db/*Repo.ts`,
  types in each slice's `types.ts`.** Enforced by `tests/unit/architecture.test.ts`
  — run it rather than remembering it.
- **Every phase names its acceptance test.** If you cannot run it, stop and say so
  rather than marking the phase done.
- Existing helpers you will need, so you do not write second copies:
  `summariseProgression`, `unbrokenRun`, `daysSinceLastSession`, `formatLoad`,
  `describeSets` — all in `src/programs/programsService.ts`.
  `toDateISO`, `getTodayInTimezone`, `periodStartFor` — all in
  `src/shared/dateUtils.ts`. **Never derive a date by converting to UTC first**;
  `tests/unit/architecture.test.ts` fails on new occurrences.

---

## Phase 1 — The database rules are tested, not trusted

**Why first.** `unenroll()` used to hard-delete an enrollment, and
`program_session_logs.enrollment_id` is `ON DELETE CASCADE`, so ending a program
erased every session ever logged on it. That is fixed — it archives now — and a
separate `deleteEnrollmentPermanently()` erases on purpose and refuses to touch a
running program. **None of that is covered by an automated test.** It was verified
by hand once, against the live database. That is exactly the shape of thing that
silently regresses.

**This is executable today.** The repo has a working integration harness that
starts a real PostgreSQL in Docker — verified 2026-09-04: `settingsRepo`
integration tests, 16 passing in 6.5s. It does **not** need any production
credentials.

### Steps

1. **Add the program tables to the test schema.**
   `tests/integration/schema.sql` currently contains zero references to
   `program_enrollments` or `program_session_logs` (checked). Copy the two
   `CREATE TABLE` blocks — and, critically, the `ON DELETE CASCADE` on
   `program_session_logs.enrollment_id` and the partial unique index
   `uq_program_enrollments_active` — from
   `supabase/migrations/20260618_create_program_tables.sql`. Add the
   `custom_schedule` column from `supabase/migrations/20260818_program_custom_schedule.sql`.
   **Copy the constraints verbatim.** A test schema that omits the cascade would
   pass while the real one deletes. `tests/integration/setup.ts:60` reads this
   file once when the container starts, so there is nothing to register — add
   the SQL and it is live.

2. **Write `tests/integration/db/programRepo.integration.test.ts`.** Model it on
   `tests/integration/db/goalRepo.integration.test.ts`. Assert on behaviour:
   - Ending a program keeps its sessions. *Create an enrollment, log 3 sessions,
     `unenroll()`, then read the session logs back and expect 3.* This is the
     regression test for the bug that lost a year.
   - Ending a program makes it stop being active, and it appears in
     `listPastEnrollments`.
   - `deleteEnrollmentPermanently()` on a **running** enrollment throws and
     changes nothing — re-read the row and expect it still present and active.
   - `deleteEnrollmentPermanently()` on an **ended** enrollment removes the
     enrollment *and* its session logs (this is where the cascade is proven).
   - Neither function touches another user's rows. Pass a different `user_id` and
     expect zero effect.
   - `listActiveEnrollments` returns `lastLoggedAt: null` for an enrollment with
     no sessions, and the newest `logged_at` when it has several.

3. **Do not mock the database.** `.claude/rules/testing.md`: test production
   functions, not raw SQL. The container is there so these can be real.

**Acceptance:** `npx vitest run --config vitest.integration.config.ts tests/integration/db/programRepo.integration.test.ts`
passes, and deliberately reverting `unenroll()` to `.delete()` makes the first
test fail. **Verify by breaking it** — a test that does not fail when the bug is
reintroduced is not a regression test.

**Files:** `tests/integration/schema.sql`, `tests/integration/db/programRepo.integration.test.ts`. No production code changes.

---

## Phase 2 — The progress line shows time, not just order

**What is wrong.** `Sparkline.tsx` spaces sessions evenly. A three-month layoff
renders identically to three consecutive days, so the one thing the line is for —
the shape of a year — is the one thing it distorts.

### Steps

1. **`summariseProgression` returns dated points.** In
   `src/programs/programsService.ts`, change `points: number[]` to
   `points: { at: string; weight: number }[]`. The date is already in scope — the
   function currently throws it away at the `downsample` call.
2. **Keep the downsample.** Still cap at `SPARK_POINTS` (40) and still keep the
   true first and last, so the ends match the numbers printed beside them.
3. **Two existing tests change shape and must be updated, not deleted.** In
   `tests/unit/programs/engine.test.ts`, `"carries the shape between first and
   latest, in order"` asserts `expect(squat.points).toEqual([40, 60, 50])` (line
   ~681) and the downsample test compares `points[0]` to `.first`. Both need the
   new `{ at, weight }` shape. **If you find yourself deleting either, stop** —
   they are the guard that the line's ends match the numbers beside it.
4. **`Sparkline` positions x by date.** `x = (t - t0) / (tN - t0) * width`. Guard
   the single-day case (`tN === t0`) — divide-by-zero there would render `NaN`
   into the path and blank the glyph.
5. **Do not add an axis, a legend or a tooltip library.** One series, inline, in a
   row that already prints the numbers. `docs`: the dataviz guidance is explicit
   that a single series needs no legend and that this form is a glyph, not a
   figure. Keep `currentColor`.

**Acceptance:** unit tests in `tests/unit/programs/engine.test.ts` — two sessions
a year apart and two a day apart produce different x-spacing; a single-day history
still renders a path with no `NaN`. Then open `/programs` with seeded gaps and
look at it.

**Files:** `src/programs/programsService.ts`, `src/programs/components/Sparkline.tsx`, `src/programs/components/ProgressionView.tsx` (label text gains the date range), `tests/unit/programs/engine.test.ts`.

---

## Phase 3 — The third way of starting a program links to the plan too

**What is wrong.** There are three places that create an enrollment. Two of them
now record the enrollment on the Life Mastery plan. The third — the goals planner,
`app/api/goals/plan/route.ts` line 33, `ensureEnrollment` — does not, so a program
started there leaves the plan claiming whatever it claimed before. This is the same
class of fault as the cardio gap already fixed: a plan asserting something the
database does not agree with.

### Steps

1. **`ensureEnrollment` returns the enrollment it settled on** (created or
   existing) instead of `void`. `src/db/programRepo.ts`. **Verified: it has
   exactly one caller** — `app/api/goals/plan/route.ts:33` — so widening the
   return type breaks nothing else.
2. **`PUT /api/goals/plan` returns the resulting references** alongside its
   current response: `{ programId, enrollmentId, label, startedAt }` per
   selection. Keep the route under 50 lines — `tests/unit/architecture.test.ts`
   enforces it; push any shaping into the repo.
3. **The caller writes them into the plan** with the existing
   `applyProgramToWorkoutRoutine(plan, dayNames, undefined, ref)`. Do not add a
   second way to write a plan reference — that function is the one place that
   owns it.

**Acceptance:** unit test — saving a plan with a program selection results in a
plan whose workout routine carries the matching `enrollmentId`. Browser: start a
program from the goals planner, then confirm `/programs` and the Life Mastery
Templates tab agree about what is running.

**Files:** `src/db/programRepo.ts`, `app/api/goals/plan/route.ts`, `src/goals/components/new-goals/NewGoalsFlow.tsx`, `tests/unit/goals/northStarService.test.ts`.

---

## Phase 4 — One lift, across every program you have ever run

**What is wrong.** `summariseProgression` reads one enrollment's session logs, so
"my bench" resets every time you change program. The data to do better already
exists: **`workout_sets` spans everything** — every program session mirrors into
it, and so does every free-form workout. It is keyed by exercise *name*, not by
program-specific id, which is exactly what is wanted here.

### Steps

1. **New pure function in `src/health/healthService.ts`** (health owns
   `workout_sets`, not programs):
   `liftHistory(sets: (WorkoutSetRow & { logged_at: string })[], exercise: string)`
   → dated top-set-per-day points. Match on `exercise.toLowerCase().trim()`, the
   same key `detectPersonalRecords` already uses — do not invent a second
   normalisation.
2. **Exclude warm-up sets.** `is_warmup` exists and `detectPersonalRecords`
   already skips them. A warm-up counted as a working set reads as a collapse.
3. **Reuse `Sparkline`, and give it ONE point shape to render.** After Phase 2 it
   takes `{ at, weight }[]`. `liftHistory` must return that same shape, so define
   the type once — `export type LoadPoint = { at: string; weight: number }` in
   `src/programs/types.ts` — and have both `summariseProgression` and
   `liftHistory` return it. **Two shapes would mean two adapters in the
   component**, which is how the second chart component gets written by accident.
   `Sparkline` stays dumb: it takes points and draws them and knows nothing about
   where they came from.
4. **The data comes from `GET /api/health/workout?days=<n>&include=sets`.** Pass a
   window wide enough to be a history (e.g. 1095 for three years) — the default is
   90 days and would silently truncate exactly the span this phase exists to show.
5. **Where it goes:** a section on `/programs` under the free-form logger, listing
   the lifts with the most history. Not the dashboard — that page is already long.

**Acceptance:** unit tests — two enrollments logging the same exercise name
produce one continuous series; warm-up sets are excluded; an exercise with one
session produces no line (matches `Sparkline`'s two-point minimum). Browser: seed
two programs a year apart with a shared lift and confirm one unbroken line.

**Files:** `src/health/healthService.ts`, `src/health/types.ts`, a new
`src/programs/components/LiftHistory.tsx`, `app/programs/page.tsx`, `tests/unit/health/healthService.test.ts`.

---

## Phase 5 — A finished program lands somewhere

**Corrected during review.** My first draft of this phase said `isFinalSession`
"exists and nothing renders it". **That was wrong** — `TodaySessionWidget.tsx:223`
renders *"Final session — you'll have graduated the program! 🎉"*, inside the
endurance branch, which is also the only branch that sets the flag. A smaller
model following the original text would have "fixed" something that already works.

**What is actually missing:** the notice appears *before* you log the last
session, and then nothing happens. There is no landing — the program does not
end, does not archive, and does not offer to repeat. You are congratulated and
left exactly where you were.

**Verified:** the notice renders and is endurance-only. **Not verified:** what the
cursor does after the final session is logged. *Establish that first* — log the
last session of Couch to 5K and read the resulting cursor — because the fix
differs depending on whether it stops, wraps, or runs off the end.

### Steps

1. **Find out what happens after the last session.** Enrol in `couch-to-5k`, fast
   forward with `POST /api/programs/enrollments/{id}/action {"action":"skip"}` (do
   **not** click Skip 26 times), log the final one, and read the enrollment back.
   Write down what the cursor does. Everything below depends on this.
2. **Offer a landing on the session after the last one:** archive it (`unenroll`,
   which keeps the history — see Phase 1) or start it again.
3. **Do not auto-archive.** Finishing a plan and repeating it is normal.
4. **Say what happens to the record** — "your sessions are kept" — the same
   promise the End button already makes.

**Acceptance:** unit test — the last session of `couchTo5k` has
`isFinalSession: true` and the one before it does not. Browser: seed to the end
via the skip endpoint, log it, confirm both paths appear and that archiving lands
the program in "Programs you have finished".

**Files:** `src/programs/components/TodaySessionWidget.tsx`, `src/programs/components/ProgramsApp.tsx`, `tests/unit/programs/engine.test.ts`.

---

## Phase 6 — Coming back, per lift

**What is wrong.** The layoff notice (`daysSinceLastSession` ≥ `LAYOFF_DAYS`) is
one line for the whole program. After three months every lift is affected
differently, and the notice cannot say which.

### Steps

1. **Per-lift last-trained** from the session logs already loaded — no new query.
2. **Suggest, never apply.** Show, per lift, the weight waiting and how long since
   it was trained. **Do not compute a deload percentage**: no cited program has a
   detraining rule and inventing one puts our number in somebody else's program.
3. **Route the action through the controls that exist.** "Change this program"
   already edits working weights; link to it rather than adding a second editor.

**Acceptance:** unit test for the per-lift gap calculation, including a lift
trained recently inside a program that is otherwise stale. Browser: seed a
program with one lift trained last week and the rest three months ago; confirm
only the stale ones are called out.

**Files:** `src/programs/programsService.ts`, `src/programs/components/TodaySessionWidget.tsx`, `tests/unit/programs/engine.test.ts`.

---

## Review pass — what attacking this plan found

Run against the plan itself before any of it was executed.

**One phase was built on a false premise.** Phase 5 originally claimed
`isFinalSession` "exists and nothing renders it". It does render, at
`TodaySessionWidget.tsx:223`. A smaller model would have dutifully "fixed" working
code. Corrected above, and the phase is now much smaller. **The lesson generalises:
every "X is missing" in a plan is a claim, and claims get checked.**

**DRY.** The one real risk was Phase 2 and Phase 4 inventing two shapes for the
same idea — a dated series of weights — which would put two adapters inside one
component and invite a second chart. Settled explicitly: one `LoadPoint` type,
both producers return it, `Sparkline` knows nothing else. Elsewhere the plan names
the existing helpers to reuse (`summariseProgression`, `formatLoad`,
`toDateISO`, the `exercise.toLowerCase().trim()` key `detectPersonalRecords`
already uses) precisely so a second copy is not written.

**YAGNI.** Phase 6 is the weakest phase and is now marked optional — see Q6. The
plan also refuses three things that would be speculative: a weight cap, an
automatic deload, and any new database table. Phase 5 shrank by two thirds once
its premise was checked, which is YAGNI arriving by way of honesty.

**SOLID.** The slice boundaries are enforced by `tests/unit/architecture.test.ts`
rather than by intention, so a phase that puts logic in the wrong layer fails a
test rather than passing review. Two deliberate placements worth stating:
`liftHistory` belongs to `src/health/` because `workout_sets` is health's table,
not programs'; and the two delete paths (`unenroll`, `deleteEnrollmentPermanently`)
stay separate functions with different guarantees rather than one function with a
boolean.

**Executable by a smaller model?** Yes, with the corrections above. The gaps that
would have caused guessing were: the two tests Phase 2 invalidates (now named with
line numbers), how `schema.sql` is loaded (now stated), whether `ensureEnrollment`
has other callers (verified: one), the endpoint and window Phase 4 needs (now
given), and how to reach the last session of Couch to 5K without 26 clicks (now
the skip endpoint). Phase 5 still contains one genuine unknown, and says so
out loud rather than inventing an answer.

---

## Destructive steps — flagged and gated

Only one phase can destroy anything, and only in a throwaway database.

- **Phase 1 runs against a disposable PostgreSQL container**, created and dropped
  by `tests/integration/globalSetup.ts`. It never touches the real database and
  needs no production credentials.
- **Phase 1's acceptance requires deliberately reintroducing the deletion bug** to
  prove the test catches it. **Revert that change immediately afterwards** and
  re-run the suite. Do not commit while `unenroll()` deletes.
- **No phase runs a migration.** If one appears to be needed, stop and ask — the
  working tree is shared with another agent and `supabase db push` would ship
  their unapplied migrations too.
- **No phase deletes user data.** `deleteEnrollmentPermanently` is *tested* in
  Phase 1, against container rows only.

---

## Manual blockers

Each was attempted at least once. Numbered so you can answer "1 yes, 2 skip".

**1. Do you want Phase 4 (one lift across all programs) to include free-form
workouts, or only program sessions?**
*Attempted:* I checked the data. `workout_sets` genuinely contains both — a
program session mirrors into it, and the free-form logger writes there directly.
So it is a product choice, not a technical limit, and I cannot make it from the
code. *Recommendation:* **include both.** A bench press is a bench press; splitting
them would mean two "my bench" lines that disagree, which is the class of problem
this whole area has been dug out of.

**2. Phase 5 needs to know what "finishing" a program should offer.**
*Attempted:* I read the engine. `isFinalSession` is set only for endurance plans;
linear programs (StrongLifts, Starting Strength) have no end and 5/3/1 cycles
indefinitely by design, so there is nothing in the data to derive an answer from
for those. *Recommendation:* **only endurance plans get a finish**, and it offers
archive-or-continue. Do not invent an ending for programs whose authors did not
give them one.

**3. Nothing here needs a database migration — please confirm you have not added
one elsewhere that these tables depend on.**
*Attempted:* I checked every phase against the schema; all six read data that is
already stored, and Phase 1 touches only the *test* schema. *Recommendation:*
**proceed without a migration.** If `npm test` shows an unrelated migration
failure, stop and tell me rather than applying anything — the working tree is
shared with another agent.

**4. I cannot read `.env.local`, so I cannot verify anything against your real
account.**
*Attempted twice this session; permission denied both times.* This does not block
any phase — Phase 1 uses a local throwaway PostgreSQL that needs no credentials,
and everything else is verifiable on the test user. *Recommendation:* **leave it
denied.** If you ever want a specific row on your own account inspected, paste the
output instead.

---

## Open questions

Each carries a recommendation, so "go with your recommendations" is a complete answer.

**Q1. Is `UNBROKEN_RUN_QUESTION_AT = 30` the right threshold?**
It is a judgement call, not a cited number — beginner linear programs typically
stall inside ~40 sessions, so 30 is comfortably inside "should have stalled by
now". Too low and it nags people who are genuinely progressing.
**Recommendation: keep 30 and revisit once there is real usage.** It is one
constant in `programsService.ts` and costs nothing to change.

**Q2. Should more than one program be allowed to run at once?**
Today enrollments only deactivate *within* a discipline, so strength + cardio can
both run and both prescribe. It is visible now, not prevented.
**Recommendation: keep allowing it.** Somebody lifting and running is a real
person, not a mistake. The visibility fix (name, start date, last logged, End) is
the right level of intervention.

**Q3. Should ending a program offer to carry your weights into the next one?**
Re-enrolling re-seeds from the program's defaults, so a year of progression is
kept as *history* but not as a *starting point*.
**Recommendation: yes, but not in this plan.** It is a real improvement and a
separate piece of work with its own design questions (which lifts map to which).
Phase 4 makes the case for it visible first.

**Q4. Where should the cross-program lift history live — `/programs` or Tracking?**
Phase 4 assumes `/programs`.
**Recommendation: `/programs`.** It is training data and that page is now the one
place training lives. The Tracking dashboard is already long and has the
gym-sessions tile for the summary view.

**Q6. Is Phase 6 (per-lift layoff advice) worth building at all?**
A generic "you last trained this 94 days ago" already ships. Per-lift is a
refinement, and it is the only phase here that does not fix something wrong.
**Recommendation: build Phases 1–5, then stop and look.** If the generic notice
turns out to be enough in real use, Phase 6 is work that was never needed. It is
listed last for exactly this reason.

**Q5. Should the sparkline become a real chart when there is a lot of history?**
At 150 sessions the glyph is still readable, but somebody may want to inspect it.
**Recommendation: no, not yet.** Adding an axis, tooltip and scale turns six list
rows into six figures. If it is wanted, the right form is one full chart on a
lift's own view — which is Phase 4's natural next step, not a change to the row.

---

## Remaining blockers after this plan is executed

None expected. Every phase is verifiable with the test user and the local
container. The one thing that stays unverifiable is your own account's data
(blocker 4), which no phase depends on.
