// @vitest-environment jsdom

/**
 * A BROWSER WITH NO COPY OF THE PLAN WAITS FOR THE ACCOUNT BEFORE IT SHOWS ONE.
 *
 * Found in the review of the tests-catch plan, Phase 9: on a fresh browser the
 * page opened on a blank plan at once, editable, and the account's real plan
 * replaced it about a second later. Whatever was typed in that second was lost,
 * and keeping it would have been worse: a north star typed into a blank page
 * would have gone over the real one, unseen. So the blank is not shown; the
 * page says "Opening your plan…" until the account's read is decided.
 *
 * A browser WITH a copy still opens on it straight away (tickable before the
 * read lands, by design; see `keepEditsMadeWhileLoading`).
 */

import { cleanup, render, act, screen } from "@testing-library/react"
import { ROUTES } from "@/src/shared/routes"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { emptyNsPlan, serializeNsPlan, setNorthStar } from "@/src/goals/northStarService"
import { planCacheKey } from "@/src/goals/data/northStar"
import { planToRows } from "@/src/goals/lifePlanMapper"

const PLAN_ID = "11111111-1111-4111-8111-111111111111"
const USER_ID = "22222222-2222-4222-8222-222222222222"
const OPENING = "Opening your plan…"

function accountRows() {
  const plan = setNorthStar(emptyNsPlan(), "I run my own company and I am free.")
  let n = 0
  const minted = new Map<string, string>()
  return planToRows(plan, {
    planId: PLAN_ID,
    userId: USER_ID,
    idFor: (localId: string) => minted.get(localId) ?? minted.set(localId, `${String(++n).padStart(8, "0")}-0000-4000-8000-000000000000`).get(localId)!,
  })
}

/** The account's plan read is held until `answer()` is called. */
function installFetch() {
  let answer: () => void = () => {}
  const held = new Promise<void>((resolve) => (answer = resolve))
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const method = init?.method ?? "GET"
    if (url.startsWith("/api/life-plan")) {
      if (method !== "GET") return new Response(JSON.stringify({ revision: 4 }), { status: 200 })
      await held
      return new Response(JSON.stringify({ plan: accountRows(), revision: 3 }), { status: 200 })
    }
    return new Response(JSON.stringify({}), { status: 200 })
  }))
  return () => answer()
}

async function passTime(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 250) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
  }
}

const flow = () => render(<NorthStarFlow userId={USER_ID} backHref={ROUTES.dashboard} backLabel="Dashboard" timezone="Europe/Copenhagen" />)

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("a browser with no copy of the plan", () => {
  it("shows no plan to edit until the account answers, then shows the account's", async () => {
    const answer = installFetch()
    flow()
    await passTime(3_000)
    expect(screen.getByText(OPENING)).toBeTruthy()

    answer()
    await passTime(2_000)
    expect(screen.queryByText(OPENING)).toBeNull()
    expect(window.localStorage.getItem(planCacheKey(USER_ID)) ?? "").toContain("I run my own company and I am free.")
  })

  it("is not what a browser with a copy sees: that opens on its copy at once", async () => {
    window.localStorage.setItem(planCacheKey(USER_ID), serializeNsPlan(setNorthStar(emptyNsPlan(), "The copy this browser kept.")))
    installFetch()
    flow()
    await passTime(1_000)
    expect(screen.queryByText(OPENING)).toBeNull()
  })
})
