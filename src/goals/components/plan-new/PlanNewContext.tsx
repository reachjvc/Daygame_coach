"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import type { NsPlan } from "@/src/goals/types"
import { usePlanStore, type UsePlanStore } from "@/src/goals/planStore"
import { planStatus, type PlanStatus } from "@/src/goals/planSteps/planStatus"
import { todayISO } from "@/src/goals/northStarService"
import { ROUTES } from "@/src/shared/routes"

export interface PlanNew {
  plan: NsPlan
  store: UsePlanStore
  /** Change the plan; saved at once. */
  change: (fn: (plan: NsPlan) => NsPlan) => void
  today: string
  status: PlanStatus
  /** Where a Change link came from; Next returns there instead of going on. */
  from: string | null
}

const Ctx = createContext<PlanNew | null>(null)

export function PlanNewProvider({ children }: { children: ReactNode }) {
  const store = usePlanStore()
  const [today] = useState(() => todayISO())
  const status = useMemo(() => planStatus({ plan: store.plan, today, hour: new Date().getHours() }), [store.plan, today])
  const value = useMemo<PlanNew>(
    () => ({ plan: store.plan, store, change: store.update, today, status, from: null }),
    [store, today, status],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlanNew(): PlanNew {
  const ctx = useContext(Ctx)
  const search = useSearchParams()
  if (!ctx) throw new Error("usePlanNew needs <PlanNewProvider>")
  const from = search.get("from")
  return useMemo(() => ({ ...ctx, from: from && from.startsWith(ROUTES.planNew) ? from : null }), [ctx, from])
}
