import { describe, it, expect } from "vitest"
import { BUILD_STEPS, TAB_ORDER, USE_STEPS } from "@/src/goals/data/northStar"

describe("the rail's two groups", () => {
  it("together hold every step once", () => {
    expect(BUILD_STEPS.length + USE_STEPS.length).toBe(TAB_ORDER.length)
  })

  it("put every step in exactly one group", () => {
    for (const id of TAB_ORDER) {
      expect(Number(BUILD_STEPS.includes(id)) + Number(USE_STEPS.includes(id))).toBe(1)
    }
  })
})
