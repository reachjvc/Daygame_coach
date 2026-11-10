// @vitest-environment jsdom
/**
 * A LOG OUT'S CLAIM ON A DELETE NEVER STICKS (code review of p10-deletes-04).
 *
 * Log Out claims a delete still inside its Undo time, so an Undo after the
 * claim says "Too late". Its release (nothing was sent: no signal, then "Stay
 * signed in") was undone by the audit tab: that tab still held the claimed
 * copy, merged it back over the release and wrote it, so Undo inside its time
 * said "Too late" and the delete was sent. A Log Out tab closed mid-claim left
 * the same claim forever. Now the release is a timestamped mark merging keeps,
 * and a claim counts only for CLAIM_HOLD_MS (Log Out stops sending by then).
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { AUDIT_QUEUE_KEY, CLAIM_HOLD_MS, claimDeletes, enqueueDelete, claimHolds, mergeAuditQueues, readAuditQueue, writeAuditQueue, writeAuditViewCopy } from "@/src/audit/auditQueue"
import type { AuditView } from "@/src/audit/auditClient"
import { useAudit } from "@/src/audit/hooks/useAudit"
import { sendWaitingAudit } from "@/src/audit/sendWaitingAudit"
import type { AnswerMark, AuditRun, AuditSlot } from "@/src/audit/types"

const OWNER = "user-1"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const X = "00000000-0000-4000-8000-0000000000a1"
const run = { id: RUN_ID, startedAt: "2026-11-09T12:00:00.000Z", endsAt: "2026-11-23T12:00:00.000Z", endedAt: null } as unknown as AuditRun
const slotX: AuditSlot = { id: X, runId: RUN_ID, slotAt: "2026-11-09T15:30:00.000Z", activity: "Walk", energy: 5, growth: 5, avoiding: false, why: null, source: "app", timeEntryId: null }
const view = { run, runs: [run], slots: [slotX], timeEntries: [], suggestions: [], timezone: "Europe/Copenhagen", now: "2026-11-09T16:00:00.000Z" } as unknown as AuditView
const markX: AnswerMark = { id: X, activity: "Walk", energy: 5, growth: 5, why: null }

let online = true
const deletes: string[] = []

beforeEach(() => {
  online = true
  deletes.length = 0
  window.localStorage.clear()
  writeAuditViewCopy(window.localStorage, OWNER, view)
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (!online) throw new TypeError("Failed to fetch")
      if (init?.method === "DELETE") {
        deletes.push(url)
        return new Response(JSON.stringify({ ok: true, deleted: true }), { status: 200 })
      }
      return new Response(JSON.stringify(view), { status: 200 })
    }),
  )
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

async function deletedInTheAuditTab(holdMs: number) {
  const tab = renderHook(() => useAudit(OWNER))
  await waitFor(() => expect(tab.result.current.view).not.toBeNull())
  act(() => tab.result.current.remove(X, holdMs, { ...markX, slotAt: slotX.slotAt }))
  return tab
}

/** What another tab writes reaches this one as a storage event, as in a browser. */
function writesFromAnotherTab() {
  const setItem = Storage.prototype.setItem
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
    const oldValue = this.getItem(key)
    setItem.call(this, key, value)
    if (key === AUDIT_QUEUE_KEY) window.dispatchEvent(new StorageEvent("storage", { key, oldValue, newValue: value, storageArea: this }))
  })
}

describe("a Log Out claim", () => {
  test("a tab's old claimed copy merged with the release is released", () => {
    const queued = readAuditQueue(null, OWNER)
    const withDelete = { ...queued, deletes: [{ id: X, at: "2026-11-09T16:00:00.000Z", notBefore: "2026-11-09T16:00:06.000Z" }] }
    const now = Date.now()
    const claimedCopy = claimDeletes(withDelete, [X], now)
    const released = claimDeletes(claimedCopy, [X], null, now + 50)
    for (const merged of [mergeAuditQueues(claimedCopy, released), mergeAuditQueues(released, claimedCopy)]) {
      expect(claimHolds(merged.deletes[0], now + 60), "the release was lost in the merge").toBe(false)
    }
    // a newer claim after the release holds again
    const again = claimDeletes(released, [X], now + 80)
    expect(claimHolds(mergeAuditQueues(claimedCopy, again).deletes[0], now + 90)).toBe(true)
  })

  test("Log Out with no signal, then Stay signed in: Undo in the audit tab still undoes, and nothing is sent", async () => {
    const tab = await deletedInTheAuditTab(6000)
    online = false
    const spy = writesFromAnotherTab()
    const outcome = await act(() => sendWaitingAudit())
    spy.mockRestore()
    expect(outcome.status).toBe("waiting")
    let undone = false
    act(() => void (undone = tab.result.current.undoRemove(X)))
    expect(undone, "Undo said too late after a Log Out that sent nothing").toBe(true)
    online = true
    await act(() => sendWaitingAudit())
    expect(deletes, "the undone delete was sent").toHaveLength(0)
    tab.unmount()
  })

  test("a Log Out tab closed mid-claim: the claim ends by itself", async () => {
    const tab = await deletedInTheAuditTab(60_000)
    const start = Date.now()
    // the closed tab's claim: written, never released
    writeAuditQueue(window.localStorage, claimDeletes(readAuditQueue(window.localStorage, OWNER), [X], start))
    let undone = true
    act(() => void (undone = tab.result.current.undoRemove(X)))
    expect(undone, "inside the claim, Undo is too late").toBe(false)
    vi.spyOn(Date, "now").mockReturnValue(start + CLAIM_HOLD_MS + 1)
    act(() => void (undone = tab.result.current.undoRemove(X)))
    expect(undone, "the closed tab's claim stuck").toBe(true)
    tab.unmount()
  })

  test("a claimed send still on its way when the claim ends is given up, not left to land", async () => {
    vi.useFakeTimers()
    try {
      const now = Date.now()
      writeAuditQueue(window.localStorage, enqueueDelete(readAuditQueue(window.localStorage, OWNER), X, new Date(now).toISOString(), new Date(now + 60_000).toISOString(), { ...markX, slotAt: slotX.slotAt }))
      let aborted = false
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url: string, init?: RequestInit) =>
            new Promise((_ok, fail) => init?.signal?.addEventListener("abort", () => ((aborted = true), fail(new DOMException("aborted", "AbortError"))))),
        ),
      )
      const leaving = sendWaitingAudit()
      await vi.advanceTimersByTimeAsync(CLAIM_HOLD_MS)
      const outcome = await leaving
      expect(aborted, "the send outlived its claim").toBe(true)
      expect(outcome.status).toBe("waiting")
      expect(outcome.undoSent).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
