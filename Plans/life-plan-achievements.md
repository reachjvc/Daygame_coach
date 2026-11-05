# Life plan achievements (Q11)

**Status:** written, built and **live 2026-11-05** (commits `520c05c9`, `74877158`), from Q11 in `Plans/life-plan-tables.md` ("design them after
Q1–Q6, since they are built from goals and systems"). Not signed off: card `q11-achievements` on the
sign-off page (https://claude.ai/artifact/K5r4E4ywmrHfasxNPwdXsr).

## What you are agreeing to, in plain words

- No money, no new table, nothing deleted. Achievements are worked out from what the plan already
  holds (your counts on Today, your routine ticks, milestones, experiences, reviews), every time a
  screen is drawn. Nothing about them is saved, so they can never disagree with your counts, and an
  undo on Today takes its achievement back.
- Three places show them: the goal card, the Review step (first, before the scores), and Today (on the
  row where it was earned).

## Doubt first

- The thresholds (10, 25, 50, 100 … in all; 3, 5, 10, 20 in a day; 4, 12, 26, 52 weeks in a row) are my
  choice, not yours or Stefan's. Stefan gives no numbers; your item 22 gives two examples ("100 i alt,
  eller 10 på en dag"). They are one list in the code each, easy to change.
- You have no counts on Today yet (your goals were counted on the old goals page until Q4), so on your
  account most goals show "Nothing yet" until you log. The pictures use made-up counts on a copy.
- A milestone ticked has no date in the plan, so it shows without one and is not in a review's list.

## The design, from your words and Stefan's

Your concept (docs/product/life-mastery-concept.md):
- **Item 22:** a goal to train 4× a week has no day it is finished; "i stedet for at have en dato hvor
  man fuldfører det, kan man have achievements … 100 i alt, eller 10 på en dag, selvom målet er at
  approache 25 om ugen, eller selvom målet er at få en kæreste, og systemet man har bygget til at få en
  kæreste er at approache."
- **Item 30:** they must connect logically even to goals people write themselves.
- **Item 32:** how you celebrate yourself afterwards.

Stefan (`~/.cache/lm-corpus/findings/reviews.md`): "whatever gets rewarded gets repeated"; the weekly
review starts with "What was the good? (celebrate first — always first)", then magic moments.

So the rules are written once and apply to every goal and routine step, never one badge per goal
(item 30):

| On | Achievements | Next |
|---|---|---|
| A counted goal (Today's "Log one") | first one; 10, 25, 50, 100, 250, 500, 1000, 2500, 5000 in all (with its unit: "100 approaches in all"); a best day of 3, 5, 10, 20, 50 (only for a goal that counts things, ≥ 7 a week, not sessions); 4, 12, 26, 52 weeks on target in a row (by the goal's own weekly number, ramp included; none on a goal about stopping something) | the next total, with how many to go |
| A routine step | first time; done 10, 50, 100, 365, 1000 times (hand ticks and finished workouts); 4, 12, 26, 52 weeks as planned in a row | the next total |
| A bigger goal | what the goals feeding it and the steps serving it have earned ("From what feeds it": the girlfriend, and approaching) | |
| A milestone goal | each milestone reached: ticked in the goal's own milestone list, and shown on the bigger goal it feeds | |
| An experience | done, on its day | |
| Reviews | 4, 12, 26, 52 weekly reviews in a row | |

## Where it shows

1. **Goal card:** "Achievements": the goal's own, newest first with their day, folded after six, and
   "Next: 25 approaches in all (13 to go)"; for a bigger goal, "From what feeds it".
2. **Review step:** "Earned in 2 – 8 Nov 2026" first, above the scores, and a button "Add these to Magic
   moments" that adds each as a line (twice adds nothing).
3. **Today:** under a counted goal, "Earned today: 10 approaches in all" the moment it is earned.

## Not built, on purpose

- No stored table and no "you just earned" pop-up that survives a reload: a pop-up would need a record of
  what was already shown (`goalAchievementRules.ts` explains the same choice for the old goals page).
- No points, levels or tiers: nothing in your words or Stefan's asks for them.

## Live 2026-11-05

- No database change, so no backup was needed. Checked on the live database after: your revision 920,
  13 days, no day numbers, 50 goals, unchanged.
- Found while taking the pictures: your Approaches goal holds the unit "/week", which read "10 /week in
  all". A unit with a slash is a rate, so it is left out of the label (`74877158`).

- `src/goals/planAchievementsService.ts` (pure), `src/goals/components/north-star/Achievements.tsx`,
  the goal card, the Review step (`appendToReview` in `reviewService.ts`), Today's line.
- Code review: 9 finds, 8 fixed (finished workouts now count on the goal card too, not only on the
  Review step; work done once per change, not per keystroke; the review streak no longer vanishes on
  the Monday before last week's review is written; a list no longer stays unfolded across weeks; two
  doc comments put back on their own code). Kept as is: a milestone goal's card does not repeat its
  milestones as achievements, since its milestone list right above shows them ticked.
- Tests: `planAchievements.test.ts` (13: totals and their days, best day only for counted things, the
  streak by the goal's own number and ramp, none for a quit goal, steps with workouts, milestones,
  experiences, reviews, a period's list, the bigger goal), `goalAchievementsCard.test.tsx`,
  `reviewService.test.ts` (adding lines), `life-mastery-achievements.spec.ts` (nine on the account, one
  more on Today, "Earned today", the card's next, the review's list kept in Magic moments on the
  account).
