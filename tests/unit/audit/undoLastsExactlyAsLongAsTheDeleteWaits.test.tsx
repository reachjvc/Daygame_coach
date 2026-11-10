// @vitest-environment jsdom
/**
 * "DELETED · UNDO" IS SHOWN EXACTLY WHILE UNDO STILL WORKS — useAudit's
 * `undoable` and `undoRemove`.
 *
 *  - p9-deletes-01: the bar hid on its own 6 s timer, started when the page
 *    drew it; on a busy phone that was later than the tap, so the bar outlived
 *    the send, Undo did nothing, and the bar closed as if undone. Now the bar's
 *    time is the queued delete's own `notBefore`, and an Undo pressed after it
 *    says it was too late instead of pretending.
 *  - p9-deletes-03: a reload inside the Undo time lost the bar, and the answer
 *    went 6 s after the tap with no way back. The delete is in the stored
 *    queue, so the bar comes back for the rest of its time.
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { emptyAuditQueue, enqueueDelete, readAuditQueue, writeAuditQueue } from "@/src/audit/auditQueue"
import type { AuditView } from "@/src/audit/auditClient"
import { useAudit } from "@/src/audit/hooks/useAudit"
import { browserStore } from "@/src/shared/offlineQueue"
import type { AnswerMark, AuditRun, AuditSlot } from "@/src/audit/types"

const OWNER = "user-1"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const ID = "00000000-0000-4000-8000-0000000000a1"
const SLOT_AT = "2026-11-09T06:45:00.000Z"
const run = { id: RUN_ID, startedAt: "2026-11-09T05:00:00.000Z", endsAt: "2026-11-23T12:00:00.000Z", endedAt: null } as unknown as AuditRun
const slot: AuditSlot = { id: ID, runId: RUN_ID, slotAt: SLOT_AT, activity: "Walk", energy: 5, growth: 5, avoiding: false, why: null, source: "app", timeEntryId: null }
const view: AuditView = { run, runs: [run], slots: [slot], timeEntries: [], suggestions: [], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" }
const drawn: AnswerMark & { slotAt: string; runId: string } = { id: ID, activity: "Walk", energy: 5, growth: 5, why: null, slotAt: SLOT_AT, runId: RUN_ID }

function fakeServer() {
  const deletes: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        deletes.push(url)
        return new Response(JSON.stringify({ ok: true, deleted: true }), { status: 200 })
      }
      return new Response(JSON.stringify(view), { status: 200 })
    }),
  )
  return deletes
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("the Undo bar's time is the queued delete's own (p9-deletes-01)", () => {
  test("the bar names the answer and ends at the instant the delete may be sent, not when the page drew it", async () => {
    fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(ID, 400, drawn))
    const queued = readAuditQueue(browserStore(), OWNER).deletes[0]
    expect(result.current.undoable).toMatchObject({ id: ID, slotAt: SLOT_AT, activity: "Walk", until: queued.notBefore })
    await waitFor(() => expect(result.current.undoable).toBeNull(), { timeout: 2000 })
  })

  test("Undo pressed after that instant (a late tap on a busy page) does not pretend: it says too late, and the delete still goes", async () => {
    const deletes = fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(ID, 400, drawn))
    const realNow = Date.now.bind(Date)
    // the tap lands just after the Undo time, before any timer has run
    vi.spyOn(Date, "now").mockImplementation(() => realNow() + 401)
    let undone = true
    act(() => void (undone = result.current.undoRemove(ID)))
    vi.restoreAllMocks()
    expect(undone).toBe(false)
    expect(readAuditQueue(browserStore(), OWNER).deletes.map((d) => d.id)).toEqual([ID])
    await waitFor(() => expect(deletes).toHaveLength(1), { timeout: 2000 })
  })

  test("Undo inside the time takes it back, and nothing is sent", async () => {
    const deletes = fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(ID, 400, drawn))
    let undone = false
    act(() => void (undone = result.current.undoRemove(ID)))
    expect(undone).toBe(true)
    expect(result.current.undoable).toBeNull()
    await new Promise((r) => setTimeout(r, 700))
    expect(deletes).toHaveLength(0)
  })
})

describe("a reload inside the Undo time (p9-deletes-03)", () => {
  test("still offers Undo for the rest of the time, and Undo then keeps the answer", async () => {
    const deletes = fakeServer()
    const now = Date.now()
    writeAuditQueue(browserStore(), enqueueDelete(emptyAuditQueue(OWNER), ID, new Date(now).toISOString(), new Date(now + 500).toISOString(), drawn))
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    expect(result.current.undoable).toMatchObject({ id: ID, activity: "Walk" })
    let undone = false
    act(() => void (undone = result.current.undoRemove(ID)))
    expect(undone).toBe(true)
    await new Promise((r) => setTimeout(r, 800))
    expect(deletes).toHaveLength(0)
    expect(result.current.slots.map((s) => s.activity)).toEqual(["Walk"])
  })
})
