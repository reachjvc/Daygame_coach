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
import { useIsMobile } from "../hooks/useIsMobile"
import { IconCalendar, IconNext, IconPrev, IconStart } from "../icons"
import {
  dayColumnSeconds,
  entriesForDay,
  entryInterval,
  eventInterval,
  eventToDraft,
  eventsForDay,
  layoutBlocks,
  shiftEntryBy,
  snapMinutes,
} from "../calendarService"
import {
  addDays,
  dateKey,
  eachDay,
  formatCompact,
  formatDayHeader,
  formatDuration,
  formatHourOfDay,
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
  undoDisplacement,
  updateEntry,
} from "../timetrackService"
import type { CalendarEvent, EntryDraft, Id, TimeEntry, TimetrackState } from "../types"
import { ColorDot, Dropdown, Segmented } from "./primitives"

type Range = "day" | "week"
type ZoomId = (typeof CALENDAR_ZOOMS)[number]["id"]

interface DragState {
  day: string
  startMinutes: number
  currentMinutes: number
  mode: "create" | "move" | "resize"
  entryId?: Id
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
  /** the third argument is an Undo; see the displaced-timer toast below */
  pushToast: (text: string, tone?: "info" | "error", undo?: () => void) => void
  onEditEntry: (entry: TimeEntry) => void
  onOpenIntegrations: () => void
}) {
  const isMobile = useIsMobile()
  const todayKey = dateKey(new Date(nowSec * 1000))
  const [range, setRange] = useState<Range>("week")
  const [rangeTouched, setRangeTouched] = useState(false)

  // A seven-column week is unreadable at phone width, so start on a single day
  useEffect(() => {
    if (!rangeTouched) setRange(isMobile ? "day" : "week")
  }, [isMobile, rangeTouched])
  const [zoom, setZoom] = useState<ZoomId>("normal")
  const [zoomTouched, setZoomTouched] = useState(false)
  /**
   * Phones open one zoom step taller. At 56px/hour a 20-minute block is 19px —
   * under the height where its title fits, so it renders as a nameless bar, and
   * a phone has no hover tooltip to fall back on.
   */
  useEffect(() => {
    if (!zoomTouched) setZoom(isMobile ? "comfortable" : "normal")
  }, [isMobile, zoomTouched])
  const [anchor, setAnchor] = useState(todayKey)
  const [drag, setDrag] = useState<DragState | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  /** Set right after a move/resize so the trailing click doesn't open the editor */
  const suppressClick = useRef(false)

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
  /** Only give up half of each day to external events when there are some */
  const splitColumns = events.length > 0
  const entryLaneWidth = splitColumns ? 50 : 100

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
    // The extra 10px keeps the topmost hour label from being clipped
    container.scrollTop = Math.max(0, (earliest - 60) * minuteHeight - 10)
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
        const result = createManualEntry(
          state,
          {
            draft: { description: "", projectId: null, taskId: null, tagIds: [], billable: state.workspace.projectsBillableByDefault },
            start: isoAtMinutes(day, from),
            stop: isoAtMinutes(day, to),
          },
          nowIso(),
        )
        if (result.violations.length > 0) pushToast(result.violations[0].message, "error")
        else setState(() => result.state)
      }
    } else if (mode === "move" && drag.entryId && drag.durationMinutes) {
      const newStart = Math.max(0, drag.currentMinutes - (drag.grabOffset ?? 0))
      if (newStart !== drag.startMinutes) {
        suppressClick.current = true
        /**
         * Computed here rather than inside the updater so a refusal has
         * somewhere to be said. Drag-to-CREATE above has always shown its
         * message; move and resize took `.state` and dropped theirs, so in a
         * workspace that requires a project — or with a locked date — the block
         * slid under the cursor, snapped back, and the app said nothing.
         */
        /**
         * The whole entry shifts by how far the block was dragged. Setting an
         * absolute start and an end of `start + heightMinutes` wrote the
         * layout's one-minute floor into the data and rounded the seconds away
         * — and, for an entry dragged by its second-day fragment, put both ends
         * on that fragment's day and destroyed the first half.
         */
        const moving = state.entries.find((e) => e.id === drag.entryId)
        const patch = moving ? shiftEntryBy(moving, newStart - drag.startMinutes) : null
        const refusal = patch ? updateEntry(state, drag.entryId, patch, nowIso()).violations[0] : undefined
        if (refusal) pushToast(refusal.message, "error")
        else if (patch) {
          /**
           * Applied through the updater, not from this render's `state`.
           *
           * A drag spans mousedown to mouseup, and a sync pull or the
           * per-minute alert sweep can land inside it — writing the closure's
           * copy back would throw that away. The check above is on the closure
           * only to decide whether to complain; the write itself starts from
           * whatever is current.
           */
          setState((current) => {
            const applied = updateEntry(current, drag.entryId!, patch, nowIso())
            // refused against the newer state too: leave it alone rather than
            // write a copy that was only valid a moment ago
            return applied.violations.length > 0 ? current : applied.state
          })
        }
      }
    } else if (mode === "resize" && drag.entryId) {
      const end = Math.max(drag.startMinutes + 5, drag.currentMinutes)
      suppressClick.current = true
      const stopAt = { stop: isoAtMinutes(day, end) }
      const refusal = updateEntry(state, drag.entryId, stopAt, nowIso()).violations[0]
      if (refusal) pushToast(refusal.message, "error")
      else
        setState((current) => {
          const applied = updateEntry(current, drag.entryId!, stopAt, nowIso())
          return applied.violations.length > 0 ? current : applied.state
        })
    }
    setDrag(null)
  }

  const rangeLabel =
    range === "day"
      ? formatDayHeader(anchor, todayKey)
      : `${days[0]} → ${days.at(-1)}`

  /**
   * The width of the hour gutter, named once because TWO elements use it: the
   * spacer above the day headers and the ruler itself. They have to be identical
   * or every day column is offset by the difference. "1:00 PM" does not fit where
   * "13:00" did, so the format decides it.
   */
  const gutter = state.user.timeFormat === "h12" ? "w-16" : "w-12"

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
            onChange={(next) => {
              setRangeTouched(true)
              setRange(next)
            }}
            options={[
              { id: "day", label: "Day" },
              { id: "week", label: "Week" },
            ]}
          />
          <span className="hidden sm:inline-flex">
            <Segmented
              size="sm"
              value={zoom}
              onChange={(next) => {
                setZoomTouched(true)
                setZoom(next)
              }}
              options={CALENDAR_ZOOMS.map((z) => ({ id: z.id, label: z.label }))}
            />
          </span>
          <Button variant="outline" size="sm" onClick={onOpenIntegrations}>
            <IconCalendar className="size-4" />
            {enabledCalendars.length > 0 ? `${enabledCalendars.length} calendar${enabledCalendars.length > 1 ? "s" : ""}` : "Connect calendar"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* day headers */}
        <div className={cn("flex border-b border-border bg-secondary/30", range === "week" && "min-w-[640px] sm:min-w-0")}>
          {/* must match the ruler below exactly, or every day column is offset */}
          <div className={cn(gutter, "shrink-0 border-r border-border")} />
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
        <div ref={scrollRef} className="max-h-[70vh] overflow-auto">
          <div ref={gridRef} className={cn("relative flex", range === "week" && "min-w-[640px] sm:min-w-0")}>
            {/* hour gutter */}
            <div className={cn(gutter, "shrink-0 border-r border-border")}>
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="relative border-b border-border/50 text-[10px] text-muted-foreground"
                  style={{ height: hourHeight }}
                >
                  {/*
                    The ruler reads in the format the person chose, like every
                    other time on this page. It was hard-coded to 24-hour, so
                    somebody on 12-hour saw 13:00–23:00 down the side of the
                    calendar while every block beside it said "1:30 PM".
                  */}
                  <span className="absolute -top-1.5 right-1">{hour > 0 ? formatHourOfDay(hour, state.user.timeFormat) : ""}</span>
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
                    if (isMobile) return
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
                    const width = entryLaneWidth / block.columns
                    const project = state.projects.find((p) => p.id === entry.projectId)
                    return (
                      <div
                        key={entry.id}
                        data-block
                        onMouseDown={(mouseEvent) => {
                          mouseEvent.stopPropagation()
                          if (isMobile) return
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
                        onClick={() => {
                          if (suppressClick.current) {
                            suppressClick.current = false
                            return
                          }
                          if (!drag) onEditEntry(entry)
                        }}
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
                        title={`${entry.description || "(no description)"} · ${project?.name ?? "No project"} · ${formatCompact(entrySeconds(entry, nowSec))}`}
                      >
                        {/* Below ~22px there is no room for legible text — the tooltip carries it */}
                        {block.heightMinutes * minuteHeight >= 22 && (
                          <>
                            <p className="truncate font-medium">{entry.description || "(no description)"}</p>
                            {block.heightMinutes * minuteHeight >= 34 && (
                              <p className="truncate text-muted-foreground">
                                {project?.name ?? "No project"} · {formatCompact(entrySeconds(entry, nowSec))}
                              </p>
                            )}
                          </>
                        )}
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
                            const result = startTimer(state, draft, nowIso())
                            if (result.violations.length > 0) {
                              pushToast(result.violations[0].message, "error")
                              return
                            }
                            setState(() => result.state)
                            // starting here ends whatever was running; say so
                            if (result.displaced) {
                              const { displaced, entry } = result
                              pushToast(
                                `Stopped “${displaced.description.trim() || "(no description)"}” and started “${entry.description.trim() || "(no description)"}”`,
                                "info",
                                () => setState((current) => undoDisplacement(current, entry.id, displaced.id, nowIso())),
                              )
                            }
                          }}
                          onCopy={(draft) => {
                            const result = createManualEntry(
                              state,
                              { draft, start: event.start, stop: event.end, sourceEventId: event.id },
                              nowIso(),
                            )
                            if (result.violations.length > 0) {
                              pushToast(result.violations[0].message, "error")
                              return
                            }
                            setState(() => result.state)
                            pushToast("Calendar event copied as a time entry")
                          }}
                          timeFormat={state.user.timeFormat}
                        />
                      </div>
                    )
                  })}

                  {/* drag preview */}
                  {isDragDay && drag.mode === "create" && (
                    <div
                      className={cn(
                        "pointer-events-none absolute left-0 z-30 rounded border border-primary bg-primary/25 px-1 text-[10px]",
                        splitColumns ? "w-1/2" : "w-full",
                      )}
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
        {isMobile
          ? "Tap a block to edit it. Use the timer to start new entries."
          : "Drag empty space to create an entry · drag a block to move it, its bottom edge to resize · click it to edit."}
        {splitColumns
          ? " Calendar events share each day on the right and never change your entries."
          : " Connect a calendar to see your events beside your time."}
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
