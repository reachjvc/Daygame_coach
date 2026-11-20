/**
 * Addresses inside the FIRST REBUILD (modules and daily pages). Since Phase 4 of Plans/plan-new-from-real.md it lives
 * under `/plan/new/first`; `/plan/new/<screen id>` belongs to the sequence of real steps (`planSequences.ts`).
 * A screen is `<module>/<screen>`.
 */
import { ROUTES } from "@/src/shared/routes"

/** The folder the first rebuild lives in: `/plan/new/first`. */
export const FIRST_BASE = `${ROUTES.planNew}/first`

export const CORE_IDS = ["areas", "direction", "season", "goals", "actions", "review"] as const
export type CoreId = (typeof CORE_IDS)[number]

export const EXTRA_IDS = [
  "standing", "values", "identity", "experiences", "obstacles", "routines", "questions", "rolemodels", "quit", "selfratings",
] as const
export type ExtraId = (typeof EXTRA_IDS)[number]

/** The address of a screen, from its target (`areas/pick`, `goals/g4/numbers`). */
export function screenHref(target: string): string {
  return `${FIRST_BASE}/${target}`
}

export const homeHref = () => FIRST_BASE
export const readHref = () => `${FIRST_BASE}/read`
export const todayHref = () => `${FIRST_BASE}/today`
export const trackHref = () => `${FIRST_BASE}/track`
export const journalHref = () => `${FIRST_BASE}/journal`

export type ModuleId = CoreId | ExtraId

export function moduleOfTarget(target: string): CoreId | null {
  const first = target.split("/")[0]
  return (CORE_IDS as readonly string[]).includes(first) ? (first as CoreId) : null
}

export const isExtraId = (id: string): id is ExtraId => (EXTRA_IDS as readonly string[]).includes(id)

/** The plan home of the real steps (`/plan/new`). `?home=1` keeps it from opening Today once the plan is in use. */
export const planHomeHref = () => `${ROUTES.planNew}?home=1`
/** Plan my week: the guided build, a Deepen item on the plan home. */
export const weekHref = () => `${ROUTES.planNew}/week`
