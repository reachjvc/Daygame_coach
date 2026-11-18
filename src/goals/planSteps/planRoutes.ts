/** Addresses inside the new version. The base comes from `ROUTES.planNew`; a screen is `<module>/<screen>`. */
import { ROUTES } from "@/src/shared/routes"

export const CORE_IDS = ["areas", "direction", "season", "goals", "actions", "review"] as const
export type CoreId = (typeof CORE_IDS)[number]

export const EXTRA_IDS = [
  "standing", "values", "identity", "experiences", "obstacles", "routines", "questions", "rolemodels", "quit", "selfratings",
] as const
export type ExtraId = (typeof EXTRA_IDS)[number]

/** The address of a screen, from its target (`areas/pick`, `goals/g4/numbers`). */
export function screenHref(target: string): string {
  return `${ROUTES.planNew}/${target}`
}

export const homeHref = () => ROUTES.planNew
export const readHref = () => `${ROUTES.planNew}/read`
export const todayHref = () => `${ROUTES.planSandbox}?step=today`

export function moduleOfTarget(target: string): CoreId | null {
  const first = target.split("/")[0]
  return (CORE_IDS as readonly string[]).includes(first) ? (first as CoreId) : null
}
