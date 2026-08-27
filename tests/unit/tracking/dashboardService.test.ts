/**
 * Layout defaults and the guard that stops a bad layout reaching the database.
 *
 * validateWidgets is the only thing standing between a hand-made PUT and a row
 * naming a metric that does not exist, so its rejections are asserted
 * individually rather than through one "throws" test.
 */

import { describe, test, expect } from "vitest"
import { defaultWidgets, validateWidgets, TRACKING_DASHBOARD_KEY } from "@/src/tracking/dashboardService"
import { buildGoalMetricId, MAX_TILES, MIN_TILES } from "@/src/tracking/metricsService"
import { DEFAULT_TILE_METRIC_IDS } from "@/src/tracking/data/metricCatalog"

const tile = (metric_id: string) => ({ widget_type: "metric_tile" as const, metric_id })

describe("default layout", () => {
  test("is the four tiles the page shipped with, in order", () => {
    const widgets = defaultWidgets()
    expect(widgets.map((w) => w.metric_id)).toEqual([...DEFAULT_TILE_METRIC_IDS])
    expect(widgets.map((w) => w.position)).toEqual([0, 1, 2, 3])
    expect(widgets.every((w) => w.dashboard_key === TRACKING_DASHBOARD_KEY)).toBe(true)
  })
})

describe("validateWidgets", () => {
  test("accepts a normal layout unchanged", () => {
    const widgets = [tile("approaches_weekly"), tile("week_streak")]
    expect(validateWidgets(widgets)).toEqual(widgets)
  })

  test("accepts goal-derived metrics", () => {
    const widgets = [tile(buildGoalMetricId("abc", "period")), tile("week_streak")]
    expect(validateWidgets(widgets)).toEqual(widgets)
  })

  test(`refuses fewer than ${MIN_TILES} tiles`, () => {
    expect(() => validateWidgets([tile("week_streak")])).toThrow(/at least/)
  })

  test(`refuses more than ${MAX_TILES} tiles rather than silently trimming`, () => {
    const tooMany = Array.from({ length: MAX_TILES + 1 }, () => tile("week_streak"))
    expect(() => validateWidgets(tooMany)).toThrow(/at most/)
  })

  test("refuses a metric that does not exist", () => {
    expect(() => validateWidgets([tile("deep_work_hours_daily"), tile("week_streak")]))
      .toThrow(/Unknown metric/)
  })

  test("refuses a goal id with a made-up view", () => {
    expect(() => validateWidgets([tile("goal:abc:sideways"), tile("week_streak")]))
      .toThrow(/Unknown metric/)
  })

  test("refuses a tile with no metric", () => {
    expect(() => validateWidgets([{ widget_type: "metric_tile", metric_id: "" }, tile("week_streak")]))
      .toThrow(/needs a metric/)
  })

  test("refuses an unknown widget type", () => {
    expect(() => validateWidgets([
      { widget_type: "chart" as unknown as "metric_tile", metric_id: "week_streak" },
      tile("week_streak"),
    ])).toThrow(/Unknown widget type/)
  })
})
