/**
 * Time-tracking slice — reporting engine.
 *
 * Mirrors Toggl's four report tabs (Summary, Detailed, Workload, Profitability),
 * its grouping/sub-grouping model, rounding, and CSV export. Rounding is applied
 * per time entry before aggregation, which is what Toggl's report rounding does.
 */

import { GROUPING_DIMENSIONS, NO_PROJECT_COLOR, PROJECT_COLORS, SUMMARY_METRICS } from "./config"
import { csvCell } from "@/src/shared/csvCell"
import { joinTagNames } from "./csvCellService"
import { startsInOrder, stageAt } from "./plannedStageService"
import {
  addDays,
  startOfDayIso,
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
  entrySecondsInRange,
  entryDaysInRange,
  entryCost,
  entryRevenue,
  entryDaySeconds,
  isPlanned,
  isRunning,
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
  IsoDateTime,
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

/**
 * The preset a range is, when it is one: what the range button names it, as
 * Toggl Track's says "This week" rather than two dates (D-PC-REPORTS, Phase 6
 * of Plans/toggl-parity.md). The order is `DATE_PRESETS`'s, so a range that is
 * two presets at once (this week, early in a year) gets the shorter name.
 */
export function matchingPreset(range: DateRange, todayKey: IsoDate, weekStart: WeekStart): DatePreset | null {
  const presets: DatePreset[] = ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year"]
  for (const preset of presets) {
    const candidate = presetRange(preset, todayKey, weekStart)
    if (candidate.start === range.start && candidate.end === range.end) return preset
  }
  return null
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

export function applyFilters(state: TimetrackState, filters: ReportFilters, nowSec: number): TimeEntry[] {
  // `nowSec`, not the wall clock: a running entry's last day decides membership, and
  // reading real `now` here put a report's seconds and its membership on two clocks
  const inRange = entriesInRange(liveEntries(state), filters.range.start, filters.range.end, nowSec)
  const search = filters.description.trim().toLowerCase()

  return inRange.filter((entry) => {
    // a plan is not tracked time until it starts (Q2): no hours, and not one of the entries either
    if (isPlanned(entry, nowSec)) return false
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

/**
 * THE PROJECT FILTER'S CHOICES, TWO PROJECTS WITH ONE NAME TOLD APART.
 *
 * A "Website" for Client A and a "Website" for Client B were two identical lines in
 * Reports → Projects (heavy-user audit of 2026-11-04, D11). Where a name is shared
 * (ignoring case), the line carries its client, as the Timer's pickers already show it;
 * a name nobody else has stays as it is.
 */
export function projectFilterItems(state: TimetrackState): { id: Id; label: string; color: string }[] {
  const uses = new Map<string, number>()
  for (const p of state.projects) uses.set(p.name.trim().toLowerCase(), (uses.get(p.name.trim().toLowerCase()) ?? 0) + 1)
  return state.projects.map((p) => {
    const shared = (uses.get(p.name.trim().toLowerCase()) ?? 0) > 1
    const client = shared ? (clientById(state, p.clientId)?.name ?? "No client") : null
    return { id: p.id, label: client === null ? p.name : `${p.name} · ${client}`, color: p.color }
  })
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
  /**
   * ROUNDED ONCE, FOR THE WHOLE ENTRY. The first version rounded each DAY's share and
   * added them up, which rounds a cross-midnight entry twice: with "round up to 15
   * minutes", a shift from 23:55 to 00:05 — ten minutes of work — billed THIRTY, two
   * quarter-hours instead of one. This file's own header says Toggl rounds per time
   * entry before aggregation, and that is the rule the rest of the slice follows.
   *
   * O(1) as well; see `entrySecondsInRange`.
   */
  return roundSeconds(
    entrySecondsInRange(entry, config.filters.range.start, config.filters.range.end, nowSec),
    config.rounding,
  )
}

/**
 * A DATE GROUPING IS ORDERED BY DATE. Anything else is ordered by size.
 *
 * Grouping by date and sorting by profit produced `2026-09-28, 2026-09-30, 2026-09-29,
 * 2026-10-01` — a time series shuffled by magnitude, on both the Summary and
 * Profitability tabs. Dates have an order of their own and a reader assumes it.
 *
 * `dimensionValues` builds a `date:` key from `dateKey`, so the key sorts correctly as
 * a string.
 */
function orderRows<T extends { key: string }>(rows: T[], dimension: GroupingDimension, bySize: (a: T, b: T) => number): T[] {
  if (dimension === "date") return [...rows].sort((a, b) => a.key.localeCompare(b.key))
  return [...rows].sort(bySize)
}

/**
 * EVERY BUILDER IS THREE STEPS: AN EMPTY TALLY, ENTRIES ADDED TO IT, AND THE REPORT
 * READ OFF IT — so a running timer costs one entry a second, not the whole history.
 *
 * `ReportsView` rebuilt all four reports from every entry in the range once a second
 * while a timer ran: 68 ms a tick at 1,800 entries on "This year", 264 ms at 7,000
 * (heavy-user audit of 2026-11-04, D6). Only an entry without an end changes with the
 * clock. So `liveReport` tallies the finished entries once, and each second copies that
 * tally, adds the running entry at the current second, and reads the report off the
 * copy. `buildSummary` and the other three are the same steps done in one go, which is
 * what keeps the two from ever disagreeing about anything but summation order.
 */
interface SummaryBucketAcc {
  seconds: number
  billableSeconds: number
  revenue: number
  cost: number
  segments: Map<string, DimensionValue & { value: number }>
}

interface SummaryAcc {
  groups: Map<string, Accumulator>
  buckets: Map<string, SummaryBucketAcc>
  pie: Map<string, DimensionValue & { seconds: number }>
  totalSeconds: number
  totalBillable: number
  totalRevenue: number
  totalCost: number
  activeDays: Set<IsoDate>
  countedEntries: number
  /** every project an entry in the report points at, for the fixed fees */
  projectsInReport: Set<Id>
}

function newSummaryAcc(state: TimetrackState, config: ReportConfig): SummaryAcc {
  const buckets = new Map<string, SummaryBucketAcc>()
  // Pre-create every bucket in range so charts show empty days too
  for (const day of eachDay(config.filters.range.start, config.filters.range.end)) {
    const key = bucketKeyFor(day, config.chartInterval, state.user.weekStart)
    if (!buckets.has(key)) {
      buckets.set(key, { seconds: 0, billableSeconds: 0, revenue: 0, cost: 0, segments: new Map() })
    }
  }
  return {
    groups: new Map(),
    buckets,
    pie: new Map(),
    totalSeconds: 0,
    totalBillable: 0,
    totalRevenue: 0,
    totalCost: 0,
    activeDays: new Set(),
    countedEntries: 0,
    projectsInReport: new Set(),
  }
}

function copyAccumulator(acc: Accumulator): Accumulator {
  return { ...acc, children: new Map([...acc.children].map(([key, child]) => [key, copyAccumulator(child)])) }
}

function copySummaryAcc(acc: SummaryAcc): SummaryAcc {
  return {
    ...acc,
    groups: new Map([...acc.groups].map(([key, group]) => [key, copyAccumulator(group)])),
    buckets: new Map([...acc.buckets].map(([key, bucket]) => [key, { ...bucket, segments: new Map(bucket.segments) }])),
    pie: new Map(acc.pie),
    activeDays: new Set(acc.activeDays),
    projectsInReport: new Set(acc.projectsInReport),
  }
}

export function buildSummary(state: TimetrackState, config: ReportConfig, nowSec: number): SummaryReport {
  const acc = newSummaryAcc(state, config)
  addToSummary(acc, state, config, applyFilters(state, config.filters, nowSec), nowSec)
  return finishSummary(acc, state, config)
}

function addToSummary(acc: SummaryAcc, state: TimetrackState, config: ReportConfig, entries: TimeEntry[], nowSec: number): void {
  const { groups, buckets, pie, activeDays } = acc
  const interval = config.chartInterval

  for (const entry of entries) {
    // every selected entry's project counts for the fees, whether or not it adds seconds
    if (entry.projectId !== null) acc.projectsInReport.add(entry.projectId)
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
     * TWO THINGS THIS GOT WRONG FIRST TIME, both found by a reviewer:
     *
     * It walked every day of the RANGE per entry, so "This year" with 300 entries took
     * 1508 ms against 5 ms before, rebuilt every second while a timer runs. It walks
     * only the days the entry touches now — one for almost every entry, two for a night
     * shift — via `entryDaysInRange`.
     *
     * And it rounded each day's share, which rounds a cross-midnight entry twice: ten
     * minutes across midnight billed thirty at quarter-hour round-up. The entry is
     * rounded ONCE, as this file's header says Toggl does, and the rounded total is then
     * split across its days in proportion to the real seconds — so the chart buckets
     * still sum to the total exactly, which is the property the per-day version was for.
     * The last day takes the remainder so no second is lost to integer division.
     */
    const days = entryDaysInRange(entry, config.filters.range.start, config.filters.range.end, nowSec)
    const rawPerDay = days.map((day) => ({ day, raw: entryDaySeconds(entry, day, nowSec) }))
    const rawTotal = rawPerDay.reduce((sum, d) => sum + d.raw, 0)
    const seconds = roundSeconds(rawTotal, config.rounding)
    if (seconds === 0 || rawTotal === 0) continue

    let allocated = 0
    const perDay = rawPerDay.map((d, index) => {
      const share = index === rawPerDay.length - 1 ? seconds - allocated : Math.round((d.raw / rawTotal) * seconds)
      allocated += share
      return { day: d.day, seconds: share }
    }).filter((d) => d.seconds > 0)
    const revenue = entryRevenue(state, entry, seconds)
    const cost = entryCost(state, entry, seconds)

    acc.countedEntries += 1
    acc.totalSeconds += seconds
    if (entry.billable) acc.totalBillable += seconds
    acc.totalRevenue += revenue
    acc.totalCost += cost
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
}

function finishSummary(acc: SummaryAcc, state: TimetrackState, config: ReportConfig): SummaryReport {
  const { groups, buckets, pie, activeDays, projectsInReport } = acc
  const interval = config.chartInterval

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
   * the same rule the rest of this function already follows. (`addToSummary` collects
   * them, from every selected entry.)
   */
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
      // in one fixed order, not the order entries arrived in: a running timer is added
      // last (`liveReport`), and its band must not jump to the other end when it stops
      segments: [...value.segments.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((s) => ({ key: s.key, label: s.label, color: s.color, value: s.value })),
    }))

  return {
    rows: orderRows([...groups.values()].map(toRow), config.grouping, (a, b) => b.seconds - a.seconds),
    buckets: bucketRows,
    pie: [...pie.values()]
      .map((p) => ({ key: p.key, label: p.label, color: p.color, seconds: p.seconds }))
      .sort((a, b) => b.seconds - a.seconds),
    totals: {
      seconds: acc.totalSeconds,
      billableSeconds: acc.totalBillable,
      revenue: acc.totalRevenue,
      cost: acc.totalCost,
      fixedFee,
      activeDays: activeDays.size,
      /**
       * The entries that CONTRIBUTED, not the ones selected. `entries.length` counted
       * every entry the overlap filter returned, including one whose hours all fall
       * outside the range — so the tab read "0:00 · 1 entry · 0 active days" over an
       * empty grouping table, and its CSV was a header with no rows. Detailed lists the
       * same entries this counts.
       */
      entryCount: acc.countedEntries,
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

/** An instant pulled back inside the report's own window, so a row's times match its duration. */
function clipToRange(iso: IsoDateTime, rangeStart: number, rangeEnd: number): IsoDateTime {
  const at = epochSeconds(iso)
  if (at >= rangeStart && at <= rangeEnd) return iso
  return new Date(Math.min(Math.max(at, rangeStart), rangeEnd) * 1000).toISOString()
}

export function buildDetailed(state: TimetrackState, config: ReportConfig, nowSec: number): DetailedRow[] {
  return detailedRows(state, config, applyFilters(state, config.filters, nowSec), nowSec).sort(detailedOrder(config))
}

function detailedRows(state: TimetrackState, config: ReportConfig, entries: TimeEntry[], nowSec: number): DetailedRow[] {
  /**
   * A ROW SHOWS THE SAME PERIOD ITS DURATION MEASURES.
   *
   * Two things were wrong once the duration became "the seconds inside the range":
   *
   *   1. an entry with ZERO seconds in the range was still listed. A shift ending
   *      exactly at the range's first midnight exported as
   *      `…23:00, …00:00, 0:00:00, 0.00` — an hour of work shown as nothing, on a row
   *      that should not exist. `buildSummary` had the mirror of it: `entryCount` came
   *      from `entries.length`, so the Summary tab read "0:00 · 1 entry · 0 active
   *      days" over an empty table while Detailed listed the row.
   *   2. the row carried the entry's REAL start and stop beside the CLIPPED duration,
   *      so Start and Stop described eight hours while Duration said seven. And
   *      `importEntriesCsv` prefers the Stop column over Duration, so exporting the
   *      detailed CSV and importing it back restored the unclipped figure — a round
   *      trip through the app's own format that did not preserve its own numbers.
   *
   * So the times are clipped to the range too. A report for a range reports that
   * range, and Start, Stop and Duration now describe the same interval.
   */
  const rangeStart = epochSeconds(startOfDayIso(config.filters.range.start))
  const rangeEnd = epochSeconds(startOfDayIso(addDays(config.filters.range.end, 1)))

  return entries
    .filter((entry) => entrySecondsInRange(entry, config.filters.range.start, config.filters.range.end, nowSec) > 0)
    .map((entry) => {
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
      start: clipToRange(entry.start, rangeStart, rangeEnd),
      stop: entry.stop === null ? null : clipToRange(entry.stop, rangeStart, rangeEnd),
      seconds,
      amount: entryRevenue(state, entry, seconds),
    }
  })
}

/** The Detailed tab's order. `Array.prototype.sort` is stable, so ties keep the entries' own order. */
function detailedOrder(config: ReportConfig): (a: DetailedRow, b: DetailedRow) => number {
  const { column, direction } = config.sort
  const factor = direction === "asc" ? 1 : -1
  return (a, b) => {
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
  }
}

// ---------------------------------------------------------------------------
// Workload report (Toggl's renamed Weekly report)
// ---------------------------------------------------------------------------

interface WorkloadAcc {
  days: IsoDate[]
  dayIndex: Map<IsoDate, number>
  rows: Map<string, { key: string; label: string; color: string | null; values: number[] }>
  dayTotals: number[]
}

function newWorkloadAcc(config: ReportConfig): WorkloadAcc {
  const days = eachDay(config.filters.range.start, config.filters.range.end)
  return { days, dayIndex: new Map(days.map((d, i) => [d, i])), rows: new Map(), dayTotals: days.map(() => 0) }
}

function copyWorkloadAcc(acc: WorkloadAcc): WorkloadAcc {
  return {
    ...acc,
    rows: new Map([...acc.rows].map(([key, row]) => [key, { ...row, values: [...row.values] }])),
    dayTotals: [...acc.dayTotals],
  }
}

export function buildWorkload(state: TimetrackState, config: ReportConfig, nowSec: number): WorkloadReport {
  const acc = newWorkloadAcc(config)
  addToWorkload(acc, state, config, applyFilters(state, config.filters, nowSec), nowSec)
  return finishWorkload(acc, config)
}

function addToWorkload(acc: WorkloadAcc, state: TimetrackState, config: ReportConfig, entries: TimeEntry[], nowSec: number): void {
  const { days, dayIndex, rows, dayTotals } = acc

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
    /**
     * Only the days this entry touches — walking all of `days` per entry is what made
     * the four builders O(entries x days); see `entrySecondsInRange`. And the day's
     * share comes out of the ONCE-rounded `seconds` rather than being rounded again,
     * for the reason `secondsInRange` gives: rounding per day bills a cross-midnight
     * entry twice.
     */
    const touched = entryDaysInRange(entry, config.filters.range.start, config.filters.range.end, nowSec)
    const rawTotal = touched.reduce((sum, day) => sum + entryDaySeconds(entry, day, nowSec), 0)
    if (rawTotal === 0) continue
    let allocatedSeconds = 0
    for (const [position, day] of touched.entries()) {
      const daySeconds =
        position === touched.length - 1
          ? seconds - allocatedSeconds
          : Math.round((entryDaySeconds(entry, day, nowSec) / rawTotal) * seconds)
      allocatedSeconds += daySeconds
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
}

function finishWorkload(acc: WorkloadAcc, config: ReportConfig): WorkloadReport {
  const { days, rows, dayTotals } = acc
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

type ProfitabilityAcc = Map<string, ProfitabilityRow & { projectIds: Set<Id> }>

function copyProfitabilityAcc(acc: ProfitabilityAcc): ProfitabilityAcc {
  return new Map([...acc].map(([key, row]) => [key, { ...row, projectIds: new Set(row.projectIds) }]))
}

export function buildProfitability(state: TimetrackState, config: ReportConfig, nowSec: number): ProfitabilityReport {
  const acc: ProfitabilityAcc = new Map()
  addToProfitability(acc, state, config, applyFilters(state, config.filters, nowSec), nowSec)
  return finishProfitability(acc, state, config)
}

function addToProfitability(rows: ProfitabilityAcc, state: TimetrackState, config: ReportConfig, entries: TimeEntry[], nowSec: number): void {
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
          margin: null,
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
}

function finishProfitability(rows: ProfitabilityAcc, state: TimetrackState, config: ReportConfig): ProfitabilityReport {
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
        // null, not 0: there is no margin to take of no income, and `0%` reads as break-even
        margin: income > 0 ? profit / income : null,
      }
    })
    .sort((a, b) => (config.grouping === "date" ? a.key.localeCompare(b.key) : b.profit - a.profit))

  return { rows: out, fixedFee: reportFee, feeIsPerRow }
}

// ---------------------------------------------------------------------------
// A report that follows a running timer
// ---------------------------------------------------------------------------

export interface ReportOf {
  summary: SummaryReport
  detailed: DetailedRow[]
  workload: WorkloadReport
  profitability: ProfitabilityReport
}
export type ReportKind = keyof ReportOf

/**
 * ONE REPORT, ITS FINISHED ENTRIES TALLIED ONCE: CALL IT WITH THE SECOND TO READ IT AT.
 *
 * The result equals `buildSummary` (or the other three) for the same state, config and
 * second, with two differences nobody can see: a money sum may differ in its last binary
 * digit, being added in another order, and two rows with EXACTLY the same total may
 * stand the other way round for that second, because the running entry is added last
 * rather than where it sits in the list. A call costs the running entry and the
 * report's own rows, not the history.
 *
 * Two things depend on the clock: a running entry's seconds (and whether it reaches the
 * range at all), and whether a planned entry's start has passed — a plan is in no
 * report until it starts (`isPlanned`). So the finished entries are tallied once per
 * STAGE (`plannedStageService`): on the first call, and again only on the second a
 * planned entry starts. Every other call copies that tally and adds the running entry.
 *
 * Detailed has no tally to copy, only rows to order, so its finished rows are sorted
 * once a stage and a running row is placed among them where the full sort would put it
 * — ties broken by the entries' own order, as the stable sort breaks them.
 */
export function liveReport<K extends ReportKind>(kind: K, state: TimetrackState, config: ReportConfig): (nowSec: number) => ReportOf[K] {
  const ticking = state.entries.filter((e) => isRunning(e) && !e.serverDeletedAt)
  const finished: TimetrackState = ticking.length ? { ...state, entries: state.entries.filter((e) => !isRunning(e)) } : state
  const starts = startsInOrder(liveEntries(finished))
  const tickingAt = (nowSec: number) => applyFilters({ ...state, entries: ticking }, config.filters, nowSec)

  /**
   * The finished entries' part, for the stage `nowSec` is in: built at a second inside
   * the stage, which is every second's answer for the whole stage.
   */
  const perStage = <T,>(make: (nowSec: number, fixedEntries: TimeEntry[]) => T) => {
    let built: { stage: number; value: T } | null = null
    return (nowSec: number): T => {
      const stage = stageAt(starts, nowSec)
      if (built?.stage !== stage) built = { stage, value: make(nowSec, applyFilters(finished, config.filters, nowSec)) }
      return built.value
    }
  }

  const build = (): ((nowSec: number) => ReportOf[ReportKind]) => {
    switch (kind) {
      case "summary": {
        const base = perStage((nowSec, fixedEntries) => {
          const acc = newSummaryAcc(state, config)
          addToSummary(acc, state, config, fixedEntries, nowSec)
          return { acc, done: ticking.length ? null : finishSummary(acc, state, config) }
        })
        return (nowSec) => {
          const { acc: fixed, done } = base(nowSec)
          if (done) return done
          const acc = copySummaryAcc(fixed)
          addToSummary(acc, state, config, tickingAt(nowSec), nowSec)
          return finishSummary(acc, state, config)
        }
      }
      case "workload": {
        const base = perStage((nowSec, fixedEntries) => {
          const acc = newWorkloadAcc(config)
          addToWorkload(acc, state, config, fixedEntries, nowSec)
          return { acc, done: ticking.length ? null : finishWorkload(acc, config) }
        })
        return (nowSec) => {
          const { acc: fixed, done } = base(nowSec)
          if (done) return done
          const acc = copyWorkloadAcc(fixed)
          addToWorkload(acc, state, config, tickingAt(nowSec), nowSec)
          return finishWorkload(acc, config)
        }
      }
      case "profitability": {
        const base = perStage((nowSec, fixedEntries) => {
          const acc: ProfitabilityAcc = new Map()
          addToProfitability(acc, state, config, fixedEntries, nowSec)
          return { acc, done: ticking.length ? null : finishProfitability(acc, state, config) }
        })
        return (nowSec) => {
          const { acc: fixed, done } = base(nowSec)
          if (done) return done
          const acc = copyProfitabilityAcc(fixed)
          addToProfitability(acc, state, config, tickingAt(nowSec), nowSec)
          return finishProfitability(acc, state, config)
        }
      }
      default: {
        const order = detailedOrder(config)
        const position = new Map(state.entries.map((e, i) => [e.id, i]))
        const before = (a: DetailedRow, b: DetailedRow) => order(a, b) || (position.get(a.entryId) ?? 0) - (position.get(b.entryId) ?? 0)
        const base = perStage((nowSec, fixedEntries) => detailedRows(state, config, fixedEntries, nowSec).sort(before))
        return (nowSec) => {
          const sorted = base(nowSec)
          if (!ticking.length) return sorted
          const rows = [...sorted]
          for (const row of detailedRows(state, config, tickingAt(nowSec), nowSec)) {
            let low = 0
            let high = rows.length
            while (low < high) {
              const mid = (low + high) >> 1
              if (before(rows[mid], row) <= 0) low = mid + 1
              else high = mid
            }
            rows.splice(low, 0, row)
          }
          return rows
        }
      }
    }
  }
  return build() as (nowSec: number) => ReportOf[K]
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

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
      // a comma inside a tag's name is escaped, so the import reads it as one tag
      joinTagNames(row.tagNames),
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
      row.margin === null ? "—" : `${(row.margin * 100).toFixed(1)}%`,
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

/**
 * A REPORT ON "THIS WEEK" STAYS ON THIS WEEK WHEN THE WEEK START CHANGES.
 *
 * The range is two dates, made once when the tracker opens — before the account's
 * settings have arrived — so a person whose week starts on Sunday saw Reports' "this
 * week" run Monday to Sunday while the Timer beside it counted Sunday to Saturday
 * (heavy-user audit of 2026-11-04, D7). A range that is exactly this week or last week
 * under the old start moves to the new one; any other range was picked by hand and is
 * returned untouched, the same object.
 */
export function followWeekStart(config: ReportConfig, todayKey: IsoDate, from: WeekStart, to: WeekStart): ReportConfig {
  if (from === to) return config
  const { start, end } = config.filters.range
  for (const preset of ["this_week", "last_week"] as const) {
    const old = presetRange(preset, todayKey, from)
    if (old.start === start && old.end === end) {
      return { ...config, filters: { ...config.filters, range: presetRange(preset, todayKey, to) } }
    }
  }
  return config
}

/**
 * A NEW REPORT'S ROUNDING IS THE WORKSPACE'S DEFAULT, EVEN WHEN THAT ARRIVES LATE.
 *
 * The same shape as `followWeekStart`, for "Default report rounding": the report is
 * made when the tracker opens, and on a browser with no copy of its own — after Log
 * Out, or a new phone — that is the empty workspace's rounding, off. The account's
 * arrived a moment later and the report never heard of it, so the first open after
 * signing in added up raw minutes (account-switching audit, Phase 8). A report still
 * on the old default moves to the new one; a rounding chosen in the report is the
 * person's and is returned untouched, the same object.
 */
export function followRounding(config: ReportConfig, from: RoundingConfig, to: RoundingConfig): ReportConfig {
  const same = (a: RoundingConfig, b: RoundingConfig) => a.enabled === b.enabled && a.mode === b.mode && a.minutes === b.minutes
  if (same(from, to) || !same(config.rounding, from)) return config
  return { ...config, rounding: { ...to } }
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
