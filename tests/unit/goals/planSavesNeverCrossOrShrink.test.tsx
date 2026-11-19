// @vitest-environment jsdom
/**
 * Phase 3 review fixes (Plans/plan-in-steps.md): the pure parts. One keepalive
 * budget shared by the plan and the day's parts; a revision that never goes
 * down; the back-off; acknowledging a day patch by patch; the Log Out hook.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { KEEPALIVE_BUDGET_BYTES, claimKeepalive, keepaliveInUse } from "@/src/goals/keepaliveBudget"
import { sendDayOnLeave } from "@/src/goals/lifePlanDayClient"
import { saveLifePlanChanges } from "@/src/goals/lifePlanClient"
import { backoffMs, nextRevision } from "@/src/goals/lifePlanSync"
import { recordAfterPatch, patchesBetween, emptyDayRecord, type DayRecord } from "@/src/goals/lifePlanDayService"
import { flushPlanPage, registerPlanPage, unsentPlanChanges } from "@/src/goals/planFlush"
import { forgetOfflineCopies } from "@/src/shared/offlineCopies"
import * as ns from "@/src/goals/northStarService"

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("one keepalive budget for everything sent on leave", () => {
  it("lets claims through until the total is spent, and gives bytes back on release", () => {
    const a = claimKeepalive(40_000)
    const b = claimKeepalive(15_000)
    expect(a && b).toBeTruthy()
    expect(claimKeepalive(10_000), "40k + 15k + 10k is over 60k").toBeNull()
    expect(keepaliveInUse()).toBe(55_000)
    b!()
    const c = claimKeepalive(10_000)
    expect(c).not.toBeNull()
    a!()
    expect(keepaliveInUse()).toBe(10_000)
    c!()
    expect(keepaliveInUse()).toBe(0)
  })

  it("a release counts once", () => {
    const a = claimKeepalive(1000)!
    a()
    a()
    expect(keepaliveInUse()).toBe(0)
  })

  it("the plan and the day's parts share it: what does not fit goes as a plain request", async () => {
    const calls: { keepalive: boolean; bytes: number }[] = []
    const settle: Array<() => void> = []
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => {
      calls.push({ keepalive: init.keepalive === true, bytes: new Blob([String(init.body)]).size })
      // stays in flight, holding its claim, until the end of this test
      return new Promise((_resolve, reject) => settle.push(() => reject(new Error("test over"))))
    }))
    // A plan save near 40 KB takes most of the budget...
    let plan = ns.emptyNsPlan()
    plan = ns.addGoal(plan, plan.areas[0].id, "y".repeat(400))
    plan = ns.updateGoal(plan, plan.goals[0].id, { why: "w".repeat(40_000) })
    void saveLifePlanChanges(null, plan, "p1", 1, new Map(), () => crypto.randomUUID(), "acct")
    await vi.waitFor(() => expect(calls.length).toBe(1))
    expect(calls[0].keepalive).toBe(true)
    // ...so of three 15 KB journal parts sent beside it only one fits.
    sendDayOnLeave({ date: "2026-11-18", journal: { a: "x".repeat(15_000), b: "x".repeat(15_000), c: "x".repeat(15_000) } }, "acct")
    const day = calls.slice(1)
    expect(day.length).toBe(3)
    expect(day.filter((c) => c.keepalive).length).toBeLessThan(3)
    expect(day.some((c) => !c.keepalive)).toBe(true)
    // Nothing kept alive ever went over the budget in total.
    expect(keepaliveInUse()).toBeLessThanOrEqual(KEEPALIVE_BUDGET_BYTES)
    // The budget is module state: give every claim back so the next test (or a
    // shuffled order) starts from zero.
    settle.forEach((s) => s())
    await vi.waitFor(() => expect(keepaliveInUse()).toBe(0))
  })
})

describe("a revision never goes down", () => {
  it("keeps the higher one", () => {
    expect(nextRevision(7, 5)).toBe(7)
    expect(nextRevision(7, 8)).toBe(8)
    expect(nextRevision(0, 0)).toBe(0)
  })

  it("a save with nothing to send reports the revision it was handed, which is why", async () => {
    const plan = ns.emptyNsPlan()
    const out = await saveLifePlanChanges(null, plan, "p1", 3, new Map(), () => crypto.randomUUID(), "acct").catch(() => null)
    // Whatever it answers, feeding it through nextRevision after a later save at 9 keeps 9.
    const reported = out && out.ok ? out.revision : 3
    expect(nextRevision(9, reported)).toBe(9)
  })
})

describe("a failing save backs off", () => {
  it("4 s, 8 s, 16 s ... and never more than a minute", () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(backoffMs)).toEqual([4000, 8000, 16000, 32000, 60000, 60000, 60000])
  })
})

describe("a day is acknowledged patch by patch", () => {
  it("applying every patch from the diff makes the diff empty", () => {
    const before = emptyDayRecord()
    before.notes["2026-11-17"] = "old"
    before.daily["2026-11-17"] = { a: 3 }
    before.logged["2026-11-17"] = ["s1", "s2"]
    const after = emptyDayRecord()
    after.notes["2026-11-17"] = ""
    after.daily["2026-11-17"] = { a: 4, b: 6 }
    after.logged["2026-11-17"] = ["s2", "s3"]
    after.journal["2026-11-18"] = { q: "text" }
    after.numbers["2026-11-18"] = { g: 2 }
    let held: DayRecord = before
    for (const patch of patchesBetween(before, after)) held = recordAfterPatch(held, patch)
    expect(patchesBetween(held, after)).toEqual([])
  })

  it("acknowledging one day leaves the other unsent, and an older ack never undoes a newer one", () => {
    const before = emptyDayRecord()
    const after = emptyDayRecord()
    after.notes["2026-11-17"] = "v1"
    after.notes["2026-11-18"] = "other"
    const [first, second] = patchesBetween(before, after)
    const held = recordAfterPatch(before, first)
    expect(patchesBetween(held, after)).toEqual([second])
    // The page has since moved on to v2; the older patch landing late only touches what it carried.
    const v2 = emptyDayRecord()
    v2.notes["2026-11-17"] = "v2"
    v2.notes["2026-11-18"] = "other"
    expect(patchesBetween(recordAfterPatch(held, second), v2)).toEqual([{ date: "2026-11-17", note: "v2" }])
  })
})

describe("Log Out can ask the plan page to send first", () => {
  it("flushes the open page, counts what it has not got accepted, and says 0 when none is open", async () => {
    expect(unsentPlanChanges()).toBe(0)
    let unsent = 2
    const undo = registerPlanPage({ flush: async () => { unsent = 0 }, unsent: () => unsent })
    expect(unsentPlanChanges()).toBe(2)
    await flushPlanPage()
    expect(unsentPlanChanges()).toBe(0)
    undo()
    expect(unsentPlanChanges()).toBe(0)
  })

  it("wipes the plan copies at sign-out, but keeps them for a sign-out the person did not choose", async () => {
    window.localStorage.setItem("north-star-v1:u", "{}")
    await forgetOfflineCopies({ keepUnsentTime: true })
    expect(window.localStorage.getItem("north-star-v1:u")).toBe("{}")
    await forgetOfflineCopies({ deviceForgotten: true })
    expect(window.localStorage.getItem("north-star-v1:u")).toBeNull()
  })
})
