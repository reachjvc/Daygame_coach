// @vitest-environment jsdom

/**
 * TWO LEAKS IN THE PLAN'S SAVE (Plans/life-plan-rebuild.md, after the wheel).
 *
 *   1. An edit made in the seconds before the page closed was lost: the plan
 *      save waits a few seconds, and only the day half was sent as the page
 *      went. Now the waiting plan save is sent the moment the page is hidden,
 *      `keepalive`, and only once.
 *   2. A tab left open while somebody signed in as another account in another
 *      tab saved into that account. Now every request names the account the
 *      page was opened for, and a refusal from the server stops every save.
 */

import { cleanup, render, act, screen, fireEvent } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { emptyNsPlan, setNorthStar } from "@/src/goals/northStarService"
import { planToRows } from "@/src/goals/lifePlanMapper"
import { ACCOUNT_CHANGED_MESSAGE } from "@/src/goals/planAccount"
import { ACCOUNT_CHANGED_HEADER, PAGE_ACCOUNT_HEADER } from "@/src/shared/pageAccount"
import type { PlanRows } from "@/src/db/lifePlanTypes"

const PLAN_ID = "11111111-1111-4111-8111-111111111111"
const USER_ID = "22222222-2222-4222-8222-222222222222"

interface Sent {
  url: string
  method: string
  init: RequestInit | undefined
}
let sent: Sent[] = []

function accountRows(): PlanRows {
  const minted = new Map<string, string>()
  const rows = planToRows(setNorthStar(emptyNsPlan(), "I run my own company and I am free."), {
    planId: PLAN_ID,
    userId: USER_ID,
    idFor: (l) => minted.get(l) ?? minted.set(l, randomUUID()).get(l)!,
  })
  return { ...rows, updated_at: "2026-09-23T10:00:00Z" }
}

/** `refuseWrites`: the server's answer once somebody else has signed in on this browser. */
function installFetch(rows: PlanRows, { refuseWrites = false } = {}) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const method = init?.method ?? "GET"
    sent.push({ url, method, init })
    if (refuseWrites && method !== "GET") {
      return new Response(JSON.stringify({ error: "This page was opened for another account. Reload it." }), {
        status: 409,
        headers: { [ACCOUNT_CHANGED_HEADER]: "1" },
      })
    }
    if (url === "/api/life-plan/day") {
      if (method === "PUT") return new Response(JSON.stringify({ savedAt: "x" }), { status: 200 })
      return new Response(JSON.stringify({ daily: {}, logged: {}, notes: {}, journal: {} }), { status: 200 })
    }
    if (url === "/api/life-plan") {
      if (method === "PATCH") {
        return new Response(JSON.stringify({ revision: 5 + sent.filter((s) => s.method === "PATCH").length }), { status: 200 })
      }
      return new Response(JSON.stringify({ plan: rows, revision: 5, goalLinks: {} }), { status: 200 })
    }
    return new Response(JSON.stringify({}), { status: 200 })
  }))
}

const patches = () => sent.filter((s) => s.url === "/api/life-plan" && s.method === "PATCH")
const headerOf = (s: Sent, name: string) => new Headers(s.init?.headers).get(name)

async function passTime(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
  }
}

function hidePage() {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" })
  document.dispatchEvent(new Event("visibilitychange"))
  window.dispatchEvent(new Event("pagehide"))
}

beforeEach(() => {
  sent = []
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" })
  window.localStorage.clear()
})

describe("an edit made just before the page goes", () => {
  it("is sent the moment the page is hidden, keepalive, and only once", async () => {
    installFetch(accountRows())
    render(<NorthStarFlow userId={USER_ID} />)
    await passTime(3_000)

    fireEvent.change(await screen.findByLabelText("Your north star"), { target: { value: "Typed, then the tab was closed." } })
    await passTime(500)
    expect(patches()).toHaveLength(0)

    await act(async () => hidePage())
    await passTime(500)
    expect(patches()).toHaveLength(1)
    expect(patches()[0].init?.keepalive).toBe(true)
    expect(JSON.parse(String(patches()[0].init?.body)).changes.upsert.north_stars).toEqual([
      expect.objectContaining({ text: "Typed, then the tab was closed." }),
    ])

    // The usual wait running out afterwards sends nothing more.
    await passTime(10_000)
    expect(patches()).toHaveLength(1)
  })

  it("is sent when /plan is left for another page of the app, which fires no page event", async () => {
    installFetch(accountRows())
    const { unmount } = render(<NorthStarFlow userId={USER_ID} />)
    await passTime(3_000)
    fireEvent.change(await screen.findByLabelText("Your north star"), { target: { value: "Typed, then the Dashboard link." } })
    await passTime(500)
    unmount()
    await passTime(500)
    expect(patches()).toHaveLength(1)
    expect(JSON.parse(String(patches()[0].init?.body)).changes.upsert.north_stars).toEqual([
      expect.objectContaining({ text: "Typed, then the Dashboard link." }),
    ])
  })

  it("sends nothing on hiding when nothing is waiting", async () => {
    installFetch(accountRows())
    render(<NorthStarFlow userId={USER_ID} />)
    await passTime(3_000)
    await act(async () => hidePage())
    await passTime(1_000)
    expect(patches()).toHaveLength(0)
  })
})

describe("a page opened for one account", () => {
  it("names that account on every request it makes", async () => {
    installFetch(accountRows())
    render(<NorthStarFlow userId={USER_ID} />)
    await passTime(3_000)
    fireEvent.change(await screen.findByLabelText("Your north star"), { target: { value: "Named." } })
    await passTime(10_000)

    const planRequests = sent.filter((s) => s.url.startsWith("/api/life-plan"))
    expect(planRequests.length).toBeGreaterThan(2)
    for (const s of planRequests) expect(headerOf(s, PAGE_ACCOUNT_HEADER), `${s.method} ${s.url}`).toBe(USER_ID)
  })

  it("names the account on what the rest of the page fetches too, and stops naming it once closed", async () => {
    installFetch(accountRows())
    const { unmount } = render(<NorthStarFlow userId={USER_ID} />)
    await passTime(3_000)
    await act(async () => {
      await fetch("/api/goals")
      await fetch("https://example.com/elsewhere")
    })
    const goals = sent.find((s) => s.url === "/api/goals")!
    expect(new Headers(goals.init?.headers).get(PAGE_ACCOUNT_HEADER)).toBe(USER_ID)
    const elsewhere = sent.find((s) => s.url === "https://example.com/elsewhere")!
    expect(new Headers(elsewhere.init?.headers).get(PAGE_ACCOUNT_HEADER)).toBeNull()

    unmount()
    await act(async () => {
      await fetch("/api/goals?after")
    })
    expect(sent.find((s) => s.url === "/api/goals?after")!.init?.headers).toBeUndefined()
  })

  it("stops saving, plan and day, once the server says another account is signed in, and says so", async () => {
    installFetch(accountRows(), { refuseWrites: true })
    render(<NorthStarFlow userId={USER_ID} />)
    await passTime(3_000)

    fireEvent.change(await screen.findByLabelText("Your north star"), { target: { value: "Somebody else signed in." } })
    await passTime(10_000)
    expect(patches()).toHaveLength(1)
    expect(screen.getByText(ACCOUNT_CHANGED_MESSAGE)).toBeTruthy()

    // Nothing more goes out: not the next edit, not on leaving.
    fireEvent.change(screen.getByLabelText("Your north star"), { target: { value: "And typed again." } })
    await passTime(10_000)
    await act(async () => hidePage())
    await passTime(1_000)
    expect(patches()).toHaveLength(1)
    expect(sent.filter((s) => s.method !== "GET")).toHaveLength(1)
  })
})
