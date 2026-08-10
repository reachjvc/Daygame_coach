# Life Mastery, North Star flow — `/test/life-mastery`

**Status:** shipped (sandbox). localStorage only (`north-star-v1`), no LLM, no API,
no database. Replaced the 12-area flow, which moved to `/test/life-mastery-v1`.

## Shape

Four tabs, switchable at any time. Order is the order the work wants to happen
in; nothing is gated.

1. **North star.** One question — "Imagine an ideal future. Who are you? What do
   you do?" — with a hint naming health, wealth, relationships and meaning, and
   explicit permission to be unrealistic. Horizon picker (5 · 10 · 20). The
   7-rung ladder from v1 survives as a collapsed escape hatch that assembles a
   draft; replacing an already-written star asks first. Under the paragraph:
   **why is this important to you** in its own card, then a card holding **who do
   you need to become**, **what values would you need to embody**, **who are you
   committed to being** (identity, I-am lines) and **your affirmations**.
2. **Where you are.** The twelve areas, each rated against your own 10 with that
   10 written first. Plus a daily 0-10 strip that rolls into a 14-day average the
   fortnight number can disagree with.
3. **Areas, routines & goals.** One surface, stacked: the wheel, then the plan,
   then the routines. Nothing selected shows every goal in priority order; click
   a sector and that area takes its place, which is where goals get written.
   **The routines sit under both and are never hidden** — only the two views of
   the same goals swap. Editing structure (rename/add/remove an area, rename or
   remove a routine) is a single **Edit toggle**; opening an area or a routine is
   not editing, so both work in either mode.
4. **Review.** Reads the 10 and the rating back beside that area's goals, asks
   whether the goals actually aim at it, then the whole-life questions. No rating
   inputs here: one number, one place to change it.

## The goal system is the full lab's

Page 2's goals now run the same system as `/test/vision-plan`, reusing its code
rather than a copy: `goalNeedsAction`, `goalHorizon` + `HORIZON_META` +
`formatCountdown`, `REASON_PROMPTS`, `VisionHabit`, `MilestoneCurveEditor`,
`HabitRampStep`, `VisionGoalType`.

- **Priority** — `NsPlan.priorityIds`, the lab's invariant (covers every goal
  exactly once, first = highest, rank = index). A new goal is **appended**, so
  ranks come out 1, 2, 3 by themselves and nothing already ranked gets renumbered
  by someone else's arrival. The badge is a field: click it and type a rank, or
  use the arrows for one step. Out-of-range ranks clamp instead of being refused,
  because typing 99 means "put this last". An area's list sorts by global rank.
  On load the order is **repaired**, not trusted — the lab treats a mismatch as
  fatal because its state is schema-checked; ours came from a browser, so a bad
  order costs the ranking at worst, never the goals.
- **Actions** (`habits`) — "What will you actually do about this?", asked in amber
  when the shared predicate says a goal names an outcome with nothing you could do
  on a Tuesday. Two deliberate departures from the lab, both because our goal
  shape differs: a practice is never asked (its frequency IS the action), and a
  target with a number IS asked (the lab lets a measure stand in because its goals
  are born carrying a habit; ours are not, so "climb to 140kg" with no training
  action is a real gap). An outcome with no action is also a `goalGaps` entry.
- **Horizon chip** — the lab's classifier, but only rendered when the horizon is
  actually known. `classifyHorizon` falls back to "1 Year" for a dateless goal,
  and printing that would show a horizon nobody chose as a decision.
- **Reasons drill** — `reasonsList` plus the lab's eight prompts, one at a time
  with a running count, because volume is the exercise.
- **Feeling clause** — the sentence template completes to "I will easily <goal>
  creating <feeling> by <date>".

Deliberately NOT adopted: `VisionGoalDraft` itself. It hard-requires
`pillarId`/`pillarLabel`/`pillarColor`/`objectiveId`, which are the fixed
five-pillar framework's plumbing; this flow's areas are user-defined and
removable, so every goal would carry a fabricated pillar (see
`tests/unit/goals/noFabricatedFields.test.ts`). The balancer, verdicts and
tracking stay in the lab — this page plans, it does not track.

## The common-goal library

Page 2's area panel reads the `/test/new-goals` framework catalogue directly
(`newGoalFramework.ts`) rather than copying it: **166 curated targets** under 23
objectives, and **26 templates** that switch several on at once at a Beginner /
Intermediate / Advanced level. A goal picked here is the goal that page would
make.

The only work is shape translation, in `shapeFromTarget`. The framework types a
target by PRIMITIVE (volume · habit · target · skill · stage); this flow has
three shapes:

| framework | becomes | carries |
|---|---|---|
| has `stageSteps` (skill/stage) | 🏁 finish line | stage steps as checkpoints |
| has `milestoneConfig` | 🎯 target | the ladder, start → target, unit |
| has `rampSteps` (or a shared driver's) | 🔁 practice | the ramp, steady state = last phase |

- A template level overrides the ladder's **destination**, or a ramp's **final
  frequency**. Beginner squat 80kg, Advanced 200kg, same goal.
- A template only adds targets its own `targetOverrides` set to `true`. A `false`
  there is the template saying "not this one" and is honoured, so Strength Focus
  does not bring in Lift Form.
- Dedupe is by title, in the service, so overlapping templates never duplicate
  and the UI disables an already-added row or template.
- Seed areas map to a library via `AREA_LIBRARY_PILLAR`; a user-added area picks
  one by hand.

## Twelve areas, and rating before planning

- **The circle is the Blueprint's twelve**, derived from `LIFE_MASTERY_AREAS`
  rather than retyped, so labels, sub-labels and the validated palette have one
  home. Health and Fitness are separate, and so are Family and Friends, because
  they fail independently. Still editable: rename, drop, add your own.
- **`AREA_LIBRARY_PILLAR` is derived** from each area's own `pillarIds`, joining
  the twelve-area and five-pillar taxonomies in one place instead of a hand-typed
  table that would drift.
- **Rating comes before planning.** You cannot judge whether a goal is worth
  setting until you have said what good looks like in that area and admitted
  where you stand. So tab 2 collects it and tab 3 shows the 10 back inside the
  area you are writing goals into, with the current rating and a link back.
- **The gap line only names pictured areas.** "Nothing yet in …" was fine at four
  areas and a wall of eleven names at twelve; an area nobody has thought about is
  not a gap. It now lists only areas with a 10 written and no goal aimed at it.
- Old saves keep their own `areas` array, so nothing needs migrating.

## Clicking an area opens a dialog

The wheel is the navigator, so a click has to answer where you are looking. It
did not. On the rating tab, clicking Spirituality expanded the twelfth of twelve
rows — measured at **y=1536 with the page unscrolled on a 900px viewport**, so
the click appeared to do nothing at all. On the plan tab an inline panel pushed
the routines down the page.

`AreaDialog` is one Radix dialog (the project's existing modal, same as
`GoalFormModal`) serving both wheels, because an area is one thing whichever
screen you opened it from:

1. what a 10 looks like here, then the rating against it, then today's score
2. the goals aimed at that 10, the add row, and the common-goal library
3. the routines already serving it, and removing the area

The rating tab keeps a compact twelve-row summary under the wheel whose rows
open the same dialog, so there is one way to work on an area rather than two.
Escape and the backdrop close it; the layout underneath never moves.

## Decisions worth keeping

- **Only the goal views swap; nothing else does.** An earlier pass had the
  routines share the slot with the area panel, so clicking an area made the
  entire morning routine disappear along with the plan. The overview and the
  area panel are two zoom levels on the same goals, so those two swap; the wheel
  above and the routines below stay put.
- **The wheel is the navigator, and one slot shows the goal detail.** The first build
  laid every area's "what do you want here?" input on the page at once, so four
  areas meant four blank boxes plus three blocks of prose about goal types before
  you had typed a word, while the wheel — already labelled "Health · 1 goal" —
  did nothing unless you were in edit mode. One slot with two contents means the
  circle always has something attached to it and selecting an area swaps what
  that is rather than shoving the page around. Measured: the tab went 2535px →
  1155px at rest, and 3598px → 2384px with a goal card open.
- **Opening a routine IS editing it.** A pass that put the builder behind the
  surface's Edit toggle and showed a read-only list instead made the morning
  routine look like it could not be changed and had no presets. There is nothing
  else you would open a routine for. The Edit toggle governs structure only
  (rename a routine, remove one, add one), never its contents.
- **The read-back is a disclosure.** Expanded it was the longest thing on the
  page, on every tab.
- **Empty areas get one line, not a form.** "Nothing yet in Wealth,
  Relationships, Meaning" with each name a link into that area.
- **Routines arrive pre-filled.** Every routine ships with a starting stack; an
  empty card is a second blank page. Untouched cards say "our starting stack,
  edit it" so a default nobody chose never reads back as their decision. Knock-on:
  "has steps" stopped meaning "work done", so the tab tick is `areasTouched()`
  and `planAsText()` returns "" until `planIsUntouched()` is false.
- **Presets are named, not minute-keyed.** 15 / 30 / 60 for the sequences, plus
  **The full ritual** on the morning routine — the documented hour in its own
  order (smile · stretch · breathe · water · move · incantations · empowering
  questions · driving force · ten pages · plan), grounded in corpus video
  `PliFBr__T7Y`. Weekly routines (training · work · people · mind) get three
  presets each.
- **Edit is a toggle.** Clicking a sector used to open a panel and clicking a
  routine another one, so the page grew and shrank under the cursor. One button
  now switches the whole surface.
- **The wheel's viewBox is measured, not fixed.** A fixed square box assumes a
  label at every compass point; with four areas the labels sit on diagonals and
  the empty top/bottom strip read as a gap between the wheel and the stack.
- **Removing an area moves its goals** to the first survivor rather than
  deleting them. The last area cannot be removed.
- **The identity work sits with the vision, and is asked once.** Why it matters,
  who you become, your values, your identity and your affirmations belong to the
  paragraph, not to the review, and the reason is the thing you re-read in March.
  `become` and `identity_total` moved off the review tab keeping their ids, so
  anything already written under them still loads; values stay one list
  (`plan.values`) editable from either tab, said out loud on both. The review
  keeps the whole-life questions that are genuinely about looking back
  (standards, what stops you, who could help).
- **The star card's counter counts only its own card.** The why is printed
  above it, so including it would give a count nobody could reconcile with what
  is on screen. `starWorkAnswered` excludes `STAR_WHY_ID`; `starWorkWritten`
  (used by `tabHasContent`) does not.
- **The 10 is written before the rating.** A number with no picture behind it is
  a mood, and someone else's 10 in your health is not yours.
- **Review ratings are button rows, not sliders.** A slider has to rest
  somewhere while unset, and that value then cannot be picked by dragging to it.

## Files

- `src/goals/data/northStar.ts` — all copy, the four areas, routine blueprints
- `src/goals/northStarService.ts` — pure logic (~40 exported functions)
- `src/goals/components/north-star/` — `NorthStarFlow` · `StarTab` · `PlanTab` ·
  `AreaWheel` · `NowTab` · `AreaDialog` · `GoalOverview` · `GoalLibrary` ·
  `RoutineCard` · `AreaGoals` · `GoalCard` · `ScoreRow` · `ReviewTab`
- `src/goals/types.ts` — `Ns*` types (slice rule: types live in types.ts)
- `tests/unit/goals/northStarService.test.ts` — 100 tests

## Reused rather than rebuilt

`MilestoneCurveEditor` (themed `orrery`, since `zen` is a light-surface theme),
`HabitRampStep`, `VisionGoalType`, `VISION_RUNGS` + `rungSentences` from v1, and
the belief procedure's shape from `lifeMasteryBeliefs.ts`.

Fixed a pre-existing bug in `MilestoneCurveEditor` while wiring it in: y-axis
ticks ran through `roundToNiceNumber`, so a 100→140 goal labelled its quarter
marks 100 / 100 / 150 — non-monotonic, and disagreeing with where they were drawn.

## Known gaps

- Whole-life values order by insertion; reordering means remove-and-re-add.
  Drag-to-rank is the obvious next step.
- The seeded training week is 9 sessions/week (strength 3 + cardio 2 + mobility 4).
- Nothing is persisted to the database; this is a sandbox.
