# A goal can be achieved, paused or dropped (round 3 after the rebuild)

**Status:** written and built 2026-11-05. Not signed off: card `goal-status` on the sign-off page.

## What you are agreeing to, in plain words

- Two new columns on a goal: where it is (working on it, achieved, paused, dropped) and the day. They only
  add; every goal of yours starts as "working on it". A backup comes first.

## Doubt first

- The four states are my choice (the agent's suggestion, from Stefan's words). "Changing the date" already
  covers his "push it back three to six months", so there is no "postponed".
- A paused or dropped goal leaves Today and Track, and the review's list. Its routine steps stay in their
  routines: a step is yours to take out.
- Nothing asks you to mark goals; nothing marks them for you.

## The gap

Stefan: "I go over the goals that I achieved. I go over the goals that I didn't achieve"; "so I'm taking a
break from that goal" (both `zuEb-1Ll2h8`); "it just hasn't been a must" (`TRGRznrMSec`). And his warning
after reaching one: "I didn't set a new goal after that … my intensity has diminished" (`zuEb-1Ll2h8`).
Your item 2 ("Nogle mål er achievable, en condition de opnår") and item 32 ("hvordan man fejrer sig selv
bagefter"). A goal had no state and no done date: the only way out was delete, which took its counts
with it, and the reward you wrote showed only in its edit box.

## What it does now

- **On the goal card:** Working on it / Achieved / Paused / Dropped, with the day. Achieved says your
  reward ("Your reward: A steak dinner. Take it.") and asks for the next goal, Stefan's warning.
- **The closed row** carries a small tag ("achieved 5 Nov").
- **Lists:** in each area the achieved, paused and dropped goals fold below the ones you are working on,
  kept with their history.
- **Today and Track** leave out a goal that is not being worked on.
- **The review:** "Finished or set aside in 2 – 8 Nov 2026" names each goal that changed in the period;
  an achieved goal is also in "Earned in …", on its day, first thing in the review.

## Built 2026-11-05

- Migration `20261105180000_goal_status` (`life_plan_goals.status`, default active, and `status_on`).
- `src/goals/goalStatus.ts`, `setGoalStatus` (`northStarService.ts`), the mapper and loader, Track's
  drivers, `reviewReadBack.ts` (`changed`, active goals only), `achievedGoals` in
  `planAchievementsService.ts`, the card, the area list, the review.
- Code review: 10 finds, all fixed (a past period's review lost a goal paused after it; a goal paused
  inside the week lost that week's counts; finished goals stayed on Today's milestone list and in its
  "read your why"; a dropped goal stayed the season's focus; the card's own status check; the area heading
  counted folded goals; the fold button's state; a misplaced comment). The tenth, the deploy order, is
  below.
- Tests: `goalStatus.test.ts` (7), `life-mastery-goal-status.spec.ts` (a goal paused from its card is
  paused on the account, gone from Today across a reload, named in the week's review).
