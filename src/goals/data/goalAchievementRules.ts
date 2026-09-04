/**
 * HOW ANY GOAL EARNS A BADGE.
 *
 * The daygame side has 103 badges, each written by hand, each about approaches
 * or sessions. That works because there is a fixed list of things a person can
 * do. A goal is not on a fixed list — you write it yourself — so a hand-written
 * badge per goal is not a thing that can exist.
 *
 * So the rules are written once and applied to every goal. Fourteen of them,
 * covering every goal anybody makes, instead of a constant per badge.
 *
 * NOTHING IS STORED. A badge is a function of rows the user already has —
 * `user_goals` plus `daily_goal_snapshots` — recomputed on every read. That is
 * the same decision the daygame badges made for a different reason (a missed
 * award repairs itself), taken further: if the answer is always derivable, a
 * table holding it is a second copy that can disagree with the first. There is
 * therefore no `goal_achievements` table, no insert path, and no reconcile to
 * forget to call.
 *
 * WHAT THAT COSTS, stated rather than discovered later: a badge has no "first
 * seen" moment, so this cannot drive a notification saying *you just earned
 * this*. Doing that needs somewhere to remember what was already shown. When
 * that is wanted, the place to put it is a table of what has been ANNOUNCED —
 * never a second copy of what has been earned.
 */

import type { VisionGoalType } from "@/src/goals/types"

/** Every badge any goal can earn. */
export const GOAL_RULE_IDS = [
  "first_move",
  "streak_4",
  "streak_12",
  "streak_26",
  "streak_52",
  "total_10",
  "total_50",
  "total_100",
  "total_365",
  "total_1000",
  "climb_25",
  "climb_50",
  "climb_75",
  "complete",
] as const

export type GoalRuleId = (typeof GOAL_RULE_IDS)[number]

/**
 * Everything a rule is allowed to look at.
 *
 * Derived in `goalAchievementsService.factsFor` from a goal row and its
 * snapshots, and nothing else. A rule that needed a database would be a rule
 * that could not be tested with a hand-written history.
 */
export interface GoalFacts {
  shape: VisionGoalType
  /**
   * True for a goal about STOPPING something.
   *
   * It suppresses every streak badge. A resetting counter on a goal somebody is
   * using to quit delivers both halves of the abstinence-violation effect — "I
   * broke it, so it is ruined, so I may as well" — which is why the quit-vice
   * module has no streak counter at all. The totals still apply, and they are
   * the better number anyway: "127 days" only ever goes up.
   *
   * NOTHING SETS THIS YET. There is no column and no checkbox; every caller
   * passes false today. It is a parameter rather than something guessed from
   * the title, because guessing from words is the fault this whole area has
   * been removing.
   */
  isAbstinence: boolean
  /** Period-start dates where the goal was complete, ascending, YYYY-MM-DD. */
  completePeriods: string[]
  /** How long one period is, for deciding whether two are consecutive. */
  period: string
  /** Running total by date: [date, total-so-far], ascending. */
  totalByDate: Array<[string, number]>
  /** Where the climb runs from and to, and where it is now. Null without a ladder. */
  climb: { start: number; target: number; current: number } | null
  /** True once the goal's own target is met, or a finish line is ticked. */
  complete: boolean
  /** The first date anything was recorded, or null. */
  firstMoveOn: string | null
}

export interface GoalAchievementRule {
  /** Which shapes this badge is offered on. */
  shapes: VisionGoalType[]
  label: string
  /** One line, in the second person, for the card. */
  blurb: string
  /** The day it was earned, or null. */
  earnedOn(facts: GoalFacts): string | null
}

/**
 * The day a run of `n` consecutive complete periods was first finished.
 *
 * Consecutive is decided by the CALENDAR, not by adjacency in the list: two
 * complete weeks with a missed week between them are two rows in
 * `completePeriods` and are not a streak of two. The missed period leaves no
 * row at all — a snapshot is only written for a period that ran — so
 * "the next row" and "the next period" are different questions.
 */
function streakReachedOn(facts: GoalFacts, n: number): string | null {
  if (n < 1 || facts.completePeriods.length < n) return null
  let run = 0
  for (let i = 0; i < facts.completePeriods.length; i++) {
    const prev = facts.completePeriods[i - 1]
    run = i > 0 && isNextPeriod(prev, facts.completePeriods[i], facts.period) ? run + 1 : 1
    if (run >= n) return facts.completePeriods[i]
  }
  return null
}

/**
 * Is `b` the period immediately after `a`, on the user's calendar?
 *
 * DAY ARITHMETIC FOR DAYS, MONTH ARITHMETIC FOR MONTHS. `setUTCMonth(+1)` on
 * the 31st silently overflows — January 31st plus a month is March 3rd — and it
 * returns a plausible date rather than an error, so a streak would have been
 * quietly wrong rather than obviously broken. Real `snapshot_date` values are
 * canonical period starts (a Monday, the 1st, January 1st) so the overflow
 * cannot arise from real data today; it is handled anyway because the failure
 * is invisible and the fix is four lines.
 */
export function isNextPeriod(a: string, b: string, period: string): boolean {
  const [ay, am, ad] = a.split("-").map(Number)
  const [by, bm, bd] = b.split("-").map(Number)
  const months = (y: number, m: number) => y * 12 + (m - 1)

  switch (period) {
    case "daily":
    case "weekly": {
      const step = new Date(Date.UTC(ay, am - 1, ad + (period === "daily" ? 1 : 7)))
      return (
        step.getUTCFullYear() === by &&
        step.getUTCMonth() + 1 === bm &&
        step.getUTCDate() === bd
      )
    }
    case "monthly":
      return months(by, bm) - months(ay, am) === 1 && bd === ad
    case "quarterly":
      return months(by, bm) - months(ay, am) === 3 && bd === ad
    case "yearly":
      return by - ay === 1 && bm === am && bd === ad
    // `custom` has no repeating period, so nothing can follow anything.
    default:
      return false
  }
}

/** The day the running total first reached `n`. */
function totalReachedOn(facts: GoalFacts, n: number): string | null {
  for (const [date, total] of facts.totalByDate) if (total >= n) return date
  return null
}

/** The day a climb first passed `pct` of the way from its start to its target. */
function climbReachedOn(facts: GoalFacts, pct: number): string | null {
  const c = facts.climb
  if (!c) return null
  // A descending or flat climb has no meaningful percentage — `goalToInsert`
  // turns those into finish lines precisely because `current / target` lies.
  if (c.target <= c.start) return null
  const done = ((c.current - c.start) / (c.target - c.start)) * 100
  if (done < pct) return null
  /* The climb's number is a live value with no history of its own, so the best
     honest date is the last day anything was recorded. Dating it today would
     re-date the badge on every page load. */
  return facts.totalByDate.at(-1)?.[0] ?? facts.firstMoveOn
}

const PRACTICE: VisionGoalType[] = ["habit_ramp"]
const TARGET: VisionGoalType[] = ["milestone_ladder"]
const ALL: VisionGoalType[] = ["habit_ramp", "milestone_ladder", "achievement"]

/**
 * Typed as an exhaustive record, so a rule id with no rule fails to compile —
 * the same guarantee `MILESTONE_RULES` gives the daygame badges.
 */
export const GOAL_ACHIEVEMENT_RULES: Record<GoalRuleId, GoalAchievementRule> = {
  first_move: {
    shapes: ALL,
    label: "Off the mark",
    blurb: "You did something about it for the first time.",
    earnedOn: (f) => f.firstMoveOn,
  },

  /* Streaks are Practice-only and abstinence-never. A climb has no periods to
     hold and a finish line has nothing to repeat. */
  streak_4: { shapes: PRACTICE, label: "Four in a row", blurb: "Four periods running, all of them met.", earnedOn: (f) => (f.isAbstinence ? null : streakReachedOn(f, 4)) },
  streak_12: { shapes: PRACTICE, label: "A season of it", blurb: "Twelve in a row. This is who you are now.", earnedOn: (f) => (f.isAbstinence ? null : streakReachedOn(f, 12)) },
  streak_26: { shapes: PRACTICE, label: "Half a year", blurb: "Twenty-six in a row.", earnedOn: (f) => (f.isAbstinence ? null : streakReachedOn(f, 26)) },
  streak_52: { shapes: PRACTICE, label: "A full year", blurb: "Fifty-two in a row, without it slipping.", earnedOn: (f) => (f.isAbstinence ? null : streakReachedOn(f, 52)) },

  /* Totals are monotonic by construction — they are the number that survives a
     bad week, and the only one an abstinence goal gets. */
  total_10: { shapes: PRACTICE, label: "Ten", blurb: "Ten in total.", earnedOn: (f) => totalReachedOn(f, 10) },
  total_50: { shapes: PRACTICE, label: "Fifty", blurb: "Fifty in total.", earnedOn: (f) => totalReachedOn(f, 50) },
  total_100: { shapes: PRACTICE, label: "One hundred", blurb: "A hundred in total.", earnedOn: (f) => totalReachedOn(f, 100) },
  total_365: { shapes: PRACTICE, label: "Three hundred and sixty-five", blurb: "A year's worth, however long it took.", earnedOn: (f) => totalReachedOn(f, 365) },
  total_1000: { shapes: PRACTICE, label: "One thousand", blurb: "A thousand in total.", earnedOn: (f) => totalReachedOn(f, 1000) },

  climb_25: { shapes: TARGET, label: "A quarter up", blurb: "A quarter of the way from where you started.", earnedOn: (f) => climbReachedOn(f, 25) },
  climb_50: { shapes: TARGET, label: "Half way", blurb: "Half the distance is behind you.", earnedOn: (f) => climbReachedOn(f, 50) },
  climb_75: { shapes: TARGET, label: "Three quarters", blurb: "The last quarter is the one that counts.", earnedOn: (f) => climbReachedOn(f, 75) },

  complete: {
    shapes: ALL,
    label: "Done",
    blurb: "You said you would and you did.",
    earnedOn: (f) => (f.complete ? (f.totalByDate.at(-1)?.[0] ?? f.firstMoveOn) : null),
  },
}
