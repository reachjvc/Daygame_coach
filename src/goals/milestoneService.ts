/**
 * Milestone ladder generation, curve math, date derivation, and achievement progress.
 *
 * All functions are pure — no DB or side effects.
 */

import type {
  MilestoneLadderConfig,
  CurveControlPoint,
  GeneratedMilestone,
  HabitRampStep,
  RampMilestoneDate,
  AchievementWeight,
  AchievementProgressResult,
} from "./types"

// ============================================================================
// Curve Engine
// ============================================================================

/**
 * Apply an exponential curve to a normalized 0–1 input.
 *
 * tension > 0 → front-loaded milestones (small values early, big jumps late).
 *   This is the default "quick early wins" curve.
 * tension = 0 → linear.
 * tension < 0 → back-loaded (big values early, diminishing increments).
 *
 * Formula: f(t) = (e^(k·t) − 1) / (e^k − 1)
 * At k=0 this is the identity via L'Hôpital (implemented as linear fallback).
 */
export function applyCurve(t: number, tension: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (Math.abs(tension) < 0.001) return t
  return (Math.exp(tension * t) - 1) / (Math.exp(tension) - 1)
}

/**
 * Interpolate a value through optional control points.
 *
 * Control points divide the 0–1 space into segments. Within each segment
 * the base curve (with tension) is applied, scaled to the segment's range.
 * The curve is guaranteed to pass through every control point.
 */
export function interpolateWithControlPoints(
  t: number,
  controlPoints: CurveControlPoint[],
  tension: number
): number {
  if (controlPoints.length === 0) return applyCurve(t, tension)

  // Build sorted anchor list: start → control points → end
  const anchors: CurveControlPoint[] = [
    { x: 0, y: 0 },
    ...controlPoints.filter((p) => p.x > 0 && p.x < 1).sort((a, b) => a.x - b.x),
    { x: 1, y: 1 },
  ]

  // Find the segment containing t
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    if (t >= a.x && t <= b.x) {
      const segmentWidth = b.x - a.x
      if (segmentWidth === 0) return a.y
      const localT = (t - a.x) / segmentWidth
      const curved = applyCurve(localT, tension)
      return a.y + (b.y - a.y) * curved
    }
  }

  // Fallback (shouldn't reach here for t in 0–1)
  return applyCurve(t, tension)
}

// ============================================================================
// Nice Number Rounding
// ============================================================================

/**
 * Round a raw milestone value to a "nice" human-friendly number.
 *
 * Uses magnitude-aware rounding: small values round to integers,
 * larger values snap to multiples of 5, 10, 25, 50, etc.
 */
// Multipliers for magnitude-based rounding (values >= 10)
const NICE_MULTIPLIERS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10]

export function roundToNiceNumber(value: number): number {
  if (value <= 0) return 0

  // For small values, snap to human-friendly milestones: 1, 2, 3, 5, 10
  if (value < 1.5) return 1
  if (value < 2.5) return 2
  if (value < 3.5) return 3
  if (value < 6.5) return 5
  if (value < 10) return 10

  // For values >= 10, use magnitude-based rounding
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude // 1.0 – 9.99

  let closest = NICE_MULTIPLIERS[0]
  let closestDiff = Math.abs(normalized - closest)

  for (const nice of NICE_MULTIPLIERS) {
    const diff = Math.abs(normalized - nice)
    if (diff <= closestDiff) { // <= prefers rounding up on ties
      closest = nice
      closestDiff = diff
    }
  }

  return Math.round(closest * magnitude)
}

/**
 * Build a sorted pool of nice numbers in (min, max) for bump resolution.
 */
function buildNicePool(min: number, max: number): number[] {
  const pool = new Set<number>()
  // Add curated small milestones (no 4, 6, 7, 8, 9)
  for (const v of [1, 2, 3, 5, 10]) {
    if (v > min && v < max) pool.add(v)
  }
  // Add magnitude-based values for >= 10
  let mag = 10
  while (mag <= max * 10) {
    for (const m of NICE_MULTIPLIERS) {
      const v = Math.round(m * mag)
      if (v > min && v < max) pool.add(v)
    }
    mag *= 10
  }
  return [...pool].sort((a, b) => a - b)
}

// ============================================================================
// Pool-Based Milestone Selection
// ============================================================================

/**
 * Select N milestones from a pre-computed pool of nice numbers,
 * using the curve as a selection bias in log-space.
 *
 * Guarantees: every milestone is a "nice" number, monotonically increasing,
 * and the maximum gap between consecutive milestones is bounded by pool density.
 */
function selectFromPool(
  candidates: number[],
  config: MilestoneLadderConfig
): GeneratedMilestone[] {
  const { start, target, steps, curveTension, controlPoints = [] } = config
  const n = candidates.length

  // Map candidates to log-space positions (0–1)
  const effStart = Math.max(start, 1)
  const logStart = Math.log(effStart)
  const logTarget = Math.log(Math.max(target, effStart + 1))
  const logRange = logTarget - logStart

  const logPos = candidates.map(v => {
    if (v <= 0 || logRange <= 0) return 0
    return Math.max(0, Math.min(1, (Math.log(v) - logStart) / logRange))
  })

  const milestones: GeneratedMilestone[] = []
  let lo = 0

  for (let i = 0; i < steps; i++) {
    if (i === 0) {
      milestones.push({ step: 0, rawValue: start, value: start })
      const startIdx = candidates.indexOf(start)
      lo = (startIdx >= 0 ? startIdx : 0) + 1
      continue
    }
    if (i === steps - 1) {
      milestones.push({ step: i, rawValue: target, value: target })
      continue
    }

    const t = i / (steps - 1)
    const desired = interpolateWithControlPoints(t, controlPoints, curveTension)
    const rawValue = logRange > 0
      ? effStart * Math.pow(target / effStart, desired)
      : start + (target - start) * desired

    // Must leave enough candidates for remaining steps
    const hi = n - (steps - i)

    let bestIdx = lo
    let bestDist = Math.abs(logPos[lo] - desired)
    for (let j = lo + 1; j <= hi; j++) {
      const d = Math.abs(logPos[j] - desired)
      if (d < bestDist) {
        bestDist = d
        bestIdx = j
      }
    }

    milestones.push({ step: i, rawValue, value: candidates[bestIdx] })
    lo = bestIdx + 1
  }

  return milestones
}

// ============================================================================
// Milestone Ladder Generator
// ============================================================================

/**
 * Generate a milestone ladder from configuration.
 *
 * When the nice-number pool has enough candidates, uses pool-based selection
 * (log-space matching with curve bias). Falls back to curve + rounding for
 * small ranges where the pool is too sparse.
 *
 * The first milestone is always `start`, the last is always `target`.
 * Intermediate milestones are guaranteed to be monotonically increasing.
 */
export function generateMilestoneLadder(config: MilestoneLadderConfig): GeneratedMilestone[] {
  const { start, target, steps, curveTension, controlPoints = [] } = config

  if (steps < 2) {
    return [{ step: 0, rawValue: target, value: target }]
  }

  // Build candidate pool of nice numbers including endpoints
  const poolValues = buildNicePool(start, target)
  const candidates = [...new Set([start, ...poolValues, target])].sort((a, b) => a - b)

  // Pool-based selection when enough candidates exist
  if (candidates.length >= steps) {
    return selectFromPool(candidates, config)
  }

  // Fallback: curve + round for small ranges with sparse pools
  const range = target - start
  const useLog = start > 0 && target / start >= 10
  const milestones: GeneratedMilestone[] = []

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)

    if (i === 0) {
      milestones.push({ step: 0, rawValue: start, value: start })
      continue
    }
    if (i === steps - 1) {
      milestones.push({ step: i, rawValue: target, value: target })
      continue
    }

    const curved = interpolateWithControlPoints(t, controlPoints, curveTension)
    const rawValue = useLog
      ? start * Math.pow(target / start, curved)
      : start + range * curved
    milestones.push({ step: i, rawValue, value: roundToNiceNumber(rawValue) })
  }

  // Enforce monotonic increase
  for (let i = 1; i < milestones.length - 1; i++) {
    if (milestones[i].value <= milestones[i - 1].value) {
      const nextNice = poolValues.find(v => v > milestones[i - 1].value)
      milestones[i].value = nextNice ?? milestones[i - 1].value + 1
    }
  }

  return milestones
}

// ============================================================================
// Habit Ramp → Milestone Date Calculator
// ============================================================================

/**
 * Given milestone target values and a habit ramp schedule, compute
 * the estimated date each milestone will be reached.
 *
 * Walks week by week through the ramp, accumulating volume.
 * When cumulative volume passes a milestone, records the date.
 *
 * @param milestoneValues - sorted ascending target values (e.g., [1, 5, 10, 25, ...])
 * @param rampSteps - habit ramp schedule (e.g., 10/wk for 4 weeks, then 15/wk for 4 weeks, ...)
 * @param startDate - when the user starts
 */
export function computeRampMilestoneDates(
  milestoneValues: number[],
  rampSteps: HabitRampStep[],
  startDate: Date
): RampMilestoneDate[] {
  if (milestoneValues.length === 0 || rampSteps.length === 0) return []

  const sorted = [...milestoneValues].sort((a, b) => a - b)
  const results: RampMilestoneDate[] = []
  let cumulative = 0
  let weekNumber = 0
  let milestoneIdx = 0

  for (const step of rampSteps) {
    for (let w = 0; w < step.durationWeeks; w++) {
      cumulative += step.frequencyPerWeek
      weekNumber++

      // Check if we've passed any milestones this week
      while (milestoneIdx < sorted.length && cumulative >= sorted[milestoneIdx]) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + weekNumber * 7)

        results.push({
          milestoneValue: sorted[milestoneIdx],
          estimatedDate: date,
          weekNumber,
          cumulativeAtDate: cumulative,
        })
        milestoneIdx++
      }

      if (milestoneIdx >= sorted.length) return results
    }
  }

  return results
}

// ============================================================================
// Achievement Progress Calculator
// ============================================================================

/**
 * Compute weighted achievement progress from contributing goal completions.
 *
 * Each contributing goal has a weight (should sum to 1) and a progress
 * percentage (0–100). The achievement progress is the weighted sum.
 *
 * @param weights - which goals contribute and how much
 * @param goalProgressMap - map of goalId → progress percentage (0–100)
 */
export function computeAchievementProgress(
  weights: AchievementWeight[],
  goalProgressMap: Map<string, number>
): AchievementProgressResult {
  const contributingGoals = weights.map((w) => {
    const goalProgress = goalProgressMap.get(w.goalId) ?? 0
    const contribution = w.weight * goalProgress
    return {
      goalId: w.goalId,
      weight: w.weight,
      goalProgress,
      contribution,
    }
  })

  const progressPercent = Math.round(
    contributingGoals.reduce((sum, g) => sum + g.contribution, 0)
  )

  return {
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    contributingGoals,
  }
}
