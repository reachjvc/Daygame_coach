"use client"

import { createContext, useContext } from "react"
import { ROUTES } from "@/src/shared/routes"

/**
 * THE ADDRESS THIS FLOW LIVES AT: `/plan`, or `/plan/sandbox` on the copy space.
 *
 * Every address the flow writes for itself (the step in the address bar, a
 * return address handed to another page) starts from it, so the copy space can
 * never drift onto the real plan: a reload, a bookmark or a Back there must
 * open the same page it left.
 */
export const PlanBasePathContext = createContext<string>(ROUTES.plan)

export function usePlanBasePath(): string {
  return useContext(PlanBasePathContext)
}
