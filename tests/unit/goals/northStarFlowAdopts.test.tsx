// @vitest-environment jsdom

/**
 * A PROGRAM RUNNING ON THE ACCOUNT IS ADOPTED BY THE PLAN, AND SURVIVES THE
 * ACCOUNT'S OWN PLAN ARRIVING.
 *
 * `reconcileProgramReference` is pure and has its own suite, and it was right
 * the whole time. The defect was one line away from it, in the effect graph:
 * two effects own `plan`, and the load order decided the answer.
 *
 *   - The reconcile effect fired as soon as `/api/programs/enrollments`
 *     answered, and adopted the running program.
 *   - The account's plan comes from a SEPARATE request and lands as a wholesale
 *     `setPlan(decision.plan)` at the end of an async load — throwing the
 *     adoption away.
 *   - `plan` was not in the reconcile effect's dependency list, so nothing ever
 *     re-adopted. The Systems step said nothing was linked for as long as the
 *     tab stayed open.
 *
 * That is invisible to every test of the pure function and to any test of a
 * browser whose account holds no plan row — which is why it survived: the
 * e2e walk (`tests/e2e/life-mastery-program-link.spec.ts`) only started failing
 * the day the shared test account acquired a plan row of its own.
 *
 * The observable is the plan the flow has SETTLED on, read out of the cache it
 * writes on every change, rather than the rendered card — the bug is in the
 * effects, and routing the assertion through four tabs of markup would couple
 * it to the one thing this is not about.
 */

import { cleanup, render, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { emptyNsPlan, loadNsPlan, setNorthStar } from "@/src/goals/northStarService"
import { NORTH_STAR_STORAGE_KEY } from "@/src/goals/data/northStar"
import { planToRows } from "@/src/goals/lifePlanMapper"

const PLAN_ID = "11111111-1111-4111-8111-111111111111"
const USER_ID = "22222222-2222-4222-8222-222222222222"
const ENROLLMENT = "33333333-3333-4333-8333-333333333333"

/** Every request this render made, in order. */
let calls: Array<{ method: string; url: string }> = []

/**
 * The account's plan: written, so the flow takes `use-server` and the load
 * really does replace what the browser holds. It carries NO training routine —
 * the default set ships without one, and adoption adds it, so this also proves
 * the adoption reaches a plan that had nowhere to record a program.
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
 * One program, running. `started_at` matters: reconcile adopts the most
 * recently started when several run, and this suite's point is the single case.
 */
const RUNNING = [
  {
    id: ENROLLMENT,
    user_id: USER_ID,
    program_id: "stronglifts_5x5",
    level: "beginner",
    unitSystem: "metric",
    exerciseState: {},
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
    is_active: true,
    started_at: "2026-09-20T08:00:00.000Z",
    customSchedule: null,
  },
]

function installFetch({ enrollmentsAnswer }: { enrollmentsAnswer: "running" | "failed" }) {
  const rows = serverPlanRows()
  let revision = 3
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const method = init?.method ?? "GET"
    calls.push({ method, url })

    if (url.startsWith("/api/programs/enrollments")) {
      if (enrollmentsAnswer === "failed") return new Response("nope", { status: 500 })
      return new Response(JSON.stringify(RUNNING), { status: 200 })
    }
    if (url.startsWith("/api/life-plan")) {
      if (method === "PUT") {
        revision += 1
        return new Response(JSON.stringify({ revision }), { status: 200 })
      }
      return new Response(JSON.stringify({ plan: rows, revision, goalLinks: {} }), { status: 200 })
    }
    // Everything else the page reaches for, answered emptily rather than thrown.
    return new Response(JSON.stringify({}), { status: 200 })
  }))
}

/**
 * Simulated time IN SLICES, flushing promises between each — the flow arms its
 * timers only after its fetches resolve, and one long advance runs past them.
 * Copied deliberately from `northStarFlowSaves.test.tsx`, where a single
 * advance passed both with a bug and without it.
 */
async function passTime(ms: number) {
  const slice = 500
  for (let elapsed = 0; elapsed < ms; elapsed += slice) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(slice)
    })
  }
}

/** The plan the flow has settled on, as it cached it. */
function settledPlan() {
  const raw = window.localStorage.getItem(NORTH_STAR_STORAGE_KEY)
  if (!raw) throw new Error("the flow cached no plan at all")
  const plan = loadNsPlan(raw)
  if (!plan) throw new Error("the flow cached something that is not a plan")
  return plan
}

function referenced(): string | null {
  const routine = settledPlan().routines.find((r) => r.blueprintId === "workout")
  return routine?.program?.enrollmentId ?? null
}

beforeEach(() => {
  calls = []
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("the plan adopts the program the account is running", () => {
  it("keeps the adoption after the account's own plan arrives", async () => {
    installFetch({ enrollmentsAnswer: "running" })
    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(20_000)

    expect(
      referenced(),
      "the plan must point at the running enrollment once both reads have landed",
    ).toBe(ENROLLMENT)
  })

  it("settles: the adoption is sent once, not on a loop", async () => {
    installFetch({ enrollmentsAnswer: "running" })
    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(60_000)

    /**
     * `plan` is in the reconcile effect's dependency list, so this is the
     * assertion that the loop it could have caused does not happen.
     * `reconcileProgramReference` returns the same object when nothing changed,
     * and one PUT over a minute is what that contract looks like from outside.
     */
    const puts = calls.filter((c) => c.method === "PUT" && c.url.startsWith("/api/life-plan")).length
    expect(puts, `the adoption produced ${puts} plan saves in sixty seconds`).toBe(1)
  })

  it("adopts nothing when the program list could not be read", async () => {
    installFetch({ enrollmentsAnswer: "failed" })
    render(<NorthStarFlow backHref="/dashboard" backLabel="Dashboard" timezone="Europe/Copenhagen" />)
    await passTime(20_000)

    // A read that failed is not "you have no programs". Detaching here would
    // drop a reference to a program running perfectly well.
    expect(referenced()).toBeNull()
  })
})
