// @vitest-environment jsdom
/**
 * AN /audit TAB LEFT OPEN STOPS SHOWING THE DAY ONCE ITS PERSON IS GONE
 * (alpha p9-deletes-05).
 *
 * Shared browser: person 1 logs out in another tab and person 2 signs in. The
 * open tab's re-read names person 1 (the page's account), so the server
 * refuses it (409: another account; 401: nobody signed in), but the tab kept
 * drawing person 1's answers. Now such a refusal drops the day, and the page
 * says why.
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { AuditView } from "@/src/audit/auditClient"
import { useAudit } from "@/src/audit/hooks/useAudit"
import type { AuditRun, AuditSlot } from "@/src/audit/types"

const OWNER = "user-1"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const run = { id: RUN_ID, startedAt: "2026-11-09T12:00:00.000Z", endsAt: "2026-11-23T12:00:00.000Z", endedAt: null } as unknown as AuditRun
const slot: AuditSlot = { id: "s1", runId: RUN_ID, slotAt: "2026-11-09T15:30:00.000Z", activity: "Person one's walk", energy: 5, growth: 5, avoiding: false, why: null, source: "app", timeEntryId: null }
const view: AuditView = { run, runs: [run], slots: [slot], timeEntries: [], suggestions: [], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" }

function account() {
  const state = { status: 200 }
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (state.status === 409) return new Response(JSON.stringify({ error: "This page was opened for another account. Reload it.", accountChanged: true }), { status: 409 })
      if (state.status === 401) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })
      return new Response(JSON.stringify(view), { status: 200 })
    }),
  )
  return state
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("the re-read of an open audit tab after its person left", () => {
  test.each([
    [409, "other-account"],
    [401, "signed-out"],
  ] as const)("refused with %i: the day is no longer drawn, and the page knows why (%s)", async (status, why) => {
    const server = account()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.slots.map((s) => s.activity)).toEqual(["Person one's walk"]))
    server.status = status
    await act(async () => void (await result.current.reload()))
    expect(result.current.view).toBeNull()
    expect(result.current.slots).toEqual([])
    expect(result.current.accountGone).toBe(why)
  })

  test("a re-read that fails for want of signal still keeps the day on screen", async () => {
    account()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    await act(async () => void (await result.current.reload()))
    expect(result.current.view).not.toBeNull()
    expect(result.current.accountGone).toBeNull()
  })
})
