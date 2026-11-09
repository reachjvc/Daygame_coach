// @vitest-environment jsdom
/**
 * THE AUDIT PAGE ACROSS DEVICES AND SIGNAL — src/audit/hooks/useAudit.ts.
 *
 * Alpha test findings (2026-11-09):
 *  - fast-audit-02: the phone's offline answer lost to the PC's newer one, and
 *    the phone dropped it with no word while its sheet still said "Saved".
 *  - fast-audit-03: an open page never read again, so another device's answer
 *    stayed a grey gap and was answered over blindly.
 *  - fast-audit-04: opened with no signal, the page had nothing to draw and no
 *    way to answer, though answers can wait on the phone.
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import {
  AUDIT_QUEUE_KEY,
  AUDIT_VIEW_KEY,
  emptyAuditQueue,
  enqueueAnswers,
  forgetAuditOnThisDevice,
  writeAuditQueue,
  writeAuditViewCopy,
} from "@/src/audit/auditQueue"
import type { AuditView } from "@/src/audit/auditClient"
import { CHANGED_SINCE } from "@/src/audit/auditService"
import { REREAD_GAP_MS, REREAD_MS, useAudit } from "@/src/audit/hooks/useAudit"
import { forgetStoredPages } from "@/src/shared/offlineCopies"
import type { AuditAnswer, AuditRun, AuditSlot } from "@/src/audit/types"

const OWNER = "user-1"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const SLOT_AT = "2026-11-09T15:30:00.000Z"

const run = { id: RUN_ID, startedAt: "2026-11-09T12:00:00.000Z", endsAt: "2026-11-23T12:00:00.000Z", endedAt: null } as unknown as AuditRun

function viewWith(slots: AuditSlot[]): AuditView {
  return { run, runs: [run], slots, timeEntries: [], suggestions: [], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" }
}

const answer = (activity: string, id = "a1"): AuditAnswer => ({
  id,
  runId: RUN_ID,
  slotAt: SLOT_AT,
  activity,
  energy: 6,
  growth: 7,
  avoiding: false,
  why: null,
  source: "later",
  timeEntryId: null,
  answeredAt: "2026-11-09T15:50:00.000Z",
})

const slot = (activity: string, id: string): AuditSlot => {
  const { answeredAt: _a, ...rest } = answer(activity, id)
  void _a
  return rest
}

/** A server: GET /api/audit answers `server.view`; PUT /api/audit/slots answers `server.save`. */
function fakeServer() {
  const server = {
    view: viewWith([]),
    reads: 0,
    offline: false,
    save: (slots: AuditAnswer[]): { stored: number; refused: { id: string; error: string; retry: boolean }[] } => ({ stored: slots.length, refused: [] }),
  }
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (server.offline) throw new TypeError("Failed to fetch")
      if (url.startsWith("/api/audit/slots") && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { slots: AuditAnswer[] }
        return new Response(JSON.stringify(server.save(body.slots)), { status: 200 })
      }
      if (url.startsWith("/api/audit")) {
        server.reads += 1
        return new Response(JSON.stringify(server.view), { status: 200 })
      }
      return new Response("{}", { status: 404 })
    }),
  )
  return server
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

describe("an answer the server did not keep (fast-audit-02)", () => {
  test("is named, not dropped in silence", async () => {
    const server = fakeServer()
    server.save = (slots) => ({ stored: 0, refused: slots.map((s) => ({ id: s.id, error: CHANGED_SINCE, retry: false })) })
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())

    server.view = viewWith([slot("Email", "pc-1")])
    act(() => result.current.answer([answer("Daygame sets")]))

    await waitFor(() => expect(result.current.notKept).toHaveLength(1))
    expect(result.current.notKept[0]).toMatchObject({ answer: { activity: "Daygame sets", slotAt: SLOT_AT }, reason: CHANGED_SINCE })
    expect(result.current.waiting).toBe(0)
    // the other device's answer is what is drawn
    await waitFor(() => expect(result.current.slots.map((s) => s.activity)).toEqual(["Email"]))
  })

  test("is no longer named once the quarter is answered again, or once he has seen it", async () => {
    const server = fakeServer()
    server.save = (slots) => ({ stored: 0, refused: slots.map((s) => ({ id: s.id, error: CHANGED_SINCE, retry: false })) })
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.answer([answer("Daygame sets")]))
    await waitFor(() => expect(result.current.notKept).toHaveLength(1))

    server.save = (slots) => ({ stored: slots.length, refused: [] })
    act(() => result.current.answer([answer("Daygame sets, again", "pc-1")]))
    expect(result.current.notKept).toHaveLength(0)

    server.save = (slots) => ({ stored: 0, refused: slots.map((s) => ({ id: s.id, error: CHANGED_SINCE, retry: false })) })
    act(() => result.current.answer([answer("Once more", "pc-1")]))
    await waitFor(() => expect(result.current.notKept).toHaveLength(1))
    act(() => result.current.dismissNotKept())
    expect(result.current.notKept).toHaveLength(0)
  })

  test("an answer the server may take later is kept waiting, not named as lost", async () => {
    const server = fakeServer()
    server.save = (slots) => ({ stored: 0, refused: slots.map((s) => ({ id: s.id, error: "Not yet", retry: true })) })
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.answer([answer("Daygame sets")]))
    await waitFor(() => expect(result.current.sendState).toBe("waiting"))
    expect(result.current.notKept).toHaveLength(0)
    expect(result.current.waiting).toBe(1)
  })
})

describe("an open page reads again (fast-audit-03)", () => {
  test("another device's answer shows within one re-read, with no reload", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const server = fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    expect(result.current.slots).toHaveLength(0)

    server.view = viewWith([slot("Email", "pc-1")])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REREAD_MS + 100)
    })
    await waitFor(() => expect(result.current.slots.map((s) => s.activity)).toEqual(["Email"]))
  })

  test("on focus, too", async () => {
    const server = fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    await new Promise((r) => setTimeout(r, REREAD_GAP_MS + 50))
    server.view = viewWith([slot("Email", "pc-1")])
    act(() => void window.dispatchEvent(new Event("focus")))
    await waitFor(() => expect(result.current.slots.map((s) => s.activity)).toEqual(["Email"]))
  })

  test("coming back (focus and visibility together) reads once, not twice", async () => {
    const server = fakeServer()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    await new Promise((r) => setTimeout(r, REREAD_GAP_MS + 50))
    const before = server.reads
    act(() => {
      window.dispatchEvent(new Event("focus"))
      document.dispatchEvent(new Event("visibilitychange"))
    })
    await waitFor(() => expect(server.reads).toBe(before + 1))
    await new Promise((r) => setTimeout(r, 100))
    expect(server.reads).toBe(before + 1)
  })
})

describe("opened with no signal (fast-audit-04)", () => {
  test("draws this phone's last read, so answers can still be given and wait", async () => {
    writeAuditViewCopy(window.localStorage, OWNER, viewWith([slot("Gym", "g-1")]))
    const server = fakeServer()
    server.offline = true
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    expect(result.current.fromCopy).toBe(true)
    expect(result.current.slots.map((s) => s.activity)).toEqual(["Gym"])

    act(() => result.current.answer([answer("Daygame sets", "a2")]))
    // no signal is named as such (prove-audit-01)
    await waitFor(() => expect(result.current.sendState).toBe("offline"))
    expect(window.localStorage.getItem(AUDIT_QUEUE_KEY)).toContain("Daygame sets")
  })

  test("with no copy kept there is still only the error and a retry", async () => {
    const server = fakeServer()
    server.offline = true
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.loadError).not.toBeNull())
    expect(result.current.view).toBeNull()
  })

  test("another account's copy is never drawn", async () => {
    writeAuditViewCopy(window.localStorage, "user-2", viewWith([slot("Their gym", "g-1")]))
    const server = fakeServer()
    server.offline = true
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.loadError).not.toBeNull())
    expect(result.current.view).toBeNull()
  })

  test("a read is kept for next time, and signing out forgets it", async () => {
    const server = fakeServer()
    server.view = viewWith([slot("Gym", "g-1")])
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    expect(window.localStorage.getItem(AUDIT_VIEW_KEY)).toContain("Gym")
    forgetAuditOnThisDevice(window.localStorage)
    expect(window.localStorage.getItem(AUDIT_VIEW_KEY)).toBeNull()
  })

  test("a sign-in forgets the last read (the previous person's day) but keeps answers still waiting", async () => {
    writeAuditViewCopy(window.localStorage, OWNER, viewWith([slot("Gym", "g-1")]))
    writeAuditQueue(window.localStorage, enqueueAnswers(emptyAuditQueue(OWNER), [answer("Daygame sets")]))
    await forgetStoredPages()
    expect(window.localStorage.getItem(AUDIT_VIEW_KEY), "offline /audit would draw the previous person's day").toBeNull()
    expect(window.localStorage.getItem(AUDIT_QUEUE_KEY)).toContain("Daygame sets")
  })
})
