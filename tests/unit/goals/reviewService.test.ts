import { describe, it, expect } from "vitest"
import { emptyNsPlan, normalizeNsPlan, planIsUntouched, removeArea, serializeNsPlan } from "@/src/goals/northStarService"
import { planHasNothingWritten } from "@/src/goals/lifePlanSync"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import {
  agoLabel,
  averageScore,
  lastReviewOf,
  lastScores,
  periodLabel,
  periodOf,
  readReviews,
  removeReview,
  reviewFor,
  reviewsOf,
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
