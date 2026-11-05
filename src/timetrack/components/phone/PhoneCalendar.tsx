"use client"

/**
 * THE PHONE'S CALENDAR TAB, LIKE TOGGL TRACK'S (Plans/toggl-parity.md Phase 4,
 * D-PHONE-CAL).
 *
 *   WEDNESDAY, DEC 10                          7:05:00
 *   S   M   T   W   T   F   S        (today marked, the day shown filled)
 *   the hour grid, the now line                [V1 2:14; H25 #21]
 *
 * A tap on a block selects it — handles on its edges — and a panel takes the
 * bar's place: its name, project, start – end, and Delete · Edit · Duplicate ·
 * Continue, Cancel; on the running one Discard · Edit · Stop. Edit opens the
 * one sheet. The grid's gestures are `CalendarView`'s, with the phone's rules
 * (`phone` there). Day | Week and "Connect calendar" stay above the grid.
 */

import { useContext } from "react"

import { cn } from "@/lib/utils"
import type { PushToast } from "../../hooks/useTimetrack"
import { IconDelete, IconDuplicate, IconEdit, IconNext, IconPrev, IconStart, IconStop } from "../../icons"
import { dayLine, weekStrip } from "../../phoneCalendarService"
import { serverNowIso } from "../../serverClock"
import { layOnto } from "../../tabMergeService"
import { dayColumnSeconds } from "../../calendarService"
import { addDays, dateKey, formatDuration, formatTimeOfDay } from "../../timetrackFormatService"
import { continueEntry, duplicateEntry, isRunning, liveEntries, undoDisplacement } from "../../timetrackService"
import type { Id, IsoDate, TimeEntry, TimetrackState } from "../../types"
import type { AfterCheck } from "../afterCheck"
import { CalendarView } from "../CalendarView"
import { undoOrSay } from "../neighbourNotice"
import { deleteWithUndo } from "./PhoneEntryList"
import { UndoContext } from "./undoContext"
import { ProjectLine } from "./RunBar"
import type { SetState } from "./landOnCurrent"

export function PhoneCalendar({
  state,
  setState,
  nowSec,
  pushToast,
  day,
  onDay,
  selectedId,
  onSelect,
  onCreated,
  onOpenIntegrations,
}: {
  state: TimetrackState
  setState: SetState
  nowSec: number
  pushToast: PushToast
  day: IsoDate
  onDay: (day: IsoDate) => void
  selectedId: Id | null
  onSelect: (id: Id | null) => void
  /** a held finger made a block: its sheet opens, the name ready to type */
  onCreated: (entry: TimeEntry) => void
  onOpenIntegrations: () => void
}) {
  const todayKey = dateKey(new Date(nowSec * 1000))
  const total = dayColumnSeconds(liveEntries(state), day, nowSec)
  return (
    <div className="space-y-2">
      {/* the day and its total, as Toggl's Calendar heads it */}
      <div data-day-header className="flex items-baseline justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <p className={cn(day === todayKey && "text-primary")}>{dayLine(day)}</p>
        <p className="tabular-nums normal-case text-foreground">{formatDuration(total, state.user.durationFormat)}</p>
      </div>
      <div role="group" aria-label="Week" className="flex items-center">
        <button type="button" aria-label="Previous week" onClick={() => onDay(addDays(day, -7))} className="flex size-11 shrink-0 items-center justify-center text-muted-foreground">
          <IconPrev className="size-4" />
        </button>
        {weekStrip(day, state.user.weekStart).map((each) => (
          <button
            key={each.day}
            type="button"
            data-day={each.day}
            aria-current={each.day === todayKey ? "date" : undefined}
            aria-pressed={each.day === day}
            aria-label={`${dayLine(each.day)}${each.day === todayKey ? ", today" : ""}`}
            onClick={() => onDay(each.day)}
            className="flex min-h-11 flex-1 flex-col items-center gap-0.5 text-xs"
          >
            <span className="text-muted-foreground">{each.letter}</span>
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full tabular-nums",
                each.day === day ? "bg-primary font-semibold text-primary-foreground" : each.day === todayKey ? "font-semibold text-primary" : "text-foreground",
              )}
            >
              {each.date}
            </span>
          </button>
        ))}
        <button type="button" aria-label="Next week" onClick={() => onDay(addDays(day, 7))} className="flex size-11 shrink-0 items-center justify-center text-muted-foreground">
          <IconNext className="size-4" />
        </button>
      </div>
      <CalendarView
        state={state}
        setState={setState}
        nowSec={nowSec}
        pushToast={pushToast}
        onEditEntry={(entry) => onSelect(entry.id)}
        onOpenIntegrations={onOpenIntegrations}
        anchor={day}
        onAnchor={onDay}
        phone={{ selectedId, onCreated }}
      />
    </div>
  )
}

/** The panel a tapped block opens, in the place of the bar at the bottom [H25 #21; SRC] */
export function BlockPanel({
  entry,
  state,
  setState,
  pushToast,
  afterCheck,
  onEdit,
  onStop,
  onClose,
}: {
  entry: TimeEntry
  state: TimetrackState
  setState: SetState
  pushToast: PushToast
  afterCheck: AfterCheck
  onEdit: () => void
  onStop: () => void
  onClose: () => void
}) {
  const running = isRunning(entry)
  const format = state.user.timeFormat
  const span = `${formatTimeOfDay(entry.start, format)} – ${entry.stop ? formatTimeOfDay(entry.stop, format) : "now"}`
  const act = (run: () => void) => () => {
    onClose()
    run()
  }
  const offerUndo = useContext(UndoContext)
  const remove = () => deleteWithUndo(state, [entry.id], setState, pushToast, offerUndo)
  const duplicate = () => {
    const made = duplicateEntry(state, entry.id, serverNowIso())
    if (made.violations[0]) pushToast(made.violations[0].message, "error")
    else setState(layOnto(state, made.state))
  }
  const carryOn = () =>
    afterCheck((latest, tappedAt) => {
      const result = continueEntry(latest, entry.id, tappedAt)
      if (result.violations[0]) {
        pushToast(result.violations[0].message, "error")
        return
      }
      setState(layOnto(latest, result.state))
      const { displaced, started } = result
      if (displaced && started) {
        pushToast(`Stopped “${displaced.description.trim() || "(no description)"}” and started “${entry.description.trim() || "(no description)"}”`, "info", () =>
          undoOrSay(() => latest, (current) => undoDisplacement(current, started.id, displaced.id, serverNowIso()), setState, pushToast),
        )
      }
    })
  const actions: { label: string; icon: typeof IconEdit; run: () => void; main?: boolean }[] = running
    ? [
        { label: "Discard", icon: IconDelete, run: remove },
        { label: "Edit", icon: IconEdit, run: onEdit },
        { label: "Stop", icon: IconStop, run: onStop, main: true },
      ]
    : [
        { label: "Delete", icon: IconDelete, run: remove },
        { label: "Edit", icon: IconEdit, run: onEdit },
        { label: "Duplicate", icon: IconDuplicate, run: duplicate },
        { label: "Continue", icon: IconStart, run: carryOn, main: true },
      ]
  return (
    <section role="region" aria-label="Selected time entry" className="px-3 pb-1 pt-3">
      {/* it looks tappable, so it is: the name opens the sheet, as Edit does (audit findability, Phase 8) */}
      <button type="button" onClick={act(onEdit)} className="block w-full text-left">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("min-w-0 truncate text-sm font-medium", !entry.description.trim() && "text-muted-foreground")}>
            {entry.description.trim() || "Add description"}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{span}</span>
        </span>
        <ProjectLine state={state} entry={entry} className="mt-0.5" />
      </button>
      <div role="group" aria-label="Actions" className="mt-3 flex justify-around">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button key={action.label} type="button" onClick={act(action.run)} className="flex min-w-16 flex-col items-center gap-1 text-xs">
              <span
                aria-hidden
                className={cn(
                  "flex size-11 items-center justify-center rounded-full",
                  action.main ? (running ? "bg-destructive text-white" : "bg-primary text-primary-foreground") : "bg-secondary",
                )}
              >
                <Icon className="size-4" />
              </span>
              {action.label}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={onClose} className="mt-2 min-h-11 w-full border-t border-border text-sm font-medium">
        Cancel
      </button>
    </section>
  )
}
