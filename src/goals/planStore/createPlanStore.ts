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
import { patchesBetween, recordAfterPatch, recordOf, type DayRecord } from "@/src/goals/lifePlanDayService"
import type { DayPatch } from "@/src/db/lifePlanDayTypes"
import type { DaySaveOutcome } from "@/src/goals/lifePlanDayClient"
import type { PlanStore, PlanStoreState, SaveStatus } from "./types"

export interface PlanStoreDeps {
  fetchPlan(): Promise<LoadedPlan | undefined>
  fetchDays(): Promise<DayRecord | undefined>
  startPlan(): Promise<{ id: string; revision: number } | undefined>
  savePlan(before: PlanRows | null, after: NsPlan, planId: string, revision: number, ids: Map<string, string>): Promise<SaveOutcome>
  /** Send one day's patch; `savePlanFirst` is the store's own plan save, awaited once if the account has not caught up. Absent: days are not saved. */
  saveDay?(patch: DayPatch, savePlanFirst: () => Promise<boolean>): Promise<DaySaveOutcome>
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
  // The day half: what the account holds (null until read), and the one chain that sends it.
  let accountDays: DayRecord | null = null
  let dayChain: Promise<boolean> = Promise.resolve(true)
  let dayBusy = false
  const blockedDays = new Set<string>()

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
      accountDays = days ?? null
      const plan = days ? { ...base, daily: days.daily, logged: days.logged, notes: days.notes, journal: days.journal, numbers: days.numbers ?? {} } : base
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
        if (!dirty && !dayBusy) set({ status: "saved", waiting: 0, note: "" })
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

  /** Everything the plan holds for days that the account does not yet, sent one day at a time. */
  const runDays = async (): Promise<boolean> => {
    await load()
    if (!deps.saveDay) return true
    if (state.status === "offline" || state.status === "stale") return false
    if (accountDays === null) {
      set({ status: "failed", note: deps.messages.offline })
      return false
    }
    dayBusy = true
    try {
      for (;;) {
        const patches = patchesBetween(accountDays, recordOf(state.plan)).filter((p) => !blockedDays.has(JSON.stringify(p)))
        if (patches.length === 0) break
        set({ status: "saving" })
        for (const patch of patches) {
          const out = await deps.saveDay(patch, flushPlan)
          if (out.ok) {
            accountDays = recordAfterPatch(accountDays, patch)
            continue
          }
          if (!out.planBehind && out.limit) {
            blockedDays.add(JSON.stringify(patch))
            set({ note: out.message })
            continue
          }
          set({ status: "failed", note: out.planBehind ? deps.messages.failed : out.message || deps.messages.failed })
          return false
        }
      }
    } finally {
      dayBusy = false
    }
    if (!dirty && !pump && blockedDays.size === 0) set({ status: "saved", waiting: 0, note: "" })
    return true
  }

  const startDays = (): Promise<boolean> => {
    dayChain = dayChain.then(runDays, runDays)
    return dayChain
  }

  const start = (): Promise<boolean> => {
    if (!pump) {
      pump = run().finally(() => {
        pump = null
      })
    }
    return pump
  }

  async function flushPlan(): Promise<boolean> {
    // A save already running may finish before the last change; run again until nothing waits.
    let ok = await start()
    while (ok && dirty) ok = await start()
    return ok
  }

  async function flush(): Promise<boolean> {
    const daysWaiting = deps.saveDay && accountDays !== null && patchesBetween(accountDays, recordOf(state.plan)).length > 0
    if (!dirty && !pump && !dayBusy && !daysWaiting) return state.status === "saved" || state.status === "loading"
    const planOk = await flushPlan()
    const daysOk = await startDays()
    return planOk && daysOk
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
    updateDay(change) {
      const next = change(state.plan)
      if (next === state.plan) return
      const status: SaveStatus = state.status === "offline" || state.status === "stale" || state.status === "loading" ? state.status : "saving"
      set({ plan: next, waiting: state.waiting + 1, status })
      // An account with no plan row yet cannot take a day: the plan is saved first (its ids are what the day names).
      if (planId === null) {
        dirty = true
        void start()
      }
      void startDays()
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
      const planOk = await start()
      const daysOk = await startDays()
      return planOk && daysOk
    },
    async reload() {
      await flush()
      read = false
      set({ status: "loading" })
      await load()
    },
  }
}
