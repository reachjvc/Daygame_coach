import { describe, expect, test } from "vitest"

import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import {
  applyFilters,
  buildDetailed,
  buildProfitability,
  buildSummary,
  buildWorkload,
  decodeReportConfig,
  defaultReportConfig,
  detailedToCsv,
  emptyFilters,
  encodeReportConfig,
  metricValue,
  presetRange,
} from "@/src/timetrack/reportsService"
import type { ReportConfig } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)

function config(overrides: Partial<ReportConfig> = {}): ReportConfig {
  const base = defaultReportConfig("2026-08-10", 1, { enabled: false, mode: "nearest", minutes: 15 })
  return {
    ...base,
    filters: { ...emptyFilters({ start: "2026-08-03", end: "2026-08-10" }) },
    ...overrides,
  }
}

const state = baseState({
  entries: [
    // 2h billable on Alpha (rate 100), task Build (rate 150) → 150/h
    entry(1, "2026-08-10", "09:00", "11:00", { taskId: "40", tagIds: ["50"] }),
    // 1h billable on Alpha, no task → project rate 100
    entry(2, "2026-08-10", "11:00", "12:00", { description: "review", tagIds: ["51"] }),
    // 30m non-billable on Beta
    entry(3, "2026-08-04", "09:00", "09:30", { projectId: "31", billable: false, description: "beta work" }),
    // another member
    entry(4, "2026-08-05", "09:00", "10:00", { userId: "11", description: "sam work" }),
  ],
})

describe("date presets", () => {
  test("this week starts on the configured first day", () => {
    expect(presetRange("this_week", "2026-08-12", 1)).toEqual({ start: "2026-08-10", end: "2026-08-16" })
  })

  test("last week is the preceding seven days", () => {
    expect(presetRange("last_week", "2026-08-12", 1)).toEqual({ start: "2026-08-03", end: "2026-08-09" })
  })

  test("this month covers the whole calendar month", () => {
    expect(presetRange("this_month", "2026-08-12", 1)).toEqual({ start: "2026-08-01", end: "2026-08-31" })
  })

  test("last month ends the day before this month", () => {
    expect(presetRange("last_month", "2026-08-12", 1)).toEqual({ start: "2026-07-01", end: "2026-07-31" })
  })

  test("years", () => {
    expect(presetRange("this_year", "2026-08-12", 1)).toEqual({ start: "2026-01-01", end: "2026-12-31" })
    expect(presetRange("last_year", "2026-08-12", 1)).toEqual({ start: "2025-01-01", end: "2025-12-31" })
  })
})

describe("filters", () => {
  test("date range excludes entries outside it", () => {
    const rows = applyFilters(state, emptyFilters({ start: "2026-08-10", end: "2026-08-10" }))
    expect(rows.map((r) => r.id).sort()).toEqual(["1", "2"])
  })

  test("project, tag, member, billable and text filters", () => {
    const range = { start: "2026-08-01", end: "2026-08-31" }
    expect(applyFilters(state, { ...emptyFilters(range), projectIds: ["31"] }).map((r) => r.id)).toEqual(["3"])
    expect(applyFilters(state, { ...emptyFilters(range), tagIds: ["51"] }).map((r) => r.id)).toEqual(["2"])
    expect(applyFilters(state, { ...emptyFilters(range), memberIds: ["11"] }).map((r) => r.id)).toEqual(["4"])
    expect(applyFilters(state, { ...emptyFilters(range), billable: "no" }).map((r) => r.id)).toEqual(["3"])
    expect(applyFilters(state, { ...emptyFilters(range), description: "beta" }).map((r) => r.id)).toEqual(["3"])
  })

  test("client filter follows the entry's project", () => {
    const range = { start: "2026-08-01", end: "2026-08-31" }
    const rows = applyFilters(state, { ...emptyFilters(range), clientIds: ["20"] })
    expect(rows.map((r) => r.id).sort()).toEqual(["1", "2", "4"])
  })
})

describe("summary report", () => {
  test("totals, billable split and revenue use the resolved rates", () => {
    const report = buildSummary(state, config(), NOW_SEC)
    // 2h + 1h + 0.5h + 1h = 4.5h
    expect(report.totals.seconds).toBe(4.5 * 3600)
    expect(report.totals.billableSeconds).toBe(4 * 3600)
    // 2h@150 (task rate) + 1h@100 + 1h@100 (project rate outranks Sam's member rate) = 500
    expect(Math.round(report.totals.revenue)).toBe(500)
    expect(report.totals.entryCount).toBe(4)
    expect(report.totals.activeDays).toBe(3)
  })

  test("groups by project and sub-groups by description", () => {
    const report = buildSummary(state, config({ grouping: "project", subGrouping: "description" }), NOW_SEC)
    const alpha = report.rows.find((r) => r.label === "Alpha")!
    expect(alpha.seconds).toBe(4 * 3600)
    expect(alpha.children.map((c) => c.label).sort()).toEqual(["review", "sam work", "work"])
    expect(alpha.color).toBe("#0b83d9")
  })

  test("rows are sorted by tracked time descending", () => {
    const report = buildSummary(state, config(), NOW_SEC)
    expect(report.rows[0].label).toBe("Alpha")
  })

  test("rounding is applied per entry before aggregation", () => {
    const rounded = buildSummary(
      state,
      config({ rounding: { enabled: true, mode: "up", minutes: 60 } }),
      NOW_SEC,
    )
    // per entry: 2h stays 2h, 1h stays 1h, 30m rounds up to 1h, 1h stays 1h = 5h
    expect(rounded.totals.seconds).toBe(5 * 3600)
  })

  test("chart buckets cover every day in range, including empty ones", () => {
    const report = buildSummary(state, config({ chartInterval: "day" }), NOW_SEC)
    expect(report.buckets).toHaveLength(8)
    expect(report.buckets[0].key).toBe("2026-08-03")
    expect(report.buckets.at(-1)!.seconds).toBe(3 * 3600)
  })

  test("stacking splits a bucket into segments", () => {
    const report = buildSummary(state, config({ chartStackBy: "billable" }), NOW_SEC)
    const lastDay = report.buckets.at(-1)!
    expect(lastDay.segments).toHaveLength(1)
    expect(lastDay.segments[0].label).toBe("Billable")
  })

  test("an entry with several tags counts in each tag bucket", () => {
    const multi = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { tagIds: ["50", "51"] })] })
    const report = buildSummary(multi, config({ grouping: "tag" }), NOW_SEC)
    expect(report.rows.map((r) => r.label).sort()).toEqual(["deep", "meeting"])
    expect(report.rows[0].seconds).toBe(3600)
    // the workspace total is still counted once
    expect(report.totals.seconds).toBe(3600)
  })

  test("metric values", () => {
    const report = buildSummary(state, config(), NOW_SEC)
    expect(metricValue(report, "total").value).toBe(4.5 * 3600)
    expect(metricValue(report, "avg_daily").value).toBeCloseTo((4.5 * 3600) / 3, 5)
    expect(Math.round(metricValue(report, "profit").value)).toBe(
      Math.round(report.totals.revenue - report.totals.cost),
    )
  })
})

describe("detailed report", () => {
  test("one row per entry with resolved names and amount", () => {
    const rows = buildDetailed(state, config({ filters: emptyFilters({ start: "2026-08-10", end: "2026-08-10" }) }), NOW_SEC)
    expect(rows).toHaveLength(2)
    const build = rows.find((r) => r.taskName === "Build")!
    expect(build.projectName).toBe("Alpha")
    expect(build.clientName).toBe("Acme")
    expect(build.tagNames).toEqual(["deep"])
    expect(Math.round(build.amount)).toBe(300)
  })

  test("sorting by duration", () => {
    const rows = buildDetailed(state, config({ sort: { column: "duration", direction: "desc" } }), NOW_SEC)
    expect(rows[0].seconds).toBe(7200)
  })

  test("CSV export escapes quotes and commas", () => {
    const rows = buildDetailed(
      baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { description: 'a "quoted", comma' })] }),
      config(),
      NOW_SEC,
    )
    const csv = detailedToCsv(rows, "EUR")
    expect(csv.split("\n")[0]).toContain("Duration (decimal)")
    expect(csv).toContain('"a ""quoted"", comma"')
    expect(csv).toContain("1:00:00")
  })
})

describe("workload report", () => {
  test("one column per day with row and column totals", () => {
    const report = buildWorkload(state, config({ grouping: "member" }), NOW_SEC)
    expect(report.days).toHaveLength(8)
    const you = report.rows.find((r) => r.label === "You")!
    expect(you.total).toBe(3.5 * 3600)
    expect(report.grandTotal).toBe(4.5 * 3600)
    expect(report.dayTotals.at(-1)).toBe(3 * 3600)
  })

  test("earnings mode switches the values to money", () => {
    const report = buildWorkload(state, config({ grouping: "member", workloadValueMode: "earnings" }), NOW_SEC)
    expect(Math.round(report.grandTotal)).toBe(500)
  })
})

describe("profitability report", () => {
  test("revenue minus cost, with the project's fixed fee added", () => {
    const rows = buildProfitability(state, config({ filters: emptyFilters({ start: "2026-08-01", end: "2026-08-31" }) }), NOW_SEC)
    const alpha = rows.find((r) => r.label === "Alpha")!
    // 4h tracked; cost = member labour cost (30/h for You, 25/h for Sam)
    expect(Math.round(alpha.revenue)).toBe(500)
    expect(Math.round(alpha.cost)).toBe(30 * 3 + 25 * 1)
    expect(Math.round(alpha.profit)).toBe(500 - 115)
    expect(alpha.margin).toBeCloseTo((500 - 115) / 500, 4)

    const beta = rows.find((r) => r.label === "Beta")!
    expect(beta.fixedFee).toBe(1000)
    expect(Math.round(beta.profit)).toBe(1000 - 15)
  })
})

describe("saved report share links", () => {
  test("config survives an encode/decode round trip", () => {
    const original = config({ grouping: "client", subGrouping: null, chartInterval: "week" })
    const decoded = decodeReportConfig(encodeReportConfig(original))
    expect(decoded).toEqual(original)
  })

  test("garbage decodes to null", () => {
    expect(decodeReportConfig("!!!not-base64!!!")).toBeNull()
  })
})
