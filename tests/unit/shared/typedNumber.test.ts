/**
 * AN EMPTY BOX IS NOT A ZERO.
 *
 * `Number("")` is 0 and `parseFloat("")` is NaN. Both were used on weight
 * boxes, and both invent an answer: on a bench press the invented answer was
 * "0 kg", a set that then hides inside every volume total and every personal
 * best — and which nothing downstream can tell apart from a pull-up, where 0 kg
 * added is the literal truth.
 */

import { describe, it, expect } from "vitest"
import { typedNumber } from "@/src/shared/typedNumber"

describe("typedNumber", () => {
  it("blank is nothing, not zero", () => {
    expect(typedNumber("")).toBeNull()
    expect(typedNumber("   ")).toBeNull()
    expect(typedNumber("\t\n")).toBeNull()
  })

  it("a typed zero IS zero", () => {
    // Somebody who types 0 on a pull-up means it: just them, no plates.
    expect(typedNumber("0")).toBe(0)
    expect(typedNumber("0.0")).toBe(0)
  })

  it("reads a number the way the box shows it", () => {
    expect(typedNumber("102.5")).toBe(102.5)
    expect(typedNumber(" 60 ")).toBe(60)
    expect(typedNumber("-5")).toBe(-5)
  })

  it("nonsense is nothing, not NaN", () => {
    // NaN spreads: NaN > 0 is false, NaN in a total makes the total NaN, and a
    // screen then prints "NaN kg lifted".
    expect(typedNumber("abc")).toBeNull()
    expect(typedNumber("1.2.3")).toBeNull()
    expect(typedNumber("Infinity")).toBeNull()
  })
})
