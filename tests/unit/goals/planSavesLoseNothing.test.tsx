// @vitest-environment jsdom
/**
 * PHASE 3 OF Plans/plan-in-steps.md: the plan's save loses nothing and says
 * the truth. The pieces that can be tested without a page: the day split for
 * keepalive, the 422 answer, the messages, and what sign-out removes.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { saveDayFromBrowser, sendDayOnLeave, splitDayPatch } from "@/src/goals/lifePlanDayClient"
import { saveLifePlanChanges } from "@/src/goals/lifePlanClient"
import { syncNotice } from "@/src/goals/lifePlanSync"
import { forgetPlanCopies } from "@/src/shared/offlineCopies"
import { planToRows } from "@/src/goals/lifePlanMapper"
import * as ns from "@/src/goals/northStarService"

afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

const bytes = (v: unknown) => new Blob([JSON.stringify(v)]).size

describe("a day too big for one keepalive request goes in parts", () => {
  const big = (n: number) => "x".repeat(n)

  it("keeps a small day whole", () => {
    const patch = { date: "2026-11-18", note: "hi", ticks: { a: true } }
    expect(splitDayPatch(patch)).toEqual([patch])
  })

  it("splits a big one so each part fits, and loses no key", () => {
    const patch = {
      date: "2026-11-18",
      note: big(15_000),
      ticks: { a: true, b: false },
      journal: { q1: big(15_000), q2: big(15_000), q3: big(15_000) },
      asked: { q1: "Q one", q2: "Q two", q3: "Q three" },
      ratings: { area_health: 7 },
      numbers: { g1: 3 },
    }
    const parts = splitDayPatch(patch, 20_000)
    expect(parts.length).toBeGreaterThan(3)
    for (const part of parts) {
      expect(part.date).toBe("2026-11-18")
      expect(bytes(part)).toBeLessThanOrEqual(20_000)
    }
    // Merging the parts gives the original back.
    const merged: Record<string, unknown> = {}
    for (const part of parts) {
      for (const [k, v] of Object.entries(part)) {
        if (k === "date" || k === "note") merged[k] = v
        else merged[k] = { ...(merged[k] as object), ...(v as object) }
      }
    }
    expect(merged).toEqual(patch)
    // A journal part carries the question words of its own answers.
    const journalPart = parts.find((p) => p.journal?.q2)!
    expect(journalPart.asked).toEqual({ q2: "Q two" })
  })

  it("sends every part keepalive on leave", () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response("{}")))
    vi.stubGlobal("fetch", fetchMock)
    sendDayOnLeave({ date: "2026-11-18", journal: { a: big(15_000), b: big(15_000), c: big(15_000) } }, "acct")
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1)
    for (const call of fetchMock.mock.calls as unknown as [string, RequestInit][]) {
      expect(call[1].keepalive).toBe(true)
    }
  })
})

describe("a text over its cap is a 422 that names the field", () => {
  it("the plan save reports it as a limit, with the server's own sentence", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ error: "Goal title: 612 of 500 characters", field: "Goal title", count: 612, max: 500 }, { status: 422 }))))
    let plan = ns.emptyNsPlan()
    plan = ns.addGoal(plan, plan.areas[0].id, "A goal")
    const ids = new Map<string, string>()
    const out = await saveLifePlanChanges(null, plan, "p1", 1, ids, () => crypto.randomUUID(), "acct")
    expect(out).toEqual({ ok: false, stale: false, message: "Goal title: 612 of 500 characters", limit: true })
  })

  it("a plain server error is not a limit", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ error: "Could not save your plan" }, { status: 500 }))))
    let plan = ns.emptyNsPlan()
    plan = ns.addGoal(plan, plan.areas[0].id, "A goal")
    const out = await saveLifePlanChanges(null, plan, "p1", 1, new Map(), () => crypto.randomUUID(), "acct")
    expect(out.ok).toBe(false)
    expect((out as { limit?: true }).limit).toBeUndefined()
  })

  it("the day save reports it as a limit", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(Response.json({ error: "Day note: 100001 of 100000 characters" }, { status: 422 }))))
    const out = await saveDayFromBrowser({ date: "2026-11-18", note: "x" }, "acct")
    expect(out).toEqual({ ok: false, planBehind: false, message: "Day note: 100001 of 100000 characters", limit: true })
  })

  it("a keepalive request is used for a plan save up to 60 KB", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json({ revision: 2 })))
    vi.stubGlobal("fetch", fetchMock)
    let plan = ns.emptyNsPlan()
    plan = ns.addGoal(plan, plan.areas[0].id, "y".repeat(40_000))
    const rows = planToRows(plan, { planId: "p", userId: "", idFor: () => crypto.randomUUID() })
    expect(rows).toBeTruthy()
    await saveLifePlanChanges(null, plan, "p1", 1, new Map(), () => crypto.randomUUID(), "acct")
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].keepalive).toBe(true)
  })
})

describe("the messages do not promise what a reload will not do", () => {
  it("says to keep the page open, not that the work is safe on the device", () => {
    expect(syncNotice("failed")).toBe("Not saved. Keep this page open; it retries.")
    for (const state of ["failed", "offline", "stale"] as const) {
      expect(syncNotice(state)).not.toMatch(/still here|on this device|keep working/i)
    }
  })
})

describe("sign-out clears the plan's copy in this browser", () => {
  it("removes north-star-v1 and plan-due-hidden keys of every account, and only those", () => {
    const keep = { "time-tracker-x": "1", "something-else": "2", "north-star-track-run": "keep" }
    for (const [k, v] of Object.entries(keep)) window.localStorage.setItem(k, v)
    window.localStorage.setItem("north-star-v1:user-a", "{}")
    window.localStorage.setItem("north-star-v1:user-b", "{}")
    window.localStorage.setItem("north-star-v1", "{}")
    window.localStorage.setItem("plan-due-hidden:user-a", "[]")
    forgetPlanCopies()
    for (const [k, v] of Object.entries(keep)) expect(window.localStorage.getItem(k)).toBe(v)
    expect(Object.keys(window.localStorage).filter((k) => k.startsWith("north-star-v1") || k.startsWith("plan-due-hidden:"))).toEqual([])
  })

  it("does not throw when storage is refused", () => {
    vi.spyOn(Storage.prototype, "key").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(() => forgetPlanCopies()).not.toThrow()
    vi.restoreAllMocks()
  })
})
