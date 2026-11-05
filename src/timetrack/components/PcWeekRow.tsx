"use client"

/**
 * THE ROW UNDER THE PC'S TIMER BAR (D-PC-SHELL, Phase 5 item 2 of
 * Plans/toggl-parity.md): "‹ This week · W45 ›", the week's total, and the
 * "Calendar | List view" switch, as on Toggl Track's web timer page [W25 9:44;
 * LIVE web-02, web-11]. Toggl opens on Calendar; this opens on List view,
 * because the owner edits most entries in lists, and the choice is kept.
 *
 * In List view Toggl Track's range starts at "All dates", with a Today total
 * and a Week total beside it [W25 13:54]; ‹ or › from there picks this week,
 * and then steps a week at a time. The Calendar always shows a week. A click
 * on the range's name, or T, comes back to the start (All dates, or this week).
 */

import { cn } from "@/lib/utils"
import { IconCalendar, IconList, IconNext, IconPrev } from "../icons"
import { stepWeek, weekLabel, weekNumber, type TimerView } from "../pcTimerPageService"
import { formatDuration } from "../timetrackFormatService"
import type { DurationFormat, IsoDate, WeekStart } from "../types"

export function PcWeekRow({
  anchor,
  todayKey,
  weekStart,
  todaySeconds,
  weekSeconds,
  durationFormat,
  view,
  onAnchor,
  onView,
}: {
  /** a day in the week shown; null is where the range starts: All dates in List view, this week in Calendar */
  anchor: IsoDate | null
  todayKey: IsoDate
  weekStart: WeekStart
  todaySeconds: number
  /** the week shown, or this week for All dates */
  weekSeconds: number
  durationFormat: DurationFormat
  view: TimerView
  onAnchor: (day: IsoDate | null) => void
  onView: (view: TimerView) => void
}) {
  const allDates = anchor === null && view === "list"
  const shown = anchor ?? todayKey
  const label = allDates ? "All dates" : weekLabel(shown, todayKey, weekStart)
  const step = (direction: -1 | 1) => onAnchor(allDates ? todayKey : stepWeek(shown, direction))
  const holdsToday = allDates || weekLabel(shown, todayKey, weekStart) === "This week"
  return (
    <div data-week-row className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="inline-flex items-center rounded-md border border-border bg-card">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Select previous period"
          title="Select previous period"
          className="flex size-8 items-center justify-center rounded-l-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <IconPrev className="size-4" />
        </button>
        {/* the range's name; a click comes back to where it starts, as T does */}
        <button
          type="button"
          onClick={() => onAnchor(null)}
          title={view === "list" ? "Show all dates (T)" : "Go to this week (T)"}
          className="flex h-8 items-center gap-1.5 border-x border-border px-3 text-sm hover:bg-secondary/60"
        >
          <IconCalendar className="size-4 text-muted-foreground" />
          <span data-week-label className="font-medium">
            {label}
          </span>
          {!allDates && <span className="text-muted-foreground">· W{weekNumber(shown, weekStart)}</span>}
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Select following period"
          title="Select following period"
          className="flex size-8 items-center justify-center rounded-r-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <IconNext className="size-4" />
        </button>
      </div>

      {holdsToday && (
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Today total{" "}
          <span data-today-total className="ml-1 text-sm font-semibold normal-case tracking-normal tabular-nums text-foreground">
            {formatDuration(todaySeconds, durationFormat)}
          </span>
        </p>
      )}
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Week total{" "}
        <span data-week-total className="ml-1 text-sm font-semibold normal-case tracking-normal tabular-nums text-foreground">
          {formatDuration(weekSeconds, durationFormat)}
        </span>
      </p>

      <div role="group" aria-label="Timer view" className="ml-auto inline-flex rounded-md border border-border bg-secondary/40 p-0.5">
        {(
          [
            { id: "calendar", label: "Calendar", icon: IconCalendar },
            { id: "list", label: "List view", icon: IconList },
          ] as const
        ).map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              onClick={() => onView(option.id)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors",
                view === option.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
