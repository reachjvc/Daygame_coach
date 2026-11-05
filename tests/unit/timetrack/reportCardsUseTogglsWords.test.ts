/**
 * THE REPORT CARDS IN TOGGL TRACK'S WORDS (Phase 8 Toggl-parity audit of
 * Plans/toggl-parity.md; Track web's `analytics.DashboardGrid.TotalsCard.*`):
 * Total hours, Billable hours, Amount, Average daily hours. "Revenue" and
 * "Avg. daily hours" were ours.
 */

import { describe, expect, test } from "vitest"

import { SUMMARY_METRICS } from "@/src/timetrack/config"
import { defaultReportConfig } from "@/src/timetrack/reportsService"

describe("the Summary report's cards", () => {
  test("are named as Toggl Track's are, in its order", () => {
    const config = defaultReportConfig("2026-11-05", 1, { enabled: false, mode: "nearest", minutes: 15 })
    const labels = config.summaryMetrics.map((id) => SUMMARY_METRICS.find((m) => m.id === id)!.label)
    expect(labels).toEqual(["Total hours", "Billable hours", "Amount", "Average daily hours"])
  })
})
