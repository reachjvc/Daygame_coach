import { describe, expect, it } from "vitest"
import { BAND_DAYS, bandFor, bandsOf } from "@/src/quit/lab/timeline/best/bands"
import { dayNumber, dayPosition, pastEndCount, phaseOf, span, weeks } from "@/src/quit/lab/timeline/best/logic"
import { LAB } from "@/src/quit/lab/registry"
import { getAddiction } from "@/src/quit/data"

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime()
const bands = Object.values(bandsOf("nicotine"))

describe("timeline best: day number", () => {
  it("day 1 is the quit date, whatever the hour", () => {
    expect(dayNumber(at(2026, 10, 1, 23), at(2026, 10, 1, 0))).toBe(1)
    expect(dayNumber(at(2026, 10, 1, 8), at(2026, 10, 3, 20))).toBe(3)
    expect(dayNumber(at(2026, 9, 7), at(2026, 10, 18))).toBe(43)
  })
  it("is zero or less before the quit date", () => {
    expect(dayNumber(at(2026, 10, 20), at(2026, 10, 18))).toBe(-1)
  })
})

describe("timeline best: positions", () => {
  it("spans cover whole days of the 42-day axis", () => {
    expect(span(1, 7)).toEqual({ left: 0, width: (7 / 42) * 100 })
    expect(span(10, 28).left).toBeCloseTo((9 / 42) * 100, 6)
    expect(span(10, 28).width).toBeCloseTo((19 / 42) * 100, 6)
    expect(span(35, BAND_DAYS).left + span(35, BAND_DAYS).width).toBeCloseTo(100, 6)
  })
  it("his day sits in the middle of its slot and stays on the edge beyond the axis", () => {
    expect(dayPosition(1)).toBeCloseTo((0.5 / 42) * 100, 6)
    expect(dayPosition(42)).toBeCloseTo((41.5 / 42) * 100, 6)
    expect(dayPosition(90)).toBe(dayPosition(42))
  })
  it("the strip is six weeks of seven days", () => {
    const w = weeks()
    expect(w).toHaveLength(6)
    expect(w[0]).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(w[5][6]).toBe(42)
  })
})

describe("timeline best: past the end of the range", () => {
  it("counts only bands that have an end", () => {
    expect(pastEndCount(bands, 3)).toEqual({ past: 0, total: 6 })
    expect(pastEndCount(bands, 12)).toEqual({ past: 0, total: 6 })
    expect(pastEndCount(bands, 28)).toEqual({ past: 0, total: 6 })
    expect(pastEndCount(bands, 29)).toEqual({ past: 6, total: 6 })
    expect(pastEndCount(bands, 40)).toEqual({ past: 6, total: 6 })
  })
  it("the open-ended cue-craving band is never counted, even far out", () => {
    expect(pastEndCount([bandFor("nicotine", "cue-craving")!], 400)).toEqual({ past: 0, total: 0 })
  })
})

describe("timeline best: phase of his day", () => {
  const irritable = bandFor("nicotine", "irritable")!
  const sleep = bandFor("nicotine", "sleep")!
  const cue = bandFor("nicotine", "cue-craving")!
  it("walks peak, after peak, in range, past end", () => {
    expect([0, 3, 7, 8, 9, 10, 28, 29].map((d) => phaseOf(irritable, d))).toEqual(["ahead", "peak", "peak", "after-peak", "after-peak", "in-range", "in-range", "past-end"])
  })
  it("sleep range starts at day 14", () => {
    expect([12, 13, 14].map((d) => phaseOf(sleep, d))).toEqual(["after-peak", "after-peak", "in-range"])
  })
  it("open-ended band is within the tested days up to day 35 and past them after", () => {
    expect([3, 35, 36, 400].map((d) => phaseOf(cue, d))).toEqual(["open-within", "open-within", "open-past", "open-past"])
  })
})

describe("timeline best: bands match the data file", () => {
  const rows = getAddiction("nicotine")!.symptomCourse as { symptom: string; peak: string | null; lasts: string }[]
  it("every nicotine row has a band, and no band has a row that is missing", () => {
    expect(Object.keys(bandsOf("nicotine")).sort()).toEqual(rows.map((r) => r.symptom).sort())
  })
  it("peak words are 'first week' exactly where a peak is drawn", () => {
    for (const r of rows) expect(Boolean(bandFor("nicotine", r.symptom)!.peak)).toBe(r.peak === "first week")
  })
  it("the 10-day and 4-week figures are in the data words where they are used", () => {
    for (const r of rows.filter((x) => bandFor("nicotine", x.symptom)!.gone)) {
      expect(r.lasts).toContain("2 to 4 weeks")
      expect(r.lasts.includes("about 10 days") || r.symptom === "sleep").toBe(true)
    }
  })
  it("other addictions have no bands and the data has no course yet", () => {
    for (const a of ["alcohol", "weed", "porn"]) expect(Object.keys(bandsOf(a))).toEqual([])
  })
})

describe("timeline best: registry", () => {
  it("is registered as the improved variant of nicotine", () => {
    expect(LAB.timeline.variants.best).toMatchObject({ kind: "best", label: "Improved", addiction: "nicotine" })
  })
})
