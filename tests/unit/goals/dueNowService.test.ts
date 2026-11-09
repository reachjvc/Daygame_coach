import { describe, it, expect } from "vitest"
import { addGoal, emptyNsPlan, updateGoal } from "@/src/goals/northStarService"
import { periodOf, writeReview, parsePeriodParam } from "@/src/goals/reviewService"
import { dueNow, dueWeekPeriod, nextSetupStep, type DueCard, type DueOptions } from "@/src/goals/dueNowService"
import { BUILD_STEPS, SCORED_TABS } from "@/src/goals/data/northStar"
import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import type { NsStepState } from "@/src/goals/northStarService"

/** 2026-11-09 is a Monday. */
const AREA = emptyNsPlan().areas[0].id
const opts = (over: Partial<DueOptions> = {}): DueOptions => ({ reviewDay: 7, hidden: new Set(), nextStep: null, ...over })
const kinds = (cards: DueCard[]) => cards.map((c) => c.kind)
const periodOfCard = (c: DueCard | undefined) => (c && "tab" in c.go ? c.go.period : undefined)
const withSeason = (plan: NsPlan, endsOn: string | null): NsPlan => ({ ...plan, season: { id: "s1", startedOn: "2026-08-01", endsOn, sentence: "Get fit" } })
const writeWeek = (plan: NsPlan, day: string) => writeReview(plan, periodOf("week", day), { magicMoments: "x" }, day)

describe("the weekly card", () => {
  it("shows on the review day for the week ending that Sunday", () => {
    const cards = dueNow(emptyNsPlan(), "2026-11-15", opts())
    expect(kinds(cards)).toEqual(["week"])
    expect(periodOfCard(cards[0])).toEqual(periodOf("week", "2026-11-09"))
  })

  it("still shows the next day, about the same week", () => {
    const cards = dueNow(emptyNsPlan(), "2026-11-16", opts())
    expect(kinds(cards)).toEqual(["week"])
    expect(periodOfCard(cards[0])).toEqual(periodOf("week", "2026-11-09"))
  })

  it("goes away once that week is written", () => {
    expect(kinds(dueNow(writeWeek(emptyNsPlan(), "2026-11-15"), "2026-11-16", opts()))).toEqual([])
  })

  it("stays when that week holds only a score", () => {
    const plan = writeReview(emptyNsPlan(), periodOf("week", "2026-11-09"), { score: { areaId: AREA, value: 4 } }, "2026-11-15")
    expect(kinds(dueNow(plan, "2026-11-16", opts()))).toEqual(["week"])
  })

  it("is gone three days after the review day", () => {
    expect(kinds(dueNow(emptyNsPlan(), "2026-11-18", opts()))).toEqual([])
  })

  it("on a Wednesday review day looks back at the last full week", () => {
    const cards = dueNow(emptyNsPlan(), "2026-11-18", opts({ reviewDay: 3 }))
    expect(kinds(cards)).toEqual(["week"])
    expect(periodOfCard(cards[0])).toEqual(periodOf("week", "2026-11-09"))
  })

  it("on a Friday review day looks back at the week it falls in", () => {
    const cards = dueNow(emptyNsPlan(), "2026-11-20", opts({ reviewDay: 5 }))
    expect(kinds(cards)).toEqual(["week"])
    expect(periodOfCard(cards[0])).toEqual(periodOf("week", "2026-11-16"))
  })

  it("is hidden by Not now for that week", () => {
    expect(kinds(dueNow(emptyNsPlan(), "2026-11-16", opts({ hidden: new Set(["week:2026-11-09"]) })))).toEqual([])
  })
})

describe("the month, quarter and year cards", () => {
  it("the last day of a month brings the month, and the week before it", () => {
    const cards = dueNow(emptyNsPlan(), "2026-11-30", opts())
    expect(kinds(cards)).toEqual(["month", "week"])
    expect(periodOfCard(cards[0])).toEqual(periodOf("month", "2026-11-01"))
    expect(periodOfCard(cards[1])).toEqual(periodOf("week", "2026-11-23"))
  })

  it("the first days of a month still ask about the month before", () => {
    expect(kinds(dueNow(emptyNsPlan(), "2026-12-01", opts()))).toEqual(["month", "week"])
  })

  it("from 26 December the year comes first", () => {
    expect(kinds(dueNow(emptyNsPlan(), "2026-12-28", opts()))).toEqual(["year", "week"])
  })

  it("in January, once the year is written, Plan the new year leads", () => {
    const plan = writeReview(emptyNsPlan(), periodOf("year", "2026-06-01"), { magicMoments: "x" }, "2026-12-31")
    expect(kinds(dueNow(plan, "2027-01-05", opts()))).toEqual(["new-year", "quarter", "month"])
  })

  it("Done on Plan the new year lets the week through", () => {
    const plan = writeReview(emptyNsPlan(), periodOf("year", "2026-06-01"), { magicMoments: "x" }, "2026-12-31")
    expect(kinds(dueNow(plan, "2027-01-05", opts({ hidden: new Set(["new-year:2027"]) })))).toEqual(["quarter", "month", "week"])
  })
})

describe("the season and goals cards", () => {
  it("an ended season leads, cut at three", () => {
    expect(kinds(dueNow(withSeason(emptyNsPlan(), "2027-01-01"), "2027-01-05", opts()))).toEqual(["season-ended", "year", "quarter"])
  })

  it("a season that ended last week", () => {
    expect(kinds(dueNow(withSeason(emptyNsPlan(), "2026-11-15"), "2026-11-18", opts()))).toEqual(["season-ended"])
  })

  it("a season ending within a week", () => {
    const cards = dueNow(withSeason(emptyNsPlan(), "2026-11-25"), "2026-11-18", opts())
    expect(kinds(cards)).toEqual(["season-ending"])
    expect(cards[0].title).toBe("Your season ends in 7 days")
  })

  it("a season until I say so never asks", () => {
    expect(kinds(dueNow(withSeason(emptyNsPlan(), null), "2026-11-18", opts()))).toEqual([])
  })

  it("goals past their date, paused ones left out", () => {
    let plan = emptyNsPlan()
    for (const title of ["Run a 10k", "Read 12 books", "Learn Spanish"]) plan = addGoal(plan, AREA, title)
    plan = plan.goals.reduce((p, g) => updateGoal(p, g.id, { targetDate: "2026-11-01" }), plan)
    plan = updateGoal(plan, plan.goals[2].id, { status: "paused" })
    const cards = dueNow(plan, "2026-11-18", opts())
    expect(kinds(cards)).toEqual(["goals-passed"])
    expect(cards[0].title).toBe("2 goals passed their date")
  })

  it("an unfinished plan points at the next step", () => {
    const cards = dueNow(emptyNsPlan(), "2026-11-18", opts({ nextStep: "now" }))
    expect(kinds(cards)).toEqual(["finish-setup"])
    expect(cards[0].detail).toBe("Next: step 2, Your 10s.")
  })
})

describe("the next setup step", () => {
  it("is none once committed", () => {
    expect(nextSetupStep(true, {})).toBeNull()
  })

  it("is the first scored setup step not done", () => {
    expect(nextSetupStep(false, { star: "done", now: "started" })).toBe("now")
  })

  it("is Everything when every other scored setup step is done, and none once that is too", () => {
    const scored = BUILD_STEPS.filter((t) => SCORED_TABS.includes(t))
    const allDone = Object.fromEntries(scored.map((t) => [t, "done"])) as Partial<Record<NorthStarTabId, NsStepState>>
    const withoutRecap = { ...allDone, recap: "started" as const }
    expect(scored).toContain("recap")
    expect(nextSetupStep(false, withoutRecap)).toBe("recap")
    expect(nextSetupStep(false, allDone)).toBe("recap")
  })
})

describe("a period in the address", () => {
  it("reads a week that starts on its Monday", () => {
    expect(parsePeriodParam("week-2026-11-09")).toEqual(periodOf("week", "2026-11-09"))
  })
  it("refuses a week that does not start on its first day", () => {
    expect(parsePeriodParam("week-2026-11-10")).toBeNull()
  })
  it("refuses a day that does not exist, without throwing", () => {
    expect(parsePeriodParam("week-2026-02-31")).toBeNull()
  })
  it("refuses a kind nobody can start", () => {
    expect(parsePeriodParam("fortnight-2026-11-09")).toBeNull()
  })
  it("is null with nothing given", () => {
    expect(parsePeriodParam(undefined)).toBeNull()
  })
  it("the review link names the same week as the card", () => {
    expect(dueWeekPeriod("2026-11-16", 7)).toEqual(periodOf("week", "2026-11-09"))
  })
})
