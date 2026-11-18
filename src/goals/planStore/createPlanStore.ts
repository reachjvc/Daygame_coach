/**
 * The store behind `PlanStore`, with every outside call handed in.
 *
 * Today it is built on the existing plan client calls (`lifePlanClient`,
 * `lifePlanDayClient`) aimed at the copy space. Handing the calls in keeps this
 * file free of `fetch`, and is what lets the unit tests run it against fakes.
 */

import type { NsPlan } from "@/src/goals/types"
import type { PlanRows } from "@/src/db/lifePlanTypes"
import type { LoadedPlan, SaveOutcome } from "@/src/goals/lifePlanClient"
import type { DayRecord } from "@/src/goals/lifePlanDayService"
import type { PlanStore, PlanStoreState, SaveStatus } from "./types"

export interface PlanStoreDeps {
  fetchPlan(): Promise<LoadedPlan | undefined>
  fetchDays(): Promise<DayRecord | undefined>
  startPlan(): Promise<{ id: string; revision: number } | undefined>
  savePlan(before: PlanRows | null, after: NsPlan, planId: string, revision: number, ids: Map<string, string>): Promise<SaveOutcome>
  /** The plan an account with nothing in it starts from. */
  initialPlan(): NsPlan
  messages: { offline: string; failed: string; stale: string }
}

export function createPlanStore(deps: PlanStoreDeps): PlanStore {
  let state: PlanStoreState = { plan: deps.initialPlan(), loaded: false, status: "loading", waiting: 0, note: "" }
  const listeners = new Set<() => void>()

  let planId: string | null = null
  let revision = 0
  let rows: PlanRows | null = null
  let ids = new Map<string, string>()
  let dirty = false
  let pump: Promise<boolean> | null = null
  let loading: Promise<void> | null = null
  let read = false

  const set = (patch: Partial<PlanStoreState>) => {
    state = { ...state, ...patch }
    for (const l of listeners) l()
  }

  const load = (): Promise<void> => {
    if (read) return Promise.resolve()
    if (loading) return loading
    loading = (async () => {
      const [server, days] = await Promise.all([deps.fetchPlan(), deps.fetchDays()])
      loading = null
      read = server !== undefined
      // A read that failed is "nobody knows", never "empty": nothing may be saved over it.
      if (server === undefined) {
        set({ loaded: true, status: "offline", note: deps.messages.offline })
        return
      }
      planId = server.planId
      revision = server.revision
      rows = server.rows
      ids = server.ids
      const base = server.plan ?? deps.initialPlan()
      const plan = days ? { ...base, daily: days.daily, logged: days.logged, notes: days.notes, journal: days.journal, numbers: days.numbers } : base
      set({ plan, loaded: true, status: "saved", waiting: 0, note: "" })
    })()
    return loading
  }
  void load()

  const run = async (): Promise<boolean> => {
    await load()
    if (state.status === "offline" || state.status === "stale") return false
    while (dirty) {
      dirty = false
      const sending = state.plan
      set({ status: "saving" })
      let id = planId
      let rev = revision
      if (!id) {
        const started = await deps.startPlan()
        if (!started) {
          dirty = true
          set({ status: "failed", note: deps.messages.failed })
          return false
        }
        // A row that already holds changes is another device's: never saved over.
        if (started.revision !== 0 && rows === null) {
          set({ status: "stale", note: deps.messages.stale })
          return false
        }
        id = started.id
        rev = started.revision
        planId = id
        revision = rev
      }
      const out = await deps.savePlan(rows, sending, id, rev, ids)
      if (out.ok) {
        revision = out.revision
        rows = out.rows ?? null
        ids = out.ids
        if (!dirty) set({ status: "saved", waiting: 0, note: "" })
      } else if (out.stale) {
        set({ status: "stale", note: deps.messages.stale })
        return false
      } else {
        dirty = true
        set({ status: "failed", note: out.message || deps.messages.failed })
        return false
      }
    }
    return true
  }

  const start = (): Promise<boolean> => {
    if (!pump) {
      pump = run().finally(() => {
        pump = null
      })
    }
    return pump
  }

  async function flush(): Promise<boolean> {
    if (!dirty && !pump) return state.status === "saved" || state.status === "loading"
    // A save already running may finish before the last change; run again until nothing waits.
    let ok = await start()
    while (ok && dirty) ok = await start()
    return ok
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    update(change) {
      const next = change(state.plan)
      if (next === state.plan) return
      dirty = true
      const status: SaveStatus = state.status === "offline" || state.status === "stale" || state.status === "loading" ? state.status : "saving"
      set({ plan: next, waiting: state.waiting + 1, status })
      void start()
    },
    flush,
    async retry() {
      if (state.status === "offline") {
        set({ status: "loading", note: "" })
        read = false
        await load()
        return state.status !== "offline"
      }
      dirty = true
      return start()
    },
    async reload() {
      await flush()
      read = false
      set({ status: "loading" })
      await load()
    },
  }
}
