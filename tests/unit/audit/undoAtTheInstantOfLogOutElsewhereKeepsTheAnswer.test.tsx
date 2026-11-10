// @vitest-environment jsdom
/**
 * UNDO IN ONE TAB AT THE INSTANT OF LOG OUT IN ANOTHER: UNDONE MEANS KEPT
 * (alpha p10-deletes-04).
 *
 * Tab 1 deleted an answer; inside its Undo time he tapped Undo there while Log
 * Out ran in tab 2. Log Out had read the queue just before tab 1's Undo was
 * written, sent the delete, and tab 1's bar closed as undone: the answer was
 * gone (Safari, 3 of 5). Now Log Out claims such a delete in the stored queue
 * and waits a moment before sending it: an Undo written in that moment keeps
 * the answer, and an Undo after the claim says it is too late.
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { cancelDelete, markRemoved, readAuditQueue, writeAuditQueue, writeAuditViewCopy } from "@/src/audit/auditQueue"
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

function server() {
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

beforeEach(() => {
  window.localStorage.clear()
  writeAuditViewCopy(window.localStorage, OWNER, view)
})
afterEach(() => {
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

async function deletedInTabOne() {
  const deletes = server()
  const tabOne = renderHook(() => useAudit(OWNER))
  await waitFor(() => expect(tabOne.result.current.view).not.toBeNull())
  act(() => tabOne.result.current.remove(X, 6000, { ...markX, slotAt: slotX.slotAt }))
  return { deletes, tabOne }
}

describe("Undo in tab 1 while Log Out in tab 2 sends what waits", () => {
  test("an Undo written just after Log Out read the queue keeps the answer: the delete is not sent", async () => {
    const { deletes, tabOne } = await deletedInTabOne()
    // tab 1 read the queue before Log Out's claim ...
    const tabOnesRead = readAuditQueue(window.localStorage, OWNER)
    const leaving = sendWaitingAudit()
    // ... and its Undo is written after it
    writeAuditQueue(window.localStorage, markRemoved(tabOnesRead, cancelDelete(tabOnesRead, X)))
    const outcome = await leaving
    expect(deletes, "the answer he undid was deleted").toHaveLength(0)
    expect(outcome.undoSent).toBe(0)
    tabOne.unmount()
  })

  test("an Undo after Log Out claimed the delete says too late, and the delete goes as the dialog says", async () => {
    const { deletes, tabOne } = await deletedInTabOne()
    const leaving = sendWaitingAudit()
    let undone = true
    act(() => void (undone = tabOne.result.current.undoRemove(X)))
    expect(undone, "the bar closed as undone, then the answer was deleted").toBe(false)
    const outcome = await leaving
    expect(deletes).toHaveLength(1)
    expect(outcome.undoSent).toBe(1)
    tabOne.unmount()
  })

  test("a Log Out that could not send (no signal) leaves the delete undoable", async () => {
    const { tabOne } = await deletedInTabOne()
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    const outcome = await sendWaitingAudit()
    expect(outcome.status).toBe("waiting")
    let undone = false
    act(() => void (undone = tabOne.result.current.undoRemove(X)))
    expect(undone).toBe(true)
    tabOne.unmount()
  })
})
