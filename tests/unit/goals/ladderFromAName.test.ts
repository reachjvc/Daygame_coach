/**
 * "BUY A FERRARI 458" WAS A CLIMB FROM NOUGHT TO FOUR HUNDRED AND FIFTY-EIGHT.
 *
 * `shapeFromTitle` derives a goal's target from its own title so nobody has to
 * type a number twice. A title carrying a model number therefore became a climb
 * towards it: the owner's plan stores `{ start: 0, target: 458 }` for that goal
 * and their page prints "0 to 458" — of what, it never says.
 *
 * `namesAThing` refuses that title now and has for some time. It runs when a
 * goal is CREATED, so it never reached anything created before it. Found on the
 * owner's real plan on 2026-09-26, running Check 4 of
 * `docs/plans/life-mastery-everything-saves.md`. It is the second instance in
 * one day of the same class — a fix that only runs at creation time leaving
 * every earlier row wrong — after the goal links, which needed a backfill for
 * exactly this reason.
 *
 * **Why removing it is a repair and not a deletion of somebody's work.** They
 * typed a title. The app read the car's name as a quantity and built four rungs
 * to it. There is nothing of theirs in those numbers.
 *
 * **And why the guard has to be narrow.** `northStarService` already holds the
 * opposite rule, learned the hard way: an explicit ladder beats a title
 * reading, because "Quit sugar" with a ladder from 90 to 80 once lost two
 * numbers a person had typed, silently, on the second page load. Nothing stored
 * on a ladder says whether it was typed or inferred — that is the real gap —
 * so this cannot know. What it can do is match the exact signature of the bug's
 * output and refuse everything else.
 */

import { describe, it, expect } from "vitest"
import { ladderIsTitleDebris, normalizeNsPlan, emptyNsPlan, serializeNsPlan } from "@/src/goals/northStarService"

/**
 * THE OWNER'S TWENTY LADDERED GOALS, as the account really holds them on
 * 2026-09-26: title, unit, ladder start, ladder target.
 *
 * Real rows rather than invented ones, because the question this guard has to
 * answer is not "does it catch a Ferrari" but "does it leave nineteen real
 * climbs alone". A predicate tuned on one example is how the original bug got
 * in.
 */
const REAL: Array<[title: string, unit: string, start: number, target: number]> = [
  ["100000 subscribers", "subscribers", 0, 100000],
  ["Approach 5 in one day", "", 0, 5],
  ["Body Fat %", "%", 19, 14],
  ["Body Weight", "kg", 90, 80],
  ["Build Hours", "hours in total", 1, 500],
  ["Buy a Ferrari 458", "", 0, 458],
  ["Comfort Zone Challenges", "total", 1, 100],
  ["Dates per Month", "/month", 1, 6],
  ["Deep Work Hours", "hours in total", 0, 500],
  ["Do 3 muscle ups", "muscle ups", 0, 3],
  ["Flat bench press 26 kg, 3x8", "kg", 22, 26],
  ["Hammer curl 16 kg, 2x10", "kg", 14, 16],
  ["Kiss Closes", "total", 1, 15],
  ["Monthly Profit", "$", 0, 6000],
  ["Monthly Revenue", "$", 0, 10000],
  ["Paying Customers", "total", 1, 50],
  ["Progress Photos", "total", 1, 24],
  ["Skullcrusher 35 kg, 2x8", "kg", 0, 35],
  ["Spend 100 kr pr day i didnt smoke to celebrate", "kr", 0, 100],
  ["Waist Measurement", "cm", 90, 82],
]

const asGoal = ([title, unit, start, target]: (typeof REAL)[number]) => ({
  title,
  unit,
  ladder: { start, target },
})

describe("telling an invented climb from a real one", () => {
  it("flags exactly one of the owner's twenty, and it is the car", () => {
    const flagged = REAL.filter((r) => ladderIsTitleDebris(asGoal(r))).map((r) => r[0])

    expect(flagged, "nineteen real climbs must be left alone").toEqual(["Buy a Ferrari 458"])
  })

  /**
   * THE NEAR MISS, and the reason the parser is consulted rather than the shape.
   * "Approach 5 in one day" also carries no unit and a target equal to a number
   * in its own title. The difference is that 5 there is a count, and the parser
   * reads it; 458 is a name, and the parser refuses it.
   */
  it("leaves a unitless climb alone when the number is a real count", () => {
    expect(ladderIsTitleDebris({ title: "Approach 5 in one day", unit: "", ladder: { start: 0, target: 5 } })).toBe(false)
  })

  it("leaves a deliberate climb on a name-carrying title alone", () => {
    // Somebody saving up FOR the car: the target is money, not the model.
    expect(
      ladderIsTitleDebris({ title: "Buy a Ferrari 458", unit: "", ladder: { start: 0, target: 250000 } }),
      "the target is not the number in the title, so this is theirs",
    ).toBe(false)
  })

  it("and one that starts somewhere real", () => {
    expect(ladderIsTitleDebris({ title: "Buy a Ferrari 458", unit: "", ladder: { start: 100, target: 458 } })).toBe(false)
  })

  it("and one carrying a unit", () => {
    expect(ladderIsTitleDebris({ title: "Buy a Ferrari 458", unit: "kr", ladder: { start: 0, target: 458 } })).toBe(false)
  })

  it("says nothing about a goal with no ladder at all", () => {
    expect(ladderIsTitleDebris({ title: "Buy a Ferrari 458", unit: "", ladder: null })).toBe(false)
  })
})

describe("what a plan carrying one looks like after it loads", () => {
  /** The heal runs in `normalizeNsPlan`, so it happens on the next page load. */
  function planWithTheFerrari() {
    const base = emptyNsPlan()
    const goal = {
      id: "g1",
      areaId: base.areas[0].id,
      title: "Buy a Ferrari 458",
      type: "milestone_ladder" as const,
      unit: "",
      ladder: { start: 0, target: 458, steps: 4, pins: [], controlPoints: [], curveTension: 0 },
    }
    return normalizeNsPlan(JSON.parse(serializeNsPlan({ ...base, goals: [goal] } as never)))!
  }

  it("keeps the goal and its title, and drops the invented rungs", () => {
    const healed = planWithTheFerrari().goals[0]

    expect(healed.title, "the goal itself is not touched").toBe("Buy a Ferrari 458")
    expect(healed.ladder, "the four rungs the app invented are gone").toBeNull()
  })

  it("and it becomes the finish line the title reader would answer today", () => {
    expect(planWithTheFerrari().goals[0].type).toBe("achievement")
  })

  /**
   * A REAL CLIMB SURVIVES THE SAME LOAD. Without this the case above would pass
   * just as well for a normaliser that dropped every ladder it saw.
   */
  it("leaves a real climb's rungs exactly where they were", () => {
    const base = emptyNsPlan()
    const goal = {
      id: "g1",
      areaId: base.areas[0].id,
      title: "Flat bench press 26 kg, 3x8",
      type: "milestone_ladder" as const,
      unit: "kg",
      ladder: { start: 22, target: 26, steps: 8, pins: [], controlPoints: [], curveTension: 0 },
    }
    const healed = normalizeNsPlan(JSON.parse(serializeNsPlan({ ...base, goals: [goal] } as never)))!.goals[0]

    expect(healed.ladder).toMatchObject({ start: 22, target: 26 })
    expect(healed.type).toBe("milestone_ladder")
  })
})
