// @vitest-environment jsdom
/**
 * AFTER "SIGNED OUT" OR "SOMEONE ELSE IS SIGNED IN", THE STORED DAY STAYS AWAY
 * (code review of b9219091).
 *
 * The open tab's re-read was refused (401/409), so the day was dropped. The
 * next re-read then failed for want of signal, and the page drew this phone's
 * stored copy of that person's day again, on a browser the next person uses.
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
const view: AuditView = { run, runs: [run], slots: [slot], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" } as unknown as AuditView

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("a tab whose person is gone, then loses signal", () => {
  test.each([401, 409])("after a %i, a re-read with no signal does not draw the stored day again", async (status) => {
    const server = { status: 200 }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (server.status === 0) throw new TypeError("Failed to fetch")
        if (server.status !== 200) return new Response(JSON.stringify({ error: "Authentication required" }), { status: server.status })
        return new Response(JSON.stringify(view), { status: 200 })
      }),
    )
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.slots.map((s) => s.activity)).toEqual(["Person one's walk"]))
    server.status = status
    await act(async () => void (await result.current.reload()))
    expect(result.current.view).toBeNull()
    server.status = 0
    await act(async () => void (await result.current.reload()))
    expect(result.current.view).toBeNull()
    expect(result.current.slots).toEqual([])
    expect(result.current.fromCopy).toBe(false)
    expect(result.current.accountGone).not.toBeNull()
  })

  test("a later good read draws the day again", async () => {
    const server = { status: 200 }
    vi.stubGlobal("fetch", vi.fn(async () => (server.status === 200 ? new Response(JSON.stringify(view), { status: 200 }) : new Response("{}", { status: 401 }))))
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    server.status = 401
    await act(async () => void (await result.current.reload()))
    server.status = 200
    await act(async () => void (await result.current.reload()))
    expect(result.current.view).not.toBeNull()
    expect(result.current.accountGone).toBeNull()
  })
})
