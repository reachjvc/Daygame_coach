/**
 * THE GENERIC OFFLINE QUEUE — src/shared/offlineQueue.ts (moved from the
 * Thoughts log queue and its flush loop).
 */
import { describe, expect, it } from "vitest"
import {
  readOwnedJson,
  sendInChunks,
  writeOwnedJson,
  type KeyValueStore,
} from "@/src/shared/offlineQueue"

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe("owned storage", () => {
  it("returns what its owner wrote", () => {
    const store = memory()
    writeOwnedJson(store, "q", "alice", { items: [1, 2] })
    expect(readOwnedJson(store, "q", "alice")).toEqual({ items: [1, 2] })
  })

  it("throws away, unread, what belongs to anyone else", () => {
    const store = memory()
    writeOwnedJson(store, "q", "alice", { items: [1] })
    expect(readOwnedJson(store, "q", "bob")).toBeNull()
    expect(store.data.has("q")).toBe(false)
  })

  it("removes the key when told to write nothing", () => {
    const store = memory()
    writeOwnedJson(store, "q", "alice", { items: [1] })
    writeOwnedJson(store, "q", "alice", null)
    expect(store.data.has("q")).toBe(false)
  })

  it("survives a missing store and corrupt text", () => {
    expect(readOwnedJson(null, "q", "alice")).toBeNull()
    const store = memory()
    store.setItem("q", "{nope")
    expect(readOwnedJson(store, "q", "alice")).toBeNull()
    expect(() => writeOwnedJson(null, "q", "alice", { a: 1 })).not.toThrow()
  })
})

describe("sendInChunks", () => {
  const items = Array.from({ length: 450 }, (_, i) => ({ id: String(i) }))

  it("sends 200 at a time and reports each batch as sent", async () => {
    const sizes: number[] = []
    const sent: number[] = []
    const stuck = await sendInChunks(
      items,
      async (batch) => void sizes.push(batch.length),
      { onSent: (b) => void sent.push(b.length), onDropped: () => {} },
    )
    expect(stuck).toBeNull()
    expect(sizes).toEqual([200, 200, 50])
    expect(sent).toEqual([200, 200, 50])
  })

  it("drops a batch the server refused for good (4xx) and goes on", async () => {
    const dropped: number[] = []
    let call = 0
    const stuck = await sendInChunks(
      items,
      async () => {
        if (call++ === 0) throw Object.assign(new Error("bad"), { status: 400, retryable: false })
      },
      { onSent: () => {}, onDropped: (b) => void dropped.push(b.length) },
    )
    expect(stuck).toBeNull()
    expect(dropped).toEqual([200])
  })

  it("keeps a batch on a 401 and stops, naming why", async () => {
    const dropped: number[] = []
    const stuck = await sendInChunks(
      items,
      async () => {
        throw Object.assign(new Error("signed out"), { status: 401, retryable: false })
      },
      { onSent: () => {}, onDropped: (b) => void dropped.push(b.length) },
    )
    expect(dropped).toEqual([])
    expect(stuck).toEqual({ status: 401, retryable: false })
  })

  it("keeps a batch with no connection and stops", async () => {
    const stuck = await sendInChunks(
      items,
      async () => {
        throw new Error("offline")
      },
      { onSent: () => {}, onDropped: () => {} },
    )
    expect(stuck).toEqual({ status: 0, retryable: true })
  })
})
