"use client"

/**
 * Reports — Toggl's five tabs (Summary, Detailed, Workload, Profitability,
 * My reports) with the same filter bar, rounding control, grouping/sub-grouping,
 * summary-bar metric picker, bar + pie charts, exports and saved/shared reports.
 */

import { useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { newId } from "../idService"
import {
  CHART_METRICS,
  DATE_PRESETS,
  GROUPING_DIMENSIONS,
  MAX_SUMMARY_METRICS,
  ROUNDING_MINUTES,
  ROUNDING_MODES,
  SUMMARY_METRICS,
} from "../config"
import {
  IconExport,
  IconFilter,
  IconLink,
  IconDelete,
  IconSort,
  IconDown,
  IconNext,
  IconPrev,
} from "../icons"
import { useAddField } from "../hooks/useAddField"
import { downloadFile } from "../importExportService"
import {
  activeFilterCount,
  buildDetailed,
  buildProfitability,
  clampRange,
  rangeRefusal,
  RANGE_MAX,
  RANGE_MIN,
  profitabilityToCsv,
  buildSummary,
  buildWorkload,
  detailedToCsv,
  encodeReportConfig,
  metricValue,
  presetLabel,
  presetRange,
  summaryToCsv,
  workloadToCsv,
  type DatePreset,
} from "../reportsService"
import {
  addDays,
  dateKey,
  formatCompact,
  formatDate,
  formatRangeShort,
  formatDayShort,
  formatDuration,
  formatMoney,
  formatTimeOfDay,
  plural,
} from "../timetrackFormatService"
import { useStagedEdit } from "../hooks/useStagedEdit"
import type {
  GroupingDimension,
  Id,
  IsoDate,
  ReportConfig,
  ReportTab,
  SummaryReport,
  SummaryRow,
  TimetrackState,
} from "../types"
import { MiniSelect } from "./pickers"
import { CheckOption, ColorDot, DonutChart, Dropdown, EmptyState, Modal, ProgressBar, SectionCard, StackedBarChart, StatTile } from "./primitives"

const TABS: { id: ReportTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "detailed", label: "Detailed" },
  { id: "workload", label: "Workload" },
  { id: "profitability", label: "Profitability" },
  { id: "saved", label: "My reports" },
]

export function ReportsView({
  state,
  setState,
  nowSec,
  config,
  setConfig,
  pushToast,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  config: ReportConfig
  setConfig: (config: ReportConfig) => void
  pushToast: (text: string, tone?: "info" | "error") => void
}) {
  const currency = state.workspace.defaultCurrency
  const todayKey = dateKey(new Date(nowSec * 1000))

  const summary = useMemo(() => buildSummary(state, config, nowSec), [state, config, nowSec])
  const detailed = useMemo(() => buildDetailed(state, config, nowSec), [state, config, nowSec])
  const workload = useMemo(() => buildWorkload(state, config, nowSec), [state, config, nowSec])
  const profitability = useMemo(() => buildProfitability(state, config, nowSec), [state, config, nowSec])

  const update = (patch: Partial<ReportConfig>) => setConfig({ ...config, ...patch })

  /**
   * EVERY WRITER OF THE RANGE GOES THROUGH THE SAME RULE.
   *
   * The ceiling used to live only in the share-link decoder, which is the one door
   * nobody walks through. A date field emits every PREFIX of a year as it is typed —
   * `2 0 2 5` fires four changes ending `0002`, `0020`, `0202`, `2025` — and `0202` is
   * a 666,480-day range that the four render-time builders take about 1.8 seconds to
   * produce. So typing a year here froze the tab, every time, and `min`/`max` on the
   * input do not stop it: they are validation flags, not clamps.
   *
   * `clampRange` owns it now, and it is applied where the range is WRITTEN rather than
   * at each input, so the ‹ › arrows and anything added later are covered by the same
   * line.
   */
  const updateFilters = (patch: Partial<ReportConfig["filters"]>) => {
    const filters = { ...config.filters, ...patch }
    /**
     * A REFUSED RANGE SAYS WHY.
     *
     * The clamp put the previous range back and said nothing, so setting an end before
     * the start, or a span past the ceiling, looked exactly like the app ignoring the
     * keystroke — and the field then re-rendered the old value, which reads as a bug.
     * `rangeRefusal` owns the reason; this only shows it.
     */
    const refusal = rangeRefusal(filters.range)
    if (refusal !== null && patch.range !== undefined) pushToast(refusal, "error")
    setConfig({ ...config, filters: { ...filters, range: clampRange(filters.range, config.filters.range) } })
  }

  const exportCurrent = (kind: "csv" | "json" | "print") => {
    const stamp = `${config.filters.range.start}_${config.filters.range.end}`
    if (kind === "print") {
      window.print()
      return
    }
    if (kind === "json") {
      const payload = { config, summary, detailed, workload, profitability }
      downloadFile(`report-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json")
      return
    }
    /**
     * EVERY TAB EXPORTS ITSELF.
     *
     * `profitability` used to fall into the `else` and download the SUMMARY — a
     * duration and revenue header with none of Fixed fee, Profit or Margin, the four
     * columns that tab exists for — while the toast said "Report exported".
     *
     * The first cell also carried the raw dimension id (`date`, `desc`, `billable`)
     * because `config.grouping` was passed where a label belongs.
     */
    const groupingLabel = GROUPING_DIMENSIONS.find((d) => d.id === config.grouping)?.label ?? config.grouping
    if (config.tab === "detailed") downloadFile(`detailed-${stamp}.csv`, detailedToCsv(detailed, currency), "text/csv")
    else if (config.tab === "workload") downloadFile(`workload-${stamp}.csv`, workloadToCsv(workload), "text/csv")
    else if (config.tab === "profitability")
      downloadFile(`profitability-${stamp}.csv`, profitabilityToCsv(profitability, groupingLabel, currency), "text/csv")
    else downloadFile(`summary-${stamp}.csv`, summaryToCsv(summary, groupingLabel), "text/csv")
    pushToast("Report exported")
  }

  return (
    <div className="space-y-4">
      {/* tabs */}
      <div className="-mx-3 flex items-center gap-1 overflow-x-auto border-b border-border px-3 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => update({ tab: tab.id })}
            className={cn(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium sm:py-2",
              config.tab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {config.tab !== "saved" && (
        <FilterBar
          state={state}
          config={config}
          todayKey={todayKey}
          onUpdate={update}
          onUpdateFilters={updateFilters}
          onExport={exportCurrent}
          onSave={(name) => {
            setState((current) => ({
              ...current,
              savedReports: [
                { id: newId(), name, config, at: new Date().toISOString() },
                ...current.savedReports,
              ],
            }))
            pushToast(`Saved report “${name}”`)
          }}
        />
      )}

      {config.tab === "summary" && <SummaryTab state={state} config={config} report={summary} onUpdate={update} currency={currency} />}
      {config.tab === "detailed" && <DetailedTab state={state} config={config} rows={detailed} onUpdate={update} currency={currency} />}
      {config.tab === "workload" && <WorkloadTab state={state} config={config} report={workload} onUpdate={update} currency={currency} />}
      {config.tab === "profitability" && <ProfitabilityTab state={state} report={profitability} config={config} onUpdate={update} currency={currency} />}
      {config.tab === "saved" && (
        <SavedTab
          state={state}
          setState={setState}
          onLoad={(loaded) => setConfig(loaded)}
          pushToast={pushToast}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function FilterBar({
  state,
  config,
  todayKey,
  onUpdate,
  onUpdateFilters,
  onExport,
  onSave,
}: {
  state: TimetrackState
  config: ReportConfig
  todayKey: string
  onUpdate: (patch: Partial<ReportConfig>) => void
  onUpdateFilters: (patch: Partial<ReportConfig["filters"]>) => void
  onExport: (kind: "csv" | "json" | "print") => void
  onSave: (name: string) => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { filters } = config
  const filterCount = activeFilterCount(filters)
  const spanDays = Math.max(1, Math.round((new Date(filters.range.end).getTime() - new Date(filters.range.start).getTime()) / 86_400_000) + 1)

  const shiftRange = (direction: number) => {
    onUpdateFilters({
      range: {
        start: addDays(filters.range.start, direction * spanDays),
        end: addDays(filters.range.end, direction * spanDays),
      },
    })
  }

  const controls = (
    <FilterControls
      state={state}
      config={config}
      todayKey={todayKey}
      filters={filters}
      filterCount={filterCount}
      onUpdate={onUpdate}
      onUpdateFilters={onUpdateFilters}
      onExport={onExport}
      onSave={onSave}
      shiftRange={shiftRange}
    />
  )

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
      {/* Phones get a date row plus one sheet holding every other control */}
      <div className="flex w-full items-center gap-1 sm:hidden">
        <Button variant="ghost" size="icon-sm" onClick={() => shiftRange(-1)} aria-label="Previous period">
          <IconPrev className="size-4" />
        </Button>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="min-h-11 min-w-0 flex-1 truncate rounded-md border border-border px-3 py-2 text-sm"
        >
          {formatRangeShort(filters.range.start, filters.range.end)}
        </button>
        <Button variant="ghost" size="icon-sm" onClick={() => shiftRange(1)} aria-label="Next period">
          <IconNext className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
          <IconFilter className="size-4" />
          {filterCount > 0 ? filterCount : "Filters"}
        </Button>
      </div>

      {sheetOpen && (
        <Modal title="Report settings" onClose={() => setSheetOpen(false)}>
          <div className="space-y-4">{controls}</div>
        </Modal>
      )}

      <div className="hidden w-full flex-wrap items-center gap-2 sm:flex">{controls}</div>
    </div>
  )
}

/** Shared by the desktop filter bar and the phone sheet */
function FilterControls({
  state,
  config,
  todayKey,
  filters,
  filterCount,
  onUpdate,
  onUpdateFilters,
  onExport,
  onSave,
  shiftRange,
}: {
  state: TimetrackState
  config: ReportConfig
  todayKey: string
  filters: ReportConfig["filters"]
  filterCount: number
  onUpdate: (patch: Partial<ReportConfig>) => void
  onUpdateFilters: (patch: Partial<ReportConfig["filters"]>) => void
  onExport: (kind: "csv" | "json" | "print") => void
  onSave: (name: string) => void
  shiftRange: (direction: number) => void
}) {
  const closeRef = useRef<() => void>(() => {})
  const saveField = useAddField((name) => {
    onSave(name)
    closeRef.current()
  })

  return (
    <>
      <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" onClick={() => shiftRange(-1)} aria-label="Previous period">
        <IconPrev className="size-4" />
      </Button>
      <Dropdown
        width="w-72"
        trigger={() => (
          <span className="flex h-8 items-center gap-2 rounded-md border border-border px-3 text-sm">
            {formatDate(filters.range.start, state.user.dateFormat)} – {formatDate(filters.range.end, state.user.dateFormat)}
            <IconDown className="size-3 text-muted-foreground" />
          </span>
        )}
      >
        {(close) => (
          <div className="space-y-2 p-3">
            <div className="grid grid-cols-2 gap-1">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    onUpdateFilters({ range: presetRange(preset as DatePreset, todayKey, state.user.weekStart) })
                    close()
                  }}
                >
                  {presetLabel(preset as DatePreset)}
                </Button>
              ))}
            </div>
            {/*
              A DRAFT THAT COMMITS ON BLUR, BECAUSE A DATE FIELD EMITS EVERY PREFIX.
              
              Typing `2 0 2 5` into the year fires four changes — `0002`, ``, `0002`,
              `0005` in this field's case — and committing each one meant the range
              ceiling rejected the prefixes, React rewrote `value`, and that write
              cleared Chromium's segment-typing buffer so every keystroke started over.
              The field became impossible to type a year into at all: the previous fix
              removed a 1.8-second freeze and replaced it with a dead control.
              
              `EntryList`'s detail sheet had already solved this one file away — hold the
              text locally, commit when the person leaves the field — and its own comment
              explains why there is deliberately no debounce: a `datetime-local` reads ""
              mid-typing, and a timer fired there would commit a half-typed value.
            */}
            <div className="flex items-center gap-2 border-t border-border pt-2">
              <RangeDateField
                label="Range start"
                value={filters.range.start}
                onCommit={(start) => onUpdateFilters({ range: { ...filters.range, start } })}
              />
              <RangeDateField
                label="Range end"
                value={filters.range.end}
                onCommit={(end) => onUpdateFilters({ range: { ...filters.range, end } })}
              />
            </div>
          </div>
        )}
      </Dropdown>
      {/* `hidden sm:inline-flex` to match its partner above: these two are the
          DESKTOP pair. On a phone both arrows live in the row outside the
          sheet, and this one, guarded by nobody, was rendering inside it as a
          lone unlabelled ">" under the date field. */}
      <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" onClick={() => shiftRange(1)} aria-label="Next period">
        <IconNext className="size-4" />
      </Button>

      {/* entity filters */}
      <FilterDropdown
        label="Clients"
        selected={filters.clientIds}
        items={state.clients.map((c) => ({ id: c.id, label: c.name }))}
        onChange={(clientIds) => onUpdateFilters({ clientIds })}
      />
      <FilterDropdown
        label="Projects"
        selected={filters.projectIds}
        items={state.projects.map((p) => ({ id: p.id, label: p.name, color: p.color }))}
        onChange={(projectIds) => onUpdateFilters({ projectIds })}
      />
      <FilterDropdown
        label="Tasks"
        selected={filters.taskIds}
        items={state.tasks.map((t) => ({ id: t.id, label: t.name }))}
        onChange={(taskIds) => onUpdateFilters({ taskIds })}
      />
      <FilterDropdown
        label="Tags"
        selected={filters.tagIds}
        items={state.tags.map((t) => ({ id: t.id, label: t.name }))}
        onChange={(tagIds) => onUpdateFilters({ tagIds })}
      />
      <FilterDropdown
        label="Members"
        selected={filters.memberIds}
        items={state.members.map((m) => ({ id: m.id, label: m.name }))}
        onChange={(memberIds) => onUpdateFilters({ memberIds })}
      />
      <MiniSelect
        className="w-full sm:w-[130px]"
        value={filters.billable}
        onChange={(value) => onUpdateFilters({ billable: value as ReportConfig["filters"]["billable"] })}
        options={[
          { id: "all", label: "Billable: all" },
          { id: "yes", label: "Billable only" },
          { id: "no", label: "Non-billable" },
        ]}
      />
      <Input
        value={filters.description}
        onChange={(event) => onUpdateFilters({ description: event.target.value })}
        placeholder="Description contains…"
        className="h-11 w-[180px] sm:h-8"
      />
      {filterCount > 0 && (
        <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
          <IconFilter className="size-3" /> {filterCount}
        </span>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {/* rounding */}
        <Dropdown
          align="right"
          width="w-60"
          trigger={() => (
            <span
              className={cn(
                "flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs",
                config.rounding.enabled && "border-primary text-primary",
              )}
            >
              Rounding: {config.rounding.enabled ? `${config.rounding.mode} ${config.rounding.minutes}m` : "off"}
            </span>
          )}
        >
          {() => (
            <div className="space-y-2 p-3 text-sm">
              <label className="flex min-h-11 items-center gap-2 sm:min-h-0">
                <input
                  type="checkbox"
                  checked={config.rounding.enabled}
                  onChange={(event) => onUpdate({ rounding: { ...config.rounding, enabled: event.target.checked } })}
                />
                Round time entries
              </label>
              <MiniSelect
                className="w-full"
                value={config.rounding.mode}
                onChange={(mode) => onUpdate({ rounding: { ...config.rounding, mode: mode as "nearest" } })}
                options={ROUNDING_MODES.map((m) => ({ id: m.id, label: m.label }))}
              />
              <MiniSelect
                value={String(config.rounding.minutes)}
                onChange={(minutes) => onUpdate({ rounding: { ...config.rounding, minutes: Number(minutes) } })}
                options={ROUNDING_MINUTES.map((m) => ({ id: String(m), label: `${m} min` }))}
              />
            </div>
          )}
        </Dropdown>

        {/* export */}
        <Dropdown
          align="right"
          width="w-44"
          trigger={() => (
            <span className="flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs">
              <IconExport className="size-3.5" /> Export
            </span>
          )}
        >
          {(close) => (
            <div className="py-1 text-sm">
              {(["csv", "json", "print"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    onExport(kind)
                    close()
                  }}
                  className="block w-full px-3 py-1.5 text-left hover:bg-secondary/60"
                >
                  {kind === "csv" ? "CSV" : kind === "json" ? "JSON" : "Print / PDF"}
                </button>
              ))}
            </div>
          )}
        </Dropdown>

        {/* save report */}
        <Dropdown
          align="right"
          width="w-64"
          trigger={() => <span className="flex h-8 items-center rounded-md border border-border px-2 text-xs">Save report</span>}
        >
          {(close) => {
            /**
             * THE BUTTON TELLS THE TRUTH ABOUT WHETHER IT WILL WORK.
             *
             * Save looked enabled with the name box empty and returned silently on the
             * click — a full-width primary button that does nothing is indistinguishable
             * from a broken one. Enter did nothing either, though the box is
             * `autoFocus`, so the natural way to finish typing a name was the one way
             * that had no effect. `useAddField` owns both halves for all six of these.
             *
             * The hook is built once per render of this component while `close` arrives
             * per render of the dropdown's body, so the latest one is parked in a ref —
             * the same thing `useStagedEdit` does with its commit.
             */
            closeRef.current = close
            return (
              <div className="space-y-2 p-3">
                <Input autoFocus {...saveField.inputProps} placeholder="Report name" className="h-11 sm:h-8" />
                <Button size="sm" className="w-full" {...saveField.buttonProps}>
                  Save
                </Button>
              </div>
            )
          }}
        </Dropdown>
      </div>
    </>
  )
}

function FilterDropdown({
  label,
  items,
  selected,
  onChange,
}: {
  label: string
  items: { id: Id; label: string; color?: string }[]
  selected: Id[]
  onChange: (ids: Id[]) => void
}) {
  const [query, setQuery] = useState("")
  const visible = items.filter((item) => !query.trim() || item.label.toLowerCase().includes(query.toLowerCase()))
  return (
    <Dropdown
      width="w-60"
      trigger={() => (
        <span
          className={cn(
            "flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs",
            selected.length > 0 && "border-primary text-primary",
          )}
        >
          {label}
          {selected.length > 0 && <span className="tabular-nums">({selected.length})</span>}
          <IconDown className="size-3" />
        </span>
      )}
    >
      {() => (
        <div>
          <div className="border-b border-border p-2">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}…`} className="h-11 sm:h-8" />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {visible.map((item) => (
              <CheckOption
                key={item.id}
                label={item.label}
                color={item.color}
                checked={selected.includes(item.id)}
                onClick={() =>
                  onChange(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])
                }
              />
            ))}
            {visible.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nothing matches</p>}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-border p-2">
              <Button size="sm" variant="ghost" className="w-full" onClick={() => onChange([])}>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}
    </Dropdown>
  )
}

// ---------------------------------------------------------------------------
// Summary tab
// ---------------------------------------------------------------------------

function SummaryTab({
  state,
  config,
  report,
  onUpdate,
  currency,
}: {
  state: TimetrackState
  config: ReportConfig
  report: SummaryReport
  onUpdate: (patch: Partial<ReportConfig>) => void
  currency: string
}) {
  const [expanded, setExpanded] = useState<string[]>([])
  const format = state.user.durationFormat

  const chartData = report.buckets.map((bucket) => {
    const value =
      config.chartMetric === "revenue"
        ? bucket.revenue
        : config.chartMetric === "cost"
          ? bucket.cost
          : config.chartMetric === "profit"
            ? bucket.revenue - bucket.cost
            : config.chartMetric === "billable_pct"
              ? bucket.seconds > 0
                ? (bucket.billableSeconds / bucket.seconds) * 100
                : 0
              : bucket.seconds
    return {
      key: bucket.key,
      label: bucket.label,
      total: value,
      segments: config.chartMetric === "time" ? bucket.segments : [],
    }
  })

  const formatChartValue = (value: number) => {
    if (config.chartMetric === "time") return formatCompact(value)
    if (config.chartMetric === "billable_pct") return `${Math.round(value)}%`
    return formatMoney(value, currency)
  }

  return (
    <div className="space-y-4">
      {/* summary bar */}
      <div className="flex items-center justify-end">
        <Dropdown
          align="right"
          width="w-56"
          trigger={() => (
            <span className="flex h-11 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground sm:h-7">
              Metrics ({config.summaryMetrics.length}/{MAX_SUMMARY_METRICS})
              <IconDown className="size-3" />
            </span>
          )}
        >
          {() => (
            <div className="py-1">
              {SUMMARY_METRICS.map((metric) => {
                const active = config.summaryMetrics.includes(metric.id)
                return (
                  <CheckOption
                    key={metric.id}
                    label={metric.label}
                    checked={active}
                    onClick={() => {
                      if (active) onUpdate({ summaryMetrics: config.summaryMetrics.filter((m) => m !== metric.id) })
                      else if (config.summaryMetrics.length < MAX_SUMMARY_METRICS)
                        onUpdate({ summaryMetrics: [...config.summaryMetrics, metric.id] })
                    }}
                  />
                )
              })}
            </div>
          )}
        </Dropdown>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {config.summaryMetrics.map((metric) => {
          const { value, kind } = metricValue(report, metric)
          const definition = SUMMARY_METRICS.find((m) => m.id === metric)!
          return (
            <StatTile
              key={metric}
              label={definition.label}
              value={kind === "money" ? formatMoney(value, currency) : formatDuration(value, format)}
              sub={
                metric === "billable" && report.totals.seconds > 0
                  ? `${Math.round((report.totals.billableSeconds / report.totals.seconds) * 100)}% of tracked time`
                  : metric === "total"
                    ? `${report.totals.entryCount} ${report.totals.entryCount === 1 ? "entry" : "entries"} · ${report.totals.activeDays} active ${report.totals.activeDays === 1 ? "day" : "days"}`
                    : undefined
              }
              tone={metric === "profit" ? (value >= 0 ? "positive" : "negative") : "default"}
            />
          )
        })}
      </div>

      <SectionCard
        title="Tracked over time"
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            {/* two per row on a phone: three across clip their own labels
                ("No stacking" rendered as "No stackir") at 390px */}
            <MiniSelect
              className="w-full sm:w-[120px]"
              value={config.chartMetric}
              onChange={(value) => onUpdate({ chartMetric: value as ReportConfig["chartMetric"] })}
              options={CHART_METRICS.map((m) => ({ id: m.id, label: m.label }))}
            />
            <MiniSelect
              className="w-full sm:w-[110px]"
              value={config.chartInterval}
              onChange={(value) => onUpdate({ chartInterval: value as ReportConfig["chartInterval"] })}
              options={[
                { id: "day", label: "By day" },
                { id: "week", label: "By week" },
                { id: "month", label: "By month" },
              ]}
            />
            <MiniSelect
              className="col-span-2 w-full sm:col-span-1 sm:w-[140px]"
              value={config.chartStackBy ?? "none"}
              onChange={(value) => onUpdate({ chartStackBy: value === "none" ? null : (value as GroupingDimension) })}
              options={[{ id: "none", label: "No stacking" }, ...GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: `Stack by ${d.label.toLowerCase()}` }))]}
            />
          </div>
        }
      >
        <StackedBarChart data={chartData} formatValue={formatChartValue} />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Breakdown"
          actions={
            <MiniSelect
              className="w-full sm:w-[140px]"
              value={config.pieGroupBy}
              onChange={(value) => onUpdate({ pieGroupBy: value as GroupingDimension })}
              options={GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: d.label }))}
            />
          }
        >
          <DonutChart
            slices={report.pie.map((slice) => ({ ...slice, value: slice.seconds }))}
            formatValue={(value) => formatDuration(value, format)}
          />
        </SectionCard>

        <SectionCard
          title="Grouping"
          actions={
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <MiniSelect
                className="w-full sm:w-[120px]"
                value={config.grouping}
                onChange={(value) => onUpdate({ grouping: value as GroupingDimension })}
                options={GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: d.label }))}
              />
              <MiniSelect
                className="w-full sm:w-[130px]"
                value={config.subGrouping ?? "none"}
                onChange={(value) => onUpdate({ subGrouping: value === "none" ? null : (value as GroupingDimension) })}
                options={[{ id: "none", label: "No sub-group" }, ...GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: d.label }))]}
              />
            </div>
          }
        >
          {report.rows.length === 0 ? (
            <EmptyState title="Nothing tracked in this range" hint="Widen the dates, or clear a filter." />
          ) : (
            <div className="space-y-1">
              {report.rows.map((row) => (
                <GroupRow
                  key={row.key}
                  row={row}
                  total={report.totals.seconds}
                  format={format}
                  currency={currency}
                  expanded={expanded.includes(row.key)}
                  onToggle={() =>
                    setExpanded((current) =>
                      current.includes(row.key) ? current.filter((k) => k !== row.key) : [...current, row.key],
                    )
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function GroupRow({
  row,
  total,
  format,
  currency,
  expanded,
  onToggle,
}: {
  row: SummaryRow
  total: number
  format: TimetrackState["user"]["durationFormat"]
  currency: string
  expanded: boolean
  onToggle: () => void
}) {
  const share = total > 0 ? (row.seconds / total) * 100 : 0
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        disabled={row.children.length === 0}
        className="flex min-h-11 w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm hover:bg-secondary/40 disabled:cursor-default sm:min-h-0"
      >
        {row.children.length > 0 ? (
          <IconDown className={cn("size-3 shrink-0 transition-transform", expanded && "rotate-180")} />
        ) : (
          <span className="w-3" />
        )}
        <ColorDot color={row.color} />
        <span className="min-w-0 flex-1 truncate">{row.label}</span>
        <span className="hidden w-24 shrink-0 sm:block">
          <ProgressBar value={row.seconds} max={total} color={row.color ?? undefined} height={4} />
        </span>
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{Math.round(share)}%</span>
        {row.revenue > 0 && (
          <span className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
            {formatMoney(row.revenue, currency)}
          </span>
        )}
        <span className="w-16 shrink-0 text-right font-medium tabular-nums">{formatDuration(row.seconds, format)}</span>
      </button>
      {expanded &&
        row.children.map((child) => (
          <div key={child.key} className="flex items-center gap-2 py-1 pl-8 pr-1 text-xs text-muted-foreground">
            <span className="min-w-0 flex-1 truncate">{child.label}</span>
            <span className="w-16 shrink-0 text-right tabular-nums">{formatDuration(child.seconds, format)}</span>
          </div>
        ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detailed tab
// ---------------------------------------------------------------------------

function DetailedTab({
  state,
  config,
  rows,
  onUpdate,
  currency,
}: {
  state: TimetrackState
  config: ReportConfig
  rows: ReturnType<typeof buildDetailed>
  onUpdate: (patch: Partial<ReportConfig>) => void
  currency: string
}) {
  const totalSeconds = rows.reduce((sum, row) => sum + row.seconds, 0)
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0)

  const sortBy = (column: string) => {
    onUpdate({
      sort: {
        column,
        direction: config.sort.column === column && config.sort.direction === "desc" ? "asc" : "desc",
      },
    })
  }

  if (rows.length === 0) return <EmptyState title="No time entries match these filters" />

  return (
    <>
      {/* phones: one card per entry */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <li key={row.entryId} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">{row.description || "(no description)"}</span>
              <span className="shrink-0 text-sm font-medium tabular-nums">
                {formatDuration(row.seconds, state.user.durationFormat)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {row.projectName && <ColorDot color={row.projectColor} />}
              <span className="min-w-0 flex-1 truncate">
                {row.projectName ?? "No project"}
                {row.taskName ? ` · ${row.taskName}` : ""}
                {row.clientName ? ` · ${row.clientName}` : ""}
              </span>
              {row.billable && <span className="shrink-0">{formatMoney(row.amount, currency)}</span>}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="tabular-nums">
                {formatDate(dateKey(row.start), state.user.dateFormat)} {formatTimeOfDay(row.start, state.user.timeFormat)}
                {row.stop ? `–${formatTimeOfDay(row.stop, state.user.timeFormat)}` : " – running"}
              </span>
              {row.tagNames.length > 0 && <span className="min-w-0 flex-1 truncate">{row.tagNames.join(", ")}</span>}
            </div>
          </li>
        ))}
        <li className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm font-medium">
          {plural(rows.length, "entry", "entries")} · {formatDuration(totalSeconds, state.user.durationFormat)} ·{" "}
          {formatMoney(totalAmount, currency)}
        </li>
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {[
              { id: "description", label: "Description" },
              { id: "project", label: "Project / Task" },
              { id: "client", label: "Client" },
              { id: "tags", label: "Tags" },
              { id: "member", label: "Member" },
              { id: "start", label: "Start" },
              { id: "duration", label: "Duration" },
              { id: "amount", label: "Amount" },
            ].map((column) => (
              <th key={column.id} className="px-3 py-2 text-left font-medium">
                <button type="button" onClick={() => sortBy(column.id)} className="flex items-center gap-1 hover:text-foreground">
                  {column.label}
                  {config.sort.column === column.id && <IconSort className="size-3" />}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.entryId} className="hover:bg-secondary/20">
              <td className="max-w-[240px] truncate px-3 py-2">{row.description || "(no description)"}</td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5">
                  {row.projectName && <ColorDot color={row.projectColor} />}
                  <span className="truncate">
                    {row.projectName ?? "No project"}
                    {row.taskName ? ` · ${row.taskName}` : ""}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{row.clientName ?? "—"}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{row.tagNames.join(", ") || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.memberName}</td>
              <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-muted-foreground">
                {formatDate(dateKey(row.start), state.user.dateFormat)} {formatTimeOfDay(row.start, state.user.timeFormat)}
                {row.stop ? ` – ${formatTimeOfDay(row.stop, state.user.timeFormat)}` : " – running"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatDuration(row.seconds, state.user.durationFormat)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {row.billable ? formatMoney(row.amount, currency) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-border bg-secondary/30 font-medium">
          <tr>
            <td className="px-3 py-2" colSpan={6}>
              {plural(rows.length, "entry", "entries")}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{formatDuration(totalSeconds, state.user.durationFormat)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totalAmount, currency)}</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Workload tab
// ---------------------------------------------------------------------------

function WorkloadTab({
  state,
  config,
  report,
  onUpdate,
  currency,
}: {
  state: TimetrackState
  config: ReportConfig
  report: ReturnType<typeof buildWorkload>
  onUpdate: (patch: Partial<ReportConfig>) => void
  currency: string
}) {
  const formatValue = (value: number) =>
    report.mode === "earnings" ? formatMoney(value, currency) : formatDuration(value, state.user.durationFormat)
  const max = Math.max(1, ...report.rows.flatMap((row) => row.values))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <MiniSelect
          className="w-full sm:w-[140px]"
          value={config.grouping}
          onChange={(value) => onUpdate({ grouping: value as GroupingDimension })}
          options={GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: `Group by ${d.label.toLowerCase()}` }))}
        />
        <MiniSelect
          className="w-full sm:w-[130px]"
          value={config.workloadValueMode}
          onChange={(value) => onUpdate({ workloadValueMode: value as ReportConfig["workloadValueMode"] })}
          options={[
            { id: "duration", label: "Durations" },
            { id: "earnings", label: "Earnings" },
          ]}
        />
      </div>

      {report.rows.length === 0 ? (
        <EmptyState title="Nothing tracked in this range" hint="Widen the dates, or clear a filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <p className="border-b border-border px-3 py-2 text-[11px] text-muted-foreground sm:hidden">
            Swipe sideways to see every day.
          </p>
          <table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Group</th>
                {report.days.map((day) => (
                  <th key={day} className="px-2 py-2 text-right font-medium">
                    {formatDayShort(day)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <ColorDot color={row.color} />
                      <span className="truncate">{row.label}</span>
                    </span>
                  </td>
                  {row.values.map((value, index) => (
                    <td
                      key={`${row.key}-${index}`}
                      className="px-2 py-2 text-right text-xs tabular-nums"
                      style={{
                        backgroundColor: value > 0 ? `color-mix(in srgb, var(--primary) ${Math.round((value / max) * 45)}%, transparent)` : undefined,
                      }}
                    >
                      {value > 0 ? formatValue(value) : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{formatValue(row.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-secondary/30 font-medium">
              <tr>
                <td className="px-3 py-2">Total</td>
                {report.dayTotals.map((value, index) => (
                  <td key={index} className="px-2 py-2 text-right text-xs tabular-nums">
                    {value > 0 ? formatValue(value) : "—"}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{formatValue(report.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * One end of the report range: typed freely, committed when the person leaves it.
 *
 * `min`/`max` are a hint to the picker and nothing more — they are constraint-validation
 * attributes, so the value still arrives and only `validity.rangeOverflow` flips. The
 * rule that actually holds is `clampRange`, applied by `updateFilters` when this
 * commits.
 *
 * `useStagedEdit` gives the other half: leaving the screen with a half-typed date still
 * commits it, because React does not fire blur on unmount.
 */
function RangeDateField({
  label,
  value,
  onCommit,
}: {
  label: string
  value: IsoDate
  onCommit: (value: IsoDate) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft)
    setDraft(null)
  }
  const staged = useStagedEdit(commit)

  return (
    <Input
      type="date"
      min={RANGE_MIN}
      max={RANGE_MAX}
      /**
       * NAMES THE GUARD THAT REFUSES ITS EMPTY VALUE.
       *
       * This field holds a draft and commits on blur, so `draft` legitimately reads ""
       * while a year is half-typed and the emptiness has to be refused at the COMMIT.
       * `aDateInputCannotSendNothing` excuses exactly the fields carrying this marker,
       * and runs the named guard to check it really refuses "" — the first version of
       * that excuse keyed on the `onBlur`+flush PATTERN, which let a reviewer add a
       * staged field handing "" straight to `dateKey` with the suite still green.
       */
      data-staged-commit="clampRange"
      aria-label={label}
      value={draft ?? value}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={staged.flush}
      className="h-11 sm:h-8"
    />
  )
}

// ---------------------------------------------------------------------------
// Profitability tab
// ---------------------------------------------------------------------------

/**
 * A margin that cannot be computed shows an em dash, never `0%`.
 *
 * `0%` means break-even, and it was printed on rows that had lost money — non-billable
 * time with a real labour cost has no income to take a margin of, which is a third
 * state. One formatter so the desktop row, the phone card and the totals row agree.
 */
function formatMargin(margin: number | null): string {
  return margin === null ? "—" : `${Math.round(margin * 100)}%`
}

function ProfitabilityTab({
  state,
  report,
  config,
  onUpdate,
  currency,
}: {
  state: TimetrackState
  report: ReturnType<typeof buildProfitability>
  config: ReportConfig
  onUpdate: (patch: Partial<ReportConfig>) => void
  currency: string
}) {
  const { rows, fixedFee: reportFee, feeIsPerRow } = report

  /**
   * THE FEE IS TAKEN FROM THE REPORT, NOT SUMMED FROM THE ROWS.
   *
   * Summing `row.fixedFee` counted a project's whole fee once per row it appeared
   * in, so grouping by date multiplied a retainer by the number of days worked:
   * EUR 3,000 shown for a EUR 1,000 project across three days. `buildProfitability`
   * now counts each project once for the report and leaves a row's own fee at zero
   * for any grouping where a project can appear twice.
   */
  const summed = rows.reduce(
    (acc, row) => ({
      seconds: acc.seconds + row.seconds,
      // `billableSeconds` is on every row and was simply never added up, which is why
      // the Billable column's total cell was empty while the column itself had values
      billableSeconds: acc.billableSeconds + row.billableSeconds,
      revenue: acc.revenue + row.revenue,
      cost: acc.cost + row.cost,
    }),
    { seconds: 0, billableSeconds: 0, revenue: 0, cost: 0 },
  )
  const totals = {
    ...summed,
    fixedFee: reportFee,
    profit: summed.revenue + reportFee - summed.cost,
  }
  /**
   * THE TOTALS ROW TOTALS EVERY COLUMN IT HAS A NUMBER FOR.
   *
   * Billable and Margin were literally `<td />` — two empty cells in a row where every
   * other column adds up, which reads as "could not compute" for numbers the app has
   * twice over: `row.billableSeconds` is on every row, the Summary tab shows the
   * billable total one click away, and the CSV from the Export button prints the margin
   * total. A browser round read all three off one screen.
   */
  const totalIncome = totals.revenue + totals.fixedFee
  const totalMargin = totalIncome > 0 ? totals.profit / totalIncome : null

  return (
    <div className="space-y-3">
      <MiniSelect
        className="w-full sm:w-[160px]"
        value={config.grouping}
        onChange={(value) => onUpdate({ grouping: value as GroupingDimension })}
        options={GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: `Group by ${d.label.toLowerCase()}` }))}
      />

      {rows.length === 0 ? (
        <EmptyState title="Nothing to analyze in this range" hint="Profitability needs billable time, rates or a fixed fee." />
      ) : (
        <>
        {!feeIsPerRow && reportFee > 0 && (
          /*
            Said, not hidden. A fixed fee belongs to a project, so there is no
            honest per-day or per-tag share of one — and showing a made-up share
            as an exact figure is how this read EUR 3,000 for a EUR 1,000 project.
          */
          <p className="text-xs text-muted-foreground">
            {formatMoney(reportFee, currency)} of fixed fees belongs to whole projects, so it is counted in the total
            only. Group by project or client to see it per row.
          </p>
        )}
        <ul className="space-y-2 sm:hidden">
          {rows.map((row) => (
            <li key={row.key} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-1.5">
                <ColorDot color={row.color} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.label}</span>
                <span className={cn("shrink-0 text-sm font-medium tabular-nums", row.profit < 0 && "text-destructive")}>
                  {formatMoney(row.profit, currency)}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Tracked</dt>
                  <dd className="tabular-nums">{formatDuration(row.seconds, state.user.durationFormat)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Margin</dt>
                  <dd className="tabular-nums">{formatMargin(row.margin)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Revenue</dt>
                  <dd className="tabular-nums">{formatMoney(row.revenue, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Cost</dt>
                  <dd className="tabular-nums">{formatMoney(row.cost, currency)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Group</th>
                <th className="px-3 py-2 text-right font-medium">Tracked</th>
                <th className="px-3 py-2 text-right font-medium">Billable</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
                <th className="px-3 py-2 text-right font-medium">Fixed fee</th>
                <th className="px-3 py-2 text-right font-medium">Cost</th>
                <th className="px-3 py-2 text-right font-medium">Profit</th>
                <th className="px-3 py-2 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <ColorDot color={row.color} />
                      <span className="truncate">{row.label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatDuration(row.seconds, state.user.durationFormat)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatDuration(row.billableSeconds, state.user.durationFormat)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.revenue, currency)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {row.fixedFee > 0 ? formatMoney(row.fixedFee, currency) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatMoney(row.cost, currency)}</td>
                  <td className={cn("px-3 py-2 text-right font-medium tabular-nums", row.profit < 0 && "text-destructive")}>
                    {formatMoney(row.profit, currency)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMargin(row.margin)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-secondary/30 font-medium">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatDuration(totals.seconds, state.user.durationFormat)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatDuration(totals.billableSeconds, state.user.durationFormat)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totals.revenue, currency)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totals.fixedFee, currency)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totals.cost, currency)}</td>
                <td className={cn("px-3 py-2 text-right tabular-nums", totals.profit < 0 && "text-destructive")}>
                  {formatMoney(totals.profit, currency)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMargin(totalMargin)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Saved reports
// ---------------------------------------------------------------------------

function SavedTab({
  state,
  setState,
  onLoad,
  pushToast,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  onLoad: (config: ReportConfig) => void
  pushToast: (text: string, tone?: "info" | "error") => void
}) {
  if (state.savedReports.length === 0) {
    return (
      <EmptyState
        title="No saved reports yet"
        hint="Set up a report on any tab, then choose “Save report”. Saved reports keep their filters, grouping and rounding, and can be shared as a link."
      />
    )
  }

  return (
    <div className="space-y-2">
      {state.savedReports.map((saved) => (
        <div key={saved.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{saved.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {saved.config.tab} · {saved.config.filters.range.start} → {saved.config.filters.range.end} · grouped by{" "}
              {saved.config.grouping}
              {saved.config.rounding.enabled ? ` · rounded ${saved.config.rounding.mode} ${saved.config.rounding.minutes}m` : ""}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onLoad(saved.config)}>
            Open
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              // The same bug "Copy start link" had: hard-coded to the lab page,
              // which 404s in production, so every link this ever produced was
              // dead. These components are mounted at two addresses; the one
              // being used is the only one that can be right.
              const link = `${window.location.origin}${window.location.pathname}?report=${encodeReportConfig(saved.config)}`
              navigator.clipboard?.writeText(link)
              pushToast("Share link copied — it opens this report with the same settings")
            }}
          >
            <IconLink className="size-3.5" /> Share link
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setState((current) => ({ ...current, savedReports: current.savedReports.filter((r) => r.id !== saved.id) }))}
          >
            <IconDelete className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}
