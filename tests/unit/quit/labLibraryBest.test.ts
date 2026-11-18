import { describe, expect, it } from "vitest"
import { getAddiction } from "@/src/quit/data"
import { LAB } from "@/src/quit/lab/registry"
import { allItems, buildItems, parseMarks, readMinutes, savedItems, searchItems, sortByEvidence, toggleMark, wordCount, type LibItem } from "@/src/quit/lab/library/best/logic"
import { bestText } from "@/src/quit/lab/library/best/text"

const item = (id: string, words: number, extra: Partial<LibItem> = {}): LibItem => ({ id, section: "helps", title: "t", text: Array(words).fill("w").join(" "), refs: [], ...extra })

describe("registry", () => {
  it("registers best as the improved variant", () => {
    expect(LAB.library.variants.best.kind).toBe("best")
    expect(LAB.library.variants.best.label).toBe("Improved")
    expect(LAB.library.variants.best.addiction).toBe("nicotine")
  })
  it("has no cheering or exclamation marks", () => {
    expect(JSON.stringify(bestText)).not.toContain("!")
  })
})

describe("evidence sorting", () => {
  it("puts strong first, then moderate, weak, none; stable inside a rank", () => {
    const out = sortByEvidence([
      { id: "a", evidence: "weak" as const },
      { id: "b", evidence: "strong" as const },
      { id: "c", evidence: "none" as const },
      { id: "d", evidence: "moderate" as const },
      { id: "e", evidence: "strong" as const },
    ])
    expect(out.map((x) => x.id)).toEqual(["b", "e", "d", "a", "c"])
  })
})

describe("read time", () => {
  it("counts words", () => {
    expect(wordCount("  a b\n c ")).toBe(3)
  })
  it("rounds words / 200 up, minimum 1", () => {
    expect(readMinutes(item("a", 5))).toBe(1)
    expect(readMinutes(item("a", 199))).toBe(1)
    expect(readMinutes(item("a", 200))).toBe(2)
    expect(readMinutes(item("a", 399))).toBe(2)
    expect(readMinutes(item("a", 401))).toBe(3)
  })
  it("says it plainly", () => {
    expect(bestText.readTime(2)).toBe("about 2 min read")
  })
})

describe("search", () => {
  const items = [item("1", 0, { title: "Walk", text: "A short walk helps" }), item("2", 0, { title: "Gum", text: "Chew gum", need: "Reward" })]
  it("matches words in title or text, case-insensitive", () => {
    expect(searchItems(items, "WALK").map((i) => i.id)).toEqual(["1"])
    expect(searchItems(items, "reward").map((i) => i.id)).toEqual(["2"])
  })
  it("needs every word; empty matches nothing", () => {
    expect(searchItems(items, "short gum")).toEqual([])
    expect(searchItems(items, "  ")).toEqual([])
  })
})

describe("saved and read marks", () => {
  it("toggles", () => {
    expect(toggleMark([], "a")).toEqual(["a"])
    expect(toggleMark(["a", "b"], "a")).toEqual(["b"])
  })
  it("trusts nothing from storage", () => {
    expect(parseMarks([1, "a", "a", null])).toEqual(["a"])
    expect(parseMarks("x")).toEqual([])
  })
  it("lists saved items in saved order, dropping stale ids", () => {
    const items = [item("1", 1), item("2", 1)]
    expect(savedItems(items, ["2", "gone", "1"]).map((i) => i.id)).toEqual(["2", "1"])
  })
})

describe("built from the data files", () => {
  const nic = getAddiction("nicotine")!
  const built = buildItems(nic)
  it("nicotine fills every section; every fact-like item has sources", () => {
    for (const s of ["helps", "true", "expect", "outside"] as const) expect(built[s]).not.toBeNull()
    for (const i of allItems(built).filter((x) => !x.idea)) expect(i.refs.length).toBeGreaterThan(0)
  })
  it("what helps: sourced swaps strong first, unsourced swaps last as ideas", () => {
    const h = built.helps!
    const firstIdea = h.findIndex((x) => x.idea)
    expect(firstIdea).toBeGreaterThan(0)
    expect(h.slice(firstIdea).every((x) => x.idea)).toBe(true)
    expect(h[0].evidence).toBe("strong")
  })
  it("other addictions have no usable content yet", () => {
    for (const id of ["alcohol", "weed", "porn"] as const) {
      const b = buildItems(getAddiction(id)!)
      expect(allItems(b)).toEqual([])
    }
  })
})
