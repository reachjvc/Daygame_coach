import { describe, test, expect } from "vitest"
import { GOAL_DISPLAY_CATEGORIES } from "@/src/db/goalEnums"
import { CATEGORY_ORDER } from "@/src/goals/config"

// ============================================================================
// Exhaustiveness — config.ts must stay in sync
// ============================================================================

// config.ts has a compile-time check for CATEGORY_ORDER too, but it builds its
// record through an `as` cast, which defeats it — these two are the real guard.
describe("config.ts exhaustiveness", () => {
  test("CATEGORY_ORDER contains every GOAL_DISPLAY_CATEGORIES value", () => {
    for (const cat of GOAL_DISPLAY_CATEGORIES) {
      expect(CATEGORY_ORDER).toContain(cat)
    }
  })

  test("CATEGORY_ORDER has no duplicates", () => {
    const unique = new Set(CATEGORY_ORDER)
    expect(unique.size).toBe(CATEGORY_ORDER.length)
  })
})
