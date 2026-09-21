/**
 * "X TO Y" IN A TYPED LINE, IN EITHER DIRECTION.
 *
 * THE DEFECT THIS PINS. `parseGoalTarget` takes the FIRST number in a line as
 * the target. So "go from 90 to 80 kg" was recorded as a climb to 90 — and the
 * "from N" guard beneath it only accepted a start BELOW the target, so the 90
 * was discarded as well. The row read "0 of 90 kg" for somebody who wants to
 * lose weight, and the app tracked him gaining it.
 *
 * `risingNumbers` did not catch the other direction either: it demands each
 * number be half again the last, so "bench from 70 to 100" is not rising
 * enough to count and came back as a climb to 70.
 *
 * WHY A CONNECTOR IS REQUIRED, and this is the whole of the safety. Two
 * numbers in a line is far too weak a signal to act on:
 *
 *   "Read 12 books in 6 months"   would become a goal to own six books
 *   "3x8 bench press 26 kg"       is a set scheme, not a climb
 *   "Run 5k in 30 minutes"        is a distance and a time
 *
 * A "to", a "til", a "down to" or an arrow is somebody saying which way it
 * runs out loud. Nothing is inferred without one.
 */

import { describe, it, expect } from "vitest"
import { connectedPair, shapeFromTitle } from "@/src/goals/northStarService"

describe("a number you want to come DOWN to", () => {
  it("the weight goal that was recorded as gaining weight", () => {
    const shape = shapeFromTitle("go from 90 to 80 kg")
    expect(shape.start).toBe(90) // was null
    expect(shape.target).toBe(80) // was 90
  })

  it("every phrasing of it the owner might write", () => {
    expect(shapeFromTitle("Bodyweight from 90 kg to 80 kg")).toMatchObject({ start: 90, target: 80 })
    expect(shapeFromTitle("Body fat 19 to 14")).toMatchObject({ start: 19, target: 14 })
    expect(shapeFromTitle("Waist 90 to 82 cm")).toMatchObject({ start: 90, target: 82 })
    expect(shapeFromTitle("Reduce screen time from 6 to 2 hours")).toMatchObject({ start: 6, target: 2 })
  })

  it("down to nothing, with words in between", () => {
    // "cigarettes a day" sits between the two numbers, which is why the gap the
    // pattern allows has to be generous.
    expect(shapeFromTitle("20 cigarettes a day down to 0")).toMatchObject({ start: 20, target: 0 })
  })

  it("Danish, where the target comes first", () => {
    // "Ned til 80 kg fra 90" states the direction just as loudly, with the
    // target first — so it is the connector rule, matched the other way round.
    expect(shapeFromTitle("Ned til 80 kg fra 90")).toMatchObject({ start: 90, target: 80 })
    expect(connectedPair("Ned til 80 kg fra 90")).toEqual({ start: 90, target: 80 })
  })

  it("a bare from-number above the target is still treated as noise", () => {
    // "Squat 100 kg from 120 kg" would otherwise become a goal to squat LESS.
    // A line that means to come down says so, with a connector.
    expect(shapeFromTitle("Squat 100 kg from 120 kg")).toMatchObject({ target: 100, start: null })
    expect(shapeFromTitle("Squat from 120 to 100 kg")).toMatchObject({ start: 120, target: 100 })
  })
})

describe("a number you want to go UP to", () => {
  it("a climb too gentle for risingNumbers to notice", () => {
    // 100 is not half again 70, so `risingNumbers` refused it and the line came
    // back as a climb to 70 with no start.
    expect(shapeFromTitle("Bench from 70 to 100 kg")).toMatchObject({ start: 70, target: 100 })
  })

  it("and one steep enough that it was already working", () => {
    expect(shapeFromTitle("Get from 5 to 10 pull-ups")).toMatchObject({ start: 5, target: 10 })
  })
})

describe("what it refuses to guess at", () => {
  it("two numbers with no connector are left alone", () => {
    expect(connectedPair("Read 12 books in 6 months")).toBeNull()
    expect(shapeFromTitle("Read 12 books in 6 months").start).toBeNull()
  })

  it("a year is a deadline, not a rung", () => {
    expect(connectedPair("Cut sugar from 2026 to 2027")).toBeNull()
    expect(shapeFromTitle("Squat 100 kg by 2027")).toMatchObject({ target: 100, start: null })
  })

  it("the same number twice is a climb with no distance in it", () => {
    expect(connectedPair("Hold bench from 100 to 100 kg")).toBeNull()
  })

  it("one number is not a pair", () => {
    expect(connectedPair("Bench press 100 kg")).toBeNull()
    expect(connectedPair("Save 50000 DKK")).toBeNull()
  })
})

describe("still wrong, and not this change's doing", () => {
  /**
   * Both come from `risingNumbers`, which reads any two numbers half again
   * apart as a ladder whether or not anything joined them. These assert the
   * CURRENT behaviour so that fixing it turns this block red rather than
   * leaving the fix unnoticed — they are a record of damage, not a standard.
   */
  it("a set scheme is read as a climb", () => {
    // "3x8 bench press 26 kg" is three sets of eight at twenty-six kilos.
    expect(shapeFromTitle("3x8 bench press 26 kg")).toMatchObject({ start: 3, target: 26 })
  })

  it("a distance and a time are read as a climb", () => {
    expect(shapeFromTitle("Run 5k in 30 minutes")).toMatchObject({ start: 5, target: 30 })
  })
})
