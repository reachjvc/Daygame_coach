/**
 * WHERE EACH REAL STEP PART LIVES INSIDE THE NEW VERSION (Plans/plan-new-from-real.md, Phase 3.3).
 *
 * The real tool has twelve steps (`TAB_ORDER`). On `/plan/new` each one is the page `/plan/new/s/<stepId>`.
 * One map, both directions, so `onGoToTab`, `onNext`, `goTo` and the old `?step=` links all land in one place.
 */
import { ROUTES } from "@/src/shared/routes"
import { TAB_ORDER, stepFor } from "@/src/goals/data/northStar"
import type { NorthStarTabId } from "@/src/goals/types"

/** The twelve step ids, in the real tool's order. */
export const REAL_STEP_IDS: readonly NorthStarTabId[] = TAB_ORDER

/** The folder every real step lives in: `/plan/new/s`. */
export const REAL_STEP_BASE = `${ROUTES.planNew}/s`

export const isRealStepId = (id: string): id is NorthStarTabId => (REAL_STEP_IDS as readonly string[]).includes(id)

/** The address of a step, or null when `id` names none of the twelve. */
export function realStepRoute(id: string): string | null {
  return isRealStepId(id) ? `${REAL_STEP_BASE}/${id}` : null
}

/** The step an address names (`/plan/new/s/star`, with or without a query), or null. */
export function realStepOfRoute(path: string): NorthStarTabId | null {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "")
  if (!clean.startsWith(`${REAL_STEP_BASE}/`)) return null
  const id = clean.slice(REAL_STEP_BASE.length + 1)
  return isRealStepId(id) ? id : null
}

/**
 * The step an old link names. `?step=one`, `commit` and `templates` folded into other steps (`MOVED_STEPS`);
 * they land on the step that took them over. Anything else unknown is null.
 */
export function realStepOfParam(param: string | null | undefined): NorthStarTabId | null {
  if (!param) return null
  const asked = param as NorthStarTabId
  const target = stepFor(asked)
  return isRealStepId(target) ? target : null
}
