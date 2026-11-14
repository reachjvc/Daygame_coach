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

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { IconDown, IconNext, IconPrev } from "../../icons"
import { useBackCloses } from "../../hooks/useBackCloses"
import { downloadFile } from "../../importExportService"
import { buildSummary, emptyFilters, formatMetric, presetRange, summaryToCsv, type DatePreset } from "../../reportsService"
import { addDays, dateKey, dateKeyToDate, eachDay, formatCompact, formatDuration, formatRangeShort, monthStartOf, weekStartOf } from "../../timetrackFormatService"
import type { DateRange, IsoDate, ReportConfig, TimetrackState } from "../../types"
import { DonutChart } from "../primitives"

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
  /** "Details": the full reports, on this range; a bar or a project row opens Detailed on it (6.2) */
  onDetails: (range: DateRange, detailed?: { projectId?: string | null }) => void
  /** the header's ⬇ calls this */
  downloadRef: MutableRefObject<(() => void) | null>
}) {
  const todayKey = dateKey(new Date(nowSec * 1000))
  const [choice, setChoice] = useState<Choice>({ preset: "this_week" })
  const [groupBy, setGroupBy] = useState<"project" | "client">("project")
  const [sheetOpen, setSheetOpen] = useState(false)
  useBackCloses(sheetOpen, () => setSheetOpen(false))
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
      // the bars are coloured by project (Plans/time-log-phone.md 6.2)
      chartStackBy: "project",
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
        <DayBars
          buckets={summary.buckets}
          todayKey={todayKey}
          onPick={(day) => onDetails({ start: day, end: day }, {})}
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
                className={cn("min-h-11 rounded-md px-3 text-xs font-medium", groupBy === id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <DonutChart
          slices={summary.pie.map((slice) => ({ key: slice.key, label: slice.label, color: slice.color, value: slice.seconds }))}
          formatValue={duration}
          hideTotal
          onPick={(key) =>
            onDetails(range, groupBy === "project" && key.startsWith("project:") && key !== "project:none" ? { projectId: key.slice("project:".length) } : {})
          }
        />
      </section>

      {sheetOpen && (
        <DateSheet
          range={range}
          todayKey={todayKey}
          weekStart={state.user.weekStart}
          onCancel={() => setSheetOpen(false)}
          onPreset={(preset) => {
            setChoice({ preset })
            setSheetOpen(false)
          }}
          onRange={(picked) => {
            setChoice({ range: picked })
            setSheetOpen(false)
          }}
        />
      )}
    </div>
  )
}

/**
 * Toggl's date sheet [H25 help_28 f010]: Cancel · ‹ month › · Done across the
 * top, the presets under it, then the month, where a first and a last day
 * are tapped. Cancel, the backdrop and Escape change nothing.
 */
function DateSheet({
  range,
  todayKey,
  weekStart,
  onCancel,
  onPreset,
  onRange,
}: {
  range: DateRange
  todayKey: IsoDate
  weekStart: TimetrackState["user"]["weekStart"]
  onCancel: () => void
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Date range"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel()
      }}
      className="fixed inset-0 z-[9600] flex flex-col justify-end bg-black/60"
    >
      <button type="button" aria-hidden tabIndex={-1} className="flex-1 cursor-default" onClick={onCancel} />
      <div className="max-h-[92dvh] space-y-3 overflow-y-auto rounded-t-2xl border-t border-border bg-card px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
      <div data-sheet-header className="flex items-center gap-1">
        <Button type="button" variant="ghost" className="h-11 px-2" onClick={onCancel}>
          Cancel
        </Button>
        <button type="button" aria-label="Previous month" onClick={() => setMonth(monthStartOf(addDays(month, -1)))} className="ml-auto flex size-11 items-center justify-center">
          <IconPrev className="size-4" />
        </button>
        <span className="min-w-[8.5rem] text-center text-sm font-medium">
          {MONTHS[first.getMonth()]} {first.getFullYear()}
        </span>
        <button type="button" aria-label="Next month" onClick={() => setMonth(nextMonth)} className="mr-auto flex size-11 items-center justify-center">
          <IconNext className="size-4" />
        </button>
        <Button type="button" variant="ghost" className="h-11 px-2 font-semibold text-primary" onClick={() => onRange({ start: picked.start, end: shownEnd })}>
          Done
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button key={preset.id} type="button" variant="outline" size="sm" className="h-11 rounded-full" onClick={() => onPreset(preset.id)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {/* the weekdays, from the person's first day of the week */}
        {days.slice(0, 7).map((day) => (
          <span key={`letter-${day}`} data-weekday className="pb-1 text-[11px] font-medium text-muted-foreground">
            {"SMTWTFS"[dateKeyToDate(day).getDay()]}
          </span>
        ))}
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
      </div>
    </div>
  )
}

/**
 * THE DAYS AS BARS, EACH COLOURED BY ITS PROJECTS (Plans/time-log-phone.md
 * 6.2). Today's bar is marked; a tap on a bar opens Detailed on that day.
 */
function DayBars({
  buckets,
  todayKey,
  onPick,
}: {
  buckets: { key: string; label: string; seconds: number; segments: { key: string; label: string; color: string | null; value: number }[] }[]
  todayKey: IsoDate
  onPick: (day: IsoDate) => void
}) {
  const height = 140
  const max = Math.max(1, ...buckets.map((b) => b.seconds))
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {buckets.map((bucket) => {
        const barHeight = (bucket.seconds / max) * (height - 48)
        const today = bucket.key === todayKey
        return (
          <button
            key={bucket.key}
            type="button"
            onClick={() => onPick(bucket.key)}
            aria-label={`${bucket.label}: ${formatCompact(bucket.seconds)}${today ? ", today" : ""}. Show its entries`}
            className="flex min-w-[18px] flex-1 flex-col items-center justify-end gap-1"
          >
            <span className={cn("text-[10px] tabular-nums text-muted-foreground", bucket.seconds === 0 && "opacity-0")}>{formatCompact(bucket.seconds)}</span>
            <span className={cn("flex w-full flex-col justify-end overflow-hidden rounded-t", today && "ring-2 ring-primary ring-offset-1 ring-offset-card")} style={{ height: barHeight }}>
              {bucket.segments.map((segment) => (
                <span
                  key={segment.key}
                  style={{ height: `${bucket.seconds > 0 ? (segment.value / bucket.seconds) * 100 : 0}%`, backgroundColor: segment.color ?? "var(--primary)" }}
                  className="block w-full"
                />
              ))}
            </span>
            {bucket.seconds === 0 && <span className="h-[2px] w-full rounded bg-border" />}
            <span className={cn("w-full truncate text-center text-[10px]", today ? "font-semibold text-primary" : "text-muted-foreground")}>{bucket.label}</span>
          </button>
        )
      })}
    </div>
  )
}
