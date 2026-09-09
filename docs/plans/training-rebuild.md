# Training, rebuilt so it stops lying and starts reading like an app — plan

**Status:** written 2026-09-09, not started. Supersedes nothing; the previous
plan (`training-overhaul.md`) built the machinery underneath, and this fixes
what that plan got wrong and never finished.

---

# Part 1 — For you (plain language)

## What this is answering

You said the workout part looks bad and works badly, and asked how the layout
and the functionality were arrived at. The honest answer, which this plan is
built on:

- **The functionality was researched.** How Strong and Hevy actually work — a
  workout is started rather than filled in, each set is ticked off, the tick
  starts the rest clock, last time sits beside this time — was read from those
  apps' own documentation and from digests of 200+ threads of what lifters
  complain about. Those citations are in `training-overhaul.md`'s appendix.
- **The layout was never designed at all.** The previous plan says in its own
  words: *"Does not add a new visual style."* So every screen is the same
  reflex — back link, title, subtitle, tab row, then a stack of identical
  cards — assembled from whatever components already existed. Nobody drew it,
  nobody compared it to anything, and it was checked by tests that assert an
  element exists and a number is right. That is how a screen can pass 4,600
  tests and still be unusable.

So this plan does two different jobs. It finishes and corrects the machinery,
and it designs the screens for the first time.

## The four things actually wrong

**1. Some of it lies about your data.** Not cosmetic — these change numbers or
lose them.

- Delete a workout in History and your program keeps the weight it advanced
  you to. You deleted the session; the weight it caused stays forever.
- "Delete permanently" tells you *"Its 47 logged sessions will be erased"*.
  They are not erased. They survive, silently cut loose from the program, so
  they stop counting towards it and cannot be put back.
- With no program running, your whole history switches from pounds to
  kilograms. Same sets, different numbers, no warning.
- A self-built week logs "Back Squat"; your Squat 1RM tile reads 0 forever,
  because the lookup matches one exact name.
- Type 1000 into a weight box and the app accepts it, then the database
  refuses it with an error you cannot act on — after your program's weights
  have already been advanced.

**2. Some of it shows a guess as a fact.** When a request fails, the screen
tells you something false rather than saying it does not know: "No active
program" to somebody three weeks into one; "No workouts logged yet" to somebody
with two hundred, followed by every lift in the next workout announced as a
personal record; "Loading session…" forever; the whole finished-programs
archive simply gone. Skip, Reset and End never check whether they worked.

**3. The screens were never designed.** Measured on your phone:

- The tab called **Today** shows an inventory of programs, two identical
  orange *Browse* buttons 40px apart, and three separate "nothing here"
  messages — and never shows today's workout.
- **History is one 17,291-pixel scroll**: 141 identical cards, no months, no
  search, no filter, no paging. Reaching June is twenty screens of thumb.
- A workout opens as a spreadsheet — "1  20 kg × 5" four times over — with no
  sign of what was hard, what was a record, or what was a warm-up.
- The volume chart is decoration: eight bars of near-equal height, no axis, no
  numbers, labels "20 27 03 10 17 24 31 07" with no month and no unit.
- The four tabs are 28px tall where the app's own rule is 44px.
- ~~The floating navigation button sits on top of the rest timer.~~
  **Withdrawn 2026-09-09.** That circle is Next.js's own development-mode
  indicator, not part of the app: there is no such element in the DOM, and the
  production build does not draw it. It was in every screenshot because every
  screenshot came from the dev server. No user has ever seen it.
- Every Training screen ends in 64px of dead space, padding for a bottom bar
  that this route never draws.

**4. Some of it was promised and never built.** Mid-workout you cannot swap a
lift when the rack is taken, reorder anything, add a warm-up set, change the
rest time, or tap a lift to see last time. Supersets are written into two
programs and drawn as ordinary lifts. There is no screen anywhere to say
whether you train in kilos or pounds, what your bar weighs, or what your
smallest plate is — the columns exist in the database and nothing writes them.

## What each screen becomes

**Today** shows today: the session name, its lifts, and one button that starts
it. If a workout is already running, Resume replaces it. If today is a rest
day, it says so and names what is next. Programs move to their own place —
they are furniture, not the thing you came for.

**History** groups by month with the month's totals, shows newest first,
loads more as you reach the end instead of all at once, and can be filtered to
one lift. A row says the day, the session, and one line of what it was. Opening
one collapses identical sets — "4 × 20 kg × 5" rather than four rows — and
marks warm-ups, misses and records.

**A past workout** reads like a receipt: what you did, what was a record, what
you skipped and why, and what it did to your program.

**Progress** answers three questions and drops anything that answers none:
are you turning up, is the weight going up, and what are your bests. Every
chart carries numbers and a unit or it does not ship.

**The live screen** gains what was promised: last time beside this time, a lift
menu that can swap, reorder, add a warm-up and change the rest, supersets drawn
as pairs with one rest after the pair, and a tap on a lift's name for its
history.

## What this deliberately does not do

- **No new visual style.** It uses the kit that already exists
  (`src/programs/components/ui.tsx`) and fixes the kit where it is wrong. This
  is a layout and information-hierarchy job, not a repaint.
- **No native app.** A locked iPhone still cannot buzz you when the rest timer
  ends. That needs an installed app and a push server, and it is not here.
- **No new AI.** The suggest-goals button was removed on 2026-09-09 and nothing
  here brings a model call back.
- **No redesign of the vice module.** Its touch targets are recorded as debt
  elsewhere; it is not training.

## What it costs

Ten phases. Phases 0–2 are correctness and can ship on their own — after them
nothing in training lies to you, even though it still looks the same. Phases
3–6 are the screens. Phases 7–9 are the missing settings, the physical
usability, and clearing out what is dead. Each phase is independently
shippable and independently testable.

---

# Manual blockers

Each one was attempted before it was written down. "Attempted" means a command
was run or a URL was opened, and the result is quoted.

### B1 — CI is red on main right now, and has been. **Needs you.**

*First attempt, and it was wrong:* `gh run list` → `bash: gh: command not found`,
from which I concluded I could not see CI. That was a blocker I invented. The
repository is public, so the runs read fine over plain HTTP:

```
curl -s "https://api.github.com/repos/reachjvc/Daygame_coach/actions/runs?per_page=3"
```

*What that shows:* the two most recent runs on `main`, both from 2026-09-09,
both **failure** — `CI` and `E2E Tests`. Drilling into the jobs, the failing step
is **Lint**, in `lint-and-test`.

*Reproduced locally:* `npx eslint .` → **503 problems (497 errors, 6 warnings)**.
None of them are in the files this work touched — I checked. So the repository's
lint has been failing independently of the training work, and every phase in this
plan that ends "lint clean" is unreachable until it is dealt with.

*What I need from you:* a decision — see **Q7**. Nothing in this plan is blocked
from *starting*, but no phase can honestly report "green" until it is answered.

### B2 — Every file this plan builds on exists in no commit. **Needs you.**

*First attempt, and it was stale:* I read `git status` mid-way through another
agent's cleanup and recorded 581 changed files with 500 deletions. Re-checked:
that cleanup is **finished and committed** (`ecee9a13`, "Delete 482 stale
documents"). The tree is now 114 changed files with 17 deletions, `docs/plans/`
survived, and `docs/plans/silent-failures.md` is already gone rather than
pending — so the five files citing it are broken *now*, not later.

*The real hazard, which that stale reading hid:*

```
git log --oneline -1 -- src/programs/components/HistoryTab.tsx   → (nothing)
```

`HistoryTab.tsx`, `ProgressTab.tsx`, `TrainingCard.tsx`,
`tests/unit/health/workoutPaging.test.ts`, `src/shared/lifeMasteryRoutes.ts` and
this plan itself are **in no commit at all**. A week of training work exists only
in this working tree, in a checkout another agent also writes to. Anything that
resets or cleans it loses all of it, and there is no branch to recover from.

*What I need from you:* say the word and I will commit the training work to a
branch before Phase 0 begins. **My recommendation: commit it first.** Every
phase below edits these files; building on an uncommitted foundation means a
mistake in Phase 4 cannot be undone back to a known-good state.

### B2b — 497 lint errors mean "clean" cannot be reported. **Needs you.**

*Attempted:* `npx eslint .` → 503 problems, 497 of them errors. Spot-checked
against the files this work touched: none are mine.

*Why it matters:* the plan's own convention 3 says to run lint after every step.
With 497 pre-existing errors, a new error is invisible in the noise, and CI's
Lint step (B1) fails before any of this plan's work is even considered.

*What I need from you:* the answer to **Q7**.

### B3 — I cannot test a real iPhone, a locked phone, or a push notification.

*Attempted:* the training suite runs on WebKit and on an iPhone 14 viewport in
Playwright (56 tests pass across iPhone Safari, Android and Firefox). That is a
simulated viewport with a real engine, not a phone.

*Why it matters:* the rest timer's behaviour when the screen locks, and whether
anything can buzz you, cannot be established here.

*What I need from you:* run the workout flow once on your own phone at the end
of Phase 6 and say what happened when the screen locked. **My recommendation:
accept the limit and do not attempt a native push in this plan** — it is a
separate phase of work, and the plan says so out loud rather than pretending
the web page can do it.

### B4 — Changing what the database enforces needs your yes. **Needs you.**

*Attempted:* `supabase migration list --linked` → every migration is applied,
nothing pending. So the schema is current and I can read it.

*Why it matters:* Phase 1 fixes "Delete permanently does not delete". Making it
true means either deleting the workouts — destructive and irreversible — or
changing the wording. This repo's rules say to stop and ask before anything
destructive.

*Checked, and it removes half of this blocker:* Phase 7 needs **no migration and
no permission change**. All three columns exist and
`supabase/migrations/20260907100000_one_workout_record.sql:221` already runs
`GRANT UPDATE (weight_unit, bar_weight_kg, smallest_plate_kg) ON public.profiles
TO authenticated`. Phase 7 is gated only on the product answer to Q3, not on a
schema change.

*What I need from you:* the answer to Q1. Nothing in Phase 1 step 2 is written
until you have given it.

### B5 — There was no design reference. There is one now; it needs your yes.

*Attempted, and resolved:* the existing appendix in `training-overhaul.md` cites
Strong's and Hevy's *help pages*, which describe features rather than layouts —
which is why the screens were never designed. I have since gathered the missing
half: how Hevy, Strong, FitNotes and Boostcamp actually lay out the logging
screen, the history list, a past workout and progress, with a URL behind every
claim. It is what Phases 3–6 are now written from, and three of my own earlier
assumptions did not survive it (nobody ships a search box; the past workout is a
screen, not an accordion; the set number is a control).

*I also screenshotted all four current screens at 390×844 and measured them* —
that is where the numbers in Part 1 come from.

*What is left for you:* "make it look good" is still not executable, so Phases
3–6 specify layouts element by element. **My recommendation: read the four
layout blocks and disagree with specific lines** — that is what they are written
for. If you would rather name an app to copy outright, say which and I will
re-specify against it.

### B6 — I cannot verify what your account actually sees.

*Attempted:* read-only probe of the database. `test@daygame-coach.local` has
145 workouts (the seeded year). Your own account, `reachjvc@gmail.com`, has 2.

*Why it matters:* every screenshot and measurement in this plan is from the
seeded test account. If your two workouts show something different, I have not
seen it.

*What I need from you:* nothing, unless a screen behaves differently for you —
in which case say which. **My recommendation: none needed**; the test account
is the harder case and is what the phases are written against.

---

# Open questions

Each has a recommendation, so "go with your recommendations" is a complete
answer.

### Q1 — "Delete permanently" says your sessions are erased. They are not. Which becomes true?

Today `deleteEnrollmentPermanently` deletes only the program row, and
`workout_logs.enrollment_id` is `ON DELETE SET NULL`, so every session survives
and is quietly detached.

- **(a) Make the words true** — delete the workouts too. Honest, matches the
  confirmation, and irreversible.
- **(b) Make the button true** — keep the sessions, and change the wording to
  "Its 47 sessions stay in your history and stop counting towards this
  program."

**Recommendation: (b).** Training history is the thing lifters say they fear
losing most, and this is the only button in the app that can destroy it. Option
(a) is a one-line change that makes a mis-tap permanent.

### Q2 — Where do programs live once Today shows today?

Today's tab currently doubles as the program inventory.

- **(a) A fifth tab, "Programs".**
- **(b) Behind a button in the Today header** — "StrongLifts 5×5 ▸" opens the
  program screen.

**Recommendation: (b).** Four tabs are already too many for a 390px screen, and
the program is context for today rather than a peer of it.

### Q3 — What does the settings screen own: unit, bar weight, smallest plate?

The columns exist (`profiles.weight_unit`, `bar_weight_kg`,
`smallest_plate_kg`); nothing writes any of them, and nothing reads two.

- **(a) All three on the account**, with the per-program override that already
  exists in the schema.
- **(b) Unit only**, and drop the bar/plate columns as unbuilt.

**Recommendation: (a).** The engine already snaps prescriptions to loadable
weights and already prints "this is already the lightest your bar can be — use
a lighter bar", which is the app naming a fix it does not offer. (b) would mean
deleting that message too.

### Q4 — The volume chart: fix or delete?

Eight bars of near-equal height with no axis.

- **(a) Fix it** — add a value axis, a unit, month labels, and make the bars
  proportional.
- **(b) Delete it** and keep the three numbers it was trying to say.

**Recommendation: (a), and decided now rather than deferred.** One chart:
weekly working-set volume, with a value axis, a unit and month labels. The bars
already scale correctly — what makes it unreadable is that nothing says what a
bar is worth. That is a labelling job, not a redesign, and "see how it looks
and decide later" is the kind of postponement this project's rules forbid.

### Q5 — Does History load more as you scroll, or paginate?

141 workouts today; a real user reaches thousands.

- **(a) Infinite scroll** with a month header that sticks.
- **(b) "Load more"** button at the end of each month.

**Recommendation: (a), fetching a window rather than everything.** It matches
every tracker lifters use — Hevy: "There's no limit. You can scroll down to the
start of your journey" — and the sticky month header is what makes a long scroll
navigable rather than endless. Fetch the visible months only: fetching all and
rendering a slice is what the app did before the row-cap fix, and it is what made
a year of training a 17,000-pixel page.

### Q6 — New icons will be needed (search, filter, calendar, swap, reorder).

The repo's rule is to ask before reusing an existing icon in a new context.

- **(a) I propose the icon for each new control and you approve the list once**,
  in Phase 3.
- **(b) You choose them.**

**Recommendation: (a), and the list is shorter than it looks.** Check
`src/shared/iconRoles.ts` first — most of these icons are already registered for
a role that covers this use, and only a genuinely new context needs your yes. The
proposal comes as one list in Phase 3 rather than six interruptions.

### Q7 — What happens to the 497 lint errors that make CI red?

Not a training question, but every phase below ends "lint clean", and today
`npx eslint .` reports 497 errors and CI's Lint step fails on `main` (B1, B2b).
None of them are in the training work.

- **(a) A baseline, like the type ratchet.** Record today's count per file;
  fail only on an increase. Matches `tsc-baseline.json`, which this repo already
  trusts, and makes "clean" mean something again immediately.
- **(b) Fix all 497 first.** Honest, and blocks this plan behind unrelated work.
- **(c) Leave it.** Then no phase here can report a green tick truthfully.

**Recommendation: (a).** It is the pattern the repo already uses for exactly this
problem, it takes an afternoon, and it makes every subsequent phase's lint result
mean something. (c) is not an option — a permanently red CI trains everyone to
ignore it, which is how the training work reached this state.

*(The old Q7, "how much history in memory", was a duplicate of Q5 and has been
folded into it — the windowed fetch is the same decision.)*

---

# Part 2 — Execution

## Conventions for whoever runs this

1. **Every step names the file and the exported symbol.** If a step does not
   say which function to change, it is a defect in this plan — say so rather
   than guessing.
2. **Every deliverable names its test.** A step is done when its named test
   passes *and* that test fails if the change is reverted. Prove it by
   reverting once.
3. **Run after every step, not at the end:** `npm test`,
   `node scripts/typecheck-ratchet.mjs`, and `npx eslint <the files you
   touched>`. The type ratchet must say "none new".
4. **These guards must stay green and must never be loosened to pass:**
   `tests/unit/architecture.test.ts` (business logic in services, DB access in
   repos, routes under 50 lines, no new unpaged read, no new self-fetching
   screen, no new unreadable text), `routeReachability.test.ts`,
   `backNavigation.test.ts`, `writeCoverage.test.ts`. An allowlist may shrink;
   it may never grow.
5. **Destructive steps are marked DESTRUCTIVE and are not run without the
   answer to the question they name.**
6. **The working tree is shared with another agent.** Never `git stash`, never
   `supabase db push` without checking `supabase migration list --linked`
   first, and re-read a file before editing it if you did not just write it.
7. **Verify in a browser, not only in a test.** The dev server is on
   localhost:3000; the production build is started by hand on :3200 and is the
   only way to see production-only behaviour.

## Phase 0 — One owner for each rule

**What you can do after:** nothing new. This is the phase that stops the same
bug being fixed in four places and reappearing in a fifth.

**Why it is first:** the unit bug in Part 1 exists because nineteen places
convert a weight and two disagree about which unit to use. Fixing the screens
before the rules would copy the fault into every new screen.

### Steps

1. **One conversion.** Create `src/shared/weight.ts`:
   ```ts
   export type Unit = "kg" | "lb"
   export const KG_PER_LB = 0.45359237
   export function toKg(value: number, unit: Unit): number
   export function fromKg(kg: number, unit: Unit): number
   ```
   **Do not add a `formatWeight` here.** One already exists at
   `src/health/healthService.ts:43` with a different signature. Moving it is a
   second job with its own call sites; this step is about the conversion only.
   Minting a second `formatWeight` would be the exact duplication this phase
   exists to remove.
   Replace every call site. There are 19 today; find them with
   `grep -rn "toKg(\|fromKg(\|2.20462\|0.4535" src`. Two must be fixed rather
   than moved: `src/programs/hooks/useLiveWorkout.ts:243` multiplies by a raw
   `0.45359237`, and `src/health/healthService.ts:35` holds a *different*
   constant, `KG_TO_LBS = 2.20462`, whose reciprocal disagrees in the sixth
   decimal.

2. **One spelling.** `src/health/types.ts:9` declares
   `WeightUnit = "kg" | "lbs"`; the programs slice declares
   `UnitSystem = "kg" | "lb"`. Keep `"lb"`, delete `"lbs"`, and migrate
   `src/health/components/WeightTracker.tsx:43,82`. Add a test asserting the
   two type names resolve to the same union.

3. **One answer to "which unit".** Create in `src/programs/programsService.ts`:
   ```ts
   /** The running program's unit, else the account's, never a silent default. */
   export function unitFor(
     enrollmentUnit: Unit | null,
     accountUnit: Unit | null
   ): Unit | null
   ```
   Returning `null` means "not known yet" and the caller must show that rather
   than picking one. Replace `src/programs/components/TrainingScreen.tsx:61`
   (`running?.unitSystem === "lb" ? "lb" : "kg"` — the line that turns a pounds
   history into kilos) and make `src/db/workoutRepo.ts:475` its only reader of
   `profiles.weight_unit`.

4. **One upper bound.** `workout_sets.weight_kg` is `NUMERIC(5,2)`, so 999.99
   is the true maximum. `src/health/schemas.ts:53` has it right;
   `src/programs/schemas.ts` lines 212, 239 and 291 all say `max(1000)`.
   Export `MAX_WEIGHT_KG = 999.99` from `src/shared/weight.ts` and use it in
   all four.

5. **One loader.** Create `src/shared/useLoad.ts`:
   ```ts
   type Load<T> = { state: "loading" } | { state: "ready"; data: T }
                | { state: "failed"; retry: () => void }
   export function useLoad<T>(url: string, parse: (body: unknown) => T): Load<T>
   ```
   Three states, never two. This is the primitive the architecture test's
   comment already promises and that does not exist — the reason 69 components
   each invented their own failure behaviour. Phase 2 migrates the training
   screens onto it; do not migrate anything else in this plan.

6. **One clock.** Every "is this today / this week" in the training slice must
   take a timezone argument and use `src/shared/dateUtils.ts`. Fix
   `src/programs/components/WeekStrip.tsx:83` (device clock) and
   `src/programs/components/ProgressTab.tsx:93` (device clock, with a comment
   claiming otherwise).

**Acceptance**

- New: `tests/unit/shared/weight.test.ts` — round-trips kg→lb→kg for 0, 2.5,
  20, 999.99; asserts one constant; asserts `MAX_WEIGHT_KG` matches the column.
- New: `tests/unit/shared/useLoad.test.ts` — a failing fetch produces `failed`,
  never `ready` with empty data.
- New: `tests/unit/programs/unitFor.test.ts` — no enrollment and no account
  setting returns `null`, not `"kg"`.
- `npm test` green, type ratchet "none new".

## Phase 1 — Nothing lies

**What you can do after:** delete a workout and trust your program; read your
history in the unit you train in; see a 1RM that counts the lifts you actually
did.

### Steps

1. **Deleting a workout recalculates the program.**
   `src/db/healthRepo.ts:407` `deleteWorkoutLog` deletes the row and stops.
   `src/db/workoutRepo.ts:735` already shows the pattern — read
   `log.enrollment_id` first, delete, then `await recalculateEnrollment(userId,
   enrollmentId)`. Do the same here.
   *Acceptance:* `tests/e2e/programs-history-progress.spec.ts` gains "deleting a
   session moves the weights back down": log a full session, assert the next
   prescription rose, delete it from History, assert the prescription returned
   to its original value.

2. **DESTRUCTIVE — needs Q1.** "Delete permanently". If (b): change the
   confirmation text in `src/programs/components/PastPrograms.tsx:103` to say
   the sessions are kept and stop counting. If (a): delete the workouts in
   `src/db/programRepo.ts:398` inside the same transaction. Do not write this
   step until Q1 is answered.

3. **Pounds stay pounds with no program running.** Uses `unitFor` from Phase 0
   step 3. `TrainingScreen.tsx:61` passes the account unit; when `unitFor`
   returns `null`, the screen asks once rather than assuming.
   *Acceptance:* a browser test — set the account to `lb`, end all programs,
   assert History and Progress both read lb.

4. **The 1RM lookup stops matching one exact name.**
   `src/db/healthRepo.ts:573` uses `.ilike("exercise", exercise)` — equality.
   The library calls it "Back Squat"; the metric asks for "squat"
   (`src/db/metricsRepo.ts:401`). Two parts: write `library_id` on every set
   (today `src/db/workoutRepo.ts:556` hardcodes `library_id: null`), and match
   on it with a name fallback.
   *Acceptance:* `tests/unit/health/exerciseMax.test.ts` — a set logged as
   "Back Squat" counts toward the Squat 1RM.

5. **The weight bound.** Already specified in Phase 0 step 4; the user-visible
   half is that the API must refuse 1000 *before* the engine advances anything.
   `src/db/programRepo.ts:681-682` is, in this order:
   ```ts
   await persistState(userId, result.enrollment)   // advances the weights
   await writeWorkout(userId, enr, program, logInput, { rpe, notes, loggedAt })
   ```
   If `writeWorkout` throws — which a 1000 kg set makes it do — the weights stay
   advanced with no session to show for it. Write the workout first and advance
   only on success, or wrap both.
   *Acceptance:* `tests/integration/programSession.integration.test.ts` — post a
   1000 kg set; assert 400, and assert the enrollment's weights are unchanged.

5b. **"Gym sessions" stops counting runs, yoga and mobility.** The weekly
   gym-sessions number — the one a goal can be linked to — counts every workout
   row whatever its `session_type`, while the same repo has type-specific reads
   right beside it (`src/db/healthRepo.ts:490` filters `cardio`, `:802`
   `mobility`, `:818` `yoga`). So a week of three runs reads as three gym
   sessions. Filter to strength types.
   *Acceptance:* a unit test where a week of one lift session and two runs
   reports one gym session.
6. **Timed work stops counting as weight moved.** `src/db/workoutRepo.ts:406`
   sums every set into the Done summary; the comment two lines below says it
   does not, and the weekly chart agrees with the comment. Use `isTimedLift`
   from `src/health/healthService.ts`.
   *Acceptance:* a unit test where a 32 kg carry for 45 seconds adds 0 to volume.

7. **Correcting a workout stops deleting the exercise note.** The row builder
   at `src/db/workoutRepo.ts:706-717` carries `side`, `notes` and `rpe` across
   and has no line for `exercise_notes`, so the per-exercise note is dropped —
   which the comment above the function says cannot happen.
   *Acceptance:* extend the existing correction test to assert the note survives.

8. **Half of the old correction route — and only half.**
   `app/api/programs/enrollments/[id]/log/[logId]/route.ts` exports PATCH and
   DELETE. **Do not delete the file.**

   **DELETE stays.** It has six callers: the live delete-a-session button at
   `src/programs/components/ProgressionView.tsx:95`, and five end-to-end cleanup
   sites (`tests/e2e/programs-live-workout.spec.ts:36,56`,
   `tests/e2e/programs-history-progress.spec.ts:164,259`,
   `tests/e2e/programs-offline.spec.ts:32`). In plain terms it is the only path
   that removes one logged session *and* recalculates the program as if it never
   happened. Deleting it removes a working feature and breaks three test files.

   **PATCH goes.** Nothing calls it, and it is the one that loses data: it
   flattens every set to `working`, drops notes, RPE and side, and never checks
   that `logId` belongs to the enrollment in the URL. Delete only the
   `export async function PATCH` block. Keep `reviseSessionLog` in
   `src/db/programRepo.ts` — DELETE still calls it.

   *Acceptance:* `grep -rn 'method: "PATCH"' src app tests` returns nothing
   pointing at this route; the `delete-session` control still passes its existing
   test; `routeReachability` and `writeCoverage` stay green.

## Phase 2 — Nothing pretends

> **Read `docs/plans/honest-values.md` before starting this phase.** It is a live
> sibling plan covering the same class of fault across the whole app, and it owns
> two things this phase must not duplicate or trample:
>
> 1. **A latent cross-account leak in the hook this phase migrates.**
>    `src/programs/hooks/useEnrollment.ts:28` holds its answers in a module-level
>    `store` with **no user key**, and nothing clears it when the signed-in person
>    changes. In plain terms: if two people used the same browser without a full
>    page reload, one could be shown the other's training. It is latent today only
>    because the product has no sign-out control at all. That plan's Phase 0 fixes
>    it. **Do not restructure `useEnrollment` here until it has**, or the fix lands
>    on a moved target.
> 2. **The shared loader.** If `honest-values.md` has already built one, use it
>    rather than building the `useLoad` in Phase 0 step 5 — two shared loaders is
>    the duplication both plans exist to remove.

**What you can do after:** every training screen either shows you the truth or
tells you it could not find out. No screen invents an empty state.

### Steps

Each of these is the same fix — use `useLoad` from Phase 0 and render the third
state — so they are listed as one table rather than eight paragraphs.

| Where | What it says today when the read fails | What it must say |
|---|---|---|
| `app/programs/page.tsx:57` (the `catch`) | falls through to "No active program" | pass `failed: true` to `TrainingScreen` and show "Your training could not be loaded" with a retry |
| `src/programs/components/ProgramsApp.tsx:201` | "Loading session…" forever | the error the hook already holds, plus retry |
| `src/programs/components/PastPrograms.tsx:44` | the archive vanishes | say the archive could not be read |
| `src/programs/components/LiftHistory.tsx:54` | the whole section and the CSV button vanish | say so, keep the retry |
| `src/health/components/WorkoutLogger.tsx:98` | "No workouts logged yet" **and then every lift is a new record** | say the history could not be read, and suppress record claims when it could not |
| `src/programs/components/TrainingCard.tsx:35` | the dashboard card disappears | the card already has this branch for one failure; use it for both |
| `src/programs/components/RunningPrograms.tsx:84` | the band vanishes | say so |
| `src/programs/components/ProgressionView.tsx:70` | Skip / Reset / End report success regardless | check `res.ok`, show the failure, do not navigate |

**Acceptance:** one browser test per row, all in a new
`tests/e2e/programs-failures.spec.ts`, each using Playwright's `page.route` to
fail exactly one request and asserting the screen says it does not know.

**A warning about the allowlist.** It is tempting to make "the
`COMPONENTS_THAT_FETCH_THEIR_OWN_DATA` allowlist shrinks" the proof of this
phase. It will not shrink for most of these. The architecture rule matches any
file containing `fetch(`, and five of the eight rows also *write* — delete a
workout, skip a session, end a program — which a read-only loader cannot absorb.
Only a component whose every `fetch(` is a read comes off the list. Do not
weaken the rule to make it shrink; the honest measure of this phase is the eight
browser tests, and the allowlist shrinks by however many it shrinks by.

**New spec files go in a project, or they race.** `tests/e2e/programs-failures.spec.ts`
must be added to the `training` project in `playwright.config.ts`. Left out, it
falls into the catch-all `chromium` project, runs in parallel against the one
shared test account, and deletes the rows another spec is mid-assertion on —
which is the exact reason the `training` project exists.

**Also in this phase:** `src/programs/components/ProgressionView.tsx:274`
"Reset to start" is destructive, unconfirmed and sits between two buttons that
both confirm. Give it a confirmation naming what is lost.

## Phase 3 — Today shows today

**What you can do after:** open Training and see today's session, or the
workout you left running, and start it in one tap.

### The layout, top to bottom

```
┌─────────────────────────────────────┐
│ ← Dashboard                          │  BackLink, unchanged
│ Training              StrongLifts ▸  │  title + program (Q2b)
│ [Today][History][Progress][More]     │  Segmented, 44px tall (Phase 8)
├─────────────────────────────────────┤
│ M  T  W  T  F  S  S                  │  week strip, THIS week only
│ ●  ·  ●  ·  ○  ·  ·                  │  done / rest / today / to come
├─────────────────────────────────────┤
│  Workout A                           │  today's session name
│  Squat · Bench Press · Barbell Row   │  the lifts, one line
│  5×5 · about 45 min                  │
│  ┌───────────────────────────────┐   │
│  │        Start workout          │   │  one primary action
│  └───────────────────────────────┘   │
│  Last time: Fri · all 15 sets        │  one line of context
└─────────────────────────────────────┘
```

**Rest day:** the session block is replaced by "Rest day — next is Workout B on
Wednesday". **Workout running:** the button becomes *Resume · 23 min*.
**No program:** one block, one sentence, one button to the catalogue — not
three empty states and two identical Browse buttons.

### Steps

1. Move the program inventory out of the Today tab into a program screen
   reached from the header (Q2b). Files:
   `src/programs/components/ProgramsApp.tsx`, `TrainingScreen.tsx`.
2. The week strip shows **this week only**. `ProgramsApp.tsx:257` passes
   `detail.logs.map(...)` — every log ever — so a weekday you trained once is
   green forever. Filter to the current week in the account's timezone using
   the Phase 0 clock.
3. Delete the second Browse button. One primary action per screen.
4. `src/programs/components/ProgressionView.tsx:319` still renders a
   delete-only session list on this tab, duplicating History with different
   behaviour. Remove it; History is the one place sessions are read.
5. A first-ever visit with no program shows the catalogue route, not the
   write-it-up-afterwards form (`TrainingScreen.tsx:96`).

**Acceptance:** `tests/e2e/programs-today.spec.ts` — with a program running and
no workout open, the first thing on the tab is today's session name and a Start
button; on a rest day it names the next session; with a workout open it says
Resume; the week strip shows no green before training in that week.

## Phase 4 — History you can use

**What you can do after:** find the session you are looking for.

### What the leaders do, and what this app got wrong

**Nobody ships a search box over workouts.** Every leader ships the same three
navigations instead, and this app has none of them:

1. **Reverse-chronological infinite scroll** — Hevy: cards "from newest to
   oldest", "There's no limit. You can scroll down to the start of your journey"
   (<https://www.hevyapp.com/features/gym-progress/>).
2. **A calendar as the random-access index** — Strong's History "includes a
   calendar… the blue circle icon shows you which dates have a workout"
   (<https://www.makeuseof.com/using-strong-app-to-track-gym-progress/>); Hevy
   lets you "zoom out… and see your gym calendar for the whole year"
   (<https://www.hevyapp.com/features/gym-consistency/>). FitNotes is
   calendar-first.
3. **Exercise-first history** — Hevy: "navigate to the History tab… to see all
   the workouts in which you've done the specific exercise"
   (<https://www.hevyapp.com/features/exercise-performance/>); the same tab
   exists in Strong (<https://help.strongapp.io/article/237-about-exercise-detail>)
   and FitNotes.

**Month grouping is the fourth** (Boostcamp: "In History, view your training by
month", <https://www.boostcamp.app/features>).

**Destructive actions live behind a three-dot menu on the workout itself, never
on the list row** (Strong, <https://help.strongapp.io/article/249-how-do-i-edit-a-past-workout>).
This app puts a bin icon on all 141 rows, one thumb-width from the row you tap
to open — which is how you delete a year of training by mis-tapping.

### The layout

```
[ Calendar ]  [ All lifts ▾ ]                sticky
─── September 2026 ──── 12 sessions · 18,400 kg ───   sticky month header
  Wed 9   Workout A · 45 min                    ›
          Squat 100×5 · Bench 80×5 · Row 60×5
  Mon 7   Workout B · 41 min                    ›
─── August 2026 ──── 14 sessions · 21,050 kg ──
  …
                    [ loading more… ]            on scroll (Q5a)
```

No bin on the row. Tapping a row opens the workout's own screen (below).

### Steps

1. Group by month with a sticky header carrying the month's session count and
   volume. `src/programs/components/HistoryTab.tsx`.
1b. **A calendar view**, toggled from the header: a month grid with a dot on
   every day trained, tapping a day opens that workout. This is the random-access
   index every leader has and this app does not; without it the only way to reach
   June is to scroll.
1c. **Take the bin off the list row.** Delete moves into the workout's own screen,
   behind its menu, as Strong does. A destructive control does not belong beside
   the control you tap 141 times.
2. Load a window, not everything (Q7a). The repo read is already paged
   (`getWorkoutLogsWithSets`); add a `from`/`to` month window to
   `/api/health/workout` and request months as they are reached.
3. Collapse runs of identical sets to `N × weight × reps`. This is display
   logic, so it belongs in a service: add
   `collapseSets(sets: WorkoutSetRow[]): CollapsedSet[]` to
   `src/health/healthService.ts` with its own unit test.
4. Mark warm-ups, misses (reps below the prescription) and personal bests.
   Reuse `detectPersonalRecords` rather than recomputing.
5. Show what the session did to the program, and — after Phase 1 step 1 — what
   deleting it will undo.
6. A lift filter across the whole history.
7. Dates carry the year once the month header is not enough (a row from last
   September must not read the same as this September).

**Acceptance:** `tests/e2e/programs-history.spec.ts` against the seeded year —
the first screen holds at most one month; scrolling loads the next; filtering to
Squat leaves only sessions containing a squat; a workout with five identical
sets renders one line, not five; the page's own height is under 4,000px on
first paint (it is 17,291 today).

## Phase 4b — One workout, one screen

**What you can do after:** open a workout from anywhere — history, the calendar,
or the moment you finish it — and read the same page.

**Why this is a phase and not a detail.** The leaders build ONE screen and show
it twice: Hevy's history card opens "a summary screen similar to the one you see
when you save a session"
(<https://www.hevyapp.com/features/best-way-to-track-workouts/>). This app has no
such screen at all — a past workout is an accordion inside a list, and the
finish summary is a separate component that shows different things. That is why
the expanded row reads like a spreadsheet: it was never designed as a page.

### The layout

```
← History
Wed 9 September · Workout A                    ⋯     ⋯ = correct, delete, log again
45 min · 14 sets · 1,650 kg

Squat            warm-up   20 kg × 5
                 4 × 100 kg × 5
                 1 × 100 kg × 3        miss
Bench Press      5 × 80 kg × 5         🥇 best set
Barbell Row      skipped — rack taken

This session moved Squat to 102.5 kg
```

Set records are anchored to the set row, as Hevy anchors its medal "for the set
the PR was achieved"
(<https://help.hevyapp.com/hc/en-us/articles/35649367857175-Personal-Records-PRs-and-Set-Records-Explained-How-They-Work-in-the-Hevy-App>).

### Steps

1. New route `app/programs/workout/[id]/page.tsx`, server-rendered from
   `getWorkoutSets(userId, id)` — the ownership-checked read that already exists
   (`src/db/healthRepo.ts`).
2. The finish summary (`src/programs/components/live/FinishSheet.tsx`) and this
   screen render the **same component**. One screen, shown twice — if they are
   two components they will drift, which is how the finish sheet and the history
   row already disagree about what a workout is worth.
3. Identical sets collapse to `N × weight × reps` via `collapseSets` (Phase 4
   step 3). Warm-ups, misses and records are marked on the set row.
4. Correct / delete / log-again live in the header menu, not on the page body.
5. Delete here calls the recalculating delete from Phase 1 step 1 and says what
   it will undo before it does it.

**Acceptance:** `tests/e2e/programs-workout-page.spec.ts` — the URL opens
directly; the same component renders after finishing a workout and from History;
five identical sets render as one line; deleting from here moves the program's
weights back.

## Phase 5 — Progress that says something

**What you can do after:** answer "am I turning up", "is it going up", "what
are my bests" in one screen, with numbers you can read.

### Steps

1. **Turning up:** keep the week strip; add "12 of 13 planned sessions in the
   last month" — a number, not dots alone.
2. **Going up:** one chart, weekly working-set volume. Be accurate about what is
   wrong with it: the bars **are** scaled — `ProgressTab.tsx:146` is
   `(v.volumeKg / peak) * 72` — and they look identical on the seeded year only
   because that year's weekly volume genuinely is. What is missing is everything
   that would let you read them: **no value axis, no unit, and labels that are
   `weekStart.slice(8)`** — a day-of-month with no month, which is where
   "20 27 03 10 17 24 31 07" comes from. Add an axis with two or three numeric
   ticks, the unit, and month boundaries (Q4a).
   Give it the **range control every leader has** — 3 months / 1 year / all —
   because a chart with no range is a chart that gets less readable every week
   you train (<https://www.hevyapp.com/features/exercise-performance/>).
2b. **Bests become a table with two modes, not a chart.** FitNotes and Hevy both
   split this: **Estimated** — the highest estimated 1RM across all sets — and
   **Actual** — the most weight actually lifted at each rep count, which is the
   number a lifter checks before a session
   (<http://www.fitnotesapp.com/progress_tracking/>,
   <https://www.hevyapp.com/features/exercise-performance/>). This app shows one
   estimated number per lift and calls it "your bests".
3. **Bests:** keep the list; it is the most useful thing on the screen and is
   currently last.
4. **Unit:** `src/programs/components/LiftHistory.tsx:105` prints `kg`
   unconditionally, directly beneath a panel printing `lb`. It takes the unit
   from Phase 0.
5. Delete the four panels the previous plan promised and never built rather
   than leaving them as an implied debt: no muscle-group breakdown, no
   estimated-max line, no calendar, no progression summary. If you want them,
   they are a later phase — YAGNI applies, and the plan should not carry
   unbuilt promises.

**Acceptance:** `tests/e2e/programs-progress.spec.ts` — with the account in lb
every number on the tab reads lb; the chart has an axis label and at least one
numeric tick; the tallest bar is at least twice the shortest when the underlying
data differs by that much.

## Phase 6 — The live screen keeps its promises

**What you can do after:** run a real session — swap a lift when the rack is
taken, see last time, and have supersets behave like supersets.

### Steps

0. **The set row becomes the five-column grid every leader ships**, in this
   order: `SET | PREVIOUS | KG | REPS | ✓`. Hevy names the columns exactly that
   and says PREVIOUS "only appears while logging a live workout"
   (<https://www.hevyapp.com/features/track-exercises/>). This app's row today is
   `number | weight | kg × | reps | ✓` — the PREVIOUS column does not exist.
1. **Last time beside this time — mostly built, finish it.** Be accurate about
   what is already there: `src/programs/components/live/SetRow.tsx:25` takes a
   `previous` prop and `:149-155` already renders it and already copies the
   values in when tapped. Two things are missing. First, it renders only for a
   lift the *program* has seen before — a loose workout ("Start a workout now")
   has no previous at all, because the endpoint that would answer across
   programs, `app/api/workouts/lifts/route.ts`, has no caller and returns raw
   kilograms. Wire it up and convert its output. Second, it is drawn under the
   row rather than as the PREVIOUS *column* the grid above calls for, which is
   what Hevy and Boostcamp both ship
   (<https://www.hevyapp.com/features/track-exercises/>,
   <https://www.boostcamp.app/blogs/tips-and-tricks-to-using-boostcamp-app>).
   The column stays blank the first time a lift is done; blank is the honest
   answer and must not be a zero.
1b. **The set number becomes a control.** Tapping it tags the set Warm-up,
   Normal, Drop or Failure — Hevy, Strong and Boostcamp all do this
   (<https://www.hevyapp.com/features/track-workouts/>). The `set_kind` column
   already exists and already carries these values; nothing on this screen can
   set them, which is why warm-ups can only come from a program.
1c. **Swipe left on a set to delete it**, as Hevy and Strong do
   (<https://www.hevyapp.com/features/track-workouts/>), rather than adding a
   fifth control to a row that is already five columns wide.
2. **The lift menu.** The "…" button is at
   `src/programs/components/live/LiveWorkoutScreen.tsx:303`; the menu it opens is
   at `:307`. Be accurate about what is already there — it holds exactly one
   action, "Skip this one" / "I did do this one", plus a read-only line reading
   "Rest 3 min (our suggestion)". Add: swap this lift, reorder, add a warm-up
   set, **make that rest line editable** (the previous plan promised rest
   "editable from the live screen in two taps" and shipped a label), and open
   the lift's history sheet.
3. **Supersets drawn as pairs**, with one rest after the pair, not after the
   first half. Two catalogue programs already declare pairs.
4. **Per-set effort (RPE)** — the column exists in the database and nothing
   writes it from this screen.
5. **The finish sheet asks what to do with changes**, as Strong does, when the
   session differed from the program.
6. **Name the program properly.** `app/programs/live/page.tsx:46` calls a week
   you built and named "Winter block" *"Your own program"*.
7. **A lost Finish reply must not brick Start.**
   `src/programs/hooks/useLiveWorkout.ts:359` leaves a start key in
   `localStorage` when the reply is lost, and every later start is refused with
   a raw database error. On a failed finish, re-read the live workout: if the
   server closed it, clear the key and show the summary.

**Acceptance:** extend `tests/e2e/programs-live-workout.spec.ts` — swapping a
lift mid-session keeps the sets already ticked; a superset pair starts one rest
after the second lift; killing the finish response and reloading offers Finish
again rather than an error; the header shows the week's own name.

## Phase 7 — Settings that exist

**What you can do after:** tell the app you train in pounds, what your bar
weighs, and what your smallest plate is — and have every screen believe you.

**Gated on Q3.**

### Steps

1. Migration: nothing to add if Q3(a) — `profiles.weight_unit`,
   `bar_weight_kg` and `smallest_plate_kg` already exist and are granted. Verify
   with `supabase migration list --linked` before writing one.
2. A section in `src/settings/components/SettingsPage.tsx`: unit as a
   `Segmented`, bar weight and smallest plate as `Field`s from the kit.
3. `plateSetupFor` (`src/db/programRepo.ts:102`) currently ignores the account
   and hardcodes `DEFAULT_PLATES[unit].smallestPlate`. Make it read both.
4. `src/programs/components/TodaySessionWidget.tsx:496` calls `platesFor` with
   no setup at all, so the "Bar:" line under every lift assumes a 20 kg bar.
5. The deload message that says "use a lighter bar" becomes true, because there
   is now somewhere to say you have one.

**Acceptance:** `tests/e2e/settings-training.spec.ts` — set the unit to lb with
no program running and assert History reads lb; set the smallest plate to 2.5
and assert a prescription lands on a multiple of 2.5.

## Phase 8 — Hands and eyes

**What you can do after:** hit what you aim at, and see the rest timer.

### Steps

1. **The four tabs are 28px.** `src/programs/components/ui.tsx:109`
   `Segmented` uses `py-1.5` with `text-[11px]` and no minimum height, while
   `IconButton` in the same file is 44px on touch and its own comment says an
   18px control is "a coin-flip on a touchscreen". Add `min-h-11` on touch.
2. ~~The navigation button covers the rest timer.~~ **Nothing to do.** It is
   Next.js's development indicator, absent from the production build. Checked by
   listing the DOM and by loading the production build on :3200. The lesson is
   the one this plan keeps repeating: a screenshot from a dev server is not
   evidence about what users see.
3. **64px of dead space.** `src/programs/components/TrainingScreen.tsx:101`
   applies `pb-tab-bar` on a route that never mounts the bar. Remove it.
4. **Width.** The same line is `max-w-4xl` where the dashboard it is reached
   from is narrower; match the sibling.
5. **One accent colour with one meaning.** The training screens use three with
   no system: orange for primary buttons, green for a completed day, sky-blue
   for the active tab. Pick one accent for "the thing to press", keep green for
   "done" only, and stop the tab using a third. The kit already defines the
   palette in `src/programs/components/ui.tsx`; this is a matter of using it
   consistently rather than adding to it.
6. **Delete the captions that are doing a layout's job.** There are twenty
   across the three training screens — "Days still to come are outlined, not
   empty", "Working sets only. Warm-ups are not the work.", "An empty session
   you fill in as you go." Each is a sentence explaining a design decision to
   the user. Where the layout is clear the caption goes; where the caption is
   load-bearing, the layout is wrong and Phases 3–5 fix it. Target: at most
   three left, and each one earning its place.
7. **Give the page a hierarchy.** Every block on Today and Progress is a `Card`
   of identical weight, so the session you came to start looks exactly like the
   note explaining the week strip. The thing you came for is the biggest thing
   on the screen; context is smaller; explanation is smallest or absent.
8. Re-measure every training route in `tests/e2e/sweep/route-sweep.spec.ts` and
   lower each `TAP_TARGET_DEBT` number to what is actually left. The numbers
   may only go down.

**Acceptance:** the route sweep passes on `sweep-phone` with the training
routes' debt at 0, run twice to prove it is stable.

## Phase 9 — Remove what lies

**What you can do after:** trust the repo's own documentation and its tests.

### Steps

1. **Two tests that cannot fail.** `tests/unit/programs/builder.test.ts:724`
   is named "the weight actually lifted is what progresses" and never checks the
   weight. `tests/unit/programs/engine.test.ts:1176` asserts a value equals
   itself under a comment reading "THIS EQUALITY IS THE WHOLE FEATURE". Fix both
   and prove each fails when the behaviour is reverted.
   `tests/unit/health/workoutPaging.test.ts:128` would pass with the ordering
   code deleted; make its fake return rows in the wrong order.
2. **CI actually runs what the plan claims.** `.github/workflows/e2e.yml:28`
   runs `--project=training` only. `training-iphone-safari`, `training-android`
   and `training-firefox` run in neither job. Add them, and move
   `mobile/mobile-training.spec.ts` out of the `mobile-iphone` project
   (`playwright.config.ts:426`) — that project runs in the cross-browser job
   while `training` runs in the chromium job, the two jobs have no `needs:`
   between them, and both wipe the same shared account. **Blocked on B1 for
   verification.**
3. **Dead code — check the plan before deleting.** `isLoadable` has no caller;
   delete it. **`getLastWorkoutSets` (`src/db/healthRepo.ts:349`) and
   `app/api/workouts/lifts/route.ts` are the read Phase 6 step 1 wires up.** If
   Phase 6 has run, they have callers and stay. If you are running Phase 9 first,
   leave both and come back. Deleting them is how a later phase discovers its
   foundation is gone.
4. **Stale documentation.** `training-overhaul.md`'s status table says phases
   2–8 are not started; six of them shipped. `.claude/rules/testing.md:20` still
   calls the mobile suite a skeleton. `tests/unit/architecture.test.ts:609`
   points authors at a shared loader that did not exist — Phase 0 step 5 creates
   it, so the comment becomes true. Five files cite
   `docs/plans/silent-failures.md`, which another agent has staged for deletion
   (B2); repoint them at this plan or inline what they need.
5. **The dashboard training card** was promised adherence dots and the last PR
   (`TrainingCard.tsx`); either build them or delete the promise from the plan.
   YAGNI says delete unless you want them — Q4's sibling.

**Acceptance:** `npm test` green; the reverted-behaviour proof recorded for each
of the three repaired tests; `grep` proving each deleted symbol has no caller.

---

## What is deliberately not in this plan

- The vice module's touch targets (recorded in `route-sweep.spec.ts`, not
  training).
- Native push and lock-screen timers (B3).
- Anything under `docs/pipeline` or the Lair, both being changed by another
  agent (B2).
