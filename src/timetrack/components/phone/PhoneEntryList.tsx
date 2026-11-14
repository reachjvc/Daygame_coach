"use client"

/**
 * THE PHONE'S LIST VIEW, IN TOGGL'S ORDER (Plans/toggl-parity.md Phase 1 item 2).
 *
 * "YOUR ACTIVITY" with the week's total (it was "This week" above the day
 * cards, beside a "Group similar entries" box that now lives only in
 * Settings); a header per day — TODAY, YESTERDAY, WED, 10 DEC — with its
 * total; and rows read the way Toggl's read [H25 help_14 f001; V1 4:20]: the
 * name, or "Add description" in grey; "● project • client" under it; $ and the
 * length on the right with ▶ under them. One tap on a row opens the sheet; one
 * tap on ▶ continues it.
 *
 * Kept from today, which Toggl does not have: the start–end times on the
 * second line, the overlap and gap marks between rows with their Fix, striped
 * planned entries, and the ⋮ menu (Duplicate, Split, favorites, start link, Go
 * to project, Select for the bulk bar, Delete).
 */

import { Fragment, memo, useContext, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PushToast } from "../../hooks/useTimetrack"
import { IconMoney, IconStart } from "../../icons"
import { serverNowIso } from "../../serverClock"
import { layOnto } from "../../tabMergeService"
import { jointsOf, type Joint } from "../../timeFixService"
import {
  addDays,
  continuedMark,
  dateKey,
  endDayMark,
  formatClock,
  formatDayHeader,
  formatDuration,
  formatTimeOfDay,
  plural,
  startOfDayIso,
} from "../../timetrackFormatService"
import { timerList } from "../../timerListService"
import {
  continueEntry,
  deleteEntries,
  entrySeconds,
  isPlanned,
  isRunning,
  restoreEntries,
  tagNames,
  undoDisplacement,
} from "../../timetrackService"
import { listedRows, swipeAction, swipeArmed, swipeAxis, type SwipeAxis } from "../../phoneListService"
import type { DayGroup, EntryRow, Id, IsoDate, TimeEntry, TimetrackState } from "../../types"
import type { AfterCheck } from "../afterCheck"
import { JointMark } from "../EntryList"
import { undoOrSay } from "../neighbourNotice"
import { EmptyState, plannedStripes } from "../primitives"
import { type SetState } from "./landOnCurrent"
import { UndoContext, type OfferUndo } from "./undoContext"
import { ProjectLine, TAP_SETTLE_MS } from "./RunBar"

/** the list's last ▶ or swipe-continue: shared by every row, since the rows move under the finger */
const continueSettled = { at: 0 }

interface ListProps {
  state: TimetrackState
  setState: SetState
  nowSec: number
  pushToast: PushToast
  afterCheck: AfterCheck
  onEditEntry: (entry: TimeEntry) => void
  onGoToProject: (projectId: Id) => void
  /** the bulk bar's selection, or null while not selecting */
  selected: Id[] | null
  onSelect: (ids: Id[] | null) => void
  /** a day whose only entries are planned: "See in calendar" (D-PLANNED) */
  onSeeInCalendar: (day: IsoDate) => void
}

/** "1 time entry deleted", in Toggl's Android words for one [SRC `EntryDeleted`] */
export function deletedWords(count: number): string {
  return count === 1 ? "Time entry was deleted" : `${plural(count, "time entry", "time entries")} deleted`
}

/**
 * Delete, with Undo: a swipe, the list's ⋮, the sheet, the calendar's panel and
 * the bulk bar say it the same way. On the phone the Undo is the bottom bar's
 * (`UndoContext`), which waits; without it, a toast.
 */
export function deleteWithUndo(latest: TimetrackState, ids: Id[], setState: SetState, pushToast: PushToast, offerUndo: OfferUndo | null = null): Id[] {
  const checked = deleteEntries(latest, ids, serverNowIso())
  if (checked.removed.length > 0) {
    const removed = checked.removed
    setState((current) => deleteEntries(current, ids, serverNowIso()).state)
    const undo = () => setState((current) => restoreEntries(current, removed))
    if (offerUndo) offerUndo(deletedWords(removed.length), undo, removed.map((e) => e.id))
    else pushToast(deletedWords(removed.length), "info", undo)
  }
  if (checked.violations.length > 0) pushToast(checked.violations[0].message, "error")
  return checked.removed.map((e) => e.id)
}

export const PhoneEntryList = memo(function PhoneEntryList({
  state,
  setState,
  nowSec,
  pushToast,
  afterCheck,
  onEditEntry,
  onGoToProject,
  selected,
  onSelect,
  onSeeInCalendar,
}: ListProps) {
  const [expanded, setExpanded] = useState<string[]>([])
  const [visibleDays, setVisibleDays] = useState(7)
  const latestState = useRef(state)
  latestState.current = state

  // worked out when the entries change, not every second: `timerList`
  const list = useMemo(() => timerList(state.entries, state.user.groupSimilarEntries), [state.entries, state.user.groupSimilarEntries])
  const allGroups = useMemo(() => list.groupsAt(nowSec), [list, nowSec])
  const groups = allGroups.slice(0, visibleDays)
  const todayKey = dateKey(new Date(nowSec * 1000))
  const weekSeconds = list.weekSecondsAt(todayKey, state.user.weekStart, nowSec)
  const format = state.user.durationFormat

  /**
   * What a day hands its rows to act with, the same functions for the list's
   * whole life: each calls what the parent gave last. The parent makes some of
   * them afresh every second ("See in calendar"), and a day must not be drawn
   * again for that (see `PhoneDay`).
   */
  const given = useRef({ setState, pushToast, afterCheck, onEditEntry, onGoToProject, onSelect, onSeeInCalendar, nowSec })
  given.current = { setState, pushToast, afterCheck, onEditEntry, onGoToProject, onSelect, onSeeInCalendar, nowSec }
  const jointCache = useRef(new WeakMap<DayGroup, Map<string, Joint>>())
  const actions = useMemo<DayActions>(
    () => ({
      setState: (updater) => given.current.setState(updater),
      pushToast: (...args) => given.current.pushToast(...args),
      afterCheck: (...args) => given.current.afterCheck(...args),
      onEditEntry: (entry) => given.current.onEditEntry(entry),
      onGoToProject: (projectId) => given.current.onGoToProject(projectId),
      onSelect: (ids) => given.current.onSelect(ids),
      onSeeInCalendar: (day) => given.current.onSeeInCalendar(day),
      latest: () => latestState.current,
      toggleExpanded: (key) => setExpanded((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key])),
      /** overlaps and small gaps, per day on screen, kept while the day's group is the same (see `EntryList`) */
      jointsOfDay: (group) => {
        let found = jointCache.current.get(group)
        if (!found) {
          const dayEntries = new Map([...(group.carriedIn ?? []), ...group.rows.flatMap((row) => row.entries)].map((e) => [e.id, e]))
          found = new Map(jointsOf([...dayEntries.values()], new Date(given.current.nowSec * 1000).toISOString()).map((j) => [`${j.earlierId}>${j.laterId}`, j]))
          jointCache.current.set(group, found)
        }
        return found
      },
    }),
    [],
  )

  if (list.entries.length === 0) {
    return <EmptyState title="No time entries yet" hint="Tap “I’m working on…” below to start a timer, or ⊕ above to add time you already worked." />
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between px-1 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Your activity</span>
        <span className="normal-case">
          This week <span className="tabular-nums text-foreground">{formatDuration(weekSeconds, format)}</span>
        </span>
      </div>

      {groups.map((group) => (
        <PhoneDay key={group.date} group={group} todayKey={todayKey} nowSec={nowSec} state={state} expanded={expanded} selected={selected} actions={actions} />
      ))}

      {allGroups.length > visibleDays && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" className="h-11" onClick={() => setVisibleDays((v) => v + 7)}>
            Load more days ({allGroups.length - visibleDays} left)
          </Button>
        </div>
      )}
    </div>
  )
})

interface DayActions {
  setState: SetState
  pushToast: PushToast
  afterCheck: AfterCheck
  onEditEntry: (entry: TimeEntry) => void
  onGoToProject: (projectId: Id) => void
  onSelect: (ids: Id[] | null) => void
  onSeeInCalendar: (day: IsoDate) => void
  latest: () => TimetrackState
  toggleExpanded: (key: string) => void
  jointsOfDay: (group: DayGroup) => Map<string, Joint>
}

interface DayProps {
  group: DayGroup
  todayKey: IsoDate
  nowSec: number
  state: TimetrackState
  expanded: string[]
  selected: Id[] | null
  actions: DayActions
}

/**
 * A DAY IS DRAWN AGAIN WHEN SOMETHING IT SHOWS CHANGED, NOT EVERY SECOND.
 *
 * Every second drew every row of every day open: ~2.4 s of work in 5 s on a
 * phone with three months of entries and every day opened (audit of
 * 2026-11-09, bug 3 of Plans/time-tracker-leftovers.md). The clock is left out
 * of the comparison on purpose: `timerList` hands back a day as the same object
 * for as long as nothing in it can change (no running entry in it, no planned
 * one starting), and while it is the same object its rows, lengths and total
 * read the same at any second. The running day comes back new each second and
 * is drawn; the running entry itself is the bar's, not a row here.
 */
function dayPropsEqual(prev: DayProps, next: DayProps): boolean {
  return (
    prev.group === next.group &&
    prev.todayKey === next.todayKey &&
    prev.state === next.state &&
    prev.expanded === next.expanded &&
    prev.selected === next.selected &&
    prev.actions === next.actions
  )
}

const PhoneDay = memo(function PhoneDay({ group, todayKey, nowSec, state, expanded, selected, actions }: DayProps) {
  const format = state.user.durationFormat
  // planned entries are in the calendar, not here, until they start (D-PLANNED)
  const rows = listedRows(group, nowSec)
  // the running entry heads its day as a row of its own (4.3)
  const runningHere = group.rows.flatMap((row) => row.entries).find((entry) => isRunning(entry)) ?? null
  if (rows.length === 0 && group.plannedSeconds === 0 && !runningHere) return null

  const jointBelow = (index: number): Joint | null => {
    const later = rows[index]
    const earlier = rows[index + 1]
    if (earlier && !later.grouped && !earlier.grouped) return actions.jointsOfDay(group).get(`${earlier.entries[0].id}>${later.entries[0].id}`) ?? null
    if (earlier || later.grouped || later.continuedDays || !group.carriedIn) return null
    for (const carried of group.carriedIn) {
      const joint = actions.jointsOfDay(group).get(`${carried.id}>${later.entries[0].id}`)
      if (joint) return joint
    }
    return null
  }

  const selecting = selected !== null
  const toggle = (ids: Id[]) => {
    if (!selected) return
    const all = ids.every((id) => selected.includes(id))
    actions.onSelect(all ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])])
  }

  const rowProps = {
    state,
    setState: actions.setState,
    nowSec,
    pushToast: actions.pushToast,
    afterCheck: actions.afterCheck,
    onEditEntry: actions.onEditEntry,
    onGoToProject: actions.onGoToProject,
    latest: actions.latest,
    selecting,
    selected,
    onStartSelecting: (ids: Id[]) => actions.onSelect(ids),
    // D-SWIPE: on unless switched off in Settings; not while ticking rows for the bulk bar
    swipes: state.user.swipeActions !== false && !selecting,
  }

  return (
    <section className="pt-2">
      <div className="flex items-baseline justify-between px-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <h3>{formatDayHeader(group.date, todayKey)}</h3>
        <span className="tabular-nums normal-case">
          {formatDuration(group.totalSeconds, format)}
          {/* planned time is not in the total until it starts (Q2): said beside it */}
          {group.plannedSeconds > 0 && ` · ${formatDuration(group.plannedSeconds, format)} planned`}
        </span>
      </div>
      {runningHere && (
        <RunningRow
          entry={runningHere}
          state={state}
          nowSec={nowSec}
          onOpen={() => actions.onEditEntry(runningHere)}
          alone={rows.length === 0}
        />
      )}
      {rows.length === 0 && runningHere ? null : rows.length === 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          <span>Only planned entries: they show here once they start.</span>
          <Button variant="ghost" size="sm" className="h-11 shrink-0" onClick={() => actions.onSeeInCalendar(group.date)}>
            See in calendar
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {rows.map((row, index) => {
            const joint = jointBelow(index)
            const ids = row.entries.map((e) => e.id)
            const open = expanded.includes(row.key)
            return (
              <Fragment key={row.key}>
                <li>
                  <PhoneRow
                    {...rowProps}
                    entry={row.entries[0]}
                    row={row}
                    checked={selecting && ids.every((id) => selected.includes(id))}
                    onCheck={() => toggle(ids)}
                    expanded={open}
                    onToggleExpand={() => actions.toggleExpanded(row.key)}
                  />
                  {row.grouped && open && (
                    <ul className="divide-y divide-border border-t border-border bg-secondary/20">
                      {row.entries.map((entry) => (
                        <li key={entry.id}>
                          <PhoneRow
                            {...rowProps}
                            entry={entry}
                            nested
                            checked={selecting && selected.includes(entry.id)}
                            onCheck={() => toggle([entry.id])}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
                {joint && (
                  <JointMark
                    joint={joint}
                    across={index === rows.length - 1}
                    state={state}
                    latest={actions.latest}
                    setState={actions.setState}
                    pushToast={actions.pushToast}
                  />
                )}
              </Fragment>
            )
          })}
        </ul>
      )}
    </section>
  )
}, dayPropsEqual)

type PhoneRowProps = {
  entry: TimeEntry
  row?: EntryRow
  nested?: boolean
  state: TimetrackState
  setState: SetState
  nowSec: number
  pushToast: PushToast
  afterCheck: AfterCheck
  onEditEntry: (entry: TimeEntry) => void
  onGoToProject: (projectId: Id) => void
  latest: () => TimetrackState
  selecting: boolean
  /** the bulk bar's selection: compared, because `onCheck` reads it */
  selected: Id[] | null
  checked: boolean
  onCheck: () => void
  expanded?: boolean
  onToggleExpand?: () => void
  onStartSelecting: (ids: Id[]) => void
  /** right to continue, left to delete (D-SWIPE) */
  swipes: boolean
}

/**
 * A ROW IS DRAWN AGAIN WHEN WHAT IT SHOWS CHANGED.
 *
 * A day is drawn again whenever the workspace changes (the account's answer to
 * a Start, a rename anywhere), and on `next dev` drawing ~2,000 rows took
 * seconds. A row shows its entry (or group), the settings, projects, clients,
 * tags and favourites; its buttons act on `latest()` or the copy a check hands
 * them, not on `state`. The clock is not compared: the running entry is the
 * bar's, not a row, and a planned one is not listed, so a row's length is its
 * stored one. The callbacks are made fresh by each day and not compared; what
 * they close over that can change (the selection) is.
 */
function sameRow(a: EntryRow | undefined, b: EntryRow | undefined): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.key === b.key &&
    a.grouped === b.grouped &&
    a.totalSeconds === b.totalSeconds &&
    a.continuedDays === b.continuedDays &&
    a.entries.length === b.entries.length &&
    a.entries.every((e, n) => e === b.entries[n])
  )
}
function rowPropsEqual(prev: PhoneRowProps, next: PhoneRowProps): boolean {
  const a = prev.state
  const b = next.state
  return (
    prev.entry === next.entry &&
    sameRow(prev.row, next.row) &&
    prev.nested === next.nested &&
    prev.checked === next.checked &&
    prev.expanded === next.expanded &&
    prev.selecting === next.selecting &&
    prev.selected === next.selected &&
    prev.swipes === next.swipes &&
    a.user === b.user &&
    a.projects === b.projects &&
    a.clients === b.clients &&
    a.tags === b.tags &&
    a.favorites === b.favorites &&
    prev.setState === next.setState &&
    prev.pushToast === next.pushToast &&
    prev.afterCheck === next.afterCheck &&
    prev.onEditEntry === next.onEditEntry &&
    prev.onGoToProject === next.onGoToProject &&
    prev.latest === next.latest
  )
}

const PhoneRow = memo(function PhoneRow({
  entry,
  row,
  nested,
  state,
  setState,
  nowSec,
  pushToast,
  afterCheck,
  onEditEntry,
  latest,
  selecting,
  checked,
  onCheck,
  expanded,
  onToggleExpand,
  swipes,
}: PhoneRowProps) {
  const running = isRunning(entry)
  const planned = isPlanned(entry, nowSec)
  const seconds = row ? row.totalSeconds : entrySeconds(entry, nowSec)
  const grouped = Boolean(row?.grouped)
  const continued = row?.continuedDays ? continuedMark(row.continuedDays) : null
  const shownOn = row?.continuedDays ? startOfDayIso(addDays(dateKey(entry.start), row.continuedDays)) : entry.start
  const endMark = endDayMark(shownOn, entry.stop)
  const format = state.user.timeFormat
  const tags = tagNames(state, entry.tagIds)

  /** the times the row shows: a group's first start and last end (4.1) */
  const span = entry.duronly
    ? null
    : grouped && row
      ? {
          start: row.entries.reduce((first, e) => (e.start < first ? e.start : first), row.entries[0].start),
          stop: row.entries.some((e) => e.stop === null) ? null : row.entries.reduce((last, e) => (e.stop! > last ? e.stop! : last), row.entries[0].stop!),
        }
      : { start: entry.start, stop: entry.stop }

  const open = () => (grouped ? onToggleExpand?.() : onEditEntry(entry))

  // ▶: one tap, one continue. A double tap continued twice, or a second row that slid under the finger (audit 2026-11-14, b03)
  const tapContinue = () => {
    if (performance.now() < continueSettled.at) return
    continueSettled.at = performance.now() + TAP_SETTLE_MS
    continueIt()
  }
  const continueIt = () => {
    // held until the check lands, stamped at the tap (D2, bug audit A6)
    afterCheck((base, tappedAt) => {
      const result = continueEntry(base, entry.id, tappedAt)
      if (result.violations.length > 0) {
        pushToast(result.violations[0].message, "error")
        return
      }
      // the new entry's id is made here, once: the Undo below names it
      setState(layOnto(base, result.state))
      const { displaced, started } = result
      if (displaced && started) {
        pushToast(
          `Stopped “${displaced.description.trim() || "(no description)"}” and started “${entry.description.trim() || "(no description)"}”`,
          "info",
          () => undoOrSay(latest, (current) => undoDisplacement(current, started.id, displaced.id, serverNowIso()), setState, pushToast),
        )
      }
    })
  }

  const ids = row ? row.entries.map((e) => e.id) : [entry.id]
  const offerUndo = useContext(UndoContext)

  /**
   * THE SWIPE (D-SWIPE). A finger that sets off sideways drags the row; one
   * that sets off up or down is the page's scroll, which `touch-action: pan-y`
   * leaves to the browser, and the row never moves. Letting go past 75% of the
   * width acts; less springs back. A mouse does not swipe.
   */
  const [offset, setOffset] = useState(0)
  const press = useRef<{ id: number; x: number; y: number; axis: SwipeAxis; width: number; at: number } | null>(null)
  const [rowWidth, setRowWidth] = useState(0)
  const swallowClick = useRef(false)
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swallowClick.current = false
    if (!swipes || event.pointerType === "mouse") return
    const width = event.currentTarget.getBoundingClientRect().width
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null, width, at: Date.now() }
    setRowWidth(width)
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const held = press.current
    if (!held || event.pointerId !== held.id) return
    const dx = event.clientX - held.x
    if (held.axis === null) {
      held.axis = swipeAxis(dx, event.clientY - held.y)
      if (held.axis === "x") event.currentTarget.setPointerCapture?.(event.pointerId)
    }
    // a running row has nothing to continue: it only goes left
    if (held.axis === "x") setOffset(running ? Math.min(0, dx) : dx)
  }
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const held = press.current
    press.current = null
    if (!held || event.pointerId !== held.id || held.axis !== "x") return
    swallowClick.current = true
    setOffset(0)
    const action = swipeAction(event.clientX - held.x, held.width, Date.now() - held.at)
    if (action === "continue" && !running) continueIt()
    else if (action === "delete") deleteWithUndo(latest(), ids, setState, pushToast, offerUndo)
  }

  return (
    <div
      data-swipe-row
      className="relative overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        press.current = null
        setOffset(0)
      }}
      onClickCapture={(event) => {
        // the click a browser sends after a swipe is not a tap on the row
        if (!swallowClick.current) return
        swallowClick.current = false
        event.stopPropagation()
        event.preventDefault()
      }}
    >
      {offset !== 0 && (
        // pale until letting go would act, then filled in (4.4)
        <div
          aria-hidden
          data-swipe-armed={swipeArmed(offset, rowWidth) || undefined}
          className={cn(
            "absolute inset-0 flex items-center px-4 text-sm font-semibold transition-colors",
            offset > 0 ? "justify-start" : "justify-end",
            swipeArmed(offset, rowWidth)
              ? cn("text-white", offset > 0 ? "bg-primary" : "bg-destructive")
              : cn("text-foreground/70", offset > 0 ? "bg-primary/25" : "bg-destructive/25"),
          )}
        >
          {offset > 0 ? "Continue" : "Delete"}
        </div>
      )}
    <div
      data-swipe-face
      // ABOUT 56PX, TWO LINES (Plans/time-log-phone.md 4.1): the name and its
      // length, then the project and tags and the times; ▶ at the far right.
      // Rows were 75px and about five fitted on a phone.
      className={cn("relative flex min-h-14 items-center gap-1 bg-card py-1 pl-3 pr-0.5", nested && "pl-8", running && "bg-primary/5")}
      style={{ ...(planned ? plannedStripes : {}), transform: `translateX(${offset}px)` }}
    >
      {selecting && (
        <label className="flex size-11 shrink-0 items-center justify-center">
          <input type="checkbox" checked={checked} onChange={onCheck} aria-label="Select time entry" className="size-5" />
        </label>
      )}
      {grouped && (
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? "Collapse group" : "Expand group"}
          aria-expanded={expanded}
          className="-ml-2 flex size-11 shrink-0 items-center justify-center"
        >
          <span className="flex size-6 items-center justify-center rounded border border-border text-[11px] font-semibold">{row!.entries.length}</span>
        </button>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={selecting ? onCheck : open}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") (selecting ? onCheck : open)()
        }}
        className="min-w-0 flex-1 py-0.5 text-left"
      >
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-sm", !entry.description.trim() && "text-muted-foreground")}>
            {entry.description.trim() || "Add description"}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums">
            {planned && <span className="text-xs text-muted-foreground">planned</span>}
            {entry.billable && <IconMoney aria-label="Billable" className="size-3.5 text-muted-foreground" />}
            {running ? formatClock(seconds) : formatDuration(seconds, state.user.durationFormat)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <ProjectLine state={state} entry={entry} className="min-w-0 shrink" />
          {tags.length > 0 && <span className="min-w-0 shrink truncate text-xs text-muted-foreground"># {tags.join(", ")}</span>}
          {span && (
            <span className="ml-auto shrink-0 pl-1 text-[11px] tabular-nums text-muted-foreground">
              {continued && (
                <span data-continued className="mr-1 text-primary">
                  {continued}
                </span>
              )}
              {formatTimeOfDay(span.start, format)}–{span.stop ? formatTimeOfDay(span.stop, format) : "now"}
              {endMark && (
                <span data-end-day className="ml-1 text-primary">
                  {endMark}
                </span>
              )}
            </span>
          )}
        </span>
      </div>
      {/* not on the running row: the bar at the bottom is that timer's control (findability, 2026-11-05) */}
      {running ? (
        <span className="size-11 shrink-0" />
      ) : (
        <button
          type="button"
          onClick={tapContinue}
          aria-label="Continue this entry"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/60"
        >
          <IconStart className="size-4" />
        </button>
      )}
      {/* no ⋮ on a phone row (D2, 4.2): its actions are in the entry's own ⋮ */}
    </div>
    </div>
  )
}, rowPropsEqual)

/**
 * THE RUNNING ENTRY AT THE TOP OF ITS DAY (Plans/time-log-phone.md 4.3):
 * "Reading · since 19:10" and its length counting. It was the bar's alone,
 * and a day with only a timer running looked empty. A tap opens its sheet;
 * Stop stays on the bar. Alone in the list, it says what to do next.
 */
function RunningRow({ entry, state, nowSec, onOpen, alone }: { entry: TimeEntry; state: TimetrackState; nowSec: number; onOpen: () => void; alone: boolean }) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Running: ${entry.description.trim() || "(no description)"}, since ${formatTimeOfDay(entry.start, state.user.timeFormat)}`}
        className="flex min-h-14 w-full items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 text-left"
      >
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm", !entry.description.trim() && "text-muted-foreground")}>
            {entry.description.trim() || "(no description)"} · since {formatTimeOfDay(entry.start, state.user.timeFormat)}
          </span>
          <ProjectLine state={state} entry={entry} className="mt-0.5" />
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{formatClock(entrySeconds(entry, nowSec))}</span>
      </button>
      {alone && (
        <p className="px-1 pt-2 text-xs text-muted-foreground">
          Only this timer so far today. Tap ■ below to stop it, or ⊕ above to add time you already worked.
        </p>
      )}
    </div>
  )
}
