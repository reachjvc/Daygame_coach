/**
 * ONE BROKEN SOURCE MUST NOT TAKE THE REST DOWN WITH IT.
 *
 * Every source ran inside a bare `Promise.all`, so one failing query rejected
 * the whole call. Both callers then either swallowed that or let it bubble —
 * which meant a single broken metric froze the progress of EVERY linked goal at
 * once, and said nothing to anybody.
 *
 * It really happened. A migration dropped a column on 2026-09-07 and the two
 * strength queries kept reading it, so they threw on every call. Nothing on any
 * screen changed except that goals stopped moving.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { resolveMetricValues } from "@/src/db/metricsRepo"

/**
 * `vi.hoisted` because `vi.mock` is lifted to the top of the file: a plain
 * `const` declared below would not exist yet when the factory runs.
 */
const m = vi.hoisted(() => ({
  getOrCreateUserTrackingStats: vi.fn(),
  rollTrackingCounters: vi.fn(async () => {}),
  getWeeklyApproachQualityAvg: vi.fn(async () => 0),
  getHighQualityApproachCount: vi.fn(async () => 0),
  getScenarioStats: vi.fn(),
  getLatestWeight: vi.fn(),
}))
const { getScenarioStats, getLatestWeight } = m

vi.mock("@/src/db/trackingRepo", () => ({
  getOrCreateUserTrackingStats: m.getOrCreateUserTrackingStats,
  rollTrackingCounters: m.rollTrackingCounters,
  getWeeklyApproachQualityAvg: m.getWeeklyApproachQualityAvg,
  getHighQualityApproachCount: m.getHighQualityApproachCount,
}))
vi.mock("@/src/db/scenarioRepo", () => ({ getScenarioStats: m.getScenarioStats }))
vi.mock("@/src/db/healthRepo", () => ({ getLatestWeight: m.getLatestWeight }))



const TZ = "Europe/Copenhagen"

describe("resolveMetricValues when a source is broken", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getScenarioStats.mockResolvedValue({ totalSessions: 4, uniqueTypes: 2, highScoreCount: 1 })
    getLatestWeight.mockResolvedValue(82)
  })

  it("still returns the sources that worked", async () => {
    getLatestWeight.mockRejectedValue(new Error("column does not exist"))
    const { values } = await resolveMetricValues(
      "u1",
      ["scenario_sessions_cumulative", "body_weight_current"],
      TZ
    )
    expect(values.scenario_sessions_cumulative, "the healthy source still answers").toBe(4)
  })

  it("names the readings it could not take, rather than calling them zero", async () => {
    getLatestWeight.mockRejectedValue(new Error("column does not exist"))
    const { values, failed } = await resolveMetricValues("u1", ["body_weight_current"], TZ)
    expect(failed.body_weight_current).toMatch(/could not be read/i)
    expect(values.body_weight_current, "a failed reading is never a number").toBeUndefined()
  })

  it("does not throw, so a caller cannot lose every metric to one bad query", async () => {
    getScenarioStats.mockRejectedValue(new Error("boom"))
    getLatestWeight.mockRejectedValue(new Error("boom"))
    await expect(
      resolveMetricValues("u1", ["scenario_types_cumulative", "body_weight_current"], TZ)
    ).resolves.toBeTruthy()
  })

  it("reports nothing failed when nothing did", async () => {
    const { values, failed } = await resolveMetricValues("u1", ["scenario_sessions_cumulative"], TZ)
    expect(failed).toEqual({})
    expect(values.scenario_sessions_cumulative).toBe(4)
  })

  it("marks the whole group that failed, not just the one that was asked about", async () => {
    getScenarioStats.mockRejectedValue(new Error("boom"))
    const { failed } = await resolveMetricValues(
      "u1",
      ["scenario_sessions_cumulative", "scenario_types_cumulative"],
      TZ
    )
    expect(Object.keys(failed).sort()).toEqual([
      "scenario_sessions_cumulative",
      "scenario_types_cumulative",
    ])
  })
})
