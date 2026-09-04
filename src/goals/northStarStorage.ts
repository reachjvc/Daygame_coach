/**
 * The one place that reaches into the stored Life Mastery plan from outside the
 * flow that owns it.
 *
 * WHY THIS EXISTS. The plan lives in `localStorage` under
 * `NORTH_STAR_STORAGE_KEY` and is owned by `NorthStarFlow`, which holds it in
 * React state and writes it back on every change. That is fine while the only
 * thing editing the plan is the page rendering it.
 *
 * It stopped being the only thing. A training program can be started from three
 * places, and one of them — the goals planner — is a different screen with no
 * access to that state. Without this, starting a program there left the plan
 * asserting whatever it asserted before, which is the same "two answers to one
 * question" fault this whole area has been dug out of.
 *
 * The alternative was letting the goals planner read and write the key itself,
 * which would make two modules owners of one representation. So: one function,
 * one key, one merge rule. Everything else still goes through `NorthStarFlow`.
 *
 * READ-MODIFY-WRITE, and deliberately so: it reads the plan as it is right now
 * rather than from a copy held anywhere else, because the flow may have written
 * since. It is still not safe against two tabs editing simultaneously — see
 * `applyProgramReference`.
 */

import { NORTH_STAR_STORAGE_KEY } from "@/src/goals/data/northStar"
import { applyProgramToWorkoutRoutine, loadNsPlan, serializeNsPlan } from "@/src/goals/northStarService"
import type { NsRoutineProgram } from "@/src/goals/types"

/**
 * Record a started program on the stored plan, if there is a stored plan.
 *
 * Returns whether it wrote. A person who has never opened Life Mastery has no
 * plan, and that is not a failure — there is simply nothing to keep in step, so
 * this does nothing and says so rather than creating a plan they never made.
 *
 * NOT SAFE ACROSS TWO OPEN TABS. If Life Mastery is open in another tab it holds
 * an older plan in memory and will overwrite this on its next edit. Accepted:
 * the alternative is moving the plan into the database, which is a much larger
 * change than the fault justifies, and the losing case is one stale reference
 * that the Templates tab already shows and lets you correct.
 */
export function applyProgramReference(
  program: NsRoutineProgram,
  dayNames: string[] = []
): boolean {
  if (typeof window === "undefined") return false
  try {
    const plan = loadNsPlan(window.localStorage.getItem(NORTH_STAR_STORAGE_KEY))
    if (!plan) return false
    const next = applyProgramToWorkoutRoutine(plan, dayNames, undefined, program)
    window.localStorage.setItem(NORTH_STAR_STORAGE_KEY, serializeNsPlan(next))
    return true
  } catch {
    // A plan that cannot be read or written is not worth failing a save over —
    // the enrollment itself succeeded, and the Templates tab shows what is
    // actually running regardless of what the plan says.
    return false
  }
}
