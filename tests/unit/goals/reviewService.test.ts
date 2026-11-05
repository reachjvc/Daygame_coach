import { describe, it, expect } from "vitest"
import { emptyNsPlan, normalizeNsPlan, planIsUntouched, removeArea, serializeNsPlan, setAreaReview, wheelRatings } from "@/src/goals/northStarService"
import { planHasNothingWritten } from "@/src/goals/lifePlanSync"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import {
  agoLabel,
  appendToReview,
  averageScore,
  lastReviewOf,
  lastScores,
  latestScores,
  periodLabel,
  periodOf,
  rateArea,
  readReviews,
  removeReview,
  reviewFor,
  ratedAreaCount,
  reviewsOf,
  scoreAge,
  scoredReviews,
  shiftPeriod,
  writeReview,
} from "@/src/goals/reviewService"
import type { NsPlan } from "@/src/goals/types"

const NOW = "2026-11-04T09:00:00.000Z"
// A Wednesday.
const TODAY = "2026-11-04"

function rows(plan: NsPlan) {
  const minted = new Map<string, string>()
  let n = 0
  return planToRows(plan, {
    planId: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    idFor: (l) => minted.get(l) ?? minted.set(l, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`).get(l)!,
  })
}

describe("the periods a review looks back over", () => {
  it("runs a week Monday to Sunday, and a Sunday belongs to the week before it", () => {
    expect(periodOf("week", TODAY)).toEqual({ cadence: "week", start: "2026-11-02", end: "2026-11-08" })
    expect(periodOf("week", "2026-11-08")).toEqual({ cadence: "week", start: "2026-11-02", end: "2026-11-08" })
    expect(periodOf("week", "2026-11-09").start).toBe("2026-11-09")
  })

  it("cuts months, quarters and years on the calendar, short months and leap years included", () => {
    expect(periodOf("month", "2028-02-10")).toEqual({ cadence: "month", start: "2028-02-01", end: "2028-02-29" })
    expect(periodOf("quarter", TODAY)).toEqual({ cadence: "quarter", start: "2026-10-01", end: "2026-12-31" })
    expect(periodOf("quarter", "2026-03-31")).toEqual({ cadence: "quarter", start: "2026-01-01", end: "2026-03-31" })
    expect(periodOf("year", TODAY)).toEqual({ cadence: "year", start: "2026-01-01", end: "2026-12-31" })
  })

  it("steps back and forward across a year's turn", () => {
    expect(shiftPeriod(periodOf("week", "2026-01-01"), -1)).toEqual({ cadence: "week", start: "2025-12-22", end: "2025-12-28" })
    expect(shiftPeriod(periodOf("month", "2026-01-15"), -1).start).toBe("2025-12-01")
    expect(shiftPeriod(periodOf("quarter", "2026-11-04"), 1)).toEqual({ cadence: "quarter", start: "2027-01-01", end: "2027-03-31" })
    expect(shiftPeriod(periodOf("year", TODAY), -1).start).toBe("2025-01-01")
  })

  it("says what it covers in words", () => {
    expect(periodLabel(periodOf("week", TODAY))).toBe("2 – 8 Nov 2026")
    expect(periodLabel(periodOf("week", "2026-10-28"))).toBe("26 Oct – 1 Nov 2026")
    expect(periodLabel(periodOf("week", "2026-12-30"))).toBe("28 Dec 2026 – 3 Jan 2027")
    expect(periodLabel(periodOf("month", TODAY))).toBe("November 2026")
    expect(periodLabel(periodOf("quarter", TODAY))).toBe("Q4 2026")
    expect(agoLabel("2026-10-26", TODAY)).toBe("9 days ago")
    expect(agoLabel(TODAY, TODAY)).toBe("today")
  })
})

describe("writing a review", () => {
  const week = periodOf("week", TODAY)

  it("makes it on the first score, and keeps one review per period", () => {
    let plan = writeReview(emptyNsPlan(), week, { score: { areaId: "lm_health", value: 6 } }, TODAY, NOW)
    plan = writeReview(plan, week, { magicMoments: "The long walk." }, TODAY, NOW)
    expect(plan.reviews).toHaveLength(1)
    expect(reviewFor(plan, week)).toMatchObject({
      id: "week-2026-11-02", cadence: "week", periodStart: "2026-11-02", periodEnd: "2026-11-08",
      writtenOn: TODAY, scores: { lm_health: 6 }, magicMoments: "The long walk.",
    })
    expect(planIsUntouched(plan)).toBe(false)
    expect(planHasNothingWritten(plan)).toBe(false)
  })

  it("leaves nothing behind when the last thing in it is taken out", () => {
    let plan = writeReview(emptyNsPlan(), week, { score: { areaId: "lm_health", value: 6 } }, TODAY, NOW)
    plan = writeReview(plan, week, { score: { areaId: "lm_health", value: null } }, TODAY, NOW)
    expect(plan.reviews).toEqual([])
    // Clearing a box on a period with no review writes nothing at all.
    const untouched = emptyNsPlan()
    expect(writeReview(untouched, week, { lessons: "  " }, TODAY, NOW)).toBe(untouched)
  })

  it("refuses a score off the scale or for an area the plan does not have", () => {
    const plan = emptyNsPlan()
    expect(writeReview(plan, week, { score: { areaId: "lm_health", value: 11 } }, TODAY, NOW)).toBe(plan)
    expect(writeReview(plan, week, { score: { areaId: "lm_health", value: 2.5 } }, TODAY, NOW)).toBe(plan)
    expect(writeReview(plan, week, { score: { areaId: "nope", value: 5 } }, TODAY, NOW)).toBe(plan)
  })

  it("lists them newest first, says which came last, and what each area scored last time", () => {
    const lastWeek = shiftPeriod(week, -1)
    let plan = writeReview(emptyNsPlan(), lastWeek, { score: { areaId: "lm_health", value: 4 } }, "2026-11-01", NOW)
    plan = writeReview(plan, week, { score: { areaId: "lm_health", value: 7 } }, TODAY, NOW)
    plan = writeReview(plan, periodOf("month", TODAY), { score: { areaId: "lm_money", value: 3 } }, TODAY, NOW)
    expect(reviewsOf(plan, "week").map((r) => r.periodStart)).toEqual(["2026-11-02", "2026-10-26"])
    expect(lastReviewOf(plan, "week")?.id).toBe("week-2026-11-02")
    expect(lastReviewOf(plan, "year")).toBeNull()
    // Before this week: the week before scored health; nothing earlier scored money.
    const before = lastScores(plan, week.start)
    expect(before.lm_health.score).toBe(4)
    expect(before.lm_money).toBeUndefined()
    // Ordered by the day each ends: the month is the newest, not the oldest.
    expect(scoredReviews(plan).map((r) => r.id)).toEqual(["week-2026-10-26", "week-2026-11-02", "month-2026-11-01"])
  })

  it("names as last the one written most recently, not the newest period", () => {
    let plan = writeReview(emptyNsPlan(), week, { lessons: "This week." }, "2026-10-30", NOW)
    plan = writeReview(plan, shiftPeriod(week, -1), { lessons: "Caught up on the week before." }, TODAY, NOW)
    expect(lastReviewOf(plan, "week")?.id).toBe("week-2026-10-26")
  })

  it("keeps a long text whole to the character, never half an emoji", () => {
    const long = "a".repeat(99_999) + "😀😀"
    const plan = writeReview(emptyNsPlan(), week, { magicMoments: long }, TODAY, NOW)
    const kept = plan.reviews[0].magicMoments
    expect(Array.from(kept)).toHaveLength(100_000)
    expect(kept.endsWith("a😀")).toBe(true)
  })

  it("averages what it scored", () => {
    let plan = writeReview(emptyNsPlan(), week, { score: { areaId: "lm_health", value: 6 } }, TODAY, NOW)
    plan = writeReview(plan, week, { score: { areaId: "lm_money", value: 3 } }, TODAY, NOW)
    expect(averageScore(plan.reviews[0])).toBe(4.5)
  })

  it("is deleted whole", () => {
    const plan = writeReview(emptyNsPlan(), week, { nextOutcomes: "Three runs." }, TODAY, NOW)
    expect(removeReview(plan, "week-2026-11-02", NOW).reviews).toEqual([])
  })

  it("loses an area's scores when the area goes, keeps the rest, and drops a review left empty", () => {
    let plan = writeReview(emptyNsPlan(), week, { score: { areaId: "lm_health", value: 6 } }, TODAY, NOW)
    plan = writeReview(plan, week, { score: { areaId: "lm_money", value: 3 } }, TODAY, NOW)
    plan = writeReview(plan, shiftPeriod(week, -1), { score: { areaId: "lm_money", value: 5 } }, TODAY, NOW)
    plan = removeArea(plan, "lm_money", NOW)
    expect(plan.reviews.map((r) => [r.id, r.scores])).toEqual([["week-2026-11-02", { lm_health: 6 }]])
  })
})

describe("a review is saved and read back whole", () => {
  it("goes out as a review row and one score row per area, and comes back the same", () => {
    let plan = writeReview(emptyNsPlan(), periodOf("week", TODAY), { score: { areaId: "lm_health", value: 6 } }, TODAY, NOW)
    plan = writeReview(plan, periodOf("week", TODAY), { lessons: "Sleep first." }, TODAY, NOW)
    const out = rows(plan)
    expect(out.reviews).toHaveLength(1)
    expect(out.reviews[0]).toMatchObject({ cadence: "week", period_start: "2026-11-02", period_end: "2026-11-08", lessons: "Sleep first." })
    expect(out.review_scores).toEqual([expect.objectContaining({ review_id: out.reviews[0].id, score: 6 })])
    expect(out.nodes).toContainEqual(expect.objectContaining({ id: out.reviews[0].id, kind: "review", local_id: "review:week-2026-11-02" }))
    expect(rowsToPlan(out)!.reviews).toEqual(plan.reviews)
  })

  it("reads the copied first review the database made", () => {
    const plan = emptyNsPlan()
    const out = rows(plan)
    const health = out.areas[0]
    const back = rowsToPlan({
      ...out,
      nodes: [...out.nodes, { id: "r1", plan_id: out.plan_id, user_id: out.user_id, kind: "review", local_id: "review:fortnight-2026-09-10" }],
      reviews: [{
        id: "r1", user_id: out.user_id, plan_id: out.plan_id, node_kind: "review", cadence: "fortnight",
        period_start: "2026-09-10", period_end: "2026-09-23", written_on: "2026-09-23",
        magic_moments: "", lessons: "", next_outcomes: "",
      }],
      review_scores: [{ user_id: out.user_id, review_id: "r1", area_id: health.id, score: 2 }],
    })!
    expect(back.reviews).toEqual([expect.objectContaining({
      id: "fortnight-2026-09-10", cadence: "fortnight", periodStart: "2026-09-10", scores: { [plan.areas[0].id]: 2 },
    })])
  })

  it("survives the browser copy, and a damaged one is repaired rather than trusted", () => {
    const plan = writeReview(emptyNsPlan(), periodOf("year", TODAY), { magicMoments: "Moved house." }, TODAY, NOW)
    expect(normalizeNsPlan(JSON.parse(serializeNsPlan(plan)))!.reviews).toEqual(plan.reviews)
    const read = readReviews([
      { cadence: "week", periodStart: "2026-11-02", periodEnd: "2026-11-08", scores: { lm_health: 4, gone: 3, lm_money: 40 } },
      { cadence: "week", periodStart: "2026-11-02", periodEnd: "2026-11-08", scores: { lm_health: 9 } },
      { cadence: "daily", periodStart: "2026-11-02", periodEnd: "2026-11-02" },
      { cadence: "month", periodStart: "2026-11-30", periodEnd: "2026-11-01", lessons: "backwards" },
      { cadence: "month", periodStart: "2026-02-30", periodEnd: "2026-03-29", lessons: "not a day" },
      { cadence: "year", periodStart: "2025-01-01", periodEnd: "2025-12-31" },
      "nonsense",
    ], new Set(["lm_health", "lm_money"]))
    expect(read).toEqual([expect.objectContaining({ id: "week-2026-11-02", scores: { lm_health: 4 }, writtenOn: "2026-11-08" })])
  })
})

/**
 * YOUR 10s READS AND RATES THE REVIEWS (the owner, 2026-11-05: "we can go with
 * all your recommendations", card p5-wheel-question). The wheel shows each
 * area's score from the latest review; rating there writes this week's.
 */
describe("Your 10s reads and rates the reviews", () => {
  /** The owner's case: one copied two-week review, from September. */
  function copied(): NsPlan {
    const plan = emptyNsPlan()
    const [health, money] = plan.areas
    return {
      ...plan,
      reviews: readReviews([{
        cadence: "fortnight", periodStart: "2026-09-10", periodEnd: "2026-09-23", writtenOn: "2026-09-23",
        scores: { [health.id]: 5, [money.id]: 2 },
      }], new Set(plan.areas.map((a) => a.id))),
    }
  }

  it("shows the copied first review's scores on the wheel, as the old number did", () => {
    const plan = copied()
    const [health, money, third] = plan.areas
    expect(wheelRatings(plan, TODAY)).toEqual({ [health.id]: 5, [money.id]: 2 })
    expect(latestScores(plan, TODAY)[health.id].review.cadence).toBe("fortnight")
    expect(ratedAreaCount(plan, TODAY)).toBe(2)
    expect(wheelRatings(plan, TODAY)[third.id]).toBeUndefined()
  })

  it("writes a rating into this week's review, the one the Review step opens", () => {
    const [health, money] = copied().areas
    const plan = rateArea(copied(), health.id, 7, TODAY, NOW)
    const week = reviewFor(plan, periodOf("week", TODAY))!
    expect(week.scores).toEqual({ [health.id]: 7 })
    expect(week.scoredOn).toEqual({ [health.id]: TODAY })
    expect(week.writtenOn).toBe(TODAY)
    // Only the area rated moves; the other still shows September's.
    expect(wheelRatings(plan, TODAY)).toEqual({ [health.id]: 7, [money.id]: 2 })
    // The copied review is not touched.
    expect(reviewsOf(plan, "fortnight")[0].scores).toEqual({ [health.id]: 5, [money.id]: 2 })
  })

  it("takes this week's score out again on a second click, and the wheel falls back to the review before", () => {
    const [health] = copied().areas
    const rated = rateArea(copied(), health.id, 7, TODAY, NOW)
    const cleared = rateArea(rated, health.id, null, TODAY, NOW)
    expect(reviewFor(cleared, periodOf("week", TODAY))).toBeNull()
    expect(wheelRatings(cleared, TODAY)[health.id]).toBe(5)
    // With another score left in the week, the cleared one's day goes with it.
    const [, money] = copied().areas
    const both = rateArea(rateArea(rated, money.id, 4, TODAY, NOW), health.id, null, TODAY, NOW)
    expect(reviewFor(both, periodOf("week", TODAY))).toMatchObject({ scores: { [money.id]: 4 }, scoredOn: { [money.id]: TODAY } })
  })

  it("goes by the day a score speaks for, so a later look back beats an early score in a longer period", () => {
    const [health] = emptyNsPlan().areas
    // The code review's case: the November month scored on the 2nd, the week of 2-8 Nov scored on the 9th.
    let plan = writeReview(emptyNsPlan(), periodOf("month", "2026-11-02"), { score: { areaId: health.id, value: 4 } }, "2026-11-02", NOW)
    plan = writeReview(plan, periodOf("week", "2026-11-02"), { score: { areaId: health.id, value: 8 } }, "2026-11-09", NOW)
    expect(latestScores(plan, "2026-11-10")[health.id].score).toBe(8)
    // Filling in October's review afterwards does not make it "now": it speaks for 31 Oct.
    plan = writeReview(plan, periodOf("month", "2026-10-15"), { score: { areaId: health.id, value: 2 } }, "2026-11-10", NOW)
    expect(latestScores(plan, "2026-11-10")[health.id].score).toBe(8)
    expect(scoreAge(latestScores(plan, "2026-11-10")[health.id].review, health.id, "2026-11-10")).toBe(2)
  })

  it("goes by each score's own day inside one week", () => {
    const [health, money] = emptyNsPlan().areas
    // Health rated Monday, the month scored Wednesday, Money rated Friday.
    let plan = rateArea(emptyNsPlan(), health.id, 5, "2026-11-02", NOW)
    plan = writeReview(plan, periodOf("month", TODAY), { score: { areaId: money.id, value: 3 } }, "2026-11-04", NOW)
    plan = rateArea(plan, money.id, 6, "2026-11-06", NOW)
    expect(latestScores(plan, "2026-11-06")[money.id].score).toBe(6)
  })

  it("prefers the shorter kind when two periods start the same day and speak for the same day", () => {
    const [health] = emptyNsPlan().areas
    // June 2026 starts on a Monday: its first week and the month share a first day.
    let plan = writeReview(emptyNsPlan(), periodOf("month", "2026-06-03"), { score: { areaId: health.id, value: 4 } }, "2026-06-03", NOW)
    plan = writeReview(plan, periodOf("week", "2026-06-03"), { score: { areaId: health.id, value: 7 } }, "2026-06-03", NOW)
    expect(latestScores(plan, "2026-06-03")[health.id].score).toBe(7)
    plan = writeReview(emptyNsPlan(), periodOf("week", "2026-06-03"), { score: { areaId: health.id, value: 7 } }, "2026-06-03", NOW)
    plan = writeReview(plan, periodOf("month", "2026-06-03"), { score: { areaId: health.id, value: 4 } }, "2026-06-03", NOW)
    expect(latestScores(plan, "2026-06-03")[health.id].score).toBe(7)
  })

  it("keeps each score's day through a save and through the browser copy", () => {
    const [health] = emptyNsPlan().areas
    const plan = rateArea(emptyNsPlan(), health.id, 6, TODAY, NOW)
    const out = rows(plan)
    expect(out.review_scores).toEqual([expect.objectContaining({ score: 6, scored_on: TODAY })])
    expect(rowsToPlan(out)!.reviews).toEqual(plan.reviews)
    expect(normalizeNsPlan(JSON.parse(serializeNsPlan(plan)))!.reviews).toEqual(plan.reviews)
    // A score saved before the column existed reads back with no day, and still ranks by its review.
    const old = { ...out, review_scores: out.review_scores.map((r) => ({ user_id: r.user_id, review_id: r.review_id, area_id: r.area_id, score: r.score })) }
    expect(rowsToPlan(old)!.reviews[0].scoredOn).toBeUndefined()
  })

  it("reads the review that reaches nearest today: this week over this month over this year", () => {
    const [health] = emptyNsPlan().areas
    const score = (plan: NsPlan, cadence: "week" | "month" | "quarter" | "year", day: string, value: number) =>
      writeReview(plan, periodOf(cadence, day), { score: { areaId: health.id, value } }, day, NOW)
    let plan = score(emptyNsPlan(), "year", TODAY, 3)
    plan = score(plan, "month", TODAY, 4)
    expect(latestScores(plan, TODAY)[health.id].score).toBe(4)
    plan = score(plan, "week", TODAY, 6)
    expect(latestScores(plan, TODAY)[health.id].score).toBe(6)
    // A week that is over loses to a month still running: the month reaches today.
    const lastWeek = score(score(emptyNsPlan(), "week", "2026-10-28", 8), "month", TODAY, 4)
    expect(latestScores(lastWeek, TODAY)[health.id].score).toBe(4)
    // Once the month is over too, the week ending later wins.
    expect(latestScores(score(score(emptyNsPlan(), "month", "2026-09-15", 4), "week", "2026-10-28", 8), TODAY)[health.id].score).toBe(8)
  })

  it("does not read a review of a period that has not begun", () => {
    const [health] = emptyNsPlan().areas
    const plan = writeReview(emptyNsPlan(), periodOf("week", "2026-11-16"), { score: { areaId: health.id, value: 9 } }, "2026-11-16", NOW)
    expect(latestScores(plan, TODAY)).toEqual({})
    // Nor counted as rated: the counts and the wheel agree.
    expect(ratedAreaCount(plan, TODAY)).toBe(0)
  })

  it("drops a removed area's score and the day it was given", () => {
    const [health, money] = emptyNsPlan().areas
    let plan = rateArea(rateArea(emptyNsPlan(), health.id, 6, TODAY, NOW), money.id, 3, TODAY, NOW)
    plan = removeArea(plan, health.id, NOW)
    expect(reviewFor(plan, periodOf("week", TODAY))).toMatchObject({ scores: { [money.id]: 3 }, scoredOn: { [money.id]: TODAY } })
    const textOnly = removeArea(writeReview(rateArea(emptyNsPlan(), health.id, 6, TODAY, NOW), periodOf("week", TODAY), { lessons: "Sleep." }, TODAY, NOW), health.id, NOW)
    expect(reviewFor(textOnly, periodOf("week", TODAY))!.scoredOn).toBeUndefined()
  })

  it("no longer reads or writes the old two-week number, and a save carries it back unchanged", () => {
    const base = emptyNsPlan()
    const [health] = base.areas
    const old = setAreaReview(base, health.id, { fortnight: 6 }, NOW)
    // The old number alone puts nothing on the wheel: Your 10s reads reviews.
    expect(wheelRatings(old, TODAY)).toEqual({})
    const plan = rateArea(old, health.id, 3, TODAY, NOW)
    expect(plan.review[health.id].fortnight).toBe(6)
    // The column keeps its value through a save until Phase 7 drops it.
    const area = rows(plan).areas.find((a) => a.label === health.label)!
    expect(area.review_fortnight).toBe(6)
  })
})

describe("adding lines to a review", () => {
  it("adds each line once, on its own line, after what is there", () => {
    const week = periodOf("week", TODAY)
    let plan = writeReview(emptyNsPlan(), week, { magicMoments: "The long walk." }, TODAY, NOW)
    plan = appendToReview(plan, week, "magicMoments", ["Approaches: 10 in all", "Gym: Done 10 times"], TODAY, NOW)
    expect(reviewFor(plan, week)!.magicMoments).toBe("The long walk.\nApproaches: 10 in all\nGym: Done 10 times")
    // Twice adds nothing, and an empty review is started by it.
    expect(appendToReview(plan, week, "magicMoments", ["Approaches: 10 in all"], TODAY, NOW)).toBe(plan)
    const fresh = appendToReview(emptyNsPlan(), week, "magicMoments", ["Approaches: 10 in all"], TODAY, NOW)
    expect(reviewFor(fresh, week)!.magicMoments).toBe("Approaches: 10 in all")
  })
})
