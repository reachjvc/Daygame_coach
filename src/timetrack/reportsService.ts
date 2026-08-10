/**
 * Time-tracking slice — reporting engine.
 *
 * Mirrors Toggl's four report tabs (Summary, Detailed, Workload, Profitability),
 * its grouping/sub-grouping model, rounding, and CSV export. Rounding is applied
 * per time entry before aggregation, which is what Toggl's report rounding does.
 */

import { NO_PROJECT_COLOR, PROJECT_COLORS } from "./config"
import {
  addDays,
  dateKey,
  eachDay,
  epochSeconds,
  formatCompact,
  formatDayShort,
  formatMonthLabel,
  hashColor,
  monthStartOf,
  roundSeconds,
  weekStartOf,
} from "./timetrackFormatService"
import {
  clientById,
  entriesInRange,
  entryCost,
  entryRevenue,
  entrySeconds,
  liveEntries,
  memberById,
  projectById,
  taskById,
} from "./timetrackService"
import type {
  ChartInterval,
  DateRange,
  DetailedRow,
  GroupingDimension,
  Id,
  IsoDate,
  ProfitabilityRow,
  ReportConfig,
  ReportFilters,
  RoundingConfig,
  SummaryBucket,
  SummaryReport,
  SummaryRow,
  TimeEntry,
  TimetrackState,
  WeekStart,
  WorkloadReport,
} from "./types"

// ---------------------------------------------------------------------------
// Date range presets
// ---------------------------------------------------------------------------

export type DatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"

export function presetRange(preset: DatePreset, todayKey: IsoDate, weekStart: WeekStart): DateRange {
  const year = Number(todayKey.slice(0, 4))
  switch (preset) {
    case "today":
      return { start: todayKey, end: todayKey }
    case "yesterday": {
      const y = addDays(todayKey, -1)
      return { start: y, end: y }
    }
    case "this_week": {
      const start = weekStartOf(todayKey, weekStart)
      return { start, end: addDays(start, 6) }
    }
    case "last_week": {
      const start = addDays(weekStartOf(todayKey, weekStart), -7)
      return { start, end: addDays(start, 6) }
    }
    case "this_month": {
      const start = monthStartOf(todayKey)
      return { start, end: addDays(monthStartOf(addDays(start, 40)), -1) }
    }
    case "last_month": {
      const thisStart = monthStartOf(todayKey)
      const start = monthStartOf(addDays(thisStart, -1))
      return { start, end: addDays(thisStart, -1) }
    }
    case "this_year":
      return { start: `${year}-01-01`, end: `${year}-12-31` }
    case "last_year":
      return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` }
    default:
      return { start: todayKey, end: todayKey }
  }
}

export function presetLabel(preset: DatePreset): string {
  return preset.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

export function rangeDayCount(range: DateRange): number {
  return eachDay(range.start, range.end).length
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export function applyFilters(state: TimetrackState, filters: ReportFilters): TimeEntry[] {
  const inRange = entriesInRange(liveEntries(state), filters.range.start, filters.range.end)
  const search = filters.description.trim().toLowerCase()

  return inRange.filter((entry) => {
    if (filters.projectIds.length && (entry.projectId === null || !filters.projectIds.includes(entry.projectId))) return false
    if (filters.taskIds.length && (entry.taskId === null || !filters.taskIds.includes(entry.taskId))) return false
    if (filters.memberIds.length && !filters.memberIds.includes(entry.userId)) return false
    if (filters.tagIds.length && !filters.tagIds.some((id) => entry.tagIds.includes(id))) return false
    if (filters.clientIds.length) {
      const project = projectById(state, entry.projectId)
      if (!project || project.clientId === null || !filters.clientIds.includes(project.clientId)) return false
    }
    if (filters.billable === "yes" && !entry.billable) return false
    if (filters.billable === "no" && entry.billable) return false
    if (search && !entry.description.toLowerCase().includes(search)) return false
    return true
  })
}

export function emptyFilters(range: DateRange): ReportFilters {
  return {
    range,
    clientIds: [],
    projectIds: [],
    taskIds: [],
    tagIds: [],
    memberIds: [],
    billable: "all",
    description: "",
  }
}

export function activeFilterCount(filters: ReportFilters): number {
  return (
    filters.clientIds.length +
    filters.projectIds.length +
    filters.taskIds.length +
    filters.tagIds.length +
    filters.memberIds.length +
    (filters.billable === "all" ? 0 : 1) +
    (filters.description.trim() ? 1 : 0)
  )
}

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

interface DimensionValue {
  key: string
  label: string
  color: string | null
}

/**
 * A single entry can map to several buckets on the tag dimension (Toggl counts
 * the entry once per tag), so this returns a list.
 */
export function dimensionValues(
  state: TimetrackState,
  entry: TimeEntry,
  dimension: GroupingDimension,
): DimensionValue[] {
  switch (dimension) {
    case "project": {
      const project = projectById(state, entry.projectId)
      return [
        project
          ? { key: `project:${project.id}`, label: project.name, color: project.color }
          : { key: "project:none", label: "No project", color: NO_PROJECT_COLOR },
      ]
    }
    case "client": {
      const project = projectById(state, entry.projectId)
      const client = clientById(state, project?.clientId ?? null)
      return [
        client
          ? { key: `client:${client.id}`, label: client.name, color: hashColor(client.name, PROJECT_COLORS) }
          : { key: "client:none", label: "No client", color: NO_PROJECT_COLOR },
      ]
    }
    case "task": {
      const task = taskById(state, entry.taskId)
      return [
        task
          ? { key: `task:${task.id}`, label: task.name, color: projectById(state, task.projectId)?.color ?? null }
          : { key: "task:none", label: "No task", color: NO_PROJECT_COLOR },
      ]
    }
    case "tag": {
      if (entry.tagIds.length === 0) return [{ key: "tag:none", label: "No tag", color: NO_PROJECT_COLOR }]
      return entry.tagIds.map((id) => {
        const tag = state.tags.find((t) => t.id === id)
        const label = tag?.name ?? `#${id}`
        return { key: `tag:${id}`, label, color: hashColor(label, PROJECT_COLORS) }
      })
    }
    case "member": {
      const member = memberById(state, entry.userId)
      const label = member?.name ?? "Unknown member"
      return [{ key: `member:${entry.userId}`, label, color: hashColor(label, PROJECT_COLORS) }]
    }
    case "description": {
      const label = entry.description.trim() || "(no description)"
      return [{ key: `desc:${label.toLowerCase()}`, label, color: null }]
    }
    case "billable":
      return [
        entry.billable
          ? { key: "billable:yes", label: "Billable", color: "#2da608" }
          : { key: "billable:no", label: "Non-billable", color: NO_PROJECT_COLOR },
      ]
    case "date": {
      const key = dateKey(entry.start)
      return [{ key: `date:${key}`, label: key, color: null }]
    }
    default:
      return [{ key: "other", label: "Other", color: null }]
  }
}

// ---------------------------------------------------------------------------
// Summary report
// ---------------------------------------------------------------------------

interface Accumulator {
  key: string
  label: string
  color: string | null
  seconds: number
  billableSeconds: number
  revenue: number
  cost: number
  entryCount: number
  children: Map<string, Accumulator>
}

function makeAcc(value: DimensionValue): Accumulator {
  return {
    key: value.key,
    label: value.label,
    color: value.color,
    seconds: 0,
    billableSeconds: 0,
    revenue: 0,
    cost: 0,
    entryCount: 0,
    children: new Map(),
  }
}

function addTo(acc: Accumulator, seconds: number, billable: boolean, revenue: number, cost: number): void {
  acc.seconds += seconds
  if (billable) acc.billableSeconds += seconds
  acc.revenue += revenue
  acc.cost += cost
  acc.entryCount += 1
}

function toRow(acc: Accumulator): SummaryRow {
  return {
    key: acc.key,
    label: acc.label,
    color: acc.color,
    seconds: acc.seconds,
    billableSeconds: acc.billableSeconds,
    revenue: acc.revenue,
    cost: acc.cost,
    entryCount: acc.entryCount,
    children: [...acc.children.values()].map(toRow).sort((a, b) => b.seconds - a.seconds),
  }
}

function bucketKeyFor(day: IsoDate, interval: ChartInterval, weekStart: WeekStart): IsoDate {
  if (interval === "week") return weekStartOf(day, weekStart)
  if (interval === "month") return monthStartOf(day)
  return day
}

function bucketLabel(key: IsoDate, interval: ChartInterval): string {
  if (interval === "month") return formatMonthLabel(key)
  if (interval === "week") return `w/c ${formatDayShort(key)}`
  return formatDayShort(key)
}

export function buildSummary(state: TimetrackState, config: ReportConfig, nowSec: number): SummaryReport {
  const entries = applyFilters(state, config.filters)
  const groups = new Map<string, Accumulator>()
  const buckets = new Map<string, { seconds: number; billableSeconds: number; revenue: number; cost: number; segments: Map<string, DimensionValue & { value: number }> }>()
  const pie = new Map<string, DimensionValue & { seconds: number }>()

  let totalSeconds = 0
  let totalBillable = 0
  let totalRevenue = 0
  let totalCost = 0
  const activeDays = new Set<IsoDate>()

  // Pre-create every bucket in range so charts show empty days too
  const interval = config.chartInterval
  for (const day of eachDay(config.filters.range.start, config.filters.range.end)) {
    const key = bucketKeyFor(day, interval, state.user.weekStart)
    if (!buckets.has(key)) {
      buckets.set(key, { seconds: 0, billableSeconds: 0, revenue: 0, cost: 0, segments: new Map() })
    }
  }

  for (const entry of entries) {
    const rawSeconds = entrySeconds(entry, nowSec)
    const seconds = roundSeconds(rawSeconds, config.rounding)
    const revenue = entryRevenue(state, entry, seconds)
    const cost = entryCost(state, entry, seconds)

    totalSeconds += seconds
    if (entry.billable) totalBillable += seconds
    totalRevenue += revenue
    totalCost += cost
    activeDays.add(dateKey(entry.start))

    // primary grouping (+ optional sub-grouping)
    for (const primary of dimensionValues(state, entry, config.grouping)) {
      const acc = groups.get(primary.key) ?? makeAcc(primary)
      addTo(acc, seconds, entry.billable, revenue, cost)
      if (config.subGrouping) {
        for (const secondary of dimensionValues(state, entry, config.subGrouping)) {
          const child = acc.children.get(secondary.key) ?? makeAcc(secondary)
          addTo(child, seconds, entry.billable, revenue, cost)
          acc.children.set(secondary.key, child)
        }
      }
      groups.set(primary.key, acc)
    }

    // chart buckets
    const bucketKey = bucketKeyFor(dateKey(entry.start), interval, state.user.weekStart)
    const bucket = buckets.get(bucketKey) ?? { seconds: 0, billableSeconds: 0, revenue: 0, cost: 0, segments: new Map() }
    bucket.seconds += seconds
    if (entry.billable) bucket.billableSeconds += seconds
    bucket.revenue += revenue
    bucket.cost += cost
    if (config.chartStackBy) {
      for (const segment of dimensionValues(state, entry, config.chartStackBy)) {
        const existing = bucket.segments.get(segment.key)
        bucket.segments.set(segment.key, { ...segment, value: (existing?.value ?? 0) + seconds })
      }
    }
    buckets.set(bucketKey, bucket)

    // pie
    for (const slice of dimensionValues(state, entry, config.pieGroupBy)) {
      const existing = pie.get(slice.key)
      pie.set(slice.key, { ...slice, seconds: (existing?.seconds ?? 0) + seconds })
    }
  }

  const fixedFee = state.projects
    .filter((p) => p.fixedFee != null && (config.filters.projectIds.length === 0 || config.filters.projectIds.includes(p.id)))
    .reduce((sum, p) => sum + (p.fixedFee ?? 0), 0)

  const bucketRows: SummaryBucket[] = [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, value]) => ({
      key,
      label: bucketLabel(key, interval),
      seconds: value.seconds,
      billableSeconds: value.billableSeconds,
      revenue: value.revenue,
      cost: value.cost,
      segments: [...value.segments.values()].map((s) => ({ key: s.key, label: s.label, color: s.color, value: s.value })),
    }))

  return {
    rows: [...groups.values()].map(toRow).sort((a, b) => b.seconds - a.seconds),
    buckets: bucketRows,
    pie: [...pie.values()]
      .map((p) => ({ key: p.key, label: p.label, color: p.color, seconds: p.seconds }))
      .sort((a, b) => b.seconds - a.seconds),
    totals: {
      seconds: totalSeconds,
      billableSeconds: totalBillable,
      revenue: totalRevenue,
      cost: totalCost,
      fixedFee,
      activeDays: activeDays.size,
      entryCount: entries.length,
    },
  }
}

export function metricValue(report: SummaryReport, metric: string): { value: number; kind: "duration" | "money" | "percent" } {
  const t = report.totals
  switch (metric) {
    case "billable":
      return { value: t.billableSeconds, kind: "duration" }
    case "revenue":
      return { value: t.revenue, kind: "money" }
    case "avg_daily":
      return { value: t.activeDays ? t.seconds / t.activeDays : 0, kind: "duration" }
    case "cost":
      return { value: t.cost, kind: "money" }
    case "profit":
      return { value: t.revenue - t.cost, kind: "money" }
    case "fixed_fee":
      return { value: t.fixedFee, kind: "money" }
    default:
      return { value: t.seconds, kind: "duration" }
  }
}

// ---------------------------------------------------------------------------
// Detailed report
// ---------------------------------------------------------------------------

export function buildDetailed(state: TimetrackState, config: ReportConfig, nowSec: number): DetailedRow[] {
  const rows = applyFilters(state, config.filters).map((entry) => {
    const seconds = roundSeconds(entrySeconds(entry, nowSec), config.rounding)
    const project = projectById(state, entry.projectId)
    const task = taskById(state, entry.taskId)
    const client = clientById(state, project?.clientId ?? null)
    return {
      entryId: entry.id,
      description: entry.description,
      projectName: project?.name ?? null,
      projectColor: project?.color ?? null,
      clientName: client?.name ?? null,
      taskName: task?.name ?? null,
      tagNames: entry.tagIds
        .map((id) => state.tags.find((t) => t.id === id)?.name)
        .filter((n): n is string => Boolean(n)),
      memberName: memberById(state, entry.userId)?.name ?? "Unknown",
      billable: entry.billable,
      start: entry.start,
      stop: entry.stop,
      seconds,
      amount: entryRevenue(state, entry, seconds),
    }
  })

  const { column, direction } = config.sort
  const factor = direction === "asc" ? 1 : -1
  return rows.sort((a, b) => {
    switch (column) {
      case "duration":
        return (a.seconds - b.seconds) * factor
      case "description":
        return a.description.localeCompare(b.description) * factor
      case "project":
        return (a.projectName ?? "").localeCompare(b.projectName ?? "") * factor
      case "amount":
        return (a.amount - b.amount) * factor
      default:
        return (epochSeconds(a.start) - epochSeconds(b.start)) * factor
    }
  })
}

// ---------------------------------------------------------------------------
// Workload report (Toggl's renamed Weekly report)
// ---------------------------------------------------------------------------

export function buildWorkload(state: TimetrackState, config: ReportConfig, nowSec: number): WorkloadReport {
  const days = eachDay(config.filters.range.start, config.filters.range.end)
  const dayIndex = new Map(days.map((d, i) => [d, i]))
  const entries = applyFilters(state, config.filters)
  const rows = new Map<string, { key: string; label: string; color: string | null; values: number[] }>()
  const dayTotals = days.map(() => 0)

  for (const entry of entries) {
    const seconds = roundSeconds(entrySeconds(entry, nowSec), config.rounding)
    const amount = entryRevenue(state, entry, seconds)
    const value = config.workloadValueMode === "earnings" ? amount : seconds
    const index = dayIndex.get(dateKey(entry.start))
    if (index === undefined) continue

    for (const dim of dimensionValues(state, entry, config.grouping)) {
      const row = rows.get(dim.key) ?? { key: dim.key, label: dim.label, color: dim.color, values: days.map(() => 0) }
      row.values[index] += value
      rows.set(dim.key, row)
    }
    dayTotals[index] += value
  }

  const rowList = [...rows.values()]
    .map((row) => ({ ...row, total: row.values.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)

  return {
    days,
    rows: rowList,
    dayTotals,
    grandTotal: dayTotals.reduce((a, b) => a + b, 0),
    mode: config.workloadValueMode,
  }
}

// ---------------------------------------------------------------------------
// Profitability report
// ---------------------------------------------------------------------------

export function buildProfitability(state: TimetrackState, config: ReportConfig, nowSec: number): ProfitabilityRow[] {
  const entries = applyFilters(state, config.filters)
  const rows = new Map<string, ProfitabilityRow & { projectIds: Set<Id> }>()

  for (const entry of entries) {
    const seconds = roundSeconds(entrySeconds(entry, nowSec), config.rounding)
    const revenue = entryRevenue(state, entry, seconds)
    const cost = entryCost(state, entry, seconds)

    for (const dim of dimensionValues(state, entry, config.grouping)) {
      const row =
        rows.get(dim.key) ??
        {
          key: dim.key,
          label: dim.label,
          color: dim.color,
          seconds: 0,
          billableSeconds: 0,
          revenue: 0,
          fixedFee: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          projectIds: new Set<Id>(),
        }
      row.seconds += seconds
      if (entry.billable) row.billableSeconds += seconds
      row.revenue += revenue
      row.cost += cost
      if (entry.projectId !== null) row.projectIds.add(entry.projectId)
      rows.set(dim.key, row)
    }
  }

  return [...rows.values()]
    .map((row) => {
      const fixedFee = [...row.projectIds].reduce(
        (sum, id) => sum + (projectById(state, id)?.fixedFee ?? 0),
        0,
      )
      const income = row.revenue + fixedFee
      const profit = income - row.cost
      return {
        key: row.key,
        label: row.label,
        color: row.color,
        seconds: row.seconds,
        billableSeconds: row.billableSeconds,
        revenue: row.revenue,
        fixedFee,
        cost: row.cost,
        profit,
        margin: income > 0 ? profit / income : 0,
      }
    })
    .sort((a, b) => b.profit - a.profit)
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function csvCell(value: string | number | boolean): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function detailedToCsv(rows: DetailedRow[], currency: string): string {
  const header = [
    "Description",
    "Project",
    "Client",
    "Task",
    "Tags",
    "Member",
    "Billable",
    "Start",
    "Stop",
    "Duration (h:mm:ss)",
    "Duration (decimal)",
    `Amount (${currency})`,
  ]
  const lines = rows.map((row) => {
    const h = Math.floor(row.seconds / 3600)
    const m = Math.floor((row.seconds % 3600) / 60)
    const s = row.seconds % 60
    return [
      row.description,
      row.projectName ?? "",
      row.clientName ?? "",
      row.taskName ?? "",
      row.tagNames.join(", "),
      row.memberName,
      row.billable ? "Yes" : "No",
      row.start,
      row.stop ?? "",
      `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      (row.seconds / 3600).toFixed(2),
      row.amount.toFixed(2),
    ].map(csvCell).join(",")
  })
  return [header.join(","), ...lines].join("\n")
}

export function summaryToCsv(report: SummaryReport, groupingLabel: string): string {
  const header = [groupingLabel, "Duration (h:mm:ss)", "Duration (decimal)", "Billable (decimal)", "Revenue", "Cost", "Entries"]
  const lines: string[] = []
  for (const row of report.rows) {
    const push = (label: string, r: SummaryRow, indent: string) => {
      const h = Math.floor(r.seconds / 3600)
      const m = Math.floor((r.seconds % 3600) / 60)
      const s = r.seconds % 60
      lines.push(
        [
          `${indent}${label}`,
          `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
          (r.seconds / 3600).toFixed(2),
          (r.billableSeconds / 3600).toFixed(2),
          r.revenue.toFixed(2),
          r.cost.toFixed(2),
          r.entryCount,
        ].map(csvCell).join(","),
      )
    }
    push(row.label, row, "")
    for (const child of row.children) push(child.label, child, "— ")
  }
  return [header.join(","), ...lines].join("\n")
}

export function workloadToCsv(report: WorkloadReport): string {
  const header = ["Group", ...report.days, "Total"]
  const format = (v: number) => (report.mode === "earnings" ? v.toFixed(2) : (v / 3600).toFixed(2))
  const lines = report.rows.map((row) => [row.label, ...row.values.map(format), format(row.total)].map(csvCell).join(","))
  const totals = ["Total", ...report.dayTotals.map(format), format(report.grandTotal)].map(csvCell).join(",")
  return [header.join(","), ...lines, totals].join("\n")
}

// ---------------------------------------------------------------------------
// Config defaults & share links
// ---------------------------------------------------------------------------

export function defaultReportConfig(todayKey: IsoDate, weekStart: WeekStart, rounding: RoundingConfig): ReportConfig {
  return {
    tab: "summary",
    filters: emptyFilters(presetRange("this_week", todayKey, weekStart)),
    grouping: "project",
    subGrouping: "description",
    rounding: { ...rounding, enabled: false },
    summaryMetrics: ["total", "billable", "revenue", "avg_daily"],
    chartMetric: "time",
    chartInterval: "day",
    chartStackBy: null,
    pieGroupBy: "project",
    workloadValueMode: "duration",
    sort: { column: "start", direction: "desc" },
  }
}

/** Toggl shares saved reports by link; we encode the whole config in the URL */
export function encodeReportConfig(config: ReportConfig): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(config))))
}

export function decodeReportConfig(encoded: string): ReportConfig | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded)))) as ReportConfig
  } catch {
    return null
  }
}

export function describeReport(config: ReportConfig): string {
  const parts = [config.tab, `${config.filters.range.start}→${config.filters.range.end}`, `by ${config.grouping}`]
  if (config.subGrouping) parts.push(`+ ${config.subGrouping}`)
  if (config.rounding.enabled) parts.push(`rounded ${config.rounding.mode} ${config.rounding.minutes}m`)
  return parts.join(" · ")
}

export function formatMetric(value: number, kind: "duration" | "money" | "percent", currency: string): string {
  if (kind === "duration") return formatCompact(value)
  if (kind === "percent") return `${Math.round(value)}%`
  return `${currency} ${value.toFixed(2)}`
}
