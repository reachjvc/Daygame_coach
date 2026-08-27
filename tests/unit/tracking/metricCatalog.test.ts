/**
 * The catalogue is bulk-authored data that a person reads in a picker, so these
 * tests assert on meaning rather than on shape. A test that every entry has a
 * non-empty `label` would pass with every metric filed under the wrong area and
 * described as something it is not.
 *
 * The class of error being guarded against: an id ending `_weekly` filed as a
 * lifetime total, a health metric shown under Dating, a description written for
 * the neighbouring entry.
 */

import { describe, test, expect } from "vitest"
import { LINKED_METRICS } from "@/src/db/goalEnums"
import {
  METRIC_CATALOG,
  METRIC_BY_ID,
  METRIC_BY_LINKED_METRIC,
  METRIC_AREA_ORDER,
  DEFAULT_TILE_METRIC_IDS,
  LEGACY_TILE_TESTIDS,
} from "@/src/tracking/data/metricCatalog"
import { STATS_ONLY_METRICS } from "@/src/db/metricsRepo"

describe("metric catalogue coverage", () => {
  test("every LINKED_METRICS value is describable", () => {
    const missing = LINKED_METRICS.filter((m) => !METRIC_BY_LINKED_METRIC[m])
    expect(missing, `LINKED_METRICS with no catalogue entry: ${missing.join(", ")}`).toEqual([])
  })

  test("every display-only stats metric is describable", () => {
    const missing = STATS_ONLY_METRICS.filter((m) => !METRIC_BY_ID[m])
    expect(missing, `stats-only metrics with no catalogue entry: ${missing.join(", ")}`).toEqual([])
  })

  test("every catalogue metric is resolvable by something", () => {
    // A metric with no source would render a permanent em dash.
    const sources = new Set(["tracking_stats", "approaches", "health", "scenarios"])
    const orphans = METRIC_CATALOG.filter((m) => !sources.has(m.source))
    expect(orphans.map((m) => m.id)).toEqual([])
  })

  test("ids are unique", () => {
    const ids = METRIC_CATALOG.map((m) => m.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  test("a linkedMetric is claimed by exactly one entry", () => {
    const claims = METRIC_CATALOG.map((m) => m.linkedMetric).filter(Boolean)
    expect(claims.length).toBe(new Set(claims).size)
  })
})

describe("metric catalogue meaning", () => {
  test("an id that says weekly is a weekly window, and says so in words", () => {
    for (const m of METRIC_CATALOG.filter((m) => m.id.endsWith("_weekly"))) {
      expect(m.window, `${m.id} window`).toBe("weekly")
      expect(
        /this week|since Monday/i.test(m.description),
        `${m.id} description does not mention the week: "${m.description}"`
      ).toBe(true)
    }
  })

  test("an id that says cumulative is a lifetime window, and says so in words", () => {
    for (const m of METRIC_CATALOG.filter((m) => m.id.endsWith("_cumulative"))) {
      expect(m.window, `${m.id} window`).toBe("cumulative")
      expect(
        /lifetime|total|ever|every/i.test(m.description),
        `${m.id} description does not read as a lifetime total: "${m.description}"`
      ).toBe(true)
    }
  })

  test("health metrics live under health, daygame metrics under daygame", () => {
    for (const m of METRIC_CATALOG) {
      if (m.source === "health") expect(m.area, `${m.id}`).toBe("health_fitness")
      if (m.source === "approaches") expect(m.area, `${m.id}`).toBe("daygame")
      if (m.source === "scenarios") expect(m.area, `${m.id}`).toBe("daygame")
    }
  })

  test("every area used is one the picker renders", () => {
    const areas = new Set(METRIC_CATALOG.map((m) => m.area))
    for (const area of areas) {
      expect(METRIC_AREA_ORDER as readonly string[]).toContain(area)
    }
  })

  test("descriptions are sentences, not labels repeated", () => {
    for (const m of METRIC_CATALOG) {
      expect(m.description.length, `${m.id} description too short`).toBeGreaterThan(20)
      expect(m.description.trim().endsWith("."), `${m.id} description is not a sentence`).toBe(true)
      expect(
        m.description.toLowerCase(),
        `${m.id} description is just its own label`
      ).not.toBe(m.label.toLowerCase())
    }
  })

  test("no two metrics render the same tile label", () => {
    // Two tiles side by side both saying "Sessions", one reading 2 and the other
    // 1,700, is indistinguishable nonsense on the dashboard.
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const m of METRIC_CATALOG) {
      const prior = seen.get(m.tileLabel)
      if (prior) clashes.push(`${prior} and ${m.id} both render "${m.tileLabel}"`)
      else seen.set(m.tileLabel, m.id)
    }
    expect(clashes).toEqual([])
  })

  test("streak metrics are counted in periods, not in things", () => {
    for (const m of METRIC_CATALOG.filter((m) => m.window === "streak")) {
      expect(["weeks", "days"], `${m.id} format`).toContain(m.format)
    }
  })

  test("1RM and body-weight metrics are weights", () => {
    for (const m of METRIC_CATALOG.filter((m) => m.id.endsWith("_1rm") || m.id.includes("weight"))) {
      expect(m.format, `${m.id} format`).toBe("kg")
    }
  })
})

describe("default layout", () => {
  test("defaults are the four tiles the dashboard shipped with, in order", () => {
    expect([...DEFAULT_TILE_METRIC_IDS]).toEqual([
      "approaches_cumulative",
      "numbers_cumulative",
      "week_streak",
      "sessions_cumulative",
    ])
  })

  test("every default tile exists and keeps its original testid", () => {
    for (const id of DEFAULT_TILE_METRIC_IDS) {
      expect(METRIC_BY_ID[id], `${id} missing from catalogue`).toBeDefined()
      expect(LEGACY_TILE_TESTIDS[id], `${id} lost its e2e testid`).toBeTruthy()
    }
  })
})
