// @vitest-environment jsdom
/**
 * AN UNDONE DELETE NEVER COMES BACK FROM A TAB FROZEN FOR HOURS (code review
 * of auditQueue.ts:341).
 *
 * Tab 1 deletes an answer, and the phone puts it in the background (frozen:
 * no timers, no storage events). Tab 2 undoes the delete. The mark that kept
 * tab 1's old copy from bringing it back lasted one hour; tab 1, woken later,
 * merged its copy back and its timer sent the delete he had undone.
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import {
  AUDIT_QUEUE_KEY,
  cancelDelete,
  emptyAuditQueue,
  enqueueAnswers,
  enqueueDelete,
  markRemoved,
  mergeAuditQueues,
  readAuditQueue,
  writeAuditQueue,
  writeAuditViewCopy,
} from "@/src/audit/auditQueue"
import type { AuditView } from "@/src/audit/auditClient"
import { useAudit } from "@/src/audit/hooks/useAudit"
import type { AnswerMark, AuditAnswer, AuditRun, AuditSlot } from "@/src/audit/types"

const OWNER = "user-1"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const X = "00000000-0000-4000-8000-0000000000a1"
const HOUR = 60 * 60_000
const run = { id: RUN_ID, startedAt: "2026-11-09T12:00:00.000Z", endsAt: "2026-11-23T12:00:00.000Z", endedAt: null } as unknown as AuditRun
const slotX: AuditSlot = { id: X, runId: RUN_ID, slotAt: "2026-11-09T15:30:00.000Z", activity: "Walk", energy: 5, growth: 5, avoiding: false, why: null, source: "app", timeEntryId: null }
const view = { run, runs: [run], slots: [slotX], timeEntries: [], suggestions: [], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" } as unknown as AuditView
const markX: AnswerMark = { id: X, activity: "Walk", energy: 5, growth: 5, why: null }
const answer = (n: number): AuditAnswer => ({ ...slotX, id: `00000000-0000-4000-8000-0000000000b${n}`, slotAt: `2026-11-09T1${n}:00:00.000Z`, activity: `Answer ${n}`, answeredAt: "2026-11-09T15:50:00.000Z", was: null })

beforeEach(() => {
  window.localStorage.clear()
  writeAuditViewCopy(window.localStorage, OWNER, view)
})
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("a tab frozen while its delete was undone in another tab", () => {
  test("woken three hours later, its old copy does not bring the undone delete back", () => {
    const t0 = Date.parse("2026-11-09T16:00:00.000Z")
    const frozenCopy = enqueueDelete(emptyAuditQueue(OWNER), X, new Date(t0).toISOString(), new Date(t0 + 6000).toISOString(), { ...markX, slotAt: slotX.slotAt })
    const undone = markRemoved(frozenCopy, cancelDelete(frozenCopy, X), t0 + 1000)
    // the other tab keeps writing for hours (an answer given, then sent)
    const later = markRemoved(undone, enqueueAnswers(undone, [answer(1)]), t0 + 3 * HOUR)
    const merged = mergeAuditQueues(later, frozenCopy)
    expect(merged.deletes).toHaveLength(0)
  })

  test("the undone delete's mark is still kept on the audit's last day", () => {
    const t0 = Date.parse("2026-11-09T16:00:00.000Z")
    const frozenCopy = enqueueDelete(emptyAuditQueue(OWNER), X, new Date(t0).toISOString(), new Date(t0 + 6000).toISOString())
    const undone = markRemoved(frozenCopy, cancelDelete(frozenCopy, X), t0 + 1000)
    const later = markRemoved(undone, enqueueAnswers(undone, [answer(1)]), t0 + 13 * 24 * HOUR)
    expect(mergeAuditQueues(later, frozenCopy).deletes).toHaveLength(0)
  })

  test("the marks kept stay bounded in number", () => {
    let q = emptyAuditQueue(OWNER)
    const t0 = Date.parse("2026-11-09T16:00:00.000Z")
    for (let i = 0; i < 3000; i++) {
      const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`
      const d = enqueueDelete(q, id, new Date(t0 + i).toISOString(), new Date(t0 + i + 6000).toISOString())
      q = markRemoved(d, cancelDelete(d, id), t0 + i)
    }
    expect((q.marks ?? []).length).toBeLessThanOrEqual(1000)
  })

  test("its own timer, once woken, reads the stored queue before sending: the undone delete is not sent", async () => {
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
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(X, 300, { ...markX, slotAt: slotX.slotAt }))
    // the other tab's Undo, written while this tab was frozen: no storage event reaches it
    const stored = readAuditQueue(window.localStorage, OWNER)
    writeAuditQueue(window.localStorage, markRemoved(stored, cancelDelete(stored, X)))
    expect(window.localStorage.getItem(AUDIT_QUEUE_KEY)).not.toBeNull()
    await act(async () => void (await new Promise((r) => setTimeout(r, 800))))
    expect(deletes, "the delete he undid in the other tab was sent").toHaveLength(0)
  })
})
