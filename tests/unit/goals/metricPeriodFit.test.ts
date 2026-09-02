/**
 * A GOAL'S PERIOD AND ITS METRIC'S WINDOW MUST DESCRIBE THE SAME SPAN OF TIME.
 *
 * The bug this pins, counted in production: 11 of 18 active linked goals were
 * mismatched. The worst was a WEEKLY goal with target 2 linked to
 * `approaches_cumulative` — a lifetime total of 416. Every Monday the roll set
 * `current_value` to 0 and `syncLinkedGoals` wrote 416 straight back, so the
 * goal was permanently complete and its streak meaningless.
 */

import { describe, it, expect } from "vitest"
import { metricFitsPeriod } from "@/src/tracking/metricsService"
import { METRIC_CATALOG } from "@/src/tracking/data/metricCatalog"
import { GOAL_PERIODS } from "@/src/db/goalEnums"

describe("metricFitsPeriod", () => {
  it("rejects the pairing that shipped", () => {
    expect(metricFitsPeriod("approaches_cumulative", "weekly")).toBe(false)
    expect(metricFitsPeriod("numbers_cumulative", "weekly")).toBe(false)
    expect(metricFitsPeriod("instadates_cumulative", "weekly")).toBe(false)
    expect(metricFitsPeriod("sleep_hours_avg_weekly", "daily")).toBe(false)
    expect(metricFitsPeriod("bench_press_1rm", "weekly")).toBe(false)
    expect(metricFitsPeriod("pullups_max_reps", "weekly")).toBe(false)
  })

  it("accepts the pairings that were already right", () => {
    expect(metricFitsPeriod("approaches_weekly", "weekly")).toBe(true)
    expect(metricFitsPeriod("sessions_weekly", "weekly")).toBe(true)
    expect(metricFitsPeriod("gym_sessions_weekly", "weekly")).toBe(true)
    expect(metricFitsPeriod("mobility_sessions_weekly", "weekly")).toBe(true)
  })

  it("lets a lifetime total back a milestone, which never rolls", () => {
    expect(metricFitsPeriod("approaches_cumulative", "custom")).toBe(true)
    expect(metricFitsPeriod("bench_press_1rm", "custom")).toBe(true)
  })

  it("does not let a lifetime total back a yearly goal either", () => {
    // A yearly goal rolls every January and would be refilled with the lifetime
    // total the same second — the weekly bug on a slower clock.
    expect(metricFitsPeriod("approaches_cumulative", "yearly")).toBe(false)
  })

  it("never lets a streak metric back a goal", () => {
    for (const period of GOAL_PERIODS) {
      expect(metricFitsPeriod("week_streak", period)).toBe(false)
      expect(metricFitsPeriod("day_streak", period)).toBe(false)
    }
  })

  it("rejects an id that is not a metric", () => {
    for (const period of GOAL_PERIODS) {
      expect(metricFitsPeriod("not_a_metric", period)).toBe(false)
    }
  })

  it("every metric fits at most the periods its window names", () => {
    // Exhaustive: catalogue × periods. A metric that fits nothing is fine (it is
    // display-only); a metric that fits two different cadences is a bug.
    for (const def of METRIC_CATALOG) {
      const fits = GOAL_PERIODS.filter((p) => metricFitsPeriod(def.id, p))
      expect(fits.length, `${def.id} (${def.window}) fits ${fits.join(", ")}`).toBeLessThanOrEqual(1)
      if (def.linkedMetric === null) expect(fits).toEqual([])
    }
  })
})
