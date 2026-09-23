/**
 * WHAT THE DAY ROUTE DECIDES, decided without a database or a browser.
 *
 * Each case here is a way the day half goes wrong that no amount of correct
 * SQL would catch: a tick filed under a date the person never lived, an answer
 * thrown away because its question was deleted, a patch that empties a day it
 * only meant to add to.
 */

import { describe, it, expect } from "vitest"
import {
  DAY_LIMITS,
  dayIsWritable,
  dayRowsToRecord,
  fitAsked,
  isCalendarDay,
  recordIsEmpty,
  recordToPatches,
  patchesBetween,
  unknownIds,
  whyNotWritable,
} from "@/src/goals/lifePlanDayService"
import type { DayRows } from "@/src/db/lifePlanDayTypes"

const TODAY = "2026-09-23"

describe("a day is a real calendar day", () => {
  it("accepts one", () => {
    expect(isCalendarDay(TODAY)).toBe(true)
  })

  it("refuses the 31st of February rather than storing it", () => {
    expect(isCalendarDay("2026-02-31")).toBe(false)
  })

  it("refuses anything that is not YYYY-MM-DD", () => {
    for (const bad of ["23-09-2026", "2026-9-3", "", "today", "2026-09-23T10:00:00Z"]) {
      expect(isCalendarDay(bad), bad).toBe(false)
    }
  })
})

describe("which days may be written", () => {
  it("lets you fill in a day you missed — however long ago", () => {
    expect(dayIsWritable("2024-01-01", TODAY)).toBe(true)
    expect(dayIsWritable("2026-09-22", TODAY)).toBe(true)
  })

  it("lets tomorrow through, because a tab open across midnight is normal", () => {
    // The browser computes the date from the account's zone, but a tab left
    // open in a zone ahead of it can legitimately be a day on.
    expect(dayIsWritable("2026-09-24", TODAY)).toBe(true)
  })

  it("refuses a day further ahead than that: a clock is wrong, not a person", () => {
    expect(dayIsWritable("2026-09-25", TODAY)).toBe(false)
    expect(dayIsWritable("2027-01-01", TODAY)).toBe(false)
  })

  it("crosses a month and a year boundary correctly", () => {
    expect(dayIsWritable("2026-10-01", "2026-09-30")).toBe(true)
    expect(dayIsWritable("2027-01-01", "2026-12-31")).toBe(true)
    expect(dayIsWritable("2027-01-02", "2026-12-31")).toBe(false)
  })
})

describe("an id the account has never heard of", () => {
  const ids = new Map([["lm_health", "uuid-area"], ["s5", "uuid-step"]])

  it("names the ratings and ticks it cannot resolve, so the browser can fix it", () => {
    const unknown = unknownIds({ date: TODAY, ratings: { lm_new: 4 }, ticks: { s9: true } }, ids)
    expect(unknown.sort()).toEqual(["lm_new", "s9"])
  })

  it("says nothing about the journal, whose ids are MEANT to outlive the plan", () => {
    expect(unknownIds({ date: TODAY, journal: { f_deleted: "still readable" } }, ids)).toEqual([])
  })

  it("is quiet when everything resolves", () => {
    expect(unknownIds({ date: TODAY, ratings: { lm_health: 7 }, ticks: { s5: true } }, ids)).toEqual([])
  })
})

describe("what cannot be stored, and what it says", () => {
  it("passes a normal day", () => {
    expect(whyNotWritable({ date: TODAY, note: "a good day", ratings: { lm_health: 7 } }, TODAY)).toBe("")
  })

  it("refuses a rating that is not a whole 0-10", () => {
    for (const bad of [11, -1, 7.5]) {
      expect(whyNotWritable({ date: TODAY, ratings: { lm_health: bad } }, TODAY)).toContain("0 to 10")
    }
  })

  it("refuses text longer than the column, rather than letting the database refuse it", () => {
    const tooLong = "x".repeat(DAY_LIMITS.text + 1)
    expect(whyNotWritable({ date: TODAY, note: tooLong }, TODAY)).toContain("too long")
    expect(whyNotWritable({ date: TODAY, journal: { f1: tooLong } }, TODAY)).toContain("too long")
  })

  it("accepts text exactly at the limit", () => {
    expect(whyNotWritable({ date: TODAY, note: "x".repeat(DAY_LIMITS.text) }, TODAY)).toBe("")
  })

  it("refuses a question id the column's own shape check would refuse", () => {
    expect(whyNotWritable({ date: TODAY, journal: { "has a space": "x" } }, TODAY)).toContain("id")
  })

  it("TRIMS the question's words rather than refusing the answer under them", () => {
    // The answer is what somebody wrote; the question is a label for it. Losing
    // the answer because its label was long would be the tail wagging the dog.
    const fitted = fitAsked({ f1: "q".repeat(DAY_LIMITS.asked + 50) })
    expect(fitted.f1).toHaveLength(DAY_LIMITS.asked)
  })
})

describe("rows, as the four maps the flow works in", () => {
  const rows = (): DayRows => ({
    days: [
      { id: "d1", user_id: "u", plan_id: "p", on_date: "2026-09-22", note: "" },
      { id: "d2", user_id: "u", plan_id: "p", on_date: TODAY, note: "a good day" },
    ],
    ratings: [
      { user_id: "u", day_id: "d2", area_id: "uuid-area", rating: 7 },
      { user_id: "u", day_id: "d2", area_id: "uuid-gone", rating: 3 },
    ],
    ticks: [
      { user_id: "u", day_id: "d2", node_id: "uuid-step" },
      { user_id: "u", day_id: "d2", node_id: "uuid-gone" },
    ],
    journal: [
      { id: "j1", user_id: "u", day_id: "d2", local_id: "s5", asked: "What are you grateful for?", body: "coffee" },
      { id: "j2", user_id: "u", day_id: "d2", local_id: "f_deleted", asked: "A question since removed", body: "still here" },
    ],
  })

  const localIdFor = new Map([["uuid-area", "lm_health"], ["uuid-step", "s5"]])

  it("keys everything by the person's own date and the plan's own ids", () => {
    const record = dayRowsToRecord(rows(), localIdFor)
    expect(record.daily[TODAY]).toEqual({ lm_health: 7 })
    expect(record.logged[TODAY]).toEqual(["s5"])
    expect(record.notes[TODAY]).toBe("a good day")
  })

  it("leaves out a day nobody wrote anything on", () => {
    // `d1` exists because the day was opened, and holds nothing.
    expect(dayRowsToRecord(rows(), localIdFor).notes["2026-09-22"]).toBeUndefined()
  })

  it("drops a tick and a rating whose node is gone — they point at nothing", () => {
    const record = dayRowsToRecord(rows(), localIdFor)
    expect(record.logged[TODAY]).not.toContain("uuid-gone")
    expect(Object.keys(record.daily[TODAY])).toEqual(["lm_health"])
  })

  it("KEEPS an answer whose question is gone, which is the whole point of the table", () => {
    const record = dayRowsToRecord(rows(), localIdFor)
    expect(record.journal[TODAY]).toEqual({ s5: "coffee", f_deleted: "still here" })
  })
})

describe("sending a browser's whole record to the account once", () => {
  it("knows an empty record from one with a single tick in it", () => {
    expect(recordIsEmpty({ daily: {}, logged: {}, notes: {}, journal: {} })).toBe(true)
    expect(recordIsEmpty({ daily: {}, logged: { [TODAY]: ["s5"] }, notes: {}, journal: {} })).toBe(false)
  })

  it("makes one patch per day, in date order", () => {
    const patches = recordToPatches({
      daily: { "2026-09-21": { lm_health: 5 } },
      logged: { [TODAY]: ["s5"] },
      notes: { "2026-09-22": "a line" },
      journal: { [TODAY]: { s5: "written" } },
    })

    expect(patches.map((p) => p.date)).toEqual(["2026-09-21", "2026-09-22", TODAY])
    expect(patches[0]).toEqual({ date: "2026-09-21", ratings: { lm_health: 5 } })
    expect(patches[2]).toEqual({ date: TODAY, ticks: { s5: true }, journal: { s5: "written" } })
  })

  it("carries no key it has nothing for, so an import cannot blank a cell", () => {
    const [patch] = recordToPatches({ daily: {}, logged: {}, notes: { [TODAY]: "just a line" }, journal: {} })
    expect(Object.keys(patch).sort()).toEqual(["date", "note"])
  })
})

describe("what changed between two days, as patches", () => {
  const empty = { daily: {}, logged: {}, notes: {}, journal: {} }

  it("says nothing when nothing moved", () => {
    const record = { daily: { [TODAY]: { lm_health: 7 } }, logged: {}, notes: {}, journal: {} }
    expect(patchesBetween(record, record)).toEqual([])
  })

  it("carries a new rating, a new tick and a new line", () => {
    const after = {
      daily: { [TODAY]: { lm_health: 7 } },
      logged: { [TODAY]: ["s5"] },
      notes: { [TODAY]: "a good day" },
      journal: { [TODAY]: { s5: "coffee" } },
    }
    expect(patchesBetween(empty, after)).toEqual([
      { date: TODAY, note: "a good day", ratings: { lm_health: 7 }, ticks: { s5: true }, journal: { s5: "coffee" } },
    ])
  })

  /**
   * THE HALF A DIFF FORGETS, and the reason this is not `Object.keys` twice.
   *
   * The route's rule is that absent is not null: a patch that omits a rating
   * leaves the stored one alone. So a REMOVAL has to be said out loud, or
   * "I cleared that" and "I did not mention it" become the same request and
   * the cell comes back on the next device.
   */
  it("says a removal out loud rather than omitting it", () => {
    const before = {
      daily: { [TODAY]: { lm_health: 7 } },
      logged: { [TODAY]: ["s5"] },
      notes: { [TODAY]: "a good day" },
      journal: { [TODAY]: { s5: "coffee" } },
    }
    expect(patchesBetween(before, empty)).toEqual([
      { date: TODAY, note: "", ratings: { lm_health: null }, ticks: { s5: false }, journal: { s5: "" } },
    ])
  })

  it("mentions only the cell that moved, not the whole day", () => {
    const before = { daily: { [TODAY]: { lm_health: 7, lm_money: 4 } }, logged: {}, notes: {}, journal: {} }
    const after = { daily: { [TODAY]: { lm_health: 9, lm_money: 4 } }, logged: {}, notes: {}, journal: {} }
    expect(patchesBetween(before, after)).toEqual([{ date: TODAY, ratings: { lm_health: 9 } }])
  })

  it("makes one patch per day, in date order, when several moved", () => {
    const after = { daily: {}, logged: { "2026-09-21": ["s1"], [TODAY]: ["s5"] }, notes: {}, journal: {} }
    expect(patchesBetween(empty, after).map((p) => p.date)).toEqual(["2026-09-21", TODAY])
  })

  it("does not confuse a re-ordered tick list with a change", () => {
    const before = { daily: {}, logged: { [TODAY]: ["s5", "s6"] }, notes: {}, journal: {} }
    const after = { daily: {}, logged: { [TODAY]: ["s6", "s5"] }, notes: {}, journal: {} }
    expect(patchesBetween(before, after)).toEqual([])
  })
})

