# Life Mastery, North Star flow — `/test/life-mastery`

**Status:** shipped (sandbox). localStorage (`north-star-v1`) is the source of
truth, no LLM. A **copy** of the plan is mirrored to `plan_snapshots` so the
people building it can read what real people wrote — see below. Replaced the
12-area flow, which moved to `/test/life-mastery-v1`.

**Track is the one exception to all of that**: it pushes the plan's
goals into `user_goals` and renders the real goals hub on them, so the plan can
actually be run rather than only read back. See "Track — where the plan stops being a document" below.

## Reading what people actually wrote

The flow ran entirely in the browser, which meant the only way to learn where it
loses people was to sit next to one. `plan_snapshots` fixes that.

- **Migration:** `supabase/migrations/20260814_create_plan_snapshots.sql`. Run it
  before testing — nothing works without it, and the write route 500s.
- **Keyed by a random browser UUID** (`north-star-client-id` in localStorage),
  not an account, not an email, no IP. One row per browser, upserted, with a
  `revision` counter — a row per keystroke would be a million copies of the same
  plan growing by one word. `user_id` is present and unused, so the signed-in
  version can attach snapshots without a second migration.
- **RLS is on with no policies**, which in Postgres means `anon` and
  `authenticated` can do nothing at all with the table. The only way in is the
  service role, from `POST /api/plan-snapshots` (write, unauthenticated by
  design, validated by `planSnapshotService`: UUID-shaped id, 256 KB cap) and
  `GET /api/admin/plan-snapshots` (read, `X-Admin-Key` against
  `ADMIN_SECRET_KEY`, header only so it cannot land in a log or a referrer).
  An unauthenticated page writes here, so the entrance is one controlled route
  rather than a public insert grant.
- **The page says so**, in the footer, with the off switch beside it — and
  turning it off deletes what that browser already sent, because an off switch
  that leaves the collection behind is not an off switch.
- **This holds sex-life and health free text and the names of third parties.**
  It is not analytics. Before this goes anywhere near real users it needs a
  lawful basis, a retention job and a delete-on-request path; none of those
  exist yet, and the decision to defer them was taken knowingly.

Read it with:

```
curl -s localhost:3000/api/admin/plan-snapshots \
  -H "X-Admin-Key: $ADMIN_SECRET_KEY" | jq '.snapshots[] | {client_id, goal_count, updated_at}'
curl -s "localhost:3000/api/admin/plan-snapshots?clientId=<id>" \
  -H "X-Admin-Key: $ADMIN_SECRET_KEY" | jq -r .plan_text
```

## Shape

**Thirteen steps, and the order is the argument — until step 4, where it stops
being one.**

1. **North star** — the life you are aiming at, why it matters, who you would have to be.
2. **Your 10s** — the wheel, a rating and a picture of a 10 in each of the twelve areas.
3. **The one thing** — the single change that would make the rest far more
   likely, why it matters, who it asks you to be, and what has to happen for it.
4. **Where to start** — the fork. Three doors, no recommendation: brainstorm
   what you want, build the systems, or start with one routine.
5. **Templates** — the catalogue. Every area open, ten of each kind you can
   take, the rest a button away, and a box on every area for what the list made
   you think of.
6. **Systems** — what you actually do about it week in week out, the routines
   underneath it, and what each system is pointed at.
7. **Experiences** — everything you want to experience and have done in each area,
   written into one box at the top of the area: the achievement, where you are,
   by when, and the rungs it scales into. One-timers that are not goals (a trip,
   a car, an experience) live here too.
8. **Focus & season** — which two or three areas this season is about, picked on
   the wheel, and the two lists read back: what you want to experience, and what
   is running that would get you there.
9. **Values & identity** — what you are ranking your life by, in order.
10. **Commit** — read the whole plan back, name what could go wrong, and say yes
   to it in your own words, dated.
11. **Track** — what the next weeks look like, and push the goals into your
   real goals so they get counted.
12. **Today** — the one step that asks what you DID: today's list, ticked off,
   how each area felt, and a line about the day.
13. **Everything** — the plan, whole, on one page: the paragraph, the reason
   under it, who you said you are, what you hold yourself to, your
   affirmations, your values in order, the twelve areas with the 10 you wrote
   in each, the goals, the routines and the list of things to have done. Every
   block reads back as prose and carries one `edit` link that swaps it, and
   only it, into the box the writing step uses. See "The last step —
   Everything" below.

**Step 4 is a fork, not a stage.** Everything before it is one order because it
is one argument. After the one thing the order stops being an argument: wanting
first, systems first and one-routine-first are three different people, not three
stages. So the step asks which, and sends you to step 5, step 6, or straight
into one routine on step 6, expanded. `PathPicker`, `START_PATHS` and
`ROUTINE_DOORS`.

**Milestones and systems are two steps again.** They were merged into one page
with a switch under the wheel; the fork is what killed that, because a door that
lands you on a page with a toggle somewhere on it has not taken you anywhere.
They share one component (`MilestonesTab`, `step: BuildStep`) because the thing
you work in is identical — same wheel, same twelve areas, same builder — and the
rail is now the switch. The catalogue is not a third half: it rides along with
the systems step as a second tab (`templates`, owned by the shell so arriving
always lands on the work).

**The catalogue is a step, and it comes before both build steps** (2026-08-17,
user decision: "templates, then systems, then achievements"). `templates` is a
`NorthStarTabId` of its own between the fork and Systems, `BuildBoard` is the
page, and `SCORED_TABS` excludes it — like the fork it carries no ring, because
a dot on "have you had a look" scores browsing. What you take from it is scored
where it lands. `MilestonesTab` lost the tab strip that switched to it, so the
build steps show their step name, their count and the link to the other one.

On the board itself:

- **Every area open, ten of each kind.** It was twelve areas with everything
  under each, held down by pixel-height fades — a page that looks like it is
  hiding something. `TakeTen` shows ten sets, ten goals (capped across the
  area's objectives, not per objective — `capGroups`) and ten practices, with
  "Show all N in <area>" for the rest. A row you are done with folds away; an
  accordion that closed the other eleven lasted one build and was wrong.
- **A box on every area** (`AddOwn`, `onAddOwn` → `addGoalsFromDump`). The
  catalogue's real work is reminding you of the thing that is not in it — you
  read "wind-down routine" and think of the one you actually want — and that
  thought used to have to survive a trip to another step.
- **The routine line stopped lying.** "The goals here run on your Evening
  routine, and it is not in your stack yet" was printed at somebody who has an
  evening routine: every plan is seeded with the routine blueprints, so
  `routineNeedState` returns `partial` — exists, missing steps — essentially
  always, and the copy only had the `missing` sentence. Two sentences now
  (`BOARD_COPY.partialTitle` / `unmetTitle`), one per need rather than joined,
  with the button to match ("Add the missing steps to Evening routine").

**Taking something back is the same size of click as taking it** (2026-08-18,
reported from the page: "i might have clicked mind routine, but dont want it…
dont want to declick 8 manually"). One press on a set writes five to nine goals
and one press on a routine offer fills a card; undoing either meant a confirm
per row, or per step, several steps into the flow.

- `templatesInArea(plan, areaId)` says which sets an area is carrying and which
  goals are theirs — matched by title, the same way `targetAlreadyAdded` matches
  forward, since a goal does not carry the set it arrived in. Partial sets
  count: five taken and one deleted is still a set you can put back.
- `removeTemplateGoals(plan, areaId, templateId)` removes exactly those, and
  nothing the person wrote themselves. Idempotent.
- It is offered in both places the person could be standing: on the set's own
  card in the catalogue ("remove the 7 goals it added") and inside the area on
  Achievements ("Took a set you do not want? — Remove Mobility & Flexibility —
  7 goals"). Confirmed once, never silent.
- **A routine is dropped on its own card**, and no longer only in edit mode:
  `RoutineCard` shows the remove control whenever the card is open.
- **And taking a set back takes back what it put in your routines**
  (`templateFootprint`). Removing the goals while leaving the training week it
  brought running every Tuesday was a half-undo — "that doesn't make sense that
  it doesn't change". So: the goals, the steps the set's needs put in a routine,
  and the routine itself when it is not one of the four the plan ships with and
  has nothing else left in it. Two things survive on purpose — a step another
  surviving set still needs, and any step the person added themselves, which is
  why a routine holding their own work is emptied of the set's steps rather than
  deleted. The `keep` set is read off the plan **as it would be after the goals
  go**, because templates overlap by title: asked before the removal, half the
  Fitness catalogue looks "partly present" on the strength of goals that are
  about to vanish, and nothing is ever removed. Both confirms name the whole
  cost out loud: "Remove all 7? and the 1 step it put in your Evening routine
  and your Training week, which is only here for it".

**"Achievements" is "Experiences", the season is picked on the wheel, and the
plan reads back as two lists** (2026-08-18, user decision).

- The step is **Experiences** everywhere a person reads it (`TAB_LABELS`,
  `HALVES_COPY`, and the copy that referred to "the achievements step"). The
  model keeps `milestones` as the step id and `achievement` as the one-off goal
  type — renaming a model to follow a label is how "milestone" came to mean two
  things in the first place.
- **Focus picks on the wheel.** It was twelve cards under a step that had
  already shown the wheel twice: same names, same numbers, same click, which is
  the wheel again as a list. `AreaWheel` takes `selectedIds` and a `season`
  sub-mode — a picked sector lights and its sub-label becomes "#1 this season" —
  and the picked areas are listed underneath, in order, each with the first line
  of your own 10 for that area (which the cards carried and a wheel cannot) and
  a way to drop it.
- **Drivers on top, the wanting folded away, and a delete on every row.** This
  step is about what happens next, and what happens next is the rates — the only
  thing on the page you can act on today — so they come first. The list of what
  you want is the reference you check them against and the longest list in the
  plan, so it opens shut, with the finding still on the closed heading: "2 of
  them have nothing running at them — open it to see which." And reading the
  whole plan back in one list is exactly when somebody spots a line they do not
  want, so each row carries an × (confirm once, in place) instead of sending
  them two screens away to the area to do it.
- **Routine steps are drivers too** (2026-08-18, "where has deep work gone? i
  dont see it as a driver, even tho ive chosen the business routine"). It had
  gone nowhere: the list was built from `plan.goals`, and ninety minutes of deep
  work is a step inside a routine. So a block headed "the rates you hold and the
  things you do on an ordinary week" was showing the smaller half of them. Steps
  now list under the goal-shaped drivers, each saying which routine it is in and
  at what rate, opening that routine on Systems where a step is actually edited;
  the count includes them. The same blind spot made the whole section print
  "nothing written yet" over a business routine running five days a week — both
  emptiness checks now ask whether anything RUNS, not whether a goal exists.
- **"Your goals, across every area" is two lists** (`OVERVIEW_COPY`). One column
  called goals put "See the northern lights" next to "Train four times a week"
  and asked which came first, which is not a question. Now: **What you want to
  experience** — "nothing here is a plan and none of it is meant to be… the one
  question to ask of it: is anything you actually do going to get you there?",
  counted as "3 · 1 with something running at them" — and **What drives them**,
  the rates, in the order your energy goes in. The split is `isMilestone`, the
  same predicate the two build steps file by.

**The sweep for that whole class of bug** (2026-08-18, "check for all sorts of
these happenings across the goals etc., instead of me finding them one by one").
The reports so far had four shapes: a number silently moved into the wrong
field, copy asserting a state nobody checked, a list built from one source when
two exist, and the same total computed twice. Grepped for each shape across the
slice; six more instances, all fixed:

| Where | What it did |
|---|---|
| `shapeFromTitle` | The catalogue path was fixed for volume drivers and the TYPED one was not: "20 approaches a week" still ran through `clamp(20, 1, 7)` and came back as seven days. |
| `planAsText`, `GoalCard`, the link picker, `GoalOverview` | Six surfaces printed `${daysPerWeek}× a week` by hand, so the goal meaning twenty approaches read as "3× a week" — including in the text you sign. One `goalRateLabel()` now, called by all of them. |
| `systemMilestones` | Picked the "dominant" step at the ROUTINE's frequency while dividing by a total computed at the STEP's, so a stretch done once a week inside a daily routine looked seven times its size and could name the whole thing. |
| `routineWeeklySessions` vs `routineSummary` vs `presetCost` | Three definitions of "sessions a week" for one routine: max, sum, sum. One now, and the summary calls it instead of keeping its own copy. |
| The wheel on the build steps | Counted every goal in an area while the step showed one half of them, so an area holding one driver said "1 goal" over an empty Experiences list. It counts what the step shows. |
| `Generate` | Ticking a suggested "experience" wrote into `plan.experiences`, whose only surface was removed — a write into a store nothing reads. Both kinds land in the area as goals now. |

Left deliberately: `weeklyLoad.actions` counts sessions, not volume (twenty
approaches is three actions, and the meter is about time in the week);
`updateStep` still caps a step at 180 minutes, which is a real cap on a real
input and says so.

**"Approaches 20×/wk" was two questions in one field** (2026-08-18, "is it times
you went out or total approaches a week? those need to be different things").
They are different, and only one of them existed: `daysPerWeek` is days, so the
catalogue's twenty-approaches-a-week driver was `clamp(20, 1, 7)` — the number
the person accepted, destroyed, and then printed as "7× a week". `NsGoal` gains
`perWeek` (how much, counted in `unit`) beside `daysPerWeek` (how often).
`shapeFromTarget` fills it for drivers that count THINGS and leaves it null for
drivers that count turning up — `countsThings()` reads the label, because a
"…Sessions" driver is a frequency (four gym sessions IS four days) and the
framework has no field that says so. The row asks both ("How many days a week?"
and "And how many a week, if you count them?") and reads back "20 approaches a
week · 3 days". Saved plans load with `perWeek: null`, which is what every one
of them meant.

**Four things reported while walking it** (2026-08-18):

- **The whole list, on the page that writes it.** The Experiences step showed
  nothing you had written until you clicked an area, so checking whether you had
  already said something meant opening twelve of them. Everything so far now
  sits under the wheel, grouped by area and deliberately unranked — ordering is
  the focus step's job.
- **A header per routine on Focus & season**, instead of "in your business
  routine" repeated under every step: the routine's name, its colour and what it
  costs a week, with its steps indented under it.
- **The commit page can change the plan** (`COMMIT_EDIT_COPY`, `tools` on
  `CommitTab`). Reading it back whole is exactly when somebody sees the goal
  they no longer want, the one they forgot, and the driver pointed at nothing —
  and all this page could do about any of it was send them four steps back. It
  now carries a one-line quick-add into any area, the two lists with their
  deletes, and the systems step's "what is running at what" linking view.
- **Delete on every row of the focus read-back**, confirmed once in place.

**The scaling tool is on the achievements step** (2026-08-18). `MilestoneBuilder`
— the three shapes a climb comes in: weight and reps together, a number getting
bigger, and a written progression whose last rung is a different move — lived
only inside the goal dialog. So the step whose whole job is writing what you
want could set a target and a date and then had nothing to say about the road
between them; all it offered was a one-line "or write the steps yourself" box,
a third of the job. It is exported from `GoalCard` with its handler prop
narrowed to the two calls it makes (`onSetMilestones`, `onSetProgression`,
reaching `GuideHandlers.onMilestones` / `onProgression`), rendered on every open
row, and `WrittenRungs` is deleted — one tool where there were two. `Flat bench
100 kg` now scales to nine dated rungs from the row itself. Its written-rungs
example is per-area as well (`MILESTONE_COPY.ownNote` / `ownPlaceholder` take
the area's climb), because the moment it left the dialog it started showing
Money a set of pull-ups — the rule `AREA_GOAL_EXAMPLES` and
`northStarAreaBoxes.test.tsx` already enforce.

**The prompts under the box are the open area's, and nothing else** (2026-08-18,
"if i click money, the suggestions should only be around money that i see").
`WANT_EXAMPLES` was twenty across the whole life, shown under every area with a
coloured badge saying which area each belonged to — so opening Money offered a
muscle-up, a book and ten days of silence, and the one chip that answered the
question on screen was three rows down. It is six per area now, filtered to the
area you opened, and the badge is gone with the mixing: on a list that is all
one area it was the same word twelve times. An area somebody invented has none
and shows none, rather than borrowing another life's.

**The goal's name is the field, not a label above one** (2026-08-18, "if i
change a name of a goal, i cant actually edit the name"). The row was a button
printing the title, and the editable copy appeared one line below it once the
row was open — so the obvious move, click the name and type, opened the row and
did nothing, while the thing that worked looked like a duplicate of the line
above. `AchievementRow` now renders the title as an input at rest (transparent
until hovered, saved on blur or Enter); the chevron, the meta line and the
status chip open the row. The second editor is gone.

**Two numbers on that page were wrong, and one stack was chosen by nobody**
(2026-08-17, both reported from the page):

- **A routine need used to drag its whole preset in.** `applyRoutineNeed`
  applied `need.presetId` when it had to create the routine, so one goal in
  Friends produced a Connection routine holding four steps — and the catalogue
  then showed "Give one genuine compliment" and "Reach out to one friend"
  already ticked. Nobody had ticked them. It now adds only `need.stepIds`; the
  split still comes (a split is the shape of the week, not work added to it) and
  the presets stay one click away on the routine card. Same verdict as
  `seedSteps` returning `[]`: the click is the person's.
- **The weekly hours were billed at the wrong frequency.** A sequence routine
  was charged `all its minutes × the routine's days`, ignoring each step's own
  rate: two lines written three mornings a week were counted seven times. A
  morning routine of water 2 min ×7, move 20 min ×3, journal 10 min ×2 read as
  **3.7 h** and is **1.6 h**. `routineWeeklyMinutes` now takes
  `min(step.daysPerWeek, routine.daysPerWeek)` for a sequence (a step cannot run
  on a day the block does not) and the step's own rate for a weekly routine (ten
  thousand steps six days is not capped by a four-day training week), and
  `weeklyLoad` calls it instead of keeping a second copy of the arithmetic.

**The achievements step is the dump, and nothing else** (2026-08-17). It opened
on a Templates tab, a catalogue inside every area ("Or start from what people
set in Health"), a strip naming the lines that had been filed as systems, and a
Things-to-experience list at the bottom — four ways of being handed or told
something, on the one step whose whole job is getting what THIS person wants out
of their head. All four are gone from it:

- `templates` left the page entirely — it is step 5 now (above).
- `AreaOffers` — catalogue and the "Suggest some from my 10" panel with it — is
  gated to `half === "systems"` in `AreaBuilder`.
- The other-half strip (`elsewhere`) is systems-only. **Known cost:** a rate
  typed on the achievements step ("no weed 7× a week") is still filed as a
  system, and now moves there with nothing said. The line is in the plan and on
  the Systems step; it is not on the page you typed it into.
- `ExperienceList` has no surface on this step. The model (`plan.experiences`)
  and the component are untouched, and the AI panel on the systems step can
  still write to it — so anything already there is kept and unreadable. Either
  give it a home or take the writer out.

What replaces them is one box: `AreaWants`, above the area's 10 and identity
rather than under them, asking for everything in that area in any order, with
the copy saying out loud that prioritising and systems come later and that
leaving early is allowed. Every line lands as a real goal (`addGoalsFromDump`),
so `AreaBuilder` in the panel is `intake={false}` — it lists what the box wrote
and each row still opens into where you are, by when and what you will do. The
10 sits under the box because reading a picture of the finished thing first
narrows what gets written; `AreaReminder` renders nothing when neither the 10
nor the identity exists.

**Routines exist on the systems step and nowhere else.** A routine is always a
system and never a milestone, so the stack beside the wheel, the expanded
routine card, what a routine adds up to inside an area, and "what already runs
here" in the area builder are all gated to `step === "systems"`. Opening Health
under Milestones used to lead with hours and streaks read off the morning
routine, offered as milestones — the doing step answering the wanting step's
question, before the person had written anything of their own.

**"Achievement" is the word the person reads; "milestone" is a rung.** The step
is called Achievements, and so is everything on it, because "milestone" was
doing two jobs on one page — the thing you want to have done, and the dated
rungs on the way up to it, so "16 milestones" under a list of 5 was correct
twice and legible neither time. The model keeps `milestone_ladder`,
`milestoneGoals` and the `milestones` step id: renaming a model to follow a
label is how the two words got mixed in the first place.

**The achievements step lists achievements only, and says where the rest went.**
No whole-plan goal list and no year-as-things-to-hit timeline — both listed
everything, so a Tuesday run sat in the list of things you want to have
achieved, which is the distinction the step exists to draw; ordering lives on
Focus & season, which is the step about choosing between what is written. A
line typed here that reads as a rate ("workout 5× a week") is still filed as a
system, and it is not printed here in any form — not even as a grey chip under
the list, because "Consistent Bedtime" sitting under the things you want to
have achieved is the thing the split exists to stop. One muted sentence names
the count and the step it went to ("1 line you wrote here is a rate … lives on
the Systems step"), and that step does the showing. Filing a line somewhere
this page will never show it, and saying nothing, is how a text box loses
somebody's work.

**A line about something you are NOT doing is a system.** "No weed" is not
something you have achieved by March — it is a line you hold every day, which
is a rate. Read as an achievement it sat on the list of things you want to have
done, being asked when it would be finished. `readsAsAbstinence` covers the
unambiguous forms (quit / stop / cut out / give up / no more, plus bare "no X"
where X is something a person does), runs AFTER the rate patterns so "no
drinking on weeknights" keeps its five days, and deliberately does not catch
"no pain in my back" — filing that as a daily rate would be the page telling
somebody their back pain is a habit. `loadNsPlan` repairs the ones written
before the rule: type and rate only, everything else the person wrote survives,
and the three kind buttons in the row overrule it.

**Twenty examples under the intake box, badged by area.** The box takes one
line at a time with an Add button (a five-row textarea asks for a finished
answer, which is what nobody has yet), and under it sit twenty concrete wants
from across all twelve areas — "read a book" next to "buy a Ferrari 458",
because the pair is the permission. Each carries its area in the area's own
wheel colour and lands THERE when clicked, never in the area that happens to be
open; a taken one greys out with a tick rather than writing a duplicate.
`WANT_EXAMPLES` in `northStarStart.ts`.

**Two steps, two rings.** Step 5 fills when every milestone has a why and a
date; step 6 fills when something is running and no milestone is left with
nothing pointed at it. The join is scored where it can be fixed.

The third door is four doors, on the card rather than behind it: **morning**,
**evening** and **business** open the routine that already exists in every plan,
and **quit a vice** leaves for `/test/quit-vice`, because quitting is its own
piece of work with its own research under it and is not a routine.

**The fork carries no ring.** `SCORED_TABS` is `TAB_ORDER` minus `pick`: a ring
says how full a step is, and this one holds nothing — its doors write into the
steps they open. `stepState(plan, "pick")` is always `empty`, and the rail's
"every ring is reachable" invariant runs over `SCORED_TABS`.

**The goals come before the focus.** They were the other way round, which asked
somebody to choose the two or three areas of their season before they had
written down what they wanted in any of them — choosing between things they had
not named yet. You write everything, then choose. The ordering step on the focus
tab only works in that order too: there is nothing to rank until the goals exist.

**The values exercise moved late**, off the north star and into step 5, for the
same reason: ranking what matters is easier once you can see what you have
actually asked your life for.

**The last step is an act, not a form.** A plan that ends when the last box is
filled ends without anybody saying yes to it. `CommitTab` reads the plan back
whole, carries the old Review tab's work (what could stop you, do the goals aim
at the 10), and takes the commitment in the person's own words with a date on
it. `nsProgress.done.commit` ticks on that sentence, never on the boxes above it.

### The goals step is the wheel, and the step has an end

Tab 3 opened on a line of counts, a season banner and a card holding a builder,
six doors and a question queue — three screens before the picture of the life
they were about. It opens on the **wheel** now: click an area and its builder
appears underneath with that area's 10 as a reminder above it; click a routine
and its builder expands as before. The twelve 10s are no longer listed as text
under the wheel — that was the wheel again as words, and it pushed the work down
the page. The doors and the queue moved to a collapsed line *below* the work.

**One click used to open two editors.** The wheel's `openId` also drove the old
`AreaGoalsDialog`, so a single click opened the inline builder and a modal on
top of it. The dialog is now for one goal, opened deliberately from a goal row,
which is where its depth (the curve editor, obstacles, beliefs) is wanted.

**Preset times were hand-typed and wrong.** Every one of them, by 3 to 29
minutes: morning's "60 min" turned on 53 minutes of steps, evening's "30 min"
turned on 39, manifestation's "60 min" cost 31. `presetCost` derives the number
from the steps the preset actually turns on, so it re-prices itself when a step
changes and cannot drift again. The buttons now read `18 min · 6`, `53 min · 9`.

**The step has an end.** The only obvious way forward was the footer's "Focus &
season →", which walks somebody to the next step regardless of whether this one
is finished — while the flow's whole argument is that you write everything down
before choosing between it. The step now closes with what is still open in its
own words ("3 areas you pictured have nothing aimed at them", "1 goal names an
outcome with nothing you would do") and a button that reads **Move on anyway →**
until there is nothing left, when it turns green and reads as the finish. It
gates nothing.

### The guide: write your own, then be asked what is missing

The build board — every area, every set, every target, every practice, on screen
at once — lasted one afternoon. Fresh, tab 3 was **9.7 screens tall with 329
controls on it**, and it was built on the wrong premise: that the hard part is
choosing. It is not. A real list looks like *"ingen smerte i ryggen"*, *"bænk 28
kg 3x6-8"*, *"10 pullups, fra 7"*, *"1 muscle up"*, *"internationalt
bedstsælgende forfatter"*, *"Masters in League of Legends"* — and the 166-target
catalogue contains approximately none of it.

So `GuidedBuild` is three steps, and the middle one is five doors:

1. **Your season.** Pick two or three areas, in order (`seasonAreaIds`). Add your
   own — people's areas are Dating, Virksomhed, Morgenrutine, not ours. Each area
   card carries the first line of your own 10 where its generic sublabel was:
   "Energy, Vitality, Well-Being" is what the area is called, what you wrote is
   why this is the one to pick.
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

### Five doors into step 2, because the box assumed the hard part was typing

The guide asked the right questions of a goal that existed and had nothing to
say about the moment before that: a heading, a text box, and a cursor. The
premise was wrong in the same way the board's was. The hard part is not
choosing, and it is not typing either — it is that *"what are your goals"* is a
question almost nobody can answer cold, while every one of the same people can
describe a good Tuesday.

So step 2 opens on a chooser (`START_RAMPS`, `northStarStart.ts`), and every
door ends in the same place — lines through `addGoalsFromDump`, then the queue.
**The six doors are a permanent row** (`RampBar`): the first version opened a
returning plan straight into the text box, which hid every new way in behind a
default — the same failure this screen exists to fix, one level down. The first
user through it said "I don't see the flow as being changed", and they were
right. The row is on screen the whole time, the step's sub-label reads "6 ways
in", and the queue links back to it.

- **I know what I want** — the box, unchanged.
- **Start from my 10** — `tenCandidates` cuts the area's `review.ten` on line
  breaks, sentence ends and semicolons, drops anything under eight characters
  and anything already a goal, and offers the pieces **unticked**. The split is
  mechanical because it cannot tell "I wake up without an alarm" (scenery) from
  "I bench 28 kg" (a goal) — the person who wrote the paragraph does that in
  four seconds. Under it, the one question the rating makes possible and nothing
  else on the page asks: *you rated this a 4 and described a 10, so what is the
  first thing that would make it a 5?*
- **Describe my ideal day** — a written Tuesday (a working day: anybody can
  picture a good Sunday and it asks nothing of you). `parseIdealDay` reads the
  clock faces and **leaves bare numbers alone** — "10 pull-ups" is a line people
  write in a day, and a parser greedy enough to read the 10 as ten o'clock eats
  the best line on the page. Length comes from the gap to the next timed line,
  clamped to 5–90 minutes, or a plan claims thirty-five hours a week of morning
  routine. Every line's destination shows before anything is added: **tracked**
  by default (a routine step on all seven days, at that hour, in the routine
  that owns it — `DAY_WINDOWS`: morning before 09:00, the working day until
  17:00, evening after), or **a goal** for the lines with a real target in them.
  Areas are guessed by `guessAreaId` from a keyword table, English and Danish;
  a word two areas both claim is dropped from the index rather than arbitrated,
  and an unplaceable line says "pick an area" and blocks the Add rather than
  quietly landing in Health.
- **Ask me questions** — five questions that are easier than a blank page
  (what you have been meaning to do for a year, what is annoying you week in and
  week out, what the person you want to be would have done this week). Answers
  are kept in `plan.answers`, so the three lines you did not tick are the next
  three goals a week later.
- **Things to experience** — the bucket list, and the reason it is not the goal
  list: "see the northern lights" put through the goal machinery gets asked
  where you are today and what it costs you if you never do it, and neither
  question has an answer. `NsExperience` carries no date, no rungs and no
  queue — write, tick off, and `promoteExperience` turns the one you decide to
  chase into a finish-line goal (never a climb, whatever numbers are in the
  sentence) while the line stays on the list, marked.
- **Block out my week** — `WeekGrid`. Not a picture of the plan: every block IS
  a routine step, which is why `NsRoutineStep` gained `days` (0-6, Monday first)
  and `startMin`. Click a slot to draw one, click a block to edit it, or pick
  something out of the tray — everything already running that has never been
  given a time, which the first time you open it is all four routines. Taking a
  block off the grid unplaces the step rather than deleting somebody's routine.
  `daysPerWeek` is kept equal to `days.length` in both directions, or the load
  readout disagrees with the picture directly above it, and the picture is the
  one people believe.

`plan.answers` keeps what the two writing doors typed, under a `start:` prefix.
The loader's allow-list — right for prompts, which get deleted — was dropping
them, so a written-out Tuesday survived until the page was refreshed and not one
second longer. Fixed with the prefix and a regression test.

### The thread across the notes, and the mechanism that did not work

Every field that asks what is in the way — each area's blockers and snapshot,
each goal's obstacles and beliefs — was read one at a time and never across, so
somebody could write the same obstacle into four areas and get four unrelated
notes. Reported by the first user through: "I wrote on my various things that a
major reason why I couldn't reach a bunch of my 10s was weed, and your system
hasn't picked up on this."

**The first fix was wrong and is worth recording.** `recurringBlockers` split
those fields into words, dropped a stopword list, and reported anything in two
or more areas. It passed a test containing the word "weed" and, on the first
real plan it met, produced **"dont"** — then offered "Deal with dont" as the most
important thing of the season. Word frequency finds what somebody types most,
not what is in their way, and the stopword list is not the bug: every wrong word
can be added to it, the next plan brings different ones, and what accumulates is
a lexicon that must grow forever and still cannot tell a noun from a negation in
two languages.

So it is a judgement, and judgement is what the model call is for. `findThread`
reads the notes area by area, must quote **at least two sentences from two
different areas** or return `found: false`, and returns the thing plus what it
is costing and one thing to start this week. It is a button, not something the
page volunteers, and the finding is shown with its own quotes so it can be
argued with rather than believed. `tests/unit/goals/northStarService.test.ts`
keeps the "dont" plan as a regression: nothing in the deterministic path may put
a word like that in front of somebody.

**The signed-out trap, and what it now says.** This page works signed out on
purpose; the route behind this one button does not, because it calls a paid
model and is gated to `ALLOWED_AI_EMAILS`. Signed out, every press returns 403 —
and the panel used to report that as *"That did not come back. Try again"*,
which sends somebody round a loop that cannot succeed. 403 is now its own state
with its own sentence, saying that this one button needs a signed-in allowlisted
account and that the rest of the page does not. Covered by
`tests/e2e/life-mastery-thread.spec.ts`, which stubs 403, 500, `found: false`
and a real finding rather than calling the model.

**The bug behind "it gave me nothing", and the two real causes.** Signed out,
the route 403s — that is the first cause, and it now says so. The second was a
genuine defect: `THREAD` and `GENERATED` capped their string fields
(`suggestion` at 120 characters and so on), so a reply that was correct in every
way except that one sentence ran a few characters long **failed the Zod parse**,
which `ask` throws on, which the route reported as an error. A good finding was
being discarded over punctuation. The caps have moved out of the schema and into
`clamp`, applied after parsing, and the prompt now states the same limits so it
rarely fires. Structure is still strict — a missing field or a number where a
title belongs still fails loudly.

Everything that looks like "nothing" now reads differently: **403** (sign in),
**CLI not found / not logged in / timed out / unreadable reply** (each names its
own fix, via `generateFailureReason`), and **`found: false`** — which is a real
answer and says so, because a tool that has to find a pattern will always find
one. Verified end to end against the real CLI: a three-area weed thread comes
back in about ten seconds with its quotes, and two unrelated notes correctly
return `found: false` rather than erroring.

Covered by `tests/unit/goals/northStarGenerate.test.ts` (the schemas must accept
an over-long string; `clamp`; every branch of `generateFailureReason`, including
that it never tells somebody to retry a condition retrying cannot fix) and
`tests/e2e/life-mastery-thread.spec.ts` (403, 500, `found: false`, and a real
finding, all stubbed — no model call, so the suite costs nothing).

### The one thing, offered rather than asked for

**What is offered is actionable or it is not offered.** The first version
sourced candidates from the 10s and duly offered somebody *"I wake up happy and
excited to start the day"* as their most important thing this season — scenery,
with no Tuesday on which you can do it. The 10s are written as states because
that is what "what does a 10 look like" asks for, which makes them the wrong
source. `readsAsActionable` is the gate: a number, a frequency, or a leading
verb; first-person state openers ("I am", "I feel", "Jeg vågner") are rejected.

Ranked: the recurring blocker, then goals already written (actionable by
construction — they went through "is this yours to decide" and "what will you
actually do"), then the actions written under them, then clauses of a 10 that
name a number. The north star and the identity answers are deliberately absent:
they are what the one thing is aimed AT, and offering them back as the thing
itself is how somebody ends up with "I wake up happy" as their season. An
unrated area is silence, not a zero, and never sorts to the top.

**Turning a 10 into something you would do** is the one job no regex can take.
The generate button in the 10 door runs in `mode: "actions"` — a different
prompt that reads the state and returns things with a number or a frequency in
them, each quoting the part of the 10 it came from.

Clicking one fills the sentence and, when the candidate IS an area or a goal,
points `seasonFocusId` at it too — so the banner and the wheel agree with the
sentence instead of merely quoting it. By this tab somebody has written a north
star, said who they must become, and pictured a 10 in every area they care
about; asking them to type the single most important thing on a blank line
under all of that is the blank page for the third time on one page, and the
answer was already on file.

### Selected state, and how to delete things

Two things the first user through could not tell:

- **"I'm not sure when I've clicked a morning routine on."** The step library
  had it backwards: picking a step dimmed its text to `zinc-400` while unpicked
  steps stayed at `zinc-100`, so the list read as *everything is on except the
  thing I just clicked*. On is now the bright state — white, medium weight,
  "on · tap to remove" beside it — and the section header counts what is on.
- **"How do I delete or deselect goals?"** Every remove control was
  `opacity-0 group-hover`: invisible until hovered, and on a touch screen
  non-existent. They are visible at rest now — goals, experiences, ideal-day
  lines, routine steps and split days. The goal row's delete gained an inline
  confirm at the same time, because an always-visible X on somebody's writing
  needs one.

### One model call, behind one button

`northStarGenerateService.ts` + `POST /api/test/north-star-generate` is the only
thing on this page that leaves the browser. Everything else is deterministic,
which is right — offline, free, testable, and it never invents a goal nobody
meant — and it has one hard limit: it can only rearrange what somebody already
typed, and the person who cannot type anything is who the doors are for.

Claude Opus 5, one call per press, a Zod schema capping the answer at 8 goals
and 12 experiences. Candidates arrive **unticked**, each with one line saying
what in the person's own words it came from — without that the list is an oracle,
and an oracle is not something you can disagree with. It sits in the three doors
that hold free text: the 10, the five questions, and the experiences list.

Guards, same as every other AI route here: **off in production**, allowlisted
accounts only, 4000-char input cap, and only the fields the ask needs are sent —
never the whole plan, never the north star, never the ratings. The button says
what it does before it does it, and the copy claims no privacy the page cannot
keep: this page already mirrors plans to a server table, and this additionally
sends the text to Anthropic.

**Nothing is preselected any more.** Routines used to arrive carrying fifteen
steps across four routines before anybody had written a word — generous while
you build it, a demand when you meet it ("too many things are preselected, I feel
overwhelmed"). `seedSteps` returns `[]`; every blueprint keeps three presets, so
the whole stack is one click away. The difference is whose click it is.

**The empty tab.** Before there is one goal, the cascade line reads zeros, the
timeline says nothing is dated and the catalogue has nothing to offer. All three
are hidden until the first goal exists. The wheel stays — it is the only thing
on the screen already carrying the person's own work — and under it `TensReminder`
lists every area with a 10 written, its rating beside it, because that pair is
how you decide which area to write in.

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
- **The step opens with the work already done, not a blank list.** By step 9 the
  same question has been answered in five or six boxes — a word tapped off the
  menu on the first list, a chip clicked inside Health, a value hung on one goal,
  a paragraph that says "my kids" twice — and every one of those answers used to
  be thrown away the moment its box closed. `valueEvidence(plan)` gathers them:
  one row per value, every box it turned up in, how many times, and its place on
  the order if it ever got one. `ValuesSoFar` renders it above both halves of
  `ValuesWork`, split into **named but not on your order yet** and **on your
  order**, so the finding — you wrote Vitality under three areas and it is
  deciding nothing — is the first thing on the step.
  - **Where-chips are live.** Each one opens the box it came from: an area chip
    reopens that area's dialog on step 2, a goal chip opens that goal on step 7.
    "You said Freedom under Career" is only useful if you can go and re-read it.
  - **A click and a guess are drawn apart and never merged.** Values read out of
    prose by cue word are dashed, labelled `read from your writing`, and sort
    below anything picked by hand however loudly they were cued. `chosen` on the
    row is the flag. Nothing is ever added for you — the list that decides your
    Tuesdays stays authored.
  - **A box that was clicked is not also credited for cueing.** Health showed up
    twice on every row where somebody had both written a 10 and clicked a chip in
    it, once as the click and once as our reading of the paragraph beside it. One
    box listed twice reads as a bug; the click is the better evidence and the
    guess next to it is dropped.
  - **Places and hits are both kept.** "You keep coming back to this" (three cue
    hits in one paragraph) and "you said it in three different rooms" (three
    boxes) are different facts, and collapsing them loses the first.
- **Breadth is the weight, and it is a colour, not a score.** The first cut of
  the roster printed `named 3 times, across 3 places` as prose mid-row, which is
  a sentence you have to parse eleven of rather than a column you can rank. Two
  problems under that: **volume is not breadth** — a value named in Health,
  Relationship and Money runs through three parts of a life, one named three
  times inside Health runs through one part loudly, and both read as "3 places"
  — and the areas were invisible as areas although every `NsArea` carries the
  wheel's `color`. So `NsValueEvidence.areas` is the distinct areas a value was
  named in, **in wheel order** so two rows print the same colours in the same
  run and can be compared by eye, and the row leads with one dot per area in
  that area's own colour, then `3 areas · 3 times` right-aligned in a fixed
  column. The sort is breadth-first inside each of the clicked and cued groups.
  **No score.** A computed number deciding which of somebody's values outranks
  which is the authorship this flow does not take; the dots report what they
  wrote and the ordering downstairs is still theirs.
- **Five rows, then the rest.** Clipped by count, not height — `PeekButton`
  rather than `Peek`, the same call the value library makes — because a height
  clip cuts through the middle of a row and half a value with its evidence
  sliced off is worse than five whole ones. A twelve-area plan makes thirty of
  these, and thirty rows above the exercise is a wall, not a head start.

## Track — where the plan stops being a document

Ten steps produce a plan in localStorage. Nothing in it moves on a Tuesday, and
a plan that is only ever read back is a plan nobody runs. Track is the one
place the flow crosses over.

**What it does.** Lists every goal in the plan with what it becomes over there,
pushes the ticked ones to `POST /api/goals/batch`, and then renders
`GoalsHubContent` — the same component `/dashboard/goals` renders — directly
underneath, on the rows it just created. Tracking happens on the page the plan
was written on.

**The step opens on what you will actually be doing, not on a goal list.**
`TrackSchedule`, above everything else, with a week/day toggle:

- **By week** — a grid, routines down, eight weeks across, the count in each
  cell. This is the only place the plan says what it turns *into*: a driver
  ramping 2× → 3× → 4× is a different promise from 4× starting Monday, and the
  week it steps up is marked rather than left to be found by comparing columns.
  A total row underneath says how many times a week the whole thing costs.
- **By day** — the next seven days from today, with what sits on each and at
  what time. Only things that have been given days are drawn; a driver saying
  "4× a week" names no Tuesday and is listed underneath as "runs weekly, no day
  chosen" instead of being invented onto one.

**Nothing in it is listed flat.** Reported as: "read your north star and so on
— let them be part of the morning routine in a visual way, as parts that fall
out of it." They are right. "Read your north star out loud" is not a task; it
is the third line of a stack you run once, at seven, and listed as a peer of
"bench press" it reads as one more chore on a list of nineteen while the stack
itself is nowhere on the screen. So both views are **headers first**: one per
routine, the steps folded inside, and a chevron to open one.

`trackGroups` (pure, in `northStarTrackService.ts`) decides the grouping and
the order for both views, so a step cannot sit under one header in one and a
different header in the other. Three decisions in it:

- **Grouped by routine id, not label.** Two routines are allowed to be called
  the same thing, and one header holding both would be a lie about the plan.
- **Ordered by the clock**, earliest first — morning, work, night — because the
  only ordering a day has is the clock. A routine whose steps have no time yet
  keeps the plan's own order *behind* the timed ones: it is unplaced, not last
  thing at night.
- **Drivers get one group at the end, "Any time this week."** A driver says
  twenty approaches a week and names no hour, so it has no position in a day
  and inventing one would put it at midnight.

Defaults, per view: the week grid opens every header (it is a table of numbers
and the grouping is what gives it its shape); a day opens only today's (six
open stacks is the flat list this replaces). The step's own sub-label is
dropped when it only repeats the header above it — a routine filed under no
area borrows its own name for one, and the line read "Morning routine" under
every step of the morning routine.

**Today's steps tick off here**, inside the header, writing to `plan.logged` —
the same store the Today step reads, so the two agree rather than keeping two
tallies of the same morning. Only today: a tick is a record of something you
did, and a checkbox on Thursday invites a log that says you did Thursday on
Monday. Other days show their steps read-only, and the header carries "1/4" for
today and a plain count for the rest.

**Which view opens first is decided by the plan.** The day view leads, since it
is the one you work off — but it can only draw what has been given days, and a
plan whose steps say "5× a week" and name no Tuesday would open on seven cards
reading "Nothing on". That plan opens on the week grid instead. Once somebody
picks a view, their pick stands.

**Milestones and experiences are not in it, on purpose.** Reported as: "milestones
are not that, they are separate from what we track each week." They are right —
"bench 100 kg" and "see the northern lights" are what the doing is *for*, and a
weekly grid holding them reads as a week you failed at them, every week, until
the one you did not. The schedule is built from `isSystem` goals and routine
steps only; `trackActivities` is the one place that decides, and a test asserts
a milestone and an achievement never appear in it.

Ramps come from the goal's own `rampSteps`, walked week by week
(`activityPerWeek`); past the end of the ramp it is the steady rate.

**The embedded hub is scoped to this plan.** It shipped unscoped and that was
wrong on the first look: reported as "you're just pointing to the goals page,
it doesn't represent ONLY the things I picked". A hub showing every goal on the
account does not answer "is the plan I just built running" — it buries it under
everything else. `GoalsHubContent` takes an optional `scope`
(`{ templatePrefix, title, subtitle }`); the track step passes `ns:<run>:` and
gets its own goals and nothing else, with a line underneath pointing at
`/dashboard/goals` for the rest. Every other caller passes nothing and is
unchanged. Pruning is `pruneTreeByTemplatePrefix`, which **promotes** a matching
goal whose parent does not match rather than dropping it with the parent.

Two things a scoped hub turns off, because they would appear to work and not:
the controls that create goals (New Goal, Setup Preview, Browse Catalog, Setup
Wizard — a goal made there gets no matching tag and vanishes on save), and the
"Life" view, which fetches its own tree straight from the API and would show the
whole account inside a view claiming to be one plan. Incrementing, editing,
reordering, milestones and the weekly review all still work on what is shown.

**What it will not do.**

- **It does not push on its own.** Writing to somebody's real goals is not a
  side effect of opening a tab. Nothing moves until the button is pressed.
- **It does not push twice.** Every row is tagged
  `template_id: ns:<run>:<plan goal id>` and `createGoalBatch` already dedupes
  on `template_id`, so a second press picks up what is new and leaves the rest,
  including the progress on it.
- **It does not touch anything else.** A goal made by hand has no `ns:` tag and
  is never matched, updated or counted here. Everything this created is
  `template_id LIKE 'ns:%'` — findable, and removable, on its own.

**Signed out it says so and stops**, rather than failing at the button. The
other ten steps ask nothing of you; this one is rows on an account.

### The run id, and the reset that would otherwise collide

Plan goal ids are `g1`, `g2`, … off `plan.seq`, and **"clear everything" sets
that counter back to zero**. A tag of `ns:g1` would therefore name two different
goals on two sides of a reset, and the dedupe would map the new one onto the old
one's row: a goal that never appears, under a title from a plan you threw away.

So the tag carries a run id — `NS_TRACK_RUN_KEY` (`north-star-track-run`),
minted on first load and **reminted by `reset()`**, which is exactly the
boundary `seq` restarts on. It is its own localStorage key rather than a field
on the plan: it is about where the plan has been sent, not about the plan, and
nothing that loads a saved plan should have to migrate for it. Note that
"clear the goals, keep my 10s" (`resetGoalsAndFocus`) keeps `seq`, so it needs
no new run and gets none.

Goals already tracked are left alone by a reset. They are real rows with real
progress, and deleting somebody's goals is not what "clear this page" asks for.

### The mapping, and the one shape that had to be refused

`northStarTrackService.ts`, pure. Three shapes in, three out:

| Plan | Becomes | Because |
|---|---|---|
| driver (`habit_ramp`) | weekly counter, target `perWeek ?? daysPerWeek` | a rate you hold. Twenty approaches a week and four gym days a week are different questions and the plan already keeps them apart |
| target (`milestone_ladder`) | counter, `current`=start, `target`=target, `milestone_config`=the ladder | a number you climb, and the hub draws the same rungs the plan drew |
| finish line (`achievement`) | boolean, target 1 | done or not done |

**A descending ladder is refused as a counter.** `computeGoalProgress` is
`current / target` and completion is `current >= target`, so "95 kg now, 85 kg
by June" pushed as a counter reads 100% and completes on the day it is created.
It goes over as a finish line instead, with both numbers written into the
description. A goal that lies about itself is worse than a goal that counts
less finely.

**Twelve areas stay twelve.** The hub has five configured life areas; the wheel
has twelve. Folding twelve into five makes Health and Fitness one bucket and
Family, Friends, Fun and Contribution all "Custom" — the wheel, thrown away on
the way out of the door. So `areaSlug` gives each area its own id
(`lm_` stripped; a custom area slugged from its label) and
`getLifeAreaConfig` degrades gracefully for one it does not know, title-casing
the id as the name. Twelve named groups with the generic icon, rather than five
with the right icons. Icons for eight new areas are a decision for
`iconRoles.ts`, not for a mapping function.

**Parents.** `feedsGoalIds` becomes `parent_goal_id`. Within one push the batch
route resolves `_tempParentId` only against temp ids it has already inserted, so
`buildTrackInserts` emits parents first. A parent that is **already** in the hub
gets its real uuid instead — which is what makes pushing five goals now and five
next week build the same tree as pushing ten at once, rather than ten orphans.

### Two bugs this uncovered, both silent

**The hub was archiving the whole plan on first render.**
`GET /api/goals/tree` sweeps up any goal whose `template_id` is not in
`GOAL_TEMPLATE_MAP` and archives it. Every pushed goal carries an `ns:` tag that
is deliberately not in that registry, so the push returned 201 and the goals
were gone by the time the hub underneath finished loading. Nothing errored
anywhere. `getOrphanedGoalIds` already carried a comment predicting exactly this
for `fw:` goals — "would wipe a user's whole plan on first load" — so the
namespaces are now declared in one place, `src/goals/data/templateNamespaces.ts`,
read by both the producer and the sweep.

**`motivation_note` was accepted and dropped on every create.** Both
`CreateGoalSchema` and `BatchCreateGoalSchema` take it; neither `createGoal` nor
`createGoalBatch` ever wrote it. Only the update path set it, which is why
editing a goal appeared to add a field that creating one could not. The why is
the fuel; a plan that loses its reasons on the way in is a list of chores. Both
insert paths write it now.

### Verified

`tests/unit/goals/northStarTrack.test.ts` covers the mapping, the tag, the
ordering and the archive exemption, and — for the grouping — that a routine's
steps land under it rather than flat, that headers sort by the clock with the
unplaced ones behind them, that two routines sharing a label stay apart, that
drivers gather into one group at the end, and that a group's "1/4" counts the
day's own ticks and never counts a driver. `tests/e2e/life-mastery-track.spec.ts` runs
the crossing against the real database on the shared test user: the list reads
back before anything is written, the push creates three goals of three shapes,
the why arrives with them, a second push from a fresh load finds them instead of
repeating them, and the embedded hub shows them. It deletes exactly the rows it
created, by id — never `DELETE /api/goals`, which would take the account's whole
goal list. Serial, because both tests push the same plan to the same account.

### Still open

- **The push still sends everything; only the schedule is filtered.** A
  milestone pushed from here becomes a real goal and shows in the hub below —
  it is just not in the week grid, because it is not a weekly activity. If the
  milestones should not be pushed at all yet, that is a one-line change to what
  `buildTrackInserts` defaults to.

- **`aligned_values`, `milestone_config` and `ramp_steps` cross over; the rest
  of the goal does not.** Obstacles, beliefs, checkpoints, the reasons drill,
  the pain-why, belief and desire levels have no column and are not sent. They
  stay in the plan, which is still the document.
- **The plan is per-browser and the goals are per-account.** Opening the flow on
  a second machine mints a second run id and would push a second copy. The plan
  itself does not sync either, so this is consistent rather than fixed.
- **Nothing pushes back.** Ticking a goal off in the hub does not mark anything
  in the plan. The plan is what you decided; the hub is what you are doing.

## Wired into the product

It was a test page. It is now the goal flow the product actually uses, and the
setup wizard it replaced is archived rather than deleted.

| where | what is there now |
|---|---|
| `/dashboard/goals/plan` | **Life Mastery, live.** Same guards the wizard had (signed in, paid), standalone shell, back link to the hub instead of to `/test`. `?step=<tab>` opens a step — an unknown step opens at the start rather than 404ing |
| `/dashboard/goals/setup` | redirect to `/dashboard/goals/plan`. Kept because it is in bookmarks, in the mobile tab bar's hidden-route list and in old links |
| `/dashboard/goals` | an empty account redirects to the plan, not the wizard. The hub's "Your plan" button and its "Life Mastery plan" menu item both open it |
| `/test/archive/goal-setup` | **the old onboarding, still working.** Not a mock: it writes real goals to the account and returns to the real hub, exactly as it did in the product. Listed under Archives on `/test` |
| `/test/life-mastery` | unchanged — the same flow, with its `/test` back link |

The three e2e specs that cover the wizard (`goals-tour`, `mobile-goals`,
`goals-cross`) now point at the archive route, so the coverage moved with the
flow instead of being deleted with the URL.

**Nothing about the flow itself changed.** It is still localStorage-first —
twelve of thirteen steps touch no API — and Track is still the one step that
writes, pushing `ns:<run>:<goal>` rows into `user_goals`. Being live means the
account is there when Track is pressed, not that anything else now needs one.

### The one thing and this season, on the tracking dashboard

Reported from the page: "I want it to go on this page, keeping the old
functionality, but linked to the new way of doing things. I also want the one
and our season's priority at the top."

`SeasonBand` sits above the stats on `/dashboard/tracking`: the one thing, the
season's areas as coloured chips, "N of M done today" and a link straight into
Today (`?step=today`). Everything already on that page is untouched.

Two decisions in it worth keeping:

- **It reads the plan where the plan lives** — localStorage, the same key the
  flow writes. So on a second browser it says "build your plan" rather than
  pretending the account has none. It costs no request.
- **An untouched plan counts as no plan.** Merely opening the flow writes one,
  so "is there a key" would have put *Nothing named yet / No areas picked yet*
  at the top of the dashboard of somebody who has never filled anything in.
  `planIsUntouched` decides, and the invitation shows instead.

## The last step but one — Today: the only screen that asks what you did

Everything else in the flow is a decision. This one assumes the deciding is
done and asks the question a plan needs answered over and over — **did you do
it** — with as little between the question and the answer as possible. One
list, today's date at the top, nothing to configure.

**What is on today comes first**, then everything else that runs weekly, still
inputtable. A plan that only accepts the sessions it predicted quietly
under-counts the weeks somebody actually had: approaches done on an unplanned
Wednesday still happened.

**Three lists, because the plan gives three answers about today.** Reported as:
"I need to be able to differentiate between things I am supposed to do today,
things I might do today, and things from my weekly or monthly or yearly list
that I might check off." `TodayItem.when` was a boolean and the middle answer
fell into the false half — the weekly review and the piece of content written
once a week sat in "everything else that runs" beside Thursday's stack, which
reads as *not your problem today* for the two things that are exactly today's
problem if today is the day you do them. `todayWhen` now returns three:

| `when` | what the plan said | where it goes |
|---|---|---|
| `today` | days include today, or seven a week | today's list, and today's count |
| `anyDay` | a rate naming no day: once a week, twenty a week; every driver | **Any day this week** — tickable, not counted against today |
| `otherDay` | placed, and placed elsewhere | **On other days** — still tickable, since you may have done it anyway |

**Every row says how often it runs** (`cadenceLabel`): "Every day", "Weekdays",
"Mon · Thu" while the days still fit on a line, "Once a week", "3× a week", and
a driver's own unit — "20 approaches a week". A business routine holding "one
most important task" and "write a piece of content" as identical rows, one
daily and one weekly, with nothing on either saying which, is a list that
invites a tick on the wrong day.

**Every header has a way out of the list.** You find out a routine is wrong by
running it, and the screen where you run it is this one — 07:00 turns out to be
a 21:00 thing, the weekly review wants a day. Each group header carries a
`change` link: a routine opens **expanded, on the Systems step** (the same
`setOpenRoutineId` + `setTab` jump the wheel and the area dialogs make), the
driver group opens Systems, and the section below opens Experiences. Before
this, Today was tick-only and the sole way out was "not counted yet" on an
unpushed driver.

**And one folded section for what is not a rhythm at all** (`standingItems`):
milestones, soonest date first, and the experiences after them. Only the
experiences tick — they carry `done`/`doneOn` on the plan, so a tick has
somewhere true to live. A milestone does not: its progress is the goal row in
the hub once pushed, and a second tick here would be a second tally disagreeing
with the first, the same trap the unpushed drivers avoid. Neither counts
towards today, for the reason neither is in the week grid.

**Both lists are grouped, not flat**, by the same `trackGroups` the schedule
uses — one header per routine, in clock order, steps folded inside, and the
driver group last. Reported against the old flat version: nineteen lines
reading "Read your north star out loud — Morning routine · 2 min" hide the four
stacks they belong to, and the routine name repeated under every row is the
header the list was missing. It is a header now, carrying the clock time and
"1/3" for the day; the row underneath keeps only what the header does not, its
minutes. Today's list opens; "everything else that runs" stays folded, since it
is by definition what did not come up today. `groupSummary` lives in the
service beside `trackGroups` so the two screens cannot drift apart on the
wording.

### Two stores, and the row says which one it is writing to

- **A routine step is not a goal** and never becomes one — "cold shower" is a
  line in a morning stack with nothing on the other side to count it. Its tick
  lives on the plan, in `plan.logged` (date → step ids), beside the step.
- **A driver IS a goal.** Once pushed on the track step it is a row in
  `user_goals` with a target and a period, so the count goes there:
  `POST /api/goals/{id}/increment`, then a re-read rather than a local guess,
  because the goal may have rolled into a new week between the page loading and
  the button.
- **The week the count belongs to is `period_start_date`, and it expires.**
  `current_value` is the count for that period and no other, so it is rolled
  before it is read: `rollGoalPeriods` runs in `GET /api/goals` (what Today
  fetches), in `GET /api/goals/tree`, and inside `incrementGoalProgress` so a
  `+1` cannot land on a week that is over. Weeks are Monday-based **in the
  user's timezone** — a count runs to Sunday 23:59 and starts again at Monday
  00:00 — and the boundary is formatted off the wall clock (`periodStartFor`),
  never via `toISOString`, which converts to UTC first and moves the day.
  Today showed last week's number as this week's for exactly as long as
  `/api/goals` did not roll. Pinned by `tests/unit/goals/goalPeriodRoll.test.ts`
  and `tests/unit/goals/goalsReadRolls.test.ts`.
- **A driver that has not been pushed is shown and cannot be counted**, with a
  link to the step that fixes it. It deliberately gets no local tally: a second
  count would disagree with the real one the moment it was pushed, and the loser
  of that disagreement is whichever number the person happened to trust.

### How today went

The twelve areas, each with the same 0-10 row the wheel uses (`ScoreRow`), and
**the same store** — `plan.daily`, which is what `dailyAverage` on step 2 reads.
Rating a day here moves the rolling average there: two screens asking one
question, not two questions. Clicking the same number again clears it, as
everywhere else.

Under it, one free-text line about the day (`plan.notes`, by date), committed on
blur rather than on each keystroke — it sits under a list whose every row
re-renders on a save, and typing a paragraph through that is typing into a page
that moves.

### Your own text fields

Reported from the page: "something like my daily thing I track of 'one key
learning of today' or these kind of text fields — allow me on the Today page to
assign a text field to whatever goals I want."

The plan could count a thing, rate an area and hold one note about the whole
day. None of those is a question hung off the goal that provoked the answer,
and that is the entry most people already keep by hand.

So: **any number of named text fields, each attached to whatever it belongs
to** — a driver, a routine step, a milestone, an experience, or the day itself
— declared once on the plan (`plan.fields`) and answered by date
(`plan.journal[date][fieldId]`). A field appears as a write box on its own
row, so "one key learning" is written next to the thing that taught it; the
ones attached to the day sit under the day's note.

**Made in one place, answered everywhere.** Naming a field, moving it and
deleting it happen in *Your own text fields* at the bottom of the screen, so no
row on the list above carries three controls it needs on the day it is set up
and never again. The picker (`fieldTargets`) offers every part of the plan
grouped by the header it appears under on Today — including milestones and
experiences, which the week grid never draws.

**A new field starts unnamed and attached to the day.** Nothing is written on
anybody's behalf: the placeholder suggests "One key learning of today" and the
label stays empty until somebody types one.

**What happens to the writing** is the part that decides whether this is safe
to use:

| event | the answers |
|---|---|
| the question is renamed | untouched — they are keyed by field id and date, not by label |
| the thing it was attached to is deleted | untouched; the field **re-homes to the day**. `logged` prunes a tick whose step is gone and that is right for a tick, but deleting months of writing to tidy up a dangling id is not a trade the plan gets to make |
| the field itself is deleted | deleted with it, deliberately — an entry keyed to a field nothing can name is unreadable and uneditable, so keeping it keeps nothing. The button says so |

**A folded section opens when it holds a box.** The standing section and the
other-days list are closed by default, which is right for rows you are not being
asked about today. A text field is being asked about today wherever it hangs, so
attaching one to a milestone opens the section it landed in — watching it vanish
is the same bug as never having added it.

Written like the day note: held locally, committed on blur, Enter keeps it. The
box saves on blur rather than on each keystroke because it sits inside a list
whose every row re-renders on a save; Enter is handled where it stands rather
than through `SentenceBox`, which saves on every keystroke, and the hint string
is imported from it so the two cannot come to say different things about the
same key.

**Two kinds of field, because a row can run in two directions** (`NsFieldKind`):

- **Write today** — it asks you something and you answer it. "One key learning
  of today."
- **Read it back** — it shows you something you already wrote. Reported from
  the page: "I have writing like 'read my north star' — I want to see that I
  want to read my north star and immediately be able to read it." As a tick on
  its own that row is useless: the paragraph it names is four steps away, so
  the step either sends you off the screen at 07:00 or gets ticked without
  being done. The paragraph goes **on the row**, resolved live by
  `readSources` — there is one copy of it, not a copy and a stale quote, so
  editing the star changes what the morning shows.

`readSources` offers the star, every answered star/review prompt (the
affirmations, the identity, the standards, the why), the values in order, each
area's 10 / purpose / identity, and each goal's why, sentence, cost and
reasons — **only where something has actually been written**, since a picker
full of blank promises is how somebody attaches a row to nothing and reads an
empty box every morning. A source that is gone or empty says so on the row.
Flipping a field between the two kinds never touches its answers: one mis-click
on a dropdown must not be how a month of entries disappears.

**The run of answers, which is the whole reason to write the same line daily.**
Reported as: "I want to be able to write my key learning directly, tick that it
is done, but also easily access past responses." They existed — `plan.journal`
is keyed by date — and had nowhere to be seen. Every write box now carries a
folded "N earlier days" (`journalHistory`, newest first, today left out because
the box above already holds it).

### Sub-steps: the to-do list under a bigger weekly thing

Reported from the page: "I have a weekly thing of creating content. That's
really a bigger thing… I want to add sub-steps to it, so I can generate my own
little to-do list of actions to take in order to complete that main action. It
is a little different than workout 5× a week, because that's just the thing
itself."

Not every weekly line is the same size. "Gym 5× a week" **is** the thing;
"write a piece of content" is four things wearing one title, and a list that
draws them identically leaves the second one un-startable on a morning with
twenty minutes in it. So anything on Today — a driver, a routine step, a
milestone, an experience — can carry an ordered checklist of its own
(`plan.subSteps`, added inline on the row, reorderable, renameable in place).

**The ticks go in `plan.logged`, beside the routine steps' own.** A sub-step
done today is the same kind of fact as a step done today, and a second store
for it would be a second answer to one question. The parent row shows "2/5
steps"; that count is deliberately **not** added to the day's own total, or a
day with one big item broken into six would read as six things to do.

**Where it differs from a field**: a field re-homes to the day when its target
is deleted, because a question stands on its own. A sub-step does not — "write
the outline" is defined by the thing it breaks down — so the loader drops
orphans, and deleting one takes its tick with it (ids come off a monotonic
counter, so a stranded tick would count a thing that no longer exists forever).

### Picking the days, where the days occur to you

Days were only choosable on the week grid, which is a different screen from the
one you are on when you decide. Reported as: "in the routine itself, users
should be able to select which days they want to work — same with me inputting
'write on book 2× a week'. It is fine that it is just 2× a week, randomly, but I
should also always be able to assign it a specific day."

So every step in `RoutineCard` carries seven toggles under it (`StepDays`).
Picking days calls `placeStep`, which keeps `daysPerWeek` in step with what was
picked and keeps the step's own `startMin`, so choosing Tuesday does not lose
07:00. The step then lands on those days' lists on Today and in the schedule's
day view; with no days it stays a rate on no particular day, which is a finished
answer and still the default.

**The rate box disappears once days are chosen**, because the days are the rate
at that point and two controls saying different numbers is a step that cannot
say how often it runs.

**The one thing this cannot express** is "twice a week, one of which is
Tuesday". A step is either a rate on no day or a set of named days; naming one
day of a 2×/week step makes it 1×/week, which the picker says out loud beside
the toggles rather than doing quietly.

### Old saves

`logged` and `notes` are absent from every plan written before this, so the
loader defaults them rather than requiring them. A tick pointing at a step that
has since been deleted is dropped on load, because it would otherwise render as
a blank row nobody can explain.

### Verified

`northStarTrack.test.ts` covers the day mapping, the tick round-trip, the
"survives a reload" invariant across tick + rating + note, the deleted-step
case, and the deliberate absence of a local tally on an unpushed driver.
`life-mastery-track.spec.ts` proves it against the real database: `+1` moves
`current_value` on the real goal and `−1` puts it back, and a tick, a rating and
a note are all still there after a reload.

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
- **NOT EVERY RUN NEEDS A WHY.** A practice is finished when it has a rate.
  "Run four times a week" says what you do and how often; there is nothing to
  climb to, no finish line to date, and no reason it owes anybody. It was being
  asked for a why, a date, a belief rating, a desire rating and a one-sentence
  version of itself — five boxes for a run — so every practice sat there saying
  "needs work" while being complete, and the panel said "5 goals need a why"
  when four of them were runs, which teaches people to stop reading the count.
  `goalGaps` now returns early for a system with only "a rate" if it has none;
  `goalNeedsWhy` / `goalNeedsDate` are the shared predicates the counts and the
  outstanding-work chips filter on. The why box stays on every goal — somebody
  who has a reason for their Tuesday runs should be able to write it — it is
  just never asked for. Milestones are asked for both, unchanged: the why is
  most of whether you still want it in February.
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

**A number is not always an amount** (2026-08-18, "buy a ferarri 458 … it scaled
it from 0-458"). Written in Money as something to experience, it came back as a
`milestone_ladder` climbing from nought to four hundred and fifty-eight — of
what, the page never said, because there is no unit and there was never going to
be one. 458 is the car's name, the same as "an iPhone 15" or "a Porsche 911".
And "buy a Ferrari 458" is one of `WANT_EXAMPLES`, so the offer somebody is most
likely to click was the one that broke. `parseGoalTarget` now returns null where
an article ("a", "an", "the", "en", "et") stands within the two words in front of
a number that carries **no unit**: the article says the count is one, so the
number belongs to the noun's name. Near the number on purpose — "buy a house and
save 500000" is still five hundred thousand — and a number with a unit is an
amount whatever precedes it ("do a 5k", "en artikel som 10 læser"). Null is not a
failure here: the goal files as a plain achievement with a date and actions,
which is all a car needs.

**The noun can stand behind the number** — the same blindness, reported in the
same breath. `get 28 kg bench 3 sets 8 reps by april` took `get` as the prefix
and threw the rest away, so the rungs read "get 22.5 kg". Where the words in
front of the number are one colourless verb (`get`, `hit`, `reach`, `nå`, `få`
…), the word **immediately** behind the unit becomes the label instead: "bench
22.5 kg", "squat 75 kg". Immediately and no further, or "reach 80 kg by december"
labels the climb *december*.

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

- **A routine is neither half. It is the background.** It improves every area
  by default (`serves` starts as all of them — the blueprint's guess at which
  four a morning routine lifts was wrong in the same direction every time), it
  is labelled "The background" rather than "Systems", and its steps are no
  longer listed as "pointed at nothing". Calling "make your bed" an
  outstanding task is the page asking somebody to justify their morning. What a
  routine ADDS UP TO is still offered as a milestone, separately.
- **Three suggestions, not fifteen.** `areaSystemMilestones` returns the
  strongest one per routine, capped at three, as chips rather than a bordered
  card with a note under every line. Opening Mind & Beliefs produced fifteen
  derived milestones, several of them the same sentence about a different
  routine — a wall reads as work, not as something to celebrate.
- **No values on the milestones step.** Shown, then editable, now gone: that
  step is what you want and what you will do about it, and a ranking exercise
  in the corner of it is a third subject. Values are written at step 2 and
  ranked at step 6.

- **Each half offers its own kind, or nothing.** `areaOffersFor(area, half)`:
  targets and whole sets are milestones, practices are systems, and neither
  list appears in the other half. Switching Fitness to Systems used to change a
  line of copy and leave the catalogue offering "Bench Press 1RM" as a thing to
  do on a Tuesday. The box's own words change too — "Everything you want in
  Fitness" becomes "What you will actually do in Fitness"
  (`SYSTEM_BUILDER_COPY`), because a right prefill under a wrong label is the
  same bug in words. Pinned per area in `northStarOffers.test.ts`.
- **One title, one kind.** "Weekly review" was a catalogue target AND a
  practice, so the same words arrived as two different kinds of thing depending
  on the tab. Where a title is on offer as a practice, the practice wins and
  the target drops out of the milestone half.
- **Every example in an empty box comes from the area it is in.**
  `AREA_GOAL_EXAMPLES` gives each of the twelve a `want`, an `action`, its
  `units` and a `rungs` progression; `areaGoalExample(areaId)` is the only way
  the builder gets one, and an area somebody invented gets the neutral set
  (which describes the shape of the box instead of illustrating it). This was
  reported twice: Relationship's goal box said "e.g. Flat bench 100 kg", the
  rung box offered pull-ups, the action box asked about training chest, and the
  note explaining what a target is used the same lift. A placeholder is a
  prefill — it is the page saying what goes here — so one string across twelve
  areas showed eleven of them somebody else's life.
  - The catalogue's rule now governs the examples too, and it lives in one
    place: `tests/unit/goals/fixtures/areaLanguage.ts`. An area may speak its
    neighbours' language and never a stranger's, decided against
    `AREA_KEYWORDS`. Plurals count now ("5 pull-ups" walked through the exact
    token match that caught "bench").
  - **The test renders the builder** (`northStarAreaBoxes.test.tsx`), because
    right data in a component that still holds a hardcoded string is exactly
    the bug that shipped. It walks all twelve areas in both halves, opens a
    goal and its progression box, and lints every placeholder AND the copy
    around them. `northStarOffers.test.ts` holds the data itself to the same
    rule.
- **Templates is the third tab, beside Milestones and Systems.** The catalogue
  was at the bottom of the page inside a closed disclosure and hidden entirely
  until the plan already had a goal in it, so the one person who most needs a
  ready-made set — somebody looking at an empty area — was the one person who
  could not see that 23 of them exist. It is `BuildBoard`, unchanged, rendered
  in the tab; "Open it and write your own" switches back to Milestones with the
  area open.

- **A milestone is served, not actioned.** "Needs an action" never appears on a
  milestone now. Bench, squat and a muscle-up are three milestones and one
  system — you go to the gym four times a week — and asking each of them what
  it will do about itself gets the same sentence three times.
  `milestoneHasSystem` asks the question that matters: is anything moving this,
  anywhere in the plan. One link answers it for every milestone that shares the
  system.
- **Nothing invents sets and reps.** "Flat bench 100 kg" names a weight and
  says nothing about 3×8; the timeline used to stagger reps for anything in
  kilos. `liftProgression` is still there and still right — it runs when
  somebody picks "weight and reps", which is the difference between offering
  and deciding.
- **The spacing is the person's choice.** The curve editor opens under the
  rungs in the area builder, and "write the steps yourself" sits beside *Scale
  it* — whatever is written there replaces anything computed. The example the
  box shows is the area's own (`5 pull-ups → 10 pull-ups → muscle-up` in
  Fitness, `a call every month → a call every week → a visit every month` in
  Family).
  It existed only in the goal dialog before, which is not where anybody scales
  anything, so from the page it did not exist.
- **Written rungs carry dates.** `datedRungs` spreads them between today and
  the goal's date, last one landing on it. A rung with no date is a rung you
  are never behind on.

- **Nine steps: star · 10s · the one thing · where to start · milestones ·
  systems · focus · values · commit.** Milestones and systems were two steps,
  then one page with a toggle under the wheel, and are two again — the merge
  read well until step 4 started sending people to one half by name. They share
  a body and differ in what they show: the routines and the linking are on
  systems, the timeline and the experiences list are on milestones. One line of
  copy on each says which is which, because nobody arrives knowing.
- **A routine is ALWAYS a system. What it adds up to is the milestone.**
  "Morning routine" is not something you achieve; 400 hours of deep work is.
  `systemMilestones` reads the numbers off the routine as built — 90 minutes ×
  5 days is 7.5 hours a week, so a year of it is 400 hours — and offers hours,
  sessions and a 90-days-in-a-row streak (the last only where the routine runs
  most days). It is named after the work, not the container: nobody is proud of
  hours of "business routine". Created through `addSystemMilestone`, it arrives
  already linked to the steps that produce it, so it is never a wish.
- **An area's offered milestones fit the systems already in it.**
  `areaSystemMilestones` shows what that area's routines add up to, before any
  catalogue gets a word in.
- **Nothing links itself.** `linkStepToGoal` and `feedsGoalIds` are only ever
  set by a person clicking. A step and a goal can share an area, a language and
  an owner and still have nothing to do with each other.
- **Three circles, not a green tick.** `stepState` returns `empty` / `started` /
  `done`, in amber — the tick used to appear the moment a step held one
  sentence, which is a scoreboard congratulating somebody for arriving.
  `nsProgress.done` is derived from it, so the rail and the "still to fill in"
  list cannot disagree. `northStarSteps.test.ts` pins the properties: nothing
  done before started, nothing goes backwards as you write, every step
  reachable, every step covered.
- **Values are edited where they are read.** The area reminder's values can be
  added to, dropped and reordered in place — an hour spent writing down what
  you want is the most likely hour to change what you think you value.
- **Minutes on a routine step are the person's estimate.** They were printed as
  text, so a step arrived with the library's guess and stayed; the totals, the
  presets and the weekly load were all adding up somebody else's minutes.

- **Nothing is offered for the one thing.** The suggestion list under it is
  gone, and so is `oneThingCandidates`: a row of plausible answers under the
  most important question in the flow is a nudge to pick instead of to think,
  and the sentence somebody clicks is not the sentence they would have written.
  Two rounds of filtering went into keeping states out of that list; the box
  cannot offer anybody anything, which settles it. `readsAsActionable` survives
  with a different job — keeping the clauses of a 10 from being offered as
  goals, which is a list somebody still meets.
- **"Look for the thread" is removed.** It did not work well enough to keep.
  Gone with it: `Thread.tsx`, the route's `thread` mode, `findThread`, the
  THREAD schema and prompt, `THREAD_COPY`, and
  `tests/e2e/life-mastery-thread.spec.ts`. The candidate generator behind the
  same route stays — the area builder and the experiences list still use it.

- **Seven steps, and the third one is a single sentence.** 1 North star · 2 Your
  10s · **3 The one thing** · 4 All goals · 5 Focus & season · 6 Values &
  identity · 7 Commit. Step 3 asks the one change that would make the next few
  years far more likely, then why it matters, what it costs if it does not
  happen, who you would have to be, what it is in service of, and what has to
  happen for it. "All goals" moved to 4 unchanged.
- **The requirements ARE the goals.** "What needs to happen for it to work"
  writes each line as a real goal through the same shaping as anything typed
  into an area, filed by `guessAreaId` with the area shown as a chip you can
  change before it lands. `servesOneThing` marks them, `markServesOneThing`
  links a goal that already existed, and the goals page opens with them listed
  under the sentence — so the list reads as "what this needs" rather than as
  twelve empty areas. Written as notes it would have been a reflection
  exercise; written as goals it is the plan.
- **One place to write the one thing.** Step 3 owns it. Focus shows it
  read-only with a link back, and the goals page shows it as what the list is
  for. Same `ONE_ANSWERS.oneThing` key it has always had, because people have
  it written already and a rename would silently empty their page.
- **The step is not done on a sentence alone.** `done.one` wants the sentence
  AND at least one thing that has to happen for it. A tab that ticks green on
  the easy half is a tab that lies.
- **A rate written in words is still a rate.** "Train chest twice a week"
  arrived as a finish line with an invented rate of three and was then asked
  for a date — the page asking when you plan to stop training. `WORD_PER_WEEK`
  reads once/twice/three times and the Danish equivalents.

- **Six profiles, kept as a test.** `tests/unit/goals/northStarPersonas.test.ts`
  runs whole plans in the shapes people actually arrive in — a lifter, a
  calisthenics one with no numbers, a money one, one who wrote the same thing
  twice, one who wrote only feelings, and one who has written nothing — because
  every rule here was right for the person it was written for and wrong for
  somebody else. Three bugs came out of the first run: a driver being told it
  needed a date, "Life feels light again" offered as a one thing, and revenue
  rungs at 4150 kr.
- **A driver has a rate, not a deadline.** "No weed, 7× a week" was asked when
  it would be finished, which is the page asking when you plan to start again.
  Drivers need a rate and nothing else; targets need the date.
- **Money has a grid too.** `unitGrain` takes the span, so a climb of thousands
  lands on 4000/6000/8000 rather than 4150/6100/8050. Same rule as the plates:
  the unit moves in round numbers, so the rungs do.
- **A state is not a one thing, whoever the subject is.** The filter rejected
  "I wake up happy" and let "Life feels light again" through, and let "Be
  happier" through by trusting that anything somebody wrote in the goal box was
  actionable. State verbs are rejected wherever they sit, and written goals go
  through the same gate as the 10s.

- **Enter keeps the sentence.** Every short answer here was a bare
  `<textarea rows={2}>`, so Enter pushed the text out of a two-line window and
  nothing acknowledged the key — it saved on every keystroke, which is exactly
  why it looked broken. `SentenceBox` commits, trims, blurs, and says "kept";
  Shift+Enter is still a new line. Prose boxes (north star, ideal day,
  experiences) keep the plain textarea, because there Enter really is a new
  line. `tests/unit/goals/northStarKeys.test.tsx` fails the build on any new
  one- or two-row textarea in the folder that goes around it — the fix was nine
  boxes, and the next short box somebody adds would have been the tenth.

- **The one thing opens the goals page.** It also stays on Focus — same
  `ONE_THING_KEY`, one shared `OneThingCard`. Asked after twelve areas are full
  it is an audit of a list; asked before, it decides what the list is for.
- **No copy invents a number.** The start box said "e.g. 72" under a goal of
  36 kg. An example number cannot see what was typed above it, so it contradicts
  the person whenever their number is smaller. Boxes get labels
  (`startPlaceholder`, `targetPlaceholder`), never examples, and
  `northStarService.test.ts` fails the build on any `e.g. <digit>` that reappears
  in the north-star components or copy.
- **Rungs land on numbers that exist.** `unitGrain` snaps intermediate rungs to
  the grid the unit moves on (2.5 kg, 5 lb, whole reps); the ends are never
  rounded, because they are the person's own measurement and their own target.
  A climb too short for the grid falls back to `fineGrain` rather than
  collapsing to one rung. 33 kg was the report; 8.5 pull-ups was the same bug.
- **A lift climbs in reps as well as weight.** `liftProgression` holds the
  weight, builds the reps, then jumps by a constant loadable amount — the timeline
  (`goalMilestones`) uses the same function, so one climb no longer gets two
  different answers on two screens.
- **Progressions can be written, not only computed.** `parseProgression` +
  `setProgression` take "5 pull-ups → 10 pull-ups → muscle-up", whose last rung
  is a different move and cannot come out of arithmetic. Offered beside the
  curve editor, and on goals whose title holds no number at all — the case that
  needs it most.
- **Duplicates get named, never merged.** A routine step and an area goal can be
  the same thing, and which one somebody writes first is unknowable. The area
  builder lists what already runs there (`running`) before the input, and
  `goalEchoes` names the collision on the row with a one-click "drop this copy".
  Nothing is deleted on the person's behalf.
- **Suggested actions must share a word with the goal.** "Big glass of water"
  was offered under a bench press because they share an area. Sharing an area is
  not evidence one gets you the other; an empty suggestion row with the
  write-your-own box under it is the honest answer.

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
- `src/goals/northStarGenerateService.ts` — the one model call: schema, prompt,
  caps. Route: `app/api/test/north-star-generate/route.ts` (dev-only, allowlisted)
- `src/goals/data/northStarStart.ts` — the six doors into step 2: their copy,
  the five starter questions, the day windows, the area keyword table
- `src/goals/northStarService.ts` — pure logic (~70 exported functions)
- `src/goals/northStarTrackService.ts` — the plan → `user_goals` mapping, pure
- `src/goals/data/templateNamespaces.ts` — the template-id namespaces the hub's
  auto-archive sweep must not eat (`fw:`, `ns:`)
- `src/goals/components/north-star/TrackTab.tsx` + `TrackSchedule.tsx` — the
  track step and its week/day schedule
- `src/goals/components/north-star/` — `NorthStarFlow` · `StarTab` ·
  `ValuesWork` + `ValueBrowser` + `ValuesSoFar` (the evidence roster) ·
  `Peek` (the fade-and-show-all primitive) ·
  `AreaWheel` · `NowTab` + `AreaDialog` (tab 2, the assessment) ·
  `PlanTab` + `AreaGoalsDialog` (tab 3, the goals) · `GuidedBuild` ·
  `StartRamps` (the chooser, the row, the 10 and the questions) · `IdealDay` ·
  `WeekGrid` · `Experiences` · `Generate` · `FocusTab` · `GoalOverview` ·
  `GoalLibrary` · `RoutineCard` · `AreaGoals` · `GoalCard` · `ScoreRow` ·
  `ReviewTab`.
- `src/goals/types.ts` — `Ns*` types (slice rule: types live in types.ts)
- `docs/research/life-mastery/values-and-identity.md` — the transcript reading
  behind the values and identity work
- `tests/unit/goals/northStarService.test.ts` — 254 tests
- `tests/unit/goals/northStarTrack.test.ts` — the mapping, 21 tests
- `tests/e2e/life-mastery-track.spec.ts` — the crossing, against the real DB

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

Fourth pass, the five doors into step 2: `npm test` **2839 passed, 1 skipped**.
In the browser, from cleared localStorage — the empty tab is wheel, routines and
"you have not pictured a 10 in any area yet" with no cascade of zeros, no empty
timeline and no catalogue; picking two areas and pressing on lands on the
chooser. A written Tuesday parsed nine lines, read "12.00: Walk outside" as noon
and left "10 pull-ups" as a goal with its number intact, guessed Fitness /
Mission & Purpose / Mind & Beliefs, held the Add button until the four it could
not place had areas, and put the tracked lines in the morning, business and
evening routines at their own hours across all seven days. The week grid drew
them, placed "Big glass of water" from the tray onto Monday 11:00 (`daysPerWeek`
following `days` down to 1), and drew a new block from an empty slot. The 10
door cut a seeded Fitness paragraph into four pieces, added two as a climb to 28
and a finish line, and asked what would make a 4 into a 5. **One real bug found
this way**: `loadNsPlan` dropped every `start:` answer, so the written day and
the five questions did not survive a refresh — fixed, with a regression test.


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

## Reranking values is a drag, not a pair of arrows

Values are put in order in two places, and **both** are now dragged:

- **Step 6**, the whole-life list — grip, rank, label; the whole strip is the
  handle, so the grab target is the row rather than an icon.
- **Step 4**, inside an area (click Fitness) — the "this area asks you to value"
  chips, dragged in their wrapped row.

The up/down arrows are gone from both. They cost five clicks and a recount to say
"Health is really number two", and moving a value five places meant watching it
swap past each neighbour one at a time — the sort of friction that ends the
exercise before the conflicts get read. On the chips they were worse than slow:
two 16px chevrons wedged inside an 11px pill, and in a wrapped row "up" and
"down" do not mean up and down, because the chip at the end of line one sits
above the chip at the start of line two.

- `moveValueTo(plan, value, toIndex)` replaced `moveValue(…, dir)`, and
  `moveAreaValueTo(plan, areaId, value, toIndex)` replaced `moveAreaValue(…, dir)`:
  a drop lands on an index, and everything between the item and its destination
  slides along rather than the two ends swapping. Out-of-range clamps, because a
  drop past the last one means "last".
- The plumbing is shared, in `src/goals/components/north-star/valueDrag.ts` —
  `useValueDrag` for the list, `useValueHandle` for one item. Each site keeps its
  own markup and strategy: `verticalListSortingStrategy` for the column,
  `rectSortingStrategy` for the wrapped chips, which is the one that understands
  an item moving between lines.
- It reuses the project's existing `@dnd-kit` idiom (`SortablePriorityList`,
  `WidgetGrid`): `PointerSensor{distance: 8}` so an item's own × still takes a
  click, `KeyboardSensor` + `sortableKeyboardCoordinates` so the same reorder
  works without a mouse (tab to a value, space, arrows, space; escape cancels),
  and `touch-none` on the handle so a phone lifts the item instead of scrolling.
- Rank numbers are **live during the drag**: `useSortable().newIndex + 1`, the
  place the item would take if you dropped now. A first attempt faded them
  instead, because items slide while their numbers travel with them and the
  column would read 1, 4, 2, 3 — but on a list whose whole subject is the number,
  watching the numbers rearrange under your hand IS the feedback. Deriving it
  from dnd-kit's own state also means there is no local "am I dragging" flag that
  can get stuck showing nothing.
- The duel is untouched: it is still the fast way to a first order, and the drag
  is how you fix one answer without sitting through the interview again.

Verified headless against the running app, on both surfaces: drag up, drag down,
live mid-drag renumbering, keyboard move, escape-cancels-cleanly, remove and add
still working after a drag, no overflow at 390px, and the order surviving a
reload. Note for the next scripted pass: `scrollIntoViewIfNeeded` is not enough
before a drag — it counts an item under the sticky footer as visible, and the
press then lands on the footer. Centre the item, and take no screenshots mid-drag
(Playwright disables animations for those, which cancels the lift).

Icon note: the drag handle is `GripVertical`, the handle every other sortable
list in the project already uses — same role, no new context. The old arrows used
`ChevronDown` rotated, which is how `PriorityBadge` and `RoutineCard` do reorder;
`ArrowUp`/`ArrowDown` were rejected then as a new context for an icon in use
elsewhere.

## The last step — Everything: the plan on one page

Twelve steps write this plan and not one of them can show it. Each holds a
quarter of the answer — the paragraph on step 1, the identity and the
affirmations under it, the 10s on step 2, the values on step 9 — and the only
way to re-read the lot was the plain-text dump folded away at the bottom of
every tab. That dump is the right *content* and the wrong *object*: a
`<pre>` block of shouted headings is an export, not a page you go to on a
Tuesday morning to remember who you decided to be.

Step 13 is that dump laid out. `RecapTab`, wired in `NorthStarFlow`, copy in
`RECAP_COPY`.

**Read first, edit second.** Everything renders as prose. The steps that wrote
this material are forms and should be — boxes are what you want while you are
deciding — but a box is a bad way to be *reminded* of something, and "what did I
say my values were" is not a question anybody answers by scrolling past twelve
labelled textareas. So each block reads back, and each carries one `edit` link
that swaps that block, and only that block, into the editor its writing step
uses: the north star's twelve-row box, `ValuesWork mode="order"` with its drag
list and its pair questions, `GoalOverview` with the quick-add above it. One
block is in edit mode at a time, so the page never turns back into a form.

**Nothing is counted on it.** No rings — `recap` is out of `SCORED_TABS`, and
`stepState` returns `empty` for it however full the plan is, because every word
on it was written on another step and is scored there. No "3 of 5 answered", no
list of what is missing inside the document. A page whose whole job is being
somewhere worth returning to must not greet you with what you owe it. (The
shell's own "still to fill in" panel still renders under it, at the very bottom,
after the whole document — that is a footer, not a greeting, and reading the
plan back is exactly when a gap is worth naming.)

**What is open on arrival, and what is folded.** Open: the north star and its
why, the one thing, who you are, the values. Those are what somebody came here
for. Folded: the areas, the goals, the routines, the experiences, the closing
answers — long, situational, and a page that opens as a list of closed headings
has reminded nobody of anything.

**The areas open their own dialog.** Clicking an area card sets `nowAreaId` and
`AreaDialog` renders over the recap, exactly as it does on step 2 — the same
rating, the same 10, the same values. Nothing about an area is re-implemented
here; the card is a read-back and a door.

**The one thing is the sentence, not the ticked goal** (2026-08-19, "it takes
flat bench as my one thing, even though i input 100 days of no weed"). Two
fields carry almost the same name: `seasonFocusId` is the goal you would keep if
you dropped everything else, ticked weeks ago on a goal card, and the step 3
sentence is what every other surface in the flow calls the one thing
(`MilestonesTab`, `FocusTab`, both via `ONE_ANSWERS.oneThing`). The recap read
the first and printed it as the answer to the second. It reads the sentence now,
with `SEASON_FOCUS_COPY.banner(...)` under it naming the marked goal for what it
is — dropping it would have lost a real answer to a different question.

**The tick lives on the thing you just read.** Four parts of this plan are also
daily practices — reading the north star, saying your identity lines, saying
your affirmations, reading the whole driving force — and all four are already
steps in the routine libraries that already tick off on Today. Before this,
somebody who had just read the paragraph here had to leave the page, open Today,
unfold the stack and find the line whose entire content they had just done.

- `RECAP_PRACTICES` maps each block to its library steps, best candidate first,
  plus the distinctive phrases that recognise a step somebody wrote in their own
  words ("Read my north star before bed") so the page never offers a second copy
  of something already on the list.
- `practiceState(plan, key, date)` returns everything running it and, **only
  when nothing is**, one offer. `trackPractice(plan, blueprintId, stepId)` turns
  the step on, adding its routine first if the plan has not got one — which only
  the identity lines need, since they live solely in the manifestation stack.
- The tick writes `plan.logged[date]`, keyed by step id: **the same store the
  Today step writes to**, so the two screens can never disagree about whether it
  happened. It is never a second tally.
- Pressing the offer does both halves at once — turn it on, tick today — because
  somebody pressing it has just read the thing.

Tests: `tests/unit/goals/northStarRecap.test.tsx` renders it and asserts what is
on the screen without clicking, that the values keep their rank order, that the
empty plan says so instead of drawing empty blocks, the two rules above, that
the one thing is the sentence and not the ticked goal, and the whole practice
path — offer, no-duplicate, own-words match, shared log, routine added only when
it has to be.

## A field can be a door, and the door brings you back

Reported from the page (2026-08-21): *"I want to be able to select a field and
change it. Like my north star. I want to click that, and then go to the north
star, so that field should ultimately ALWAYS be coded as 'when user clicks that,
they go to the place where the information is, and then they get an option to
read it, and easily track it, and go back to where they were' — but importantly,
users should be able to decide that a field is that type of field themselves."*

A read field **quotes** the thing on the Today row. That is right for a
paragraph you re-read at 07:00 and wrong for anything you might want to *change*
while you are looking at it: a goal's date, its curve, how many times a week it
runs. Those controls exist, three tabs away, and a blockquote on Today is a
picture of them.

So a field has a third direction. `NsFieldKind` is `"write" | "read" | "go"`,
picked in the same Kind dropdown on the same field the user already owns — not a
second kind of thing to add — and read and go share one source picker, because
the difference between them is what happens when you arrive, not what you are
allowed to point at.

**Every readable piece of the plan now says where it lives.** `ReadSource.home`
is an `NsPlace` — a tab, optionally an area and a goal to open, optionally a DOM
id to scroll to. Every jump in this flow used to be hand-written at its call
site (`setPlanAreaId(x); setNowGoalId(y); setTab("systems")`), which is fine
while the destination is known when the code is written and impossible the
moment the *user* picks one. `goTo(place, errand)` in `NorthStarFlow` is the one
way to arrive anywhere.

Where each source goes: the star to step 1, scrolled to the paragraph itself
(`STAR_ANCHOR`) rather than the top of a step holding five boxes; a star
question to step 1 and a review question to Commit, because the two prompt sets
read alike and are written three steps apart; an area's 10, purpose and identity
to that area's own dialog; a goal to its card, on the step that holds goals of
its kind.

**The errand travels with you.** A jump with no way back is a trapdoor, and a
trapdoor is a door nobody uses twice. `ErrandRibbon` carries three things — what
you came to do, the tick for it, and the way back — and the tick writes
`plan.logged[date]` under the field's own id, the same store the routine steps
use, so a thing ticked at the destination is ticked on the row you left. "Back
to today" returns to the tab you came from and scrolls to that row
(`id="field-<id>"`). "Stay here" drops the errand and leaves you where you are,
which is the honest option once you have arrived and found something else to do.

The ribbon renders **inside the two dialogs as well as on the page**: a modal
makes everything behind it inert, so a way back left out on the page under an
open goal card is one you can see and cannot click. `AreaDialog` and
`AreaGoalsDialog` take a `banner` slot — a slot, not an errand prop, because
neither dialog has any business knowing why it was opened — and closing either
of them *while on an errand* is itself the way back, rather than stranding
somebody on the assessment step wondering where Today went.

**A go field carries its own tick, and that was a silent data bug.** A go field
can hang on the day itself, where no step carries a tick for it. Its id
therefore goes into `plan.logged` — and the loader parsed `fields` *after*
`logged`, so every one of those ticks was pruned on the next reload as an
unknown id. Silently: a dropped id looks exactly like a day you did nothing.
Fields are parsed before `logged` now and registered in `loggableIds`. The
loader also reads the kind off `NS_FIELD_KINDS` instead of `f.kind === "read"`,
which would have quietly downgraded every go field to a text box overnight.

### The rows that are goals now open as goals

The driver rows and the milestone rows on Today **are** plan goals —
`TrackActivity.id` and `StandingItem.id` are both the plan goal id — and until
now the only thing you could do to one from this screen was count it. Everything
you find out on Today is a change to the goal card: the date is wrong, four a
week is three, the curve starts too high. The title opens it, with the same
errand ribbon carrying you back, and a milestone's date chip opens it too —
amber when there is no date, because "no date yet" is the commonest thing that
list reports and the fix was three clicks and a search away.

`GoalCard`'s `perWeek` was printed, not edited: the one number on the card that
says how big the week actually is was the only one you could not change without
deleting the goal and picking it again. Twenty approaches a week turning out to
be twelve is the commonest thing anybody learns in the first fortnight.

### "+1" was not a control anybody could read

Reported the same day: *"I hate the '+1' thing, it is just not intuitive at
all."* A bare `+1` sat at the right-hand end of a driver row with "3 of 20 this
week" buried mid-sentence in the grey line above it, between the cadence and the
area name. So the one control on this screen that writes to somebody's *real*
goals looked like the smallest thing on it, and what it would do to the count
was on a different line from the count.

Now: the count and a bar for it sit under the title where the eye already is; a
bar only when there is a target to be a fraction of, because a bar with no end
is a picture of nothing. The button says **Log one** in words. **Undo one** is a
quiet link that only exists once there is something to take back — an undo is
not a control you need to see before you have done anything.

### The first build put the control in the wrong place

Reported on trying it (2026-08-23), after clicking "Read your north star out
loud" on Today and staying exactly where they were: *"i still dont go there when
i click it on the today page… and i cant see where i would change it."*

Both halves were one mistake. A row **could** be a door — but only by building a
second thing to sit next to it, from a section at the bottom of Today called
"Your own text fields". That is neither where somebody is looking nor a name
that means *this is where doors are made*, and it asks somebody staring at a row
that already says the right words to go and construct a duplicate of it.

So the **step itself** carries the destination. `NsRoutineStep.goesTo` is a
`readSources` id, the row says where it goes, and the control to set or change
it is on the row — `GoesTo` in `TodayTab`, drawn as a sibling of the row and
never inside it, because a step's row is a `<label>` wrapping its checkbox and a
button inside that label would tick the step every time somebody tried to open
the thing it names.

**The canon rows arrive already wired.** `inferStepDestination(title)` matches
on `RECAP_PRACTICES`' phrases — the same list the recap uses to recognise a step
somebody wrote in their own words — and `PRACTICE_DESTINATIONS` says which
source each practice lands on: the star, the identity lines, the affirmations.
`whole` is deliberately null: the driving force **is** the whole document, and
aiming that row at one of its five parts would be worse than letting somebody
choose. Matching on the phrase rather than a library id means "Read my north
star before bed", which is in no library, works too.

**Absent is not null, and that distinction is the migration.** A step saved
before this existed has no key, and the honest thing for a row that has said
"read your north star out loud" for months is to arrive pointing at it — so the
loader infers when the key is absent. `null` is a destination somebody
*cleared*, and inference must never argue with that. Inference also runs when a
step is created (`stepFromLibrary`, `addCustomStep`) and **never on rename**:
silently rewiring a row because its new title happens to contain two words is
worse than leaving it where it was.

The step's own id is what travels as the errand's `tickId`, so *Mark it done* at
the destination ticks **the row**, not a second thing beside it.

### Verified

In the browser on a real saved plan, 2026-08-21: added a field, set its kind to
*Go to it*, pointed it at the north star and hung it on the "Read your north
star out loud" step; the row drew with its tick, its source line and Open;
Open landed on step 1 scrolled to the paragraph with the ribbon up; *Mark it
done* flipped to *Done today*; *Back to today* returned to the row, ticked, with
the ribbon gone. Reloaded — the kind, the source and the tick all survived. A
driver title opened its goal card in the dialog with the ribbon inside it, and
*Back to today* closed the dialog and returned. The counter, against a stubbed
goals response: 3 → *Log one* → 4 → *Undo one* → 3, and *Undo one* disappears at
0.

And on the same plan, 2026-08-23, on the row itself rather than a field built
next to it: the existing "Read your north star out loud" step loaded already
carrying `goesTo: "star"` with nothing configured; the row drew *→ Your north
star, the paragraph* with *change* beside it, and every other row drew *send this
somewhere*; opening it landed on step 1 at the paragraph with the ribbon up;
*Mark it done* ticked **the step** (`logged` gained `qa2`) and *Back to today*
returned to the row, ticked. Pointing a bare row at "What a 10 looks like —
Fitness" opened the Fitness dialog with the ribbon inside it. Clearing a
destination back to *Nowhere* survived a reload as `null` rather than being
re-inferred.

Tests: `tests/unit/goals/northStarTrack.test.ts` — "a field that takes you to the
thing instead of quoting it" (every source has a destination the rail can draw,
the star lands on the paragraph, the two prompt sets land on their own steps,
areas and goals open their own dialogs, the goal itself is offered even when
nothing has been written about it, the kind and the tick survive a round trip,
flipping read → go keeps what it points at) and "a routine step that goes to the
thing it names" (the canon rows and somebody's own wording both infer, a guess
is refused where there is no single answer, a step arrives wired, an old plan
migrates but a clearing is never overridden, a rename never rewires, a
hand-picked destination survives a reload, and a destination whose source is
still empty resolves to nothing rather than a door onto a blank page).
