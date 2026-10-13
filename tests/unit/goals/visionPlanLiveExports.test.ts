import { describe, it, expect } from "vitest"
import { addDays, goalHorizon, REASON_PROMPTS } from "@/src/goals/visionPlanService"

/**
 * The exports of visionPlanService that a LIVE page uses. The rest of that
 * module is reached only from the /test/vision-plan lab, and its tests were
 * retired with the decision to keep the lab pages but not test them.
 *
 *   goalHorizon     → northStarService (the North Star page's horizon labels)
 *   REASON_PROMPTS  → north-star/GoalCard (the reasons drill)
 *   goalNeedsAction → northStarService; covered in northStarService.test.ts
 */

describe("goalHorizon", () => {
  const MON = "2026-06-01"

  it("habit goals are 'now'; dated outcome goals classify by distance", () => {
    expect(goalHorizon({ type: "habit_ramp", targetDate: null }, MON)).toBe("now")
    expect(goalHorizon({ type: "milestone_ladder", targetDate: addDays(MON, 60) }, MON)).toBe("quarter")
    expect(goalHorizon({ type: "milestone_ladder", targetDate: addDays(MON, 300) }, MON)).toBe("year")
    expect(goalHorizon({ type: "milestone_ladder", targetDate: addDays(MON, 1000) }, MON)).toBe("vision")
    expect(goalHorizon({ type: "milestone_ladder", targetDate: null }, MON)).toBe("year")
  })

  it("dates an achievement instead of calling it 'now'", () => {
    const TODAY = "2026-07-28"
    expect(goalHorizon({ type: "achievement", targetDate: addDays(TODAY, 400) }, TODAY)).not.toBe("now")
  })
})

describe("REASON_PROMPTS", () => {
  it("prompts cover distinct angles, not one restated", () => {
    expect(REASON_PROMPTS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(REASON_PROMPTS.map((p) => p.id)).size).toBe(REASON_PROMPTS.length)
    expect(new Set(REASON_PROMPTS.map((p) => p.question)).size).toBe(REASON_PROMPTS.length)
    expect(REASON_PROMPTS.every((p) => p.question.includes("?"))).toBe(true)
    // The blunt ones are the point — a polite list doesn't move anyone.
    expect(REASON_PROMPTS.some((p) => /sex|touch/i.test(p.question))).toBe(true)
    expect(REASON_PROMPTS.some((p) => /takes? from you/i.test(p.question))).toBe(true)
  })
})
