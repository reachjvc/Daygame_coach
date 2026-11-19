"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import type { NsPlan } from "@/src/goals/types"
import { usePlanStore, type UsePlanStore } from "@/src/goals/planStore"
import { planStatus, type PlanStatus } from "@/src/goals/planSteps/planStatus"
import { todayISO } from "@/src/goals/northStarService"
import { ROUTES } from "@/src/shared/routes"
import { EXTRA_IDS, type ExtraId } from "@/src/goals/planSteps/planRoutes"

const HIDE_DAYS = 7
const hideKey = (account: string, id: string) => `plan-next-hidden:${account}:${id}`

function readHidden(account: string): ExtraId[] {
  const out: ExtraId[] = []
  try {
    for (const id of EXTRA_IDS) {
      const until = Number(window.localStorage.getItem(hideKey(account, id)))
      if (until > Date.now()) out.push(id)
    }
  } catch { /* storage refused: nothing hidden */ }
  return out
}

export interface PlanNew {
  plan: NsPlan
  store: UsePlanStore
  /** Change the plan; saved at once. */
  change: (fn: (plan: NsPlan) => NsPlan) => void
  today: string
  /** The id the plan is kept under (the copy space's hidden account). */
  account: string
  /** The account's timezone (read on the server); the real step parts compute their day from it. */
  timezone: string
  status: PlanStatus
  /** Where a Change link came from; Next returns there instead of going on. */
  from: string | null
  /** Hide a suggestion for 7 days on this device. */
  hideSuggestion: (id: ExtraId) => void
}

const Ctx = createContext<PlanNew | null>(null)

export function PlanNewProvider({ children, account, timezone = "UTC" }: { children: ReactNode; account: string; timezone?: string }) {
  const store = usePlanStore()
  const [today] = useState(() => todayISO())
  const [hidden, setHidden] = useState<ExtraId[]>([])
  useEffect(() => setHidden(readHidden(account)), [account])
  const hideSuggestion = useCallback((id: ExtraId) => {
    try { window.localStorage.setItem(hideKey(account, id), String(Date.now() + HIDE_DAYS * 86_400_000)) } catch { /* storage refused: hidden until reload */ }
    setHidden((h) => (h.includes(id) ? h : [...h, id]))
  }, [account])
  const status = useMemo(() => planStatus({ plan: store.plan, today, hour: new Date().getHours(), hidden }), [store.plan, today, hidden])
  const value = useMemo<PlanNew>(
    () => ({ plan: store.plan, store, change: store.update, today, timezone, account, status, from: null, hideSuggestion }),
    [store, today, timezone, account, status, hideSuggestion],
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
