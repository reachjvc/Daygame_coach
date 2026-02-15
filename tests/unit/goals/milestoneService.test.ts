import { describe, test, expect } from "vitest"
import {
  applyCurve,
  interpolateWithControlPoints,
  roundToNiceNumber,
  generateMilestoneLadder,
  computeRampMilestoneDates,
  computeAchievementProgress,
} from "@/src/goals/milestoneService"
import type {
  MilestoneLadderConfig,
  CurveControlPoint,
  HabitRampStep,
  AchievementWeight,
} from "@/src/goals/types"

// ============================================================================
// applyCurve
// ============================================================================

describe("applyCurve", () => {
  test("returns 0 for t=0", () => {
    expect(applyCurve(0, 5)).toBe(0)
  })

  test("returns 1 for t=1", () => {
    expect(applyCurve(1, 5)).toBe(1)
  })

  test("tension=0 is linear (identity)", () => {
    expect(applyCurve(0.25, 0)).toBeCloseTo(0.25, 5)
    expect(applyCurve(0.5, 0)).toBeCloseTo(0.5, 5)
    expect(applyCurve(0.75, 0)).toBeCloseTo(0.75, 5)
  })

  test("positive tension: f(0.5) < 0.5 (front-loaded milestones)", () => {
    const mid = applyCurve(0.5, 5)
    expect(mid).toBeLessThan(0.5)
    expect(mid).toBeGreaterThan(0)
  })

  test("negative tension: f(0.5) > 0.5 (back-loaded milestones)", () => {
    const mid = applyCurve(0.5, -5)
    expect(mid).toBeGreaterThan(0.5)
    expect(mid).toBeLessThan(1)
  })

  test("higher tension makes curve more extreme", () => {
    const mild = applyCurve(0.5, 2)
    const strong = applyCurve(0.5, 8)
    expect(strong).toBeLessThan(mild)
  })

  test("clamps negative t to 0", () => {
    expect(applyCurve(-0.5, 5)).toBe(0)
  })

  test("clamps t > 1 to 1", () => {
    expect(applyCurve(1.5, 5)).toBe(1)
  })

  test("monotonically increasing for positive tension", () => {
    const steps = Array.from({ length: 11 }, (_, i) => i / 10)
    const values = steps.map((t) => applyCurve(t, 5))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
    }
  })

  test("monotonically increasing for negative tension", () => {
    const steps = Array.from({ length: 11 }, (_, i) => i / 10)
    const values = steps.map((t) => applyCurve(t, -5))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
    }
  })
})

// ============================================================================
// interpolateWithControlPoints
// ============================================================================

describe("interpolateWithControlPoints", () => {
  test("no control points falls back to base curve", () => {
    const result = interpolateWithControlPoints(0.5, [], 0)
    expect(result).toBeCloseTo(0.5, 5)
  })

  test("passes through a single control point", () => {
    const cp: CurveControlPoint[] = [{ x: 0.5, y: 0.8 }]
    // At x=0.5, result must be 0.8 regardless of tension
    const result = interpolateWithControlPoints(0.5, cp, 5)
    expect(result).toBeCloseTo(0.8, 5)
  })

  test("passes through multiple control points", () => {
    const cps: CurveControlPoint[] = [
      { x: 0.25, y: 0.1 },
      { x: 0.75, y: 0.9 },
    ]
    expect(interpolateWithControlPoints(0.25, cps, 3)).toBeCloseTo(0.1, 5)
    expect(interpolateWithControlPoints(0.75, cps, 3)).toBeCloseTo(0.9, 5)
  })

  test("returns 0 at t=0 and 1 at t=1", () => {
    const cp: CurveControlPoint[] = [{ x: 0.5, y: 0.3 }]
    expect(interpolateWithControlPoints(0, cp, 5)).toBeCloseTo(0, 5)
    expect(interpolateWithControlPoints(1, cp, 5)).toBeCloseTo(1, 5)
  })

  test("ignores control points outside 0–1 range", () => {
    const cps: CurveControlPoint[] = [
      { x: -0.5, y: 0.2 },
      { x: 1.5, y: 0.8 },
      { x: 0.5, y: 0.6 },
    ]
    // Only x=0.5 should be used
    const result = interpolateWithControlPoints(0.5, cps, 0)
    expect(result).toBeCloseTo(0.6, 5)
  })

  test("monotonically increasing with well-placed control points", () => {
    const cps: CurveControlPoint[] = [{ x: 0.5, y: 0.3 }]
    const steps = Array.from({ length: 21 }, (_, i) => i / 20)
    const values = steps.map((t) => interpolateWithControlPoints(t, cps, 3))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] - 0.0001) // small tolerance
    }
  })
})

// ============================================================================
// roundToNiceNumber
// ============================================================================

describe("roundToNiceNumber", () => {
  test("returns 0 for 0 or negative", () => {
    expect(roundToNiceNumber(0)).toBe(0)
    expect(roundToNiceNumber(-5)).toBe(0)
  })

  test("small values round to 1", () => {
    expect(roundToNiceNumber(0.3)).toBe(1)
    expect(roundToNiceNumber(1)).toBe(1)
    expect(roundToNiceNumber(1.4)).toBe(1)
  })

  test("values near 2-3 round sensibly", () => {
    expect(roundToNiceNumber(2.1)).toBe(2)
    expect(roundToNiceNumber(2.8)).toBe(3)
    expect(roundToNiceNumber(3.3)).toBe(3)
  })

  test("values in tens range", () => {
    const v10 = roundToNiceNumber(12)
    expect(v10).toBeGreaterThanOrEqual(10)
    expect(v10).toBeLessThanOrEqual(15)

    const v50 = roundToNiceNumber(48)
    expect(v50).toBeGreaterThanOrEqual(40)
    expect(v50).toBeLessThanOrEqual(50)
  })

  test("values in hundreds range", () => {
    const v100 = roundToNiceNumber(116)
    expect(v100).toBeGreaterThanOrEqual(100)
    expect(v100).toBeLessThanOrEqual(150)

    const v500 = roundToNiceNumber(480)
    expect(v500).toBeGreaterThanOrEqual(400)
    expect(v500).toBeLessThanOrEqual(500)
  })

  test("preserves exact nice numbers", () => {
    expect(roundToNiceNumber(5)).toBe(5)
    expect(roundToNiceNumber(10)).toBe(10)
    expect(roundToNiceNumber(100)).toBe(100)
    expect(roundToNiceNumber(1000)).toBe(1000)
  })

  test("always returns a positive integer for positive input", () => {
    const testValues = [1.1, 3.7, 7.2, 15.8, 42, 99, 230, 750, 1500]
    for (const v of testValues) {
      const result = roundToNiceNumber(v)
      expect(result).toBeGreaterThan(0)
      expect(Number.isInteger(result)).toBe(true)
    }
  })
})

// ============================================================================
// generateMilestoneLadder
// ============================================================================

describe("generateMilestoneLadder", () => {
  test("generates correct number of steps", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 1000,
      steps: 15,
      curveTension: 5,
    }
    const result = generateMilestoneLadder(config)
    expect(result).toHaveLength(15)
  })

  test("first milestone is start, last is target", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 1000,
      steps: 15,
      curveTension: 5,
    }
    const result = generateMilestoneLadder(config)
    expect(result[0].value).toBe(1)
    expect(result[14].value).toBe(1000)
  })

  test("milestones are monotonically increasing", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 1000,
      steps: 15,
      curveTension: 5,
    }
    const result = generateMilestoneLadder(config)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].value).toBeGreaterThan(result[i - 1].value)
    }
  })

  test("tension=0 produces balanced geometric milestones", () => {
    const config: MilestoneLadderConfig = {
      start: 0,
      target: 100,
      steps: 11,
      curveTension: 0,
    }
    const result = generateMilestoneLadder(config)
    // With log-space pool selection, geometric midpoint: √(1·100) = 10
    const midRaw = result[5].rawValue
    expect(midRaw).toBeCloseTo(10, 0)
  })

  test("positive tension front-loads milestones (small values early)", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 1000,
      steps: 15,
      curveTension: 5,
    }
    const result = generateMilestoneLadder(config)
    // The median milestone (step 7) should be well below the midpoint (500)
    expect(result[7].rawValue).toBeLessThan(200)
  })

  test("negative tension back-loads milestones (big values early)", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 1000,
      steps: 15,
      curveTension: -5,
    }
    const result = generateMilestoneLadder(config)
    // The median milestone should be well above the midpoint
    expect(result[7].rawValue).toBeGreaterThan(500)
  })

  test("steps=1 returns just the target", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 100,
      steps: 1,
      curveTension: 5,
    }
    const result = generateMilestoneLadder(config)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(100)
  })

  test("steps=2 returns start and target only", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 1000,
      steps: 2,
      curveTension: 5,
    }
    const result = generateMilestoneLadder(config)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe(1)
    expect(result[1].value).toBe(1000)
  })

  test("control points are respected", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 1000,
      steps: 11,
      curveTension: 5,
      controlPoints: [{ x: 0.5, y: 0.5 }],
    }
    const result = generateMilestoneLadder(config)
    // Control point at y=0.5 → geometric midpoint: sqrt(1*1000) ≈ 31.6
    const midRaw = result[5].rawValue
    expect(midRaw).toBeCloseTo(31.6, 0)
  })

  test("works with small target values", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 10,
      steps: 5,
      curveTension: 3,
    }
    const result = generateMilestoneLadder(config)
    expect(result).toHaveLength(5)
    expect(result[0].value).toBe(1)
    expect(result[4].value).toBe(10)
    for (let i = 1; i < result.length; i++) {
      expect(result[i].value).toBeGreaterThan(result[i - 1].value)
    }
  })

  test("pool selection avoids pathological gaps for large ranges", () => {
    const config: MilestoneLadderConfig = {
      start: 1,
      target: 1000,
      steps: 15,
      curveTension: 0,
    }
    const result = generateMilestoneLadder(config)
    const values = result.map((m) => m.value)

    // Every consecutive pair should have a ratio ≤ 5×
    for (let i = 1; i < values.length; i++) {
      const ratio = values[i] / Math.max(values[i - 1], 1)
      expect(ratio).toBeLessThanOrEqual(5)
    }

    // Second-to-last milestone should be ≥ 300 (no 100→1000 gap)
    expect(values[13]).toBeGreaterThanOrEqual(300)
  })

  test("absolute increments never shrink (non-decreasing)", () => {
    // Regression: greedy pool selection produced 150→250→300 (+100, +50)
    // because 250 was closest in log-space, creating a jarring halving of
    // the increment at a higher magnitude. Increments should never shrink.
    const configs: MilestoneLadderConfig[] = [
      { start: 1, target: 1000, steps: 20, curveTension: 0 },
      { start: 1, target: 1000, steps: 16, curveTension: 2 },
      { start: 1, target: 500, steps: 10, curveTension: 0 },
      { start: 1, target: 100, steps: 8, curveTension: 1 },
    ]

    for (const config of configs) {
      const result = generateMilestoneLadder(config)
      const values = result.map((m) => m.value)
      let prevDelta = 0
      for (let i = 1; i < values.length; i++) {
        const delta = values[i] - values[i - 1]
        expect(delta).toBeGreaterThanOrEqual(prevDelta)
        prevDelta = delta
      }
    }
  })
})

// ============================================================================
// computeRampMilestoneDates
// ============================================================================

describe("computeRampMilestoneDates", () => {
  const startDate = new Date("2026-02-13")

  test("returns empty for empty milestones", () => {
    const ramp: HabitRampStep[] = [{ frequencyPerWeek: 10, durationWeeks: 4 }]
    expect(computeRampMilestoneDates([], ramp, startDate)).toEqual([])
  })

  test("returns empty for empty ramp", () => {
    expect(computeRampMilestoneDates([10, 20], [], startDate)).toEqual([])
  })

  test("computes dates for a simple single-step ramp", () => {
    const milestones = [10, 20, 30]
    const ramp: HabitRampStep[] = [{ frequencyPerWeek: 10, durationWeeks: 10 }]

    const result = computeRampMilestoneDates(milestones, ramp, startDate)

    expect(result).toHaveLength(3)
    // 10/week: hit 10 at week 1, 20 at week 2, 30 at week 3
    expect(result[0].milestoneValue).toBe(10)
    expect(result[0].weekNumber).toBe(1)
    expect(result[1].milestoneValue).toBe(20)
    expect(result[1].weekNumber).toBe(2)
    expect(result[2].milestoneValue).toBe(30)
    expect(result[2].weekNumber).toBe(3)
  })

  test("computes correct dates with ramp increase", () => {
    const milestones = [10, 40, 100]
    const ramp: HabitRampStep[] = [
      { frequencyPerWeek: 10, durationWeeks: 4 }, // 40 cumulative after 4 weeks
      { frequencyPerWeek: 15, durationWeeks: 4 }, // 100 cumulative after 8 weeks
    ]

    const result = computeRampMilestoneDates(milestones, ramp, startDate)

    expect(result).toHaveLength(3)
    expect(result[0].milestoneValue).toBe(10)
    expect(result[0].weekNumber).toBe(1) // 10 after week 1

    expect(result[1].milestoneValue).toBe(40)
    expect(result[1].weekNumber).toBe(4) // 40 after week 4

    expect(result[2].milestoneValue).toBe(100)
    expect(result[2].weekNumber).toBe(8) // 40 + (4 * 15) = 100 after week 8
  })

  test("returns only reachable milestones if ramp ends before target", () => {
    const milestones = [10, 50, 100]
    const ramp: HabitRampStep[] = [{ frequencyPerWeek: 10, durationWeeks: 3 }]
    // Only 30 cumulative after 3 weeks

    const result = computeRampMilestoneDates(milestones, ramp, startDate)

    expect(result).toHaveLength(1) // Only 10 is reachable
    expect(result[0].milestoneValue).toBe(10)
  })

  test("dates are correct calendar dates", () => {
    const milestones = [10]
    const ramp: HabitRampStep[] = [{ frequencyPerWeek: 10, durationWeeks: 2 }]

    const result = computeRampMilestoneDates(milestones, ramp, startDate)

    expect(result).toHaveLength(1)
    const expected = new Date("2026-02-13")
    expected.setDate(expected.getDate() + 7) // 1 week later
    expect(result[0].estimatedDate.toISOString().split("T")[0]).toBe(
      expected.toISOString().split("T")[0]
    )
  })

  test("handles milestones passed in non-sorted order", () => {
    const milestones = [30, 10, 20]
    const ramp: HabitRampStep[] = [{ frequencyPerWeek: 10, durationWeeks: 5 }]

    const result = computeRampMilestoneDates(milestones, ramp, startDate)

    expect(result).toHaveLength(3)
    expect(result[0].milestoneValue).toBe(10)
    expect(result[1].milestoneValue).toBe(20)
    expect(result[2].milestoneValue).toBe(30)
  })

  test("multiple milestones can be hit in the same week", () => {
    const milestones = [1, 2, 5, 10]
    const ramp: HabitRampStep[] = [{ frequencyPerWeek: 10, durationWeeks: 2 }]

    const result = computeRampMilestoneDates(milestones, ramp, startDate)

    // All milestones <= 10 hit in week 1
    expect(result).toHaveLength(4)
    expect(result[0].weekNumber).toBe(1)
    expect(result[1].weekNumber).toBe(1)
    expect(result[2].weekNumber).toBe(1)
    expect(result[3].weekNumber).toBe(1)
  })
})

// ============================================================================
// computeAchievementProgress
// ============================================================================

describe("computeAchievementProgress", () => {
  test("returns 0% when no goals have progress", () => {
    const weights: AchievementWeight[] = [
      { goalId: "approaches", weight: 0.4 },
      { goalId: "numbers", weight: 0.3 },
      { goalId: "instadates", weight: 0.3 },
    ]
    const progress = new Map<string, number>()

    const result = computeAchievementProgress(weights, progress)

    expect(result.progressPercent).toBe(0)
    expect(result.contributingGoals).toHaveLength(3)
    expect(result.contributingGoals.every((g) => g.contribution === 0)).toBe(true)
  })

  test("computes weighted progress correctly", () => {
    const weights: AchievementWeight[] = [
      { goalId: "approaches", weight: 0.5 },
      { goalId: "numbers", weight: 0.3 },
      { goalId: "instadates", weight: 0.2 },
    ]
    const progress = new Map([
      ["approaches", 80],
      ["numbers", 60],
      ["instadates", 40],
    ])

    const result = computeAchievementProgress(weights, progress)

    // 0.5*80 + 0.3*60 + 0.2*40 = 40 + 18 + 8 = 66
    expect(result.progressPercent).toBe(66)
  })

  test("caps at 100%", () => {
    const weights: AchievementWeight[] = [{ goalId: "a", weight: 1.0 }]
    const progress = new Map([["a", 150]])

    const result = computeAchievementProgress(weights, progress)
    expect(result.progressPercent).toBe(100)
  })

  test("handles missing goals gracefully (defaults to 0)", () => {
    const weights: AchievementWeight[] = [
      { goalId: "exists", weight: 0.5 },
      { goalId: "missing", weight: 0.5 },
    ]
    const progress = new Map([["exists", 100]])

    const result = computeAchievementProgress(weights, progress)

    // 0.5*100 + 0.5*0 = 50
    expect(result.progressPercent).toBe(50)
  })

  test("returns contributing goal details", () => {
    const weights: AchievementWeight[] = [
      { goalId: "approaches", weight: 0.6 },
      { goalId: "numbers", weight: 0.4 },
    ]
    const progress = new Map([
      ["approaches", 50],
      ["numbers", 75],
    ])

    const result = computeAchievementProgress(weights, progress)

    expect(result.contributingGoals).toHaveLength(2)

    const approaches = result.contributingGoals.find((g) => g.goalId === "approaches")!
    expect(approaches.weight).toBe(0.6)
    expect(approaches.goalProgress).toBe(50)
    expect(approaches.contribution).toBe(30) // 0.6 * 50

    const numbers = result.contributingGoals.find((g) => g.goalId === "numbers")!
    expect(numbers.weight).toBe(0.4)
    expect(numbers.goalProgress).toBe(75)
    expect(numbers.contribution).toBe(30) // 0.4 * 75

    expect(result.progressPercent).toBe(60)
  })

  test("100% when all goals are complete", () => {
    const weights: AchievementWeight[] = [
      { goalId: "a", weight: 0.5 },
      { goalId: "b", weight: 0.5 },
    ]
    const progress = new Map([
      ["a", 100],
      ["b", 100],
    ])

    const result = computeAchievementProgress(weights, progress)
    expect(result.progressPercent).toBe(100)
  })
})
