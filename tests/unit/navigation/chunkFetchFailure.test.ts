import { describe, expect, it } from "vitest"
import { isChunkFetchFailure } from "@/components/chunkFetchFailure"

describe("what counts as a failed code fetch (Log Out may say 'no signal' only for these)", () => {
  it("accepts webpack's and the browsers' own wording", () => {
    const chunk = new Error("Loading chunk 123 failed.")
    chunk.name = "ChunkLoadError"
    expect(isChunkFetchFailure(chunk)).toBe(true)
    expect(isChunkFetchFailure(new Error("Loading chunk 9 failed. (error: /x.js)"))).toBe(true)
    expect(isChunkFetchFailure(new TypeError("Failed to fetch dynamically imported module: http://x/y.js"))).toBe(true)
    expect(isChunkFetchFailure(new TypeError("error loading dynamically imported module"))).toBe(true)
    expect(isChunkFetchFailure(new TypeError("Importing a module script failed."))).toBe(true)
    expect(isChunkFetchFailure(new TypeError("Failed to fetch"))).toBe(true)
    expect(isChunkFetchFailure(new TypeError("Load failed"))).toBe(true)
  })

  it("rejects a real bug and anything that is not an error", () => {
    expect(isChunkFetchFailure(new TypeError("Cannot read properties of undefined (reading 'kind')"))).toBe(false)
    expect(isChunkFetchFailure(new Error("Log Out exploded"))).toBe(false)
    expect(isChunkFetchFailure(new RangeError("Maximum call stack size exceeded"))).toBe(false)
    expect(isChunkFetchFailure("Failed to fetch")).toBe(false)
    expect(isChunkFetchFailure(null)).toBe(false)
  })
})
