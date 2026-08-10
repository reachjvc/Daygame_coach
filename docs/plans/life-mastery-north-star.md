# Life Mastery, North Star flow — `/test/life-mastery`

**Status:** shipped (sandbox). localStorage only (`north-star-v1`), no LLM, no API,
no database. Replaced the 12-area flow, which moved to `/test/life-mastery-v1`.

## Shape

Three tabs, switchable at any time. Order is the order the work wants to happen
in; **nothing is gated anywhere**, and what is outstanding is listed in one
panel under every tab instead (`planTodos`).

1. **North star.** One question — "Imagine an ideal future. Who are you? What do
   you do?" — with a hint naming health, wealth, relationships and meaning, and
   explicit permission to be unrealistic. Horizon picker (5 · 10 · 20). The
   7-rung ladder from v1 survives as a collapsed escape hatch that assembles a
   draft; replacing an already-written star asks first. Then, in his order:
   **why is this important to you** (purpose), the **values exercise in full**
   (see below), then a card holding **who are you committed to being**
   (identity), **how are you committed to showing up** (standards), **who do you
   need to become** (the gap) and **your affirmations**.
2. **Your life.** The wheel, the twelve rows under it, every goal in priority
   order, and the routines. Clicking an area anywhere opens the one dialog that
   holds **everything about that area**: what it covers, what a 10 in it looks
   like, your rating and today's score, a snapshot, **why it matters to you**,
   the goals aimed at it, everything else reaching it, **what it asks you to
   value**, **who you are in it**, and what might stop you. Editing structure
   (rename/add/remove an area, rename or remove a routine) is a single **Edit
   toggle**; opening an area or a routine is not editing, so both work in either
   mode.
3. **Review.** Reads each area's answers back beside its goals, asks whether the
   goals actually aim at the 10, then **orders your values** and asks the
   whole-life questions. No inputs are duplicated here: one answer, one place to
   change it.

### Why tab 2 is one tab and not two

"Where you are" and "Areas, routines & goals" rendered the **same** twelve-sector
wheel, opening the **same** area dialog; the second one additionally listed the
goals and the routines. There was no answer to "what is the difference", because
the honest answer was "this one, plus more of it" — and paying for that with a
tab meant the ratings and the goals they are supposed to justify were never on
screen together. `NorthStarTabId` lost `"plan"`; `nsProgress().done.now` now
means all of it (an area rated and pictured **and** every goal carrying a why).

## The values exercise, and why the identity questions were reordered

Checked against the transcripts, not our own notes. Quotes and video ids:
`docs/research/life-mastery/values-and-identity.md`.

**They were not the same question, and the page made them look like one.**
"Who are you committed to being" is his verbatim **identity** question
(`8kco2rjijjE`), answered in the present tense and conditioned weekly. "Who do
you need to become" never appears in the driving force; it appears attached to an
outcome — "who do you need to become to achieve that, in terms of character,
skill set, focus, self-discipline, daily habits" (`I1MhBE-0zxU`). One is a
declaration, the other is the gap, and the gap is the handover into the plan. So
the gap moved to **last**, behind a rule, with copy that says which is which.

**His driving force is four things, in order**: vision → purpose → identity →
code of conduct. The standards (`conduct`) moved up from the review tab to join
the other three, keeping its id so anything already written still loads. Values
sit between purpose and identity, because they are derived from the vision and
the identity is written out of them.

**He works per area as well as whole-life**, and we had three quarters of it:

> "I have my vision, I have my purpose, but I also have **a vision and a purpose
> for each area of my life**. And I have goals for each area as well… I've got my
> vision here, I've got my purpose for my relationship, and then I've got my
> goals, my one-year goals, my three-month goals, my monthly goals in that area.
> So I do that for each area of my life." — `Rw2qaMltFcY`

Per area that is **vision → purpose → goals**, plus rituals (`NidJpDcCkQs`). We
had the vision (your 10), the goals and the routines, and **no purpose**, which
is the one of the four you re-read when you do not feel like the other three. It
is now `NsAreaReview.purpose`, sitting between the 10 and the goals, where his
does.

The per-area **values** and **identity** already existed but lived on the review
tab, one screen away from the area they belong to, so they were only answered by
somebody who went looking. They moved into the area dialog with the purpose, and
the review reads all four back with a link to change them. That follows the rule
the 10 and the rating already set: one answer, one place.

**The values list became the exercise** (`Lp_GOrM16Xc`), not a chip row:

- **Two passes.** `plan.currentValues` — "what has been most important to you in
  your life so far", the list that built the life you already have — and
  `plan.values`, what would have to be important to create the paragraph. The
  **diff** between them is the insight, and the page prints it. We only ever
  asked the second one, so nothing could be compared.
- **Means vs ends.** "Family", "money" and "think better thoughts" are all fine
  to type; each earns one follow-up, "what is the feeling you are really after
  from that?", because "at the core of it our values are just emotions". Never a
  rejection, never a whitelist: `looksLikeMeansValue` only decides whether to
  OFFER the drill, and the typed word is kept whatever the answer.
- **Hierarchy by pairwise duel.** "Is it this one or this one" is his method and
  the only one that works on a list of fifteen. `nextValuePair` exposes insertion
  sort's comparison schedule one question at a time; answering "the lower one"
  swaps them and the pair above becomes the next question. Arrows are still
  there for fixing one answer. This also kills the old "remove and re-add to move
  one up".
- **Noticing and ordering are on different screens.** `ValuesWork` takes a
  `mode`: `"elicit"` on the north star tab (the two lists, the diff, the
  means-to-ends drill) and `"order"` on the review (the ranked list, the duel,
  the conflicts). Ranking on the opening screen means ranking six words you
  thought of straight after writing one paragraph. By the review you have rated
  twelve areas, written a 10 and a purpose in each, said what each one asks you
  to value, and set goals, so `ValuesWork` in order mode offers **every value
  named anywhere that is not yet on the whole-life list** and the order is being
  made out of your actual plan. The two lists stay reachable behind a disclosure
  there, because the review is where you notice the one you forgot.
- **Conflicts.** The three he names, each a means value ranked above the end it
  was supposed to serve: success above happiness, fitness above health, work
  above the people. Raised only when both sides are on the list in that order.
- **At least seven**, his own recommendation, shown as a countdown.
- **Suggestions come from the user.** `derivedValueSuggestions` reads value words
  out of the north star, the why, the area 10s and the goal whys, ranked by how
  often the theme recurs, and offers those before ours.
- **Where they go.** `areasWithoutValueSupport` — an area under the floor with
  nothing in the values list pointing at it. This is his client who wanted to
  change his health and had never written health down. Surfaced on the review tab
  and in the todo panel.

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

## Goals arrive dated, shaped, and sometimes scored for you

- **Every goal is born with a date**, a year out (`defaultGoalDate`). A goal with
  no date is a wish, and a nine-goal template landing dateless meant opening a
  calendar nine times before any of it meant anything. A year is his own goal
  horizon ("typically a year or less; beyond a year it becomes a lot harder to
  manage and measure"). Five quick chips (3m · 6m · 1y · 2y · end of year) sit in
  the open card; the calendar is the fallback, not the tool.
- **`addMonthsISO` clamps**, so 31 January + 1 month is 28 February and not
  3 March, which is a date nobody picked.
- **Some goals score themselves.** The page already holds a 0-10 for every area
  every day, so "raise my average emotional state to an 8" should not ask the
  user to copy that number across. `NsGoal.metric = "daily_area"` makes the
  goal's current value the rolling 14-day average of its own area, with a live
  progress bar. Offered only on a target (the only shape with a number to climb)
  and only as a toggle, because "climb to 140kg" wants nothing of the sort.
  Turning it ON fills in a sensible 0-10 ladder **only if the ladder is still the
  untouched default**; turning it off never rewrites a number.
- **"needs a why" is a button.** It was a label, and the why lives inside the
  card, so the row told you what was wrong and gave you nowhere to fix it.
- **A goal that is really one of our tools says so.** The business template ships
  "Weekly Review", which is what the review tab does; `goalToolLink` links it
  there. `goalAlreadyInRoutine` says when a goal duplicates a routine step, so
  the plan does not carry the same commitment twice unconnected.

## A cumulative total is not a weekly rate

Three framework targets — Build Hours, Deep Work Hours, Learning Hours — are
`metricKind: 'cumulative'` with a ladder of `1 → 500` and the unit `"hours/week"`.
Passed through unchanged that renders "1 → 500 hours/week", which is 71 hours a
day. `cumulativeUnit` drops the per-period half of a cumulative target's unit, so
it reads "500 hours in total". Anything already written as a total is untouched.

## The one thing, and what a goal reaches beyond its own box

- **`plan.seasonFocusId`** is deliberately not "whatever is at rank one". Rank is
  an order to work through. This is the single thing that, done, makes several of
  the others easier or unnecessary — usually not the same item. Holds a goal id
  or an area id; picking the same one twice clears it; a banner sits above the
  wheel and it reads back at the top of the plan.
- **`NsGoal.serves` / `NsRoutine.serves`** are the other areas something lifts.
  A morning routine is not a health routine: it carries mind, emotions, health
  and spirituality at once, and filing it under one of them meant opening
  Emotions showed nothing even though something runs there daily. The seven
  blueprints ship with `servesAreaIds` filled in, and an old save inherits them
  rather than loading empty.
- **`areaReach` and `areaCoverage`** are what make an area readable: its own
  goals and routines, plus everything filed elsewhere reaching in. Coverage is
  `covered` / `thin` / `none`, shown as a badge in the dialog and a dot on the
  row. A routine running in an area counts as covered — reporting "nothing here"
  for Emotions while the morning routine runs there daily would be false.

## What a 10 is, and the rating that "disagrees"

- **The 10 arrives with an example in every one of the twelve areas**
  (`AREA_TEN_EXAMPLES`), written first-person in the same register as the north
  star example. It is the placeholder AND a one-click button, never inserted by
  itself, and asking to replace something already written confirms first. Twelve
  blank boxes under three-word sub-labels is eleven boxes nobody fills in, and
  the first thing the box has to answer is what the area even covers — so his own
  weekly-evaluation `prompt` for the area is now printed in the dialog header.
- **A collapsed "What counts as a 10?"** carries the guidance: your 10 is yours,
  it moves as you do, and a 10 pinned twenty years out reads a 2 every week and
  teaches you nothing. The first two are his ("my 10 might be different than your
  10"; "financially your 10 might be a billionaire, and so you might feel like a
  2"; he now rates himself a 10 where he once refused to). The third is our
  reading and is labelled as such in the data file.
- **`NsAreaReview.snapshot`** is an optional line on where you are right now. The
  number says it was a 4; this says what a 4 felt like, which is the part nobody
  remembers in six months.
- **The variance note stopped accusing.** It said "one of the two is telling the
  truth, and it is worth a minute deciding which". Nothing in the material says a
  mismatch means one number is wrong; all he says about rating is that measuring
  makes you aware. It now says what the difference is made of (looking back
  rounds up; memory weights the bad days) and stops.
- **The floor line waits for every area.** It used to fire on the first rating,
  so rating Emotions first produced "Under the floor right now: Emotions. That is
  where the attention goes this season" off one data point and eleven blanks. You
  cannot know what is lowest until you have rated them all, and which of them you
  work on is the user's call, so it is now an observation and the season pick is a
  separate, explicit control.

## Templates are previewable before you take nine goals sight unseen

`TemplateCard` shows what is in a set, with each row's shape and the number it
will carry **at the level currently picked**, so switching Beginner to Advanced
visibly changes the list. Adding one leaves a strip saying how many arrived, that
they all carry a date, and that the climb and the ramp are editable per goal.

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

## The area dialog has a way out

Everything in it saves as you type, and the only way to leave was clicking the
empty space behind it or finding the small x in the corner. It now ends in a
sticky bar: **Done** closes it, and **Next: <area>** goes straight to the next
area in the wheel's own order, wrapping, so twelve areas are twelve clicks
rather than twelve rounds of close-scroll-find-open.

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

- `src/goals/data/northStar.ts` — all copy, the twelve areas, the 10 examples,
  the value cue table and the conflict rules, routine blueprints
- `src/goals/northStarService.ts` — pure logic (~70 exported functions)
- `src/goals/components/north-star/` — `NorthStarFlow` · `StarTab` ·
  `ValuesWork` · `AreaWheel` · `NowTab` · `AreaDialog` · `GoalOverview` ·
  `GoalLibrary` · `RoutineCard` · `AreaGoals` · `GoalCard` · `ScoreRow` ·
  `ReviewTab`. `PlanTab` is gone: it folded into `NowTab`.
- `src/goals/types.ts` — `Ns*` types (slice rule: types live in types.ts)
- `docs/research/life-mastery/values-and-identity.md` — the transcript reading
  behind the values and identity work
- `tests/unit/goals/northStarService.test.ts` — 150 tests

## Reused rather than rebuilt

`MilestoneCurveEditor` (themed `orrery`, since `zen` is a light-surface theme),
`HabitRampStep`, `VisionGoalType`, `VISION_RUNGS` + `rungSentences` from v1, and
the belief procedure's shape from `lifeMasteryBeliefs.ts`.

Fixed a pre-existing bug in `MilestoneCurveEditor` while wiring it in: y-axis
ticks ran through `roundToNiceNumber`, so a 100→140 goal labelled its quarter
marks 100 / 100 / 150 — non-monotonic, and disagreeing with where they were drawn.

## Copy

Every user-facing string lives in `northStar.ts`, which carries its own voice
rules at the top: second person, one idea per sentence, no em-dashes, no
"X, not Y", plain verbs, warm and never clever. A pass over the strings added in
this round removed the ones that failed the last rule — "worth an afternoon",
"so it does not go quiet", "everything else can slip a week", "seven is the
floor, not the aim" — and replaced the claims we could not source ("the one
people report regretting") with what he actually says about himself.

## Known gaps

- The seeded training week is 9 sessions/week (strength 3 + cardio 2 + mobility 4).
- `looksLikeMeansValue` is a word list, tuned to stay quiet. It will miss some
  means values, which is the right way round: a false "worth a second look" on
  somebody's real value is worse than a missed one.
- `serves` is set by hand. Nothing infers that a sleep goal lifts four areas.
- Nothing is persisted to the database; this is a sandbox.

## Verified

`npm test`: 2681 tests. The only failures are in `tests/unit/timetrack/`, which
is order-dependent and fails a different file on different runs, including with
these changes stashed. `northStarService.test.ts` is 154 tests, up from 116.

Second scripted pass, after the split: step 1 shows the two lists and **no** duel
or order control, and says where the ordering happens; the area dialog carries
the purpose, the values, the identity and the blockers; the footer's Done closes
it and "Next: Relationship" moves straight on; the review shows "Put your values
in order", offers "+ Gratitude" from the value written inside an area, runs the
duel and prints the conflict. No console errors, no overflow at 390px.

First scripted pass at 1280px and 390px, on a cleared store: the tab rail reads
three tabs; the star questions come out in the order above; two values lists
produce the diff, the "Success sits above Happiness" conflict and one "worth a
second look" flag; the duel reorders the list; the floor line says "12 areas
still unrated" and does NOT name an under-floor area; the area dialog shows the
Blueprint prompt, the 10 example as a placeholder plus a button, the 10 guidance,
the snapshot box and the coverage badge; **both score rows start at the same x
(342 = 342)**; a new goal arrives dated a year out; "needs a why" is a button;
the five date chips render; the daily-ratings metric turns on and reads back
against the ladder; the template preview shows "Deep Work Hours 1 → 500 hours in
total" rather than 500 hours a week. No console errors, no horizontal overflow at
390px.

Icon note: the values reorder controls use `ChevronDown` rotated, which is how
`PriorityBadge` and `RoutineCard` already do reorder. `ArrowUp`/`ArrowDown` were
tried first and would have been a new context for an icon already in use
elsewhere, which needs sign-off.
