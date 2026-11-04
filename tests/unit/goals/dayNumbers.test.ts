import { describe, it, expect } from "vitest"
import {
  addDailyField,
  dayNumber,
  emptyNsPlan,
  normalizeNsPlan,
  numberHistory,
  removeDailyField,
  serializeNsPlan,
  setDailyFieldKind,
  setDayNumber,
} from "@/src/goals/northStarService"
import {
  dayRowsToRecord,
  keepEditsMadeWhileLoading,
  patchesBetween,
  recordOf,
  recordToPatches,
  unknownIds,
  whyNotWritable,
  type DayRecord,
} from "@/src/goals/lifePlanDayService"
import { journalArchive, journalTotals } from "@/src/goals/northStarTrackService"
import { UNSENT_PLAN_FIELDS, planHasNothingWritten } from "@/src/goals/lifePlanSync"
import { readTypedNumber } from "@/src/goals/components/north-star/TodayTab"
import type { NsPlan } from "@/src/goals/types"

/**
 * A TODAY BOX THAT HOLDS A NUMBER (Plans/life-plan-rebuild.md, Phase 6).
 * The number belongs to the day, travels with the day half, and shows on the
 * day's summary in the journal.
 */

const NOW = "2026-11-04T09:00:00.000Z"
const DAY = "2026-11-04"
const EMPTY: DayRecord = { daily: {}, logged: {}, notes: {}, journal: {}, numbers: {} }

/** A plan with one number box, "Approaches", on the day itself. */
function withBox(): { plan: NsPlan; box: string } {
  let plan = addDailyField(emptyNsPlan(), null, "Approaches", "write", NOW)
  const box = plan.fields[0].id
  plan = setDailyFieldKind(plan, box, "number", NOW)
  return { plan, box }
}

describe("a number box", () => {
  it("keeps a number for the day, clears it again, and keeps decimals and zero", () => {
    const { plan, box } = withBox()
    let next = setDayNumber(plan, DAY, box, 5, NOW)
    expect(dayNumber(next, DAY, box)).toBe(5)
    next = setDayNumber(next, "2026-11-03", box, 0, NOW)
    next = setDayNumber(next, "2026-11-02", box, 2.5, NOW)
    expect(numberHistory(next, box, DAY)).toEqual([{ date: "2026-11-03", value: 0 }, { date: "2026-11-02", value: 2.5 }])
    next = setDayNumber(next, DAY, box, null, NOW)
    expect(dayNumber(next, DAY, box)).toBeNull()
    expect(next.numbers[DAY]).toBeUndefined()
  })

  it("is refused for a box that does not hold numbers, or a value the column cannot keep", () => {
    const { plan, box } = withBox()
    const words = setDailyFieldKind(plan, box, "write", NOW)
    expect(setDayNumber(words, DAY, box, 5, NOW)).toBe(words)
    expect(setDayNumber(plan, DAY, "nope", 5, NOW)).toBe(plan)
    expect(setDayNumber(plan, DAY, box, Number.NaN, NOW)).toBe(plan)
    expect(setDayNumber(plan, DAY, box, 2e9, NOW)).toBe(plan)
  })

  it("survives the browser copy, and is never part of the plan's own save", () => {
    const { plan, box } = withBox()
    const next = setDayNumber(plan, DAY, box, 7, NOW)
    const back = normalizeNsPlan(JSON.parse(serializeNsPlan(next)))!
    expect(back.fields[0].kind).toBe("number")
    expect(back.numbers).toEqual({ [DAY]: { [box]: 7 } })
    expect(UNSENT_PLAN_FIELDS).toContain("numbers")
    // A damaged copy is repaired, not trusted.
    const damaged = normalizeNsPlan({ ...JSON.parse(serializeNsPlan(next)), numbers: { [DAY]: { [box]: "7", f9: 3e12 }, nope: { [box]: 1 } } })!
    expect(damaged.numbers).toEqual({})
  })

  it("shows on the day's summary in the journal, under the box's name, and only while the box exists", () => {
    const { plan, box } = withBox()
    const next = setDayNumber(plan, DAY, box, 5, NOW)
    const archive = journalArchive(next, DAY)
    expect(archive).toEqual([expect.objectContaining({ date: DAY, numbers: [{ id: box, label: "Approaches", value: 5 }] })])
    expect(journalTotals(archive)).toEqual({ entries: 1, days: 1 })
    const removed = removeDailyField(next, box, NOW)
    expect(journalArchive(removed, DAY)).toEqual([])
    // Its numbers go with it, as the database's cascade takes them.
    expect(removed.numbers).toEqual({})
  })

  it("makes a plan that is not empty, so an import elsewhere cannot replace it", () => {
    expect(planHasNothingWritten(emptyNsPlan())).toBe(true)
    expect(planHasNothingWritten(withBox().plan)).toBe(false)
  })

  it("reads what was typed only when it means one number for sure", () => {
    expect(readTypedNumber("")).toBeNull()
    expect(readTypedNumber(" 5 ")).toBe(5)
    expect(readTypedNumber("2,5")).toBe(2.5)
    expect(readTypedNumber("-3.25")).toBe(-3.25)
    expect(readTypedNumber("1500")).toBe(1500)
    for (const unsure of ["1.500", "10.000", "1,000", "0x10", "1e3", "12o", "1.2.3", "5 kg", "2000000000"]) {
      expect(readTypedNumber(unsure), unsure).toBeUndefined()
    }
  })
})

describe("the day half carries the numbers", () => {
  it("sends a new, a changed and a cleared number, and nothing for an untouched one", () => {
    const before: DayRecord = { ...EMPTY, numbers: { [DAY]: { f1: 3, f2: 4, f3: 1 } } }
    const after: DayRecord = { ...EMPTY, numbers: { [DAY]: { f1: 3, f2: 6, f4: 0 } } }
    expect(patchesBetween(before, after)).toEqual([{ date: DAY, numbers: { f2: 6, f3: null, f4: 0 } }])
  })

  it("is read back from the rows, by the plan's own ids, and sent whole on an import", () => {
    const record = dayRowsToRecord(
      {
        days: [{ id: "d1", user_id: "u", plan_id: "p", on_date: DAY, note: "" }],
        ratings: [], ticks: [], journal: [],
        numbers: [
          { user_id: "u", day_id: "d1", node_id: "n1", value: 5 },
          // A number whose box is gone is dropped, as the database has cascaded it.
          { user_id: "u", day_id: "d1", node_id: "gone", value: 9 },
        ],
      },
      new Map([["n1", "f1"]]),
    )
    expect(record.numbers).toEqual({ [DAY]: { f1: 5 } })
    expect(recordToPatches(record)).toEqual([{ date: DAY, numbers: { f1: 5 } }])
  })

  it("keeps a number typed while the account was being read", () => {
    const account: DayRecord = { ...EMPTY, numbers: { "2026-11-03": { f1: 2 } } }
    const atLoad = EMPTY
    const now: DayRecord = { ...EMPTY, numbers: { [DAY]: { f1: 4 } } }
    expect(keepEditsMadeWhileLoading(account, atLoad, now).numbers).toEqual({ "2026-11-03": { f1: 2 }, [DAY]: { f1: 4 } })
  })

  it("names an id the account does not know, and refuses what the column cannot keep", () => {
    expect(unknownIds({ date: DAY, numbers: { f1: 2, f9: 1 } }, new Map([["f1", "n1"]]))).toEqual(["f9"])
    // A clear of a part already gone names nothing: its row went with it.
    expect(unknownIds({ date: DAY, numbers: { f9: null }, ratings: { a9: null }, ticks: { s9: false } }, new Map())).toEqual([])
    expect(whyNotWritable({ date: DAY, numbers: { f1: 2.5, f2: null, f3: -4 } }, DAY)).toBe("")
    expect(whyNotWritable({ date: DAY, numbers: { f1: 2e9 } }, DAY)).toMatch(/cannot be saved/)
    expect(whyNotWritable({ date: DAY, numbers: { f1: Number.POSITIVE_INFINITY } }, DAY)).toMatch(/cannot be saved/)
  })

  it("is part of what a plan's day half is", () => {
    const { plan, box } = withBox()
    expect(recordOf(setDayNumber(plan, DAY, box, 1, NOW)).numbers).toEqual({ [DAY]: { [box]: 1 } })
  })
})

describe("a goal's count on the day (Q4)", () => {
  it("is sent as the day's own number, so a save sent twice lands the same", () => {
    const before: DayRecord = { ...EMPTY, numbers: { [DAY]: { g1: 3 } } }
    const after: DayRecord = { ...EMPTY, numbers: { [DAY]: { g1: 4 } } }
    expect(patchesBetween(before, after)).toEqual([{ date: DAY, numbers: { g1: 4 } }])
  })

  it("made while the account was read, is added to the account's count", () => {
    const account: DayRecord = { ...EMPTY, numbers: { [DAY]: { g1: 3 } } }
    const atLoad: DayRecord = { ...EMPTY, numbers: { [DAY]: { g1: 1 } } }
    const now: DayRecord = { ...EMPTY, numbers: { [DAY]: { g1: 2 } } }
    expect(keepEditsMadeWhileLoading(account, atLoad, now, new Set(["g1"])).numbers).toEqual({ [DAY]: { g1: 4 } })
    // A number box's value is what was typed, not an addition.
    expect(keepEditsMadeWhileLoading(account, atLoad, now).numbers).toEqual({ [DAY]: { g1: 2 } })
  })
})
