/**
 * Martell's perfect week, stored on the audit's review (Plans/perfect-week.md, Phase 2).
 */
import { describe, expect, it } from "vitest"
import { checkReview } from "@/src/audit/auditService"
import { bestHoursText, checkWeek, freeSlot, hoursByKind, WEEK_BLOCKS_MAX, type WeekBlock } from "@/src/audit/weekService"

const block = (over: Partial<WeekBlock> = {}): WeekBlock => ({
  id: "b1",
  day: 0,
  start: 9 * 60,
  end: 11 * 60,
  what: "Write the book",
  kind: "deep",
  ...over,
})

describe("checkWeek", () => {
  it("accepts quarter-hour blocks and sorts them by day, then start", () => {
    const r = checkWeek([block({ id: "b2", day: 1, start: 480, end: 540 }), block({ id: "b1", day: 0, start: 600, end: 660 }), block({ id: "b3", day: 0, start: 420, end: 480 })])
    expect("week" in r && r.week.map((b) => b.id)).toEqual(["b3", "b1", "b2"])
  })
  it("trims what and cleans pasted control characters", () => {
    const r = checkWeek([block({ what: "  Gym\u0000 legs  " })])
    expect("week" in r && r.week[0].what).toBe("Gym legs")
  })
  it("refuses times off the quarter, backwards, past midnight, a bad day or kind, an empty name, extra fields", () => {
    expect("error" in checkWeek([block({ start: 541 })])).toBe(true)
    expect("error" in checkWeek([block({ start: 600, end: 600 })])).toBe(true)
    expect("error" in checkWeek([block({ start: 600, end: 540 })])).toBe(true)
    expect("error" in checkWeek([block({ end: 1455 })])).toBe(true)
    expect("error" in checkWeek([block({ day: 7 })])).toBe(true)
    expect("error" in checkWeek([block({ kind: "nap" as WeekBlock["kind"] })])).toBe(true)
    expect("error" in checkWeek([block({ what: "   " })])).toBe(true)
    expect("error" in checkWeek([block({ what: "x".repeat(81) })])).toBe(true)
    expect("error" in checkWeek([{ ...block(), extra: 1 }])).toBe(true)
    expect("error" in checkWeek([block({ id: "a\u0000" })])).toBe(true)
    expect("error" in checkWeek([block({ id: "" })])).toBe(true)
    expect("error" in checkWeek({})).toBe(true)
  })
  it("allows a block that ends at midnight", () => {
    expect("week" in checkWeek([block({ start: 1380, end: 1440 })])).toBe(true)
  })
  it("refuses two blocks that overlap on the same day, but not on different days or back to back", () => {
    expect("error" in checkWeek([block({ id: "a", start: 540, end: 660 }), block({ id: "b", start: 600, end: 720 })])).toBe(true)
    expect("week" in checkWeek([block({ id: "a", start: 540, end: 600 }), block({ id: "b", start: 600, end: 720 })])).toBe(true)
    expect("week" in checkWeek([block({ id: "a", day: 0 }), block({ id: "b", day: 1 })])).toBe(true)
  })
  it("refuses a repeated id and too many blocks", () => {
    expect("error" in checkWeek([block({ id: "a", day: 0 }), block({ id: "a", day: 1 })])).toBe(true)
    const many = Array.from({ length: WEEK_BLOCKS_MAX + 1 }, (_, i) => block({ id: `b${i}`, day: i % 7, start: Math.floor(i / 7) * 15, end: Math.floor(i / 7) * 15 + 15 }))
    expect("error" in checkWeek(many)).toBe(true)
  })
})

describe("checkReview keeps the week", () => {
  it("accepts a review with a week and keeps reviews without one working", () => {
    const r = checkReview({ choices: {}, notes: {}, week: [block()] })
    expect("review" in r && r.review.week).toEqual([block()])
    const old = checkReview({ choices: { email: "cut" }, notes: {} })
    expect("review" in old && old.review.week).toEqual([])
  })
  it("refuses a review whose week is wrong", () => {
    expect("error" in checkReview({ choices: {}, notes: {}, week: [block({ start: 3 })] })).toBe(true)
  })
})

describe("hoursByKind", () => {
  it("adds up hours per kind across the week", () => {
    const week = [block({ id: "a", start: 540, end: 720 }), block({ id: "b", day: 2, start: 540, end: 600 }), block({ id: "c", kind: "workout", start: 1020, end: 1110 })]
    expect(hoursByKind(week)).toEqual({ deep: 4, workout: 1.5, people: 0, batch: 0, admin: 0, rest: 0 })
  })
})

describe("freeSlot", () => {
  it("offers an hour from 09:00 on an empty day, or after a block that covers 09:00", () => {
    expect(freeSlot([], 3)).toEqual({ start: 540, end: 600 })
    expect(freeSlot([block({ day: 3, start: 540, end: 660 })], 3)).toEqual({ start: 660, end: 720 })
    expect(freeSlot([block({ day: 2, start: 540, end: 660 })], 3)).toEqual({ start: 540, end: 600 })
  })
  it("uses a free morning even when the evening is planned, and stops short of the next block", () => {
    expect(freeSlot([block({ day: 0, start: 1200, end: 1260 })], 0)).toEqual({ start: 540, end: 600 })
    expect(freeSlot([block({ day: 0, start: 570, end: 660 })], 0)).toEqual({ start: 540, end: 570 })
  })
  it("wraps to the early morning when 09:00 to midnight is full, and says so when the whole day is", () => {
    expect(freeSlot([block({ day: 0, start: 540, end: 1440 })], 0)).toEqual({ start: 0, end: 60 })
    expect(freeSlot([block({ day: 0, start: 0, end: 1440 })], 0)).toBe(null)
  })
})

describe("bestHoursText", () => {
  it("names the three most energetic hours, best first, and says so when there are none", () => {
    expect(
      bestHoursText([
        { hour: 8, energy: 5.1, answers: 6 },
        { hour: 9, energy: 6.2, answers: 6 },
        { hour: 14, energy: 3.0, answers: 5 },
        { hour: 10, energy: 5.8, answers: 4 },
      ]),
    ).toBe("09:00, 10:00 and 08:00")
    expect(bestHoursText([])).toBe(null)
  })
})
