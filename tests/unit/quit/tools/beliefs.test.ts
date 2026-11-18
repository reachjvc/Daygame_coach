import { describe, expect, it } from "vitest"
import { bandFor, firstUnanswered, heldCount, parseHeld, seeThrough, shareUrl, topBeliefs } from "@/src/quit/tools/beliefs/logic"
import { makeValid } from "../fixtures/valid"

const { beliefs, facts, bands } = makeValid()
const ids = beliefs.map((b) => b.id)
const all = (n: number) => Object.fromEntries(ids.map((id) => [id, n]))

describe("beliefs scoring", () => {
  it("all 1s: no top beliefs, everything seen through, band free", () => {
    const r = all(1)
    expect(topBeliefs(r, beliefs)).toEqual([])
    expect(seeThrough(r, beliefs)).toHaveLength(12)
    expect(heldCount(r, beliefs)).toBe(0)
    expect(bandFor(0, bands)?.id).toBe("free")
  })

  it("all 5s: top 3 are the first three in data order, held is 12, band hooked", () => {
    const r = all(5)
    expect(topBeliefs(r, beliefs).map((b) => b.id)).toEqual(["b1", "b2", "b3"])
    expect(seeThrough(r, beliefs)).toEqual([])
    expect(heldCount(r, beliefs)).toBe(12)
    expect(bandFor(12, bands)?.id).toBe("hooked")
  })

  it("sorts by rating, ties by data order, ignores ratings under 3", () => {
    const r = { ...all(1), b2: 3, b5: 5, b7: 4, b9: 4, b11: 2 }
    expect(topBeliefs(r, beliefs).map((b) => b.id)).toEqual(["b5", "b7", "b9"])
    expect(topBeliefs({ ...all(1), b4: 3, b6: 3 }, beliefs).map((b) => b.id)).toEqual(["b4", "b6"])
  })

  it("sees through the 1s and 2s only, in data order", () => {
    expect(seeThrough({ ...all(3), b8: 2, b3: 1 }, beliefs).map((b) => b.id)).toEqual(["b3", "b8"])
  })

  it("counts held as 4 or 5 only", () => {
    expect(heldCount({ ...all(3), b1: 4, b2: 5, b3: 3 }, beliefs)).toBe(2)
  })

  it("ignores junk ratings", () => {
    const r = { b1: 9, b2: 0, b3: 2.5 } as Record<string, number>
    expect(topBeliefs(r, beliefs)).toEqual([])
    expect(seeThrough(r, beliefs)).toEqual([])
  })

  it("finds the band at each edge of the bands", () => {
    for (const band of bands) {
      expect(bandFor(band.min, bands)?.id).toBe(band.id)
      expect(bandFor(band.max, bands)?.id).toBe(band.id)
    }
    expect(bandFor(13, bands)).toBeNull()
  })
})

describe("beliefs progress", () => {
  it("resumes at the first unrated belief, then the first unanswered fact", () => {
    expect(firstUnanswered({ ratings: {}, facts: {} }, beliefs, facts)).toBe(1)
    expect(firstUnanswered({ ratings: { b1: 3, b2: 3, b3: 3, b4: 3, b5: 3, b6: 3 }, facts: {} }, beliefs, facts)).toBe(7)
    expect(firstUnanswered({ ratings: all(3), facts: {} }, beliefs, facts)).toBe(13)
    expect(firstUnanswered({ ratings: all(3), facts: { f1: true } }, beliefs, facts)).toBe(14)
    expect(firstUnanswered({ ratings: all(3), facts: { f1: true, f2: false, f3: true } }, beliefs, facts)).toBe(16)
  })
})

describe("share", () => {
  it("builds the share URL from the origin and the addiction", () => {
    expect(shareUrl("https://example.org", "nicotine")).toBe("https://example.org/quit/nicotine/beliefs")
  })

  it("accepts held 0 to 12 as plain integers only", () => {
    for (const ok of ["0", "1", "9", "10", "12"]) expect(parseHeld(ok)).toBe(Number(ok))
    for (const bad of [null, "", "13", "-1", "1.5", "01", "abc", "1e1", " 3", "99", "100"]) expect(parseHeld(bad)).toBeNull()
  })
})
