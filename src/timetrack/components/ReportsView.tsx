"use client"

/**
 * Reports — Toggl's five tabs (Summary, Detailed, Workload, Profitability,
 * My reports) with the same filter bar, rounding control, grouping/sub-grouping,
 * summary-bar metric picker, bar + pie charts, exports and saved/shared reports.
 */

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
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
import { downloadFile } from "../importExportService"
import {
  activeFilterCount,
  buildDetailed,
  buildProfitability,
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
  formatDayShort,
  formatDuration,
  formatMoney,
  formatTimeOfDay,
} from "../timetrackFormatService"
import type {
  GroupingDimension,
  Id,
  ReportConfig,
  ReportTab,
  SummaryReport,
  SummaryRow,
  TimetrackState,
} from "../types"
import { MiniSelect } from "./pickers"
import { CheckOption, ColorDot, DonutChart, Dropdown, EmptyState, ProgressBar, SectionCard, StackedBarChart, StatTile } from "./primitives"

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
  const updateFilters = (patch: Partial<ReportConfig["filters"]>) =>
    setConfig({ ...config, filters: { ...config.filters, ...patch } })

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
    if (config.tab === "detailed") downloadFile(`detailed-${stamp}.csv`, detailedToCsv(detailed, currency), "text/csv")
    else if (config.tab === "workload") downloadFile(`workload-${stamp}.csv`, workloadToCsv(workload), "text/csv")
    else downloadFile(`summary-${stamp}.csv`, summaryToCsv(summary, config.grouping), "text/csv")
    pushToast("Export downloaded")
  }

  return (
    <div className="space-y-4">
      {/* tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => update({ tab: tab.id })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
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
                { id: current.nextId, name, config, at: new Date().toISOString() },
                ...current.savedReports,
              ],
              nextId: current.nextId + 1,
            }))
            pushToast(`Saved report “${name}”`)
          }}
        />
      )}

      {config.tab === "summary" && <SummaryTab state={state} config={config} report={summary} onUpdate={update} currency={currency} />}
      {config.tab === "detailed" && <DetailedTab state={state} config={config} rows={detailed} onUpdate={update} currency={currency} />}
      {config.tab === "workload" && <WorkloadTab state={state} config={config} report={workload} onUpdate={update} currency={currency} />}
      {config.tab === "profitability" && <ProfitabilityTab state={state} rows={profitability} config={config} onUpdate={update} currency={currency} />}
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
  const [saveName, setSaveName] = useState("")
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

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
      <Button variant="ghost" size="icon-sm" onClick={() => shiftRange(-1)} aria-label="Previous period">
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
            <div className="flex items-center gap-2 border-t border-border pt-2">
              <Input
                type="date"
                value={filters.range.start}
                onChange={(event) => onUpdateFilters({ range: { ...filters.range, start: event.target.value } })}
                className="h-8"
              />
              <Input
                type="date"
                value={filters.range.end}
                onChange={(event) => onUpdateFilters({ range: { ...filters.range, end: event.target.value } })}
                className="h-8"
              />
            </div>
          </div>
        )}
      </Dropdown>
      <Button variant="ghost" size="icon-sm" onClick={() => shiftRange(1)} aria-label="Next period">
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
        className="w-[130px]"
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
        className="h-8 w-[180px]"
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.rounding.enabled}
                  onChange={(event) => onUpdate({ rounding: { ...config.rounding, enabled: event.target.checked } })}
                />
                Round time entries
              </label>
              <MiniSelect
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
          {(close) => (
            <div className="space-y-2 p-3">
              <Input
                autoFocus
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Report name"
                className="h-8"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  if (!saveName.trim()) return
                  onSave(saveName.trim())
                  setSaveName("")
                  close()
                }}
              >
                Save
              </Button>
            </div>
          )}
        </Dropdown>
      </div>
    </div>
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
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}…`} className="h-8" />
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
            <span className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground">
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
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="flex flex-wrap items-center gap-2">
            <MiniSelect
              className="w-[120px]"
              value={config.chartMetric}
              onChange={(value) => onUpdate({ chartMetric: value as ReportConfig["chartMetric"] })}
              options={CHART_METRICS.map((m) => ({ id: m.id, label: m.label }))}
            />
            <MiniSelect
              className="w-[110px]"
              value={config.chartInterval}
              onChange={(value) => onUpdate({ chartInterval: value as ReportConfig["chartInterval"] })}
              options={[
                { id: "day", label: "By day" },
                { id: "week", label: "By week" },
                { id: "month", label: "By month" },
              ]}
            />
            <MiniSelect
              className="w-[140px]"
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
              className="w-[140px]"
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
            <div className="flex items-center gap-2">
              <MiniSelect
                className="w-[120px]"
                value={config.grouping}
                onChange={(value) => onUpdate({ grouping: value as GroupingDimension })}
                options={GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: d.label }))}
              />
              <MiniSelect
                className="w-[130px]"
                value={config.subGrouping ?? "none"}
                onChange={(value) => onUpdate({ subGrouping: value === "none" ? null : (value as GroupingDimension) })}
                options={[{ id: "none", label: "No sub-group" }, ...GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: d.label }))]}
              />
            </div>
          }
        >
          {report.rows.length === 0 ? (
            <EmptyState title="Nothing tracked in this range" />
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
        className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm hover:bg-secondary/40 disabled:cursor-default"
      >
        {row.children.length > 0 ? (
          <IconDown className={cn("size-3 shrink-0 transition-transform", expanded && "rotate-180")} />
        ) : (
          <span className="w-3" />
        )}
        <ColorDot color={row.color} />
        <span className="min-w-0 flex-1 truncate">{row.label}</span>
        <span className="w-24 shrink-0">
          <ProgressBar value={row.seconds} max={total} color={row.color ?? undefined} height={4} />
        </span>
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{Math.round(share)}%</span>
        {row.revenue > 0 && (
          <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
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
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
              {rows.length} entries
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{formatDuration(totalSeconds, state.user.durationFormat)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totalAmount, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
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
          className="w-[140px]"
          value={config.grouping}
          onChange={(value) => onUpdate({ grouping: value as GroupingDimension })}
          options={GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: `Group by ${d.label.toLowerCase()}` }))}
        />
        <MiniSelect
          className="w-[130px]"
          value={config.workloadValueMode}
          onChange={(value) => onUpdate({ workloadValueMode: value as ReportConfig["workloadValueMode"] })}
          options={[
            { id: "duration", label: "Durations" },
            { id: "earnings", label: "Earnings" },
          ]}
        />
      </div>

      {report.rows.length === 0 ? (
        <EmptyState title="Nothing tracked in this range" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
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

// ---------------------------------------------------------------------------
// Profitability tab
// ---------------------------------------------------------------------------

function ProfitabilityTab({
  state,
  rows,
  config,
  onUpdate,
  currency,
}: {
  state: TimetrackState
  rows: ReturnType<typeof buildProfitability>
  config: ReportConfig
  onUpdate: (patch: Partial<ReportConfig>) => void
  currency: string
}) {
  const totals = rows.reduce(
    (acc, row) => ({
      seconds: acc.seconds + row.seconds,
      revenue: acc.revenue + row.revenue,
      fixedFee: acc.fixedFee + row.fixedFee,
      cost: acc.cost + row.cost,
      profit: acc.profit + row.profit,
    }),
    { seconds: 0, revenue: 0, fixedFee: 0, cost: 0, profit: 0 },
  )

  return (
    <div className="space-y-3">
      <MiniSelect
        className="w-[160px]"
        value={config.grouping}
        onChange={(value) => onUpdate({ grouping: value as GroupingDimension })}
        options={GROUPING_DIMENSIONS.map((d) => ({ id: d.id, label: `Group by ${d.label.toLowerCase()}` }))}
      />

      {rows.length === 0 ? (
        <EmptyState title="Nothing to analyze in this range" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
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
                  <td className="px-3 py-2 text-right tabular-nums">{Math.round(row.margin * 100)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-secondary/30 font-medium">
              <tr>
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatDuration(totals.seconds, state.user.durationFormat)}</td>
                <td />
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totals.revenue, currency)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totals.fixedFee, currency)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(totals.cost, currency)}</td>
                <td className={cn("px-3 py-2 text-right tabular-nums", totals.profit < 0 && "text-destructive")}>
                  {formatMoney(totals.profit, currency)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
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
        hint="Configure a report on any tab, then use “Save report”. Saved reports keep their filters, grouping and rounding, and can be shared as a link."
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
              const link = `${window.location.origin}/test/toggl?report=${encodeReportConfig(saved.config)}`
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
