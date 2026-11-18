"use client"

/**
 * The plan store as screens use it: `usePlanStore()` inside `<PlanStoreProvider>`.
 *
 * The provider is where the copy space is named. It puts the page's request
 * guard in place first (every plan call then carries `?target=sandbox` and the
 * copy space's account) and only then opens the store, so no read can go out
 * unaimed. Swapping the save engine later means changing `realDeps` below.
 */

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react"
import type { NsPlan } from "@/src/goals/types"
import { fetchLifePlan, newNodeId, saveLifePlanChanges, startLifePlan } from "@/src/goals/lifePlanClient"
import { fetchDayRecord, saveDayCatchingUp } from "@/src/goals/lifePlanDayClient"
import { guardSandboxRequests, onAccountChanged, ACCOUNT_CHANGED_MESSAGE } from "@/src/goals/planAccount"
import { emptyNsPlan } from "@/src/goals/northStarService"
import { PLAN_AREAS, DEFAULT_RATING } from "@/src/goals/planSteps/copy/planAreas"
import { ratingAreaKey, ratingLabelsKey, ratingScaleKey } from "@/src/goals/planSteps/planFacts"
import { createPlanStore, type PlanStoreDeps } from "./createPlanStore"
import type { PlanStore, PlanStoreState } from "./types"

/**
 * The plan an account with nothing starts from: the eight areas the owner picked, no routines until
 * the person adds some, and one daily rating (1 to 5) on Feeling about life. The rating's scale and
 * area have no column yet, so they are kept as the plan's own `start:` answers (`planFacts.ts`).
 */
export function newAccountPlan(): NsPlan {
  const base = emptyNsPlan()
  const seq = base.seq + 1
  return {
    ...base,
    routines: [],
    areas: PLAN_AREAS.map((a) => ({ id: a.id, label: a.label, sublabel: a.covers, color: a.color, custom: false })),
    fields: [{ id: DEFAULT_RATING.id, label: DEFAULT_RATING.question, targetId: null, kind: "number", readSourceId: null }],
    answers: {
      [ratingScaleKey(DEFAULT_RATING.id)]: String(DEFAULT_RATING.scale),
      [ratingAreaKey(DEFAULT_RATING.id)]: DEFAULT_RATING.areaId,
      [ratingLabelsKey(DEFAULT_RATING.id)]: `${DEFAULT_RATING.lowLabel}|${DEFAULT_RATING.highLabel}`,
    },
    seq,
  }
}

export function realDeps(account: string): PlanStoreDeps {
  return {
    fetchPlan: () => fetchLifePlan(account),
    fetchDays: () => fetchDayRecord(account),
    startPlan: () => startLifePlan(account),
    savePlan: (before, after, planId, revision, ids) => saveLifePlanChanges(before, after, planId, revision, ids, newNodeId, account),
    saveDay: (patch, savePlanFirst) => saveDayCatchingUp(patch, savePlanFirst, account),
    initialPlan: newAccountPlan,
    messages: {
      offline: "Your plan could not be reached, so nothing is saved. Reload to try again.",
      failed: "The last change is not saved yet. It is still on this phone.",
      stale: "This plan changed somewhere else. Reload to see it.",
    },
  }
}

interface Ctx {
  store: PlanStore | null
}

const StoreContext = createContext<Ctx>({ store: null })

export function PlanStoreProvider({ account, children }: { account: string; children: ReactNode }) {
  const [store, setStore] = useState<PlanStore | null>(null)

  useLayoutEffect(() => {
    const undo = guardSandboxRequests(account)
    const made = createPlanStore(realDeps(account))
    setStore(made)
    return () => {
      undo()
      setStore(null)
    }
  }, [account])

  // Another sign-in in another tab: the guard's own refusal. Treated as a stale plan.
  useEffect(() => onAccountChanged(account, () => void 0), [account])

  const value = useMemo(() => ({ store }), [store])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

const loadingState: PlanStoreState = { plan: newAccountPlan(), loaded: false, status: "loading", waiting: 0, note: "" }

export interface UsePlanStore extends PlanStoreState {
  update: PlanStore["update"]
  updateDay: PlanStore["updateDay"]
  flush: PlanStore["flush"]
  retry: PlanStore["retry"]
  reload: PlanStore["reload"]
}

export function usePlanStore(): UsePlanStore {
  const { store } = useContext(StoreContext)
  const subscribe = useCallback((l: () => void) => (store ? store.subscribe(l) : () => {}), [store])
  const snap = useSyncExternalStore(
    subscribe,
    () => (store ? store.getState() : loadingState),
    () => loadingState,
  )
  const none = useMemo(
    () => ({
      update: () => {},
      updateDay: () => {},
      flush: async () => false,
      retry: async () => false,
      reload: async () => {},
    }),
    [],
  )
  return { ...snap, ...(store ?? none) }
}

export { ACCOUNT_CHANGED_MESSAGE }
