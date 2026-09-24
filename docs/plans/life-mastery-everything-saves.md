<!--
Written 2026-09-23 by Claude, session de494c37, after the owner said "some things,
like daily tracking, do not save to the account on Life Mastery".

Draft 3. Drafts 1 and 2 were attacked by six independent reviewers before the owner
saw either; they found 39 must-fix and 47 should-fix defects, seven of which were
false claims of mine and one of which was a live data loss I had missed entirely
(the season focus). Every correction is folded in, and the ones that change what the
owner is told are listed under "What the earlier drafts got wrong", because a plan
that hides its own corrections teaches nothing.

Continues docs/plans/life-mastery-deployment.md, whose Phase 1 is BUILT but NOT
DEPLOYED — it exists only on `training-rebuild`; /api/life-plan is 404 on
daygame-coach.vercel.app. Its five approved rules stand and are not re-opened here.
-->

# Life Mastery: everything you write reaches your account

*Nothing here has been built. Everything was checked against the running code or
the live database on 2026-09-23. Anything I could not check says so.*

*Serves `docs/product/vision.md` item **16** ("the plan lives mostly in the browser
and must be saved to the database — all of it must become operational"), and under
it items **1** (Life Mastery and Tracking are one system), **2** (everything links
to everything), **9** ("nothing can go wrong", not "the happy path works") and
**12** (it works on a phone). It does not advance items 3, 23 or 25 — achievements
from your own goals is a build, not a fix, and stays after this.*

---

# PART 1 — FOR YOU

## Words this uses

- **Your account** — the database. Data there follows you to any device and
  survives clearing your browser.
- **Browser storage** — one lump of text inside one browser on one device. Clear
  your browsing data and it is gone; it was never on your phone.
- **The day half** — ratings, ticks, the line about the day, journal answers.
  Anything dated.
- **The plan half** — north star, areas, goals, routines, values. Anything that
  is true until you change it.
- **Node** — one part of your plan (a goal, an area, a routine step) as a row in
  the database, with an id other rows can point at.
- **Cascade** — "when the parent goes, the children go with it."

## The short version

**Start here, because it reframes everything below.** **Life Mastery exists on one
branch and nowhere else.** `app/life-mastery/` has twelve files on `training-rebuild`
and **zero on `main` and zero on `beta`**; `daygame-coach.vercel.app/life-mastery`
answers **404** and always has. The place you use it is `localhost:3000`, and the dev
server there serves this branch — I checked: `/life-mastery` answers 307 and
`/api/life-plan` answers 401, so both exist locally right now.

**Everything in this document is therefore live for you today**, including the four
ways work gets destroyed. "It is not deployed, so it is not urgent" was my reasoning
for about an hour this morning, and it was wrong: I checked the deployed site as a
stand-in for *where you use the product*, which is the exact substitution the
project's first rule is about. A peer session caught it.

The plan half does save, on this branch, which is the only place there is. That
landed this week. The day half does not.

**The day half does not.** Ratings, ticks, the day note, journal answers: one
browser, nowhere else. That is what you were told and it is true.

Eight other things you write also do not reach your account, and **four ways of
losing work you have already written are live in the product today.** One of those
four — the one I would fix first — can replace your whole plan with an empty one.

## Is this urgent, honestly

This section has been wrong twice, in opposite directions, and both corrections came
from outside me. It is worth keeping the record straight because the conclusion moved.

Draft 1 said: do not open Life Mastery. A reviewer called that a production panic on
a product with four accounts and no users. Draft 2 said: the defect is not on the
site you use, so M0 is only a merge blocker. **That was worse — it was wrong.** I had
checked `daygame-coach.vercel.app` as a stand-in for "where the owner uses this", and
Life Mastery is not there at all; it is on this branch, which is what `localhost:3000`
serves, which is where you use it.

**The accurate statement: all four destroyers are reachable by you today, locally.**
Not an emergency in the sense of dropping everything — four accounts, no users, no
payments — but not a merge blocker either. They are ordinary live bugs in the copy of
the product you actually open, and M0 is the first work.

One thing worth knowing while M0 is unbuilt: the only copy of your plan outside your
browser is the mirrored one from **7 September**, and it is overwritten rather than
versioned.

If you want a copy of your plan in your own hands, it is thirty seconds: open
`/dashboard` (**not** `/life-mastery` — opening that runs the loader that eats part
of the journal, so a copy taken there is already damaged), press F12, run
`copy(localStorage['north-star-v1'])`, paste into a file. I cannot do it for you:
it is inside your browser and nothing on the server can reach it.

## What is new here, and what is not

You approved `docs/plans/life-mastery-deployment.md`. Phase 1 of it is built. Do
not read 500 lines looking for what changed:

- **New, found by running the built code:** the four destroyers (M0), the season
  focus being dropped, the day route's design, and six things browser-only that
  no plan has named.
- **Re-issued from the plan you approved, unchanged in intent:** the day half on
  the account (its Phase 2), the goal link (its Phase 3), retiring the snapshot
  route (its Phase 5).
- **Withdrawn:** its Phase 5 said to commit the 103 snapshot plans into the
  repository as a test fixture. That publishes your journal into git forever. See
  M5.

## What I checked, and how

| Thing | Finding | How |
|---|---|---|
| Where does Life Mastery exist? | **This branch only.** `app/life-mastery/` has 12 files on `training-rebuild`, **0 on `main`, 0 on `beta`**. Deployed `/life-mastery` is 404 and always has been; `localhost:3000/life-mastery` is 307 and `/api/life-plan` is 401 | `git ls-tree` on three branches; `curl` against both |
| Does the plan half save? | Yes **on this branch** — 25 tables, `save_life_plan`, revision lock. The tables and the function are applied to the live database even though the code is not deployed, so the database is ahead of the app | Queried the live database |
| Does the day half save? | **No.** `planToRows` never emits the day tables; `rowsToPlan` returns all four as `{}` | `lifePlanMapper.ts:656-659` |
| Do the day tables exist? | Yes, all four, owner-only rules (4 policies each), one index | Queried `pg_class` / `pg_policy` |
| Rows in them | 0, 0, 0, 0 | Queried the live database |
| Your plan on the account | **None.** The only `life_plans` row is the test account's, written 2026-09-23 08:14 | Queried `life_plans` joined to `auth.users` |
| The import defect | Confirmed by running it: marker set + empty row ⇒ `use-server` with `northStar: ""` | Ran `decideOnLoad` against the real `rowsToPlan` |
| The journal defect | Confirmed by running it: one save/load turns `{"2026-09-23":{"s5":"…"}}` into `{}` | Ran `setJournalEntry` then `loadNsPlan(serializeNsPlan(…))` |
| The season focus | **Dropped whenever it is a goal.** The mapper resolves it only through the area map; the column's key points at areas | `lifePlanMapper.ts:428`; migration line 729 |
| The save loop | The effect lists `revision` and `serverState` in its own dependencies and its success handler writes both | `NorthStarFlow.tsx:472-510`; a reviewer drove it: 14 PUTs in 60 idle seconds |
| "Start over" | Does not reach the account. `emptyNsPlan()` is "untouched", so the save is skipped and the next load brings the discarded plan back | `NorthStarFlow.tsx:894`, `:475` |
| Pushed-goal link | `life_plan_goals.user_goal_id`: **0 rows set**, and nothing calls `linkPlanGoal` | Queried, then grepped |
| One plan per account | `life_plans_one_per_user UNIQUE (user_id)` — so "start over makes a new row" is impossible as the old plan wrote it | Read the migration |
| `plan_snapshots` | **103 rows**, unauthenticated, service key, no owner. **Upserted one row per browser — no history** | Queried; read `planSnapshotRepo.ts` |
| Whose clock | The flow already uses the account's timezone. `SeasonBand` uses the browser's, on an allowance in `northStarToday.test.ts:33` | Read all three |
| The promised round-trip test | **Never built**, and no test anywhere walks `NsPlan` | `find tests -iname "*lifeplan*"` |
| Lint / types | Lint 335 against a baseline of 338; types 98, none new. Green | Ran both ratchets |
| Write-coverage ratchet | `MAX_UNASSERTED = 131`, baseline holds exactly 131. **Zero slack** | `tests/unit/writeCoverage.test.ts:76` |
| `supabase db query` | The global binary (2.75.0) has none; **`npx supabase` is 2.117.0 and does** | Ran both |
| Your day data's size | **Not checked.** Reading it means reading your journal; the production read was refused, correctly | Attempted, denied |

## The four ways work is destroyed

None needs a second device, and **all four are reachable by you today on
`localhost:3000`** — measured, not assumed: `/life-mastery` answers 307 and
`/api/life-plan` answers 401 there. Draft 2 split them into "live" and "arrives on
merge" on the strength of the deployed site; the deployed site has no Life Mastery
page at all, so that split was meaningless. Two of them (2 and 4) are also in
`main`'s copy of `northStarService.ts` — `:2883`, `:783`, `:2854-2861` — but since
nothing on `main` mounts the flow, that is a fact about dead code, not about you.

**1. Opening the app can replace your plan with an empty one.** The first visit
creates an empty plan row on the account and writes a marker saying "imported",
then waits four seconds before sending the actual plan. Interrupt that window —
close the tab, lose the connection, have the save refused — and the next visit
sees the marker plus an empty row, loads the empty one, and writes it over the
real one in your browser.

**2. Your journal is being deleted on every page load.** A question can be asked
by a field you added or by a routine step whose own words ask for words ("Write
three gratitudes"). The app accepts an answer for both; the loader keeps only the
first. Every answer under a routine step is dropped on the next open, silently —
a missing entry looks exactly like a day you wrote nothing.

**3. A stale browser can overwrite the account's plan.** Worse than 1, and draft 1
buried it. The save runs on a timer that can fire before the account's plan has
arrived, and it then sends this browser's copy quoting a revision the server
accepts. The lock cannot catch it, because nothing is stale — the browser simply
sent old work as new.

**4. Deleting a daily question deletes everything written under it.** Not the loader
this time: the delete itself throws the answers away. The archive screen is
built to show a question you removed with its months of writing still attached and
labelled "this question is gone" — that code exists and can never run.

And one that is not destruction but a lie: **a plan loaded from your account says "Nothing written yet" underneath it**, because the "last changed"
stamp is not read back. On a new phone, at the exact moment this work exists to be
trusted. The page's own header already says "Everything saves as you type", which
is false for the whole day half on both branches.

## The nine things that do not reach your account

*One of them — the training week, number 5 — was closed on 2026-09-23 by the
training rebuild. It is struck through rather than removed.*

1. **The day half** — ratings, ticks, the day note, journal answers. Eleven write
   surfaces across six screens, all eleven ending in browser storage.
2. **Your one thing for the season, whenever it is a goal** — which the code says
   is the usual case. Silently dropped by the save. The column can only hold an
   area, so this needs a small schema change, not a one-line fix.
3. **Which goals you already pushed.** The link is a random code in your browser.
   On a second device every goal reads as never pushed, so pushing again makes a
   **second copy of all fifty**. The column built for it has never been written.
4. **The one thing's why, cost, identity and values.** They have a table, an API
   and a rule of their own — and nothing writes them. The flow keeps them
   somewhere else entirely. Two homes for one fact and the designed one is dead.
5. ~~**Your designed training week, your units, your working weights, and every
   lift you invent** on the Systems step.~~ **CLOSED 2026-09-23, by the training
   rebuild rather than by me.** `BuildYourOwn.tsx` and the 1,221-line
   `CustomProgramBuilder.tsx` are both deleted — I checked, neither file exists —
   and the week, the units and the typed weights now reach the account through
   the enrolment. Draft 1 of this plan said this was fine, which was wrong; draft
   2 said it was broken, which was right at the time; it is now fixed, and the
   line stays here struck through rather than deleted so the record of all three
   is readable.

   One piece stays in the browser on purpose and I agree with it: the autosave of
   the sentence somebody is halfway through typing (`custom-program-v1`, now just
   `{text, unit}`, cleared the moment Start is pressed). That is an unsent draft,
   the same class as a half-typed message, and putting it on an account would be
   worse rather than better. `custom-lifts-v1` is gone entirely — a lift's
   identity never depended on it, because `customLiftId` derives the id from the
   name itself.

6. **"Start over" does not reach your account at all**, so the plan you threw away
   comes back on the next reload.
7. **The dashboard's season band has been wrong since Phase 1 landed** — it reads
   a plan whose tick list is empty by construction, so it says "0 of 5 done today"
   however many you ticked. It also asks the browser what day it is while
   everything that writes asks your account.
8. **Every tick burns the lock that protects your plan.** A tick changes the plan
   object, the autosave fires, and the revision moves even though the body is
   identical. With the self-retriggering loop above it, a second device goes
   permanently "this plan changed on another device" within seconds — and once it
   does, the flow stops saving anything for the rest of the session.
9. **Your plan, journal included, is mirrored to a table nobody owns.** See M5.

**Owned by someone else, deliberately left out:** the quit-a-vice Black Box.
Another session is building `docs/plans/vice-on-the-account.md` in this same
checkout. Its data is browser-only and that is real, but it is theirs.

## The rules

Four of the five rules you approved on the deployment plan still hold and are not
re-opened: one fact stored once; column-or-table-or-list by pointability; every
row carries its owner; the whole-plan save never touches the day tables or the
goal link.

**One new rule, and it is the only thing in this section you are being asked to
approve:**

> **What you wrote in words outlives the thing it was written under. What was only
> a tick does not.**

A journal entry survives the question being deleted, and keeps the question's
words beside it so it can still be read. A tick does not survive its step, because
a tick under a step that no longer exists means nothing. *Cost if wrong:* deleting
one daily question quietly deletes months of diary — which is what happens today,
and which the archive screen already promises out loud that it does not.

*One consequence, so it is not a surprise later:* under this rule journal rows are
keyed by your plan's own id and carry the question's text, rather than pointing at
a node row. That is a deliberate exception to the plan's "everything points at a
node" shape, and it is the exception that makes the promise keepable.

## Your concept, item by item

**The question this table answers is narrow:** *after this plan, does what you
write for this item live on your account?* It is a storage audit, not a claim that
the product does the thing — the last plan's table was read as the second and was
wrong. Where I know the product stores something and never acts on it, the row
says so.

I traced item 21 all the way down rather than grading all 34 the same shallow way,
and then a reviewer traced it back up and corrected me — which is the method
working. I had read "selv definerede områder" as a self-defined *number* and graded
it Partly because no numeric field kind exists. You wrote *areas*, and custom areas
already exist and already take a daily 0-10. It is a Yes, and the schema change I
had added to serve my misreading has been taken back out.

| # | Verdict | Where it lives after this plan, or what is missing |
|---|---|---|
| 1 | Yes | `life_plan_goals.target_date` |
| 2 | Yes | Finish-line goal with named checkpoints |
| 3 | Yes | The ladder: start, target, curve, pinned rungs |
| 4 | Yes | `target_date` |
| 5 | Yes | Sentence, unit, date, belief 0-10, desire 0-10, and which guide questions were answered |
| 6 | Yes | `days_per_week` plus `per_week` in a unit |
| 7 | Yes | Counted-goal streaks on `user_goals` |
| 8 | Partly | `ramp_steps` reaches the account; **nothing reads it back to move the target**, so week five still asks for week one's number. The gap is a reader, not storage |
| 9 | Yes | `why`, `pain_why`, `feeling`, `reward`, `stake` |
| 10 | Yes | `reasons_list` — the 100-reasons drill |
| 11 | Yes | `life_plan_step_serves`: the steps that move a goal |
| 12 | Yes | `life_plan_routines` and its steps; the training week links to the real enrolment |
| 13 | Yes | A practice goal at 7 days, or a daily routine step — and after M1 its ticks are on the account |
| 14 | Yes | `is_abstinence`, set by the loader from the goal's own words and carried into `user_goals`, where it suppresses streak badges. "Partly" in the last plan; the 2026-09-20 migration closed it |
| 15 | Yes | Target goal with a unit, or a practice goal counted per week |
| 16 | Yes | Five link tables: goal→area, goal→extra areas, goal→bigger goal, routine→areas, step→goals |
| 17 | Yes | Twelve default areas, renameable, plus custom ones |
| 18 | Yes | Per area: rating, your 10 in words, purpose, snapshot, blockers, values, identity |
| 19 | Partly | Identity per area and whole-life are stored; goal stages have a column. **Feelings have no field of their own** — they ride inside the goal's feeling clause |
| 20 | Partly | Experiences get their own table. **Affirmations do not exist in this flow at all** — one table and one surface, not a redesign |
| 21 | Yes | Area ratings get a real home (M1) — and "selv definerede områder" is served by the mechanism you described: a custom area, which the flow already lets you add and rate 0-10 like any other. My first pass graded this Partly on the grounds that a self-defined daily *number* needs a numeric field kind; a reviewer pointed out that your own example is an area, not a number, and the reviewer is right |
| 22 | Partly | After M1 the ticks are on the account, which is the prerequisite. Badges still come only from counted goals, computed never stored; a routine-step tick earns nothing |
| 23 | Behaviour | The structure holds the result; deriving the chain is a feature, not a table |
| 24 | Partly | North star, season areas and goal order are all stored — but **the season focus itself is dropped whenever it is a goal**, which is this plan's M0 |
| 25 | Behaviour | Derived drivers land as habits and steps; deriving them is a feature |
| 26 | Partly | **This is the day half, and M1 is exactly this item**: the diary, reading the north star, ticking the to-do, all on the account. Partly rather than Yes for one reason only — **affirmations have no surface at all** (the same gap as item 20, graded the same way here so the two rows agree) |
| 27 | Partly | A dated goal with 20 checkpoints holds it. Sub-steps reach the account but carry **no dates and nothing paces one per day** |
| 28 | Yes | `life_plan_values`, scoped: lived by, chosen, per area, per goal |
| 29 | Behaviour | Framing during the experience; no data |
| 30 | Partly | Badge rules are written by goal shape so they fit invented goals — but only counted goals. Plan-only goals and step ticks earn nothing |
| 31 | Yes | Goals ranked by `position`; a value's weight is computable from the areas it runs through |
| 32 | Yes | `reward` per goal, celebration line per checkpoint |
| 33 | Yes | `life_plan_goal_obstacles`: what could stop you, and the counter-move |
| 34 | No | Nothing carries "how important was this to me" and no score is computed. One column on goals and steps plus the calculation. The day tables will hold what you did; not what it was worth |

## What would count as a failure

1. **One line you wrote does not come back.** One journal entry, one rating, one
   tick. Measured against a real Postgres, field by field, on a plan carrying 400
   days. The number allowed is zero.
2. **It comes back under the wrong day.** Measured by writing at both ends of a day
   in two timezones and reading the rows back.
3. **A check that cannot fail.** Every fix in M0 is removed in turn and its test
   must go red. A test that stays green is deleted or rewritten.
4. **The dashboard still says 0.** "It saves" is invisible; the number on the page
   you open daily is not.
5. **You find it on the first screen.** Measured by what you report on your first
   read after I say a milestone is done. Target zero; the history is not zero.
6. **Somebody else can read your day.** Refused by the database, not the app.
7. **Adding the next thing is expensive.** Adding the affirmation deck (item 20) or
   a numeric daily field (item 21) should be one migration and one mapper entry.

## How you can check this is right

**The check that half works, and why that is dangerous.** Copying the plan as text
before and after looks like proof and is not. `planAsText` *does* print your area
ratings — a fourteen-day average on each area's line — so two exports can agree on
the numbers while every tick, every day note and every journal line is on the
floor, because it never prints those at all. Draft 1 said it printed no ratings;
that was wrong, and wrong in the direction that would have made you trust the
check more.

**Check 1 — nothing is lost.** Your plan and 400 days go into a real Postgres and
come back field by field identical. This is the test Phase 1 promised and never
wrote.

**Check 2 — they are real tables.** Four questions, one query each, pasted with
their answers: which days did I rate Health below 5 and what did I write that day;
every line I have written under one question; which routine steps have never once
been ticked; which goals have never been pushed.

**Check 3 — the mistake cannot come back.** A test walks `NsPlan` and every type
under it and fails the build when a field has no home in the schema or is missing
from the "is anything written here" rule. **No such test exists today** — the only
mapper gate is a hand-written fixture, which passes for any field the fixture
forgot to set, and that is exactly how the season focus and the "last changed"
stamp were lost without a single test going red. So this is the first build of
that gate, not an extension of one.

**Check 4 — I read your plan back in the app.** Twenty goals and twenty days, end
to end, the way you would read them, and I report what I found. Round-tripping
proves nothing was lost, not that anything is right.

**Check 5 — on a phone.** M1's headline is "tick it on your phone", and vision item
12 says the phone is where this product is weakest, so the browser proof runs at
phone width as well as on a laptop and the screenshots are from both.

## The milestones, in the order they ship

**M0 → M1 → M2 → M3 → M4, and M5 last.** Each is a working state of the app.

### M0 — Nothing you have written can be destroyed by opening the app

**BUILT 2026-09-23.** All eleven items below are done, the migration is applied to
the live database, and `npm test` is 5,774 passing with both ratchets reporting
"none new". Each fix was removed in turn and its test went red — including the
render test, which passed both ways on its first draft and was rewritten until it
could fail. What is NOT done is listed at the end of this section.

**You can:** open Life Mastery on any device without risking what you already have.
Nothing new saves yet. Draft 1 called this half a day; it is eleven fixes across
five files plus the first test that ever renders this screen, so call it two days
and hold me to it.

- **One new rule in the decision, and nothing else changes:** a browser copy with
  something in it always beats an **empty** plan row on the account, marker or no
  marker. That alone closes the hole. Draft 1 proposed also writing the marker after
  the save instead of before; the code argues for before, in a comment, on the
  grounds that a marker lost after a half-successful save would import everything a
  second time — and a duplicate of everything is worse than an import you retry.
  That reasoning is right and stands; with the empty-plan rule in place the early
  marker is harmless, because an interrupted import simply re-imports next visit.
- No save runs until the account's plan has arrived. The guard that was written for
  this (`canSave`) has unit tests and is currently handed a made-up answer, so it
  has never once run on a real one.
- The autosave stops re-triggering itself: it compares what it is about to send
  against what was last accepted, and does not re-arm from its own success.
- **The loader stops pruning the journal at all.** Not "prunes against a bigger
  set" — that would fix the routine-step case and still throw away everything under
  a question you deleted, which is the same rule broken twice. The archive screen is
  already built to render an entry whose question is gone, labelled "this question
  is gone"; it has simply never been handed one.
- The delete path keeps what you wrote too. It is a second, separate destroyer, and
  fixing only the loader leaves it.
- **The Recap step's "start this practice" stops writing the wrong id.** It logs the
  library's name where the step's own id belongs, so the box you just ticked draws
  itself unticked on the next render. Destruction on open, so it belongs here.
- **The day stops being decided once, at mount.** Today is computed in an effect
  that never runs again, so a tab left open overnight files tomorrow's ticks under
  yesterday.
- **The season focus stops being dropped when it is a goal.** One small migration:
  the column points at any part of your plan instead of only at an area.
- **"Start over" is defined once, here, and M3 does not redefine it.** Today it
  never reaches the account, so the plan you threw away returns on the next reload.
  It clears the account's plan **in place** — the database allows exactly one plan
  per person — and it says in its own words that the day half goes with it.
- The browser-storage write is wrapped, like the one six lines above it already is.
- **The page stops promising what it does not do.** The line under the title says
  "Everything saves as you type." It is the first sentence on the screen and it is
  false for the whole day half; it goes until M1 makes it true.

**Acceptance — met, with one gap named.**
`tests/unit/goals/northStarFlowSaves.test.tsx` is the first test that ever renders
this component; it counts requests over simulated time and asserts **zero** plan
saves across a minute of an idle tab and zero for a plan differing only by a tick.
With the loop put back, three of its four tests go red. The journal, delete-path,
library-id and season-focus fixes each have a test proved the same way.

**The gap:** the render test asserts zero saves when nothing changed. It does not
yet assert **one** save when something does — driving a real edit means driving
the tab UI, and a test coupled to that markup is a test that breaks on a wording
change. The fingerprint's own unit tests cover "a real edit changes what is sent";
what is uncovered is the wiring between them. Named rather than quietly skipped.

**The merge gate stands:** this branch does not reach `main` before M0 is in it.

### M1 — Your day is on your account

**IN PROGRESS. The plumbing is built and committed (`c5bd595d`), the migration is
APPLIED, and nothing calls it yet.**

**Both blockers cleared the same afternoon.** The peer's parked migration moved
out of `supabase/migrations/` so mine could go alone, and Phase 8 finished. The
migration is APPLIED: the live table is `id` + `local_id` + `asked`, keyed
`UNIQUE (day_id, local_id)`, with no node link — checked by reading
`pg_constraint`, not by trusting the push. Its four row-level-security policies
survived, which was the whole argument for altering the table rather than
dropping it, and `npm run audit:rls` is clean across 85 tables.

Built so far: `life_plan_day_journal`'s new shape (migration, by ALTER),
`lifePlanDayTypes`, `lifePlanDayRepo` (paged reads, one write), the pure
`lifePlanDayService`, `/api/life-plan/day`, and `lifePlanDayClient` with its
one catch-up retry. 34 tests behind them.

**WIRED 2026-09-23 (`b3b845b2`).** The four day maps now reach the account
through their own route, the browser's existing days are imported once, and the
account's days replace the browser's the moment there are any. 5,883 tests green.

Two design notes worth carrying, because both were found the hard way:

- **The day half is sent by comparing, not by trusting an effect.** Every day
  mutator comes out of one `setPlan`, so which day moved is only knowable by
  looking at what the account last accepted. And the half a diff forgets is the
  important half: a removal has to be said out loud, or "I cleared that" and "I
  did not mention it" become the same request and the cell comes back on the
  next device.
- **Nothing records that the import ran.** It is finished when the account has
  the days — a fact on the account rather than a promise in a browser. That is
  the same correction the plan's own marker needed in M0, applied before it
  could be made twice.

**The save gate was NOT changed, and the reason is worth writing down**, because
this plan asked for it. The gap it named — "a day-only user gets no plan row, so
their ticks have nowhere to go" — is closed by the day route calling
`ensureLifePlan` itself. Changing `planIsUntouched` as well would have been a
second answer to a question already answered, and it would have widened what
reaches `plan_snapshots` (M5) on the way. The cure for a gap can be worse than
the gap.

**Still to do before M1 can be called finished. Re-checked 2026-09-24 by
reading the files rather than this list, which had gone stale within four hours
of being written — `480cd2ba` and `92825523` landed the same evening.**

- **Check 1**, the round-trip integration test against a real Postgres. **Still
  not written, and the file the Files list promises
  (`lifePlanRoundTrip.integration.test.ts`) does not exist.** What DOES exist is
  `tests/integration/db/lifePlanDay.integration.test.ts`, and its own header
  says in as many words that it is not this: it asserts schema constraints
  through `pg`, while `lifePlanRepo` talks through supabase-js. Matching the
  Files list against `ls` is how this reads as done; only opening the file
  contradicts it. Nothing anywhere asserts that a real plan plus a year of days
  survives write-then-read field for field.
- ~~**The browser proof**~~ **DONE 2026-09-24 (`66d9788b`).** It existed and
  tested neither half: all four writes sent a `note`, so the tick never crossed,
  and the survival test PUT an identical plan back, which upserts by node id and
  fires no cascade. It now ticks a routine step read from the account's own plan
  and crosses it to a second context, and the plan save adds a sub-step node and
  asserts the node set actually moved. Both proved by putting the defect back.
  A third fault surfaced while proving the first: **day rows outlive the run**,
  so removing the tick left the test green on last week's row — both tests clear
  the cell and assert it is clear before writing.
- **Check 5**, the same at phone width. **Still open, and deliberately not
  closed the cheap way.** No phone project runs that spec — `chromium` and
  `goals-4` are both Desktop Chrome — and adding it to one would mark the box
  green while proving nothing, because the spec never touches the DOM. Check 5's
  intent ("tick it on your phone") needs a spec that drives the tick CONTROL at
  390px, which is a different test from this one.

**You can:** tick your morning routine on your phone and see it on your laptop.
Write a journal line in one browser, read it in another. Clear your browsing data
and lose nothing.

- **Your existing day half is imported once, exactly like the plan half was.**
  Without this, the milestone called "your day is on your account" would be the
  thing that deletes it: the read would come back empty and be written straight
  over your browser copy. `mergeDayRecord` — the one thing keeping your ticks alive
  today — is not removed until the import has run and been checked.
- One migration, free only because the tables are **empty** today. Journal rows are
  keyed `(day_id, local_id)` on your plan's own id, carry the question's words, and
  have **no link to a node row at all** — which is what lets an entry outlive its
  question. Storing the words is not a second copy of a fact: it is what was asked
  **on the day you answered**, and editing the question later must not rewrite five
  months of entries. Ticks and ratings are unchanged, cascade included.
- `src/db/lifePlanDayRepo.ts` owns the four tables. Every read paged: the allowance
  for a new repo file is **zero**, and the day tables pass a thousand rows inside
  three years.
- `app/api/life-plan/day/route.ts`: read a window or the lot, write one day.
- **The browser sends its own ids, never database ids.** The common case is not an
  error and must not be treated as one: add a routine step and tick it, and the plan
  save is still four seconds away, so the client **flushes the plan save first**
  whenever a day write names an id it has no database id for. The route's refusal —
  which names the ids — is the backstop for the case the client missed, not the
  normal path, and the client's one retry follows it.
- **The route makes the plan row if there is none.** Every day row needs one, and
  the whole point of the save-gate fix is the person whose only activity is a tick.
- **The date is your account's calendar day**, re-resolved on the server, refusing
  a day ahead of yours. Past days stay writable — back-filling a missed day is real.
  The page currently reads your timezone as
  `getUserTimezone(user.id).catch(() => "UTC")` — a silent fallback the project's own
  rules forbid, and one that would file a whole day under the wrong date without a
  word. It fails loudly instead.
- The save gate learns the other three day maps. **It already counts ratings**, so
  the gap is ticks, day notes and journal answers: rate an area today and a plan
  row is created; tick five things and write a journal line and none is. The two
  gate functions stay two functions — merging them, which draft 1 proposed,
  reintroduces a bug the code documents was found by driving the app.
- The Recap screen's "start this practice" writes the library's id into the tick
  log instead of the step's own. Fixed here, or the day write has to choose between
  dropping it and failing.
- Lengths are capped once, on the way in, with a test that fails when the next
  writer forgets.
- **Check 1 and Check 3 are built here**, not deferred: M1's acceptance is that
  they pass.

**Acceptance:** Check 1 green including days; tick in context A, assert in B; save
a structural change from A and assert B's tick survives; a simulated year asserts
one day saved writes one day and does not move the plan's revision.

### M2 — The dashboard tells the truth

**BUILT 2026-09-24**, in two commits: `4634d6d1` (the day read and the account's
today) and `9559674c` (one owner for "done today"), plus `75fe617d` for the
footer. Driven in a browser on the real account: with one strength step placed on
today and one finished weights session, the band reads "1 of 1 done today", the
schedule says "from your training log", and the Today tab says "1 of 1 done" —
and the band read "0 of 1" ten minutes earlier, before that session existed, so
it can tell 1 from 0.

**Bullet 3 was bigger than it was written.** "Three surfaces disagree" was five,
and underneath them the feature was dead for everybody signed in: the derived
ticks were an OPTIONAL prop and `TrackTab` passed them on its `checking` and
signed-OUT branches and forgot them on the signed-IN one. The test named after
`TrackTab` rendered `TrackSchedule` directly with a hand-built map, so no test
could see it. `src/goals/dayTicks.ts` owns the rule now and every argument that
carries the log is required.

**You can:** tick five things in the morning and see "5 of 5 done today" on the
page you actually open.

- `/dashboard/tracking` reads the day tables instead of a plan whose tick list is
  empty by construction.
- The season band is handed your account's today. Its browser-clock allowance in
  `tests/unit/goals/northStarToday.test.ts` comes off; that list only shrinks.
- **"Done today" gets one owner.** Three surfaces disagree today — the schedule
  merges ticks derived from finished workouts, the Today list does not, and the
  schedule's own group header disagrees with the row beneath it. One function
  answers it for all three.
- The footer stops saying "Saved to your account" for anything that is not, and a
  plan loaded from the account stops describing itself as never written.

### M3 — Your pushed goals are recognised on any device

**BULLET 1 ONLY, `48fa55b1`.** `user_goal_id` is written at push time and read by
the Track step, so a second device no longer offers you fifty duplicates. **The
other two bullets are not built, and the milestone's headline is only half true
until they are** — see the re-check below the bullets.

**You can:** push from the laptop, open the phone, and see them as pushed rather
than be offered fifty duplicates.

- `user_goal_id` becomes the link, written at push time and read by the Track step.
  The tag is written, never read for identity.
- The browser run code retires. "Start over" keeps the meaning M0 gave it — cleared
  in place — so nothing here changes it again. Worth recording why the old plan's
  version was impossible: it said start-over should insert a *new* `life_plans` row,
  and the database allows exactly one per person.
- Deleting a plan goal offers to archive its counted goal, never deletes silently.

**Re-checked 2026-09-24, and what is left is more than the two bullets say.** The
run code is still minted on load and re-minted by "start over"
(`NorthStarFlow.tsx:374-377`, `:1209-1210`), still written into every pushed
row's `template_id`, and still read for identity as `pushedGoalIds`' second
branch. Its consequence on a second device: the Track step's checkbox list
correctly reads "tracked" and will not duplicate — that half works — but **the
goals hub rendered directly beneath it comes back EMPTY, and the Today step's
driver rows show no progress bar and no "+1"**, because both gate on
`item.goalId`, which is null when the tag's run does not match. So the second
device recognises the goals and still cannot count against them. Retiring the run
needs a scope mechanism that takes a set of `user_goal_id`s rather than a string
prefix, because `GoalsHubContent` prunes by `templatePrefix` and there is no
per-account stable prefix today.

And the delete half is worse than "does not offer": there are **six** delete call
sites for a plan goal and **two of them have no confirm at all** —
`GuidedBuild.tsx:340-345` and the `echoDrop` link at `AreaBuilder.tsx:546-552`,
while `GoalCard`, `GoalOverview` and `AreaBuilder`'s main path each carry their
own copy of the same two-click confirm. One owner for "are you sure", not four
copies and two holes.

### M4 — One home for the one thing's supports

**BUILT 2026-09-24 (`e7832067`).** The dead home is gone from the code: the four
`answer_key` values, the API branch and the carry-across rule. Counted on the
live database first — 522 rows, every one `one_thing`, none under the other four
— so it deleted no writing. The database's CHECK still permits the four keys;
the owner declined the migration and it costs nothing, because the only way in
validates against `LIFE_ANSWER_KEYS` first (driven: `one_why` answers 400).

**The change of behaviour, stated because it is real:** a genuinely new one thing
no longer blanks the supports. There is no chapter in the plan to restart them
against, so last season's why sits under this season's sentence until rewritten.

Two homes exist for one fact and the designed one is dead. **Recommendation: keep
the flow's home** — the plan's answers, which do save — and retire the four unused
keys, because the supports are plan writing and the plan is where the rest lives.
The alternative, moving them so they restart with each new one thing, is a product
decision about whether a support belongs to the sentence or to you. Yours, not mine.

### M5 — Your private journal stops being copied to a table nobody owns

**DONE, BOTH STEPS, 2026-09-24 (`98880faa`).** Further along than this section
describes: the route was not gated behind a sign-in, it was DELETED outright,
along with `app/api/admin/plan-snapshots`, `planSnapshotRepo.ts`,
`planSnapshotClient.ts` and the mirror call in the flow. And the destructive half
ran too — `20260924100000_drop_plan_snapshots.sql` is applied to the live
database and `to_regclass('public.plan_snapshots')` is now NULL. The rows were
exported first, to `~/life-mastery-plan-snapshots-2026-09-24.json`, **outside the
repository** as this plan insisted: 120 rows, `user_id` null on every one, the
owner's among them at revision 356.

**Two things it leaves, and one is a security matter.**

1. **The export file is mode 0644 — world-readable — and it is now the ONLY copy
   of those 120 plans.** The table it came from is gone. Every row is free text
   about somebody's body, money, relationships and drinking. `chmod 600` is the
   whole fix and it has not been done, because the file is in the owner's home
   directory rather than this repository.
2. **`main` still carries all six plan-snapshot files**, 182 commits behind. The
   unauthenticated POST route therefore still exists on the deployed branch; its
   writes now fail with a 500 because the table is gone rather than because the
   route was removed. It goes when this branch merges.

**Originally: destructive, gated — blocker 2.**

`/api/plan-snapshots` takes a copy of anybody's whole plan — journal and day notes
included — **with no sign-in**, and writes it with the key that ignores every rule
in the database. 103 rows, none attached to an account, on by default with an
opt-out you have to find.

It is also the only copy of your plan that exists, which is why it is last. And it
is a worse safety net than it looks: there is **one row per browser and it is
overwritten, not versioned**, on the same four-second timer as everything else. In
the disaster this plan opens with, the emptied plan would be mirrored over your
backup seconds later.

**Two steps, and the first one does not wait for anything.** A reviewer pointed out
that I had scheduled a gated, destructive deletion where three lines close the hole
today, so:

- **Now, non-destructive, no permission needed:** stop mirroring by default and put
  the route behind a sign-in. Phase 1 already made the mirror redundant for its
  stated purpose, and nothing is deleted, so your backup stays exactly where it is.
- **Later, gated (blocker 2):** once M1 is proved on your own plan, export the rows
  **to a file on your machine, outside the repository**, then drop the table.

The old plan said to commit those rows into git as a test fixture. That publishes a
journal into the repository permanently. To be accurate about the scale, since I
overstated it once already: there are **four accounts**, not 103 people — the 103
rows are one per browser that ever opened the page, most of them near-empty test
runs, and one of them is yours.

**And to be accurate about the risk, in both directions:** reading someone's plan
out of that table needs either their browser's random id or the service key, so
this is not an open window onto everybody's journal. What it *is* — with no
qualification — is an unauthenticated write path into the production database using
the credential that ignores every security rule in it. That is the part that should
be closed today rather than scheduled.

## Blockers

**Both blockers were answered and both are closed — 2026-09-24.** M0 and M1 are
built and the day half is on the account; M5's export ran and the table is
dropped. They are left below as written, because the record of what was asked
matters more than a tidy list.

**1. M0 and M1 change what is stored in your browser. Go ahead?**
*Attempted — I can write it; for a plan held only in a browser it is not
reversible.* M0 repairs the journal and the marker once. M1 imports your day half
to the account and then treats the browser copy as a cache.
**Recommendation: yes, and M0 first — the code can destroy that same storage on any
visit, so acting is safer than waiting.** **Reply "1 yes".**

**2. M5 deletes 103 plan snapshots, one of which is your only backup. Go ahead?**
*Attempted — needs its own yes.* **Recommendation: yes, but only after M1 is proved
on your own plan, and only after the rows are exported outside the repository.**
**Reply "2 yes".**

**No permission decision is needed on tables this time.** The four day tables
already carry owner-only add/change/delete rules — I checked four policies on each
against the live database.

**Attempted and cleared, so not blockers:** applying migrations (linked, nothing
pending); the test baseline (lint and types both green today); reading the live
database (the Management API route works; `npx supabase db query --linked` also
works, the global binary does not).

**One real coordination risk, which draft 1 got wrong.** Draft 1 said the other
session and I do not collide because they are in `src/vice` and I am in
`src/goals`. Slices are not where we collide. Their plan and mine both add
migrations, both edit `tests/integration/schema.sql`, both edit
`tests/unit/architecture.test.ts`, and **both need entries in the write-coverage
baseline, which has zero slack.** Whoever lands second gets a red build that looks
like their own fault. I have messaged both peer sessions; a message is not a
delivery, so I will check before I push anything.

## Open questions

Your standing answers say a question you have already settled in principle is
friction rather than safety, so most of what draft 1 listed here is now **decided
and reported in one line each** rather than put to you:

- **Deleting a life area takes its ratings with it**, and the delete button says so.
  A journal line is words and survives under the new rule; a rating is a number
  about a thing that no longer exists.
- **The app loads all your days, paged.** The archive, the per-question history and
  the fourteen-day averages all walk everything, so a rolling window would make them
  quietly wrong rather than merely slow — and a wrong average is worse than a slow
  one. It is more rows than it sounds: twelve areas rated daily is about 4,400 rows
  a year in the ratings table alone, which is why every read is paged from day one.
- **The day keeps its own "last saved"** instead of borrowing the plan's. A tick is
  the one day action that does not move the plan's stamp today.
- **Offline stays read-only behind a visible banner**, unchanged from what you
  approved.
- **The one thing's supports (M4) stay where the flow already puts them** — in the
  plan, which saves — and the four unused keys retire. Say so if you would rather
  they restarted with each new one thing; that is the only part of it that is a
  product decision rather than a tidy-up.
- **The quit-a-vice Black Box stays with the session that owns it.**

**One thing genuinely still open, and it is yours:** when two devices edit the same
day note or the same journal answer, the last one to save wins and the other's
sentence is gone with no warning. Every other cell is safe — two devices ticking
different things both win — but free text is the one place "last write wins" can
lose writing. The honest alternatives are keeping both and showing you the pair, or
locking a day to one device, and both cost more than they are worth for one person
on two devices. **Recommendation: accept last-write-wins on those two fields and say
so on screen.** Tell me if you would rather pay for the alternative.

## What the earlier drafts got wrong

Six reviewers attacked draft 1 before you read this. What they corrected, because
you should know which parts of this document have been tested and which have only
been written:

- **`supabase db query` does exist** — via `npx`. Draft 1 generalised one stale
  binary into "this machine" and was about to write that into a rule file.
- **`planAsText` does print ratings.** Draft 1 said it printed none, which would
  have made a broken check look more trustworthy.
- **Ratings already create a plan row.** Draft 1 said day-only users get no row at
  all; only ticks, notes and journal answers are missed.
- **The training week you design is not safe.** Draft 1 cleared it. Only pressing
  Start reaches your account.
- **The season focus is dropped when it is a goal.** Draft 1 missed it entirely.
- **Merging the two "is anything written" checks** would have reintroduced a bug
  the code documents was found by driving the app.
- **`ON DELETE SET NULL` on that journal key would have made deleting a question
  fail outright**, because the key is two columns and one of them cannot be null.
  The design changed because of it — journal rows now carry no node link at all.
- **Concept item 21 is a Yes, not a Partly.** I read "self-defined områder" as a
  number; you wrote areas, and custom areas already exist and are already rateable.
  A schema change I had added to serve the misreading is gone.
- **The snapshot route can be closed today** without deleting anything. I had
  scheduled a gated deletion where a sign-in check does the urgent half now.
- **Writing the import marker after the save, not before, would have been a
  regression.** The code argues for before and the argument holds.
- **"103 people" was wrong.** Four accounts; 103 browser rows.
- **Four of the six open questions were mine to settle**, not yours, under your own
  standing answers. They are decided and reported now.

---

# PART 2 — EXECUTION

## Files

**Created:** `supabase/migrations/20260923130000_season_focus_is_any_node.sql`,
`20260923100100_day_journal_keeps_its_words.sql`; `src/db/lifePlanDayRepo.ts`,
`src/db/lifePlanDayTypes.ts`; `src/goals/lifePlanDayService.ts` (pure: date
validation, id resolution, caps), `src/goals/lifePlanDayClient.ts`;
`app/api/life-plan/day/route.ts`;
`tests/integration/db/lifePlanRoundTrip.integration.test.ts` (Check 1);
`tests/unit/goals/lifePlanTypeCoverage.test.ts` (Check 3 — the first test that
walks `NsPlan`); `tests/unit/goals/lifePlanImportWindow.test.ts`,
`tests/unit/goals/journalSurvivesReload.test.ts`,
`tests/unit/goals/lifePlanDayService.test.ts`,
`tests/unit/db/lifePlanDayRepo.test.ts`,
`tests/unit/goals/northStarFlowSaves.test.tsx` (the first test that renders the
flow), `tests/e2e/life-mastery-day-persists.spec.ts`.

**Changed:** `northStarService.ts` (journal prune, `removeDailyField`, the save
gate's three missing maps, caps), `lifePlanSync.ts` (the empty-row rule; the real
`canSave`), `lifePlanMapper.ts` (season focus through the node map; `updatedAt`;
the day read replacing `mergeDayRecord`), `NorthStarFlow.tsx` (marker ordering, the
save loop, the load race, `reset`, day writes), `RecapTab.tsx` and the practice
handler, `SeasonBand.tsx`, `src/tracking/components/ProgressDashboard.tsx` (which is what
actually mounts it — the page only reads the plan) and
`app/dashboard/tracking/page.tsx`, `src/goals/northStarStorage.ts` (the one writer
of the plan key from outside the flow, which after M1 is writing to a cache),
`northStarTrackService.ts` (one owner for "done today"; M3's link), `goalRepo.ts`,
`tests/unit/goals/northStarToday.test.ts` (`BROWSER_TODAY_DEBT` loses its entry),
`tests/unit/architecture.test.ts` (extend the date guards to `app/api/**` — they
scan only `src/` today, so a day route could take a UTC date with nothing going
red), `tests/integration/schema.sql` + `truncateAllTables` (which names no
`life_plan` table at all), `tests/support/writeCoverage.baseline.json`,
`docs/product/map.md` (its "In flight now" still says this is unbuilt).

## The day route's contract

```
GET  /api/life-plan/day              -> everything, paged
GET  /api/life-plan/day?from=&to=    -> a window, for a future screen that wants one

PUT  /api/life-plan/day
  body { date, note?: string|null,
         ratings?: {localId: 0..10 | null},
         ticks?:   {localId: boolean},
         journal?: {localId: string} }      // "" clears
  -> 200 { savedAt }
  -> 409 { error: "plan-behind", unknown: [localId] }  // save the plan, retry once
  -> 400 { error: "that day is ahead of your calendar" }
```

Only keys present are written; absence cannot clear, `null` inside clears one cell.
Each cell is its own row and its own last write, so two devices ticking different
things both win — and two devices editing the same day note do not (see the open
question). The route makes the `life_plans` row when there is none, the same way the
plan save does, because the day-only writer is the whole point of the gate fix.

**Where the day is read on load.** Not inside `decideOnLoad` — that is a pure
function by design, with its own tests, and putting a fetch in it would make it
neither. The day read happens in the flow's load effect beside `fetchLifePlan`,
and its result is handed to `decideOnLoad` as a fourth input alongside the server
plan, the browser plan and the marker. `mergeDayRecord` becomes the function that
decides between the account's days and the browser's, and keeps its tests.

**The one-time day import.** Same shape as the plan's: if the account has no day
rows and the browser has some, they are sent once, and the marker is written only
after that send succeeds.

## The two migrations

1. `life_plans.season_focus_id` points at `life_plan_nodes` rather than
   `life_plan_areas`, and the mapper resolves it through the node map. One row
   exists on the live database and its focus is null, so this is free today.
2. `life_plan_day_journal` becomes `(id UUID PRIMARY KEY, user_id, day_id, local_id
   TEXT NOT NULL, asked TEXT NOT NULL DEFAULT '', body TEXT NOT NULL)` with
   `UNIQUE (day_id, local_id)` and **no foreign key to `life_plan_nodes`**. The old
   primary key `(day_id, node_id)` goes with the column. `life_plan_day_ratings` and
   `life_plan_day_ticks` are untouched. All four tables are empty — counted on the
   live database on 2026-09-23 — so this is free today; if anything has written a day
   row by the time it runs, count again first, because it will not be.

## Rules this must not trip — today's numbers, measured

- **Write-coverage: `MAX_UNASSERTED = 131`, baseline exactly 131. Zero slack**, and
  the other session's plan needs entries here too. Every exported write in
  `lifePlanDayRepo.ts` gets a payload-asserting test on the day it is written.
- **API routes ≤ 50 code lines**; `ALLOWED_LONG_ROUTES` has no life-plan entry and
  is itself ratcheted. `/api/life-plan/route.ts` is at 42.
- **Unpaged-read allowance is 0** for `lifePlanRepo.ts` and for any new repo file.
  The bound must be visible on the chain; the test reads the chain, not the intent.
- **`truncateAllTables` names no `life_plan` table.** It truncates `profiles` with
  `CASCADE`, which may already reach them — check before assuming either way, and
  teach it the tables explicitly rather than depending on a cascade nobody wrote down.
- **`schemaMirror` checks four specific things** — that policies declared in
  migrations exist in the mirror, that every RPC the app calls exists there, that the
  newest CHECK constraint's text matches, and the table list. Not word-for-word
  equality, which draft 2 claimed. Both migrations still go into both files.
- **Two bare-`toThrow` budgets are at zero slack** and the counter reads untracked
  files, so it bites before a commit. Assert the message.
- **`npm run ci` is lint:ratchet → typecheck-ratchet → npm test → test:integration**
  and runs no browser test — but `.github/workflows/e2e.yml` does, on **every branch
  push**, across 42 Playwright projects. A peer session reported that e2e runs in no
  CI job at all; I checked, and that is not so.
- **The real trap is worse and quieter: every Playwright project matches spec files
  by an explicit regex naming them, and there is no catch-all project.** A new spec
  file therefore runs *nowhere* — not locally, not in CI — and the run goes green
  because nothing failed. `tests/e2e/life-mastery-day-persists.spec.ts` must be added
  to a project in `playwright.config.ts` by name in the same commit that creates it,
  and M1 is not accepted until that project has been seen to run it and fail without
  the fix. Neither hook runs Playwright either: `pre-commit` is `npm test` and
  `pre-push` is the two ratchets.
- `npx supabase migration list --linked` before any push: another session is here.

## Reuse — do not rebuild

`requireAuth()` · `createServerSupabaseClient()` · `getUserTimezone()`
(`settingsRepo.ts:191`, already how a route stamps a DATE column) ·
`getTodayInTimezone` · **`dateKeyLabel` (`shared/dateUtils.ts:394`) for printing a
`YYYY-MM-DD` key — `new Date("2026-06-01")` is UTC midnight and reads as 31 May west
of UTC, which is exactly the day-half bug class** · `readAllRows`, `chunkIds` ·
`goalToInsert`, `updateGoal`, `linkPlanGoal` · the `finish_program_workout` RPC
pattern ·
`tests/helpers/fakeSupabase.ts` and the call-recording variant in
`tests/unit/health/trainingSettings.test.ts` · migration style from
`20260922100000_life_plan_tables.sql`.
