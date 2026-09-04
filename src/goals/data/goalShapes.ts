/**
 * WHAT KIND OF THING A GOAL IS — the one place that decides.
 *
 * Three shapes, and they are the categories a person actually thinks in:
 *
 *   Practice     a rate you hold. The systems: deep work, the gym, daygame.
 *   Target       a number you climb to. 100 kg, twenty thousand saved.
 *   Finish line  an event you attain. The dreams: the trip, the licence.
 *
 * WHY THIS FILE EXISTS. A goal ROW does not store its shape. It stores
 * `goal_type` and `tracking_type`, and the shape is a reading of the two — with
 * the awkward part being that `recurring` and `habit_ramp` are both Practices,
 * for historical reasons nobody wants to migrate. That reading was written out
 * by hand in six places across five files, which is six chances to disagree
 * about what somebody's goal is:
 *
 *   metricsService.ts ×2   which views a tile may offer
 *   goalsService.ts        whether it belongs in the daily view
 *   V11ViewA.tsx ×2        how the list sorts
 *   GoalFormModal.tsx      what the form shows next
 *
 * `shapeOfRow` is that reading, once. `tests/unit/goals/goalShapes.test.ts`
 * fails the build if the hand-written form comes back.
 */

import type { UserGoalRow } from "@/src/db/goalTypes"
import type { VisionGoalType } from "@/src/goals/types"

/**
 * The three shapes, as a person picks them.
 *
 * `type` rather than `shape` because that is what every consumer already calls
 * it, and renaming a field across four components buys nothing.
 *
 * The hints are written to be read on a phone with no hover: each one says what
 * the shape IS and gives two examples, because "Practice" alone does not tell
 * somebody whether their thing belongs in it.
 */
export const GOAL_SHAPES: ReadonlyArray<{
  type: VisionGoalType
  icon: string
  label: string
  hint: string
}> = [
  {
    type: "milestone_ladder",
    icon: "🎯",
    label: "Target",
    hint: "A number you climb to by a date. 100 kg, ten thousand a month, twelve percent body fat.",
  },
  {
    type: "habit_ramp",
    icon: "🔁",
    label: "Practice",
    hint: "An ongoing weekly practice. You never finish it, you just keep it.",
  },
  {
    type: "achievement",
    icon: "🏁",
    label: "Finish line",
    hint: "You either did it or you did not. A first muscle-up, a licence, a book out.",
  },
]

/**
 * A GOAL ROW'S SHAPE. The single reading of `goal_type` + `tracking_type`.
 *
 * Total by construction: every combination of the three goal types and the two
 * tracking types lands somewhere, which is why this returns a shape rather than
 * `shape | null`. A caller that has to handle "unknown" is a caller that will
 * invent its own default, and inventing defaults is what this file removes.
 *
 * `recurring` and `habit_ramp` are the same shape. The first is what the goals
 * hub's own form writes, the second is what the Life Mastery flow writes, and
 * they have always meant the same thing to every screen that reads them.
 */
export function shapeOfRow(
  row: Pick<UserGoalRow, "goal_type" | "tracking_type">,
): VisionGoalType {
  if (row.goal_type === "habit_ramp" || row.goal_type === "recurring") return "habit_ramp"
  return row.tracking_type === "boolean" ? "achievement" : "milestone_ladder"
}

/** True when this row is a rate you hold, whichever of the two names it carries. */
export function isPracticeRow(row: Pick<UserGoalRow, "goal_type" | "tracking_type">): boolean {
  return shapeOfRow(row) === "habit_ramp"
}
