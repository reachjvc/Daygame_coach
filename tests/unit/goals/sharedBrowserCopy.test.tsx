// @vitest-environment jsdom

/**
 * ONE BROWSER, TWO PEOPLE.
 *
 * The browser's copy of the plan used to live under one name for every
 * account. Somebody signs out, somebody else signs in on the same laptop, and
 * the flow painted the first person's plan for the second, and, if the second
 * account was empty, imported it as theirs on the next save. The copy is kept
 * per account now (`planCacheKey`), and the old shared one is moved aside on load.
 */

import { cleanup, render, act, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { emptyNsPlan, serializeNsPlan, setNorthStar } from "@/src/goals/northStarService"
import { NORTH_STAR_STORAGE_KEY, ORPHANED_PLAN_KEY, planCacheKey } from "@/src/goals/data/northStar"

const SECOND_PERSON = "33333333-3333-4333-8333-333333333333"
const FIRST_PERSONS_STAR = "The first person's private north star"

let bodies: Array<{ method: string; url: string; body: string }> = []

async function passTime(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
  }
}

beforeEach(() => {
  bodies = []
  window.localStorage.clear()
  // The second person's account holds no plan at all.
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const method = init?.method ?? "GET"
    bodies.push({ method, url, body: typeof init?.body === "string" ? init.body : "" })
    if (url === "/api/life-plan/day") return new Response(JSON.stringify({ daily: {}, logged: {}, notes: {}, journal: {} }), { status: 200 })
    if (url === "/api/life-plan") {
      if (method === "POST") return new Response(JSON.stringify({ id: "44444444-4444-4444-8444-444444444444", revision: 0 }), { status: 200 })
      if (method === "GET") return new Response(JSON.stringify({ plan: null }), { status: 200 })
      return new Response(JSON.stringify({ revision: 1 }), { status: 200 })
    }
    return new Response(JSON.stringify({}), { status: 200 })
  }))
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("a plan left in the browser by somebody else", () => {
  it("is not shown, not sent, and not left where the next page reads", async () => {
    window.localStorage.setItem(NORTH_STAR_STORAGE_KEY, serializeNsPlan(setNorthStar(emptyNsPlan(), FIRST_PERSONS_STAR)))

    render(<NorthStarFlow userId={SECOND_PERSON} />)
    await passTime(30_000)

    expect(screen.queryByText(FIRST_PERSONS_STAR), "shown to the second person").toBeNull()
    expect(bodies.filter((b) => b.body.includes(FIRST_PERSONS_STAR)), "sent to the second person's account").toEqual([])
    expect(window.localStorage.getItem(NORTH_STAR_STORAGE_KEY), "left where the next person's page reads").toBeNull()
    // Moved aside, not deleted: it may hold work only this browser had.
    expect(window.localStorage.getItem(ORPHANED_PLAN_KEY)).toContain(FIRST_PERSONS_STAR)
  })

  it("while this person's own copy is still theirs to keep", async () => {
    const own = "My own north star, written before my first save landed"
    window.localStorage.setItem(planCacheKey(SECOND_PERSON), serializeNsPlan(setNorthStar(emptyNsPlan(), own)))

    render(<NorthStarFlow userId={SECOND_PERSON} />)
    await passTime(30_000)

    const saves = bodies.filter((b) => b.url === "/api/life-plan" && b.method === "PATCH")
    expect(saves.some((b) => b.body.includes(own)), "an empty account takes its own browser copy").toBe(true)
  })
})
