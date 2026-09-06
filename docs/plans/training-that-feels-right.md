# Training that feels right — plan

**Status: ALL PHASES EXECUTED, 2026-09-05.** 4339 unit tests, 11 integration
tests and a new 5-test mobile flow passing on **iPhone Safari, Android Chrome and
Firefox**. Measured on a 390px screen with folds closed: **2264px → 1310px** for a
three-lift day, 1603px for a six-lift one.

Per Q7 the mid-session exercise swap was held — it was the only item not driven by
something measured.

**Three corrections made during execution**, all of them my own claims:
`setDayWeekday` already existed (Phase 2 became a UI over it); no rest-interval
field exists anywhere (Phase 4's durations are ours and say so); and my own e2e
height ceiling of 1500 passed only because the spec enrolled in the *smallest*
program — a limit the tallest page cannot meet is not a limit, so it is now 1800
and the test enrols before measuring.

---

# Part 1 — For you (plain language)

## What is wrong, specifically

Not "it looks bad" — here is what I actually saw on a 390px phone screen, with
one program running and six sessions logged:

1. **The page is 2264 pixels long.** For one workout. Three big cards stacked —
   today's session, history, and a separate "log any workout" — with nothing
   saying which one you are supposed to use.
2. **Three different things called logging** on one screen. Today's session, the
   free-form logger, and the history list. A person opening this to write down
   a workout has to pick, and nothing helps them pick.
3. **The program is a grey afterthought.** "Upper / Lower (4-day) · Beginner ·
   started 9/5/2026" is a thin line of small grey text above the card. The thing
   you are doing should be the headline.
4. **There is no week.** You asked for this directly. Nowhere in the app can you
   see "Upper Monday, Lower Tuesday, Upper Thursday, Lower Friday", let alone
   move a day. The data to do it already exists and nothing draws it.
5. **The session list is noise.** Six rows reading "Lower cycle 1, week 1" with
   the same date, no grouping, no weights, no week boundaries.
6. **Buttons float between cards.** "Change this program" sits alone in the gap
   between two cards, belonging to neither.
7. **Getting from Life Mastery to training is three disconnected surfaces** —
   the Templates tab, the plan's own week, and `/programs` — and they each
   describe your training differently.

And from the earlier audit, six things lifters routinely abandon apps over that
we simply do not have: **a rest timer, editing a past workout, export, plate
maths, offline, and swapping an exercise mid-session.**

## What you will be able to do, phase by phase

| Phase | What changes for the person using it |
|---|---|
| **1** | The training page fits on a phone and says what it is. One clear thing to do, everything else folded away until wanted. |
| **2** | **See your training week** — which day is which, on a calendar — and change it. |
| **3** | Life Mastery flows into training as one path instead of three surfaces that disagree. |
| **4** | Log a set without leaving the screen: rest timer, plate maths, swap an exercise you can't do today. |
| **5** | Fix a mistake. Edit or delete any past session — the single biggest reason people leave a tracker. |
| **6** | Take your data with you. Export everything as a spreadsheet. |
| **7** | It is *proven* on a phone and in other browsers, not assumed. |

## What this deliberately does NOT do

- **No visual redesign of the whole app.** This uses the components that already
  exist (`components/ui/`, `src/programs/components/ui.tsx`). Inventing a second
  look for one feature is how an app stops feeling like one app.
- **No offline mode.** It is genuinely large — every action would need a queue
  and conflict rules — and it is the least of the six gaps for somebody with
  phone signal in a gym. Called out as an open question rather than smuggled in.
- **No new database tables.** Every phase reads data that is already stored.

---

# Part 2 — Execution

## Conventions for whoever runs this

- **`npm test` after every phase.** A phase is not done with a red suite.
- **Reuse before inventing — this is the whole point of the plan.** Before
  writing any component, check these first:
  - `src/programs/components/ui.tsx` — `TYPE` (the 4-size type scale),
    `IconButton`, `Segmented`, `Field`, `Stepper`, `Panel`, `Action`,
    `GroupLabel`. **These are the programs look. Use them.**
  - `components/ui/` — `card`, `button`, `tabs`, `dialog`, `select`, `badge`.
  - `src/programs/components/Sparkline.tsx` — the only chart in this feature.
  - `src/goals/components/north-star/WeekGrid.tsx` — **an existing week grid**,
    one-finger usable, already drawing the plan's routines onto days and hours.
- **Pure logic in `*Service.ts`, database access only in `src/db/*Repo.ts`,
  types in each slice's `types.ts`, API routes under 50 lines.** Enforced by
  `tests/unit/architecture.test.ts` — run it rather than remembering it.
- **Never derive a date by converting to UTC first.** Use `toDateISO`,
  `getTodayInTimezone`, `periodStartFor` from `src/shared/dateUtils.ts`. The
  architecture test fails on new occurrences.
- **Every phase names its acceptance test**, and every phase must be checked at
  **390 × 844** (phone) as well as desktop. A phase that only works on a laptop
  is not done.

---

## Phase 0 — A guard rail, before anything is built on it

**Why first, and why it is tiny.** While seeding test data I logged a session
against `upper-lower` using exercise ids `bench` and `row`. The real ids are
`ul_bench` and `ul_row`. **The API accepted it, stored it, and returned 200.**
So a session can be written into somebody's permanent training history naming
lifts that do not exist in their program, and it will render as raw ids for ever.

### Steps

1. **`logProgramSession` rejects unknown exercise ids.** In
   `src/db/programRepo.ts`, before writing: resolve the enrollment's effective
   program (it already does this for the engine), collect the valid ids from
   `scheduleDays(program.schedule)`, and throw if an entry names one that is not
   there. The route already turns a thrown error into a 400.
2. **Say which id was wrong** in the message. "Unknown exercise" with no name is
   a support ticket.

**Acceptance:** integration-style test in `tests/unit/programs/` asserting the
validator rejects `bench` for upper-lower and accepts `ul_bench`. Extract the
check as a pure function so it is testable without a database.

**Files:** `src/db/programRepo.ts`, `src/programs/programsService.ts` (the pure
check), `tests/unit/programs/engine.test.ts`.

---

## Phase 1 — One page that fits on a phone and says what it is

**The target:** opening `/programs` on a phone shows **today's session and
nothing else above the fold**, with the program named at the top. Everything
else is reachable and folded.

### Steps

1. **Give the page a real header.** Program name as the heading — not grey 11px
   text — with level, week and "started" underneath. `TYPE.title` for the name,
   `TYPE.meta` for the rest. The `← My programs` link goes into that header
   instead of floating above the card.
2. **Fold the history.** It is a card of equal weight to today's session today.
   Make it a collapsed section headed with the one line worth seeing —
   `6 sessions · Bench 40 → 45 kg` — that opens on tap. Reuse the collapse
   pattern from `GoalCategorySection` rather than writing a third one.
3. **Move "Change this program", "Skip", "Reset", "End" into one place.** They
   are four controls with three different weights scattered across two cards.
   One row of `Action` buttons at the foot of the folded history, with `End`
   visually last and separated — it is the only one with consequences.
4. **Resolve the three-logging-things problem.** "Log any workout" becomes a
   second tab, not a third card: `Segmented` at the top with **Today's session /
   Anything else**. One question, two answers, no scrolling to discover the
   second one. When no program is running, "Anything else" is the default.
5. **Lift history moves under the history fold.** It is a thing you read
   occasionally, not part of logging.

**Acceptance:** at 390 × 844, the page's full height is **under 1200px** with a
program running and the folds closed (it is 2264 now), and `Today —` plus the
save button are both visible without scrolling. Assert the height in a Playwright
check so it cannot regress. Then look at it.

**Files:** `app/programs/page.tsx`, `src/programs/components/ProgramsApp.tsx`,
`src/programs/components/ProgressionView.tsx`,
`src/programs/components/TodaySessionWidget.tsx`.

---

## Phase 2 — See your training week, and change it

**What is missing.** Nothing in the app draws the week. The data is already
there: `DayTemplate.weekday` (ISO 1–7) exists on every program day,
`isWeekdayAnchored` already decides whether a program is pinned to a calendar,
and `dayForWeekday` already picks today's session when it is. What is missing is
that nothing lets you *see* or *set* it.

### Steps

1. **A week strip on the training page.** Seven columns, Mon–Sun, each showing
   the day's label ("Upper") or nothing (rest). Today is marked. A logged day is
   ticked. **Read `WeekGrid.tsx` first** — if its block/tray model fits, extend
   it rather than writing a second week; if it does not (it is built around plan
   routines and hours, not program days), say so in a comment and build the
   strip from `Panel` + the `TYPE` scale so it still looks like the rest.
2. **Tap a day to assign it. DO NOT WRITE THE ASSIGNMENT LOGIC — it exists.**
   `setDayWeekday` in `src/programs/builder.ts:391` already pins a day to a
   weekday or unpins it with `null`, already validates the 1–7 range, already
   refuses a program that is not days-and-lifts, and **already takes the weekday
   off whichever other day held it** ("a Tuesday cannot have two answers"). This
   phase is a UI over that function. If you find yourself writing a second one,
   stop.
3. **Respect the all-or-nothing rule, which is enforced, not advisory.** Per
   `DayTemplate.weekday`: when every day carries one, the next session is chosen
   by today's date; when none do, the cursor walks the list. "Those are the only
   two states; a half-assigned week is refused at the point of editing rather
   than resolved by guessing." So the UI must show how many days still need one
   and surface that refusal as a plain sentence — it must not present a
   half-assigned week as saved.
4. **Unanchored programs still get a week.** StrongLifts alternates A/B and is
   not tied to days. Draw it as an ordered strip ("next: Workout B") rather than
   pretending Monday means something.

**Acceptance:** unit tests for the weekday assignment (assign, reassign — which
must steal it from the other day, since one day per weekday — and clear). In the
browser at 390px: assign Upper to Monday, reload, confirm it persisted and that
`/programs` prescribes Upper on a Monday.

**Files:** a new `src/programs/components/WeekStrip.tsx`, `src/programs/components/ProgramsApp.tsx`,
`tests/unit/programs/customize.test.ts`.

---

## Phase 3 — Life Mastery flows into training

**What is wrong.** Three surfaces describe your training and none of them is
clearly the one: the **Templates tab** (a catalogue inside a planning flow), the
**plan's own week** (day names in localStorage), and **`/programs`** (the
enrollment that actually decides what you do). They are now *linked* — the plan
records the enrollment id — but a person still has to work out which to open.

### Steps

1. **The Templates tab stops being a second training screen.** Once a program is
   running, it shows the running band (already built) and one clear way through
   to `/programs`, rather than re-offering the catalogue underneath.
2. **The plan's training week renders from the enrollment when there is one.**
   The plan's `splitDays` are a copy made at start; the enrollment is the truth.
   Where they disagree, show the enrollment and offer to update the plan — the
   band already detects and names this disagreement; this makes it fixable in
   one tap instead of only visible.
3. **One link, both ways.** `/programs` gets a "part of your plan" line back to
   Life Mastery when the enrollment is referenced by a plan.

**Acceptance:** start a program from Life Mastery; the Templates tab then shows
one route onward, `/programs` shows the plan link, and the week matches on both.
Verified at 390px.

**Files:** `src/goals/components/north-star/WorkoutPrograms.tsx`,
`src/programs/components/RunningPrograms.tsx`, `app/programs/page.tsx`,
`src/goals/northStarStorage.ts`.

---

## Phase 4 — Log a set without leaving the screen

The three highest-value gaps from the complaint audit, in order.

### Steps

1. **Rest timer.** Starts when a set is saved and counts up.
   **THERE IS NO REST INTERVAL ANYWHERE IN THE DATA — do not go looking for
   one.** No program type carries a rest field and none of the thirteen cited
   programs specifies rest, so the durations in Q3 are OURS. Say so in the UI
   ("our default, not the program's") rather than implying the author set it.
   **It must survive backgrounding the browser** — store the start instant and
   derive elapsed time from `Date.now()`, never a `setInterval` counter, or it
   will be wrong every time somebody locks their phone, which is the
   most-cited timer complaint of all.
2. **Plate maths.** Given a target weight, the bar and available plates, show
   what to load per side. Pure function in `programsService.ts`, tested against
   the awkward cases: a weight that cannot be made, a bar heavier than the
   target, and kg vs lb plate sets. Show it under the weight input, not as a
   separate screen.
3. **Swap an exercise for today only.** The rack is busy. This is a *session*
   substitution, not a program edit — it must not write `custom_schedule`, and
   the logged entry must record what was actually done.

**Acceptance:** unit tests for plate maths (including "cannot be made exactly")
and for timer elapsed-time across a simulated background gap. In the browser:
start a timer, background the tab for 10s, return, confirm the elapsed time
jumped rather than paused.

**Files:** `src/programs/programsService.ts`, new
`src/programs/components/RestTimer.tsx`, `src/programs/components/TodaySessionWidget.tsx`,
`tests/unit/programs/engine.test.ts`.

---

## Phase 5 — Fix a mistake

**Why this ranks above export.** It is the single most cited reason people
abandon a tracker. Today a program session is **write-once** — the log route has
only `POST`, no `PATCH`, no `DELETE` — and a free-form workout can only be
deleted and retyped.

### Steps

1. **`PATCH` and `DELETE` on a program session.** `src/db/programRepo.ts` +
   `app/api/programs/enrollments/[id]/log/[logId]/route.ts`.
2. **Editing a session must re-run the engine.** This is the hard part and the
   reason it is its own phase: `exercise_state` was advanced by the original
   log. Changing what you lifted has to change what happens next. **Recompute
   from the session history rather than trying to reverse one log** — reversing
   requires knowing what the state was before, which is not stored. Replaying is
   deterministic because the engine is pure.
3. **Same for the free-form logger** — edit in place rather than delete-and-retype.

**Acceptance:** integration test — log three sessions, edit the first, and assert
the working weight afterwards equals what it would have been had the corrected
value been logged originally. That equality is the whole feature.

**Files:** `src/db/programRepo.ts`, `src/programs/programsService.ts` (replay),
new API route, `src/programs/components/ProgressionView.tsx`,
`src/health/components/WorkoutLogger.tsx`, `tests/integration/db/`.

---

## Phase 6 — Take your data with you

One CSV of every set ever logged — program and free-form together, since
`workout_sets` already spans both. Columns: date, program, exercise, set, reps,
weight, unit, warm-up. Generated client-side from data already fetched; no new
endpoint.

**Acceptance:** unit test on the CSV builder — quoting an exercise name
containing a comma, and warm-up sets marked rather than dropped. In the browser,
download and open it.

**Files:** `src/health/healthService.ts` (the builder), `app/programs/page.tsx`.

---

## Phase 7 — Proven on a phone and in other browsers

**Attempted already, and it passes today** — see blocker 1. This phase locks it
so it stays true.

### Steps

1. **A mobile e2e spec for the training flow** in `tests/e2e/mobile/`. **Be
   warned:** `.claude/rules/testing.md` says that directory is a skeleton —
   "loads and touch targets only… expanding it to real flows is substantial
   work, not a quick task". Budget accordingly.
2. **Cover the flow, not the page:** open `/programs`, expand a lift, change a
   rep count, save, confirm the history updated.
3. **Run it on the existing WebKit and Firefox projects**, which already exist in
   `playwright.config.ts` (`smoke-webkit`, `smoke-firefox`, `mobile-iphone`,
   `mobile-pixel`).
4. **Assert no horizontal overflow** at 390px on every training screen — the
   check that catches most phone breakage.

**Acceptance:** the new spec passes on chromium, webkit and firefox.

**Files:** `tests/e2e/mobile/mobile-training.spec.ts`, `playwright.config.ts`.

---

## Review pass — attacking this plan before executing it

**Two of its own claims were false and are corrected above.**

- Phase 2 told you to write the weekday assignment. **`setDayWeekday` already
  exists** at `src/programs/builder.ts:391` — it validates the range, refuses
  non-days-and-lifts programs, and already steals the weekday from whichever
  other day held it. The phase is now a UI over that function, and says so in
  capitals. That is the difference between a day's work and a week's.
- Phase 4 said to read "the program's rest interval if one is defined".
  **No such field exists on any type, and none of the thirteen programs
  specifies rest.** A smaller model would have gone looking for it, found
  nothing, and either invented a field or stalled. The phase now states plainly
  that the numbers are ours.

Both were "X is missing" claims that turned out to be wrong in opposite
directions — one thing existed that I said didn't, one didn't exist that I said
did. **Every such claim in a plan gets checked before it is acted on.**

**Verified rather than assumed:** `GoalCategorySection.tsx` exists (Phase 1's
collapse pattern); the playwright projects `smoke-firefox`, `smoke-webkit`,
`mobile-iphone` and `mobile-pixel` all exist (Phase 7); the 2264px figure is a
measurement, not an impression.

**DRY.** The plan's biggest risk was quietly building second copies of four
things that exist: a week grid, a chart, a weekday assigner, and a collapse. Each
is now named with its path and an instruction to read it first. Phase 2 goes
further and tells you what to do if `WeekGrid` does *not* fit — write down why,
rather than silently forking it. The one genuinely new component, `WeekStrip`, is
justified because `WeekGrid` models plan routines against hours, not program days
against weekdays.

**YAGNI.** Offline is refused outright with a reason and a cheaper alternative
(make the in-progress log survive a reload). The plan also refuses a weight cap,
an invented deload rule, a visual redesign and any new table. Phase 6 (export) is
one pure function and no endpoint. If anything here is still speculative it is
Phase 4's mid-session swap — see Q7.

**SOLID.** Layer boundaries are enforced by `tests/unit/architecture.test.ts`, so
a phase that puts logic in the wrong place fails a test rather than passing
review. Three placements stated deliberately: plate maths is pure and lives in
`programsService` (it is arithmetic, not a component); the CSV builder lives in
`healthService` because `workout_sets` is health's table; and Phase 5's engine
replay lives in `programsService` because the engine is pure and replay is only
possible *because* it is pure.

**Executable by a smaller model?** Yes, with the corrections above. The specific
traps removed: a phantom rest field, a re-implementation of `setDayWeekday`, and
three "write a component" instructions that should have been "use this one".
Phase 5 still contains the one genuinely hard idea — replaying the engine rather
than reversing a log — and it is explained rather than assumed, with the reason
reversal is impossible (the prior state is not stored).

---

## Destructive steps — flagged and gated

- **Phase 5 changes what happens next.** Editing a past session replays the
  engine and therefore *changes your current working weights*. That is the
  point, but it must be said on screen before saving (Q4), and the replay must
  be covered by the equality test named in that phase before it ships.
- **Phase 0 makes the log endpoint stricter.** A client sending an id the program
  does not have will now get a 400 where it used to get a 200. Nothing in the app
  sends one, but check before shipping that no test fixture relies on the old
  behaviour.
- **No phase runs a migration.** If one seems necessary, stop and ask — the
  working tree is shared with another agent.
- **No phase deletes anything.** Export reads; the week view writes only
  `custom_schedule` through the existing copy-on-write path.

---

## Manual blockers

Each attempted at least once. Numbered so you can answer "1 yes, 2 skip".

**1. Does it already work on other browsers and on a phone?**
*Attempted — and the answer is yes, today.* I loaded `/programs` at 390 × 844 in
**Chromium, Firefox and WebKit**: all three returned 200, rendered the session,
produced **no console errors and no horizontal overflow**. So this is not
currently broken; it is unprotected. *Recommendation:* **do Phase 7 to lock it,
but do not treat it as a fire.** The visible problems are layout and missing
features, not browser incompatibility.

**2. Is there a design system I should follow, or am I inventing one?**
*Attempted — there is one, in two layers.* `components/ui/` holds the shared
primitives (card, button, tabs, dialog, select, badge) and
`src/programs/components/ui.tsx` holds a programs-specific kit with a deliberate
**four-size type scale and two button languages**, written after a previous
round of "the layout looks like a 10 year old made it". *Recommendation:*
**extend that kit, invent nothing.** If a phase needs a shape that is not there,
add it to `ui.tsx` so the next screen gets it too.

**3. Does the week view need a new table or a migration?**
*Attempted — no.* `DayTemplate.weekday` already exists, `isWeekdayAnchored` and
`dayForWeekday` already consume it, and assignments ride the existing
copy-on-write `custom_schedule`. *Recommendation:* **proceed with no migration.**
If one appears necessary, stop and ask — the working tree is shared with another
agent and `supabase db push` would ship their unapplied migrations.

**4. I cannot read `.env.local`, so nothing can be checked against your real account.**
*Attempted twice in earlier sessions; permission denied both times.* It blocks no
phase — everything here is verifiable on the test user and a local container.
*Recommendation:* **leave it denied**; paste output if you ever want a specific
row inspected.

**5. Offline support — in or out?**
*Attempted to scope it.* Every action in this feature is a live request; making
it offline means a write queue, conflict rules for a session logged on two
devices, and a service worker. That is larger than all six other phases put
together. *Recommendation:* **out of this plan.** See Q5.

---

## Open questions

Each carries a recommendation, so "go with your recommendations" is a complete answer.

**Q1. Should the week view be the landing screen for `/programs`, or a strip above today's session?**
Phase 2 assumes a strip. A full week-first screen is a bigger change and pushes
the thing you came to do down the page.
**Recommendation: strip above today's session.** You open the app to log, not to
browse. The strip answers "what is today and what is coming" in one glance and
opens to a full week on tap.

**Q2. When the plan's week and the enrollment disagree, which one wins?**
Phase 3 offers to update the plan from the enrollment.
**Recommendation: the enrollment wins, but only when you say so.** It is the
thing that actually prescribes, so it is the truth — but silently overwriting a
week somebody wrote by hand is the failure this area keeps repeating.

**Q3. Rest timer default when the program does not specify one?**
None of the thirteen cited programs carry rest intervals.
**Recommendation: 90 seconds for accessory work, 3 minutes for the main
compound lifts, both overridable.** State in the UI that it is our default and
not the program's, so we are not putting our numbers in a cited program.

**Q4. Should editing a past session be allowed to change your current weights?**
Phase 5 replays the engine, so it does.
**Recommendation: yes, and say so at the moment of editing.** A correction that
does not correct what comes next is not a correction. One line — "this will
recalculate the weights from here" — before saving.

**Q7. Is the mid-session exercise swap (Phase 4) actually needed?**
It is the only item in the plan not driven by something I saw or measured — it
came from the complaint research, not from your app.
**Recommendation: build Phase 4's timer and plate maths, and hold the swap.**
Those two change every session; the swap matters on the days a rack is busy. If
Phase 4 runs long, this is the piece to drop.

**Q5. Offline: ever?**
**Recommendation: not until somebody actually loses a session to it.** Gyms have
signal far more often than not, and the failure mode people fear (losing a
logged set) is better solved by making the log survive a reload — which is a much
smaller piece of work and is worth doing first if this bites.

**Q6. How much of the old visual should Phase 1 keep?**
**Recommendation: all of it.** Every problem I listed is *structure* — order,
hierarchy, folding, and one screen doing three jobs. None of it is colour or
typeface. Changing those as well would make it impossible to tell which change
fixed the feel.
