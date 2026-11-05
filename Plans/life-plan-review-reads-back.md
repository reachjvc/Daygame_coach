# The Review step reads your period back (round 1 after the rebuild)

**Status:** written, built and **live 2026-11-05** (migration first, then commit `4cb538bc`). Found by comparing /plan, screen by screen, with Stefan's method
and your concept (a separate agent read the findings and transcripts; every quote below was checked in
the transcript). Not signed off: card `review-reads-back` on the sign-off page.

## What you are agreeing to, in plain words

- **One new table** for your answer per goal in a review ("on track", "behind", "change the approach").
  It only adds; nothing of yours is changed or deleted. A backup comes first, as before.
- **Your "Weekly review" step on Today opens the Review step** instead of the Journal's four weekly
  questions. Your step itself is not changed; the link it names now leads to the Review step.

## Doubt first

- The Journal still has its "Weekly review" question set. Its four questions are the Review step's three
  boxes, so it is a second home for one idea. **Proposed to remove, not removed:** that set, once you have
  looked. You have written nothing in it (0 journal rows).
- Your plan has 50 goals. Reading all of them back every week would be a wall, so the Review shows the
  counted goals and the season's goals first, and folds the rest.

## The gap

Stefan, each week: "every week I make sure that I … read over … what are my one-year goals, my
three-month goals, my one-month goals" (`8kco2rjijjE`); every two weeks: "are you on track, are you
making progress, are you behind … what changes do you need to make" (`GXhPOncX8CA`). Your item 34:
"en indbygget måde for brugere at få evalueret deres egen handling … hvor godt de har gjort det"; item 21:
"Der er hele tiden tracking".

The Review step showed achievements, area scores and three boxes. It listed no goal, no count against
its number, no routine record, and the "Next outcomes" you wrote were never shown again.

## What it does now

On the Review step, in Stefan's order (celebrate, look at the goals, then score and plan):
1. **Earned in …** (round before, Q11).
2. **"Last week you set out to bring"**: the previous period's Next outcomes, read back, so this review
   starts by asking whether they happened.
3. **Your goals**: each counted goal with the period's count against its number ("Approaches 18 of 25";
   for a month or longer, "on target in 3 of 4 weeks"), then the season's goals, then the rest folded.
   Each has **On track / Behind / Change the approach**, saved with the review.
4. **Your routines**: each routine's ticks against what it plans ("Morning routine: 23 of 35").
5. Score each area, Magic moments, Lessons, Next outcomes (as before).

The weekly-review routine step (library `weekly-review`, and your Business routine's step) opens the
Review step. New steps from the library point there too.

## Built 2026-11-05

- Migration `20261105170000_review_goals`: the table `life_plan_review_goals` (review, goal, verdict),
  locked to its owner, and the change-only save allowed to reach it. Adds only.
- `src/goals/reviewReadBack.ts` (pure): the goals with the period's counts, the season's goals, the rest;
  the routines; last period's Next outcomes. `reviewService.ts`: an answer per goal (`verdict`); removing
  a goal takes its answers. The Review step shows the three new parts between "Earned in" and the scores.
- The Review step is a place a row can send you ("This week's review"); a row naming the Journal's weekly
  questions opens it, and those questions are no longer offered as a place to send a row. The Journal
  still holds them (proposed to remove, see Doubt first).
- Code review: 10 finds, 9 fixed (weeks before a goal was first counted were scored as missed; a routine's
  plan charged whole weeks, so a perfect month read 30 of 35; a rest week asked for "0 of 0"; the Journal
  set could be picked and then opened Review; two copies of the same rules; an earlier review holding
  only answers showed nothing). The tenth (the read needs the table, so the migration must go live
  before the code) is the deploy order below. Security review (a separate agent): nothing exploitable;
  its hardening note taken (the save's self-check also guards the day-numbers table).
- Tests: `reviewReadBack.test.ts` (7), `reviewsAreSaved.integration.test.ts` (an answer saved, read back,
  another account can neither read one nor hang one on a review, gone with its goal),
  `lifePlanRoundTrip.integration.test.ts` (the table round-trips), `life-mastery-review-reads-back.spec.ts`
  (last week's outcomes, 5 of 21, an answer on the account across a reload; the weekly-review step opens
  Review).

## Live 2026-11-05

Backup first: `~/dg-backups/life-plan-2026-11-05-before-review-goals.json` (1,133 rows, revision 920). Then
the migration (the only one pending), then the code. Checked on the live database after: the table is
there with row security on, clients cannot truncate it, the save reaches it; your revision 920, one
review, 12 scores, no answers yet, 13 days, 50 goals, 29 steps.
