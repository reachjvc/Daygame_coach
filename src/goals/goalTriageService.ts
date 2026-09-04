/**
 * EVERY GOAL, AND WHAT IS UNCLEAR ABOUT IT.
 *
 * You asked for a way to be sure every goal is filed as the right kind of thing
 * — and explicitly, "not necessarily automatically". So this proposes and never
 * changes: `triage` is pure, returns suggestions, and mutates nothing. The
 * screen applies one only when somebody clicks it, and there is deliberately no
 * "accept all".
 *
 * IT LISTS PROBLEMS, NOT GOALS. A goal nothing is wrong with produces no row at
 * all. A screen that lists all forty of your goals so you can scroll past
 * thirty-seven correct ones is a screen nobody opens twice.
 *
 * Every rule here is UNAMBIGUOUS — it fires only where the row contradicts
 * itself, never where it merely looks unusual. A suggestion you disagree with
 * teaches you to ignore the screen, and then the one that mattered is ignored
 * too.
 */

import type { UserGoalRow } from "@/src/db/goalTypes"
import { shapeOfRow } from "@/src/goals/data/goalShapes"
import type { VisionGoalType } from "@/src/goals/types"

export const TRIAGE_PROBLEMS = ["counter_of_one", "no_area", "practice_without_rate"] as const
export type TriageProblem = (typeof TRIAGE_PROBLEMS)[number]

export interface TriageRow {
  goalId: string
  title: string
  shape: VisionGoalType
  problem: TriageProblem
  /** What is wrong, in words somebody can act on. */
  says: string
  /** What accepting would do. Null where only the person can decide. */
  fix: { field: "tracking_type" | "life_area" | "target_value"; to: string | number } | null
}

const PROBLEMS: Record<
  TriageProblem,
  { detect(goal: UserGoalRow): boolean; says: string; fix: TriageRow["fix"] }
> = {
  /**
   * A COUNTER THAT CAN ONLY EVER BE ONE.
   *
   * `target_value === 1` on a counter is a finish line wearing a counter's
   * clothes: it draws a progress bar that is either 0% or 100%, and it offers a
   * "+1" button that completes the goal. Saying "done or not done" is the same
   * fact with none of the furniture.
   */
  counter_of_one: {
    detect: (g) => g.tracking_type === "counter" && g.target_value === 1,
    says: "This counts to one, which is the same as done-or-not-done — but it draws a progress bar and a +1 button.",
    fix: { field: "tracking_type", to: "boolean" },
  },

  /**
   * NO AREA.
   *
   * `custom` is the fallback every unfiled goal lands in, so an area of
   * `custom` and an empty area are the same state wearing two spellings. There
   * is deliberately NO suggested area: guessing one from the words is the
   * fault this whole area has spent a week removing.
   */
  no_area: {
    detect: (g) => !g.life_area || g.life_area.trim() === "" || g.life_area === "custom",
    says: "This is not filed under any part of your life, so it will not show up when you look at one.",
    fix: null,
  },

  /**
   * A RATE THAT IS NOT A RATE.
   *
   * A Practice is "how often, every period". A target below one means the
   * period is complete before it starts, so the goal reads as done every week
   * and its streak counts weeks nobody did anything in.
   */
  practice_without_rate: {
    detect: (g) => shapeOfRow(g) === "habit_ramp" && g.target_value < 1,
    says: "This is something you hold every period, but it asks for less than one — so it completes itself.",
    fix: null,
  },
}

/**
 * What is unclear, across every goal.
 *
 * A goal with two problems produces two rows rather than one that hides the
 * second: they are separate decisions and fixing one must not make the other
 * invisible.
 */
export function triage(goals: UserGoalRow[]): TriageRow[] {
  const out: TriageRow[] = []
  for (const goal of goals) {
    // Archived goals are not on anybody's screen and not worth a decision.
    if (goal.is_archived) continue
    for (const problem of TRIAGE_PROBLEMS) {
      const rule = PROBLEMS[problem]
      if (!rule.detect(goal)) continue
      out.push({
        goalId: goal.id,
        title: goal.title,
        shape: shapeOfRow(goal),
        problem,
        says: rule.says,
        fix: rule.fix,
      })
    }
  }
  return out
}

/** How the screen groups them: one heading per problem, in a stable order. */
export function groupTriage(rows: TriageRow[]): Array<{ problem: TriageProblem; rows: TriageRow[] }> {
  return TRIAGE_PROBLEMS
    .map((problem) => ({ problem, rows: rows.filter((r) => r.problem === problem) }))
    .filter((g) => g.rows.length > 0)
}
