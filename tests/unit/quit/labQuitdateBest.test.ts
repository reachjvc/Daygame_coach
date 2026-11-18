import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import { EVIDENCE } from "@/src/quit/lab/quitdate/best/evidence"
import { breakEnd, chipDate, evidenceMode, isFar, ladder, parts, runDays, slipToday, summarize } from "@/src/quit/lab/quitdate/best/logic"

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime()

// 2026-11-18 is a Wednesday.
describe("quitdate best: chip dates from a fixed today", () => {
  it("Wednesday", () => {
    expect(chipDate("in3", "2026-11-18")).toBe("2026-11-21")
    expect(chipDate("weekend", "2026-11-18")).toBe("2026-11-21")
    expect(chipDate("monday", "2026-11-18")).toBe("2026-11-23")
    expect(chipDate("in14", "2026-11-18")).toBe("2026-12-02")
  })
  it("never today: Monday goes a week out, Saturday weekend is tomorrow, Sunday weekend is next Saturday", () => {
    expect(chipDate("monday", "2026-11-16")).toBe("2026-11-23")
    expect(chipDate("weekend", "2026-11-21")).toBe("2026-11-22")
    expect(chipDate("weekend", "2026-11-22")).toBe("2026-11-28")
    expect(chipDate("monday", "2026-11-22")).toBe("2026-11-23")
  })
})

describe("quitdate best: far-date warning", () => {
  const now = at(2026, 10, 18)
  it("shows only past 7 days ahead", () => {
    expect(isFar("2026-11-25", now)).toBe(false)
    expect(isFar("2026-11-26", now)).toBe(true)
    expect(isFar("2026-12-08", now)).toBe(true)
    expect(isFar(null, now)).toBe(false)
  })
  it("states one evidence line with basis, studied in smokers, and sources with quotes", () => {
    const e = EVIDENCE.dateFar
    expect(e.text).toBe("In one large study of smokers, those who picked a later quit date were less often smoke-free 6 months on: about 40% with a date in week 1, 23% in week 5.")
    expect(e.studiedIn).toBe("smokers")
    expect(e.basis.n).toBe("1,848")
    for (const ev of Object.values(EVIDENCE)) for (const r of ev.refs) expect(r.quote && r.pmid && r.url).toBeTruthy()
  })
  it("hides smoker lines for porn, tags them for alcohol and weed", () => {
    expect(evidenceMode("nicotine")).toBe("plain")
    expect(evidenceMode("porn")).toBe("hidden")
    expect(evidenceMode("alcohol")).toBe("tagged")
    expect(evidenceMode("weed")).toBe("tagged")
  })
})

describe("quitdate best: break length", () => {
  it("ends 7, 14 or 28 days after the start", () => {
    expect(breakEnd("2026-11-23", "w1", null)).toBe("2026-11-30")
    expect(breakEnd("2026-11-23", "w2", null)).toBe("2026-12-07")
    expect(breakEnd("2026-11-23", "w4", null)).toBe("2026-12-21")
  })
  it("takes a set date only after the start", () => {
    expect(breakEnd("2026-11-23", "set", "2026-12-10")).toBe("2026-12-10")
    expect(breakEnd("2026-11-23", "set", "2026-11-23")).toBeNull()
    expect(breakEnd("2026-11-23", "set", null)).toBeNull()
  })
})

describe("quitdate best: ladder countdown", () => {
  it("before the date, the first goal is next and counts from the date", () => {
    const r = ladder("2026-11-23", at(2026, 10, 18))
    expect(r.map((x) => x.reached)).toEqual([false, false, false, false, false])
    expect(r.find((x) => x.next)?.key).toBe("d1")
    expect(parts(r[0].atMs - at(2026, 10, 18)).days).toBe(5)
  })
  it("after 3 days and 6 hours, 1 and 3 days are reached and 1 week is next in 3d 18h", () => {
    const now = at(2026, 10, 23, 0) + 3 * 86_400_000 + 6 * 3_600_000
    const r = ladder("2026-11-23", now)
    expect(r.map((x) => x.reached)).toEqual([true, true, false, false, false])
    const next = r.find((x) => x.next)!
    expect(next.key).toBe("w1")
    expect(parts(next.atMs - now)).toEqual({ days: 3, hours: 18, minutes: 0, seconds: 0 })
  })
  it("has no next goal after a month", () => {
    expect(ladder("2026-10-01", at(2026, 10, 18)).some((x) => x.next)).toBe(false)
  })
})

describe("quitdate best: runs list", () => {
  it("counts the current run from its first day, today included", () => {
    expect(runDays({ start: "2026-11-15", end: null }, "2026-11-18")).toBe(4)
    expect(runDays({ start: "2026-11-19", end: null }, "2026-11-18")).toBe(0)
  })
  it("a slip closes the run, keeps it listed and starts a new one tomorrow; total stays", () => {
    const runs = slipToday([{ start: "2026-11-01", end: null }], "2026-11-11")
    expect(runs).toEqual([
      { start: "2026-11-01", end: "2026-11-11" },
      { start: "2026-11-12", end: null },
    ])
    const s = summarize(slipToday(runs, "2026-11-15"), "2026-11-18")
    expect(s.past).toEqual([
      { start: "2026-11-12", end: "2026-11-15", days: 3 },
      { start: "2026-11-01", end: "2026-11-11", days: 10 },
    ])
    expect(s.current).toBe(3)
    expect(s.best).toBe(10)
    expect(s.total).toBe(16)
  })
})

describe("quitdate best: registry", () => {
  it("is registered as the improved nicotine variant", () => {
    const v = LAB.quitdate.variants.best
    expect(v.kind).toBe("best")
    expect(v.label).toBe("Improved")
    expect(v.addiction).toBe("nicotine")
  })
})
