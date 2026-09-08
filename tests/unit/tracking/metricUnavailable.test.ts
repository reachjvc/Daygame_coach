/**
 * A NUMBER THAT COULD NOT BE WORKED OUT IS NOT A NUMBER.
 *
 * There are three states a tile can be in, and only two were represented. A
 * reading; nothing logged yet; and the source being broken. The third was
 * rendered as the second — "Nothing logged for this yet" — which is a sentence
 * about what the person did, and when a query was failing it was a false one.
 * Somebody who had trained four times that week was told they had logged
 * nothing, with nothing on the screen to tell them otherwise.
 *
 * It really happened: a migration dropped a column on 2026-09-07 and two
 * strength queries kept reading it. They threw on every call, the caller caught
 * the error and only wrote it to a server log, and every goal those metrics
 * backed silently stopped moving.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { resolveMetrics } from "@/src/tracking/dashboardService"

/** Hoisted, because `vi.mock` is lifted above every `const` in the file. */
const { resolveMetricValues } = vi.hoisted(() => ({ resolveMetricValues: vi.fn() }))
vi.mock("@/src/db/metricsRepo", () => ({ resolveMetricValues }))
vi.mock("@/src/db/goalRepo", () => ({
  getGoalsByIds: vi.fn(async () => []),
  getGoalAccumulatedTotal: vi.fn(async () => 0),
}))
vi.mock("@/src/db/dashboardRepo", () => ({ getWidgets: vi.fn(async () => []), replaceWidgets: vi.fn() }))
vi.mock("@/src/db/settingsRepo", () => ({ getUserTimezone: vi.fn(async () => "Europe/Copenhagen") }))



const METRIC = "approaches_weekly"

describe("a metric whose source is broken", () => {
  beforeEach(() => resolveMetricValues.mockReset())

  it("is marked unavailable rather than reported as an empty week", async () => {
    resolveMetricValues.mockResolvedValue({
      values: {},
      failed: { [METRIC]: "your approach history could not be read" },
    })
    const [tile] = await resolveMetrics("u1", [METRIC], "Europe/Copenhagen")
    expect(tile.value, "never a fabricated number").toBeNull()
    expect(tile.unavailable).toBe(true)
    expect(tile.reason).toMatch(/could not be read/i)
    expect(tile.reason, "and must not claim the person logged nothing").not.toMatch(/nothing logged/i)
  })

  it("still says 'nothing logged yet' when that is the truth", async () => {
    resolveMetricValues.mockResolvedValue({ values: { [METRIC]: null }, failed: {} })
    const [tile] = await resolveMetrics("u1", [METRIC], "Europe/Copenhagen")
    expect(tile.value).toBeNull()
    expect(tile.unavailable).toBeFalsy()
    expect(tile.reason).toMatch(/nothing logged/i)
  })

  it("shows a real zero as a zero", async () => {
    resolveMetricValues.mockResolvedValue({ values: { [METRIC]: 0 }, failed: {} })
    const [tile] = await resolveMetrics("u1", [METRIC], "Europe/Copenhagen")
    expect(tile.value).toBe(0)
    expect(tile.unavailable).toBeFalsy()
  })

  it("does not let one broken metric take the others down with it", async () => {
    resolveMetricValues.mockResolvedValue({
      values: { approaches_weekly: 7 },
      failed: { sessions_weekly: "your tracking totals could not be read" },
    })
    const tiles = await resolveMetrics("u1", ["approaches_weekly", "sessions_weekly"], "Europe/Copenhagen")
    expect(tiles.find((t) => t.id === "approaches_weekly")?.value).toBe(7)
    expect(tiles.find((t) => t.id === "sessions_weekly")?.unavailable).toBe(true)
  })
})
