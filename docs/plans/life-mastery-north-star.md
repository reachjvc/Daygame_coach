# Life Mastery, North Star flow — `/test/life-mastery`

**Status:** shipped (sandbox). localStorage only (`north-star-v1`), no LLM, no API,
no database. Replaced the 12-area flow, which moved to `/test/life-mastery-v1`.

## Shape

Four tabs, switchable at any time. Order is the order the work wants to happen
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
2. **Where you are.** The wheel, and nothing competing with it. Clicking an area
   opens the assessment dialog: what it covers, what a 10 in it looks like, your
   rating and today's score, a snapshot, **why it matters to you**, **what it
   asks you to value**, **who you are in it**, what might stop you, and what
   already runs there. It links straight to the same area's goals. There is no
   twelve-row list under the wheel any more — that was the wheel again as text,
   same names, same numbers, same click, same dialog, and it pushed everything
   else off the screen.
3. **Your goals.** Five things, in the order the cascade runs: the **chain
   counted on one line** (`CascadeBar`), the **guided build** (`GuidedBuild`), the
   **same wheel** doing a different job (a sector opens the goals; sub-labels
   count goals rather than repeating the rating, via `subMode="goals"`) with the
   **routines beside it, editable**, the twelve areas as rows carrying their 10,
   coverage dot and goal count, then every goal in priority order, then the
   **milestone timeline** (`MilestoneTimeline`). The goals dialog **carries that
   area's 10 and purpose read-only at the top** and links back to the
   assessment. Goal library, the milestone builder and everything else reaching
   the area live here.

   **The routines live on this tab, not the assessment.** A routine is the part
   of the plan that runs whether or not you open the page, which makes it the
   other half of "what are you going to do", and nothing at all to do with
   rating where you stand. Its Edit toggle is structural only (rename, remove,
   add); opening a routine and changing what is in it works either way.

### The guide: write your own, then be asked what is missing

The build board — every area, every set, every target, every practice, on screen
at once — lasted one afternoon. Fresh, tab 3 was **9.7 screens tall with 329
controls on it**, and it was built on the wrong premise: that the hard part is
choosing. It is not. A real list looks like *"ingen smerte i ryggen"*, *"bænk 28
kg 3x6-8"*, *"10 pullups, fra 7"*, *"1 muscle up"*, *"internationalt
bedstsælgende forfatter"*, *"Masters in League of Legends"* — and the 166-target
catalogue contains approximately none of it.

So `GuidedBuild` is three steps, and the middle one is a text box:

1. **Your season.** Pick two or three areas, in order (`seasonAreaIds`). Add your
   own — people's areas are Dating, Virksomhed, Morgenrutine, not ours.
2. **Your goals.** A textarea, one per line, in their own words. `parseGoalDump`
   strips the numbering people paste in ("1.", "12a.", "-", "•").
   `shapeFromTitle` reads the shape out of the sentence, in English and Danish,
   because half of these lines are frequencies: "Træn 5x om ugen" is a practice
   at five, not a climb to five; "hver dag" is seven; "1 video om ugen, 2, 3" is
   a ramp; "Bænk 28 kg, 3x6-8" is a climb to 28 (not to 3 — that is the set
   count); "10 pullups, fra 7" already said where it starts, so its rungs are
   spaced immediately; "1 Muscle Up" is a finish line, because a climb to one is
   not a climb. The catalogue sits under the box as an offer.
3. **Make them real.** The queue. One goal, one question, skip always available
   and remembered (`asked` on the goal — "has no why" and "was asked and said no"
   look identical otherwise). Order: where are you today → what will you actually
   do → is this yours to decide → by when → why → what it costs you.

Three things took a second pass:

- **Actionability leads.** `control` was asked first, so the guide's opening line
  to somebody was "is this one yours to decide?" about *no pain in my back* —
  obviously theirs, and the useful question is how it becomes something you do.
  It now comes after `actions`, where it is earned: you have just tried to name
  what you would do about *internationally bestselling author* and found nothing.
  Answering "no, other people decide it" keeps the big one and hangs a
  controllable goal under it (`addControllableGoal` → `linkGoal`).
- **Round robin, not goal by goal.** Finishing one goal before looking at the
  next means the first thing on the list is asked five questions before the
  second is asked one — and the first question about your fourth goal matters
  more than the fifth about your first. `guideQueue` sorts by how many questions
  a goal has already had. Progress counts **questions**, not finished goals, or
  the bar sits at zero for twenty answers and then fills at once.

- **The guide ends in the payoff, and the page stops arguing with it.** It used
  to finish on one green sentence with the year it had just built three screens
  further down and nothing connecting them, under a tab that still carried a
  wheel, a twelve-row area list that was the wheel again as text, and a second
  goal editor in a dialog. The area list is gone — the same argument that took
  the identical list off tab 2 — the intro card is gone, and step 3 now ends
  with what the answers made: the counts, the week it costs, the next three
  dated things, and a jump to the timeline. Fresh, the tab is **2.9 screens**.
- **"Been through", not "ready".** A goal every question was skipped on has been
  through the guide and is ready for nothing. Saying otherwise had the page
  calling the plan finished directly above its own list of what was missing
  from it.

`climbPace` answers the question the user actually asked — *er det realistisk* —
as arithmetic and nothing more: 22 → 28 kg by next August is half a kilo a
month, and a year to move one kilo off a hundred means the date is doing no
work. It has no view on kilos, because it does not know what the unit is. It
only judges the one case the numbers settle: no distance at all. "Already past
it" is deliberately not judged — a start of 30 against a target of 28 is either
somebody who can already bench it or somebody getting down to it.

`risingNumbers` reads "Få 10 downloads, 100 downloads, 1000 downloads" as one
climb from 10 to 1000 rather than as a goal finished at ten. Years are stripped
first, or "Squat 100 kg by 2027" climbs to the year 2027.

`suggestedActions` answers "what will you do about it" from the routine
blueprints that already serve the area — real steps, already written, no
guessing from the goal's wording, which could not work for a plan written in
Danish anyway.

### The cascade: goal → action → routine

Tab 3 could add goals long before it could show that they are part of one
machine. The library sat one area at a time inside a dialog behind two collapsed
fades, a catalogue goal arrived with a number and a date and nothing you could do
on a Tuesday, and the routines were a sidebar that knew about none of it. Four
pieces close that, all wired through `northStarBuild.ts`:

- **The board** (`BuildBoard`, now last on the tab and closed by default) shows every area at once with
  three kinds of offer. A **goal set** brings several goals AND the routine they
  are kept by, as a checkbox that starts ticked. A **goal** is one of them alone.
  A **practice** is not a goal: it is a step that goes straight into a routine,
  adding the routine to the stack if it is not there yet (`addPractice`).
- **Goals arrive with their Tuesday.** `OBJECTIVE_ACTION` gives each objective
  the action its goals are actually kept by, attached by `addGoalFromTarget` only
  to goals that would otherwise trip `goalNeedsAction` — so a practice (which is
  its own action) and a staged finish line are untouched, and a whole template
  now imports with nothing flagged.
- **A goal picked alone still asks.** `unmetRoutineNeeds` reads the goals already
  in an area, matches them back to the catalogue by title, and names the routine
  underneath them that is missing. A goal the user typed themselves asks for
  nothing rather than guessing.
- **The load meter** is the counterweight: a board that puts eighteen goals one
  click away needs a number that pushes back. Routine minutes plus DISTINCT
  actions — one training week moves three lifts, so three goals correctly share
  one action. The ceiling is 30 h because the shipped stack already costs 20, and
  a warning that is amber before you choose anything is a warning nobody reads.

**One catalogue, twelve areas.** `AREA_LIBRARY_PILLAR` is a five-into-twelve fit,
so five areas landed on `meaning` and three on `relations` and were offered each
other's objectives — Family was offered Get a Girlfriend. Survivable one dialog
at a time; on a board it is the same card four times. `AREA_OFFERS` assigns the
objectives by hand, templates match on their **primary** objective (the first in
the list, the one they are named after) so Find The One cannot reach Mind &
Beliefs through Build Inner Game, and the four areas the catalogue genuinely
cannot cover — Family, Friends, Fun, Contribution — say so and offer practices
instead.

### The milestone timeline

Every shape in this flow has a climb inside it and none of them showed it outside
the goal's own card: a target has its ladder rungs, a practice its ramp phases, a
finish line its checkpoints. `goalMilestones` dates all three and `planTimeline`
buckets them into months. It is also the honest diagnostic — goals arrive dated a
year out, so a plan with every dot in the last column is telling you nobody has
set a real date yet.
4. **Review.** Reads each area's answers back beside its goals, asks whether the
   goals actually aim at the 10, then **orders your values** and asks the
   whole-life questions. No inputs are duplicated here: one answer, one place to
   change it.

### Why the assessment and the goals are two tabs

They were merged into one, correctly: "Where you are" and "Areas, routines &
goals" had rendered the **same** twelve-sector wheel opening the **same** dialog.
But merged, one screen carried the whole assessment (10, rating, snapshot,
purpose, values, identity, blockers) **and** the goal editor for twelve areas,
and the assessment sat above a control tall enough to bury it. So the split now
runs along the honest line rather than the duplicated one: **where you stand**,
then **what you will do about it**. Each half has its own dialog for one area and
a one-click link to the other half (`onGoToGoals` / `onGoToRating`, which switch
tab and re-open the same area).

**The wheel appears on both, and that is not the old duplication.** What made the
old pair pointless was that the same wheel opened the same dialog onto the same
work. Here the wheel is the navigator and the picture of the whole life at once,
and the work behind a sector differs by tab: the assessment on 2, the goals on 3.
Its sub-labels follow (`subMode`). The rail does NOT appear on both — the
routines live on tab 3 only.

`nsProgress().done.now` means an area rated **and** pictured; `.done.plan` means
goals written **and** every one carrying a why. Goal todos in `planTodos` point
at `"plan"`, rating and 10 todos at `"now"`.

### The routine stack beside the goals wheel

`DEFAULT_ROUTINE_IDS` is `morning · night · work · vices` — four cards in a rail
to the right of the wheel on **tab 3**. They sat beside the assessment wheel
first, which read well and was wrong: a routine is not a reading of where you
stand, it is the part of the plan that runs regardless. Clicking one expands the
full two-column builder **underneath** both columns rather than inside the rail.
Manifestation dropped out of the default four (reading the north star out loud is
already a morning step) and is one click away in the library.

**All four ship pre-filled** — `seedRoutine` applies each blueprint's
`defaultStepIds`, so a new plan opens with morning at 6 steps, evening 4,
business 3, vices 2. That is deliberate (editing something down beats writing it
from nothing) and it is labelled: an untouched routine says "our starting stack,
edit it", and `routineIsUntouched` keeps it out of the progress counts so a
default nobody chose never reads back as a decision they made.

**Vices** is the new blueprint and the only one made of things you do *not* do:
weekly, with each step's days-per-week meaning days held clean. Presets: screens,
substances, the hard reset. It is filed under Mind & Beliefs and serves health,
emotions and spirituality, which is the shape the season-focus question is
looking for — dropping one thing lifts four areas at once.

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

- **Two passes.** `plan.currentValues` — the list that built the life you
  already have — and `plan.values`, what would have to be important to create the
  paragraph. The **diff** between them is the insight, and the page prints it. We
  only ever asked the second one, so nothing could be compared.
- **Pass 1 asks his question and ships his prompting.** The question is verbatim
  ("what's been most important to me in my life?"). A build in between rewrote it
  to "What have you been living by so far?" on the theory that it reads as a
  question about events. Re-checking the transcript killed that: he asks it
  exactly that way, and he never asks it bare. Within seconds he (1) says take
  the first answer and do not overanalyse, (2) **reads a menu out loud** —
  "security, has it been being safe, has it been happiness, has it been success,
  has it been money, has it been family, has it been love, has it been passion,
  has it been friends, has it been travel", (3) asks "what else has been
  important for you" over and over, and (4) steers you toward the emotion
  underneath. All four are on the page now: the help, `VALUES_PAST_MENU` under a
  "Has it been…" line (`TagList`'s `suggestionsLabel`), "And what else has been
  important to you?" printed from the first answer onward, and the emotion steer.
  Nobody produces a value cold; the menu and the loop ARE the method.
- **The past list is not cued off the user's own paragraph.** The second list is,
  correctly. Cueing the first one off the life you just described gives you the
  same list twice and destroys the diff the exercise exists for.
- **Each area asks for its own values.** `areaValueSuggestions(plan, areaId)`
  reads that area's own 10, purpose, snapshot and identity first, then the north
  star, then `AREA_VALUE_SUGGESTIONS[areaId]` as the floor. Money offering
  Adventure and Faith while leaving out Security was the generic row doing its
  worst; a Money 10 saying "a year of costs in the bank and I stop counting at
  the till" now leads with Abundance and Security, off their own sentence.
  Fixing this exposed a real bug in the cue scan: it counted substrings, so
  "stop counting" scored **Achievement** because "top" is inside "stop". Cues are
  `\b…\b` matches now, which also fixes `derivedValueSuggestions`.
- **Every value carries a colour**, from the group it belongs to (`VALUE_COLOR`),
  in the picker and on the chips it becomes. Eleven groups of identical grey
  chips is a wall you have to read; colour makes the block you want findable
  before you have read a word.
- **A library you can find yourself in, and a way past it.** Naming a value is a
  recall problem: you recognise it, you cannot produce it cold. The pool was 20
  words with 12 of them on screen, which shows the shape and cannot be answered
  with. `NS_VALUE_GROUPS` is 131 words in 11 groups, shown by `ValueBrowser`
  under every values box (both lists, and each area's). **Means values are in it
  on purpose** — family, money, fitness, status are what people actually say, and
  they earn the drill below rather than being left off.
- **Each list leads with the prompt that belongs to it.** `ValueBrowser` takes a
  `lead` group shown above the library's own: his "Has it been…" menu on the
  past list, the words read out of the user's own writing on the second, the
  common ones inside an area. Nothing is offered twice on one panel.
- **The search box adds as well as filters.** A list of 131 will always be
  missing somebody's word, and "enjoyment is not here, now what" is the moment
  the exercise stops. Anything typed that is not already a word becomes an
  `Add “enjoyment”` button (enter works too), so not-on-our-list costs one click
  rather than a hunt for the right box. The main inputs say "type … and press
  enter" for the same reason: a bare box with a placeholder did not read as one
  you could put your own word in.
- **The panel is not a dropdown.** See "Peek instead of disclosure" below.
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

## Milestone celebrations, under a finish line

"Bench 36 kg dumbbells for 6 reps" is correctly typed as a finish line — you did
it or you did not — and it is also obviously a climb, and the climb is where the
year actually happens. A finish line that pays out once, at the end, is a long
time to work with nothing to feel.

`parseGoalTarget` reads the number out of the title (**the first** number: the 6
in "for 6 reps" is the shape of the rep, not the thing that grows) along with its
unit and the words before it. `milestoneValues(from, to, count)` spaces the rungs
evenly and **always finishes on the target**, so ticking the last rung and hitting
the goal are one event. It works downhill too, because "under 80 kg" is the same
climb in reverse. `setMilestones` writes them as checkpoints with `m`-prefixed
ids, which is how it knows to replace its own rungs on a redo and leave
hand-written checkpoints alone.

Each generated rung carries `NsCheckpoint.celebration` — what you do when you get
there. Only the generated ones: a reward box on every hand-written checkpoint
turns twelve of them into homework.

## Peek instead of disclosure, on anything you browse

`Peek` (`components/north-star/Peek.tsx`) shows the first screenful of a long
list, fades the cut-off, and puts a "Show all N" pill under it. The fade only
appears when something is genuinely hidden, measured with a `ResizeObserver`,
because a fade over a list that already fits is a lie about there being more.

It replaced three disclosures, and the reason is the same each time: **a closed
row tells you a count and hides every reason to open it.** "Browse all 131
values" does not say that values come in groups, or that one of the groups is
Body, or that any of it resembles what you were trying to think of. The flow had
reached a disclosure inside a disclosure inside a dialog.

| Was | Now |
|---|---|
| "Browse all 131 values" dropdown | every category on the page, four words each, faded, `Show all 131 values` |
| "Common goals · 75 to choose from" dropdown, holding a dropdown per objective | the library on the page; the objective rows are flat sections; `Show all 75 goals` |
| 18-item routine step library at full height | five steps and a fade, `Show all 18 steps` |

The goal library needed **two** peeks rather than one around the lot: a single
fade cut through the middle of the template card, so the preview of a goal
library showed no goals. Sets peek at sets, goals peek at goals.

**The value list clips by COUNT, not height** (`PeekButton`, the control on its
own). Two passes got this wrong before it landed. Wrapped chip rows put Health
beside Vitality beside Energy with the headings a row apart, so the groups
stopped reading as groups. CSS `columns` fixed the direction and broke the same
thing again: balancing eleven groups into three columns and then clipping the
height showed three headings and hid the other eight, which is the disclosure
problem with extra steps. Now every category is a grid cell, its words run down
inside it, and each shows four with a fade of its own. What is on screen is the
shape of the whole list.

Built from what the project already had: `V11ViewD`'s column overflow gradient
and `RecentSessionsCard`'s "N more" pill.

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
  `ValuesWork` + `ValueBrowser` · `Peek` (the fade-and-show-all primitive) ·
  `AreaWheel` · `NowTab` + `AreaDialog` (tab 2, the assessment) ·
  `PlanTab` + `AreaGoalsDialog` (tab 3, the goals) · `GoalOverview` ·
  `GoalLibrary` · `RoutineCard` · `AreaGoals` · `GoalCard` · `ScoreRow` ·
  `ReviewTab`.
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

Third pass, after the assessment/goals split (the tab rail now reads **four**
tabs, so the "three tabs" in the older log below is history): `npm test` 2682
passed, 1 skipped, no failures. In the browser at 1440px and 820px — rating
Health 6/10 from the wheel dialog ticks tab 2 green; "Write the goals for Health
→" switches to tab 3 with that area's dialog open and its 10 printed at the top;
a goal typed there lands in the priority list and in the todo panel as "1 goal
needs a why" pointing at `plan`; the four-card routine rail sits beside the
wheel and Vices expands its builder full width underneath. Then, keeping the
wheel on tab 3 as well: its sub-labels read "1 goal" / "no goals", a sector opens
the goals dialog, and the Business routine pointer lands back on tab 2 with that
routine expanded. No console errors from this page (the dev overlay was showing
an unrelated parse error in `ShowcaseView.tsx`, mid-edit elsewhere).

`npm test` (earlier round): 2681 tests. The only failures were in
`tests/unit/timetrack/`, which is order-dependent and fails a different file on
different runs, including with those changes stashed. `northStarService.test.ts`
is 154 tests, up from 116.

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
