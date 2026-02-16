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

// Minimum ratio between consecutive increments.  Each step's increment must
// be at least this fraction of the previous step's increment.  Increments
// must never shrink — each delta >= previous delta.
const MIN_INCREMENT_RATIO = 1.0

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

/**
 * Round a value UP to the nearest "nice enough" number.
 * Used when no pool value satisfies the increment constraint — generates
 * a reasonable milestone value at any scale (multiples of 5, 25, 50, etc.).
 */
function ceilToNice(value: number): number {
  if (value <= 10) return Math.ceil(value)
  if (value <= 100) {
    return Math.ceil(value / 5) * 5
  }
  if (value <= 1000) {
    return Math.ceil(value / 25) * 25
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)) - 1)
  const step = magnitude * 2.5
  return Math.ceil(value / step) * step
}

// ============================================================================
// Pool-Based Milestone Selection
// ============================================================================

/**
 * Select N milestones from a pre-computed pool of nice numbers,
 * using the curve as a selection bias in log-space.
 *
 * Enforces increment smoothness during selection: each increment must be
 * at least 60% of the previous increment.  This prevents jarring sequences
 * like 150→250→300 (deltas 100, 50) where the step size suddenly halves.
 *
 * Guarantees: every milestone is a "nice" number, monotonically increasing,
 * and increments change smoothly.
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
  let prevDelta = 0

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

    // Increment smoothness: each delta must be >= the previous delta.
    const minIncrement = i >= 2 ? Math.ceil(prevDelta * MIN_INCREMENT_RATIO) : 1
    const minValue = milestones[i - 1].value + minIncrement

    // Cap value so remaining milestones can maintain non-decreasing deltas
    // to reach the target.  With k remaining steps, we need at least
    // minIncrement * k range left.  Solving: value <= (target + prev * (k-1)) / k
    const remaining = steps - i // steps after this one (including target)
    const maxValueForDeltas = remaining > 1
      ? Math.floor((target + milestones[i - 1].value * (remaining - 1)) / remaining)
      : target - 1

    // Advance search start past candidates below minValue
    let effLo = lo
    while (effLo <= hi && candidates[effLo] < minValue) effLo++

    // Fall back to unconstrained if constraint can't be satisfied
    if (effLo > hi) effLo = lo

    // Search within [effLo, hi] for candidate closest to curve, capped by maxValueForDeltas
    let bestIdx = -1
    let bestDist = Infinity
    for (let j = effLo; j <= hi; j++) {
      if (candidates[j] > maxValueForDeltas) continue
      const d = Math.abs(logPos[j] - desired)
      if (d < bestDist) {
        bestDist = d
        bestIdx = j
      }
    }
    // Fall back to closest to minValue if all candidates exceed the cap
    if (bestIdx < 0) {
      bestIdx = effLo
      bestDist = Math.abs(logPos[effLo] - desired)
      for (let j = effLo + 1; j <= hi; j++) {
        const d = Math.abs(logPos[j] - desired)
        if (d < bestDist) {
          bestDist = d
          bestIdx = j
        }
      }
    }

    const pickedValue = candidates[bestIdx]
    prevDelta = pickedValue - milestones[i - 1].value

    milestones.push({ step: i, rawValue, value: pickedValue })
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
  let milestones: GeneratedMilestone[]
  if (candidates.length >= steps) {
    milestones = selectFromPool(candidates, config)
  } else {
    // Fallback: curve + round for small ranges with sparse pools.
    // Use coarser rounding appropriate to the step density to avoid
    // collisions and +1 cascades.
    const range = target - start
    const useLog = start > 0 && target / start >= 10
    const avgStep = range / (steps - 1)
    const roundStep = avgStep >= 50 ? 25 : avgStep >= 10 ? 5 : avgStep >= 3 ? 2 : 1
    milestones = []

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

      // Round to the step-appropriate granularity
      let value = Math.round(rawValue / roundStep) * roundStep

      // Enforce monotonic increase and leave room for remaining milestones
      const prev = milestones[i - 1].value
      const maxValue = target - roundStep * (steps - 1 - i)
      value = Math.max(value, prev + roundStep)
      value = Math.min(value, maxValue)

      milestones.push({ step: i, rawValue, value })
    }
  }

  // Enforce non-decreasing increments.  Two passes:
  //   1) Forward: bump UP milestones whose delta < previous delta
  //   2) Backward: pull DOWN milestones near the end that leave too little
  //      room for the final delta to match the penultimate delta
  if (milestones.length > 3) {
    // Forward pass (up to 4 iterations for cascading fixes)
    for (let pass = 0; pass < 4; pass++) {
      let changed = false
      for (let i = 2; i < milestones.length - 1; i++) {
        const prevDelta = milestones[i - 1].value - milestones[i - 2].value
        const currDelta = milestones[i].value - milestones[i - 1].value
        const minDelta = Math.ceil(prevDelta * MIN_INCREMENT_RATIO)
        if (currDelta < minDelta) {
          const minValue = milestones[i - 1].value + minDelta
          const maxValue = milestones[i + 1].value - 1
          if (minValue <= maxValue) {
            const better = poolValues.find(v => v >= minValue && v <= maxValue)
            const newVal = better ?? Math.min(ceilToNice(minValue), maxValue)
            if (newVal > milestones[i].value) {
              milestones[i] = { ...milestones[i], value: newVal }
              changed = true
            }
          }
        }
      }
      if (!changed) break
    }

    // Backward pass: pull milestones DOWN so the next delta stays >= current delta.
    // This prevents sequences like ...400→750→1000 where 750 is too close to 1000.
    for (let pass = 0; pass < 4; pass++) {
      let changed = false
      for (let i = milestones.length - 2; i >= 2; i--) {
        const currDelta = milestones[i].value - milestones[i - 1].value
        const nextDelta = milestones[i + 1].value - milestones[i].value
        if (nextDelta < currDelta) {
          // Pull this milestone down so currDelta <= nextDelta becomes possible.
          // Target: value such that (next - value) >= (value - prev)
          // => value <= (next + prev) / 2
          const prev = milestones[i - 1].value
          const next = milestones[i + 1].value
          const maxVal = Math.floor((next + prev) / 2)
          // Don't go below previous milestone + 1
          const newVal = Math.max(prev + 1, maxVal)
          if (newVal < milestones[i].value) {
            // Snap to nearest pool value at or below maxVal
            const poolBelow = poolValues.filter(v => v >= prev + 1 && v <= maxVal)
            const snapped = poolBelow.length > 0
              ? poolBelow[poolBelow.length - 1]
              : newVal
            milestones[i] = { ...milestones[i], value: snapped }
            changed = true
          }
        }
      }
      if (!changed) break
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
