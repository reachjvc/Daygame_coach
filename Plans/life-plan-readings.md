# Readings on number goals (round 2 after the rebuild)

**Status:** written and built 2026-11-05. Not signed off: card `readings` on the sign-off page.

## What you are agreeing to, in plain words

- No new table and no database change: a reading is the goal's number on a day, in the table your Today
  number boxes and counts already use. Nothing of yours is changed or deleted.

## Doubt first

- Readings are written in two places: the number goal's card (Systems and Experiences, in the area's
  goals) and the week's review ("Your numbers"). Not on Today: Stefan measures weekly, and Today is
  already long. If you want them on Today, mark "Change it".
- Your 18 number goals have no readings yet. The ones you kept on the old goals page (body weight 90, body
  fat 19, waist 90, bench 22 kg, hammer curl 14 kg) are what the Phase 7 card proposes to copy in; with
  this, those copies would have a screen that reads them.
- A number goal wired to an area's daily ratings ("from your daily ratings") keeps reading those, and takes
  no readings.

## The gap

Stefan: "I'm going to check in with my body weight and take pictures of myself and measurements on a
weekly basis" (`tYCT57Onfas`). Your item 3 ("Nogle mål skalerer naturligt op") and item 21 ("Der er hele
tiden tracking"). On /plan a number goal had a start and a target and no way to say where you are now:
the closed row's first box is the climb's start, and changing it re-draws the climb. Since Q4 the old
goals page, where you kept these numbers, is archived.

## What it does now

- **On the goal card:** "Readings": a box for today's reading (a comma works; a thousands mark is
  refused), the last six with their days, and the change since the first ("-5 kg since 1 Oct").
- **In the review:** "Your numbers" under "Your goals": each number goal with its latest reading up to the
  period's end, a box for today's reading when the period holds today, and On track / Behind / Change the
  approach. Six shown, the rest folded.
- **Achievements:** the first reading; a quarter, halfway and three quarters of the way to the target; and
  the target, each on the day a reading first got there, for a number that comes down as for one that
  goes up. "Next: Three quarters of the way to 80 kg (at 83.75 kg)".

## Built and live 2026-11-05

- `setGoalReading` (`northStarService.ts`), `src/goals/goalReadings.ts`, `GoalReadings.tsx`, the climb
  rules in `planAchievementsService.ts`, "Your numbers" in `reviewReadBack.ts` and the Review step.
- Code review: 10 finds, 9 fixed (a change of a goal's kind read its readings as counts, 92 + 91 + 90 kg as
  273 sessions: it now asks first and takes them with the old kind; a climb from 80 to 80 asked for an
  unreachable next; the next mark's number unrounded; a number goal serving the season lost its season
  place: listed first and tagged now; one shared write instead of three copies; the unit shown two ways;
  "+0 kg"; work done twice per card). Kept: "87,250" is refused, as on Today's number boxes, because a
  thousands mark cannot be told from three decimals.
- Tests: `goalReadings.test.ts` (9: written, cleared, history, latest; only a number goal; the climb both
  ways; quarters and target on their days; the review's list), `life-mastery-readings.spec.ts` (92 kg on
  the account; 87,5 written in the review is today's reading on the account across a reload, and earns
  "Halfway to 80 kg").
