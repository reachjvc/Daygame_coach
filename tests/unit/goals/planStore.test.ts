import { describe, it, expect, vi } from "vitest"
import { createPlanStore, newAccountPlan, type PlanStoreDeps } from "@/src/goals/planStore"
import { setPicture } from "@/src/goals/planSteps/planChanges"
import type { LoadedPlan, SaveOutcome } from "@/src/goals/lifePlanClient"
import type { NsPlan } from "@/src/goals/types"

const emptyDays = { daily: {}, logged: { "2026-01-01": ["s1"] }, notes: {}, journal: {}, numbers: {} }
const loaded = (over: Partial<LoadedPlan> = {}): LoadedPlan => ({ planId: "plan-1", plan: newAccountPlan(), rows: null, revision: 3, ids: new Map(), ...over })
const ok = (revision: number): SaveOutcome => ({ ok: true, revision, ids: new Map() })

function deps(over: Partial<PlanStoreDeps> = {}): PlanStoreDeps & { saves: NsPlan[] } {
  const saves: NsPlan[] = []
  let rev = 3
  return {
    saves,
    fetchPlan: async () => loaded(),
    fetchDays: async () => emptyDays,
    startPlan: async () => ({ id: "plan-new", revision: 0 }),
    savePlan: async (_b, after) => {
      saves.push(after)
      return ok(++rev)
    },
    initialPlan: newAccountPlan,
    messages: { offline: "offline", failed: "failed", stale: "stale" },
    ...over,
  }
}
const tick = () => new Promise((r) => setTimeout(r, 0))
const edit = (text: string) => (p: NsPlan) => setPicture(p, text, "2026-11-18")

describe("the plan store", () => {
  it("is loading until the first read answers, then holds the account's plan with its days", async () => {
    const store = createPlanStore(deps())
    expect(store.getState()).toMatchObject({ loaded: false, status: "loading" })
    await tick()
    const s = store.getState()
    expect(s).toMatchObject({ loaded: true, status: "saved", waiting: 0 })
    expect(s.plan.logged["2026-01-01"]).toEqual(["s1"])
  })

  it("starts from the new-account plan, with no row made, when the account holds none", async () => {
    const d = deps({ fetchPlan: async () => loaded({ planId: null, plan: null, revision: 0 }) })
    const start = vi.spyOn(d, "startPlan")
    const store = createPlanStore(d)
    await tick()
    expect(store.getState().plan.routines).toEqual([])
    expect(start).not.toHaveBeenCalled()
    store.update(edit("A picture"))
    expect(await store.flush()).toBe(true)
    expect(start).toHaveBeenCalledOnce()
    expect(d.saves.at(-1)?.northStar).toBe("A picture")
  })

  it("shows a change at once and saves it without waiting to be asked", async () => {
    const d = deps()
    const store = createPlanStore(d)
    await tick()
    store.update(edit("One"))
    expect(store.getState().plan.northStar).toBe("One")
    expect(store.getState().status).toBe("saving")
    await store.flush()
    expect(d.saves).toHaveLength(1)
    expect(store.getState()).toMatchObject({ status: "saved", waiting: 0 })
  })

  it("never saves two at once, and the last change always lands", async () => {
    let release: () => void = () => {}
    let inFlight = 0
    let most = 0
    const d = deps({
      savePlan: async (_b, after) => {
        inFlight += 1
        most = Math.max(most, inFlight)
        d.saves.push(after)
        await new Promise<void>((r) => (release = r))
        inFlight -= 1
        return ok(10 + d.saves.length)
      },
    })
    const store = createPlanStore(d)
    await tick()
    store.update(edit("a"))
    await tick()
    store.update(edit("ab"))
    store.update(edit("abc"))
    release()
    await tick()
    release()
    expect(await store.flush()).toBe(true)
    expect(most).toBe(1)
    expect(d.saves.at(-1)?.northStar).toBe("abc")
    expect(d.saves.length).toBeLessThanOrEqual(2)
  })

  it("keeps a failed change, says so, and Retry sends it", async () => {
    let fail = true
    const d = deps({
      savePlan: async (_b, after) => {
        if (fail) return { ok: false, stale: false, message: "no connection" }
        d.saves.push(after)
        return ok(9)
      },
    })
    const store = createPlanStore(d)
    await tick()
    store.update(edit("kept"))
    expect(await store.flush()).toBe(false)
    expect(store.getState()).toMatchObject({ status: "failed", note: "no connection" })
    expect(store.getState().plan.northStar).toBe("kept")
    fail = false
    expect(await store.retry()).toBe(true)
    expect(d.saves.at(-1)?.northStar).toBe("kept")
    expect(store.getState().status).toBe("saved")
  })

  it("stops on a stale plan and never saves over it", async () => {
    const d = deps({ savePlan: async () => ({ ok: false, stale: true }) })
    const store = createPlanStore(d)
    await tick()
    store.update(edit("x"))
    expect(await store.flush()).toBe(false)
    expect(store.getState()).toMatchObject({ status: "stale", note: "stale" })
  })

  it("a read that failed is not an empty account: nothing is saved", async () => {
    const d = deps({ fetchPlan: async () => undefined })
    const save = vi.spyOn(d, "savePlan")
    const store = createPlanStore(d)
    await tick()
    expect(store.getState()).toMatchObject({ loaded: true, status: "offline", note: "offline" })
    store.update(edit("x"))
    expect(await store.flush()).toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it("an account whose row already holds changes when a plan is started is stale, not overwritten", async () => {
    const d = deps({ fetchPlan: async () => loaded({ planId: null, plan: null, revision: 0 }), startPlan: async () => ({ id: "p", revision: 5 }) })
    const store = createPlanStore(d)
    await tick()
    store.update(edit("x"))
    expect(await store.flush()).toBe(false)
    expect(store.getState().status).toBe("stale")
  })

  it("a change that changes nothing sends nothing", async () => {
    const d = deps()
    const store = createPlanStore(d)
    await tick()
    store.update((p) => p)
    expect(await store.flush()).toBe(true)
    expect(d.saves).toHaveLength(0)
  })

  it("reload saves what is waiting, then reads again", async () => {
    const d = deps()
    const read = vi.spyOn(d, "fetchPlan")
    const store = createPlanStore(d)
    await tick()
    store.update(edit("before reload"))
    await store.reload()
    expect(d.saves.at(-1)?.northStar).toBe("before reload")
    expect(read).toHaveBeenCalledTimes(2)
  })
})
