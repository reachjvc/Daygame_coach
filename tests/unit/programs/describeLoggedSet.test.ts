/**
 * "PULL-UP 0×12" IS NOT A FACT ABOUT A PULL-UP.
 *
 * Nothing is loaded on it, so the weight column holds a zero the app put
 * there, and the reps are the whole achievement. Three screens formatted a
 * logged set themselves and all three printed that zero differently — History
 * as "0×12", the expanded row as "0 kg × 12", Progress with a branch of its
 * own. Three copies of one rule means the fix for one is never the fix for the
 * others.
 *
 * The unit is the reader's and the conversion happens inside, because the
 * other half of this bug was a kilogram number printed under an "lb" label.
 */

import { describe, it, expect } from "vitest"
import { describeLoggedSet } from "@/src/programs/programsService"

describe("describeLoggedSet", () => {
  it("says weight × reps for a loaded lift, in the lifter's own unit", () => {
    expect(describeLoggedSet({ exercise: "Squat", weightKg: 100, reps: 5 }, "kg")).toBe("100 kg × 5")
    // 100 kg is 220.5 lb, rounded the way a bar is actually adjustable.
    expect(describeLoggedSet({ exercise: "Squat", weightKg: 100, reps: 5 }, "lb")).toBe("220.5 lb × 5")
  })

  it("says reps alone when nothing was loaded", () => {
    expect(describeLoggedSet({ exercise: "Pull-up", weightKg: 0, reps: 12 }, "kg")).toBe("12 reps")
    expect(describeLoggedSet({ exercise: "Pull-up", weightKg: 0, reps: 12 }, "lb")).toBe("12 reps")
  })

  it("says seconds for a lift held for time, loaded or not", () => {
    // The 30 is in the `reps` column and is not thirty reps of anything.
    expect(describeLoggedSet({ exercise: "Farmer's Carry", weightKg: 40, reps: 30 }, "kg")).toBe(
      "40 kg × 30 s"
    )
    expect(describeLoggedSet({ exercise: "Plank", weightKg: 0, reps: 60 }, "kg")).toBe("60 s")
  })

  it("knows a timed lift by its library id when the name was typed by hand", () => {
    expect(
      describeLoggedSet(
        { exercise: "Heavy walk", libraryId: "lib_farmer_carry", weightKg: 40, reps: 30 },
        "kg"
      )
    ).toBe("40 kg × 30 s")
  })

  it("collapses a run of identical sets into one line", () => {
    expect(describeLoggedSet({ exercise: "Squat", weightKg: 100, reps: 5, count: 3 }, "kg")).toBe(
      "3 × 100 kg × 5"
    )
    expect(describeLoggedSet({ exercise: "Pull-up", weightKg: 0, reps: 8, count: 4 }, "kg")).toBe(
      "4 × 8 reps"
    )
  })

  it("cannot produce '0 kg' or '0×' for any shape of set", () => {
    const everything = [
      describeLoggedSet({ exercise: "Pull-up", weightKg: 0, reps: 12 }, "kg"),
      describeLoggedSet({ exercise: "Pull-up", weightKg: 0, reps: 12 }, "lb"),
      describeLoggedSet({ exercise: "Plank", weightKg: 0, reps: 60 }, "kg"),
      describeLoggedSet({ exercise: "Push-up", weightKg: 0, reps: 20, count: 3 }, "kg"),
    ]
    for (const line of everything) {
      expect(line, `"${line}" prints a zero nobody lifted`).not.toMatch(/\b0\s*(kg|lb)|\b0\s*×/)
    }
  })

  it("rounds a converted weight the way a bar can be loaded", () => {
    // 61.23 kg is a 135 lb bench stored and read back; "134.99 lb × 5" is not
    // what anybody lifted.
    expect(describeLoggedSet({ exercise: "Bench Press", weightKg: 61.23, reps: 5 }, "lb")).toBe(
      "135 lb × 5"
    )
  })
})
