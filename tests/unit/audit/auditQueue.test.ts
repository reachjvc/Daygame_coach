// @vitest-environment jsdom
/**
 * THE AUDIT'S OFFLINE QUEUE — src/audit/auditQueue.ts (Plans/energy-audit.md, D-OFFLINE).
 */
import { describe, expect, it, vi } from "vitest"
import {
  AUDIT_QUEUE_KEY,
  answersSent,
  deletesSent,
  emptyAuditQueue,
  enqueueAnswers,
  enqueueDelete,
  readAuditQueue,
  writeAuditQueue,
} from "@/src/audit/auditQueue"
import type { AuditAnswer } from "@/src/audit/types"

const RUN = "00000000-0000-4000-8000-000000000001"
const a = (id: string, slotAt: string, activity = "Email"): AuditAnswer => ({
  id,
  runId: RUN,
  slotAt,
  activity,
  energy: 3,
  growth: 4,
  avoiding: false,
  why: null,
  source: "app",
  timeEntryId: null,
})

describe("the audit queue", () => {
  it("one quarter holds one waiting answer: a newer one replaces it", () => {
    let q = enqueueAnswers(emptyAuditQueue("me"), [a("1", "2026-11-09T09:00:00.000Z")])
    q = enqueueAnswers(q, [a("2", "2026-11-09T09:00:00.000Z", "Gym")])
    expect(q.answers.map((x) => x.activity)).toEqual(["Gym"])
  })

  it("a delete takes the answer out of the queue and waits for the server", () => {
    let q = enqueueAnswers(emptyAuditQueue("me"), [a("1", "2026-11-09T09:00:00.000Z")])
    q = enqueueDelete(q, "1")
    expect(q.answers).toEqual([])
    expect(q.deletes).toEqual(["1"])
    expect(deletesSent(q, ["1"]).deletes).toEqual([])
  })

  it("sent answers leave the queue", () => {
    const q = enqueueAnswers(emptyAuditQueue("me"), [a("1", "2026-11-09T09:00:00.000Z"), a("2", "2026-11-09T09:15:00.000Z")])
    expect(answersSent(q, ["1"]).answers.map((x) => x.id)).toEqual(["2"])
  })

  it("is one person's: another account's queue is thrown away unread", () => {
    const store = window.localStorage
    writeAuditQueue(store, enqueueAnswers(emptyAuditQueue("me"), [a("1", "2026-11-09T09:00:00.000Z")]))
    expect(readAuditQueue(store, "me").answers).toHaveLength(1)
    expect(readAuditQueue(store, "someone-else").answers).toEqual([])
    expect(store.getItem(AUDIT_QUEUE_KEY)).toBeNull()
  })

  it("is gone after forgetOfflineCopies() (sign-out)", async () => {
    vi.stubGlobal("caches", { keys: async () => [], delete: async () => true })
    writeAuditQueue(window.localStorage, enqueueAnswers(emptyAuditQueue("me"), [a("1", "2026-11-09T09:00:00.000Z")]))
    expect(window.localStorage.getItem(AUDIT_QUEUE_KEY)).not.toBeNull()
    const { forgetOfflineCopies } = await import("@/src/shared/offlineCopies")
    await forgetOfflineCopies()
    expect(window.localStorage.getItem(AUDIT_QUEUE_KEY)).toBeNull()
    vi.unstubAllGlobals()
  })
})
