import { describe, expect, it } from "vitest"
import nicotine from "@/src/quit/data/nicotine.json"
import type { ViceAttempt, ViceReport } from "@/src/vice/types"
import type { QuitAddictionFull } from "@/src/quit/types"
import { runDays } from "@/src/vice/blackboxService"
import {
  EMPTY_SLIP,
  day1Day,
  day1Options,
  dayAllowed,
  dayMin,
  dayWords,
  daysCard,
  daysWord,
  decide,
  describesLatest,
  firstUnanswered,
  keepsState,
  lieOf,
  parseSlip,
  placeOf,
  whenChoices,
  type SlipState,
} from "@/src/quit/tools/slip/logic"

const data = nicotine as unknown as QuitAddictionFull
const TODAY = "2026-11-19"

let n = 0
function attempt(startedOn: string, endedOn: string | null = null, endedByReportId: string | null = null): ViceAttempt {
  return { id: `a${++n}`, viceId: "nicotine", label: "x", startedOn, startedBy: "", structure: [], endedOn, endedByReportId, updatedAt: "2026-11-01T00:00:00.000Z", deletedAt: null }
}
function rep(attemptId: string, at: string, wentThrough: boolean, where = "", thought = ""): ViceReport {
  return { id: `r${++n}`, attemptId, at, wentThrough, thought, ending: "other", closeness: null, withWhom: "", where, factors: [], didInstead: "", updatedAt: "2026-11-01T00:00:00.000Z", deletedAt: null }
}

describe("slip cases", () => {
  it("A: a living run asks the questions, and the date screen when more than today is possible", () => {
    const run = attempt("2026-10-30")
    expect(decide({ runs: [run], reports: [], quitDate: null, today: TODAY })).toEqual({ kase: "A", startOn: null, slipId: null, min: "2026-10-30", steps: ["when", "where", "voice"] })
  })
  it("A: a run started today skips the date screen", () => {
    const run = attempt(TODAY)
    expect(decide({ runs: [run], reports: [], quitDate: TODAY, today: TODAY }).steps).toEqual(["where", "voice"])
  })
  it("A: the earliest day is the later of the run's start and its latest report, close calls included", () => {
    const run = attempt("2026-10-30")
    const other = attempt("2026-01-01", "2026-02-01")
    expect(dayMin(run, [rep(run.id, "2026-11-17T09:00:00", false), rep(run.id, "2026-11-03T09:00:00", false), rep(other.id, "2026-12-30T09:00:00", true)])).toBe("2026-11-17")
    expect(dayMin(run, [])).toBe("2026-10-30")
    // a close call yesterday leaves today and yesterday only: the screen still shows
    expect(decide({ runs: [run], reports: [rep(run.id, "2026-11-18T09:00:00", false)], quitDate: null, today: TODAY }).steps).toEqual(["when", "where", "voice"])
    // a close call today leaves today only
    expect(decide({ runs: [run], reports: [rep(run.id, "2026-11-19T09:00:00", false)], quitDate: null, today: TODAY }).steps).toEqual(["where", "voice"])
  })
  it("B: the latest run ended with a slip and none lives: ask only what the report lacks", () => {
    const run = attempt("2026-10-01", "2026-11-17")
    const slip = rep(run.id, "2026-11-17T12:00:00", true, "", "")
    run.endedByReportId = slip.id
    expect(decide({ runs: [run], reports: [slip], quitDate: null, today: TODAY })).toEqual({ kase: "B", startOn: null, slipId: slip.id, min: null, steps: ["where", "voice"] })
    const voice = { ...slip, thought: "Just one won't hurt" }
    expect(decide({ runs: [run], reports: [voice], quitDate: null, today: TODAY }).steps).toEqual(["where"])
    const place = { ...voice, where: "driving" }
    expect(decide({ runs: [run], reports: [place], quitDate: null, today: TODAY }).steps).toEqual([])
  })
  it("B: a quit date in the future (Tomorrow chosen) is still B", () => {
    const run = attempt("2026-10-01", "2026-11-17")
    const slip = rep(run.id, "2026-11-17T12:00:00", true, "driving", "x")
    run.endedByReportId = slip.id
    expect(decide({ runs: [run], reports: [slip], quitDate: "2026-11-20", today: TODAY }).kase).toBe("B")
  })
  it("a new day 1 that has come starts the run on it, then case A", () => {
    const run = attempt("2026-10-01", "2026-11-18")
    const slip = rep(run.id, "2026-11-18T12:00:00", true, "driving", "x")
    run.endedByReportId = slip.id
    const plan = decide({ runs: [run], reports: [slip], quitDate: TODAY, today: TODAY })
    expect(plan).toMatchObject({ kase: "A", startOn: TODAY, min: TODAY, steps: ["where", "voice"] })
    // the quit date has to be after the last slip day: a date on or before it starts nothing
    expect(decide({ runs: [run], reports: [slip], quitDate: "2026-11-18", today: TODAY }).kase).toBe("B")
    expect(decide({ runs: [run], reports: [slip], quitDate: "2026-11-12", today: TODAY }).startOn).toBeNull()
  })
  it("C: no run at all", () => {
    expect(decide({ runs: [], reports: [], quitDate: null, today: TODAY })).toEqual({ kase: "C", startOn: null, slipId: null, min: null, steps: ["where", "voice"] })
    expect(decide({ runs: [], reports: [], quitDate: "2026-11-25", today: TODAY }).kase).toBe("C")
  })
  it("C: a quit date today or past starts the run on it, then case A", () => {
    expect(decide({ runs: [], reports: [], quitDate: "2026-11-10", today: TODAY })).toMatchObject({ kase: "A", startOn: "2026-11-10", min: "2026-11-10", steps: ["when", "where", "voice"] })
    expect(decide({ runs: [], reports: [], quitDate: TODAY, today: TODAY }).startOn).toBe(TODAY)
  })
})

describe("slip date screen", () => {
  it("shows only the chips the Black Box would take", () => {
    expect(whenChoices("2026-10-30", TODAY).map((c) => c.id)).toEqual(["today", "yesterday", "another"])
    expect(whenChoices("2026-11-18", TODAY).map((c) => c.id)).toEqual(["today", "yesterday"])
    expect(whenChoices("2026-11-17", TODAY).map((c) => c.id)).toEqual(["today", "yesterday", "another"])
    expect(whenChoices(TODAY, TODAY).map((c) => c.id)).toEqual(["today"])
    expect(whenChoices("2026-11-30", TODAY).map((c) => c.id)).toEqual(["today"])
  })
  it("the chips carry their day", () => {
    const c = whenChoices("2026-10-30", TODAY)
    expect(c[0].day).toBe(TODAY)
    expect(c[1].day).toBe("2026-11-18")
    expect(c[2].day).toBeNull()
  })
  it("the date field takes a real day from the start to today", () => {
    expect(dayAllowed("2026-10-30", "2026-10-30", TODAY)).toBe(true)
    expect(dayAllowed("2026-10-29", "2026-10-30", TODAY)).toBe(false)
    expect(dayAllowed(TODAY, "2026-10-30", TODAY)).toBe(true)
    expect(dayAllowed("2026-11-20", "2026-10-30", TODAY)).toBe(false)
    expect(dayAllowed("2026-02-31", "2026-01-01", TODAY)).toBe(false)
    expect(dayAllowed(null, "2026-10-30", TODAY)).toBe(false)
  })
})

describe("slip day 1", () => {
  it("offers Today only when the slip day is before today", () => {
    expect(day1Options("2026-11-18", TODAY)).toEqual(["today", "tomorrow"])
    expect(day1Options(TODAY, TODAY)).toEqual(["tomorrow"])
    expect(day1Options(null, TODAY)).toEqual(["today", "tomorrow"])
  })
  it("fixes the day", () => {
    expect(day1Day("today", TODAY)).toBe(TODAY)
    expect(day1Day("tomorrow", TODAY)).toBe("2026-11-20")
    expect(day1Day("tomorrow", "2026-11-30")).toBe("2026-12-01")
  })
})

describe("slip days card", () => {
  it("counts like the Black Box: first and last day, both counted", () => {
    const ended = attempt("2026-10-30", "2026-11-18")
    const card = daysCard(ended, [ended], TODAY)
    expect(card).toEqual({ start: "2026-10-30", end: "2026-11-18", days: 20, all: null })
    expect(card!.days).toBe(runDays(ended, TODAY))
    expect(daysCard(attempt("2026-11-18", "2026-11-18"), [], TODAY)!.days).toBe(1)
  })
  it("sums every run when there is more than one", () => {
    const a = attempt("2026-09-01", "2026-09-10")
    const b = attempt("2026-10-30", "2026-11-18")
    const c = attempt(TODAY)
    expect(daysCard(b, [a, b], TODAY)!.all).toBe(10 + 20)
    expect(daysCard(b, [a, b, c], TODAY)!.all).toBe(10 + 20 + 1)
  })
  it("has no card without an ended run", () => {
    expect(daysCard(undefined, [], TODAY)).toBeNull()
    expect(daysCard(attempt("2026-11-01"), [], TODAY)).toBeNull()
  })
  it("writes days as words, never ISO", () => {
    expect(dayWords("2026-10-29")).toBe("Thu 29 Oct")
    expect(dayWords("2026-11-19")).toBe("Thu 19 Nov")
    expect(daysWord(1)).toBe("1 day")
    expect(daysWord(21)).toBe("21 days")
  })
})

describe("slip visits", () => {
  function slipped() {
    const run = attempt("2026-10-30", "2026-11-18")
    const slip = rep(run.id, "2026-11-18T12:00:00", true, "driving", "Just one won't hurt")
    run.endedByReportId = slip.id
    return { run, slip }
  }
  const mine = (over: Partial<SlipState> = {}): SlipState => ({ ...EMPTY_SLIP, kase: "A", steps: ["when", "where", "voice"], done: 3, slipId: "x", ...over })

  it("a result describes the latest slip while no run lives", () => {
    const { run, slip } = slipped()
    expect(describesLatest(mine({ slipId: slip.id }), [run], [slip])).toBe(true)
  })
  it("a result is stale once the report is gone, or another run lives", () => {
    const { run, slip } = slipped()
    expect(describesLatest(mine({ slipId: slip.id }), [run], [])).toBe(false)
    expect(describesLatest(mine({ slipId: slip.id }), [{ ...run, endedOn: null, endedByReportId: null }], [slip])).toBe(false)
    expect(describesLatest(mine({ slipId: slip.id }), [run, attempt("2026-11-19")], [slip])).toBe(false)
    expect(describesLatest(mine({ slipId: "other" }), [run], [slip])).toBe(false)
  })
  it("the day 1 run this visit started does not make the result stale", () => {
    const { run, slip } = slipped()
    const fresh = attempt(TODAY)
    expect(describesLatest(mine({ slipId: slip.id, day1: "today", day1On: TODAY }), [run, fresh], [slip])).toBe(true)
    expect(describesLatest(mine({ slipId: slip.id, day1: "today", day1On: "2026-11-01" }), [run, fresh], [slip])).toBe(false)
  })
  it("a visit with a due new day 1 starts fresh: Tomorrow chosen yesterday", () => {
    const { run, slip } = slipped()
    const state = mine({ slipId: slip.id, day1: "tomorrow", day1On: TODAY })
    const plan = decide({ runs: [run], reports: [slip], quitDate: TODAY, today: TODAY })
    expect(plan.startOn).toBe(TODAY)
    expect(keepsState(state, plan, [run], [slip], Date.now())).toBe(false)
    // before the day, the same state is kept
    const early = decide({ runs: [run], reports: [slip], quitDate: "2026-11-20", today: TODAY })
    expect(keepsState(state, early, [run], [slip], Date.now())).toBe(true)
  })
  it("half answers carry for an hour, then the visit is new", () => {
    const run = attempt("2026-10-30")
    const plan = decide({ runs: [run], reports: [], quitDate: null, today: TODAY })
    const half = mine({ slipId: null, done: 1, touched: 1_000_000 })
    expect(keepsState(half, plan, [run], [], 1_000_000 + 59 * 60_000)).toBe(true)
    expect(keepsState(half, plan, [run], [], 1_000_000 + 61 * 60_000)).toBe(false)
    expect(keepsState(EMPTY_SLIP, plan, [run], [], 1_000_000)).toBe(false)
  })
  it("a living run this tool did not start never shows an old result with no slip filed", () => {
    const run = attempt("2026-10-30")
    const plan = decide({ runs: [run], reports: [], quitDate: null, today: TODAY })
    expect(keepsState(mine({ slipId: null, done: 3, touched: 1 }), plan, [run], [], 5)).toBe(false)
  })
  it("case C keeps its finished result", () => {
    const plan = decide({ runs: [], reports: [], quitDate: null, today: TODAY })
    expect(keepsState({ ...EMPTY_SLIP, kase: "C", steps: ["where", "voice"], done: 2, touched: 1 }, plan, [], [], 1e12)).toBe(true)
  })
  it("resumes at the first screen not passed", () => {
    expect(firstUnanswered({ ...EMPTY_SLIP, steps: ["when", "where", "voice"] })).toBe(1)
    expect(firstUnanswered({ ...EMPTY_SLIP, steps: ["when", "where", "voice"], done: 2 })).toBe(3)
    expect(firstUnanswered({ ...EMPTY_SLIP, steps: ["where", "voice"], done: 3 })).toBe(3)
    expect(firstUnanswered({ ...EMPTY_SLIP, steps: [] })).toBe(1)
  })
})

describe("slip answers read back", () => {
  it("the lie is the one named, else the one whose short line the filed thought matches", () => {
    const beliefs = data.beliefs
    expect(lieOf("b4", "", beliefs)?.id).toBe("b4")
    expect(lieOf(null, beliefs[2].short as string, beliefs)?.id).toBe(beliefs[2].id)
    expect(lieOf("other", "my own words", beliefs)).toBeNull()
    expect(lieOf("skip", "", beliefs)).toBeNull()
    // an id that is not a belief falls back to the thought
    expect(lieOf("zzz", beliefs[0].short as string, beliefs)?.id).toBe(beliefs[0].id)
  })
  it("the place is the answer of this visit, else the filed one, never a made-up id", () => {
    const ids = data.riskyMoments.map((m) => m.id)
    expect(placeOf("driving", "", ids)).toBe("driving")
    expect(placeOf("else", "coffee", ids)).toBe("coffee")
    expect(placeOf("skip", "", ids)).toBeNull()
    expect(placeOf(null, "nowhere", ids)).toBeNull()
  })
})

describe("slip saved state", () => {
  it("junk gives the empty state", () => {
    for (const j of [null, undefined, 5, "x", [], { steps: "x", done: -3, kase: "Z", pick: 4, day: "tomorrow" }]) expect(parseSlip(j)).toEqual(EMPTY_SLIP)
  })
  it("keeps a good state and drops bad parts", () => {
    const s = parseSlip({ kase: "A", steps: ["when", "bad", "voice"], done: 2, touched: 5, min: "2026-10-30", pick: "another", day: "2026-11-01", where: "driving", told: "b3", ownWords: "x".repeat(200), slipId: "r1", day1: "today", day1On: "2026-11-19", quitBefore: { date: null } })
    expect(s).toMatchObject({ kase: "A", steps: ["when", "voice"], done: 2, touched: 5, min: "2026-10-30", pick: "another", day: "2026-11-01", where: "driving", told: "b3", slipId: "r1", day1: "today", day1On: "2026-11-19", quitBefore: { date: null } })
    expect(s.ownWords).toHaveLength(80)
  })
})
