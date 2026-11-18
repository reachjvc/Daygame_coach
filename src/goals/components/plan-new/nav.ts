"use client"

import { useRouter } from "next/navigation"
import { homeHref, screenHref } from "@/src/goals/planSteps/planRoutes"
import { usePlanNew } from "./PlanNewContext"

/**
 * Moving between screens. Next goes on to the next screen, or back to where a
 * Change link came from; Back goes to the screen before it, or to that same
 * place. The address stays under the new version's own base (`screenHref`).
 */
export function useNav(summary?: string) {
  const router = useRouter()
  const { from } = usePlanNew()
  return {
    go: (target: string) => router.push(from ?? screenHref(target)),
    /** Where Back goes. */
    back: (target: string | null) => from ?? (target ? screenHref(target) : homeHref()),
    /** A Change link from a Done summary to a screen, coming back to the summary. */
    change: (target: string) => `${screenHref(target)}?from=${encodeURIComponent(screenHref(summary ?? ""))}`,
    router,
  }
}
