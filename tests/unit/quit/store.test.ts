import { describe, expect, it } from "vitest"
import { createQuitStore, QUIT_STORE_KEY, type StorageLike } from "@/src/quit/store"

function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
}

const throwing: StorageLike = {
  getItem() {
    throw new Error("blocked")
  },
  setItem() {
    throw new Error("blocked")
  },
}

describe("quit store", () => {
  it("saves under quit-v1 as {addiction: {tool: value}}", () => {
    const s = memoryStorage()
    const store = createQuitStore(() => s)
    store.set("nicotine", "beliefs", { a: 1 })
    expect(JSON.parse(s.data[QUIT_STORE_KEY])).toEqual({ nicotine: { beliefs: { a: 1 } } })
    expect(store.get("nicotine", "beliefs")).toEqual({ a: 1 })
    expect(store.get("weed", "beliefs")).toBeUndefined()
  })

  it("clear removes one tool and keeps the others", () => {
    const store = createQuitStore(() => memoryStorage())
    store.set("nicotine", "beliefs", 1)
    store.set("nicotine", "gives", 2)
    store.clear("nicotine", "beliefs")
    expect(store.get("nicotine", "beliefs")).toBeUndefined()
    expect(store.get("nicotine", "gives")).toBe(2)
  })

  it("works from memory when storage throws", () => {
    const store = createQuitStore(() => throwing)
    store.set("nicotine", "past", [1, 2])
    expect(store.get("nicotine", "past")).toEqual([1, 2])
    store.clear("nicotine", "past")
    expect(store.get("nicotine", "past")).toBeUndefined()
  })

  it("works when the storage getter itself throws or there is no storage", () => {
    const none = createQuitStore(() => null)
    none.set("weed", "cost", 5)
    expect(none.get("weed", "cost")).toBe(5)
    const bad = createQuitStore(() => {
      throw new Error("denied")
    })
    bad.set("weed", "cost", 6)
    expect(bad.get("weed", "cost")).toBe(6)
  })

  it("ignores garbage in storage", () => {
    const s = memoryStorage()
    s.data[QUIT_STORE_KEY] = "{not json"
    const store = createQuitStore(() => s)
    expect(store.get("nicotine", "beliefs")).toBeUndefined()
    store.set("nicotine", "beliefs", 1)
    expect(store.get("nicotine", "beliefs")).toBe(1)
  })
})
