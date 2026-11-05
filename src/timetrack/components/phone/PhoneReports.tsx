"use client"

/**
 * THE PHONE'S REPORTS TAB: TOGGL'S SHORT SCREEN (Plans/toggl-parity.md Phase 4,
 * D-PHONE-REPORTS).
 *
 * Toggl's phone shows one short report [H25 help_28; V1 2:18]: a date chip
 * and its sheet (presets and a month grid), "Tracked hours" — total, then
 * billable and amount, here only when there are any (one person, no team) —
 * bars per day, and "Group by Projects | Clients" as a donut with its list.
 * "Details" opens the full reports the PC has, every tab kept. ⬇ in the
 * header downloads what is shown, as a CSV. The heat-map is left out: it is
 * Toggl's, nobody asked for it, and it is not cheap on a phone.
 */

import { useState, type MutableRefObject } from "react"

import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { IconDown, IconNext, IconPrev } from "../../icons"
import { downloadFile } from "../../importExportService"
import { buildSummary, emptyFilters, formatMetric, presetRange, summaryToCsv, type DatePreset } from "../../reportsService"
import { addDays, dateKey, dateKeyToDate, eachDay, formatCompact, formatDuration, formatRangeShort, monthStartOf, weekStartOf } from "../../timetrackFormatService"
import type { DateRange, IsoDate, ReportConfig, TimetrackState } from "../../types"
import { DonutChart, StackedBarChart } from "../primitives"

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

type Choice = { preset: DatePreset } | { range: DateRange }

export function PhoneReports({
  state,
  nowSec,
  config,
  onDetails,
  downloadRef,
}: {
  state: TimetrackState
  nowSec: number
  /** the full reports' settings: rounding and the rest carry over */
  config: ReportConfig
  /** "Details": the full reports, on this range */
  onDetails: (range: DateRange) => void
  /** the header's ⬇ calls this */
  downloadRef: MutableRefObject<(() => void) | null>
}) {
  const todayKey = dateKey(new Date(nowSec * 1000))
  const [choice, setChoice] = useState<Choice>({ preset: "this_week" })
  const [groupBy, setGroupBy] = useState<"project" | "client">("project")
  const [sheetOpen, setSheetOpen] = useState(false)
  const range = "preset" in choice ? presetRange(choice.preset, todayKey, state.user.weekStart) : choice.range
  const label = "preset" in choice ? PRESETS.find((p) => p.id === choice.preset)!.label : formatRangeShort(range.start, range.end)

  const summary = buildSummary(
    state,
    {
      ...config,
      tab: "summary",
      filters: emptyFilters(range),
      grouping: groupBy,
      subGrouping: null,
      chartMetric: "time",
      chartInterval: "day",
      chartStackBy: null,
      pieGroupBy: groupBy,
    },
    nowSec,
  )
  const { totals } = summary
  const currency = state.workspace.defaultCurrency
  const duration = (seconds: number) => formatDuration(seconds, state.user.durationFormat)

  downloadRef.current = () =>
    downloadFile(`summary-${range.start}-${range.end}.csv`, summaryToCsv(summary, groupBy === "project" ? "Project" : "Client"), "text/csv")

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-4 text-sm font-medium"
        >
          {label}
          <IconDown className="size-3.5" />
        </button>
      </div>

      <section role="region" aria-label="Tracked hours" className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tracked hours</h3>
          <button type="button" onClick={() => onDetails(range)} className="min-h-11 px-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Details
          </button>
        </div>
        <p className="text-[11px] uppercase text-muted-foreground">Total</p>
        <p className="text-center text-3xl font-semibold tabular-nums">{duration(totals.seconds)}</p>
        {totals.billableSeconds > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[11px] uppercase text-muted-foreground">Billable</p>
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold tabular-nums">{duration(totals.billableSeconds)}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{totals.seconds > 0 ? `${((totals.billableSeconds / totals.seconds) * 100).toFixed(2)}%` : ""}</span>
            </div>
          </div>
        )}
        {totals.revenue > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-[11px] uppercase text-muted-foreground">Amount</p>
            <p className="text-xl font-semibold tabular-nums">{formatMetric(totals.revenue, "money", currency)}</p>
          </div>
        )}
      </section>

      <section aria-label="By day" className="rounded-xl border border-border bg-card p-3">
        <StackedBarChart
          data={summary.buckets.map((bucket) => ({ key: bucket.key, label: bucket.label, total: bucket.seconds, segments: [] }))}
          formatValue={formatCompact}
          height={140}
        />
      </section>

      <section aria-label="Group by" className="rounded-xl border border-border bg-card p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group by</h3>
          <div role="radiogroup" aria-label="Group by" className="flex rounded-lg border border-border p-0.5">
            {(
              [
                ["project", "Projects"],
                ["client", "Clients"],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={groupBy === id}
                onClick={() => setGroupBy(id)}
                className={cn("min-h-9 rounded-md px-3 text-xs font-medium", groupBy === id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <DonutChart slices={summary.pie.map((slice) => ({ key: slice.key, label: slice.label, color: slice.color, value: slice.seconds }))} formatValue={duration} />
      </section>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Date range">
        <DateSheet
          range={range}
          todayKey={todayKey}
          weekStart={state.user.weekStart}
          onPreset={(preset) => {
            setChoice({ preset })
            setSheetOpen(false)
          }}
          onRange={(picked) => {
            setChoice({ range: picked })
            setSheetOpen(false)
          }}
        />
      </BottomSheet>
    </div>
  )
}

/** Toggl's date sheet: the presets, then a month you pick a first and a last day in [H25 help_28 f010] */
function DateSheet({
  range,
  todayKey,
  weekStart,
  onPreset,
  onRange,
}: {
  range: DateRange
  todayKey: IsoDate
  weekStart: TimetrackState["user"]["weekStart"]
  onPreset: (preset: DatePreset) => void
  onRange: (range: DateRange) => void
}) {
  const [month, setMonth] = useState(() => monthStartOf(range.end))
  const [picked, setPicked] = useState<{ start: IsoDate; end: IsoDate | null }>({ start: range.start, end: range.end })
  const first = dateKeyToDate(month)
  const gridStart = weekStartOf(month, weekStart)
  const nextMonth = monthStartOf(addDays(month, 40))
  const days = eachDay(gridStart, addDays(gridStart, 41))
  const shownEnd = picked.end ?? picked.start
  const pick = (day: IsoDate) =>
    setPicked((current) => {
      if (current.end === null) return day < current.start ? { start: day, end: current.start } : { start: current.start, end: day }
      return { start: day, end: null }
    })

  return (
    <div className="space-y-3 pb-2">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button key={preset.id} type="button" variant="outline" size="sm" className="h-11 rounded-full" onClick={() => onPreset(preset.id)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(monthStartOf(addDays(month, -1)))} className="flex size-11 items-center justify-center">
          <IconPrev className="size-4" />
        </button>
        <span className="text-sm font-medium">
          {MONTHS[first.getMonth()]} {first.getFullYear()}
        </span>
        <button type="button" aria-label="Next month" onClick={() => setMonth(nextMonth)} className="flex size-11 items-center justify-center">
          <IconNext className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {days.map((day) => {
          const inRange = day >= picked.start && day <= shownEnd
          return (
            <button
              key={day}
              type="button"
              aria-label={day}
              aria-pressed={inRange}
              onClick={() => pick(day)}
              className={cn(
                "flex h-10 items-center justify-center tabular-nums",
                day < month || day >= nextMonth ? "text-muted-foreground/50" : "",
                inRange && "bg-primary/20",
                (day === picked.start || day === shownEnd) && "rounded-full bg-primary font-semibold text-primary-foreground",
                day === todayKey && !inRange && "font-semibold text-primary",
              )}
            >
              {dateKeyToDate(day).getDate()}
            </button>
          )
        })}
      </div>
      <div className="flex justify-end">
        <Button type="button" className="h-11 min-w-[96px]" onClick={() => onRange({ start: picked.start, end: shownEnd })}>
          Done
        </Button>
      </div>
    </div>
  )
}
