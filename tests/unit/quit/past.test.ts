import { describe, expect, it } from "vitest"
import {
  EMPTY_PAST,
  averageDays,
  bars,
  barText,
  dangerWindow,
  emptyTry,
  endingCounts,
  exampleTries,
  hasContent,
  helpedCounts,
  lengthText,
  longestRun,
  monthAllowed,
  monthsBack,
  newestFirst,
  oldestFirst,
  parseLength,
  parsePast,
  typedLength,
  pastEndingsForPlan,
  showsMore,
  topRepeated,
  triesBehind,
  tryDays,
  usesRoughUnits,
  type Try,
} from "@/src/quit/tools/past/logic"
import { pastText } from "@/src/quit/tools/past/text"
import { getAddiction } from "@/src/quit/data"

const mk = (id: string, len: number | null, unit: Try["unit"] = "days", over: Partial<Try> = {}): Try => ({ ...emptyTry(id), len, unit, ...over })
const endings = [
  { id: "stress", label: "A bad day or stress" },
  { id: "offered", label: "Someone offered one" },
]
const helped = [
  { id: "told", label: "Told someone" },
  { id: "busy", label: "Kept busy" },
]

describe("lengths", () => {
  it("counts weeks 7, months 30, years 365 days", () => {
    expect(tryDays(mk("a", 2, "weeks"))).toBe(14)
    expect(tryDays(mk("a", 1.5, "months"))).toBe(45)
    expect(tryDays(mk("a", 2, "years"))).toBe(730)
    expect(tryDays(mk("a", null))).toBeNull()
    expect(usesRoughUnits([mk("a", 3), mk("b", 1, "years")])).toBe(true)
    expect(usesRoughUnits([mk("a", 3)])).toBe(false)
  })
  it("reads 60 days or more as about N months and 730 or more as about N years", () => {
    expect(lengthText(1)).toBe("1 day")
    expect(lengthText(14)).toBe("14 days")
    expect(lengthText(59)).toBe("59 days")
    expect(lengthText(60)).toBe("about 2 months")
    expect(lengthText(100)).toBe("about 3 months")
    expect(lengthText(729)).toBe("about 24 months")
    expect(lengthText(730)).toBe("about 2 years")
    expect(barText(9)).toBe("9")
    expect(barText(90)).toBe("3 mo")
    expect(barText(800)).toBe("2 y")
  })
  it("parses the typed length: comma, 1 to 999, errors", () => {
    expect(parseLength("1,5")).toEqual({ kind: "ok", value: 1.5 })
    expect(parseLength("3")).toEqual({ kind: "ok", value: 3 })
    expect(parseLength("")).toEqual({ kind: "empty" })
    expect(parseLength("abc")).toEqual({ kind: "bad" })
    expect(parseLength("0")).toEqual({ kind: "bad" })
    expect(parseLength("0,5")).toEqual({ kind: "bad" })
    expect(parseLength("1000")).toEqual({ kind: "bad" })
    expect(parseLength("999")).toEqual({ kind: "ok", value: 999 })
  })
})

describe("months", () => {
  it("allows blank or 1960-01 up to this month, never a later one", () => {
    expect(monthAllowed("", "2026-11-19")).toBe(true)
    expect(monthAllowed("2026-11", "2026-11-19")).toBe(true)
    expect(monthAllowed("2026-12", "2026-11-19")).toBe(false)
    expect(monthAllowed("1960-01", "2026-11-19")).toBe(true)
    expect(monthAllowed("1959-12", "2026-11-19")).toBe(false)
    expect(monthAllowed("2026-13", "2026-11-19")).toBe(false)
  })
  it("steps back across a year", () => {
    expect(monthsBack("2026-11-19", 0)).toBe("2026-11")
    expect(monthsBack("2026-02-01", 3)).toBe("2025-11")
    expect(monthsBack("2026-01-31", 13)).toBe("2024-12")
  })
  it("orders oldest first and newest first, undated last in the order added", () => {
    const l = [mk("u1", 1), mk("b", 1, "days", { when: "2025-06" }), mk("u2", 1), mk("a", 1, "days", { when: "2025-02" }), mk("c", 1, "days", { when: "2026-03" })]
    expect(oldestFirst(l).map((x) => x.id)).toEqual(["a", "b", "c", "u1", "u2"])
    expect(newestFirst(l).map((x) => x.id)).toEqual(["c", "b", "a", "u1", "u2"])
  })
})

describe("pattern", () => {
  it("longest and average count only tries with a length", () => {
    const l = [mk("a", 5), mk("b", 2, "weeks"), mk("c", 9), mk("d", null)]
    expect(longestRun(l)).toEqual({ days: 14, of: 3 })
    expect(averageDays(l)).toBeCloseTo(28 / 3)
    expect(longestRun([mk("d", null)])).toBeNull()
  })
  it("most common ending counts chips and free words, repeats from 2", () => {
    const l = [mk("a", 5, "days", { ended: ["stress"] }), mk("b", 9, "days", { ended: ["stress"] }), mk("c", 3, "days", { ended: ["offered"], endedText: "Boredom" })]
    const e = endingCounts(l, endings)
    expect(e.triesNaming).toBe(3)
    expect(topRepeated(e.items)).toEqual({ labels: ["A bad day or stress"], count: 2 })
    expect(topRepeated(endingCounts([mk("a", 1, "days", { ended: ["stress"] }), mk("b", 1, "days", { ended: ["offered"] })], endings).items)).toBeNull()
    const h = helpedCounts([mk("a", 1, "days", { helped: ["told"] }), mk("b", 1, "days", { helped: ["told", "busy"] })], helped)
    expect(topRepeated(h.items)?.labels).toEqual(["Told someone"])
  })
  it("the window needs 3 tries with a length and holds more than half of them", () => {
    expect(dangerWindow([mk("a", 5), mk("b", 9)])).toBeNull()
    expect(dangerWindow([mk("a", 5), mk("b", 14), mk("c", 9)])).toEqual({ from: 5, to: 9, count: 2, of: 3 })
    // four tries: the shortest span holding 3 of them
    expect(dangerWindow([mk("a", 3), mk("b", 9), mk("c", 14), mk("d", 6)])).toEqual({ from: 3, to: 9, count: 3, of: 4 })
    // one day only
    expect(dangerWindow([mk("a", 1), mk("b", 1), mk("c", 40)])).toEqual({ from: 1, to: 1, count: 2, of: 3 })
    // weeks, months and years all work
    expect(dangerWindow([mk("a", 1, "months"), mk("b", 1, "years"), mk("c", 1.5, "months")])).toEqual({ from: 30, to: 45, count: 2, of: 3 })
  })
  it("says how many tries he has behind him: the chip, or the listed number when higher", () => {
    expect(triesBehind("2-3", 0)).toBe("2–3 tries")
    expect(triesBehind("10+", 12)).toBe("10 or more tries")
    expect(triesBehind("2-3", 5)).toBe("5 tries")
    expect(triesBehind("1", 1)).toBe("1 try")
    expect(triesBehind(null, 2)).toBe("2 tries")
    expect(triesBehind("never", 0)).toBeNull()
    expect(showsMore("never", 0)).toBe(false)
    expect(showsMore(null, 0)).toBe(false)
    expect(showsMore("1", 0)).toBe(true)
    expect(showsMore(null, 1)).toBe(true)
  })
})

describe("chart", () => {
  it("draws bars oldest to newest by month, undated last", () => {
    const l = [mk("x", 4, "days", { when: "2026-03" }), mk("u", 6), mk("y", 2, "weeks", { when: "2025-06" }), mk("n", null, "days", { when: "2025-01" })]
    expect(bars(l).map((b) => b.id)).toEqual(["y", "x", "u"])
  })
})

describe("example", () => {
  it("is four tries inside the 18 months before today, with ids the data file has", () => {
    const today = "2026-11-19"
    const ex = exampleTries(today)
    expect(ex).toHaveLength(4)
    for (const t of ex) {
      expect(t.when <= "2026-11" && t.when >= "2025-05").toBe(true)
      expect(monthAllowed(t.when, today)).toBe(true)
    }
    expect(ex.map((t) => tryDays(t))).toEqual([3, 9, 14, 6])
    const d = getAddiction("nicotine")!
    const eIds = (d.endings as { id: string }[]).map((e) => e.id)
    const hIds = (d.helped as { id: string }[]).map((e) => e.id)
    for (const t of ex) {
      for (const e of t.ended) expect(eIds).toContain(e)
      for (const h of t.helped) expect(hIds).toContain(h)
    }
  })
})

describe("saved shape", () => {
  it("falls back to empty on junk", () => {
    for (const j of [null, undefined, 5, "x", [], {}, { v: 2 }, { v: 2, tries: "x" }]) expect(parsePast(j)).toEqual(EMPTY_PAST)
  })
  it("keeps a good v2 state and drops bad tries, repeats and future-shaped fields", () => {
    const good = { ...emptyTry("a"), when: "2026-03", len: 5, ended: ["stress"] }
    const s = parsePast({ v: 2, count: "4-9", afterSlip: "justOnce", tries: [good, { ...good }, { id: "" }, 5, { ...good, id: "b", when: "bad", len: -2, unit: "eons", endedText: "x".repeat(200) }] })
    expect(s.count).toBe("4-9")
    expect(s.afterSlip).toBe("justOnce")
    expect(s.tries.map((t) => t.id)).toEqual(["a", "b"])
    expect(s.tries[0]).toEqual(good)
    expect(s.tries[1]).toMatchObject({ when: "", len: null, unit: "days" })
    expect(s.tries[1].endedText).toHaveLength(60)
    expect(parsePast({ v: 2, count: "many", afterSlip: "no", tries: [] })).toEqual(EMPTY_PAST)
  })
  it("imports the wave-1 shape once: count, one try with its length, endings, helped, afterSlip", () => {
    const w1 = { done: 4, tries: "2-3", stretchN: 3, stretchUnit: "weeks", lastEnded: "year", endings: ["stress", "offered"], helped: ["told"], afterSlip: "gaveUp", result: null }
    const s = parsePast(w1)
    expect(s.v).toBe(2)
    expect(s.count).toBe("2-3")
    expect(s.afterSlip).toBe("gaveUp")
    expect(s.tries).toHaveLength(1)
    expect(s.tries[0]).toMatchObject({ len: 3, unit: "weeks", ended: ["stress", "offered"], helped: ["told"], when: "" })
    expect(tryDays(s.tries[0])).toBe(21)
    expect(hasContent(s.tries[0])).toBe(true)
  })
  it("wave-1 never tried: count never, no try; years kept", () => {
    expect(parsePast({ tries: "0", stretchN: 1, stretchUnit: null, endings: [], helped: [], afterSlip: null }).tries).toEqual([])
    expect(parsePast({ tries: "0" }).count).toBe("never")
    expect(parsePast({ tries: "1", stretchN: 2, stretchUnit: "years" }).tries[0]).toMatchObject({ len: 2, unit: "years" })
  })
})

describe("hand-off for the if-then tool", () => {
  it("gives the top two endings by count with data-file ids, chips only", () => {
    const raw = {
      v: 2,
      count: null,
      afterSlip: null,
      tries: [
        { ...emptyTry("a"), ended: ["offered"] },
        { ...emptyTry("b"), ended: ["stress", "offered"] },
        { ...emptyTry("c"), ended: ["stress"], endedText: "Boredom" },
        { ...emptyTry("d"), ended: ["boredom"], endedText: "Boredom" },
        { ...emptyTry("e"), ended: ["fight"] },
      ],
    }
    const top = pastEndingsForPlan(raw)
    expect(top.map((x) => x.id)).toEqual(["stress", "offered"])
    expect(top[0].label).toBe("A bad day or stress")
    expect(pastEndingsForPlan(null)).toEqual([])
    expect(pastEndingsForPlan({ tries: "2-3", stretchN: 3, stretchUnit: "days", endings: ["fight"], helped: [] }).map((x) => x.id)).toEqual(["fight"])
  })
})

describe("review round 1", () => {
  it("wave-1 answers without a stretch still keep their endings and helped", () => {
    const s = parsePast({ tries: "4-9", stretchN: 2, endings: ["stress"], helped: ["told"] })
    expect(s.count).toBe("4-9")
    expect(s.tries).toHaveLength(1)
    expect(s.tries[0]).toMatchObject({ len: null, ended: ["stress"], helped: ["told"] })
    const z = parsePast({ tries: "0", stretchN: 3, stretchUnit: "weeks", endings: ["fight"] })
    expect(z.count).toBeNull()
    expect(z.tries[0]).toMatchObject({ len: 3, unit: "weeks", ended: ["fight"] })
  })
  it("lengths: whole days in sums, the typed unit in the list", () => {
    expect(lengthText(10.5)).toBe("11 days")
    expect(lengthText(28.7)).toBe("29 days")
    expect(typedLength({ len: 1.5, unit: "weeks" })).toBe("1.5 weeks")
    expect(typedLength({ len: 1, unit: "months" })).toBe("1 month")
    expect(typedLength({ len: null, unit: "days" })).toBeNull()
  })
})

describe("text", () => {
  it("has no exclamation mark and keeps the brief's lines", () => {
    expect(JSON.stringify(pastText)).not.toContain("!")
    expect(pastText.longest("14 days", 3)).toBe("Longest try: 14 days. From 3 tries with a length.")
    expect(pastText.windowDays(1, 1, 2, 3)).toBe("Most of your tries lasted 1 day. 2 of 3 tries with a length.")
    expect(pastText.windowDays(5, 9, 3, 4)).toBe("Most of your tries lasted between 5 and 9 days. 3 of 4 tries with a length.")
    expect(pastText.commonEnding(["A"], 2, 2)).toBe("Most common ending: A. 2 of 2 tries naming an ending.")
  })
})
