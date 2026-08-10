"use client"

/**
 * Calendar view — Toggl's split grid: time entries in the left column of each
 * day, external calendar events in the right column. Supports day/week, three
 * zoom levels, drag-to-create, drag-to-move, edge resize, a now-line, and the
 * click-an-event menu (start timer / copy as entry / open event).
 */

import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CALENDAR_ZOOMS } from "../config"
import { IconCalendar, IconNext, IconPrev, IconStart } from "../icons"
import {
  dayColumnSeconds,
  entriesForDay,
  entryInterval,
  eventInterval,
  eventToDraft,
  eventsForDay,
  layoutBlocks,
  snapMinutes,
} from "../calendarService"
import {
  addDays,
  dateKey,
  eachDay,
  formatCompact,
  formatDayHeader,
  formatDuration,
  formatTimeOfDay,
  isoAtMinutes,
  minutesIntoDay,
  weekStartOf,
} from "../timetrackFormatService"
import {
  createManualEntry,
  entrySeconds,
  isRunning,
  liveEntries,
  startTimer,
  updateEntry,
} from "../timetrackService"
import type { CalendarEvent, EntryDraft, TimeEntry, TimetrackState } from "../types"
import { ColorDot, Dropdown, Segmented } from "./primitives"

type Range = "day" | "week"
type ZoomId = (typeof CALENDAR_ZOOMS)[number]["id"]

interface DragState {
  day: string
  startMinutes: number
  currentMinutes: number
  mode: "create" | "move" | "resize"
  entryId?: number
  /** Offset from the block top when moving */
  grabOffset?: number
  durationMinutes?: number
}

export function CalendarView({
  state,
  setState,
  nowSec,
  pushToast,
  onEditEntry,
  onOpenIntegrations,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  pushToast: (text: string, tone?: "info" | "error") => void
  onEditEntry: (entry: TimeEntry) => void
  onOpenIntegrations: () => void
}) {
  const todayKey = dateKey(new Date(nowSec * 1000))
  const [range, setRange] = useState<Range>("week")
  const [zoom, setZoom] = useState<ZoomId>("normal")
  const [anchor, setAnchor] = useState(todayKey)
  const [drag, setDrag] = useState<DragState | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const hourHeight = CALENDAR_ZOOMS.find((z) => z.id === zoom)!.hourHeight
  const minuteHeight = hourHeight / 60

  const days = useMemo(() => {
    if (range === "day") return [anchor]
    const start = weekStartOf(anchor, state.user.weekStart)
    return eachDay(start, addDays(start, 6))
  }, [range, anchor, state.user.weekStart])

  const entries = liveEntries(state)
  const enabledCalendars = state.calendars.filter((c) => c.enabled)
  const events = state.events.filter((e) => enabledCalendars.some((c) => c.id === e.calendarId))
  const nowIso = () => new Date().toISOString()

  const shift = (direction: number) => {
    setAnchor((current) => addDays(current, direction * (range === "day" ? 1 : 7)))
  }

  /**
   * Open on the working hours instead of midnight: scroll to an hour before the
   * earliest thing shown, falling back to an hour before now.
   */
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const starts = [
      ...days.flatMap((day) => entriesForDay(entries, day, nowSec).map((entry) => entryInterval(entry, day, nowSec).startMin)),
      ...days.flatMap((day) => eventsForDay(events, day).map((event) => eventInterval(event, day).startMin)),
    ].filter((minutes) => minutes > 0)
    const earliest = starts.length > 0 ? Math.min(...starts) : minutesIntoDay(new Date(nowSec * 1000).toISOString())
    container.scrollTop = Math.max(0, (earliest - 60) * minuteHeight)
    // Only re-anchor when the visible range or zoom changes, not every tick
  }, [days[0], days.length, minuteHeight]) // deps intentionally narrow: see comment above

  const minutesFromEvent = (clientY: number, dayIndex: number): number => {
    const column = gridRef.current?.querySelectorAll("[data-day-column]")[dayIndex] as HTMLElement | undefined
    if (!column) return 0
    const rect = column.getBoundingClientRect()
    return snapMinutes((clientY - rect.top) / minuteHeight)
  }

  const finishDrag = () => {
    if (!drag) return
    const { day, mode } = drag
    const from = Math.min(drag.startMinutes, drag.currentMinutes)
    const to = Math.max(drag.startMinutes, drag.currentMinutes)

    if (mode === "create") {
      if (to - from >= 5) {
        setState((current) => {
          const result = createManualEntry(
            current,
            {
              draft: { description: "", projectId: null, taskId: null, tagIds: [], billable: current.workspace.projectsBillableByDefault },
              start: isoAtMinutes(day, from),
              stop: isoAtMinutes(day, to),
            },
            nowIso(),
          )
          if (result.violations.length > 0) {
            pushToast(result.violations[0].message, "error")
            return current
          }
          return result.state
        })
      }
    } else if (mode === "move" && drag.entryId && drag.durationMinutes) {
      const newStart = Math.max(0, drag.currentMinutes - (drag.grabOffset ?? 0))
      setState((current) =>
        updateEntry(
          current,
          drag.entryId!,
          { start: isoAtMinutes(day, newStart), stop: isoAtMinutes(day, newStart + drag.durationMinutes!) },
          nowIso(),
        ).state,
      )
    } else if (mode === "resize" && drag.entryId) {
      const end = Math.max(drag.startMinutes + 5, drag.currentMinutes)
      setState((current) => updateEntry(current, drag.entryId!, { stop: isoAtMinutes(day, end) }, nowIso()).state)
    }
    setDrag(null)
  }

  const rangeLabel =
    range === "day"
      ? formatDayHeader(anchor, todayKey)
      : `${days[0]} → ${days.at(-1)}`

  return (
    <div className="space-y-3" onMouseUp={finishDrag} onMouseLeave={() => drag && finishDrag()}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => shift(-1)} aria-label="Previous">
          <IconPrev className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAnchor(todayKey)}>
          Today
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => shift(1)} aria-label="Next">
          <IconNext className="size-4" />
        </Button>
        <span className="ml-1 text-sm font-medium">{rangeLabel}</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={range}
            onChange={setRange}
            options={[
              { id: "day", label: "Day" },
              { id: "week", label: "Week" },
            ]}
          />
          <Segmented
            size="sm"
            value={zoom}
            onChange={setZoom}
            options={CALENDAR_ZOOMS.map((z) => ({ id: z.id, label: z.label }))}
          />
          <Button variant="outline" size="sm" onClick={onOpenIntegrations}>
            <IconCalendar className="size-4" />
            {enabledCalendars.length > 0 ? `${enabledCalendars.length} calendar${enabledCalendars.length > 1 ? "s" : ""}` : "Connect calendar"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* day headers */}
        <div className="flex border-b border-border bg-secondary/30">
          <div className="w-12 shrink-0 border-r border-border" />
          {days.map((day) => (
            <div key={day} className="flex-1 border-r border-border px-2 py-1.5 last:border-r-0">
              <p className={cn("text-xs font-semibold", day === todayKey && "text-primary")}>
                {formatDayHeader(day, todayKey)}
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {formatDuration(dayColumnSeconds(entries, day, nowSec), state.user.durationFormat)}
              </p>
            </div>
          ))}
        </div>

        {/* grid */}
        <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto">
          <div ref={gridRef} className="relative flex">
            {/* hour gutter */}
            <div className="w-12 shrink-0 border-r border-border">
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="relative border-b border-border/50 text-[10px] text-muted-foreground"
                  style={{ height: hourHeight }}
                >
                  <span className="absolute -top-1.5 right-1">{hour > 0 ? `${String(hour).padStart(2, "0")}:00` : ""}</span>
                </div>
              ))}
            </div>

            {days.map((day, dayIndex) => {
              const dayEntries = entriesForDay(entries, day, nowSec)
              const entryBlocks = layoutBlocks(dayEntries, (entry) => entryInterval(entry, day, nowSec))
              const dayEvents = eventsForDay(events, day)
              const eventBlocks = layoutBlocks(dayEvents, (event) => eventInterval(event, day))
              const isDragDay = drag?.day === day

              return (
                <div
                  key={day}
                  data-day-column
                  className="relative flex-1 border-r border-border last:border-r-0"
                  style={{ height: hourHeight * 24 }}
                  onMouseDown={(event) => {
                    if ((event.target as HTMLElement).closest("[data-block]")) return
                    const minutes = minutesFromEvent(event.clientY, dayIndex)
                    setDrag({ day, startMinutes: minutes, currentMinutes: minutes, mode: "create" })
                  }}
                  onMouseMove={(event) => {
                    if (!drag || drag.day !== day) return
                    setDrag({ ...drag, currentMinutes: minutesFromEvent(event.clientY, dayIndex) })
                  }}
                >
                  {/* hour lines */}
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="border-b border-border/40" style={{ height: hourHeight }} />
                  ))}

                  {/* now line */}
                  {day === todayKey && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 border-t border-primary"
                      style={{ top: minutesIntoDay(new Date(nowSec * 1000).toISOString()) * minuteHeight }}
                    >
                      <span className="absolute -left-1 -top-1 size-2 rounded-full bg-primary" />
                    </div>
                  )}

                  {/* time entries — left half */}
                  {entryBlocks.map((block) => {
                    const entry = block.item
                    const width = 50 / block.columns
                    const project = state.projects.find((p) => p.id === entry.projectId)
                    return (
                      <div
                        key={entry.id}
                        data-block
                        onMouseDown={(mouseEvent) => {
                          mouseEvent.stopPropagation()
                          const minutes = minutesFromEvent(mouseEvent.clientY, dayIndex)
                          const isResize = mouseEvent.nativeEvent.offsetY > block.heightMinutes * minuteHeight - 8
                          setDrag({
                            day,
                            mode: isResize ? "resize" : "move",
                            startMinutes: block.topMinutes,
                            currentMinutes: minutes,
                            entryId: entry.id,
                            grabOffset: minutes - block.topMinutes,
                            durationMinutes: block.heightMinutes,
                          })
                        }}
                        onClick={() => !drag && onEditEntry(entry)}
                        className={cn(
                          "absolute z-10 cursor-grab overflow-hidden rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight",
                          isRunning(entry) && "animate-pulse",
                        )}
                        style={{
                          top: block.topMinutes * minuteHeight,
                          height: Math.max(14, block.heightMinutes * minuteHeight - 1),
                          left: `${block.column * width}%`,
                          width: `${width}%`,
                          backgroundColor: `${project?.color ?? "#525266"}33`,
                          borderColor: project?.color ?? "#525266",
                        }}
                        title={`${entry.description || "(no description)"} · ${formatCompact(entrySeconds(entry, nowSec))}`}
                      >
                        <p className="truncate font-medium">{entry.description || "(no description)"}</p>
                        <p className="truncate text-muted-foreground">
                          {project?.name ?? "No project"} · {formatCompact(entrySeconds(entry, nowSec))}
                        </p>
                      </div>
                    )
                  })}

                  {/* external events — right half */}
                  {eventBlocks.map((block) => {
                    const event = block.item
                    const calendar = state.calendars.find((c) => c.id === event.calendarId)
                    const width = 50 / block.columns
                    return (
                      <div
                        key={event.id}
                        data-block
                        className="absolute z-10 overflow-visible"
                        style={{
                          top: block.topMinutes * minuteHeight,
                          height: Math.max(14, block.heightMinutes * minuteHeight - 1),
                          left: `${50 + block.column * width}%`,
                          width: `${width}%`,
                        }}
                        onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
                      >
                        <EventBlock
                          event={event}
                          color={calendar?.color ?? "#4285f4"}
                          calendarName={calendar?.name ?? "Calendar"}
                          onStart={(draft) => {
                            setState((current) => {
                              const result = startTimer(current, draft, nowIso())
                              if (result.violations.length > 0) {
                                pushToast(result.violations[0].message, "error")
                                return current
                              }
                              return result.state
                            })
                          }}
                          onCopy={(draft) => {
                            setState((current) => {
                              const result = createManualEntry(
                                current,
                                { draft, start: event.start, stop: event.end, sourceEventId: event.id },
                                nowIso(),
                              )
                              if (result.violations.length > 0) {
                                pushToast(result.violations[0].message, "error")
                                return current
                              }
                              pushToast("Calendar event copied as a time entry")
                              return result.state
                            })
                          }}
                          timeFormat={state.user.timeFormat}
                        />
                      </div>
                    )
                  })}

                  {/* drag preview */}
                  {isDragDay && drag.mode === "create" && (
                    <div
                      className="pointer-events-none absolute left-0 z-30 w-1/2 rounded border border-primary bg-primary/25 px-1 text-[10px]"
                      style={{
                        top: Math.min(drag.startMinutes, drag.currentMinutes) * minuteHeight,
                        height: Math.max(4, Math.abs(drag.currentMinutes - drag.startMinutes) * minuteHeight),
                      }}
                    >
                      {formatCompact(Math.abs(drag.currentMinutes - drag.startMinutes) * 60)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Drag on empty space to create an entry · drag a block to move it, its bottom edge to resize · click a block to
        edit details. External events sit in the right half of each day and never change your entries — exactly like
        Toggl, which also skips all-day events.
      </p>
    </div>
  )
}

function EventBlock({
  event,
  color,
  calendarName,
  onStart,
  onCopy,
  timeFormat,
}: {
  event: CalendarEvent
  color: string
  calendarName: string
  onStart: (draft: EntryDraft) => void
  onCopy: (draft: EntryDraft) => void
  timeFormat: TimetrackState["user"]["timeFormat"]
}) {
  return (
    <Dropdown
      align="right"
      width="w-64"
      className="h-full"
      trigger={() => (
        <span
          className="block h-full overflow-hidden rounded border-l-2 px-1 py-0.5 text-left text-[10px] leading-tight"
          style={{ backgroundColor: `${color}26`, borderColor: color }}
          title={`${event.title} (${calendarName})`}
        >
          <span className="block truncate font-medium">{event.title}</span>
          <span className="block truncate text-muted-foreground">{formatTimeOfDay(event.start, timeFormat)}</span>
        </span>
      )}
    >
      {(close) => (
        <div className="space-y-2 p-3 text-sm">
          <div>
            <p className="font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatTimeOfDay(event.start, timeFormat)} – {formatTimeOfDay(event.end, timeFormat)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ColorDot color={color} /> {calendarName}
            </p>
            {event.location && <p className="mt-1 text-xs text-muted-foreground">📍 {event.location}</p>}
            {event.description && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{event.description}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              onClick={() => {
                onStart(eventToDraft(event))
                close()
              }}
            >
              <IconStart className="size-3.5" /> Start a timer from this event
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onCopy(eventToDraft(event))
                close()
              }}
            >
              Copy as time entry
            </Button>
            {event.htmlLink && (
              <Button size="sm" variant="ghost" asChild>
                <a href={event.htmlLink} target="_blank" rel="noreferrer">
                  Open calendar event
                </a>
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Only the event title is copied — assign project, tags and billable status yourself.
          </p>
        </div>
      )}
    </Dropdown>
  )
}
