import type { NorthStarTabId } from "@/src/goals/types"

/** Where /plan opens when the address names no step: Today once the plan has something to do. */
export function landingStep(askedStep: string | undefined, inUse: boolean): NorthStarTabId | undefined {
  if (askedStep) return undefined // the caller handles an asked step, valid or not
  return inUse ? "today" : undefined
}
