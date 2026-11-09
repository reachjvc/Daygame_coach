/**
 * WORDING MATCH — src/shared/textMatch.ts (moved from the Thoughts service).
 */
import { describe, expect, it } from "vitest"
import { editDistanceAtMost, matchPhrases, normalizePhrase } from "@/src/shared/textMatch"

interface Item {
  text: string
  week: number
  total: number
}
const item = (text: string, week = 0, total = 0): Item => ({ text, week, total })
const match = (q: string, items: Item[], limit?: number) =>
  matchPhrases(q, items, (i) => i.text, (i) => [i.week, i.total], limit)

describe("normalizePhrase", () => {
  it("folds case, spaces, curly quotes and end punctuation into one key", () => {
    expect(normalizePhrase("I am bad")).toBe("i am bad")
    expect(normalizePhrase("  I   am BAD!! ")).toBe("i am bad")
    expect(normalizePhrase("i am bad.")).toBe("i am bad")
    expect(normalizePhrase("“I’m bad”")).toBe("i'm bad")
  })
  it("keeps punctuation inside, so close wordings stay distinct", () => {
    expect(normalizePhrase("I'm bad")).not.toBe(normalizePhrase("Im bad"))
  })
  it("is empty for punctuation alone", () => {
    expect(normalizePhrase(" ...!? ")).toBe("")
  })
})

describe("editDistanceAtMost", () => {
  it("reports the distance up to the cap and cap + 1 beyond it", () => {
    expect(editDistanceAtMost("kitten", "kitten", 2)).toBe(0)
    expect(editDistanceAtMost("kitten", "kitte", 2)).toBe(1)
    expect(editDistanceAtMost("kitten", "sitting", 2)).toBe(3)
    expect(editDistanceAtMost("abc", "abcdefgh", 2)).toBe(3)
  })
})

describe("matchPhrases", () => {
  const bad = item("I am bad", 14, 40)
  const late = item("I am always late", 3, 5)
  const ugly = item("Nobody likes me", 1, 2)
  const all = [ugly, late, bad]

  it("offers the existing phrase for a near-copy", () => {
    expect(match("im bad", all)[0]).toBe(bad)
  })
  it("matches the start of each word, in order", () => {
    expect(match("i am", all)).toEqual([bad, late])
    expect(match("nob lik", all)).toEqual([ugly])
  })
  it("tolerates a small typo", () => {
    expect(match("i am bda", all)[0]).toBe(bad)
  })
  it("puts an exact match first even when another is more frequent", () => {
    const rare = item("I am", 0, 1)
    expect(match("I am", [...all, rare])[0]).toBe(rare)
  })
  it("matches nothing for an empty query or an unrelated one", () => {
    expect(match("   ", all)).toEqual([])
    expect(match("the weather is nice today", all)).toEqual([])
  })
  it("respects the limit", () => {
    expect(match("i am", all, 1)).toEqual([bad])
  })
})
