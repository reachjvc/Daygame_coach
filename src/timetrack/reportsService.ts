/**
 * Time-tracking slice — reporting engine.
 *
 * Mirrors Toggl's four report tabs (Summary, Detailed, Workload, Profitability),
 * its grouping/sub-grouping model, rounding, and CSV export. Rounding is applied
 * per time entry before aggregation, which is what Toggl's report rounding does.
 */

import { GROUPING_DIMENSIONS, NO_PROJECT_COLOR, PROJECT_COLORS, SUMMARY_METRICS } from "./config"
import {
  addDays,
  dateKey,
  daysBetween,
  eachDay,
  epochSeconds,
  formatCompact,
  formatDayShort,
  formatMonthLabel,
  hashColor,
  localIsoWithOffset,
  monthStartOf,
  roundSeconds,
  weekStartOf,
} from "./timetrackFormatService"
import {
  clientById,
  entriesInRange,
  entryCost,
  entryRevenue,
  entryDaySeconds,
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
  SummaryMetric,
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

/**
 * The seconds of `entry` that fall inside the report's range, rounded per day.
 *
 * One owner for what every report means by an entry's hours. Four places each took
 * `entrySeconds` — the whole entry — and one of them also filed all of it under the
 * start day, so a shift from Sunday 23:00 to Monday 07:00 gave a Monday report none of
 * its seven Monday hours while the calendar beside it showed them. `entryDaySeconds` is
 * the function with a written argument for what a day's hours are; this is it applied
 * across a range.
 *
 * Identical to the old behaviour for a same-day entry inside the range, which is almost
 * all of them.
 */
function secondsInRange(entry: TimeEntry, config: ReportConfig, nowSec: number): number {
  return eachDay(config.filters.range.start, config.filters.range.end).reduce(
    (sum, day) => sum + roundSeconds(entryDaySeconds(entry, day, nowSec), config.rounding),
    0,
  )
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
    /**
     * THE SECONDS THIS ENTRY CONTRIBUTES TO THIS RANGE, DAY BY DAY.
     *
     * This took `entrySeconds` — the whole entry — and filed all of it under
     * `dateKey(entry.start)`. So a shift from Sunday 23:00 to Monday 07:00 put eight
     * hours on the Sunday, and a Monday-to-Sunday report that held seven of those hours
     * showed none of them, while the calendar beside it showed 7:00 for that Monday.
     * Two definitions of "hours on this day"; `entryDaySeconds` is the one with a
     * written argument, so it is the one used here.
     *
     * Rounding stays per contribution rather than per entry, which is identical for a
     * same-day entry — the overwhelming majority — and has the property the old code
     * lacked: the chart buckets now sum to the total exactly.
     */
    const perDay = eachDay(config.filters.range.start, config.filters.range.end)
      .map((day) => ({ day, seconds: roundSeconds(entryDaySeconds(entry, day, nowSec), config.rounding) }))
      .filter((d) => d.seconds > 0)

    const seconds = perDay.reduce((sum, d) => sum + d.seconds, 0)
    if (seconds === 0) continue
    const revenue = entryRevenue(state, entry, seconds)
    const cost = entryCost(state, entry, seconds)

    totalSeconds += seconds
    if (entry.billable) totalBillable += seconds
    totalRevenue += revenue
    totalCost += cost
    for (const d of perDay) activeDays.add(d.day)

    /**
     * GROUPING BY DATE IS THE ONE DIMENSION WHOSE VALUE IS DIVISIBLE.
     *
     * Every other dimension answers "which project / tag / member is this entry",
     * and the whole entry belongs to each answer. "Which day" does not: a shift from
     * Sunday 23:00 to Monday 07:00 belongs partly to each, and `dimensionValues` gave
     * it one label — `dateKey(entry.start)` — which for a Monday-to-Sunday report was a
     * label for a day outside the range entirely.
     *
     * So the date grouping comes from `perDay`, which is already the per-day split, and
     * the rest come from `dimensionValues` as before.
     */
    const primaries =
      config.grouping === "date"
        ? perDay.map((d) => ({ value: { key: `date:${d.day}`, label: d.day, color: null }, seconds: d.seconds }))
        : dimensionValues(state, entry, config.grouping).map((value) => ({ value, seconds }))

    // primary grouping (+ optional sub-grouping)
    for (const { value: primary, seconds: primarySeconds } of primaries) {
      const acc = groups.get(primary.key) ?? makeAcc(primary)
      const share = primarySeconds
      const shareRevenue = seconds > 0 ? (revenue * share) / seconds : 0
      const shareCost = seconds > 0 ? (cost * share) / seconds : 0
      addTo(acc, share, entry.billable, shareRevenue, shareCost)
      if (config.subGrouping) {
        for (const secondary of dimensionValues(state, entry, config.subGrouping)) {
          const child = acc.children.get(secondary.key) ?? makeAcc(secondary)
          // the parent's share, so a child can never exceed the row it sits under
          addTo(child, share, entry.billable, shareRevenue, shareCost)
          acc.children.set(secondary.key, child)
        }
      }
      groups.set(primary.key, acc)
    }

    // chart buckets — each day's own hours in its own bucket, so a shift that crossed
    // midnight appears on both days rather than all on the first
    for (const contribution of perDay) {
    const bucketKey = bucketKeyFor(contribution.day, interval, state.user.weekStart)
    const bucket = buckets.get(bucketKey) ?? { seconds: 0, billableSeconds: 0, revenue: 0, cost: 0, segments: new Map() }
    const share = contribution.seconds
    const shareRevenue = seconds > 0 ? (revenue * share) / seconds : 0
    const shareCost = seconds > 0 ? (cost * share) / seconds : 0
    bucket.seconds += share
    if (entry.billable) bucket.billableSeconds += share
    bucket.revenue += shareRevenue
    bucket.cost += shareCost
    if (config.chartStackBy) {
      for (const segment of dimensionValues(state, entry, config.chartStackBy)) {
        const existing = bucket.segments.get(segment.key)
        // the day's share, not the whole entry, or a stacked bar exceeds its own bar
        bucket.segments.set(segment.key, { ...segment, value: (existing?.value ?? 0) + share })
      }
    }
    buckets.set(bucketKey, bucket)
    }

    // pie
    for (const slice of dimensionValues(state, entry, config.pieGroupBy)) {
      const existing = pie.get(slice.key)
      pie.set(slice.key, { ...slice, seconds: (existing?.seconds ?? 0) + seconds })
    }
  }

  /**
   * THE FEES OF THE PROJECTS IN THIS REPORT — NOT OF EVERY PROJECT EVER CREATED.
   *
   * This read `state.projects` and never the entries or the range, so the
   * "Fixed fee" metric ignored all three of: the date range (a one-day report
   * showed the fee of a project with nothing in that day), whether the project was
   * ARCHIVED, and whether it was a TEMPLATE. It therefore only ever grew — including
   * by the fee of every clone made from a template — and rendered as an exact figure
   * beside the day's real total.
   *
   * The projects the entries actually point at are the report's subject, which is
   * the same rule the rest of this function already follows.
   */
  const projectsInReport = new Set<Id>()
  for (const entry of entries) if (entry.projectId !== null) projectsInReport.add(entry.projectId)
  const fixedFee = [...projectsInReport]
    .map((id) => projectById(state, id))
    .filter((p): p is NonNullable<typeof p> => p != null && p.fixedFee != null)
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
    const seconds = secondsInRange(entry, config, nowSec)
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
    const seconds = secondsInRange(entry, config, nowSec)
    if (seconds === 0) continue
    const amount = entryRevenue(state, entry, seconds)

    /**
     * A COLUMN PER DAY MEANS THE DAY'S OWN HOURS, not the whole entry under the day it
     * began. `dayIndex.get(dateKey(entry.start))` also returned undefined for an entry
     * that started the evening before the range, so the grid dropped it entirely —
     * which is how a night shift vanished from the Workload tab while the calendar
     * showed it.
     */
    for (const day of days) {
      const daySeconds = roundSeconds(entryDaySeconds(entry, day, nowSec), config.rounding)
      if (daySeconds === 0) continue
      const index = dayIndex.get(day)
      if (index === undefined) continue
      const share = config.workloadValueMode === "earnings" ? (amount * daySeconds) / seconds : daySeconds

      for (const dim of dimensionValues(state, entry, config.grouping)) {
        const row = rows.get(dim.key) ?? { key: dim.key, label: dim.label, color: dim.color, values: days.map(() => 0) }
        row.values[index] += share
        rows.set(dim.key, row)
      }
      dayTotals[index] += share
    }
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

/**
 * A FIXED FEE BELONGS TO A PROJECT. IT IS NOT DIVISIBLE BY DATE OR BY TAG.
 *
 * This returned rows only, and each row added the WHOLE fee of every project that
 * appeared in it. Group by anything that splits a project across rows and the fee
 * is counted once per row, and the Total line — which sums the rows — multiplies
 * it. Measured on one project with a EUR 1,000 fee and three one-hour entries on
 * three days, grouped by date: Fixed fee EUR 3,000, Profit EUR 2,910, against a
 * truth of EUR 1,000 and EUR 910. Grouping by billable status doubled it; by tag,
 * a single entry carrying two tags counted the fee twice.
 *
 * It survived three rounds of review because `defaultReportConfig` opens on
 * "Group by project", which is one of the only two groupings where it was right —
 * and "Group by date" is one click away on the tab itself. This is the number
 * somebody invoices from.
 *
 * So the fee is now reported ONCE for the whole report, and a row carries a share
 * of it only when the grouping guarantees a project cannot appear in two rows:
 * by project, or by client, since a project belongs to exactly one client. For
 * every other grouping a row's fee is zero and the tab says why, because inventing
 * a per-day share of a retainer would be a made-up number presented as an exact
 * one.
 */
export interface ProfitabilityReport {
  rows: ProfitabilityRow[]
  /** every project in the report, its fee counted once, whatever the grouping */
  fixedFee: number
  /** whether a row's own `fixedFee` means anything for this grouping */
  feeIsPerRow: boolean
}

/** The groupings in which a project appears in exactly one row */
function attributesProjectsUniquely(grouping: ReportConfig["grouping"]): boolean {
  return grouping === "project" || grouping === "client"
}

export function buildProfitability(state: TimetrackState, config: ReportConfig, nowSec: number): ProfitabilityReport {
  const entries = applyFilters(state, config.filters)
  const rows = new Map<string, ProfitabilityRow & { projectIds: Set<Id> }>()

  for (const entry of entries) {
    const seconds = secondsInRange(entry, config, nowSec)
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

  const feeIsPerRow = attributesProjectsUniquely(config.grouping)

  // every project the report touches, once, however many rows it appears in
  const allProjectIds = new Set<Id>()
  for (const row of rows.values()) for (const id of row.projectIds) allProjectIds.add(id)
  const reportFee = [...allProjectIds].reduce((sum, id) => sum + (projectById(state, id)?.fixedFee ?? 0), 0)

  const out = [...rows.values()]
    .map((row) => {
      const fixedFee = feeIsPerRow
        ? [...row.projectIds].reduce((sum, id) => sum + (projectById(state, id)?.fixedFee ?? 0), 0)
        : 0
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

  return { rows: out, fixedFee: reportFee, feeIsPerRow }
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
      // the person's own clock, with its offset — see `localIsoWithOffset`. These
      // were raw UTC instants while the screen beside them showed the local date, so
      // every entry after 22:00 exported on the previous day.
      localIsoWithOffset(row.start),
      row.stop ? localIsoWithOffset(row.stop) : "",
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

/**
 * The Profitability tab's own CSV.
 *
 * It had none, and the export handler's `else` branch caught it — so clicking
 * Export → CSV on Profitability downloaded `summary-<range>.csv`, with a duration
 * and revenue header and none of Fixed fee, Profit or Margin: the four columns the
 * tab exists for. The toast still said "Report exported".
 *
 * The fee is a report-level figure for most groupings (see `buildProfitability`), so
 * it is written as its own trailing line rather than spread across the rows, and the
 * total line says which it is.
 */
export function profitabilityToCsv(report: ProfitabilityReport, groupingLabel: string, currency: string): string {
  const header = [
    groupingLabel,
    "Duration (h:mm:ss)",
    "Duration (decimal)",
    `Revenue (${currency})`,
    `Fixed fee (${currency})`,
    `Cost (${currency})`,
    `Profit (${currency})`,
    "Margin",
  ]
  const lines = report.rows.map((row) => {
    const h = Math.floor(row.seconds / 3600)
    const m = Math.floor((row.seconds % 3600) / 60)
    const sec = row.seconds % 60
    return [
      row.label,
      `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`,
      (row.seconds / 3600).toFixed(2),
      row.revenue.toFixed(2),
      row.fixedFee.toFixed(2),
      row.cost.toFixed(2),
      row.profit.toFixed(2),
      `${(row.margin * 100).toFixed(1)}%`,
    ].map(csvCell).join(",")
  })

  const seconds = report.rows.reduce((sum, r) => sum + r.seconds, 0)
  const revenue = report.rows.reduce((sum, r) => sum + r.revenue, 0)
  const cost = report.rows.reduce((sum, r) => sum + r.cost, 0)
  const profit = revenue + report.fixedFee - cost
  const income = revenue + report.fixedFee
  const totalLabel = report.feeIsPerRow ? "Total" : "Total (fixed fees belong to whole projects, counted once)"
  const total = [
    totalLabel,
    `${Math.floor(seconds / 3600)}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    (seconds / 3600).toFixed(2),
    revenue.toFixed(2),
    report.fixedFee.toFixed(2),
    cost.toFixed(2),
    profit.toFixed(2),
    `${(income > 0 ? (profit / income) * 100 : 0).toFixed(1)}%`,
  ].map(csvCell).join(",")

  return [header.map(csvCell).join(","), ...lines, total].join("\n")
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
    // the workspace's own switch, which this used to discard: `enabled: false` was
    // hard-coded, so "Default report rounding → Round by default" did nothing at
    // all while reading On. Someone billing in 15-minute blocks got raw minutes.
    rounding: { ...rounding },
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

/**
 * A RANGE THE REPORT ENGINE WILL ACTUALLY BUILD — ONE OWNER, EVERY DOOR.
 *
 * The rule is: both ends parse, the span is positive, and it is at most
 * `MAX_RANGE_DAYS`. It lived inside `decodeReportConfig`, which meant it guarded the
 * one door nobody walks through and none of the doors people use.
 *
 * WHAT THAT COST, measured in a real headless browser rather than reasoned about.
 * `min`/`max` on an `<input type="date">` are CONSTRAINT-VALIDATION attributes, not
 * clamps: the value still arrives, only `validity.rangeOverflow` flips. And a date
 * field emits every prefix of a year as it is typed — pressing `2 0 2 5` fires four
 * changes: `0002-01-01`, `0020-01-01`, `0202-01-01`, `2025-01-01`. The third of those
 * is a 666,480-day range, which the four render-time report builders take about 1.8
 * seconds to build. So typing a year into the Reports start date froze the tab, every
 * time — and stopping after three digits left it frozen, rebuilding every second while
 * a timer ran, which is the one state where somebody needs to press Stop.
 *
 * The previous attempt added `min`/`max` and a test asserting the attributes were
 * present. That is the eighth test in this review to certify the thing it was meant to
 * close, and it happened because the fix aimed at a mechanism I had inferred — "the
 * year field takes five digits" — rather than one I had observed. One minute in a
 * browser produces the real one.
 *
 * The span is measured with `daysBetween`, which is O(1) arithmetic. `rangeDayCount` is
 * `eachDay(...).length`, so asking IT whether a range is too wide allocated 3.3 million
 * Dates and 3.3 million formatted strings in order to reject them: 1,917 ms, against
 * 0 ms for the same answer.
 */
export const MAX_RANGE_DAYS = 366 * 20

/**
 * WHY a range was refused, or `null` when it is fine.
 *
 * `clampRange` reverting in silence was its own defect: setting the end before the
 * start, or asking for a span past the ceiling, put the previous range back in the
 * field with nothing said, so the screen looked like it had ignored the keystroke.
 * A refusal the person cannot see is indistinguishable from a bug.
 *
 * The reason and the refusal are ONE function on purpose: computing "is it allowed" in
 * `clampRange` and "what do we tell them" beside it would be two copies of the rule,
 * and `clampRange` is a one-line delegation to this so they cannot drift.
 *
 * That also means a test comparing the two proves nothing, and the first one written
 * here did exactly that — it passed unchanged with the inverted-range check broken on
 * purpose. `rangeRefusalIsCheckedAgainstAHandWrittenTable` in the reports tests
 * replaced it and checks each verdict against a reason written out by hand.
 */
/**
 * The window the date inputs declare, and the one the rule enforces — ONE PAIR.
 *
 * The fields carried `min="1970-01-01" max="2099-12-31"` and nothing checked them, so
 * the ‹ › arrows shifted the range straight past both: a few presses and the field was
 * showing 1969 while declaring 1970 its minimum. `min`/`max` are validation flags, not
 * clamps — they never stop a value set in code. Exported so the inputs read the same
 * two strings the refusal below tests, because a second copy is how they drifted.
 */
export const RANGE_MIN = "1970-01-01"
export const RANGE_MAX = "2099-12-31"

export function rangeRefusal(candidate: unknown): string | null {
  if (typeof candidate !== "object" || candidate === null) return "That date range could not be read"
  const { start, end } = candidate as { start?: unknown; end?: unknown }
  if (!isDateKey(start) || !isDateKey(end)) return "A report needs both a start date and an end date"
  // `daysBetween`, not `rangeDayCount`: the second one builds the days it counts
  const span = daysBetween(start, end) + 1
  if (span <= 0) return "The end of the range is before its start"
  if (span > MAX_RANGE_DAYS) return `A report covers at most ${Math.floor(MAX_RANGE_DAYS / 366)} years`
  if (start < RANGE_MIN || end > RANGE_MAX) {
    return `Reports cover ${RANGE_MIN.slice(0, 4)} to ${RANGE_MAX.slice(0, 4)}`
  }
  return null
}

export function clampRange(candidate: unknown, fallback: DateRange): DateRange {
  if (rangeRefusal(candidate) !== null) return fallback
  const { start, end } = candidate as { start: IsoDate; end: IsoDate }
  return { start, end }
}

/** A YYYY-MM-DD that `new Date` can actually read. */
function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime())
}

/**
 * A shared report link, LAID OVER A COMPLETE CONFIG — FIELD BY FIELD, AND TYPED.
 *
 * Three versions of this, each one short of the last, and the shape of the mistake
 * never changed: the fix matched the crash in front of it rather than the property.
 *
 *   1. it cast whatever `JSON.parse` returned to a `ReportConfig`, so `?report=e30` —
 *      `btoa("{}")` — reached the builders;
 *   2. it then checked `filters.range`, because that was the crash being looked at.
 *      Seven other members of `ReportFilters` went unchecked and a link carrying only
 *      a range still threw on `filters.description.trim()`;
 *   3. it then spread the link over a complete default, and the comment here claimed
 *      "a merge cannot have that failure for any input". It can: JSON carries `null`,
 *      and `{...fallback, ...shared}` lets `null` win. Eight one-field links —
 *      `{"filters":{"description":null}}`, `{"rounding":null}`, `{"sort":null}`,
 *      `{"filters":{"tagIds":"abc"}}` among them — reproduced the whole crash. Unknown
 *      keys survived too, were persisted by Save, and came back in every later link.
 *
 * The cost each time was not a blank report. `ReportsView` builds all four reports in a
 * `useMemo` during render and the `ErrorBoundary` wraps the whole of `<main>`, so the
 * timer, the entry list and every other screen become "Something went wrong with this
 * screen". `?report=` is never stripped, so a reload crashes again, and getting out
 * means navigating away and THEN pressing Try again, in that order, while the timer
 * keeps running invisibly.
 *
 * So every field is taken individually and only if it is the right shape, and nothing
 * else comes through. The test for this is derived from `Object.keys` of the default
 * rather than written out, because a hand-written list of fields is what was one short
 * three times.
 */
function takeString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function takeIds(value: unknown, fallback: Id[]): Id[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string") ? (value as Id[]) : fallback
}

function takeOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

function takeOneOfOrNull<T extends string>(value: unknown, allowed: readonly T[], fallback: T | null): T | null {
  if (value === null) return null
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

const DIMENSIONS: readonly GroupingDimension[] = GROUPING_DIMENSIONS.map((d) => d.id)

export function decodeReportConfig(encoded: string, fallback: ReportConfig): ReportConfig | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeURIComponent(escape(atob(encoded))))
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null

  const shared = parsed as Record<string, unknown>
  const sharedFilters = (typeof shared.filters === "object" && shared.filters !== null ? shared.filters : {}) as Record<
    string,
    unknown
  >
  const sharedRange = (typeof sharedFilters.range === "object" && sharedFilters.range !== null
    ? sharedFilters.range
    : {}) as Record<string, unknown>
  const sharedSort = (typeof shared.sort === "object" && shared.sort !== null ? shared.sort : {}) as Record<
    string,
    unknown
  >
  const sharedRounding = (typeof shared.rounding === "object" && shared.rounding !== null
    ? shared.rounding
    : {}) as Record<string, unknown>

  // one owner for the rule — see `clampRange`
  const range = clampRange(sharedRange, fallback.filters.range)

  return {
    tab: takeOneOf(shared.tab, ["summary", "detailed", "workload", "profitability", "saved"] as const, fallback.tab),
    filters: {
      range,
      clientIds: takeIds(sharedFilters.clientIds, fallback.filters.clientIds),
      projectIds: takeIds(sharedFilters.projectIds, fallback.filters.projectIds),
      taskIds: takeIds(sharedFilters.taskIds, fallback.filters.taskIds),
      tagIds: takeIds(sharedFilters.tagIds, fallback.filters.tagIds),
      memberIds: takeIds(sharedFilters.memberIds, fallback.filters.memberIds),
      billable: takeOneOf(sharedFilters.billable, ["all", "yes", "no"] as const, fallback.filters.billable),
      description: takeString(sharedFilters.description, fallback.filters.description),
    },
    grouping: takeOneOf(shared.grouping, DIMENSIONS, fallback.grouping),
    subGrouping: takeOneOfOrNull(shared.subGrouping, DIMENSIONS, fallback.subGrouping),
    rounding: {
      enabled: typeof sharedRounding.enabled === "boolean" ? sharedRounding.enabled : fallback.rounding.enabled,
      mode: takeOneOf(sharedRounding.mode, ["nearest", "up", "down"] as const, fallback.rounding.mode),
      // a negative or absurd interval would divide the clock into nothing
      minutes:
        typeof sharedRounding.minutes === "number" && Number.isFinite(sharedRounding.minutes) && sharedRounding.minutes > 0
          ? Math.min(Math.round(sharedRounding.minutes), 24 * 60)
          : fallback.rounding.minutes,
    },
    summaryMetrics: (() => {
      const allowed: readonly SummaryMetric[] = SUMMARY_METRICS.map((m) => m.id)
      if (!Array.isArray(shared.summaryMetrics)) return fallback.summaryMetrics
      const kept = shared.summaryMetrics.filter((m): m is SummaryMetric => allowed.includes(m as SummaryMetric))
      return kept.length > 0 ? kept : fallback.summaryMetrics
    })(),
    chartMetric: takeOneOf(shared.chartMetric, ["time", "billable_pct", "revenue", "cost", "profit"] as const, fallback.chartMetric),
    chartInterval: takeOneOf(shared.chartInterval, ["day", "week", "month"] as const, fallback.chartInterval),
    chartStackBy: takeOneOfOrNull(shared.chartStackBy, DIMENSIONS, fallback.chartStackBy),
    pieGroupBy: takeOneOf(shared.pieGroupBy, DIMENSIONS, fallback.pieGroupBy),
    workloadValueMode: takeOneOf(shared.workloadValueMode, ["duration", "earnings"] as const, fallback.workloadValueMode),
    sort: {
      column: takeString(sharedSort.column, fallback.sort.column),
      direction: takeOneOf(sharedSort.direction, ["asc", "desc"] as const, fallback.sort.direction),
    },
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
