/**
 * TAPS KEPT ON THE PHONE UNTIL SENT — src/thoughts/logQueue.ts and the screen
 * arithmetic on top of it, src/thoughts/pending.ts.
 */
import { describe, expect, it } from "vitest"
import {
  QUEUE_KEY,
  VIEW_KEY,
  emptyQueue,
  enqueueLog,
  enqueueThought,
  logsAnswered,
  pendingByThought,
  readQueue,
  readViewCopy,
  saveViewCopy,
  thoughtRefused,
  thoughtStored,
  undoLog,
  undosAnswered,
  writeQueue,
  type KeyValueStore,
  type QueueState,
} from "@/src/thoughts/logQueue"
import { bumpCounts, drawnThoughts, localThought, withPending } from "@/src/thoughts/pending"
import type { LogInput } from "@/src/thoughts/types"

const CPH = "Europe/Copenhagen"
const NOW = new Date("2026-10-30T12:00:00.000Z")
const ME = "me-0000"
const empty: QueueState = emptyQueue(ME)

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const log = (id: string, thoughtId: string | null, at = NOW.toISOString()): LogInput => ({ id, thoughtId, at, source: "tap", promptId: null })

describe("the queue", () => {
  it("survives a reload through storage, and leaves nothing behind when empty", () => {
    const store = memoryStore()
    const q = enqueueLog(enqueueThought(empty, { id: "t1", text: "I am bad" }), log("l1", "t1"))
    writeQueue(store, q)
    expect(readQueue(store, ME)).toEqual(q)

    writeQueue(store, empty)
    expect(store.data.has(QUEUE_KEY)).toBe(false)
  })

  it("reads garbage or nothing as an empty queue", () => {
    const store = memoryStore()
    store.setItem(QUEUE_KEY, "{not json")
    expect(readQueue(store, ME)).toEqual(empty)
    expect(readQueue(null, ME)).toEqual(empty)
  })

  it("holds each log once, however often it is queued", () => {
    const q = enqueueLog(enqueueLog(empty, log("l1", "t1")), log("l1", "t1"))
    expect(q.logs).toHaveLength(1)
  })

  it("moves queued logs to the id the server chose for a new thought", () => {
    const q = enqueueLog(enqueueThought(empty, { id: "local", text: "I am bad" }), log("l1", "local"))
    const after = thoughtStored(q, "local", "existing")
    expect(after.thoughts).toEqual([])
    expect(after.logs[0].thoughtId).toBe("existing")
  })

  it("lets answered and undone logs go, and counts the rest per thought", () => {
    let q = empty
    for (const [id, t] of [["a", "t1"], ["b", "t1"], ["c", "t2"], ["d", null]] as const) q = enqueueLog(q, log(id, t))
    q = undoLog(logsAnswered(q, ["a"]), "c")
    expect(q.logs.map((l) => l.id)).toEqual(["b", "d"])
    expect(pendingByThought(q)).toEqual(new Map([["t1", 1]]))
  })

  it("keeps an undo until the server has answered it, because a timed-out send may have landed", () => {
    let q = enqueueLog(empty, log("a", "t1"))
    q = undoLog(q, "a")
    expect(q).toMatchObject({ logs: [], undos: ["a"] })
    expect(undosAnswered(q, ["a"]).undos).toEqual([])
  })

  it("drops a refused new thought with its taps, and keeps the other taps", () => {
    let q = enqueueThought(empty, { id: "bad", text: "x" })
    q = enqueueLog(enqueueLog(q, log("1", "bad")), log("2", "t1"))
    expect(thoughtRefused(q, "bad")).toMatchObject({ thoughts: [], logs: [{ id: "2" }] })
  })

  it("never hands one person's queue to another, and removes it", () => {
    const store = memoryStore()
    writeQueue(store, enqueueLog(emptyQueue("person-a"), log("a", "t1")))
    expect(readQueue(store, "person-b")).toEqual(emptyQueue("person-b"))
    expect(store.data.has(QUEUE_KEY)).toBe(false)
  })
})

describe("the page's offline copy", () => {
  it("keeps the last read with its time, and reads nothing from garbage", () => {
    const store = memoryStore()
    saveViewCopy(store, { thoughts: [{ id: "t1" }] }, NOW, ME)
    expect(readViewCopy(store, ME)).toEqual({ at: NOW.toISOString(), view: { thoughts: [{ id: "t1" }] } })
    store.setItem(VIEW_KEY, "{broken")
    expect(readViewCopy(store, ME)).toBeNull()
    expect(readViewCopy(null, ME)).toBeNull()
  })

  it("is never shown to another account, and is removed", () => {
    const store = memoryStore()
    saveViewCopy(store, { thoughts: [{ id: "t1" }] }, NOW, "person-a")
    expect(readViewCopy(store, "person-b")).toBeNull()
    expect(store.data.has(VIEW_KEY)).toBe(false)
  })
})

describe("what the screen shows", () => {
  const base = { ...localThought("t1", "I am bad", "2026-10-29T10:00:00.000Z") }

  it("counts a log today, this week, this month and in all", () => {
    const c = bumpCounts(base.counts, NOW.toISOString(), NOW, CPH)
    expect(c).toEqual({ today: 1, week: 1, month: 1, total: 1, firstAt: NOW.toISOString(), lastAt: NOW.toISOString() })
  })

  it("does not count a log from yesterday (in the person's zone) as today", () => {
    // 23:30 CET on the 29th is 22:30Z: yesterday in Copenhagen.
    const c = bumpCounts(base.counts, "2026-10-29T22:30:00.000Z", NOW, CPH)
    expect(c.today).toBe(0)
    expect(c.week).toBe(1)
  })

  it("never counts below zero when undoing", () => {
    expect(bumpCounts(base.counts, NOW.toISOString(), NOW, CPH, -1).total).toBe(0)
  })

  it("lays queued taps and queued thoughts on top of the server's", () => {
    let q = enqueueLog(empty, log("l1", "t1"))
    q = enqueueLog(enqueueThought(q, { id: "t2", text: "  Nobody   likes me " }), log("l2", "t2"))
    const shown = withPending([base], q, NOW, CPH)
    expect(shown.map((t) => [t.text, t.counts.total])).toEqual([
      ["I am bad", 1],
      ["Nobody likes me", 1],
    ])
  })

  it("never draws a tap on top of a read that already names it, nor an undone one", () => {
    const read = { thoughts: [{ ...base, counts: { ...base.counts, total: 1, today: 1 } }], recentLogIds: ["l1"] }
    // l1 is in the read AND still queued (its send's answer has not arrived): once.
    const q = enqueueLog(enqueueLog(empty, log("l1", "t1")), log("l2", "t1"))
    expect(drawnThoughts(read, q, { thoughts: [], logs: [] }, NOW, CPH)[0].counts.total).toBe(2)
    // Confirmed but not yet read: drawn on top.
    expect(drawnThoughts({ ...read, recentLogIds: [] }, empty, { thoughts: [], logs: [log("l3", "t1")] }, NOW, CPH)[0].counts.total).toBe(2)
    // Undone while its removal waits: not drawn.
    expect(drawnThoughts(read, undoLog(q, "l2"), { thoughts: [], logs: [] }, NOW, CPH)[0].counts.total).toBe(1)
  })


})
