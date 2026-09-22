<!--
Recovered 2026-09-17 from ~/.claude/plans/i-need-you-to-elegant-rivest.md.
Written 2026-09-14 in a session that was lost on 2026-09-17 right after the plan
was approved. Nothing in it has been built yet. The seven numbered blockers under
"Blockers" still need the owner's answers before Phase 0 starts.
-->

# Life Mastery: from a browser page to a real product

*v2, 2026-09-14. v1 was reviewed by 13 agents across five lenses; 59 findings survived
adversarial verification, 19 of them blockers. This version answers all 59. Every
correction to v1 is marked **[v1 was wrong]** so you can see what changed and why.*

*On approval, copy to `docs/plans/life-mastery-deployment.md`.*

---

# PART 1 — FOR YOU

## What this is about

Life Mastery is already live at `/life-mastery`, behind a sign-in. Fourteen steps, from
writing your north star to ticking off today's routine.

**Almost none of it is saved anywhere.** Your north star, your twelve areas, your
values, every goal, every routine, every daily rating and journal entry live in one lump
of text inside whichever browser you used. Clear your browsing data and it is gone. Open
your phone and it was never there.

Only three things reach the database: goals you explicitly push on the Track step, the
One Thing sentence, and ticking a goal up.

Two jobs follow:

- **Job A — your plan lives on your account**, so it survives a browser and follows you
  to another device.
- **Job B — goals are created one way**, so the plan and the counted goals cannot drift.

### Words this document uses

- **Table** — a spreadsheet inside the database. Columns are the headings, rows are the
  entries.
- **Column** — one heading in that spreadsheet, e.g. "title".
- **Migration** — a file of instructions that changes the database's shape. Once run, it
  is part of the database's history.
- **RLS (row-level security)** — the database's own rule about who may see and change
  which rows. It is enforced by the database, not by the app, so a bug in the app cannot
  get past it.
- **Service key** — a master password the server uses that **ignores RLS entirely**.
- **Foreign key** — a rule saying "this entry must point at a real entry over there".
  The database refuses to store one that points at nothing.
- **Cascade** — "if the parent is deleted, delete the children too".
- **Upsert** — "add this if it is new, otherwise update the existing one".
- **Round trip** — save something, read it straight back, and check you got back exactly
  what you put in.

## What I verified, and how

Read off running code or queried against the live database. Assumptions are marked.

| Thing | Finding | How |
|---|---|---|
| Where Life Mastery lives | `/life-mastery`, `NorthStarFlow`. Sign-in required. | Requested it; got a redirect to login |
| Where the plan is stored | Browser storage, key `north-star-v1`, written on every change (`NorthStarFlow.tsx:262`) | Read the code |
| How many people use it | **4 accounts exist in total.** Plan data belongs to you (50 pushed goals) and the test user (289) | Queried `auth.users` + `user_goals` |
| Your actual plan | 12 areas, 50 goals, 48 checkpoints, 20 ladders, 13 habits, 7 routines, 24 routine steps, 12 logged days, 250 ids | Queried the `plan_snapshots` row |
| Goal-creation conventions | **Two**: `ns:` (50 rows, yours), `fw:` (310 rows, mostly test) | Queried `user_goals` |
| `user_goals` | 41 columns; RLS on with four correct own-row rules | Queried `pg_policies` |
| Conflicting rules on `user_goals` | Two `display_category` CHECKs, both on, disagreeing. `scenarios` cannot be saved. | Queried `pg_constraint`, both `convalidated` |
| Tracking-metric drift | Database knows 42, code declares 44 | Counted `pg_enum` vs `goalEnums.ts` |
| Test suite | 4,623 pass. One times out only under load; passes alone in 269 ms. | Ran `npm test`, then that file alone |
| Pending database changes | None | `supabase migration list --linked` |

**[v1 was wrong]** v1 claimed `life_answers` accepts only one answer key while the code
declares five, and made fixing that a Phase 4 deliverable. **The database accepts all
five.** The one-key rule was replaced by a later migration. I had read only the creating
migration and stopped — the exact "check the thing, not a proxy for it" failure the
project rules exist to prevent. That deliverable is deleted.

**[v1 was wrong]** v1 justified the whole design by saying `loadNsPlan` "returns a list
of repairs it made to dangling links". It does not — it returns `NsPlan | null`. The
repairs mechanism is in `visionPlanService.ts`, a different flow. What `loadNsPlan`
actually does is **worse**, and is a better argument for this work: it has 31 `.filter()`
calls that **silently delete** malformed data. A routine pointing at a library that no
longer exists is dropped without a word.

**The headline: nobody is using this yet.** No migration dance, no data to preserve. The
schema can simply be made correct.

## What is actually broken

**1. Your plan dies with the browser.**

**2. Your goals' identity is stored in the browser too.** Pushed goals are tagged
`ns:<run>:<goal>`, where `<run>` is a random code in browser storage. Clear the browser
and pushing again makes a second copy of every goal.

**3. Editing your plan never reaches your goals.** Push, rename, push again — the goals
screen still shows the old name. `goalRepo.ts:452-459` finds the row and skips it.

**4. On the other flow, editing your plan wipes your progress.** `saveFrameworkPlan`
(`goalRepo.ts:1425`) archives every goal and recreates it. Counters, streaks, best
streaks all reset.

**5. The goals table contradicts itself.** Two conflicting rules, both on.

**6. [new] Two routine steps in one plan can share an id.** Steps added from a library
keep the library's own name as their id (`northStarService.ts:212`, `id: s.id`). `stretch`
is both a morning step and a night step; `incantations` is both a morning and a
manifestation step. Today nothing notices. **The moment ids become database keys, saving
a plan with both a morning and a night routine fails outright.** This must be fixed
before any table is created — it is Phase 0.

## A security problem you should know about

`/api/plan-snapshots` accepts a copy of anybody's plan **with no sign-in**, and writes it
with the service key — the key that ignores RLS. The delete side is the same. It is an
unauthenticated write path into your production database, reachable from the open
internet, using your most privileged credential. It holds 76 plans, **none attached to
an account**. Phase 5 removes it; flagged here so it is not buried.

---

## The rules you are approving

You approve these five and what each costs if it is wrong. Table counts, file counts
and phase counts are outputs of them, never decisions put to you. A later change that
leaves these intact gets one line in the reply; one that changes a rule gets one question.

1. **Every fact is stored once.** Cost if wrong: two copies drift and the app shows a
   number it does not have.
2. **One per parent and nothing points at it: a column. Many, or pointable, or worth
   finding on its own: a table with an id. Many but only ever edited as a whole: a list
   column.** Cost if wrong: a column becomes a table by one migration, nothing lost.
3. **Every row carries its owner and the database refuses a mismatch.** Cost if wrong:
   one person can read or change another person's plan.
4. **The whole-plan save never touches the day tables or the goal link.** Cost if wrong:
   a keystroke wipes a year of journal, or the app forgets which goals are yours.
5. **Counted goals have one producer and one link; the tag is written, never read for
   identity.** Cost if wrong: duplicate goals on a second push, or a plan you threw away
   overwriting a live goal.

## Your concept, item by item

Checked against `docs/product/life-mastery-concept.md`, your list of 2026-09-17.
Verdicts: **Yes** it has a home · **Partly** a home with a named gap · **No** no home,
and what it takes · **Behaviour** not a question the data design answers; the structure
only has to hold the result. `tests/unit/docs/planConceptCheck.test.ts` fails if a row
goes missing. Items 14, 20, 21, 22, 27, 30 and 34 are the gaps; each is one column or one
table under rule 2, none is a redesign.

| # | Verdict | Where, or what is missing |
|---|---|---|
| 1 | Yes | `targetDate` on every goal |
| 2 | Yes | Finish-line goal with named checkpoints |
| 3 | Yes | The ladder: start, target, curve, pinned rungs |
| 4 | Yes | `targetDate` |
| 5 | Yes | "I will easily" sentence, unit, date, belief 0-10, desire 0-10, plus `asked`: which guide questions were answered or skipped |
| 6 | Yes | Days per week, plus how much per week in a unit, so 4 gym days and 20 approaches are different numbers |
| 7 | Yes | Counted-goal streaks; badges at 4, 12, 26, 52 consecutive periods |
| 8 | Yes | Ramp steps: 10/wk for 4 weeks, then 15/wk for 4 weeks |
| 9 | Yes | Why, cost of not doing it, feeling clause, reward, stake, purpose per area |
| 10 | Yes | The 100-reasons list (`reasons_list`) is the "better why" drill |
| 11 | Yes | A routine step names the goals it moves (`life_plan_step_serves`); a goal lists its habits |
| 12 | Yes | Two routine kinds: a stack walked top to bottom, and a weekly set placed on a Monday-07:00 grid, with named training days linked to the real program |
| 13 | Yes | A practice goal at 7 days, or a daily routine step |
| 14 | Partly | "No weed" is read as a daily practice; the badge engine has an abstinence switch that suppresses streaks, but nothing sets it. One column on the goal and on `user_goals` |
| 15 | Yes | Target goal with a unit, or a practice goal counting things per week |
| 16 | Yes | Five link tables: goal to area, goal to extra areas, goal to bigger goal, routine to areas, step to goals |
| 17 | Yes | Twelve default areas, renameable, plus custom ones |
| 18 | Yes | Per area: 0-10 rating, your 10 in words, purpose, snapshot of now, "do my goals aim at it", blockers, values, identity |
| 19 | Yes | Daily 0-10 per area; a goal can take its number from those ratings (`metric = daily_area`) |
| 20 | Partly | Experiences are their own list, outside the goal machinery; identity per area and whole-life exist; an affirmation deck does not exist in this flow and would be one more table under rule 2 |
| 21 | Partly | Daily 0-10 works only per area, so a self-defined scale must be added as a custom area; written daily questions are free-form; a numeric daily question that is not an area is a small addition to `life_plan_fields` |
| 22 | Partly | 14 badge rules apply to every counted goal, computed never stored: first move, streaks, totals 10 to 1000, 25/50/75 percent of a climb, complete. "10 in a day" is not a rule. Ticks on routine steps earn nothing |
| 23 | Behaviour | The structure holds the result: habits under a goal, steps serving goals. The live flow's AI button was removed because it could never work in production |
| 24 | Yes | North star node, then season focus, then season areas, then priority order, then which goal feeds which |
| 25 | Behaviour | As 23: derivable drivers land as habits and steps; deriving them is a feature, not a table |
| 26 | Yes | A routine step can ask a question answered daily into the journal, or send you to read a piece of the plan; ticks, notes and journal are the four day tables |
| 27 | Partly | A finish-line goal with a date and 20 checkpoints holds it; sub-steps carry no dates and nothing paces one per day |
| 28 | Yes | `life_plan_values` with a scope: lived by, chosen, per area, per goal |
| 29 | Behaviour | Framing during the experience; no data |
| 30 | Partly | Badge rules are written once by goal shape, so they fit any goal a user invents, but only counted goals; routine-step ticks and plan-only goals earn nothing |
| 31 | Yes | Goals are ranked (`position`); a value's weight is computed from how many areas it runs through |
| 32 | Yes | Reward per goal, celebration line per checkpoint |
| 33 | Yes | Obstacle plus counter-move per goal, blockers per area, "what might stop you overall" for the whole life |
| 34 | No | Nothing carries "how important was this action to me" and no score is computed. One importance column on goals and steps plus a calculation; the day tables already hold what you did |

---

## The design

### The rule that decides the shape

> **One per parent, and nothing else needs to point at it: a column on the parent's row.**
> **Many per parent, and something can point at one of them, or you would ever want to find one on its own: its own table, one row each, each row with an id.**
> **Many per parent, but only ever edited as a whole and never pointed at: a list column on the parent's row.**

**[v2 wording was wrong, corrected 2026-09-17]** v2 stated this as "has an id → table,
no id → column". That is not what the schema does. Values have no id and get a table,
because "every goal that asks for Courage" is a question worth asking. Reasons, ramp steps
and ladder pins are lists and stay on the goal row (`reasons_list TEXT[]`, `ramp_steps
JSONB`), because nothing points at one reason and nobody looks a ramp step up on its own.
The three-line rule above is the one the 25 tables actually follow. An id is a name that
lets another row find this one; the north star needs none because the plan's own id names
it, and there is exactly one per plan.

**This replaces v1's rule**, which gave a thing a table only if something pointed at it
*today*. You distrusted that, correctly: it bets the set of pointable things never grows,
and the day a daily question needs to hang off a checkpoint, a checkpoint buried in a
column has nothing to hang off.

### The node table — and its limits

**[v1 was over-applied]** v1 routed *every* reference through one `life_plan_nodes`
table. The review's verdict, which I accept: that is right for genuinely polymorphic
pointers and wrong everywhere else, because routing a goal→goal link through a generic
table throws away the database's ability to refuse the wrong kind.

**Three pointers are genuinely polymorphic** — each can name a goal, a routine step, an
experience or a sub-step, and the type comments say so explicitly:
`NsDailyField.targetId`, `NsSubStep.targetId`, and the ids inside `plan.logged`.
Those three reference `life_plan_nodes`.

**Everything else references the specific table**, so the database still refuses
nonsense: goal→goal links reference `life_plan_goals`, a routine step's served goals
reference `life_plan_goals`, a goal's area references `life_plan_areas`.

**[v2 was wrong, corrected 2026-09-17]** v2 kept the north star as a column on
`life_plans`, on the claim that nothing points at it. That claim is false: every goal
carries a `servesOneThing` flag, and a morning step points at the north star by a fixed
name in the read-sources registry. Both work only because there is exactly one of each.
The owner asked why the singletons are the exception, and the plan's own argument for the
node table (never bet that nothing new will need to point at a thing) applies to the north
star too.

**Said plainly, because the first version of this note overstated it (corrected
2026-09-19): the claim was wrong, the change is optional.** A sweep of every pointer in
the flow shows the read-source registry addresses writing COMPOSITELY — `answer:<promptId>`,
`area:<areaId>:ten`, `goal:<goalId>:why` — an owner's id plus a field name, which works
without the field owning a row. The north star's is the bare constant `"star"`
(`northStarTrackService.ts`, `readSources`), and that constant keeps working whether or not
the north star has an id. So nothing forced this. It is a **cheap bet** that a plan may one
day hold a five-year and a twenty-year picture, taken because it costs one small table now
and a migration later. A reader deciding whether to keep it should weigh it as a bet, not
as a defect report. **The same sweep found no other case**: every other pointer is
composite, so there is no queue of further singletons waiting to become nodes.

So it is a node: kind `north_star`, detail table `life_plan_north_stars`
(`text`, `horizon_years`), `UNIQUE (plan_id)` for now, which can be lifted the day a plan
wants a five-year and a twenty-year picture. `north_star` and `horizon_years` leave
`life_plans`. The one thing is different: it lives on the account in `life_answers`, the
plan deliberately holds no copy, and the goal's flag is a pointer across that boundary.
It is unchanged by this plan.

`life_plan_nodes` also carries `local_id` — **the plan's own id (`g7`, `lm_health`),
stored verbatim and never rewritten**. That is what makes the round-trip check mean
something: the plan that comes back out has the same ids as the plan that went in.

### The 25 tables

**[v1 said 20 in three places and 22 in three others.]** v2 said 24. Two tables v1 missed
entirely: `life_plan_goal_serves` and `life_plan_routine_serves` (a goal or routine can
lift areas beyond its own). **[v2 said 24, corrected 2026-09-17]** It is 25: the north
star is a node of its own, see the correction under *The node table* below.

| Table | Holds |
|---|---|
| `life_plans` | One per person: season focus, **the id counter**, the revision |
| `life_plan_north_stars` | The north star paragraph and its horizon. One per plan for now. A node like every other part, so a goal or a step can point at it by id |
| `life_plan_nodes` | Every part's id and kind — the target of the three polymorphic pointers |
| `life_plan_areas` | Areas of life, their review answers, rating, and season rank |
| `life_plan_values` | Values lived by / chosen / per-area / per-goal, in order |
| `life_plan_answers` | Written answers to the flow's questions (`rungs` and `answers`) |
| `life_plan_goals` | Every goal, its ladder, its priority order, **and its link to the counted goal** |
| `life_plan_goal_feeds` | Which goal feeds which bigger goal |
| `life_plan_goal_serves` | Other areas a goal lifts |
| `life_plan_goal_checkpoints` | Named steps on a finish-line goal |
| `life_plan_goal_obstacles` | What could stop you, and the counter |
| `life_plan_goal_beliefs` | The belief-change work |
| `life_plan_goal_habits` | What you will actually do on a Tuesday |
| `life_plan_routines` | Morning stack, training week, **and the training program it is tracked by** |
| `life_plan_routine_serves` | Other areas a routine lifts |
| `life_plan_routine_steps` | Individual lines in a routine |
| `life_plan_routine_split_days` | Named training days |
| `life_plan_step_serves` | Goals a routine step exists to move |
| `life_plan_experiences` | Things to have done |
| `life_plan_fields` | Questions you ask yourself daily |
| `life_plan_sub_steps` | To-do list under a bigger weekly thing |
| `life_plan_days` | One per day, with that day's note |
| `life_plan_day_ratings` | That day's 0–10 per area |
| `life_plan_day_ticks` | What you actually did that day |
| `life_plan_day_journal` | What you wrote that day |

**Every row carries its owner.** Each table has `user_id`, and links to its parent on
*(parent, owner)* together, so a child cannot be attached to someone else's plan. Parents
carry `UNIQUE (id, user_id)` to make that possible.

**The four day tables are never written by the whole-plan save** — from day one, not
from Phase 2. See below; this is the single most dangerous thing v1 got wrong.

### Four fields v1 gave no home, and where they go

**[v1 was wrong — its own Check 3 would have failed against its own table list.]**

- **`seq`** (the id counter) → `life_plans.seq BIGINT NOT NULL`. **Stored, never
  recomputed.** Its type comment says ids are never reused so a deleted row's id never
  comes back. The existing fallback `highestSeq` scans only areas, routines and goals —
  not steps, checkpoints, fields, sub-steps or experiences. Recomputing it hands the next
  new goal an id a routine step already holds, and then a question written under a goal
  starts appearing under a routine step.
- **`priorityIds`** (goal order) → `life_plan_goals.position INTEGER NOT NULL`, with
  `UNIQUE (plan_id, position) DEFERRABLE INITIALLY DEFERRED` so a reorder is one
  statement. This preserves the invariant its comment names — two goals can never both
  claim to be number three — and gives every pointer a real foreign key.
- **`seasonAreaIds`** → `life_plan_areas.season_rank INTEGER NULL`. Null means not in
  season; non-null ascending reproduces the pick order.
- **`rungs`** → `life_plan_answers` with `scope = 'rung'`, alongside `answers`.

### How a plan goal becomes a counted goal

**One producer.** `goalToInsert` (`northStarTrackService.ts:130`) stays the only function
that turns a plan goal into a `user_goals` row. Its values all come from
`src/db/goalEnums.ts`.

**One link.** `life_plan_goals.user_goal_id` points at the counted goal.

**[v1 was fatally wrong here.]** v1 said the save was a "delete-and-reinsert of 21 child
tables". `user_goal_id` is a server-side fact that does not exist in the plan object, so
the browser cannot send it back — every autosave would have deleted the link and
reinserted the row without it. The flow autosaves on **every keystroke**. So: push your
goals, type one letter, and the app forgets which goals were yours. That is the exact bug
Phase 3 exists to fix, recreated by Phase 1. The same mistake would have deleted your
diary, because the day tables were in the same reinsert set.

**The save is an upsert, and it is scoped.** `save_life_plan` writes each table with an
explicit list of browser-owned columns. `user_goal_id` is never in that list, so absence
from the payload cannot clear it. Rows are deleted only when their id is absent from the
payload's id set *for a table the payload actually declares* — a payload that omits a
table cannot empty it. The four day tables are never in the set at all.

**One rule for a second push.** Updates what you wrote — title, description, why, target,
dates, values, ladder. Never touches what you earned — current value, streak, best
streak, period start.

**[v1 was wrong]** v1 said to change `createGoalBatch`'s duplicate branch outright. That
function is shared by the catalogue picker and the goal-graph mapper, and it has three
duplicate strategies. Changing it for everyone would let re-adding a catalogue template
silently overwrite a title you had edited by hand. Instead it gains an opt-in
`onDuplicate: 'skip' | 'updateAuthored'`, defaulting to `'skip'`, applying **only** on
the `template_id` branch — the other two are heuristics and must never overwrite.

**The tag.** `template_id` becomes `ns:<life_plans.id>:<local_id>`.

**[v1 was wrong]** v1 deleted the run code and said nothing about what replaced it,
leaving `ns:g1`. After "start over", plan ids restart at `g1`, so `ns:g1` would match the
discarded plan's first goal — and v1's own new update rule turns that from a harmless
skip into **silently overwriting a goal from a plan you threw away**. The plan's uuid
replaces the run code, and **"start over" inserts a new `life_plans` row** rather than
emptying the current one.

**One area vocabulary.** **[v1 was wrong]** `NsArea` has no slug field — the slug is
*derived* by `areaSlug()`. Storing one would create a second fact that disagrees the
moment you rename an area. So no slug column, and the promised test is replaced by one
that can pass: every one of the twelve fixed `lm_` slugs is a key in the goals screen's
area map, and a user-invented area renders through a named fallback. (v1's test —
"every slug the flow can emit" — could never pass: a user can name an area anything.)

---

## How this plan's author kept being wrong, and the shape of it

*Written 2026-09-19 at the owner's instruction, for whoever picks this up next.
Not an apology — a map of a repeating failure, with the evidence, so you can
recognise it in yourself before the owner has to.*

### The one shape underneath all of it

**Every mistake below is the same move: I checked a STAND-IN for the thing, and
the stand-in agreed with me.** `CLAUDE.md` rule 1 names this exactly, and naming
it turns out not to be enough, because a stand-in never feels like one at the
time. It feels like checking.

| What I checked | What I should have checked | What it cost |
|---|---|---|
| The plan's own text | The code | "Nothing points at the north star" — false; goals carry `servesOneThing`, a step points at it by a fixed name |
| Whether a FIELD exists | Whether the app DOES anything with it | 34 concept items graded "Yes" on storage; the first one traced (ramps) turned out to be stored and never acted on |
| The four call sites I could see | Every call site | Phase 0 predicted 4, there were 10; six were found by tests, three were in live screens |
| The migration that CREATED a table | The live database | v1 claimed `life_answers` took one key; a later migration had already changed that, and a whole deliverable was built on it |
| The error COUNT going down | The baseline that locks it in | Four lint errors fixed, baseline left high, four errors of headroom left for a regression |
| My own new code, by reading it | My own new code, by removing each fix | Three bugs in my Phase 0 work; the worst would have silently orphaned months of journal entries |

### The second shape: the check only ran because the owner pushed

Every correction above arrived **after a question**, not from my own pass. The
north star claim was defended from the plan's text and only checked when it was
challenged a second time. That is the difference between a process and a reflex,
and it means the owner is doing the quality assurance. If you notice yourself
answering a challenge before running anything, that is the failure happening.

### The third shape, and the most useful one to steal

**One worked example from the owner outranks a survey of thirty-four.**

The concept table in this document has 34 rows, each with a verdict. It looked
like evidence. The owner picked ONE item — habit ramps — and traced it, and the
verdict was wrong. That did not make one row wrong. It made the **method** wrong,
and therefore every row suspect, because all 34 were graded the same shallow way:
*is there somewhere to put this?* rather than *does the product do this?*

So: **when you produce a table of N verdicts, they were all reached the same way.
Before presenting it, take one row at random and check it as deeply as you can.
If it falls, the table falls, not the row.** N rows of shallow checking is worth
less than one row of deep checking, and it is far more dangerous, because it
reads as thorough.

### The worked example, in full, because it is the clearest one

The owner writes: *approach 10 a week, building to 25 over two months.*

- What is stored: the build-up, faithfully. `rampSteps` on the plan goal,
  `ramp_steps` on the counted goal (`northStarTrackService.ts`, `goalToInsert`).
- What the product does: sets `target_value` to one number, once. Week five asks
  for the same number as week one.
- What reads the ramp back to move the target: **nothing.** `goalsService.ts` has
  the functions; a grep for their callers returns empty.
- The verdict I gave item 8: "Yes".
- The honest verdict: **remembers it, never acts on it.**

### What to do differently, operationally

1. **A claim that is challenged is a claim to CHECK, not to defend.** Run
   something, then lead with what it found. See `.claude/rules/plans.md`.
2. **"There is a field for it" is never the same sentence as "the product does
   it."** For any claim about behaviour, take one real input the owner would
   actually write and follow it all the way to what appears on screen.
3. **Before presenting any survey, deep-check one row.** Treat a hit as a
   category failure, not an exception.
4. **The owner's single example is a probe into a class.** When they name one
   thing, they are testing the class it belongs to. Answer about the class.
5. **State separately what you checked and how, versus what you inferred.** Three
   of the mistakes above would have been caught by writing "inferred from the
   plan text" next to the claim instead of stating it flat.

### What this means for the plan you are holding

The concept table in this document is **not trustworthy as a product audit**. It
is a storage audit. It was correct about where things would live and wrong about
whether they work. The behavioural re-grade — every item traced through the
running app to a verdict of *does it* / *remembers it and does nothing* / *cannot
hold it* — was recommended to the owner on 2026-09-19 and had not been run when
this was written. **Do not build Phase 1 on the strength of that table.**

## What would count as a failure

Written before the work, on 2026-09-19, because the owner asked — and because a
standard set afterwards is not a standard. The table count is not on this list. It
is expected to move, and seven of the owner's own concept items are already marked
as needing an addition. Growth is not failure; the seven below are.

**1. Something you wrote does not come back.** One journal line, one daily rating,
one goal, one checkpoint. Measured exactly: your real plan in, compared field by
field on the way out, against a real database. The number that is allowed is zero.
This is the only one on the list that cannot be undone, which is why the whole-plan
save never touches the day tables and why the 76 snapshots are exported before
anything is dropped.

**2. It comes back, and it is wrong.** A goal under the wrong area, a date a day
out, a number that reads plausibly and is false. Worse than loss, because nothing
on screen says so. Round-tripping cannot catch it — a plan round-trips perfectly
with every goal misfiled. Measured by reading twenty of your goals end to end in
the running app, the way you would read them, and reporting what I found.

**3. A check that cannot fail.** The trap this plan already documents: comparing
the plan as TEXT would pass while losing every rating, tick and journal entry,
because `planAsText` never prints them. If an instrument is decorative, every
claim resting on it is worthless. Measured the way Phase 0 was: remove each fix in
turn and watch its test go red. A test that stays green is deleted or rewritten.

**4. Adding the next thing is expensive.** The real test of the design. Adding the
affirmation deck (concept item 20) should be one migration and one mapper entry.
If it means touching six places because a fact ended up stored twice, the "one
fact, one place" rule failed and the schema is wrong regardless of how many tables
it has. Measured by counting the files a one-field addition touches.

**5. You find it on the first screen.** The failure with the longest history here:
"done" is claimed, the owner opens the product, and the first thing they read is
wrong. Measured by the count of defects the owner reports on a first read after I
have said a phase is finished. The target is zero, the historical record is not,
and any number above zero means my attack pass ran on the wrong thing.

**6. Somebody else can read or change your plan.** Not merely unlikely — refused by
the database itself, not by the app. Measured by signing in as a second account and
failing to read or write the first account's rows, and by `npm run audit:rls`.

**7. I defend a claim instead of checking it.** The process failure the owner caught
on 2026-09-18: "nothing points at the north star" was defended from the plan's own
text and found false in the code one question later. Measured per exchange: when a
claim is challenged, a check runs before the answer, and the answer leads with what
it found. A second occurrence means the rule in `.claude/rules/plans.md` is not
working and needs to become something that fails a build rather than advice.

**What is NOT failure:** the table count changing; a design decision revised as the
product grows; bugs found during the work by tests or by the attack pass. The third
is the process succeeding, and it is the reason the first two stay cheap.

## How *you* can check this is right

### The check that does NOT work

Copy your plan as text before and after, and compare. **It would pass while losing most
of your plan.** `planAsText` (`northStarService.ts:3607`) is a readable summary: it never
prints your belief and desire ratings, reasons, a goal's values, its habits, its ramp
steps, whether a checkpoint is ticked — or **any** daily rating, tick, note or journal
entry. Two identical documents, a year of journalling on the floor.

### Check 1 — nothing was lost

**Your real plan goes in; the identical plan comes back out**, compared field by field.

**[v1 was wrong]** v1 filed this as a unit test, which cannot prove it — a unit test with
a fake database only proves the mapper agrees with itself. It runs as an **integration
test against a real Postgres** (`tests/integration/db/lifePlanRoundTrip.integration.test.ts`),
using the container the repo already starts.

Run against five inputs:
- the worked-example plan that ships with the flow;
- **your real plan** (you paste it, or I use the snapshot — see blocker 6);
- a plan with a morning **and** a night routine — the id-collision case from Phase 0;
- a plan where a goal, a routine step and a field have each been **deleted**, so `seq` is
  strictly greater than every surviving id — the only fixture that fails if `seq` is
  dropped;
- a few hundred generated plans, including empty, 400 days of journal, and a question
  hung off a deleted step.

**Zero differences means nothing was lost.** A forgotten field shows up as one line
naming it.

### Check 2 — the tables are real tables, not a disguised blob

Four questions, each answerable in one query without loading anyone's whole plan:

- Which goals have no *why* written under them?
- Every obstacle anyone has written, across all goals?
- Which days did I rate Health below 5, and what did I write that day?
- Which goals in my plan have never been pushed to the goals screen?

I run all four and paste the queries and their answers.

### Check 3 — catches the mistake before it happens

A test that reads `NsPlan` and its nested types and fails the build if any field has no
home in the schema. **[v1 left its scope undefined]**: it walks `NsPlan` and the eleven
types under it, by name, listed in the test.

### Check 4 — the one v1 missed

Round-tripping proves nothing was *lost*, not that anything is *right*. A plan can
round-trip perfectly with every goal filed under the wrong area. So: **after the
conversion I read twenty of your goals end to end, in the app, and report what I found.**
`.claude/rules/generated-data.md` requires this and v1 offered it as optional.

### What I hand you at the end of Phase 1

1. Check 1 on your own plan: `0 differences`, or the list.
2. The four queries from check 2 with real answers.
3. Check 3 and 4 in the suite / done.
4. Screenshots: plan written in one browser, same plan open in another, **and the
   tracking dashboard on the second device showing your season band**.

---

## The phases

### Phase 0 — Make the plan's ids safe to use as keys — **DONE 2026-09-18**

**Built, tested, and it cost more than the plan said.** What v2 described as four
call sites was **ten**, and the tests found the other six rather than inspection:
`practiceState`, `applyRoutineNeed`, `trackPractice`, `practiceIsOn`, `addPractice`,
`removePractice`, `routineNeedState`, `templateFootprint`, plus three screens
(`RoutineCard`, `AreaBuilder`, `GuidedBuild`). Every one compared a LIBRARY name
against the step's OWN id, which worked only while the two were the same field.
Left alone, the library menu would have shown nothing ticked, "add this practice"
would have added a second copy on every press, and a routine need would never have
read as met.

**The class fix, so an eleventh caller cannot get it wrong:** one exported
`routineHasLibraryStep(routine, libraryStepId)` and `libraryStepsInStack(routine)`
in `northStarService.ts`. Nothing outside asks the question by hand any more.

**[v2 was wrong about the damage]** v2 said Phase 0 "changes the ids inside every
existing browser plan" and gated it as destructive (blocker 3). It does not, and
does not need to. New steps get counter ids; **a saved plan keeps every id it has**,
except a genuine in-plan duplicate, where the FIRST occurrence keeps its id and only
the later one is renamed. Every existing tick, daily question and sub-step already
points at the first, so nothing is orphaned and nobody's browser has to be visited.

**A data-loss bug this work introduced, caught by an existing test:** rebuilding a
routine's stack on a preset swap minted a fresh id for a step that was already there,
and the journal and the tick log are keyed by step id. Three months of writing would
have quietly stopped belonging to its row. A step that survives a swap now keeps its
id; the library's words are still refreshed, which is what a preset is for.

**Two more defects, found by attacking the finished work rather than by a test:**
① a checkpoint's id prefix is not decorative — `m` means the ladder generated it and
`c` means somebody typed it, and rebuilding a climb tells them apart with
`id.startsWith("m")`. The de-duplicator renamed with the kind's default prefix, which
would have stranded a generated rung as un-regenerable. A renamed id now keeps its own
prefix. ② `priorityIds` must cover every goal exactly once, because a goal's rank IS
its index and `orderedGoals` renders from that list. Renaming a duplicate goal dropped
it from the list, so it would have disappeared from every ordered view. The repair
appends anything uncovered.

**Tests:** `tests/unit/goals/northStarStepIds.test.ts`, 12 tests. Each of the five
fixes was removed in turn and the suite went red, so none of them is decorative.
`tests/unit/goals`, `tests/unit/architecture` and `tests/unit/navigation` are green
at 2,336 tests, plus the 10 new ones.

**[Blocker 7 was stale, closed 2026-09-18]** `supabase db query --linked` exists and
works — the CLI is 2.117.0 now, not the 2.75.0 the plan was written against. Verified
by running it. `.claude/rules/database.md` is correct as written and was not changed.

The original description follows, for the record.

**Nothing can be built until this is done.** Two routine steps in one plan can share an
id today (finding above). Under database keys that is a failed save.

- `northStarService.ts:212` — `stepFromLibrary` mints a real id from the counter and
  stores the library's name in a new `libraryStepId` field on `NsRoutineStep`.
- The three places matching on the library name switch to `libraryStepId`:
  `toggleRoutineStep` (`:1109-1114`), `isUntouchedLibraryStep` (`:279-283`),
  `applyRoutinePreset` (`:1218`) — the last must re-key on `libraryStepId` or every placed
  step loses its week-grid slot on a preset swap.
- `highestSeq` (`:811`) is fixed to scan **every** kind, not just areas, routines and
  goals.
- Extract `normalizeNsPlan(obj: unknown): NsPlan` out of `loadNsPlan`, holding every
  existing repair. `loadNsPlan` becomes `JSON.parse` plus a call to it. No behaviour
  change. **[v1 was wrong]** — v1's mapper would have been a second copy of every plan
  invariant, in a file with no tests; this gives them one implementation.

**Acceptance:** a unit test builds a plan with a morning and a night routine and asserts
all step ids are distinct; a test asserts `highestSeq` sees a checkpoint id; existing
`northStar*.test.ts` stay green.
**This is a destructive change to live browser data** — every existing plan's step ids
change on next load. Gated: see blocker 3.

### Phase 1 — Your plan is on your account

**You can:** write a plan on your laptop, sign in on another browser, find it there.

- Migration: 25 tables, owner-only rules, `save_life_plan`.
- `save_life_plan(p_rows jsonb, p_expected_rev int) RETURNS int LANGUAGE plpgsql
  SECURITY INVOKER SET search_path = public`. **SECURITY INVOKER explicitly**, copying
  `finish_program_workout` — `DEFINER` would walk past every rule the same migration
  creates. `p_rows` is one pre-mapped array per table; **the function does no mapping and
  no branching on kind** — that is the mapper's job and duplicating it in SQL would put
  untested policy in the database. Stale revision → `RAISE EXCEPTION ... ERRCODE 55000` →
  route returns HTTP 409 → the page shows "this plan changed on another device — reload".
- `src/db/lifePlanRepo.ts`, `src/db/lifePlanTypes.ts`, `src/goals/lifePlanMapper.ts`
  (pure; rows→plan hands off to `normalizeNsPlan`).
- `app/api/life-plan/route.ts` (GET/PUT, ≤50 code lines).
- `app/life-mastery/page.tsx` loads the plan server-side, as it already does for goals.
- `NorthStarFlow` saves to the server; browser storage becomes a one-time import plus a
  read-only offline cache.
- **Import rule, stated:** if the account has a plan, it wins and the browser copy is
  ignored; the browser copy is imported only when the account has none; a marker key
  records that the import ran so it cannot run twice.
- **A failed save is loud.** No silent fallback.
- **`SeasonBand` stops reading localStorage.** **[v1 missed this entirely.]** It is
  rendered by `ProgressDashboard` in the tracking slice, on the page you open daily.
  Left alone, signing in on a second device shows "build your plan" at the top of the
  dashboard — the exact failure this work exists to fix, in the most visible place in the
  app. It takes its data as props from the server page, and its entry is removed from the
  architecture test's allowlist (that allowlist may only shrink).
- New user with no plan row: the repo returns `null`, the flow starts empty. Stated
  because v1 left it undefined.

**Acceptance:** two browser contexts, same account — write in one, reload the other.
Check 1 green. Tracking dashboard on the second device shows the season band. A save
built on a stale revision returns 409 and the page says so.

### Phase 2 — Your daily record is on your account

**You can:** tick your morning routine on your phone and see it on your laptop.

- `app/api/life-plan/day/route.ts` owns exactly the four day tables and writes nothing
  else.
- **[v1 was wrong]** v1 said "Today, Journal and Review tabs write per day". They do not.
  Today also adds/renames/moves/removes daily fields and sub-steps, sets a step's
  destination and question, and ticks experiences — all plan structure, all bumping
  `seq`. Those go through the whole-plan PUT and carry the revision check. "Review" is not
  a tab; the per-area review lives in `life_plan_areas`.
- Dates come from the user's timezone via `getUserTimezone`, never the server's.

**Acceptance:** tick in context A, assert in context B. Then save a structural change
from context A and assert context B's tick survives. A simulated year asserts saving one
day writes one day.

### Phase 3 — Goals are created one way

**You can:** rename a goal, push again, see the new name with your streak intact.

- `user_goal_id` is the link; the push resolves an existing row by `user_goal_id` first
  and never by `template_id` — the tag is written, not read for identity.
- `NS_TRACK_RUN_KEY` is deleted; "start over" creates a new `life_plans` row.
- `createGoalBatch` gains opt-in `onDuplicate`, template branch only.
- Deleting a plan goal offers to archive its counted goal; never deletes silently.
- **An archived or deleted counted goal** sets `user_goal_id` back to null (the foreign
  key is `ON DELETE SET NULL`) and the row shows as pushable again.

**Acceptance:** `life-mastery-track.spec.ts` extended — push, rename, push again, assert
new title and unchanged count. Plus: push, "start over", push the new plan's first goal,
assert a **second** row is created and the old row is untouched.

### Phase 4 — The database stops contradicting itself

- Drop the stale duplicate `user_goals_display_category_check`, keep `chk_display_category`.
- Re-run `scripts/generate-goal-constraints.ts` to close the 44-vs-42 drift.
- Add the missing `aligned_values` column to `tests/integration/schema.sql`.
- **[deleted]** The `lifeAnswerRepo` bullet — the bug does not exist.

**Acceptance:** `enumConstraintSync.integration.test.ts`, plus a test that inserts one
row for every value the code declares valid and asserts none is rejected.

### Phase 5 — The old versions come down

**Destructive. Gated — see blocker 4.**

- One line per deleted path saying what it did and what replaced it. Anything without
  such a line is not deleted. Zero-hit `grep -rn` output pasted for each deleted symbol
  before deletion.
- Also delete, which v1 missed: `src/goals/northStarStorage.ts` (its only caller is the
  new-goals flow), `tests/e2e/vision-plan.spec.ts`, and the four link cards plus
  `ARCHIVED_HREFS` entries in `app/test/page.tsx` (`route-sweep.spec.ts` reads that file).
- **[v1 was dangerously wrong]** v1 said "remove the now-dead `fw:` namespace". That
  namespace is one entry in a two-entry array whose own comment calls removing an entry
  "lethal": the goals hub auto-archives any goal whose tag it does not recognise, and
  **310 live goals still carry `fw:`**. They would vanish from the list with no error.
  Worse, `NS_TRACK_PREFIX` reads that array **by position** — removing `"fw:"` makes the
  North Star prefix `undefined`. So: delete only the *producer*
  (`saveFrameworkPlan`, `getFrameworkPlanGoals`, the `fw:` mapper region), keep `"fw:"` in
  the array permanently with a tombstone comment, and replace the positional index with
  named exports.
- `plan_snapshots`: **all 76 rows exported to a committed fixture file before the table is
  dropped.** They are not in git history, and blocker 6 proposes using one of them as
  evidence — v1 scheduled the deletion of its own evidence.

**Acceptance:** `npm test`, `route-sweep.spec.ts`, `npm run audit:rls` all green; a test
asserts `fw:` is still in the prefix array.

---

## DRY, YAGNI and SOLID — the verdicts you asked for

**DRY.** Four real duplications found, all now closed:
1. `user_goal_id` vs `template_id` — the tag is written, never read for identity, and a
   test asserts they agree.
2. The area slug — v1 would have stored it *and* derived it. Now derived only.
3. `lifePlanMapper` vs `loadNsPlan` — v1's mapper was a second copy of every plan
   invariant. Now one `normalizeNsPlan`.
4. `save_life_plan` vs the mapper — v1's function would have decided which table each
   node belongs to, duplicating the mapper in SQL. Now it receives pre-mapped rows and
   branches on nothing.

**YAGNI.** Judged honestly, with only 4 accounts:
- `life_plan_nodes` — **justified, now narrowed.** Three pointers in the live type are
  genuinely polymorphic today. v1 over-applied it to everything; now it serves those three.
- The revision lock — **justified.** You will use two devices; that is the whole point.
- Storing `seq` — **justified.** It cannot be recomputed.
- The 24-table split — **justified**, on the evidence that today's loader silently deletes
  data nothing can detect.
- Randomly generated round-trip plans — **justified**, and cheap.
- **Write-behind offline cache — dropped as speculative and, worse, incoherent.** See
  open question 1.

**SOLID (single responsibility).** Three modules had two reasons to change; all three
fixed: `save_life_plan` (mapping + writing → writing only), `lifePlanMapper` (translating
+ enforcing invariants → translating only), `createGoalBatch` (one duplicate policy for
four unrelated callers → opt-in per caller).

---

## Blockers

Numbered in order this time. Each attempted at least once.

**1. Do you approve owner-only add/change/delete permissions on the 24 new tables?**
*Needs your yes — `CLAUDE.md` requires me to ask.* **Recommendation: yes.** The rule
exists to stop users writing data the system *earns* for them (badges, streaks). This is
the opposite: every field is something you typed. Without write permission you cannot save
your own plan. (v1 asked about 20 tables — the wrong number.) **Reply "1 yes".**

**2. Do you approve `save_life_plan` running as `SECURITY INVOKER`?**
*Attempted — I can write it, but the mode is a permissions decision.* **Recommendation:
INVOKER**, copying `finish_program_workout`. `DEFINER` would run as the function's owner
and ignore every rule the same migration creates. **Reply "2 yes".**

**3. Phase 0 changes the ids inside every existing browser plan. Go ahead?**
*Attempted — I can do it; it is irreversible for anyone holding an unsaved plan.* Your
plan and the test user's are the only ones. **Recommendation: yes, and I import your
current plan to the account first so there is a copy that does not depend on the browser.**
**Reply "3 yes".**

**4. Phase 5 deletes ~30 files and drops a table holding 76 plans. Go ahead?**
*Attempted — needs its own yes, separate from the others.* **Recommendation: yes, but
only after the 76 rows are exported to a committed file, and with one line per deleted
path explaining what it did.** The code is in git history; the rows are not. **Reply
"4 yes".**

**5. Is another session editing this checkout right now?**
*Attempted — `git worktree list` shows one tree and it is clean, but I can see three other
sessions open on this project, and a shared-tree collision has happened twice before.*
**Recommendation: tell me to proceed and I will avoid every tree-wide operation — no
`git stash`, no bulk revert — and apply only my own migration file.** **Reply "5 go".**

**6. Can I get your real plan for check 1?**
*Attempted — mostly solved.* I found a strong candidate in `plan_snapshots`: 50 goals, 12
areas, 340 revisions, last written 7 September — the 50 goals match your account exactly,
but the table records no owner so I cannot prove it. **Recommendation: use that snapshot,
and you also paste the live one** — open `/life-mastery`, press F12, run
`copy(localStorage['north-star-v1'])`. **Reply "6 here it is" or "6 use the snapshot".**

**7. The documented way to check the database no longer exists.**
*Attempted — failed, worked around.* `.claude/rules/database.md` says to verify saves with
`supabase db query --linked`. That command is gone from the installed CLI (2.75.0). I used
the method `scripts/audit-rls.ts` already uses; every database fact here came through it.
**Recommendation: I fix the rule file as part of Phase 0.** **Reply "7 fix it".**

**Verified as NOT blockers:** applying migrations (CLI linked, nothing pending); browser
verification (dev server up, both test accounts' credentials present); the test baseline
(4,623 pass); data loss (4 accounts, none of them a real user).

---

## Open questions

**1. What should happen with no connection?**
**[v1's answer was incoherent]** — v1 recommended a write-behind cache *and* a revision
lock. A queued offline save is by definition built on a stale revision, so the lock would
refuse it and discard the hour of work the cache was sold as protecting.
**Recommendation: keep the lock; make offline read-only for now.** The cached plan still
opens with no connection, but editing is disabled behind a visible banner — "You are
offline. Changes are not being saved." Honest, about an hour of work. Real offline editing
needs per-field merge, which is a project of its own.

**2. What happens to the 50 goals already pushed from your account?**
**Recommendation: re-link them once from the browser that still holds the old run code —
yours does.** If that browser is gone, the honest outcome is 50 goals you archive by hand.

**3. Keep `/api/plan-snapshots` locked down instead of retiring it?**
**Recommendation: retire it in Phase 5.** Once plans are on accounts it shows you nothing
new, and it is an unauthenticated service-key write path.

**4. Should deleting a plan goal delete the counted goal?**
**Recommendation: no — offer to archive, defaulted to yes, never delete.**

**5. `life_areas` and `user_goals.life_area_id` are empty and unread.**
Zero rows, zero references, no code touches either. **Recommendation: leave both alone
and decide after Phase 3** — `CLAUDE.md` says never delete code whose purpose I cannot
explain, and I cannot explain this one.

**6. The quit-a-vice module stays browser-only.**
You said vices are out of scope; nothing here touches them. Recording the cost: those nine
pages are live, and everything written into them is lost when the browser is cleared.
**Recommendation: leave it.** That data is the most damaging thing in the product to leak,
and data that never reaches a server cannot be breached or read by anyone holding the
service key.

---

## Verification

0. Checks 1–4 above. These come first; everything else is secondary.
1. `npm test` — green, `.test-known-failures.json` still empty.
2. `npm run test:integration` — new tables in `tests/integration/schema.sql` and in the
   truncate list; enum-sync passes. **Coordination (2026-09-18):** `docs/plans/foundation.md`
   (draft, another session) proposes replacing `schema.sql` with a real dump plus a shim.
   If that lands first, the new tables reach the test database through the migration
   alone and nothing is added to `schema.sql` by hand; if this plan lands first, the
   dump picks the tables up. Whichever is second adapts.
3. `npm run test:e2e`.
4. `npm run audit:rls`.
5. **In a real browser** (`localhost:3000`, Playwright MCP, `test-user-b`): sign in, write
   a north star, add an area and a goal, push it, tick something, write a journal line.
   Second context, same account: confirm all of it. Rename, push again, confirm new title
   and unchanged count. Open the tracking dashboard and confirm the season band.
6. **Against the database, not the screen** — read the rows back.
7. `/code-review` and `security-review` — the latter is required; this touches permissions.

---

# PART 2 — EXECUTION

## The node contract — read this before writing any SQL

Three independent agents derived this schema and produced **three different, incompatible
key shapes** for the node table. That is exactly where a smaller model guesses wrong, so
it is pinned here, once:

```sql
CREATE TABLE IF NOT EXISTS life_plan_nodes (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id  UUID NOT NULL,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind     TEXT NOT NULL CHECK (kind IN (
             'north_star','area','goal','checkpoint','obstacle','belief','habit',
             'routine','routine_step','split_day','experience','field','sub_step')),
  local_id TEXT NOT NULL CHECK (char_length(local_id) BETWEEN 1 AND 80
                                AND local_id ~ '^[A-Za-z0-9_:.-]+$'),
  CONSTRAINT life_plan_nodes_plan_fk FOREIGN KEY (plan_id, user_id)
    REFERENCES life_plans (id, user_id) ON DELETE CASCADE,
  CONSTRAINT life_plan_nodes_local_key  UNIQUE (plan_id, local_id),
  CONSTRAINT life_plan_nodes_detail_key UNIQUE (id, user_id, kind),
  CONSTRAINT life_plan_nodes_owner_key  UNIQUE (id, user_id)
);
```

- **Every detail table** carries `id UUID PRIMARY KEY`, `user_id UUID NOT NULL`, and
  `node_kind TEXT NOT NULL DEFAULT '<its kind>' CHECK (node_kind = '<its kind>')`, with
  `FOREIGN KEY (id, user_id, node_kind) REFERENCES life_plan_nodes (id, user_id, kind)
  ON DELETE CASCADE`. A row cannot lie about what it is.
- **The three polymorphic pointers** — `life_plan_fields.target_id`,
  `life_plan_sub_steps.target_id`, `life_plan_day_ticks.node_id` — use
  `FOREIGN KEY (target_id, user_id) REFERENCES life_plan_nodes (id, user_id)`, with
  `ON DELETE SET NULL` for fields (matching today's re-home-to-the-day) and
  `ON DELETE CASCADE` for the other two (matching today's drop).
- **Every other reference targets its specific table**, so the wrong kind is refused.
- `local_id` is the plan's own id, stored verbatim, never rewritten. `NsDailyField.readSourceId`
  is the one id that is **not** a node id — it names a code registry entry and gets no
  foreign key.

## The DDL

The complete annotated `CREATE TABLE` set for all 25 tables was derived during review and
is the **first deliverable of Phase 1**, written to
`supabase/migrations/20260915100000_life_plan_tables.sql` and shown to you before it is
run. It follows `20260908100000_program_drafts.sql` house style: banner comment, `CREATE
TABLE IF NOT EXISTS`, uuid keys, CHECK constraints mirroring the TypeScript const arrays,
`ENABLE ROW LEVEL SECURITY`, policies wrapped in `DO $$ BEGIN ... EXCEPTION WHEN
duplicate_object THEN NULL; END $$`.

Rules it must satisfy, so none of them is a judgement call at write time:

- **`life_plan_north_stars`**: `id` is a node of kind `north_star`; `text TEXT NOT NULL
  DEFAULT ''` (≤ 20,000 chars), `horizon_years SMALLINT NOT NULL CHECK (horizon_years IN
  (5, 10, 20))`, `UNIQUE (plan_id)`. `life_plans` carries neither column. The mapper gives
  the row `local_id = 'north_star'`, a name no counter-minted id can collide with.
- **`position INTEGER NOT NULL`** on every table whose rows are an ordered array in the
  plan — areas, values, goals, routines, routine steps, split days, checkpoints,
  obstacles, beliefs, habits, experiences, fields, sub-steps — each with
  `UNIQUE (parent, position) DEFERRABLE INITIALLY DEFERRED`.
- **Absent is not null.** `NsRoutineStep.goesTo` and `.asks` have three states: never set,
  deliberately cleared, and set. Their columns are nullable **plus** a
  `goes_to_set BOOLEAN NOT NULL` companion, because the loader's inference must run on the
  first and never argue with the second.
- **Re-read `NsRoutine`, `NsRoutineProgram`, `NsSplitDay` and `NsRoutineStep` before
  writing the routine DDL.** The training rebuild (`docs/plans/training-three-doors.md`,
  in flight 2026-09-18 in another session) is changing how a routine's training week is
  derived: from the enrollment rather than copied into the plan. Whatever those types
  say on the day the migration is written is what the columns mirror; the check-3 test
  fails if they drift afterwards.
- **`life_plan_routines`** carries `enrollment_id UUID REFERENCES program_enrollments(id)
  ON DELETE SET NULL` and nothing else about the program. **[v2 was wrong, corrected
  2026-09-18]** v2 also mirrored `program_catalog_id`, `program_label` and
  `program_started_at`. The training rebuild shrinks `NsRoutineProgram` to
  `{ enrollmentId }`: the program's name, catalogue id and start date live on the
  enrollment row and are read from there, so a copy here would be a second answer to
  one question (rule 1). Checked: no code reads those three fields today, and the loader
  already drops `program` on every reload. `SET NULL`, not cascade: ending a program must
  not delete the training week.
- **`life_plan_routine_split_days` holds only a week somebody wrote by hand**, with no
  enrollment attached. A routine with `enrollment_id` set has no split-day rows; its days
  are derived from the enrollment's own schedule by the training slice's
  `describeProgramWeek`. The mapper enforces this and a unit test asserts it, because a
  CHECK cannot span two tables.
- **Migration filenames sort after `20260910090000`**, the latest applied. v1's proposed
  `20260914*` names sort correctly but v1 also proposed them for a phase that now runs
  second; the numbers in this document are the ones to use.

## Files

**Created:** `supabase/migrations/20260915100000_life_plan_tables.sql`,
`20260915110000_goal_constraint_repair.sql`; `src/db/lifePlanRepo.ts`,
`src/db/lifePlanTypes.ts`; `src/goals/lifePlanMapper.ts`; `app/api/life-plan/route.ts`,
`app/api/life-plan/day/route.ts`;
`tests/integration/db/lifePlanRoundTrip.integration.test.ts` (check 1),
`tests/unit/goals/lifePlanTypeCoverage.test.ts` (check 3),
`tests/unit/goals/lifePlanGoalContract.test.ts`, `tests/unit/db/lifePlanRepo.test.ts`,
`tests/fixtures/real-plan.json`, `tests/fixtures/plan-snapshots-archive.json`,
`tests/e2e/life-mastery-persists.spec.ts`.

**Changed:** `northStarService.ts` (Phase 0: step ids, `highestSeq`, `normalizeNsPlan`),
`types.ts` (`libraryStepId`), `NorthStarFlow.tsx`, `TrackTab.tsx`, `TodayTab.tsx`,
`JournalTab.tsx`, `SeasonBand.tsx` (props not localStorage), `ProgressDashboard.tsx`,
`app/dashboard/tracking/page.tsx`, `northStarTrackService.ts`, `goalRepo.ts`
(`onDuplicate`), `data/northStar.ts`, `data/templateNamespaces.ts` (named prefixes),
`app/life-mastery/page.tsx`, `app/test/page.tsx`, `tests/integration/schema.sql`,
`tests/support/writeCoverage.baseline.json`, `tests/unit/architecture.test.ts` (shrink the
SeasonBand allowlist entry), `.claude/rules/database.md`.

## Reuse — do not rebuild

`requireAuth()` (`src/db/auth.ts`) · `createServerSupabaseClient()` (`src/db/supabase.ts`)
· `getUserTimezone()` (`settingsRepo.ts`) · `toDateISO`, `periodStartFor`
(`shared/dateUtils.ts`) · `readAllRows`, `chunkIds` (`db/paging.ts`) · `goalToInsert`
(`northStarTrackService.ts:130`) · `updateGoal` (`goalRepo.ts:550`) · `goalEnums.ts` ·
`templateNamespaces.ts` · the `finish_program_workout` RPC pattern (`workoutRepo.ts`) ·
`tests/helpers/fakeSupabase.ts` and the call-recording variant in
`tests/unit/health/trainingSettings.test.ts` · migration style from
`20260908100000_program_drafts.sql`.

## Rules this must not trip

- API routes ≤ 50 code lines; database access only in `src/db/*Repo.ts`.
- A new repo file has an unpaged-read allowance of **0** — every read needs `.range()`,
  `.limit()`, `.single()`/`.maybeSingle()` or a count. The day tables exceed 1,000 rows
  within three years; page them from day one.
- No new component fetches its own data; the allowlist only shrinks (and SeasonBand comes
  **off** it).
- Write-coverage ratchet has **5 slots left** (131 of 136). Every new exported write
  function needs a payload-asserting test and an `"asserted"` entry.
- Never `toISOString().split("T")[0]`.
- `supabase migration list --linked` before every `db push --linked`.

## Order

Phase 0 → 1 → 2 → 3 → 5. Phase 4 is independent and can run any time. Executed end to
end once approved; no per-milestone checkpoints.
