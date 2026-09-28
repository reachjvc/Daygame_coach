import { describe, expect, test } from "vitest"

import { parseCsvRows } from "@/src/timetrack/importExportService"
import { epochSeconds, localIsoWithOffset } from "@/src/timetrack/timetrackFormatService"
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
  profitabilityToCsv,
  rangeRefusal,
  clampRange,
  MAX_RANGE_DAYS,
  RANGE_MAX,
  RANGE_MIN,
  summaryToCsv,
} from "@/src/timetrack/reportsService"
import type { ReportConfig, TimetrackState } from "@/src/timetrack/types"

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
    const report = buildProfitability(state, config({ filters: emptyFilters({ start: "2026-08-01", end: "2026-08-31" }) }), NOW_SEC)
    const alpha = report.rows.find((r) => r.label === "Alpha")!
    // 4h tracked; cost = member labour cost (30/h for You, 25/h for Sam)
    expect(Math.round(alpha.revenue)).toBe(500)
    expect(Math.round(alpha.cost)).toBe(30 * 3 + 25 * 1)
    expect(Math.round(alpha.profit)).toBe(500 - 115)
    expect(alpha.margin).toBeCloseTo((500 - 115) / 500, 4)

    const beta = report.rows.find((r) => r.label === "Beta")!
    expect(beta.fixedFee).toBe(1000)
    expect(Math.round(beta.profit)).toBe(1000 - 15)
    // grouped by project, so the report's fee and the row's agree
    expect(report.fixedFee).toBe(1000)
    expect(report.feeIsPerRow).toBe(true)
  })

  test("a fixed fee is counted ONCE, however the report is grouped", () => {
    /**
     * Each row used to add the whole fee of every project in it, and the Total line
     * summed the rows — so grouping by date multiplied a retainer by the number of
     * days worked. Measured before the fix on one EUR 1,000 project across three
     * days: Fixed fee EUR 3,000, Profit EUR 2,910, against EUR 1,000 and EUR 910.
     *
     * It survived three rounds of review because the tab opens on "Group by
     * project", one of the only two groupings where it was right, and "Group by
     * date" is one click away on the tab itself. This is the number somebody
     * invoices from.
     */
    const range = emptyFilters({ start: "2026-08-01", end: "2026-08-31" })
    const byProject = buildProfitability(state, config({ filters: range, grouping: "project" }), NOW_SEC)

    for (const grouping of ["date", "billable", "description", "tag", "member"] as const) {
      const report = buildProfitability(state, config({ filters: range, grouping }), NOW_SEC)
      expect(report.fixedFee, `grouped by ${grouping}, the fee is not what it is by project`).toBe(byProject.fixedFee)
      expect(report.feeIsPerRow, `grouped by ${grouping}, a project can appear in two rows`).toBe(false)
      expect(
        report.rows.reduce((sum, r) => sum + r.fixedFee, 0),
        `grouped by ${grouping}, the rows carry a share of a fee that is not divisible`,
      ).toBe(0)
    }
  })

  test("and a client grouping still shows it per row, because a project has one client", () => {
    const report = buildProfitability(
      state,
      config({ filters: emptyFilters({ start: "2026-08-01", end: "2026-08-31" }), grouping: "client" }),
      NOW_SEC,
    )
    expect(report.feeIsPerRow).toBe(true)
    expect(report.rows.reduce((sum, r) => sum + r.fixedFee, 0)).toBe(report.fixedFee)
  })
})

describe("saved report share links", () => {
  const DEFAULTS = defaultReportConfig("2026-09-28", 1, { enabled: false, mode: "nearest", minutes: 15 })

  test("config survives an encode/decode round trip", () => {
    const original = config({ grouping: "client", subGrouping: null, chartInterval: "week" })
    const decoded = decodeReportConfig(encodeReportConfig(original), DEFAULTS)
    expect(decoded).toEqual(original)
  })

  test("garbage decodes to null", () => {
    expect(decodeReportConfig("!!!not-base64!!!", DEFAULTS)).toBeNull()
  })

  test("a partial link is laid over the defaults rather than handed on as a config", () => {
    /**
     * `?report=e30` is `btoa("{}")`. It used to decode to `{}`; the first fix checked
     * `filters.range` because that was the crash in front of it, and a link carrying
     * ONLY a range still threw in `applyFilters` on `filters.description.trim()`.
     *
     * The cost was not a blank report: `ReportsView` builds all four inside a
     * `useMemo` during render and the `ErrorBoundary` wraps the whole of `<main>`, so
     * a throw replaced the timer, the entries and every other screen with "Something
     * went wrong". `?report=` is never stripped, so a reload crashed again.
     *
     * The assertion is therefore that every field is PRESENT, not that some named ones
     * are — a validator gets one more field each round; a merge cannot be short of one.
     */
    const encode = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    const rangeOnly = decodeReportConfig(encode({ filters: { range: { start: "2026-08-01", end: "2026-08-31" } } }), DEFAULTS)

    expect(rangeOnly, "a range-only link was refused; it should be honoured over the defaults").not.toBeNull()
    expect(rangeOnly!.filters.range).toEqual({ start: "2026-08-01", end: "2026-08-31" })
    // and everything the link did not say comes from the defaults
    expect(Object.keys(rangeOnly!).sort()).toEqual(Object.keys(DEFAULTS).sort())
    expect(Object.keys(rangeOnly!.filters).sort()).toEqual(Object.keys(DEFAULTS.filters).sort())
    expect(rangeOnly!.filters.description).toBe("")
    expect(rangeOnly!.sort).toEqual(DEFAULTS.sort)
    expect(rangeOnly!.rounding).toEqual(DEFAULTS.rounding)
  })

  test("and every report can be built from what it returns", () => {
    /**
     * The assertion that matters, and the one the previous version of this did not
     * make: the previous test asserted a shape was ACCEPTED, and that shape threw in
     * `buildDetailed`. Accepting is not the promise — being usable is.
     */
    const encode = (value: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    for (const link of [
      {},
      { filters: {} },
      { filters: { range: { start: "2026-08-01", end: "2026-08-31" } } },
      { grouping: "tag" },
      { tab: "profitability" },
      { filters: { description: "invoice" } },
      { filters: { range: { start: "not-a-date", end: "2026-08-31" } } },
    ]) {
      const decoded = decodeReportConfig(encode(link), DEFAULTS)
      expect(decoded, `${JSON.stringify(link)} was refused`).not.toBeNull()
      const cfg = decoded!
      // all four builders, which is what ReportsView runs during render
      // asserted on the result, not on the absence of an error — the report has totals
      expect(buildSummary(state, cfg, NOW_SEC).totals.seconds).toBeGreaterThanOrEqual(0)
      expect(buildDetailed(state, cfg, NOW_SEC)).toBeInstanceOf(Array)
      expect(buildWorkload(state, cfg, NOW_SEC).rows).toBeInstanceOf(Array)
      expect(buildProfitability(state, cfg, NOW_SEC).rows).toBeInstanceOf(Array)
    }
  })
})

describe("the Summary's fixed-fee metric", () => {
  /**
   * It read `state.projects` and never the entries or the range, so it ignored the
   * date range, whether a project was archived, and whether it was a template. It
   * only ever grew — including by the fee of every clone made from a template — and
   * rendered as an exact figure beside the day's real total.
   */
  const august = emptyFilters({ start: "2026-08-01", end: "2026-08-31" })

  test("counts only the projects the report's own entries point at", () => {
    const oneDay = buildSummary(state, config({ filters: emptyFilters({ start: "2026-08-10", end: "2026-08-10" }) }), NOW_SEC)
    const whole = buildSummary(state, config({ filters: august }), NOW_SEC)

    // the fixture's fee-bearing project is Beta; whichever days it has entries on,
    // a day without them must not carry its fee
    const betaDays = state.entries.filter((e) => e.projectId === "31").map((e) => e.start.slice(0, 10))
    if (!betaDays.includes("2026-08-10")) {
      expect(oneDay.totals.fixedFee, "a day with no Beta entry still reported Beta's fee").toBe(0)
    }
    expect(whole.totals.fixedFee).toBeGreaterThan(0)
  })

  test("and ignores a project with no entries in the range at all", () => {
    const withGhost: TimetrackState = {
      ...state,
      projects: [
        ...state.projects,
        { ...state.projects[1], id: "ghost", name: "Never worked on", fixedFee: 5000, template: false, active: true },
      ],
    }
    const before = buildSummary(state, config({ filters: august }), NOW_SEC).totals.fixedFee
    const after = buildSummary(withGhost, config({ filters: august }), NOW_SEC).totals.fixedFee
    expect(after, "a project nobody has tracked against added its fee to the total").toBe(before)
  })
})

describe("the workspace's default report rounding", () => {
  test("is honoured, switch included", () => {
    /**
     * `defaultReportConfig` hard-coded `enabled: false`, so the settings card —
     * whose own description is "New reports start with this setting" — did nothing
     * while reading On. `mode` and `minutes` survived; only the switch that turns
     * it on was discarded, which is the one that changes a number.
     */
    const rounding = { enabled: true, mode: "up" as const, minutes: 15 }
    const fresh = defaultReportConfig("2026-08-10", 1, rounding)
    expect(fresh.rounding, "the switch the person set was thrown away").toEqual(rounding)
  })

  test("and off stays off", () => {
    const off = { enabled: false, mode: "nearest" as const, minutes: 15 }
    expect(defaultReportConfig("2026-08-10", 1, off).rounding).toEqual(off)
  })
})

describe("what each tab exports", () => {
  /**
   * `profitability` had no exporter, so it fell into the handler's `else` and
   * downloaded the SUMMARY — a duration and revenue header with none of Fixed fee,
   * Profit or Margin, the four columns that tab exists for — while the toast said
   * "Report exported". The first cell of every CSV also carried the raw dimension id
   * (`date`, `desc`, `billable`) because the grouping id was passed where a label
   * belongs.
   */
  const august = emptyFilters({ start: "2026-08-01", end: "2026-08-31" })

  test("the profitability CSV has the four columns that tab exists for", () => {
    const report = buildProfitability(state, config({ filters: august, grouping: "project" }), NOW_SEC)
    const csv = profitabilityToCsv(report, "Project", "EUR")
    const header = csv.split("\n")[0]

    for (const column of ["Fixed fee", "Profit", "Margin", "Revenue"]) {
      expect(header, `the export is missing "${column}"`).toContain(column)
    }
    expect(header.startsWith("Project"), `the first cell reads "${header.split(",")[0]}"`).toBe(true)
  })

  test("and its total counts a fixed fee once, whatever the grouping", () => {
    const byDate = buildProfitability(state, config({ filters: august, grouping: "date" }), NOW_SEC)
    const csv = profitabilityToCsv(byDate, "Date", "EUR")

    /**
     * Read back with the repo's own CSV parser rather than `split(",")`: the total's
     * label contains commas, so it is quoted, and a naive split reads the wrong
     * column — which is how the first version of this assertion failed on the value
     * 500 while the file said 1000.
     */
    const rows = parseCsvRows(csv)
    const header = rows[0]
    const total = rows.at(-1)!
    const feeColumn = header.findIndex((cell) => cell.startsWith("Fixed fee"))
    expect(feeColumn, `no Fixed fee column in ${header.join(" | ")}`).toBeGreaterThan(-1)

    expect(Number(total[feeColumn]), `the total line reads ${total.join(" | ")}`).toBe(byDate.fixedFee)
    expect(total[0], "the total does not say the fee is not per row").toContain("counted once")

    // and the rows themselves carry no share of it, so summing them cannot double it
    expect(rows.slice(1, -1).reduce((sum, r) => sum + Number(r[feeColumn]), 0)).toBe(0)
  })

  test("the summary CSV names the grouping in words, not as an id", () => {
    const summary = buildSummary(state, config({ filters: august, grouping: "date" }), NOW_SEC)
    expect(summaryToCsv(summary, "Date").split("\n")[0].startsWith("Date")).toBe(true)
  })
})

describe("the detailed CSV's timestamps", () => {
  test("are written in the person's own clock, with the offset", () => {
    /**
     * They were raw UTC instants while the screen beside them showed the local date,
     * so every entry after 22:00 in a zone ahead of Greenwich exported on the
     * PREVIOUS day — and a monthly invoice is exactly somebody grouping that file by
     * date in a spreadsheet.
     *
     * The assertion is on the local calendar day rather than the string, because the
     * pinned test zone is ahead of Greenwich and a string comparison would pass
     * against the old code for any entry before 22:00.
     */
    const lateNight = entry(99, "2026-08-11", "00:30", "00:45", { description: "late night" })
    const withLateEntry: TimetrackState = { ...state, entries: [lateNight] }
    const rows = buildDetailed(withLateEntry, config({ filters: emptyFilters({ start: "2026-08-01", end: "2026-08-31" }) }), NOW_SEC)
    expect(rows.length, "the entry was filtered out, so this asserts nothing").toBe(1)

    const line = detailedToCsv(rows, "EUR").split("\n")[1]
    const startCell = line.split(",").find((cell) => cell.includes("2026-08-1"))
    expect(startCell, `no timestamp found in: ${line}`).toBeTruthy()
    expect(startCell, `exported as ${startCell} — the screen shows 2026-08-11`).toContain("2026-08-11")
  })

  test("and still parse back to the same instant", () => {
    /**
     * The offset is in the string for this reason: `importEntriesCsv` reads these
     * columns back with `new Date(...)`, and a round trip that shifts the instant
     * would be a worse bug than the one being fixed.
     */
    const iso = new Date(2026, 7, 11, 0, 30, 0).toISOString()
    expect(new Date(localIsoWithOffset(iso)).getTime()).toBe(new Date(iso).getTime())
  })
})

describe("rangeRefusalIsCheckedAgainstAHandWrittenTable", () => {
  /**
   * WHY A TABLE AND NOT A CROSS-CHECK. The first version of this compared `clampRange`
   * against `rangeRefusal` and asserted they agreed — but `clampRange` is a one-line
   * delegation to `rangeRefusal`, so they CANNOT disagree, and the test passed
   * unchanged when the inverted-range check was broken on purpose. It asserted a
   * tautology and would have caught nothing, which is worse than no test: a name like
   * "agrees with the clamp" stops the next person looking.
   *
   * So the expected verdict is written out by hand for each candidate. Breaking either
   * function now goes red, which was checked by breaking each of them in turn.
   */
  const FALLBACK = { start: "2026-01-01", end: "2026-01-31" }

  /** [candidate, the reason it must be refused, or null for "must be accepted"] */
  const TABLE: [unknown, string | null][] = [
    [{ start: "2026-02-01", end: "2026-02-28" }, null],
    [{ start: "2026-02-01", end: "2026-02-01" }, null],
    [{ start: "2026-01-01", end: "2045-12-31" }, null],
    [{ start: "2026-02-28", end: "2026-02-01" }, "The end of the range is before its start"],
    [{ start: "", end: "2026-02-01" }, "A report needs both a start date and an end date"],
    [{ start: "2026-02-01", end: "" }, "A report needs both a start date and an end date"],
    [{ start: null, end: null }, "A report needs both a start date and an end date"],
    [{ start: "2026-13-45", end: "2026-02-01" }, "A report needs both a start date and an end date"],
    // SHORT ranges outside the window: a long one hits the 20-year ceiling first, and
    // short is what the ‹ › arrows produce — they shift by the span, a week at a time.
    [{ start: "1969-12-25", end: "1969-12-31" }, "Reports cover 1970 to 2099"],
    [{ start: "2100-01-01", end: "2100-01-07" }, "Reports cover 1970 to 2099"],
    [{ start: "1969-12-31", end: "2026-02-01" }, "A report covers at most 20 years"],
    [{ start: "1970-01-01", end: "2099-12-31" }, "A report covers at most 20 years"],
    [{}, "A report needs both a start date and an end date"],
    [[], "A report needs both a start date and an end date"],
    [null, "That date range could not be read"],
    [undefined, "That date range could not be read"],
    ["2026-01-01", "That date range could not be read"],
    [7, "That date range could not be read"],
  ]

  test("every candidate gets the reason written beside it", () => {
    const wrong = TABLE.filter(([candidate, expected]) => rangeRefusal(candidate) !== expected).map(
      ([candidate, expected]) => `${JSON.stringify(candidate)}: expected ${expected}, got ${rangeRefusal(candidate)}`,
    )
    expect(wrong).toEqual([])
  })

  test("and the clamp reverts for exactly the refused ones", () => {
    const wrong = TABLE.filter(([candidate, expected]) => {
      const result = clampRange(candidate, FALLBACK)
      const reverted = result.start === FALLBACK.start && result.end === FALLBACK.end
      return reverted !== (expected !== null)
    }).map(([candidate]) => JSON.stringify(candidate))
    expect(wrong).toEqual([])
  })

  test("the table covers both verdicts, or neither test above asserts anything", () => {
    const refused = TABLE.filter(([, expected]) => expected !== null)
    expect(refused.length).toBeGreaterThan(11)
    expect(TABLE.length - refused.length).toBe(3)
  })

  test("the ceiling and the window in the reasons are the exported constants", () => {
    /** So the hand-written strings above cannot quietly stop matching the real numbers. */
    expect(`A report covers at most ${Math.floor(MAX_RANGE_DAYS / 366)} years`).toBe("A report covers at most 20 years")
    expect(`Reports cover ${RANGE_MIN.slice(0, 4)} to ${RANGE_MAX.slice(0, 4)}`).toBe("Reports cover 1970 to 2099")
  })
})
