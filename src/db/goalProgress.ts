/**
 * HOW FAR ALONG A GOAL IS — the one place that decides.
 *
 * WHY THIS FILE EXISTS. Progress was `current_value / target_value`, written
 * out by hand in seven places. That formula does not know where the goal
 * STARTED, so it measures the distance from zero rather than the distance
 * travelled. A bench press entered as "22 kg now, 26 kg by November" reads 85%
 * complete before a single rep, and the owner's real "Dates per Month" goal —
 * a climb from 1 to 6 — read 17% complete having done nothing.
 *
 * The honest rule is the distance travelled out of the distance to travel:
 *
 *     (current - start) / (target - start)
 *
 * which was already written correctly, once, in `climbReachedOn`
 * (`src/goals/data/goalAchievementRules.ts`) and nowhere else.
 *
 * WITHOUT A LADDER NOTHING CHANGES. A row with no `milestone_config` starts at
 * zero, and `(current - 0) / (target - 0)` is the old formula exactly. So a
 * weekly practice with a target of 3, and a finish line with a target of 1,
 * read precisely as they did. That is the compatibility guarantee and
 * `tests/unit/db/goalProgress.test.ts` pins it.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT DO YET — descending goals.
 *
 * A goal whose number goes DOWN (96 kg to 85 kg) is the reverse of a climb and
 * should earn the same rungs and the same badges along the way. It does not,
 * and the reason is a loop: `goalToInsert` flattens every descending ladder
 * into a yes/no box "precisely because current / target lies", and
 * `climbReachedOn` then refuses the quarter/half/three-quarter badges on a
 * descending climb because `goalToInsert` turned those into finish lines. Each
 * workaround cites the other.
 *
 * The arithmetic above already handles both directions — 85 kg on a climb from
 * 90 down to 80 is (85-90)/(80-90) = 50%, the same sum that gives 50% going up.
 * What stops it being switched on here is DATA, not maths: three of the owner's
 * live descending rows carry `current_value = 0`, which is the column's default
 * and not a measurement. Read as a measurement it says "you weigh nothing",
 * which the descending formula would report as past the target and therefore
 * complete. Turning the direction on before those rows carry a real starting
 * measurement would replace a wrong percentage with a false "done".
 *
 * SWITCHED ON 2026-09-19, with one guard. Progress, completion and rungs all
 * run in both directions now. The data problem above is handled by
 * `hasMeasurement`, not by guessing:
 *
 *   A descending row whose `current_value` is 0 while its target is above 0
 *   carries no measurement. Zero is the column's default, and read as a weight
 *   it says the owner weighs nothing — which downwards means "past the target,
 *   therefore finished". Those rows report 0% and NOT complete, exactly as they
 *   read before, until a real starting number is written into them.
 *
 * The one case this misreads is a goal aimed above zero that is genuinely
 * driven all the way TO zero — a debt of 50,000 paid down to a target of
 * 10,000 and then to nothing. It reads as unmeasured rather than finished.
 * That fails safe: it withholds a "done" rather than inventing one, and a goal
 * that deliberately aims AT zero (`target_value` 0) is allowed through.
 *
 * New rows never land here: `goalToInsert` gives every descending goal a
 * `current_value` equal to its starting number, so it is measured from birth.
 */

import type { UserGoalRow } from "./goalTypes"

/** The fields any of this needs. Kept narrow so callers can pass a partial row. */
export type ProgressFields = Pick<
  UserGoalRow,
  "current_value" | "target_value" | "milestone_config"
>

export interface GoalClimb {
  /** Where the goal began. Zero when the row carries no ladder. */
  start: number
  /**
   * Where it is going. Always `target_value`, never the ladder's own copy:
   * the hub's edit form writes `target_value` and leaves `milestone_config`
   * alone, so the two can disagree and only one of them drives completion.
   */
  target: number
  current: number
  /** True when the number is meant to go down. */
  descending: boolean
  /** True when start and target are the same number, so the climb has no distance. */
  degenerate: boolean
}

/** The ladder's starting value, or zero when there is no ladder to read. */
function startOf(goal: ProgressFields): number {
  const ladder = goal.milestone_config as { start?: unknown } | null
  const start = ladder?.start
  return typeof start === "number" && Number.isFinite(start) ? start : 0
}

/**
 * Where this goal runs from, to, and where it is now.
 *
 * Total by construction — every row has a climb, because a row with no ladder
 * is a climb from zero. A caller that has to handle "no climb here" is a
 * caller that will invent its own baseline, and inventing baselines is the
 * fault this file removes.
 */
export function climbOf(goal: ProgressFields): GoalClimb {
  const start = startOf(goal)
  const target = goal.target_value
  return {
    start,
    target,
    current: goal.current_value,
    descending: start > target,
    degenerate: start === target,
  }
}

/**
 * How far along, 0 to 100.
 *
 * Clamped at BOTH ends. Going backwards from the start is 0% of the climb, not
 * a negative bar; the old formula could not produce a negative because it
 * measured from zero, so this end of the clamp is new.
 */
export function hasMeasurement(goal: ProgressFields): boolean {
  const climb = climbOf(goal)
  if (!climb.descending) return true
  return climb.current > 0 || climb.target <= 0
}

export function progressPercent(goal: ProgressFields): number {
  const climb = climbOf(goal)

  // No starting number written down yet. Reported as "not started" rather than
  // as a number nobody measured — see the file comment.
  if (!hasMeasurement(goal)) return 0

  // Nothing to measure against. Kept ahead of everything below so the
  // long-standing contract "target_value 0 reads 0%" survives this change —
  // `tests/unit/db/goalTypes.test.ts` has asserted it since before the ladder
  // existed.
  if (climb.target <= 0 && !climb.descending) return 0

  // No distance to travel: it is done when it is reached, and nothing in
  // between exists to report. Must precede the division, which would be by
  // zero here.
  if (climb.degenerate) return climb.current >= climb.target ? 100 : 0

  const done = ((climb.current - climb.start) / (climb.target - climb.start)) * 100
  return Math.max(0, Math.min(100, Math.round(done)))
}

/**
 * Has it been reached.
 *
 * Downwards, reaching it means going BELOW it: 84 kg on the way to 85 kg is
 * finished, and 96 kg is not. Upwards this is the same comparison it has
 * always been.
 */
export function isGoalComplete(goal: ProgressFields): boolean {
  const climb = climbOf(goal)
  if (!hasMeasurement(goal)) return false
  return climb.descending ? climb.current <= climb.target : climb.current >= climb.target
}

/**
 * Has this rung of the ladder been passed.
 *
 * The question `GoalCard`, `ProjectionTimeline` and the celebration builder ask
 * of each generated milestone. Written by hand as `current >= rung` it silently
 * marks every rung of a descending climb as already passed, because the
 * starting weight is above all of them — which is the owner's "same
 * notifications along the way" arriving all at once, on day one.
 */
export function rungReached(goal: ProgressFields, rung: number): boolean {
  const climb = climbOf(goal)
  if (!hasMeasurement(goal)) return false
  return climb.descending ? climb.current <= rung : climb.current >= rung
}
