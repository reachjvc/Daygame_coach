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
 * Two came out wrong. One — a two-word unit cut in half — is FIXED here and its
 * cases are kept so it cannot come back. The other is still wrong and sits in
 * the DEBT block at the foot.
 *
 * A parser tuned on invented input and never run against a real page is how
 * "0 to 458" reached a page about buying a car.
 *
 * **The DEBT block asserts current behaviour, including the wrong behaviour.**
 * That is the repo's own pattern — like the tap-target and browser-clock lists,
 * it exists so the case cannot be forgotten and so the list can only shrink.
 * When the parser is fixed, that entry goes red and is deleted, which is the
 * point.
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

describe("a unit of two words survives, because not every unit is a measurement", () => {
  /**
   * FIXED 2026-09-26, and it was wrong on the owner's own page.
   *
   * "Do 3 muscle ups" gave `{ unit: "muscle", prefix: "ups" }` — the unit
   * pattern took one word, and "Do" being a verb that names nothing then sent
   * the label rule looking for a noun BEHIND the unit, where it found "ups",
   * the tail of the phrase just cut in half. The rungs read "ups 1 muscle".
   *
   * It cannot be fixed by always taking two words: "36 kg dumbbells" is a
   * weight and then a separate noun. Nothing in the SHAPE separates them — both
   * are number, word, word — so the measurements are named in `MEASUREMENT` and
   * everything else is allowed a second word.
   */
  it("keeps a two-word exercise whole and labels the climb with the verb", () => {
    expect(parseGoalTarget("Do 3 muscle ups")).toEqual({
      value: 3,
      unit: "muscle ups",
      prefix: "Do",
    })
  })

  it("and the same for the ones nobody has typed yet", () => {
    expect(parseGoalTarget("Do 100 push ups")?.unit).toBe("push ups")
    expect(parseGoalTarget("Do 20 pull ups")?.unit).toBe("pull ups")
  })

  /** A measurement stops at one word, or "kg dumbbells" becomes a unit. */
  it("does not join a noun onto a measurement", () => {
    expect(parseGoalTarget("Bench 36 kg dumbbells for 6 reps")?.unit).toBe("kg")
    expect(parseGoalTarget("Save 10000 kr this year")?.unit).toBe("kr")
  })

  /** And a stop word is never joined on: "24 books this year" is books. */
  it("does not join a word that cannot be part of a unit", () => {
    expect(parseGoalTarget("Read 24 books this year")?.unit).toBe("books")
    expect(parseGoalTarget("Read 10 pages a day")?.unit).toBe("pages")
  })

  /**
   * THE LABEL RULE STILL WORKS where it was meant to. "Get 28 kg bench" has a
   * verb that names nothing and a real noun behind a MEASUREMENT, so the noun
   * is still what the climb is called.
   */
  it("still takes the noun behind a measurement when the verb says nothing", () => {
    expect(parseGoalTarget("Get 28 kg bench 3 sets 8 reps by april")?.prefix).toBe("bench")
  })
})

describe("titles the parser still gets wrong — DEBT, and this list only shrinks", () => {
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
