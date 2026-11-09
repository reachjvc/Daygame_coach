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
import { MIN_SPLIT_SECONDS } from "../../config"
import type { PushToast } from "../../hooks/useTimetrack"
import {
  IconDelete,
  IconDuplicate,
  IconEdit,
  IconFavorite,
  IconLink,
  IconMenu,
  IconMoney,
  IconSplit,
  IconStart,
} from "../../icons"
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
  draftOf,
  duplicateEntry,
  entrySeconds,
  findFavorite,
  isPlanned,
  isRunning,
  restoreEntries,
  splitEntry,
  startLinkFor,
  tagNames,
  toggleFavorite,
  undoDisplacement,
} from "../../timetrackService"
import { listedRows, swipeAction, swipeAxis, type SwipeAxis } from "../../phoneListService"
import type { DayGroup, EntryRow, Id, IsoDate, TimeEntry, TimetrackState } from "../../types"
import type { AfterCheck } from "../afterCheck"
import { JointMark } from "../EntryList"
import { undoOrSay } from "../neighbourNotice"
import { ColorDot, Dropdown, EmptyState, plannedStripes, touchRow, touchTarget } from "../primitives"
import { type SetState } from "./landOnCurrent"
import { UndoContext, type OfferUndo } from "./undoContext"
import { ProjectLine } from "./RunBar"

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
  // a day whose only entry is the running one is the bar's until it stops
  if (rows.length === 0 && group.plannedSeconds === 0) return null

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
      {rows.length === 0 ? (
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
  onGoToProject,
  latest,
  selecting,
  checked,
  onCheck,
  expanded,
  onToggleExpand,
  onStartSelecting,
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
  const project = state.projects.find((p) => p.id === entry.projectId)

  const open = () => (grouped ? onToggleExpand?.() : onEditEntry(entry))

  const continueIt = () =>
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

  const ids = row ? row.entries.map((e) => e.id) : [entry.id]
  const offerUndo = useContext(UndoContext)

  /**
   * THE SWIPE (D-SWIPE). A finger that sets off sideways drags the row; one
   * that sets off up or down is the page's scroll, which `touch-action: pan-y`
   * leaves to the browser, and the row never moves. Letting go past 75% of the
   * width acts; less springs back. A mouse does not swipe.
   */
  const [offset, setOffset] = useState(0)
  const press = useRef<{ id: number; x: number; y: number; axis: SwipeAxis; width: number } | null>(null)
  const swallowClick = useRef(false)
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swallowClick.current = false
    if (!swipes || event.pointerType === "mouse") return
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null, width: event.currentTarget.getBoundingClientRect().width }
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
    const action = swipeAction(event.clientX - held.x, held.width)
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
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center px-4 text-sm font-semibold text-white",
            offset > 0 ? "justify-start bg-primary" : "justify-end bg-destructive",
          )}
        >
          {offset > 0 ? "Continue" : "Delete"}
        </div>
      )}
    <div
      data-swipe-face
      className={cn("relative flex items-center gap-1 bg-card py-1.5 pl-3 pr-1", nested && "pl-8", running && "bg-primary/5")}
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
          className="flex size-11 shrink-0 items-center justify-center"
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
        className="min-w-0 flex-1 py-1 text-left"
      >
        <span className={cn("block truncate text-sm", !entry.description.trim() && "text-muted-foreground")}>
          {entry.description.trim() || "Add description"}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <ProjectLine state={state} entry={entry} className="min-w-0 shrink" />
          {tags.length > 0 && <span className="min-w-0 shrink truncate text-xs text-muted-foreground"># {tags.join(", ")}</span>}
          {!grouped && !entry.duronly && (
            <span className="ml-auto shrink-0 pl-1 text-[11px] tabular-nums text-muted-foreground">
              {continued && (
                <span data-continued className="mr-1 text-primary">
                  {continued}
                </span>
              )}
              {formatTimeOfDay(entry.start, format)}–{entry.stop ? formatTimeOfDay(entry.stop, format) : "now"}
              {endMark && (
                <span data-end-day className="ml-1 text-primary">
                  {endMark}
                </span>
              )}
            </span>
          )}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="flex items-center gap-1 px-1 text-sm tabular-nums">
          {planned && <span className="text-xs text-muted-foreground">planned</span>}
          {entry.billable && <IconMoney aria-label="Billable" className="size-3.5 text-muted-foreground" />}
          {running ? formatClock(seconds) : formatDuration(seconds, state.user.durationFormat)}
        </span>
        {/* not on the running row: the bar at the bottom is that timer's control, and a ▷ here read as one (findability, 2026-11-05) */}
        {running ? (
          <span className="h-9 w-11" />
        ) : (
          <button
            type="button"
            onClick={continueIt}
            aria-label="Continue this entry"
            className="flex h-9 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/60"
          >
            <IconStart className="size-4" />
          </button>
        )}
      </div>
      <RowMenu
        entry={entry}
        ids={ids}
        state={state}
        setState={setState}
        pushToast={pushToast}
        running={running}
        project={project}
        onEdit={() => onEditEntry(entry)}
        onGoToProject={onGoToProject}
        onSelect={onStartSelecting}
        latest={latest}
      />
    </div>
    </div>
  )
}, rowPropsEqual)

/** The row's ⋮: today's extras, which Toggl's phone rows do not have, kept one tap away */
function RowMenu({
  entry,
  ids,
  state,
  setState,
  pushToast,
  running,
  project,
  onEdit,
  onGoToProject,
  onSelect,
  latest,
}: {
  entry: TimeEntry
  ids: Id[]
  state: TimetrackState
  setState: SetState
  pushToast: PushToast
  running: boolean
  project: TimetrackState["projects"][number] | undefined
  onEdit: () => void
  onGoToProject: (projectId: Id) => void
  onSelect: (ids: Id[]) => void
  latest: () => TimetrackState
}) {
  const favorite = Boolean(findFavorite(state, draftOf(entry)))
  const offerUndo = useContext(UndoContext)
  const items: { label: string; icon: React.ReactNode; run: () => void; disabled?: boolean; hint?: string; destructive?: boolean }[] = [
    { label: "Edit details…", icon: <IconEdit className="size-3.5" />, run: onEdit },
    {
      label: "Duplicate",
      icon: <IconDuplicate className="size-3.5" />,
      run: () => {
        const drawn = latest()
        const result = duplicateEntry(drawn, entry.id, serverNowIso())
        if (result.violations.length > 0) pushToast(result.violations[0].message, "error")
        else setState(layOnto(drawn, result.state))
      },
    },
    {
      label: "Split in two",
      icon: <IconSplit className="size-3.5" />,
      disabled: running || entry.duration <= MIN_SPLIT_SECONDS,
      hint: entry.duration <= MIN_SPLIT_SECONDS ? "Needs > 10 min" : undefined,
      run: () => {
        const drawn = latest()
        const result = splitEntry(drawn, entry.id, null, serverNowIso())
        if (result.error) pushToast(result.error, "error")
        else setState(layOnto(drawn, result.state))
      },
    },
    {
      label: favorite ? "Remove favorite" : "Add to favorites",
      icon: <IconFavorite className="size-3.5" />,
      run: () => setState((current) => toggleFavorite(current, draftOf(entry), serverNowIso())),
    },
    {
      label: "Copy start link",
      icon: <IconLink className="size-3.5" />,
      run: () => {
        navigator.clipboard?.writeText(startLinkFor(entry, window.location.origin, window.location.pathname))
        pushToast("Start link copied to clipboard")
      },
    },
    ...(project ? [{ label: `Go to ${project.name}`, icon: <ColorDot color={project.color} />, run: () => onGoToProject(project.id) }] : []),
    { label: "Select", icon: <input type="checkbox" readOnly checked={false} tabIndex={-1} aria-hidden className="size-3.5" />, run: () => onSelect(ids) },
    {
      label: "Delete",
      icon: <IconDelete className="size-3.5" />,
      destructive: true,
      run: () => deleteWithUndo(latest(), ids, setState, pushToast, offerUndo),
    },
  ]
  return (
    <Dropdown
      align="right"
      width="w-52"
      ariaLabel="More actions for this time entry"
      trigger={() => (
        <span className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}>
          <IconMenu className="size-5" />
        </span>
      )}
    >
      {(close) => (
        <div className="py-1 text-sm">
          {items.map((item) => (
            <Fragment key={item.label}>
              {item.destructive && <div className="my-1 h-px bg-border" />}
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  close()
                  item.run()
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-secondary/60 disabled:opacity-40",
                  touchRow,
                  item.destructive && "text-destructive",
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-[10px] text-muted-foreground">{item.hint}</span>}
              </button>
            </Fragment>
          ))}
        </div>
      )}
    </Dropdown>
  )
}
