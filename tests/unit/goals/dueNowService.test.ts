import { describe, it, expect } from "vitest"
import { addGoal, emptyNsPlan, planProgress, setAnswer, setNorthStar, setValues, updateGoal } from "@/src/goals/northStarService"
import { periodOf, writeReview } from "@/src/goals/reviewService"
import { dueNow, type DueCard, type DueOptions, type DuePlanProgress } from "@/src/goals/dueNowService"
import { PROGRESS_COPY, RAIL_COPY } from "@/src/goals/data/northStar"
import { COMMIT_DATE_KEY, COMMIT_KEY } from "@/src/goals/data/northStarStart"
import type { NsPlan } from "@/src/goals/types"

/** 2026-11-09 is a Monday. */
const AREA = emptyNsPlan().areas[0].id
const opts = (over: Partial<DueOptions> = {}): DueOptions => ({ reviewDay: 7, hidden: new Set(), progress: null, ...over })
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

})

/** What the plan page hands the cards: the plan's own progress, worked out by planProgress. */
function progressOf(plan: NsPlan): DuePlanProgress {
  const p = planProgress(plan)
  return { percent: p.percent, mostLeft: p.mostLeft, mostLeftDetail: p.mostLeft ? PROGRESS_COPY.detail(p.steps[p.mostLeft].parts) : "" }
}

describe("the plan's percentage card", () => {
  it("says how much of the plan is done and opens the step with the most left", () => {
    // North star 1/2, values 1/3, the rest 0: 11 %. Your 10s is the first step at 0 %.
    const plan = setValues(setNorthStar(emptyNsPlan(), "A paragraph.", "2026-11-18T09:00:00.000Z"), ["Freedom"], "2026-11-18T09:00:00.000Z")
    const cards = dueNow(plan, "2026-11-18", opts({ progress: progressOf(plan) }))
    expect(kinds(cards)).toEqual(["finish-setup"])
    expect(cards[0].title).toBe("Your plan is 11 % done")
    expect(cards[0].detail).toBe("Most left: Your 10s, 0 of 12 areas rated.")
    expect(cards[0].go).toEqual({ tab: "now" })
    expect(cards[0].percent).toBe(11)
    expect(cards[0].key).toBe("finish-setup:2026-11-16")
  })

  it("stays after the commitment is dated while steps are unfinished", () => {
    let plan = setAnswer(emptyNsPlan(), COMMIT_KEY, "I am doing this", "2026-11-18T09:00:00.000Z")
    plan = setAnswer(plan, COMMIT_DATE_KEY, "2026-11-18", "2026-11-18T09:00:00.000Z")
    expect(kinds(dueNow(plan, "2026-11-18", opts({ progress: progressOf(plan) })))).toEqual(["finish-setup"])
  })

  it("goes at 100 %, and without a progress there is no card", () => {
    expect(kinds(dueNow(emptyNsPlan(), "2026-11-18", opts({ progress: { percent: 100, mostLeft: null, mostLeftDetail: "" } })))).toEqual([])
    expect(kinds(dueNow(emptyNsPlan(), "2026-11-18", opts()))).toEqual([])
  })

  it("is hidden by Not now for the week", () => {
    const plan = emptyNsPlan()
    expect(kinds(dueNow(plan, "2026-11-18", opts({ progress: progressOf(plan), hidden: new Set(["finish-setup:2026-11-16"]) })))).toEqual([])
  })
})

describe("what is left, in words", () => {
  it("names the part with the most missing", () => {
    expect(PROGRESS_COPY.detail([{ label: "Values ranked", have: 0, of: 3, weight: 1 }])).toBe("0 of 3 values ranked")
    expect(
      PROGRESS_COPY.detail([
        { label: "North star paragraph", have: 0, of: 1, weight: 1 / 2 },
        { label: "Ladder questions answered", have: 7, of: 7, weight: 1 / 2 },
      ]),
    ).toBe("north star paragraph still to write")
  })

  it("on a step of single boxes, counts them and names the next", () => {
    const parts = ["Season areas", "Focus area", "One-thing sentence"].map((label, i) => ({ label, have: i === 1 ? 0 : 1, of: 1, weight: 1 / 3 }))
    expect(PROGRESS_COPY.detail(parts)).toBe("2 of 3 done, next: focus area")
  })
})

describe("the rail's percentages", () => {
  it("puts the percentage and what is left under a step, and says when it is full", () => {
    expect(PROGRESS_COPY.railLine(2 / 3, [{ label: "Values ranked", have: 2, of: 3, weight: 1 }])).toBe("66 % · 2 of 3 values ranked")
    expect(PROGRESS_COPY.railLine(1, [{ label: "Values ranked", have: 3, of: 3, weight: 1 }])).toBe("100 %, every box filled")
  })

  it("adds the total to Edit your plan, and a step's own to the phone header only on scored steps", () => {
    expect(RAIL_COPY.editPlan(8, 45)).toBe("Edit your plan · 8 steps · 45 %")
    expect(RAIL_COPY.phoneStep(1, 12, "North star", 50)).toBe("Step 1 of 12 · North star · 50 %")
    expect(RAIL_COPY.phoneStep(3, 12, "Where to start")).toBe("Step 3 of 12 · Where to start")
  })
})
