/**
 * TWO TABS, ONE OFFLINE AUDIT QUEUE: what survives when copies of the queue are
 * merged, and what a delete, a refusal and a claim leave behind. Asserted on the
 * queue the person ends with, not on how it is built.
 */
import { describe, expect, it } from "vitest"
import {
  CLAIM_HOLD_MS,
  QUEUE_MARK_KEEP_MS,
  cancelDelete,
  claimDeletes,
  claimHolds,
  deleteRefused,
  deletesSeeStored,
  deletesSent,
  emptyAuditQueue,
  enqueueAnswers,
  enqueueDelete,
  markRemoved,
  mergeAuditQueues,
  nextDeleteDue,
  readAuditQueue,
  retryDelete,
  sameAuditQueue,
  unsentAuditChanges,
  unsentAuditDeletes,
  writeAuditQueue,
  answersSent,
  type AuditQueue,
} from "@/src/audit/auditQueue"
import type { AuditAnswer } from "@/src/audit/types"

const RUN = "00000000-0000-4000-8000-000000000001"
const answer = (id: string, slotAt: string, activity = "Email", extra: Partial<AuditAnswer> = {}): AuditAnswer => ({
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
  ...extra,
})
const SLOT = "2026-11-19T09:00:00.000Z"
const queue = (answers: AuditAnswer[] = [], deletes: AuditQueue["deletes"] = [], marks?: AuditQueue["marks"]): AuditQueue => ({
  owner: "me",
  answers,
  deletes,
  ...(marks ? { marks } : {}),
})
const memoryStore = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe("merging the queue of another tab", () => {
  it("merging another tab's queue keeps what each holds once, expires old marks, and compares by content", () => {
    { // merging the queue of another tab keeps what each holds, once, with removals, refusals and claims
      { // keeps what each tab holds, once; a thing one tab sent is not brought back by the other
        const a = answer("a1", SLOT)
        const b = answer("b1", "2026-11-19T09:15:00.000Z")
        const both = mergeAuditQueues(queue([a]), queue([a, b]))
        expect(both.answers).toEqual([a, b])

        const sent = markRemoved(queue([a, b]), queue([b]), 1_000)
        const merged = mergeAuditQueues(sent, queue([a, b]))
        expect(merged.answers).toEqual([b])
        expect(merged.marks).toEqual(expect.arrayContaining([expect.objectContaining({ gone: true, at: 1_000 })]))
      }
      { // a delete refused in one tab stays refused; a claim by Log Out is never lost, newest claim and release win
        const d = { id: "x", at: "2026-11-19T09:00:00.000Z" }
        const refused = { ...d, refused: { reason: "changed" } }
        expect(mergeAuditQueues(queue([], [d]), queue([], [refused])).deletes[0].refused).toEqual({ reason: "changed" })
        expect(mergeAuditQueues(queue([], [refused]), queue([], [d])).deletes[0].refused).toEqual({ reason: "changed" })

        const merged = mergeAuditQueues(queue([], [{ ...d, claimed: 100, released: 150 }]), queue([], [{ ...d, claimed: 300 }])).deletes[0]
        expect(merged).toMatchObject({ claimed: 300, released: 150 })
        expect(mergeAuditQueues(queue([], [d]), queue([], [d])).deletes[0]).not.toHaveProperty("claimed")
        expect(mergeAuditQueues(queue([], [d]), queue([], [{ id: "y", at: d.at }])).deletes.map((x) => x.id)).toEqual(["x", "y"])
      }
      { // a put-back after a removal wins when it is newer, and the removal wins a tie
        const a = answer("a1", SLOT)
        const removed = markRemoved(queue([a]), queue([]), 1_000)
        const back = markRemoved(removed, queue([a], [], removed.marks), 2_000)
        expect(mergeAuditQueues(back, removed).answers).toEqual([a])
        expect(mergeAuditQueues(removed, back).answers).toEqual([a])

        const key = removed.marks![0].key
        const tie = queue([a], [], [{ key, at: 1_000, gone: false }])
        expect(mergeAuditQueues(tie, removed).answers).toEqual([])
      }
    }
    { // marks of removed things expire, and two queues are the same when they hold the same
      { // marks of sent answers are kept for an hour and of deletes for two weeks, newest first, and only when there are any
        const a = answer("a1", SLOT)
        const d = { id: "x", at: "2026-11-19T09:00:00.000Z" }
        const started = markRemoved(queue([a], [d]), queue([]), 10_000_000)
        expect(started.marks).toHaveLength(2)
        expect(markRemoved(started, started, 10_000_000 + QUEUE_MARK_KEEP_MS - 1).marks).toHaveLength(2)
        const later = markRemoved(started, started, 10_000_000 + QUEUE_MARK_KEEP_MS + 1)
        expect(later.marks).toEqual([expect.objectContaining({ key: expect.stringMatching(/^d:/) })])
        expect(markRemoved(queue([a]), queue([a]), 1_000)).not.toHaveProperty("marks")
        const ordered = markRemoved(queue([a, answer("a2", "2026-11-19T09:15:00.000Z")]), queue([]), 5_000)
        expect(ordered.marks!.map((m) => m.at)).toEqual([5_000, 5_000])
      }
      { // two queues are the same when they hold the same, whatever the order
        const a = answer("a1", SLOT)
        const b = answer("b1", "2026-11-19T09:15:00.000Z")
        expect(sameAuditQueue(queue([a, b]), queue([b, a]))).toBe(true)
        expect(sameAuditQueue(queue([a]), queue([a, b]))).toBe(false)
        expect(sameAuditQueue(queue([a]), queue([answer("a1", SLOT, "Gym")]))).toBe(false)
        const d = { id: "x", at: SLOT }
        expect(sameAuditQueue(queue([], [d]), queue([], [{ ...d, refused: { reason: "r" } }]))).toBe(false)
        expect(sameAuditQueue(queue([], [d]), queue([], [{ ...d, claimed: 5 }]))).toBe(false)
        expect(sameAuditQueue(queue([], [{ ...d, claimed: 5 }]), queue([], [{ ...d, claimed: 5, released: 6 }]))).toBe(false)
        expect(sameAuditQueue(queue([a]), queue([a], [], [{ key: "k", at: 1, gone: true }]))).toBe(false)
      }
    }
  })




})

describe("deleting an answer", () => {
  it("deleting an answer remembers what was seen, undoes, retries a refusal, and replaces a pending delete", () => {
    { // remembers what the person saw and what to put back; a second tap on a pending delete changes nothing
      const a = answer("a1", SLOT, "Email", { was: { id: "a1", activity: "Mail", energy: 2, growth: 2, why: null } })
      const first = enqueueDelete(queue([a]), "a1", "2026-11-19T10:00:00.000Z", "2026-11-19T10:00:05.000Z")
      expect(first.answers).toEqual([])
      expect(first.deletes).toEqual([
        { id: "a1", at: "2026-11-19T10:00:00.000Z", notBefore: "2026-11-19T10:00:05.000Z", restore: a, seen: a.was, slotAt: SLOT, runId: RUN },
      ])
      expect(enqueueDelete(first, "a1", "2026-11-19T10:00:03.000Z").deletes).toBe(first.deletes)

      const drawn = enqueueDelete(queue(), "z", "t", undefined, { id: "z", activity: "Walk", energy: 1, growth: 1, why: "x", slotAt: SLOT, runId: RUN })
      expect(drawn.deletes[0]).toEqual({ id: "z", at: "t", seen: { id: "z", activity: "Walk", energy: 1, growth: 1, why: "x" }, slotAt: SLOT, runId: RUN })
      expect(drawn.deletes[0]).not.toHaveProperty("restore")
    }
    { // Undo puts the waiting answer back, unless a newer answer for it was typed meanwhile
      const a = answer("a1", SLOT)
      const deleted = enqueueDelete(queue([a]), "a1", "t", "2999-01-01T00:00:00.000Z")
      expect(cancelDelete(deleted, "a1")).toMatchObject({ answers: [a], deletes: [] })
      const typed = answer("a1", SLOT, "Gym")
      expect(cancelDelete({ ...deleted, answers: [typed] }, "a1").answers).toEqual([typed])
      expect(cancelDelete(deleted, "nope")).toBe(deleted)
    }
    { // a refused delete is retried as a new delete over what the person sees now, and a new answer for the same row cancels its pending delete
      const stored = { id: "a1", activity: "Gym", energy: 5, growth: 5, why: null }
      const refused = deleteRefused(queue([], [{ id: "a1", at: "old", notBefore: "n", restore: answer("a1", SLOT) }]), "a1", "changed", stored)
      expect(refused.deletes[0].refused).toEqual({ reason: "changed", stored })
      expect(unsentAuditChanges(memoryStore())).toBe(0)
      expect(nextDeleteDue(refused, 0)).toBeNull()

      const retried = retryDelete(refused, "a1").deletes[0]
      expect(retried.refused).toBeUndefined()
      expect(retried).not.toHaveProperty("notBefore")
      expect(retried).not.toHaveProperty("restore")
      expect(retried.seen).toEqual(stored)
      expect(retried.at).not.toBe("old")
      expect(retryDelete(queue([], [{ id: "a1", at: "old" }]), "a1").deletes[0].at).toBe("old")

      const again = enqueueDelete(refused, "a1", "newer")
      expect(again.deletes).toHaveLength(1)
      expect(again.deletes[0]).toMatchObject({ at: "newer" })
      expect(again.deletes[0].refused).toBeUndefined()

      expect(enqueueAnswers(queue([], [{ id: "a1", at: "t" }]), [answer("a1", SLOT)]).deletes).toEqual([])
    }
  })



  it("a delete waits for its Undo time, learns what is stored, and is held by a Log Out claim", () => {
    { // a delete waits for its Undo time; the next wake-up is the soonest of the waiting ones; stored answers update what a delete saw
      const soon = { id: "a", at: "t", notBefore: "2026-11-19T10:00:05.000Z" }
      const later = { id: "b", at: "t", notBefore: "2026-11-19T10:00:09.000Z" }
      const over = { id: "c", at: "t", notBefore: "2026-11-19T09:00:00.000Z" }
      const q = queue([], [later, soon, over, { id: "d", at: "t" }])
      expect(nextDeleteDue(q, Date.parse("2026-11-19T10:00:00.000Z"))).toBe(Date.parse("2026-11-19T10:00:05.000Z"))
      expect(nextDeleteDue(queue([], [over]), Date.parse("2026-11-19T10:00:00.000Z"))).toBeNull()

      const held = { id: "a", activity: "Gym", energy: 4, growth: 4, why: null, extra: "dropped" }
      const seen = deletesSeeStored(q, [held as never])
      expect(seen.deletes.find((d) => d.id === "a")!.seen).toEqual({ id: "a", activity: "Gym", energy: 4, growth: 4, why: null })
      expect(seen.deletes.find((d) => d.id === "b")).toEqual(later)
      expect(deletesSeeStored(q, [])).toBe(q)
      expect(deletesSent(q, ["a", "b"]).deletes.map((d) => d.id)).toEqual(["c", "d"])
    }
    { // a Log Out claim holds a delete for its send window, until released
      const d = { id: "a", at: "t" }
      const claimed = claimDeletes(queue([], [d, { id: "b", at: "t" }]), ["a"], 1_000).deletes
      expect(claimed[0].claimed).toBe(1_000)
      expect(claimed[1]).not.toHaveProperty("claimed")
      expect(claimHolds(claimed[0], 1_000 + CLAIM_HOLD_MS - 1)).toBe(true)
      expect(claimHolds(claimed[0], 1_000 + CLAIM_HOLD_MS)).toBe(false)
      expect(claimHolds(d, 1_000)).toBe(false)

      const released = claimDeletes(queue([], claimed), ["a"], null, 2_000).deletes[0]
      expect(released.released).toBe(2_000)
      expect(claimHolds(released, 2_001)).toBe(false)
      expect(claimHolds({ ...released, claimed: 3_000 }, 3_001)).toBe(true)
      expect(claimDeletes(queue([], [d]), ["a"], null, 2_000).deletes[0]).toEqual(d)
      expect(claimDeletes(queue([], [{ ...d, claimed: 9_000 }]), ["a"], null, 2_000).deletes[0].released).toBe(9_000)
    }
  })

})

describe("what is saved on this device", () => {
  it("what is saved on this device follows the server and reads back sound rows only", () => {
    { // an answer's `was` follows what the server stored, and a sent answer leaves
      const was = { id: "a1", activity: "Mail", energy: 2, growth: 2, why: null }
      const waiting = answer("a1", SLOT, "Email", { was })
      const stored = answer("a1", SLOT, "Mail!", { was })
      const out = answersSent(queue([waiting, answer("b1", "2026-11-19T09:15:00.000Z")]), [answer("b1", "2026-11-19T09:15:00.000Z")], [stored])
      expect(out.answers).toHaveLength(1)
      expect(out.answers[0].was).toEqual({ id: "a1", activity: "Mail!", energy: 3, growth: 4, why: null })
      expect(answersSent(queue([waiting]), [], [answer("a1", "2026-11-19T10:00:00.000Z", "Other", { was: { ...was, energy: 9 } })]).answers[0].was).toEqual(was)
    }
    { // reads back what was written for this person only, drops junk marks and half-formed deletes, and an empty queue leaves nothing
      const store = memoryStore()
      const a = answer("a1", SLOT)
      writeAuditQueue(store, { ...queue([a], [{ id: "x", at: "t", seen: undefined }]), marks: [{ key: "k", at: 5, gone: false }] })
      expect(readAuditQueue(store, "me").marks).toEqual([{ key: "k", at: 5, gone: false }])
      expect(unsentAuditChanges(store)).toBe(2)
      expect(unsentAuditDeletes(store)).toEqual([{ id: "x", slotAt: null, activity: null }])

      store.setItem(
        "audit-queue-v1",
        JSON.stringify({
          owner: "me",
          answers: [a],
          deletes: ["plain", { id: "ok", at: "t" }, { id: 5, at: "t" }, { id: "no-at" }, null],
          marks: [{ key: "k", at: 5, gone: false }, { key: "k", at: "5", gone: false }, { key: 1, at: 5, gone: false }, { key: "k", at: 5 }, null],
        }),
      )
      const read = readAuditQueue(store, "me")
      expect(read.deletes.map((d) => d.id)).toEqual(["plain", "ok"])
      expect(read.marks).toEqual([{ key: "k", at: 5, gone: false }])

      writeAuditQueue(store, emptyAuditQueue("me"))
      expect(store.getItem("audit-queue-v1")).toBeNull()
      writeAuditQueue(store, { ...emptyAuditQueue("me"), marks: [{ key: "k", at: 5, gone: true }] })
      expect(store.getItem("audit-queue-v1")).not.toBeNull()
    }
  })

})
