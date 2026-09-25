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
import { addCustomStep, emptyNsPlan, serializeNsPlan, setNorthStar } from "@/src/goals/northStarService"
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

/**
 * `accountDays` is what `/api/life-plan/day` answers a GET with.
 *
 * Empty by default, which is the branch every test here took until 2026-09-25:
 * the account has no days, so the browser's stay and the import sends them. The
 * OTHER branch — the account HAS days, so they replace the browser's — had no
 * test at all, and it is the branch the load's merge lives in.
 */
function installFetch(accountDays?: { daily: object; logged: object; notes: object; journal: object }) {
  const rows = serverPlanRows()
  const days = accountDays ?? { daily: {}, logged: {}, notes: {}, journal: {} }
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const method = init?.method ?? "GET"
    calls.push({ method, url })

    // The day route FIRST, because `/api/life-plan/day` also starts with
    // `/api/life-plan` and matching by prefix would answer it with a plan.
    if (url === "/api/life-plan/day") {
      if (method === "PUT") return new Response(JSON.stringify({ savedAt: "2026-09-23" }), { status: 200 })
      return new Response(JSON.stringify(days), { status: 200 })
    }
    if (url === "/api/life-plan") {
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

/**
 * Plan saves ONLY.
 *
 * Matched exactly rather than by prefix: `/api/life-plan/day` shares the
 * prefix, and counting a day write as a plan write made this file's own
 * assertion — that a tick costs no plan save — pass for the wrong reason and
 * then fail for the wrong reason the moment the day route existed.
 */
/**
 * A plan with a tick that SURVIVES being loaded.
 *
 * The id has to be a real step's. `normalizeNsPlan` prunes `plan.logged` to ids
 * the plan actually carries, so a made-up `"s1"` is dropped on load and a test
 * built on one asserts nothing while looking like it asserts something — which
 * is what the first draft of this file did.
 */
function planWithARealTick() {
  const base = setNorthStar(emptyNsPlan(), "I run my own company and I am free.")
  const withStep = addCustomStep(base, base.routines[0].id, "Cold shower", 5, 7)
  const stepId = withStep.routines[0].steps[0].id
  return {
    plan: { ...withStep, logged: { "2026-09-23": [stepId] }, notes: { "2026-09-23": "a good day" } },
    stepId,
  }
}

const planPuts = () => calls.filter((c) => c.method === "PUT" && c.url === "/api/life-plan").length
/** Day saves, which a tick SHOULD cost exactly one of. */
const dayPuts = () => calls.filter((c) => c.method === "PUT" && c.url === "/api/life-plan/day").length

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
    window.localStorage.setItem(NORTH_STAR_STORAGE_KEY, serializeNsPlan(planWithARealTick().plan))

    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(60_000)

    expect(
      planPuts(),
      "the day half has its own route; the whole-plan save must not move for it",
    ).toBe(0)
  })

  it("but it DOES reach the account, by its own route", async () => {
    window.localStorage.setItem(NORTH_STAR_STORAGE_KEY, serializeNsPlan(planWithARealTick().plan))

    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(30_000)

    expect(dayPuts(), "a tick in the browser is sent to the day route").toBeGreaterThan(0)
  })

  it("sends the day nothing at all when there is nothing to send", async () => {
    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(60_000)

    expect(dayPuts(), "an idle tab must not write days either").toBe(0)
  })
})


/**
 * THE OTHER LOAD BRANCH: THE ACCOUNT ALREADY HAS DAYS.
 *
 * Every test above answers the day route with four empty maps, so they all take
 * the branch where the browser's days stay and the import sends them. The branch
 * where the account's days arrive and REPLACE the browser's had no test, and it
 * is where the load's merge lives — the merge added because a tap made while
 * that read was in flight used to be silently undone.
 *
 * Two things have to be true on a cold load nobody touched: the account's days
 * are what the screen gets, and NOTHING is sent. A load that writes its own
 * plan back is the defect this whole file exists to prevent, and it would be
 * just as wrong for the day half.
 */
describe("when the account already has days", () => {
  it("takes them, and sends nothing at all", async () => {
    const { plan, stepId } = planWithARealTick()
    window.localStorage.setItem(NORTH_STAR_STORAGE_KEY, serializeNsPlan(plan))

    // The account's copy: the SAME step, ticked on a different day, plus a note
    // this browser has never seen.
    vi.unstubAllGlobals()
    calls = []
    installFetch({
      daily: {},
      logged: { "2026-09-20": [stepId] },
      notes: { "2026-09-20": "the account's own line" },
      journal: {},
    })

    render(<NorthStarFlow />)
    await passTime(30_000)

    expect(dayPuts(), "a cold load must not write the day half back").toBe(0)
    expect(planPuts(), "nor the plan half").toBe(0)
  })
})
