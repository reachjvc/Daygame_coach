// @vitest-environment jsdom

/**
 * WHAT THE PAGE ACTUALLY SENDS (Plans/life-plan-rebuild.md, Phase 1).
 *
 * The other flow tests count saves; this one reads them. A save compares with
 * the rows the account holds, so one changed paragraph is one changed row, and
 * an account whose plan row holds nothing yet gets every part, the north
 * star's node among them. The second case is the one a review caught: compared
 * with a plan rebuilt from the read, the node looked present and was never
 * sent, and every save failed on its missing parent.
 */

import { cleanup, render, act, screen, fireEvent } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { NorthStarFlow } from "@/src/goals/components/north-star/NorthStarFlow"
import { emptyNsPlan, setNorthStar } from "@/src/goals/northStarService"
import { planToRows } from "@/src/goals/lifePlanMapper"
import type { PlanChanges, PlanRows } from "@/src/db/lifePlanTypes"

const PLAN_ID = "11111111-1111-4111-8111-111111111111"
const USER_ID = "22222222-2222-4222-8222-222222222222"

let patches: PlanChanges[] = []

function accountRows(written: boolean): PlanRows {
  const minted = new Map<string, string>()
  const rows = planToRows(setNorthStar(emptyNsPlan(), "I run my own company and I am free."), {
    planId: PLAN_ID,
    userId: USER_ID,
    idFor: (l) => minted.get(l) ?? minted.set(l, randomUUID()).get(l)!,
  })
  if (written) return { ...rows, updated_at: "2026-09-23T10:00:00Z" }
  const none = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, Array.isArray(v) ? [] : v]))
  return { ...(none as unknown as PlanRows), updated_at: "2026-09-23T10:00:00Z" }
}

function installFetch(rows: PlanRows) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    const method = init?.method ?? "GET"
    if (url === "/api/life-plan/day") return new Response(JSON.stringify({ daily: {}, logged: {}, notes: {}, journal: {} }), { status: 200 })
    if (url === "/api/life-plan") {
      if (method === "PATCH") {
        patches.push(JSON.parse(String(init?.body)).changes)
        return new Response(JSON.stringify({ revision: 4 + patches.length }), { status: 200 })
      }
      return new Response(JSON.stringify({ plan: rows, revision: 4, goalLinks: {} }), { status: 200 })
    }
    return new Response(JSON.stringify({}), { status: 200 })
  }))
}

async function passTime(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 500) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
  }
}

beforeEach(() => {
  patches = []
  window.localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("a save sends what changed against what the account holds", () => {
  it("one changed paragraph sends one north star row and nothing else", async () => {
    installFetch(accountRows(true))
    render(<NorthStarFlow userId={USER_ID} />)
    await passTime(3_000)

    fireEvent.change(await screen.findByLabelText("Your north star"), { target: { value: "A different paragraph." } })
    await passTime(10_000)

    expect(patches).toHaveLength(1)
    expect(Object.keys(patches[0].upsert)).toEqual(["north_stars"])
    expect(patches[0].upsert.north_stars).toEqual([expect.objectContaining({ text: "A different paragraph." })])
    expect(patches[0].remove).toEqual({})
    expect(patches[0].replace).toEqual([])
  })

  it("an account whose plan row holds nothing gets every part, the north star's node among them", async () => {
    installFetch(accountRows(false))
    render(<NorthStarFlow userId={USER_ID} />)
    await passTime(3_000)

    fireEvent.change(await screen.findByLabelText("Your north star"), { target: { value: "Typed into an empty plan row." } })
    await passTime(10_000)

    expect(patches.length).toBeGreaterThan(0)
    const nodes = patches.flatMap((p) => p.upsert.nodes ?? [])
    expect(nodes).toContainEqual(expect.objectContaining({ kind: "north_star", local_id: "north_star" }))
    expect(nodes.filter((n) => n.kind === "area").length).toBeGreaterThan(0)
  })
})
