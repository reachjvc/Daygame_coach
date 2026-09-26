/**
 * WHAT THE TITLE PARSER MAKES OF TITLES SOMEBODY ACTUALLY TYPED.
 *
 * `parseGoalTarget` reads a number out of a goal's own title so the app can
 * offer rungs without asking the person to retype it. Its existing tests use
 * titles written to exercise a rule. These are the real ones, taken from the
 * owner's 50 goals on 2026-09-26 while running Check 4 of
 * `docs/plans/life-mastery-everything-saves.md` — the check whose whole point is
 * that round-tripping proves nothing was lost, not that anything is right.
 *
 * Two of them come out wrong, and they are recorded here as DEBT rather than
 * quietly left in the owner's plan. A parser tuned on invented input and never
 * run against a real page is how "0 to 458" reached a page about buying a car.
 *
 * **This file asserts current behaviour, including the wrong behaviour.** That is
 * the repo's own pattern for a defect whose fix is a judgement someone else has
 * to make — like the tap-target and browser-clock debt lists, it exists so the
 * case cannot be forgotten and so the list can only shrink. When the parser is
 * fixed, the `DEBT` entries here go red and are deleted, which is the point.
 */

import { describe, it, expect } from "vitest"
import { parseGoalTarget } from "@/src/goals/northStarService"

describe("titles the parser gets right", () => {
  /** A measurement with the lift in front of it: the shape it was built for. */
  it("reads a lift with its weight and keeps the lift as the label", () => {
    expect(parseGoalTarget("Flat bench press 26 kg, 3x8")).toEqual({
      value: 26,
      unit: "kg",
      prefix: "Flat bench press",
    })
  })

  it("takes the FIRST number, not the rep count", () => {
    expect(parseGoalTarget("Hammer curl 16 kg, 2x8")?.value).toBe(16)
  })

  /**
   * THE GUARD THAT WORKS, and the reason this file exists. A model number is a
   * name, not an amount. The parser refuses it today — but the owner's plan
   * still holds `{ start: 0, target: 458 }` for this exact goal, written before
   * the guard existed and never healed, so their page prints "0 to 458" under a
   * goal about buying a car. A fix that only runs at creation time leaves
   * everything created before it wrong; the same shape as the goal links, which
   * needed a backfill for exactly this reason.
   */
  it("refuses a car's model number", () => {
    expect(parseGoalTarget("Buy a Ferrari 458")).toBeNull()
  })

  it("and refuses one behind any article, in either language", () => {
    expect(parseGoalTarget("Buy an iPhone 15")).toBeNull()
    expect(parseGoalTarget("Køb en Porsche 911")).toBeNull()
  })

  /** A plain noun is a perfectly good unit; not everything is a measurement. */
  it("keeps a countable noun as the unit", () => {
    expect(parseGoalTarget("Read 24 books this year")?.unit).toBe("books")
  })
})

describe("titles the parser gets wrong — DEBT, and this list only shrinks", () => {
  /**
   * A UNIT OF TWO WORDS LOSES ITS SECOND, AND THE LEFTOVER BECOMES THE LABEL.
   *
   * "Do 3 muscle ups" should read as three muscle ups. The unit pattern takes a
   * single word, so the unit is "muscle"; "Do" is then treated as a verb that
   * names nothing, which sends the parser looking for a noun BEHIND the unit —
   * and finds "ups", the tail of the very phrase it just cut in half. The rungs
   * this produces read "ups 1 muscle".
   *
   * It cannot be fixed by widening the unit to two words without also turning
   * "Bench 36 kg dumbbells" into a unit of "kg dumbbells". Telling "muscle ups"
   * from "kg dumbbells" means knowing which words are measurements, and the
   * owner is the one who should say how their goal ought to read.
   */
  it("cuts a two-word unit in half and labels the climb with the offcut", () => {
    expect(parseGoalTarget("Do 3 muscle ups")).toEqual({
      value: 3,
      unit: "muscle",
      prefix: "ups",
    })
  })

  /**
   * A COUNT IN A WINDOW LOSES THE WINDOW AND THE THING BEING COUNTED.
   *
   * "Approach 5 in one day" is five approaches within a day. "in" is correctly
   * refused as a unit, so nothing is left to name what the 5 counts, and the
   * per-day window is not carried at all — the owner's plan prints this as a
   * bare "0 to 5" with a single 2027 deadline.
   */
  it("drops both the unit and the window from a per-day count", () => {
    expect(parseGoalTarget("Approach 5 in one day")).toEqual({
      value: 5,
      unit: "",
      prefix: "Approach",
    })
  })
})
