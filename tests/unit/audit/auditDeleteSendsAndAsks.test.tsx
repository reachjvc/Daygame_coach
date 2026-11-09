// @vitest-environment jsdom
/**
 * A DELETE IS SENT, AND ONLY OVER WHAT IT SAW — src/audit/hooks/useAudit.ts.
 *
 * Alpha test findings (2026-11-09):
 *  - prove-audit-01: delete, then the page reloads inside the 6 s Undo time.
 *    The Undo timer lived only in memory, so the stored delete was never sent
 *    while the page stayed open, and the page said "sent when you have signal"
 *    though the signal was fine.
 *  - prove-audit-03: an edit on one device and a delete on another at the same
 *    moment sometimes deleted the edit the editor had been told was saved. A
 *    delete now carries what it saw, and the server refuses it when the answer
 *    changed since; the deleting device is told, with Delete anyway / Keep.
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { emptyAuditQueue, enqueueDelete, forgetAuditOnThisDevice, readAuditQueue, writeAuditQueue } from "@/src/audit/auditQueue"
import type { AuditView } from "@/src/audit/auditClient"
import { useAudit } from "@/src/audit/hooks/useAudit"
import { browserStore } from "@/src/shared/offlineQueue"
import type { AnswerMark, AuditRun, AuditSlot } from "@/src/audit/types"

const OWNER = "user-1"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const ID = "00000000-0000-4000-8000-0000000000a1"
const SLOT_AT = "2026-11-09T15:30:00.000Z"
const run = { id: RUN_ID, startedAt: "2026-11-09T12:00:00.000Z", endsAt: "2026-11-23T12:00:00.000Z", endedAt: null } as unknown as AuditRun

const slot = (activity: string): AuditSlot => ({
  id: ID,
  runId: RUN_ID,
  slotAt: SLOT_AT,
  activity,
  energy: 5,
  growth: 5,
  avoiding: false,
  why: null,
  source: "app",
  timeEntryId: null,
})
const viewWith = (slots: AuditSlot[]): AuditView => ({ run, runs: [run], slots, timeEntries: [], suggestions: [], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" })
const mark = (activity: string, why: string | null = null): AnswerMark => ({ id: ID, activity, energy: 5, growth: 5, why })
const seenOf = (body: string) => (JSON.parse(body || "{}") as { seen?: AnswerMark }).seen

function fakeServer() {
  const server = {
    view: viewWith([slot("Gym")]),
    offline: false,
    deletes: [] as string[],
    bodies: [] as string[],
    status: 200,
    onDelete: (): Record<string, unknown> => ({ ok: true, deleted: true }),
    holdPut: null as Promise<void> | null,
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (server.offline) throw new TypeError("Failed to fetch")
      if (init?.method === "DELETE") {
        server.deletes.push(url)
        server.bodies.push(String(init.body ?? ""))
        return new Response(JSON.stringify(server.status === 200 ? server.onDelete() : { error: "Bad earlier answer" }), { status: server.status })
      }
      if (init?.method === "PUT") {
        if (server.holdPut) await server.holdPut
        const body = JSON.parse(String(init.body)) as { slots: unknown[] }
        return new Response(JSON.stringify({ stored: body.slots.length, refused: [] }), { status: 200 })
      }
      if (url.startsWith("/api/audit")) return new Response(JSON.stringify(server.view), { status: 200 })
      return new Response("{}", { status: 404 })
    }),
  )
  return server
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("a delete stored in its Undo time when the page (re)opens (prove-audit-01)", () => {
  test("is sent once its Undo time is over, with the page left open", async () => {
    const server = fakeServer()
    const now = Date.now()
    writeAuditQueue(browserStore(), enqueueDelete(emptyAuditQueue(OWNER), ID, new Date(now).toISOString(), new Date(now + 300).toISOString()))
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    // in its Undo time: not sent, not "waiting for signal"
    expect(server.deletes).toHaveLength(0)
    expect(result.current.waiting).toBe(0)
    await waitFor(() => expect(server.deletes).toHaveLength(1), { timeout: 3000 })
    await waitFor(() => expect(readAuditQueue(browserStore(), OWNER).deletes).toHaveLength(0))
    expect(result.current.waiting).toBe(0)
    expect(result.current.sendState).toBe("sent")
  })

  test("says 'no signal' only when the send failed for want of signal", async () => {
    const server = fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    server.offline = true
    act(() => result.current.remove(ID, 0, mark("Gym")))
    await waitFor(() => expect(result.current.sendState).toBe("offline"))
    expect(result.current.waiting).toBe(1)
  })
})

describe("a delete carries what it saw (prove-audit-03)", () => {
  test("sends what it saw in the body, never in the address (review of 81f325e9: no personal text in a URL)", async () => {
    const server = fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(ID, 0, mark("Gym", "Tired of it")))
    await waitFor(() => expect(server.deletes).toHaveLength(1))
    expect(seenOf(server.bodies[0])).toEqual(mark("Gym", "Tired of it"))
    const url = new URL(server.deletes[0], "http://x")
    expect(url.search).not.toContain("seen")
    expect(decodeURIComponent(server.deletes[0])).not.toContain("Tired")
    expect(decodeURIComponent(server.deletes[0])).not.toContain("Gym")
  })

  test("refused because another device changed the answer: the deleting device is told, and can delete anyway or keep it", async () => {
    const server = fakeServer()
    server.onDelete = () => ({ ok: true, deleted: false, changed: mark("Edited on the PC") })
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    server.view = viewWith([slot("Edited on the PC")])
    act(() => result.current.remove(ID, 0, mark("Gym")))
    await waitFor(() => expect(result.current.notDeleted).toHaveLength(1))
    expect(result.current.notDeleted[0]).toMatchObject({ id: ID, stored: { activity: "Edited on the PC" } })
    // kept until he chooses, and not counted as waiting for signal
    expect(readAuditQueue(browserStore(), OWNER).deletes).toHaveLength(1)
    expect(result.current.waiting).toBe(0)
    // the other device's answer is drawn again
    await waitFor(() => expect(result.current.slots.map((s) => s.activity)).toEqual(["Edited on the PC"]))

    server.onDelete = () => ({ ok: true, deleted: true })
    act(() => result.current.deleteAnyway(result.current.notDeleted[0]))
    expect(result.current.notDeleted).toHaveLength(0)
    await waitFor(() => expect(server.deletes).toHaveLength(2))
    expect(seenOf(server.bodies[1])).toMatchObject({ activity: "Edited on the PC" })
    await waitFor(() => expect(readAuditQueue(browserStore(), OWNER).deletes).toHaveLength(0))
  })

  test("Keep: the other device's answer stays and nothing more is sent", async () => {
    const server = fakeServer()
    server.onDelete = () => ({ ok: true, deleted: false, changed: mark("Edited on the PC") })
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(ID, 0, mark("Gym")))
    await waitFor(() => expect(result.current.notDeleted).toHaveLength(1))
    act(() => result.current.keepNotDeleted(ID))
    expect(result.current.notDeleted).toHaveLength(0)
    expect(readAuditQueue(browserStore(), OWNER).deletes).toHaveLength(0)
    expect(server.deletes).toHaveLength(1)
  })

  test("refused outright (400): named with the server's reason and kept until he chooses (review of 81f325e9)", async () => {
    const server = fakeServer()
    server.status = 400
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(ID, 0, mark("Gym")))
    await waitFor(() => expect(result.current.notDeleted).toHaveLength(1))
    expect(result.current.notDeleted[0]).toMatchObject({ id: ID, reason: "Bad earlier answer" })
    expect(readAuditQueue(browserStore(), OWNER).deletes).toHaveLength(1)
    // the answer is still on the server, so it is drawn
    expect(result.current.slots.map((s) => s.activity)).toEqual(["Gym"])
  })
})

describe("nothing is sent after the page is gone or he logged out (review of 81f325e9)", () => {
  test("a send in flight when the page closes arms no timer after it", async () => {
    const server = fakeServer()
    let release = () => {}
    server.holdPut = new Promise<void>((r) => (release = r))
    const { result, unmount } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    const answer = { ...slot("Other"), id: "00000000-0000-4000-8000-0000000000b2", slotAt: "2026-11-09T15:45:00.000Z", answeredAt: "2026-11-09T15:50:00.000Z", was: null }
    act(() => result.current.answer([answer]))
    act(() => result.current.remove(ID, 200, mark("Gym")))
    unmount()
    release()
    await new Promise((r) => setTimeout(r, 700))
    expect(server.deletes).toHaveLength(0)
  })

  test("forgetting this device's audit (Log Out) stops a delete waiting out its Undo time", async () => {
    const server = fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(ID, 200, mark("Gym")))
    act(() => forgetAuditOnThisDevice())
    await new Promise((r) => setTimeout(r, 700))
    expect(server.deletes).toHaveLength(0)
    expect(readAuditQueue(browserStore(), OWNER).deletes).toHaveLength(0)
  })
})
