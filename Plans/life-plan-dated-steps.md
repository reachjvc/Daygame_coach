# Steps with days (round 4 after the rebuild)

**Status:** written, built and **live 2026-11-05** (migration first, then commit `2e0c01b0`). Not signed off: card `dated-steps` on the sign-off page.

## What you are agreeing to, in plain words

- Two new columns on a goal's step (checkpoint): the day it is due and the day it was done. They only add;
  your 48 steps keep everything and start with neither. A backup comes first.
- Nothing dates your steps by itself. A button on the goal ("Give the steps their days, until 25 Nov")
  does it, once, when you press it.

## Doubt first

- Your 48 steps on 6 goals have no days until you press that button on each goal. Until then they are not
  on Today and the review cannot say "behind" for them.
- The days spread evenly between the day you press it and the goal's date. Pressing it again (say the
  goal's date moved) spreads the open steps afresh. There is no box to set one step's day by hand yet.
- Steps ticked before today have no done day: the plan never kept one.
- The to-do lists under Today's rows (sub-steps) get no days in this round: you have none.

## The gap

Your item 27: "Fx kunne en bruger evt. også ønske sig at skrive en todo med 20 ting og sige at den skulle
være færdig om 20 dage, og det skulle systemet så kunne lave." Stefan, every two weeks: "are you on
track, are you making progress, are you behind" (`GXhPOncX8CA`). 23 of your 50 goals are finish-line
goals with a date; 6 carry 48 steps. A step had a title and a tick: no day due, no day done, not on Today,
and the dates the goal builder showed were worked out from today on every visit, so a step was never
behind. The new review read these goals back with nothing to judge them by.

## What it does now

- **The goal card and the builder:** "Give the steps their days, until …" spreads the open steps without a
  day evenly to the goal's date, once; the days are kept. Each step shows "due 10 Nov", "was due 2 Nov"
  (amber), or "done 5 Nov".
- **A tick keeps its day**, on the card or on Today.
- **Today:** "Steps due": every open step whose day has come, most behind first ("3 days late"), with a
  tick. Shown even on a day with nothing weekly.
- **The review:** each finish-line goal reads "1 of 4 steps done · 1 in this stretch · 2 behind". A step
  done in the stretch is in "Earned" ("Reached: Landing page"), on its day.

## Built 2026-11-05

- Migration `20261105190000_checkpoint_days` (`life_plan_goal_checkpoints.due_on`, `done_on`).
- `dateSteps`, `setCheckpointDone` (`northStarService.ts`), `datedRungs` reads the kept days,
  `stepsDue` (`northStarTrackService.ts`), `stepsReadBack` (`reviewReadBack.ts`), milestones earned on
  their done day (`planAchievementsService.ts`), the card, the builder, Today, the review.
- Code review: 10 finds, all fixed (two other views, the builder's timeline and "the next three things",
  still worked dates out from today; a step due today counted as behind; a past week read the steps as
  they are now, not as they stood; the goal's date moved and the steps could not follow: pressing again
  now spreads the open steps afresh, in their order; the builder's button looked only at its own rungs; an
  untick by the plain edit kept its day; a goal missing from the ranking never reached Today; one shared
  day sum; nothing saved for a repeated tick). The tenth, the deploy order, is below.
- Tests: `datedSteps.test.ts` (7), `northStarService.test.ts` (the rungs' days given once and kept),
  `life-mastery-dated-steps.spec.ts` (a step three days late on Today, ticked there, done with today's day
  on the account, counted in the week's review).

## Live 2026-11-05

Backup first: `~/dg-backups/life-plan-2026-11-05-before-checkpoint-days.json` (revision 920, the 48 steps
read again). Then the migration (the only one pending), then the code. Checked on the live database after:
48 steps, none with a day, revision 920.
