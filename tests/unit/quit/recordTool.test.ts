import { describe, expect, it } from "vitest"
import type { BlackBoxRecord, ViceAttempt, ViceReport } from "@/src/vice/types"
import {
  DAY_LADDER,
  cellState,
  dayInfo,
  dayMilestones,
  daysText,
  fillTargets,
  moneyFor,
  moneyMilestones,
  monthGrid,
  monthSpan,
  nextDayStep,
  ringFill,
  runToStart,
  spentInPeriod,
  splitElapsed,
  toCents,
  elapsedSince,
  fmtCount,
  parseAmount,
  viewOf,
  type RecordView,
} from "@/src/quit/tools/record/logic"
import { exampleFor } from "@/src/quit/tools/record/example"
import { parseRecordTool } from "@/src/quit/tools/record/state"
import { DAY_MS } from "@/src/quit/money"
import { fmtDay } from "@/src/quit/tools/record/fmt"

const STAMP = "2026-01-01T00:00:00.000Z"
const run = (id: string, start: string, end: string | null, by: string | null, viceId = "nicotine"): ViceAttempt => ({ id, viceId, label: "x", startedOn: start, startedBy: "", structure: [], endedOn: end, endedByReportId: by, updatedAt: STAMP, deletedAt: null })
const rep = (id: string, attemptId: string, day: string, wentThrough: boolean, thought: string): ViceReport => ({ id, attemptId, at: `${day}T12:00:00`, wentThrough, thought, ending: "other", closeness: null, withWhom: "", where: "", factors: [], didInstead: "", updatedAt: STAMP, deletedAt: null })

const TODAY = "2026-11-19"
const box: BlackBoxRecord = {
  version: 1,
  attempts: [run("a", "2026-10-20", "2026-10-28", "s"), run("b", "2026-10-29", null, null), run("other", "2026-09-01", null, null, "weed")],
  reports: [rep("s", "a", "2026-10-28", true, "just one"), rep("c1", "a", "2026-10-25", false, "bored"), rep("c2", "b", "2026-11-10", false, "stress")],
}
const view = viewOf(box, "nicotine", TODAY)

describe("viewOf: the Black Box's own maths", () => {
  it("counts both ends of every run, the slip day included, and ignores another vice", () => {
    expect(view.runs.map((r) => [r.start, r.end, r.days, r.live])).toEqual([
      ["2026-10-20", "2026-10-28", 9, false],
      ["2026-10-29", null, 22, true],
    ])
    expect(view.total).toBe(31)
    expect(view.current).toBe(22)
    expect(view.best).toBe(22)
    expect(view.closeCalls).toBe(2)
    expect(view.cleanDays).toHaveLength(31)
    expect(view.cleanDays[0]).toBe("2026-10-20")
    expect(view.cleanDays[30]).toBe(TODAY)
  })
  it("keeps the slip and the close calls with their run", () => {
    expect(view.runs[0].slip).toEqual({ day: "2026-10-28", thought: "just one" })
    expect(view.runs[0].closeCalls).toEqual([{ day: "2026-10-25", thought: "bored" }])
    expect(view.runs[1].closeCalls).toEqual([{ day: "2026-11-10", thought: "stress" }])
  })
  it("the quit day itself is day 1", () => {
    const v = viewOf({ version: 1, attempts: [run("x", TODAY, null, null)], reports: [] }, "nicotine", TODAY)
    expect(v.total).toBe(1)
    expect(v.current).toBe(1)
  })
  it("a removed run is not counted", () => {
    const gone = { ...box, attempts: box.attempts.map((a) => (a.id === "a" ? { ...a, deletedAt: STAMP } : a)) }
    expect(viewOf(gone, "nicotine", TODAY).total).toBe(22)
  })
})

describe("ladders", () => {
  it("next step and ring fill", () => {
    expect(nextDayStep(0)).toBe(1)
    expect(nextDayStep(7)).toBe(14)
    expect(nextDayStep(365)).toBeNull()
    expect(ringFill(7)).toBeCloseTo(0.5, 6)
    expect(ringFill(400)).toBe(1)
  })
  it("a reached step has the date of that clean day across runs; the next ones are projected while a run lives", () => {
    const steps = dayMilestones(view, TODAY)
    expect(steps.map((s) => s.threshold)).toEqual([...DAY_LADDER])
    expect(steps.find((s) => s.threshold === 7)?.date).toBe("2026-10-26")
    // the 14th clean day is in the second run: 9 days in run one, so day 5 of run two
    expect(steps.find((s) => s.threshold === 14)?.date).toBe("2026-11-02")
    const sixty = steps.find((s) => s.threshold === 60)
    expect(sixty).toMatchObject({ date: null, toGo: 29, projected: "2026-12-18" })
  })
  it("without a living run nothing is projected", () => {
    const ended = viewOf({ version: 1, attempts: [run("a", "2026-10-20", "2026-10-28", "s")], reports: [rep("s", "a", "2026-10-28", true, "")] }, "nicotine", TODAY)
    expect(dayMilestones(ended, TODAY).find((s) => s.threshold === 14)).toMatchObject({ date: null, toGo: 5, projected: null })
  })
})

const at = (day: string, h = 0) => {
  const [y, m, d] = day.split("-").map(Number)
  return new Date(y, m - 1, d, h).getTime()
}
const moneyRuns = [{ start: "2026-10-30", end: null }]
const unit = { perDay: 10, priceUsd: 0.52 }

describe("money windows and milestones", () => {
  it("rolling windows count only clean time and spending inside", () => {
    const now = at(TODAY)
    const spends = [
      { id: "1", day: "2026-11-18", amount: 5, note: "gum" },
      { id: "2", day: "2026-10-01", amount: 100, note: "old" },
    ]
    expect(spentInPeriod(spends, 7, now)).toBe(5)
    expect(spentInPeriod(spends, null, now)).toBe(105)
    expect(moneyFor(moneyRuns, unit, spends, now, 7).money).toBe(31.4)
    expect(moneyFor(moneyRuns, unit, spends, now, null).money).toBe(-1)
    expect(moneyFor(moneyRuns, null, [], now, null).money).toBeNull()
  })
  it("a money step is reached only while the money kept is at or above it, with its first day", () => {
    const now = at(TODAY)
    const free = moneyMilestones(moneyRuns, [], 10, 0.52, TODAY, now)
    expect(free.find((s) => s.threshold === 100)?.reachedOn).toBe("2026-11-18")
    expect(free.find((s) => s.threshold === 250)).toMatchObject({ reachedOn: null, daysAtRate: 29 })
    const spent = moneyMilestones(moneyRuns, [{ id: "1", day: TODAY, amount: 50, note: "" }], 10, 0.52, TODAY, now)
    expect(spent.find((s) => s.threshold === 100)).toMatchObject({ reachedOn: null, daysAtRate: 9 })
    expect(spent.find((s) => s.threshold === 50)?.reachedOn).toBe("2026-11-08")
  })
  it("without numbers no step has days", () => {
    const steps = moneyMilestones(moneyRuns, [], null, null, TODAY, at(TODAY))
    expect(steps.every((s) => s.reachedOn === null && s.daysAtRate === null)).toBe(true)
  })
})

describe("targets", () => {
  const targets = [
    { id: "t1", name: "Shoes", price: 100 },
    { id: "t2", name: "Trip", price: 200 },
  ]
  it("fill in order from the money kept", () => {
    const f = fillTargets(targets, 150, 5.2)
    expect(f[0]).toMatchObject({ funded: 100, done: true, daysToGo: 0 })
    expect(f[1]).toMatchObject({ funded: 50, done: false, missing: 150, daysToGo: 29 })
  })
  it("a negative total makes the days to go grow", () => {
    const f = fillTargets(targets, -367.46, 5.2)
    expect(f[0]).toMatchObject({ funded: 0, done: false, missing: 467.46, daysToGo: 90 })
    expect(f[1].daysToGo).toBe(129)
    expect(fillTargets(targets, 0, 5.2)[0].daysToGo).toBe(20)
  })
  it("without a rate there are no days", () => {
    expect(fillTargets(targets, 0, null)[0].daysToGo).toBeNull()
  })
})

describe("calendar", () => {
  it("monthGrid starts on Monday and pads with null", () => {
    const g = monthGrid(2026, 10) // November 2026 starts on a Sunday
    expect(g[0]).toEqual([null, null, null, null, null, null, "2026-11-01"])
    expect(g.flat().filter(Boolean)).toHaveLength(30)
    expect(g.every((w) => w.length === 7)).toBe(true)
  })
  it("cell states: slip dashed first, then clean, else plain; today and close call flagged", () => {
    expect(cellState(dayInfo("2026-10-28", view, TODAY))).toBe("slip")
    expect(cellState(dayInfo("2026-10-27", view, TODAY))).toBe("clean")
    expect(cellState(dayInfo("2026-10-10", view, TODAY))).toBe("plain")
    expect(cellState(dayInfo("2026-11-25", view, TODAY))).toBe("plain")
    const t = dayInfo(TODAY, view, TODAY)
    expect(t.today).toBe(true)
    expect(t.clean).toEqual({ runStart: "2026-10-29", dayNo: 22 })
    expect(dayInfo("2026-11-10", view, TODAY).closeCalls).toEqual(["stress"])
    expect(dayInfo("2026-11-03", view, TODAY).clean).toEqual({ runStart: "2026-10-29", dayNo: 6 })
  })
  it("the span runs from the month of the first run to this month", () => {
    expect(monthSpan(view, TODAY)).toEqual({ first: [2026, 9], last: [2026, 10] })
  })
})

describe("starting a run", () => {
  const empty: RecordView = viewOf({ version: 1, attempts: [], reports: [] }, "nicotine", TODAY)
  it("starts on a date that is today or past, with goal stop or break", () => {
    expect(runToStart("2026-11-19", "stop", TODAY, empty)).toBe("2026-11-19")
    expect(runToStart("2026-11-01", "break", TODAY, empty)).toBe("2026-11-01")
  })
  it("never for a future date, goal later, no goal, or no date", () => {
    expect(runToStart("2026-11-20", "stop", TODAY, empty)).toBeNull()
    expect(runToStart("2026-11-01", "later", TODAY, empty)).toBeNull()
    expect(runToStart("2026-11-01", null, TODAY, empty)).toBeNull()
    expect(runToStart(null, "stop", TODAY, empty)).toBeNull()
  })
  it("never when a run (living or ended) started on or after that date", () => {
    expect(runToStart("2026-10-20", "stop", TODAY, view)).toBeNull()
    expect(runToStart("2026-10-28", "stop", TODAY, view)).toBeNull()
    const slipOnly = viewOf({ version: 1, attempts: [run("a", "2026-10-20", "2026-10-28", "s")], reports: [rep("s", "a", "2026-10-28", true, "")] }, "nicotine", TODAY)
    expect(runToStart("2026-10-20", "stop", TODAY, slipOnly)).toBeNull()
    expect(runToStart("2026-11-10", "stop", TODAY, slipOnly)).toBe("2026-11-10")
  })
})

describe("small helpers", () => {
  it("splits elapsed time", () => {
    expect(splitElapsed(4 * DAY_MS + 14 * 3_600_000 + 23 * 60_000 + 5000)).toEqual({ days: 4, hours: 14, minutes: 23, seconds: 5 })
    expect(splitElapsed(-5)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })
  it("days text has one decimal and the right plural", () => {
    expect(daysText(44.866)).toBe("44.87 days")
    expect(daysText(1)).toBe("1 day")
    expect(daysText(0.004)).toBe("0.00 days")
  })
})

describe("the example and the saved data", () => {
  it("the example has two runs (one ended by a slip), three close calls, and is made fresh each time", () => {
    const ex = exampleFor(TODAY, "nicotine")
    const v = viewOf(ex.box, "nicotine", TODAY)
    expect(v.runs).toHaveLength(2)
    expect(v.runs[0].slip).not.toBeNull()
    expect(v.closeCalls).toBe(3)
    expect(ex.unit).toMatchObject({ perDay: 10, priceUsd: 0.52 })
    expect(ex.targets).toHaveLength(1)
  })
  it("reads only good spends and targets", () => {
    const s = parseRecordTool({
      spends: [
        { id: "a", day: "2026-11-01", amount: 12.5, note: "x".repeat(200) },
        { id: "b", day: "nope", amount: 5, note: "" },
        { id: "c", day: "2026-11-01", amount: -4, note: "" },
        { id: "d", day: "2026-11-01", amount: 100001, note: "" },
      ],
      targets: [
        { id: "t", name: "Shoes", price: 90 },
        { id: "u", name: "Free", price: 0 },
      ],
    })
    expect(s.spends).toHaveLength(1)
    expect(s.spends[0].note).toHaveLength(60)
    expect(s.targets).toEqual([{ id: "t", name: "Shoes", price: 90 }])
    expect(parseRecordTool("junk")).toEqual({ spends: [], targets: [] })
  })
})

describe("robustness and cents", () => {
  it("skips malformed Black Box rows instead of crashing", () => {
    const bad = {
      version: 1,
      attempts: [run("a", "2026-10-29", null, null), run("x", "not-a-day", null, null), run("y", "2026-10-01", "2026-13-45", null)],
      reports: [rep("ok", "a", "2026-11-10", false, "fine"), { ...rep("r1", "a", "2026-11-11", false, "x"), at: "garbage" }, { ...rep("r2", "a", "2026-11-11", false, "x"), at: undefined as unknown as string }],
    } as BlackBoxRecord
    const v = viewOf(bad, "nicotine", TODAY)
    expect(v.runs).toHaveLength(1)
    expect(v.closeCalls).toBe(1)
    expect(v.total).toBe(22)
  })
  it("a day held by two runs is listed once for the milestones, the Black Box total stays", () => {
    const two: BlackBoxRecord = { version: 1, attempts: [run("a", "2026-11-10", "2026-11-12", "s"), run("b", "2026-11-12", null, null)], reports: [rep("s", "a", "2026-11-12", true, "")] }
    const v = viewOf(two, "nicotine", TODAY)
    expect(v.total).toBe(3 + 8)
    expect(v.cleanDays).toHaveLength(10)
    expect(new Set(v.cleanDays).size).toBe(v.cleanDays.length)
  })
  it("rounds to cents; below one cent is refused", () => {
    expect(toCents(0.004)).toBeNull()
    expect(toCents(0.005)).toBe(0.01)
    expect(toCents(12.345)).toBe(12.35)
    expect(toCents(0)).toBeNull()
  })
  it("the counter counts from 00:00 of the first day on the calendar line", () => {
    expect(elapsedSince("2026-11-12", new Date(2026, 10, 19, 10, 0, 1).getTime())).toBe(7 * 86_400_000 + 10 * 3_600_000 + 1000)
    expect(elapsedSince("2026-11-25", new Date(2026, 10, 19).getTime())).toBe(0)
  })
})

describe("one count for the milestones and the next step", () => {
  it("uses the de-duplicated list; the ring keeps the Black Box total", () => {
    const two: BlackBoxRecord = { version: 1, attempts: [run("a", "2026-11-10", "2026-11-12", "s"), run("b", "2026-11-12", null, null)], reports: [rep("s", "a", "2026-11-12", true, "")] }
    const v = viewOf(two, "nicotine", TODAY)
    expect(v.total).toBe(11)
    expect(v.uniqueTotal).toBe(10)
    const steps = dayMilestones(v, TODAY)
    expect(steps.find((x) => x.threshold === 14)).toMatchObject({ toGo: 4, projected: "2026-11-23" })
    expect(steps.find((x) => x.threshold === 7)?.date).toBe(v.cleanDays[6])
  })
})

describe("numbers typed in the tool's inputs", () => {
  it("a comma followed by three digits is a thousands separator, 7,50 is 7.50", () => {
    expect(parseAmount("1,000", 100_000)).toEqual({ kind: "ok", value: 1000 })
    expect(parseAmount("12,345.50", 100_000)).toEqual({ kind: "ok", value: 12345.5 })
    expect(parseAmount("7,50", 1000)).toEqual({ kind: "ok", value: 7.5 })
    expect(parseAmount("0,5", 500)).toEqual({ kind: "ok", value: 0.5 })
    expect(parseAmount("", 500)).toEqual({ kind: "empty" })
    expect(parseAmount("abc", 500)).toEqual({ kind: "bad" })
    expect(parseAmount("1,00,0", 500)).toEqual({ kind: "bad" })
  })
  it("a number above the limit is big, so the error can name the limit", () => {
    expect(parseAmount("501", 500)).toEqual({ kind: "big" })
    expect(parseAmount("1,001", 1000)).toEqual({ kind: "big" })
    expect(parseAmount("100001", 100_000)).toEqual({ kind: "big" })
    expect(parseAmount("-5", 500)).toEqual({ kind: "bad" })
  })
  it("counts shown are at most 2 decimals", () => {
    expect(fmtCount(0.42857142857142855)).toBe("0.43")
    expect(fmtCount(10)).toBe("10")
    expect(fmtCount(7.5)).toBe("7.5")
  })
})

describe("dates outside this year show the year", () => {
  it("fmtDay", () => {
    expect(fmtDay("2026-11-12", "2026-11-19")).toBe("Thu, Nov 12")
    expect(fmtDay("2027-10-04", "2026-11-19")).toBe("Mon, Oct 4, 2027")
  })
})

describe("spending inside a window starts where the clean time starts", () => {
  const spends = [{ id: "a", day: "2026-11-12", amount: 5, note: "" }, { id: "b", day: "2026-11-13", amount: 7, note: "" }]
  it("a spend dated on the start day counts only when the window starts at midnight", () => {
    expect(spentInPeriod(spends, 7, new Date(2026, 10, 19, 10).getTime())).toBe(7)
    expect(spentInPeriod(spends, 7, new Date(2026, 10, 19, 0, 0, 0).getTime())).toBe(12)
  })
})
