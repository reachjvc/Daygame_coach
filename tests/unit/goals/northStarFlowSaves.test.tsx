// @vitest-environment jsdom

/**
 * HOW OFTEN THE FLOW WRITES TO YOUR ACCOUNT.
 *
 * Nothing rendered this component until 2026-09-23, and three defects lived in
 * its effects for exactly that reason. Every one of them is invisible to a test
 * of the pure functions underneath, because each is a property of the EFFECT
 * DEPENDENCY GRAPH rather than of any function's return value:
 *
 * 1. **The save effect was its own trigger.** `revision` and `serverState` were
 *    in its dependency list and its own success handler wrote both, so each
 *    completed save re-armed the four-second timer. A tab nobody had typed into
 *    PUT the whole plan every four seconds forever, and `save_life_plan` bumps
 *    the revision unconditionally — which is what made any second device read
 *    as permanently stale.
 *
 * 2. **A tick sent the plan.** `plan.logged` is not part of what the save
 *    carries, but ticking produced a new plan object and the effect fired on
 *    object identity. So ticking a morning routine cost a write and a revision
 *    and saved none of the tick.
 *
 * 3. **`canSave` was handed a decision invented at the call site**, so the
 *    guard with its own test suite never ran against a real answer.
 *
 * The assertion is therefore a COUNT OF REQUESTS over simulated time, which is
 * the only shape that can fail for any of the three.
 */

import { cleanup, render, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { emptyNsPlan, serializeNsPlan, setNorthStar } from "@/src/goals/northStarService"
import { NORTH_STAR_STORAGE_KEY } from "@/src/goals/data/northStar"
import { planToRows } from "@/src/goals/lifePlanMapper"

const PLAN_ID = "11111111-1111-4111-8111-111111111111"
const USER_ID = "22222222-2222-4222-8222-222222222222"

/** Every `/api/life-plan` request this render made, in order. */
let calls: Array<{ method: string; url: string }> = []
let revision = 0

/**
 * The account, as the route would answer for it.
 *
 * It holds a written plan from the start, so the flow takes the `use-server`
 * branch and there is no import to confuse the count with.
 */
function serverPlanRows() {
  const plan = setNorthStar(emptyNsPlan(), "I run my own company and I am free.")
  let n = 0
  const minted = new Map<string, string>()
  return planToRows(plan, {
    planId: PLAN_ID,
    userId: USER_ID,
    idFor: (localId: string) => {
      const had = minted.get(localId)
      if (had) return had
      n += 1
      const made = `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`
      minted.set(localId, made)
      return made
    },
  })
}

function installFetch() {
  const rows = serverPlanRows()
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const method = init?.method ?? "GET"
    calls.push({ method, url })

    if (url.startsWith("/api/life-plan")) {
      if (method === "PUT") {
        revision += 1
        return new Response(JSON.stringify({ revision }), { status: 200 })
      }
      return new Response(JSON.stringify({ plan: rows, revision, goalLinks: {} }), { status: 200 })
    }
    // Everything else the page reaches for: answer emptily rather than throw,
    // so a failure here cannot look like a save.
    return new Response(JSON.stringify({}), { status: 200 })
  }))
}

const planPuts = () => calls.filter((c) => c.method === "PUT" && c.url.startsWith("/api/life-plan")).length

/**
 * Let simulated time pass IN SLICES, flushing promises between each.
 *
 * One big `advanceTimersByTimeAsync(60_000)` does not work here and passed both
 * with the bug and without it, which is worse than no test: the flow arms its
 * save timer only after `fetchLifePlan()` resolves, and that promise settles
 * after a single advance has already run to the end. Slicing gives the effects
 * a chance to arm timers that later slices can then fire.
 */
async function passTime(ms: number) {
  const slice = 500
  for (let elapsed = 0; elapsed < ms; elapsed += slice) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(slice)
    })
  }
}

beforeEach(() => {
  calls = []
  revision = 3
  window.localStorage.clear()
  installFetch()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("the flow does not write to the account on its own", () => {
  it("makes NO save at all across a minute of an untouched tab", async () => {
    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(60_000)

    // Fifteen debounce windows. The loop produced one PUT per window.
    expect(
      planPuts(),
      `an idle tab sent ${planPuts()} plan saves in sixty seconds; it must send none`,
    ).toBe(0)
  })

  it("reads the account exactly once on load", async () => {
    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(60_000)

    const gets = calls.filter((c) => c.method === "GET" && c.url === "/api/life-plan").length
    expect(gets).toBe(1)
  })

  it("does not save a plan it has only just been handed by the server", async () => {
    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(20_000)
    expect(planPuts()).toBe(0)
  })
})

describe("a day-half change never costs a plan save", () => {
  /**
   * Written through storage rather than through the screen on purpose: the
   * point is the EFFECT, and reaching the tick control means driving four tabs
   * of UI whose markup this test would then be coupled to. What matters is that
   * a plan whose only difference is a tick produces no request.
   */
  it("a plan differing only by a tick is not sent", async () => {
    const ticked = {
      ...setNorthStar(emptyNsPlan(), "I run my own company and I am free."),
      logged: { "2026-09-23": ["s1"] },
      notes: { "2026-09-23": "a good day" },
      journal: { "2026-09-23": { f1: "three gratitudes" } },
    }
    window.localStorage.setItem(NORTH_STAR_STORAGE_KEY, serializeNsPlan(ticked))

    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(60_000)

    expect(
      planPuts(),
      "the day half has its own route; the whole-plan save must not move for it",
    ).toBe(0)
  })
})
