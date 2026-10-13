import { describe, test, expect } from "vitest"
import { APPROACH_OUTCOMES, SET_TYPES } from "@/src/db/trackingEnums"
import { OUTCOME_OPTIONS, SET_TYPE_OPTIONS } from "@/src/tracking/config"

// ============================================================================
// Exhaustiveness — config.ts must stay in sync
// ============================================================================

describe("config.ts exhaustiveness", () => {
  test("OUTCOME_OPTIONS covers all APPROACH_OUTCOMES values", () => {
    const optionValues = new Set(OUTCOME_OPTIONS.map(o => o.value))
    for (const outcome of APPROACH_OUTCOMES) {
      expect(optionValues.has(outcome)).toBe(true)
    }
    expect(optionValues.size).toBe(APPROACH_OUTCOMES.length)
  })

  test("SET_TYPE_OPTIONS covers all SET_TYPES values", () => {
    const optionValues = new Set(SET_TYPE_OPTIONS.map(o => o.value))
    for (const st of SET_TYPES) {
      expect(optionValues.has(st)).toBe(true)
    }
    expect(optionValues.size).toBe(SET_TYPES.length)
  })
})
