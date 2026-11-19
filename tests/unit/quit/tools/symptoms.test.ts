import { describe, expect, it } from "vitest"
import { CRAVING_MARK_DAYS, cravingPosition, dayPosition, phaseOf } from "@/src/quit/tools/symptoms/bandMath"
import { bandFor } from "@/src/quit/tools/symptoms/bands"
import { dayState, daysToGo, fmtDay, fmtSlip, isNow, latestSlipDay, markDay, phaseWords, rightNow } from "@/src/quit/tools/symptoms/logic"
import { betterOrder } from "@/src/quit/tools/symptoms/content"

const TODAY = "2026-11-19"
const base = { runStart: null, recordDate: null, goal: null, slipDay: null, today: TODAY } as const

describe("day state", () => {
  it("none without a run, a date or a slip", () => {
    expect(dayState(base)).toEqual({ kind: "none" })
  })
  it("a living run: day 1 is its start", () => {
    expect(dayState({ ...base, runStart: "2026-11-15" })).toEqual({ kind: "day", n: 5, from: "2026-11-15" })
    expect(dayState({ ...base, runStart: TODAY })).toEqual({ kind: "day", n: 1, from: TODAY })
  })
  it("the run wins over the record's date", () => {
    expect(dayState({ ...base, runStart: "2026-11-15", recordDate: "2026-10-01", goal: "stop" })).toMatchObject({ n: 5 })
  })
  it("the record date counts for stop and break only", () => {
    expect(dayState({ ...base, recordDate: "2026-10-30", goal: "stop" })).toEqual({ kind: "day", n: 21, from: "2026-10-30" })
    expect(dayState({ ...base, recordDate: "2026-10-30", goal: "break" })).toMatchObject({ n: 21 })
    expect(dayState({ ...base, recordDate: "2026-10-30", goal: "later" })).toEqual({ kind: "none" })
    expect(dayState({ ...base, recordDate: "2026-10-30", goal: null })).toEqual({ kind: "none" })
  })
  it("a date ahead is days to go, with no day number", () => {
    const s = dayState({ ...base, recordDate: "2026-11-22", goal: "stop" })
    expect(s).toEqual({ kind: "ahead", n: 3, date: "2026-11-22" })
    expect(markDay(s)).toBeNull()
  })
  it("a slip on or after the record date, no run: the slip state", () => {
    expect(dayState({ ...base, recordDate: "2026-10-20", goal: "stop", slipDay: "2026-10-29" })).toEqual({ kind: "slip", slipDay: "2026-10-29" })
    expect(dayState({ ...base, recordDate: "2026-10-29", goal: "stop", slipDay: "2026-10-29" })).toMatchObject({ kind: "slip" })
    expect(dayState({ ...base, slipDay: "2026-10-29" })).toEqual({ kind: "slip", slipDay: "2026-10-29" })
  })
  it("a record date later than the slip day wins", () => {
    expect(dayState({ ...base, recordDate: "2026-11-10", goal: "stop", slipDay: "2026-10-29" })).toMatchObject({ kind: "day", n: 10 })
  })
  it("finds the latest slip report, ignoring close calls", () => {
    const r = [
      { at: "2026-10-01T09:00:00", wentThrough: true },
      { at: "2026-10-29T21:00:00", wentThrough: true },
      { at: "2026-11-05T12:00:00", wentThrough: false },
    ]
    expect(latestSlipDay(r)).toBe("2026-10-29")
    expect(latestSlipDay([{ at: "2026-11-05T12:00:00", wentThrough: false }])).toBeNull()
    expect(latestSlipDay([])).toBeNull()
  })
  it("marks a day only when there is one", () => {
    expect(markDay({ kind: "day", n: 7, from: TODAY })).toBe(7)
    expect(markDay({ kind: "none" })).toBeNull()
    expect(markDay({ kind: "slip", slipDay: TODAY })).toBeNull()
  })
})

describe("words", () => {
  it("the Right now line changes at 8, 29 and 43", () => {
    const at = (d: number) => rightNow(d)
    expect(at(1)).toBe(at(7))
    expect(at(8)).toBe(at(28))
    expect(at(29)).toBe(at(42))
    expect(new Set([at(7), at(8), at(29), at(43)]).size).toBe(4)
    expect(at(1)).toMatch(/^The hardest week/)
    expect(at(8)).toMatch(/between day 10 and week 4/)
    expect(at(29)).toMatch(/past the 4 weeks/)
    expect(at(400)).toMatch(/a third still had some/)
  })
  it("the cue card words are fixed: 1-6, 7-35, after 35", () => {
    for (const d of [1, 6]) expect(phaseWords("cue", d)).toBe("Not tested before day 7.")
    for (const d of [7, 20, 35]) expect(phaseWords("cue", d)).toBe("Within the days tested.")
    for (const d of [36, 400]) expect(phaseWords("cue", d)).toBe("Past the last day tested: no end known.")
  })
  it("mood and sleep phases", () => {
    expect(phaseWords("mood", 5)).toMatch(/peak week/)
    expect(phaseWords("mood", 8)).toMatch(/Past the peak week/)
    expect(phaseWords("mood", 15)).toMatch(/day 10 to week 4/)
    expect(phaseWords("mood", 29)).toMatch(/Past the 4 weeks/)
    expect(phaseWords("sleep", 10)).toMatch(/Past the peak week/)
    expect(phaseWords("sleep", 14)).toMatch(/2 to 4 weeks/)
    expect(phaseWords("sleep", 40)).toMatch(/Past the 4 weeks/)
  })
  it("cravings and hunger words", () => {
    expect(phaseWords("craving", 10)).toMatch(/strongest weeks/)
    expect(phaseWords("craving", 100)).toMatch(/Past week 4/)
    expect(phaseWords("craving", 200)).toMatch(/Past month 6/)
    expect(phaseWords("craving", 400)).toMatch(/Past month 12/)
    expect(phaseWords("hunger", 3)).toMatch(/No day range/)
  })
  it("formats dates and the countdown", () => {
    expect(fmtDay("2026-10-30")).toBe("Fri, Oct 30")
    expect(fmtSlip("2026-10-29")).toBe("Thu 29 Oct")
    expect(daysToGo(3)).toBe("3 days to go.")
    expect(daysToGo(1)).toBe("1 day to go.")
  })
})

describe("the Now pill", () => {
  it("shows while his day is in the card's peak or fade range", () => {
    expect(isNow("mood", 5)).toBe(true)
    expect(isNow("sleep", 28)).toBe(true)
    expect(isNow("mood", 29)).toBe(false)
    expect(isNow("cue", 5)).toBe(false)
    expect(isNow("cue", 7)).toBe(true)
    expect(isNow("cue", 35)).toBe(true)
    expect(isNow("cue", 36)).toBe(false)
    expect(isNow("craving", 28)).toBe(true)
    expect(isNow("craving", 29)).toBe(false)
    expect(isNow("hunger", 5)).toBe(false)
  })
  it("never without a day", () => {
    for (const c of ["craving", "cue", "mood", "sleep", "hunger"] as const) expect(isNow(c, null)).toBe(false)
  })
})

describe("bands", () => {
  it("copies the lab's days", () => {
    expect(bandFor("nicotine", "irritable")).toMatchObject({ peak: [1, 7], gone: [10, 28] })
    expect(bandFor("nicotine", "sleep")).toMatchObject({ peak: [1, 7], gone: [14, 28] })
    expect(bandFor("nicotine", "cue-craving")).toMatchObject({ tested: [7, 35], openFrom: 35 })
  })
  it("phase of a day against a band", () => {
    const cue = bandFor("nicotine", "cue-craving")!
    expect(phaseOf(cue, 3)).toBe("open-before")
    expect(phaseOf(cue, 7)).toBe("open-within")
    expect(phaseOf(cue, 36)).toBe("open-past")
  })
  it("positions stay on the line", () => {
    expect(dayPosition(1)).toBeLessThan(dayPosition(42))
    expect(dayPosition(400)).toBe(dayPosition(42))
    expect(cravingPosition(400)).toBeGreaterThan(87.5)
    expect(cravingPosition(7)).toBe(12.5)
    expect(cravingPosition(CRAVING_MARK_DAYS[3])).toBe(87.5)
    expect(cravingPosition(9999)).toBeLessThanOrEqual(100)
  })
})

describe("what gets better", () => {
  it("is in time order and has six rows", () => {
    expect(betterOrder.map((r) => r.when)).toEqual(["Within a day", "From week 1", "First year", "Over a year", "A year on", "Years 1 and 3"])
  })
})
