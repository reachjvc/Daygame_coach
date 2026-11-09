import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import { isActive } from "@/src/goals/goalStatus"

/** Where /plan opens when the address names no step: Today once the plan has something to do. */
export function landingStep(askedStep: string | undefined, inUse: boolean): NorthStarTabId | undefined {
  if (askedStep) return undefined // the caller handles an asked step, valid or not
  return inUse ? "today" : undefined
}

/** The same rule as planIsInUse on the server: one active goal, or one routine step. */
export function planInUse(plan: Pick<NsPlan, "goals" | "routines">): boolean {
  return plan.goals.some(isActive) || plan.routines.some((r) => r.steps.length > 0)
}
