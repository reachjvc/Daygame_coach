import { describe, it, expect } from "vitest"
import {
  addDays,
  answerFor,
  chartSpan,
  currentAttempt,
  daysBetween,
  laneGeometry,
  runDays,
  runLanes,
  stats,
  thoughtCosts,
} from "@/src/vice/blackboxService"
import { emptyRecord, fileReport, startAttempt } from "@/src/vice/blackbox/blackboxStore"
import type { BlackBoxRecord } from "@/src/vice/types"

const TODAY = "2026-09-20"

function record(): BlackBoxRecord {
  let r = emptyRecord()
  // Two long runs that both ended on "I felt fine", and one short one that
  // ended on a bad week — the shape the whole tool exists to make visible.
  r = startAttempt(r, { viceId: "smoking", label: "Cigarettes", startedOn: "2025-02-10", startedBy: "New year", structure: ["Told my brother"] })
  r = fileReport(r, {
    attemptId: r.attempts[0].id, at: "2025-05-09T20:00:00.000Z", wentThrough: true,
    thought: "88 days in, one at the weekend is fine", ending: "fine", closeness: 9,
    withWhom: "Alone", where: "Home", factors: ["A good stretch beforehand", "On my own"], didInstead: "",
  })
  r = startAttempt(r, { viceId: "smoking", label: "Cigarettes", startedOn: "2025-08-18", startedBy: "Cough", structure: [] })
  r = fileReport(r, {
    attemptId: r.attempts[1].id, at: "2025-09-10T19:00:00.000Z", wentThrough: true,
    thought: "Work fell apart", ending: "stress", closeness: 10,
    withWhom: "Colleagues", where: "Office", factors: ["Stressed about work"], didInstead: "",
  })
  r = startAttempt(r, { viceId: "smoking", label: "Cigarettes", startedOn: "2026-06-03", startedBy: "Money", structure: ["Threw out everything"] })
  r = fileReport(r, {
    attemptId: r.attempts[2].id, at: "2026-07-14T21:00:00.000Z", wentThrough: true,
    thought: "I've clearly got this under control now", ending: "fine", closeness: 8,
    withWhom: "Friends", where: "Pub", factors: ["A good stretch beforehand", "Drinking"], didInstead: "",
  })
  // The live run, with two close calls survived.
  r = startAttempt(r, { viceId: "smoking", label: "Cigarettes", startedOn: "2026-08-16", startedBy: "Read my own record", structure: ["Told my brother", "A rule for the first drink"] })
  r = fileReport(r, {
    attemptId: r.attempts[3].id, at: "2026-09-02T22:10:00.000Z", wentThrough: false,
    thought: "Maybe I could just moderate", ending: "fine", closeness: 7,
    withWhom: "Alone", where: "Balcony", factors: ["A good stretch beforehand"], didInstead: "Read the chart",
  })
  r = fileReport(r, {
    attemptId: r.attempts[3].id, at: "2026-09-18T23:30:00.000Z", wentThrough: false,
    thought: "One wouldn't undo five weeks", ending: "fine", closeness: 6,
    withWhom: "Alone", where: "Home", factors: ["Slept badly"], didInstead: "Went to bed",
  })
  return r
}

describe("daysBetween and runDays", () => {
  it("counts calendar days regardless of timezone spelling", () => {
    expect(daysBetween("2026-01-01", "2026-01-31")).toBe(30)
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1) // 2026 is not a leap year
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2) // 2024 is
  })

  it("a run that started and ended the same day is 1 day, never 0", () => {
    const a = { id: "x", viceId: "v", label: "l", startedOn: "2026-05-01", startedBy: "", structure: [], endedOn: "2026-05-01", endedByReportId: null }
    expect(runDays(a, TODAY)).toBe(1)
  })

  it("a live run counts up to and including today", () => {
    const a = { id: "x", viceId: "v", label: "l", startedOn: "2026-09-18", startedBy: "", structure: [], endedOn: null, endedByReportId: null }
    expect(runDays(a, TODAY)).toBe(3)
  })

  it("addDays does not drift across a month or year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
  })
})

describe("the record never resets", () => {
  it("total clean days includes every run that already ended", () => {
    const s = stats(record(), TODAY)
    // 88 + 23 + 41 + 36 live
    expect(s.totalCleanDays).toBeGreaterThan(180)
    expect(s.runs).toBe(4)
  })

  it("ending a run does not reduce the longest run", () => {
    const before = stats(record(), TODAY)
    let r = record()
    const live = currentAttempt(r)!
    r = fileReport(r, {
      attemptId: live.id, at: "2026-09-20T20:00:00.000Z", wentThrough: true,
      thought: "gave in", ending: "justone", closeness: 10,
      withWhom: "Alone", where: "Home", factors: ["Bored"], didInstead: "",
    })
    const after = stats(r, TODAY)
    expect(after.longestDays).toBe(before.longestDays)
    expect(after.totalCleanDays).toBe(before.totalCleanDays)
    expect(after.currentDays).toBeNull()
    expect(after.runs).toBe(before.runs)
  })
})

describe("thoughtCosts ranks by what it cost, not how often", () => {
  it("puts the expensive thought first even when another was filed as often", () => {
    const rows = thoughtCosts(record(), TODAY)
    expect(rows[0].ending).toBe("fine")
    expect(rows[0].runsEnded).toBe(2)
    // 88 + 41 clean days ended by the same thought
    expect(rows[0].daysEnded).toBeGreaterThan(120)
    // and it is ahead of "stress" despite stress having ended a run too
    const stress = rows.find((r) => r.ending === "stress")!
    expect(rows[0].daysEnded).toBeGreaterThan(stress.daysEnded)
  })

  it("counts close calls survived without counting them as runs ended", () => {
    const fine = thoughtCosts(record(), TODAY).find((r) => r.ending === "fine")!
    expect(fine.survived).toBe(2)
    expect(fine.runsEnded).toBe(2)
  })

  it("carries the person's own most recent wording, not a canned label", () => {
    const fine = thoughtCosts(record(), TODAY).find((r) => r.ending === "fine")!
    expect(fine.ownWords).toBe("One wouldn't undo five weeks")
  })
})

describe("answerFor invents nothing", () => {
  it("reports the empty state plainly when the thought is new", () => {
    const a = answerFor(emptyRecord(), "fine", TODAY)
    expect(a.empty).toBe(true)
    expect(a.history).toEqual([])
    expect(a.runsEnded).toBe(0)
    expect(a.daysEnded).toBe(0)
  })

  it("answers a repeat thought with its own history, newest first", () => {
    const a = answerFor(record(), "fine", TODAY)
    expect(a.empty).toBe(false)
    expect(a.runsEnded).toBe(2)
    expect(a.survived).toBe(2)
    expect(a.history[0].thought).toBe("One wouldn't undo five weeks")
  })
})

describe("chart geometry", () => {
  it("orders lanes oldest first so the chart reads downwards", () => {
    const lanes = runLanes(record(), TODAY)
    const starts = lanes.map((l) => l.attempt.startedOn)
    expect(starts).toEqual([...starts].sort())
  })

  it("gives the shortest run a visible width", () => {
    let r = emptyRecord()
    r = startAttempt(r, { viceId: "v", label: "l", startedOn: "2026-09-19", startedBy: "", structure: [] })
    const span = chartSpan(r, TODAY)!
    const [g] = laneGeometry(runLanes(r, TODAY), span, TODAY)
    expect(g.width).toBeGreaterThanOrEqual(1.1)
  })

  /**
   * The fault the mockup actually had, twice: a label on a bar near the right
   * edge ran outside the card. Fixing it at a fixed 62% fixed the laptop and
   * left the phone broken, so the threshold is a parameter and this is the test
   * that a narrow chart flips sooner.
   */
  it("flips a late label to the left, and flips sooner when the chart is narrow", () => {
    const r = record()
    const span = chartSpan(r, TODAY)!
    const wide = laneGeometry(runLanes(r, TODAY), span, TODAY, { flipAfter: 62 })
    const narrow = laneGeometry(runLanes(r, TODAY), span, TODAY, { flipAfter: 40 })
    expect(wide.at(-1)!.flip).toBe(true)
    expect(narrow.filter((g) => g.flip).length).toBeGreaterThanOrEqual(wide.filter((g) => g.flip).length)
  })

  it("no bar is ever drawn past the right edge", () => {
    const r = record()
    const span = chartSpan(r, TODAY)!
    for (const g of laneGeometry(runLanes(r, TODAY), span, TODAY)) {
      expect(g.left + g.width).toBeLessThanOrEqual(100.001)
    }
  })

  it("has no span to draw when nothing has been recorded", () => {
    expect(chartSpan(emptyRecord(), TODAY)).toBeNull()
  })
})
