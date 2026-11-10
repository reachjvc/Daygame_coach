// @vitest-environment jsdom
/**
 * TWO TABS SHARE ONE STORED QUEUE; NEITHER WRITES THE OTHER'S CHANGE AWAY
 * (alpha p9-deletes-02).
 *
 * Undo in tab 1 at the same instant tab 2 saved another answer: tab 2 wrote
 * its older copy of the queue (still holding the delete) before tab 1's write
 * reached it, tab 1 took that copy back, and its timer sent the delete he had
 * undone. The same older copy dropped an answer waiting in tab 1. Now every
 * write merges with what is stored, and what a tab took out of the queue (sent,
 * undone, replaced) is remembered there, so an older copy cannot bring it back.
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
  writeAuditViewCopy,
} from "@/src/audit/auditQueue"
import type { AuditView } from "@/src/audit/auditClient"
import { useAudit } from "@/src/audit/hooks/useAudit"
import type { AnswerMark, AuditAnswer, AuditRun, AuditSlot } from "@/src/audit/types"

const OWNER = "user-1"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const X = "00000000-0000-4000-8000-0000000000a1"
const run = { id: RUN_ID, startedAt: "2026-11-09T12:00:00.000Z", endsAt: "2026-11-23T12:00:00.000Z", endedAt: null } as unknown as AuditRun
const slotX: AuditSlot = { id: X, runId: RUN_ID, slotAt: "2026-11-09T15:30:00.000Z", activity: "Walk", energy: 5, growth: 5, avoiding: false, why: null, source: "app", timeEntryId: null }
const view: AuditView = { run, runs: [run], slots: [slotX], timeEntries: [], suggestions: [], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" }
const markX: AnswerMark = { id: X, activity: "Walk", energy: 5, growth: 5, why: null }
const answer = (n: number, activity: string): AuditAnswer => ({
  ...slotX,
  id: `00000000-0000-4000-8000-0000000000b${n}`,
  slotAt: `2026-11-09T1${n}:00:00.000Z`,
  activity,
  answeredAt: "2026-11-09T15:50:00.000Z",
  was: null,
})

function server(offline = false) {
  const deletes: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (offline) throw new TypeError("Failed to fetch")
      if (init?.method === "DELETE") {
        deletes.push(url)
        return new Response(JSON.stringify({ ok: true, deleted: true }), { status: 200 })
      }
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { slots: unknown[] }
        return new Response(JSON.stringify({ stored: body.slots.length, refused: [] }), { status: 200 })
      }
      return new Response(JSON.stringify(view), { status: 200 })
    }),
  )
  return deletes
}

/** Tab 2's write landing after tab 1's: its own older copy of the queue, plus its change. */
function otherTabWrites(raw: string | null, change: (q: { answers: AuditAnswer[] }) => void) {
  const q = JSON.parse(raw ?? JSON.stringify({ owner: OWNER, answers: [], deletes: [] })) as { answers: AuditAnswer[] }
  change(q)
  const next = JSON.stringify(q)
  window.localStorage.setItem(AUDIT_QUEUE_KEY, next)
  act(() => void window.dispatchEvent(new StorageEvent("storage", { key: AUDIT_QUEUE_KEY, newValue: next })))
}

beforeEach(() => {
  window.localStorage.clear()
  writeAuditViewCopy(window.localStorage, OWNER, view)
})
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("two tabs write the stored queue at the same instant", () => {
  test("Undo in one tab while the other saves an answer: the undone delete is never sent, and the other tab's answer stays", async () => {
    const deletes = server()
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    act(() => result.current.remove(X, 300, { ...markX, slotAt: slotX.slotAt }))
    const tabTwosCopy = window.localStorage.getItem(AUDIT_QUEUE_KEY)
    act(() => result.current.undoRemove(X))
    otherTabWrites(tabTwosCopy, (q) => q.answers.push(answer(1, "Tab two's answer")))
    await new Promise((r) => setTimeout(r, 800))
    expect(deletes, "the delete he undid was sent").toHaveLength(0)
    expect(result.current.slots.map((s) => s.activity)).toContain("Walk")
  })

  test("an older copy written by the other tab does not drop an answer waiting in this one", async () => {
    server(true)
    const { result } = renderHook(() => useAudit(OWNER))
    await waitFor(() => expect(result.current.view).not.toBeNull())
    const tabTwosCopy = window.localStorage.getItem(AUDIT_QUEUE_KEY)
    act(() => result.current.answer([answer(2, "Tab one's answer")]))
    otherTabWrites(tabTwosCopy, (q) => q.answers.push(answer(3, "Tab two's answer")))
    const stored = readAuditQueue(window.localStorage, OWNER).answers.map((a) => a.activity)
    expect(stored).toEqual(expect.arrayContaining(["Tab one's answer", "Tab two's answer"]))
    expect(result.current.slots.map((s) => s.activity)).toEqual(expect.arrayContaining(["Tab one's answer", "Tab two's answer"]))
  })

  test("the tab holding the older copy takes the Undo from the other tab's write, not its own", () => {
    const now = Date.now()
    const deleted = enqueueDelete(emptyAuditQueue(OWNER), X, new Date(now).toISOString(), new Date(now + 6000).toISOString(), { ...markX, slotAt: slotX.slotAt })
    const undone = markRemoved(deleted, cancelDelete(deleted, X), now + 1000)
    const tabTwo = enqueueAnswers(deleted, [answer(4, "Tab two's answer")])
    const merged = mergeAuditQueues(tabTwo, undone)
    expect(merged.deletes).toHaveLength(0)
    expect(merged.answers.map((a) => a.activity)).toEqual(["Tab two's answer"])
  })
})
