"use client"

/**
 * The timer-page entry list: day buckets with totals, collapsed identical
 * entries, inline editing of every field, per-entry menu (continue, duplicate,
 * split, favorite, copy start link, delete) and multi-select bulk edit.
 */

import { Fragment, memo, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MIN_SPLIT_SECONDS } from "../config"
import { useDebouncedCommit } from "../hooks/useDebouncedCommit"
import { useStagedEdit } from "../hooks/useStagedEdit"
import { useIsMobile } from "../hooks/useIsMobile"
import type { PushToast } from "../hooks/useTimetrack"
import {
  IconDelete,
  IconCopyText,
  IconDuplicate,
  IconEdit,
  IconFavorite,
  IconLink,
  IconMenu,
  IconSplit,
  IconStart,
  IconStop,
} from "../icons"
import {
  DURATION_HINT,
  DURATION_UNREADABLE,
  addDays,
  continuedMark,
  dateKey,
  formatWhen,
  daysBetween,
  endDayMark,
  epochSeconds,
  formatClock,
  formatDate,
  formatDayHeader,
  formatDuration,
  formatIdleSpan,
  formatTimeOfDay,
  isoFromEpochSeconds,
  parseDurationInput,
  parseEndTimeInput,
  parseStartTimeInput,
  plural,
  startOfDayIso,
  unreadableTimeMessage,
} from "../timetrackFormatService"
import { nudgePair, samePair, typedIntoPair, type TimePair } from "../drumService"
import {
  bulkEditEntries,
  canEditEntry,
  continueEntry,
  createProject,
  createTag,
  deleteEntries,
  draftOf,
  duplicateEntry,
  entrySeconds,
  findFavorite,
  isPlanned,
  isRunning,
  moveEntryToDay,
  restoreEntries,
  setEntryDuration,
  setRunningElapsed,
  splitEntry,
  startLinkFor,
  undoDisplacement,
  tagNames,
  toggleFavorite,
  updateEntry,
} from "../timetrackService"
import {
  endNow,
  endWhereNextStarts,
  entryAfter,
  entryBefore,
  jointsOf,
  mendJoint,
  shiftEdge,
  startWhereLastEnded,
  stopAt,
  typeStart,
  undoStopAt,
  withNeighbours,
  type Joint,
} from "../timeFixService"
import { timerList } from "../timerListService"
import type { DayGroup, EntryRow, Id, IsoDate, IsoDateTime, SaveViolation, TimeEntry, TimetrackState } from "../types"
import { BillableToggle, ProjectPicker, TagPicker } from "./pickers"
import { ColorDot, DayPicker, Dropdown, EmptyState, plannedStripes, touchRow, touchTarget } from "./primitives"
import { serverNow, serverNowIso } from "../serverClock"
import { layOnto } from "../tabMergeService"
import { AfterCheckContext } from "./afterCheck"
import { EntryDrums } from "./Drums"
import { announceNeighbours, undoOrSay } from "./neighbourNotice"
import { announceEndedEarly, askAboutTypedTime, askBeforeLong } from "./TimerBar"

interface EntryListProps {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  pushToast: PushToast
  onEditEntry: (entry: TimeEntry) => void
  /** "Go to ‹project›" in an entry's ⋮ menu; without it the item is not offered */
  onGoToProject?: (projectId: Id) => void
  /**
   * The week the PC's week row names (Phase 5 of Plans/toggl-parity.md): only
   * its days are listed, as on Toggl Track's web timer page, and the row above
   * says its total. Without it (the phone) the list runs back day by day.
   */
  weekFrom?: IsoDate
  weekTo?: IsoDate
  /** the PC's week row says the totals, so the list's own "This week" is not said twice */
  totalsAbove?: boolean
}

/**
 * Memoised: the timer bar's draft lives in the screen above, so every keystroke in "What
 * are you working on?" redrew every visible row here — the bigger half of a ~215 ms key
 * on a PC with three months of entries (heavy-user audit of 2026-11-04, D6). Its props
 * are the workspace, the clock and stable callbacks, so a keystroke now changes none.
 */
export const EntryList = memo(function EntryList({ state, setState, nowSec, pushToast, onEditEntry, onGoToProject, weekFrom, weekTo, totalsAbove }: EntryListProps) {
  /**
   * ONE ROW LAYOUT, NOT BOTH.
   *
   * Every row used to render its phone layout AND its pointer-device grid, one
   * of them hidden by a `sm:` variant — and the hidden one is the expensive
   * half, because it carries a project picker, a tag picker and a billable
   * toggle per row. Measured at 390px: 38 of a row's 56 nodes were the half
   * nobody could see. That is a phone's scrolling and memory spent on a layout
   * it will never show, and, while a timer runs, React work repeated every
   * second.
   */
  const isMobile = useIsMobile()
  const [selected, setSelected] = useState<Id[]>([])
  // Checkboxes are noise on a phone until you actually want to bulk-edit
  const [selectionMode, setSelectionMode] = useState(false)
  const [expanded, setExpanded] = useState<string[]>([])
  const [visibleDays, setVisibleDays] = useState(7)

  // the history is worked out when the entries change, not every second: `timerList`
  const list = useMemo(() => timerList(state.entries, state.user.groupSimilarEntries), [state.entries, state.user.groupSimilarEntries])
  const entries = list.entries
  const allGroups = useMemo(() => list.groupsAt(nowSec), [list, nowSec])
  const inWeek = weekFrom !== undefined && weekTo !== undefined
  const groups = inWeek ? allGroups.filter((group) => group.date >= weekFrom && group.date <= weekTo) : allGroups.slice(0, visibleDays)
  const todayKey = dateKey(new Date(nowSec * 1000))
  const weekSeconds = list.weekSecondsAt(todayKey, state.user.weekStart, nowSec)
  /**
   * Overlaps and small gaps, by the pair of entries either side: see `jointsOf`. A
   * joint is between two entries of one day, so it is worked out per day on screen,
   * not over the whole history every second (D6), and kept for a day whose group did
   * not change: only the running entry's days are rebuilt each tick (`timerList`).
   */
  const jointCache = useRef(new WeakMap<DayGroup, Map<string, Joint>>())
  const jointsOfDay = (group: DayGroup): Map<string, Joint> => {
    let found = jointCache.current.get(group)
    if (!found) {
      // with what ran into the day from before midnight, so its first entry is compared with that too (`jointsOf`)
      const dayEntries = new Map([...(group.carriedIn ?? []), ...group.rows.flatMap((row) => row.entries)].map((e) => [e.id, e]))
      found = new Map(jointsOf([...dayEntries.values()], new Date(nowSec * 1000).toISOString()).map((joint) => [`${joint.earlierId}>${joint.laterId}`, joint]))
      jointCache.current.set(group, found)
    }
    return found
  }
  /**
   * The mark between two rows, when they are two single entries next to each
   * other in time. The list runs newest first, so the row below is the
   * earlier one. A collapsed group holds entries from all over the day, so a
   * mark beside one would be about an entry you cannot see.
   */
  const jointBelow = (group: DayGroup, index: number): Joint | null => {
    const later = group.rows[index]
    const earlier = group.rows[index + 1]
    if (!earlier || later.grouped || earlier.grouped) return null
    return jointsOfDay(group).get(`${earlier.entries[0].id}>${later.entries[0].id}`) ?? null
  }
  /**
   * The mark under a day's first entry, against the entry that ran into the
   * day from before midnight: sleep to 07:00:40 and coffee from 07:00. That
   * entry is listed under the day before, so the mark names it.
   */
  const jointAcrossMidnight = (group: DayGroup): Joint | null => {
    const first = group.rows[group.rows.length - 1]
    if (!first || first.grouped || first.continuedDays || !group.carriedIn) return null
    for (const carried of group.carriedIn) {
      const joint = jointsOfDay(group).get(`${carried.id}>${first.entries[0].id}`)
      if (joint) return joint
    }
    return null
  }
  /** what the workspace is when a toast's Undo is pressed: the list is still on screen, the row that made the toast may not be */
  const latestState = useRef(state)
  latestState.current = state

  const toggleSelect = (ids: Id[]) => {
    setSelected((current) => {
      const allSelected = ids.every((id) => current.includes(id))
      return allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]
    })
  }

  const nowIso = () => serverNowIso()

  const removeEntries = (ids: Id[]) => {
    const result = deleteEntries(state, ids, nowIso())
    setState(layOnto(state, result.state))
    /**
     * COUNTS WHAT WAS ACTUALLY REMOVED, AND SAYS WHY THE REST WAS NOT.
     *
     * This said `${ids.length} deleted` whatever happened — and `deleteEntries` had no
     * validation, so a browser round destroyed an entry inside an APPROVED week and was
     * told "1 time entry deleted · Undo". Now that the locks are enforced there, the
     * toast has to be able to say "0 deleted, and here is the reason", or a refused
     * delete looks exactly like a successful one.
     */
    if (result.removed.length > 0) {
      // Toggl Track web's words for one, on the PC (D-PC-LIST); a count for several, and on the phone
      const said =
        !isMobile && result.removed.length === 1 ? "The time entry was deleted." : `${plural(result.removed.length, "time entry", "time entries")} deleted`
      pushToast(said, "info", () =>
        setState((latest) => restoreEntries(latest, result.removed)),
      )
    }
    if (result.violations.length > 0) {
      const kept = ids.length - result.removed.length
      pushToast(
        result.removed.length === 0
          ? result.violations[0].message
          : `${plural(kept, "entry", "entries")} kept: ${result.violations[0].message}`,
        "error",
      )
    }
    // What was removed leaves the selection; a refused (locked) entry stays ticked.
    // This kept ONLY the removed ones, so the bar stayed and Undo brought them back
    // ticked, ready for the next Delete to take them again.
    setSelected((current) => current.filter((id) => !result.removed.some((e) => e.id === id)))
  }

  if (entries.length === 0) {
    return <EmptyState title="No time entries yet" hint="Start the timer above, or switch to manual mode to add time you already worked." />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        {/* on the PC the week row above says it, for the week it names */}
        {inWeek || totalsAbove ? (
          <span />
        ) : (
          <p className="text-xs text-muted-foreground">
            This week{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatDuration(weekSeconds, state.user.durationFormat)}
            </span>
          </p>
        )}
        <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground sm:min-h-9">
          {/* 16px. A checkbox is not exempt from the floor just because the
              label beside it is also clickable — the <label> wrapper is what
              carries the target, so the box can stay the size it looks. */}
          <input
            type="checkbox"
            className="size-4"
            checked={state.user.groupSimilarEntries}
            onChange={(event) =>
              setState((current) => ({ ...current, user: { ...current.user, groupSimilarEntries: event.target.checked } }))
            }
          />
          Group similar entries
        </label>
      </div>

      {selected.length > 0 && (
        <BulkEditBar
          state={state}
          setState={setState}
          selected={selected}
          onClear={() => setSelected([])}
          onDelete={() => removeEntries(selected)}
          pushToast={pushToast}
        />
      )}

      {groups.map((group) => (
        <section key={group.date} className="overflow-hidden rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between gap-2 border-b border-border bg-secondary/30 px-3 py-2">
            <div className="flex items-center gap-2">
              {selectionMode && (
                /* The default 12px box, wrapped so a thumb has something to
                   hit — the same shape the entry rows' own checkbox uses. */
                <label className="-ml-1 flex min-h-11 min-w-11 items-center justify-center sm:min-h-0 sm:min-w-0">
                  <input
                    type="checkbox"
                    className="size-4"
                    aria-label={`Select all entries on ${group.date}`}
                    checked={group.rows.flatMap((r) => r.entries.map((e) => e.id)).every((id) => selected.includes(id))}
                    onChange={() => toggleSelect(group.rows.flatMap((r) => r.entries.map((e) => e.id)))}
                  />
                </label>
              )}
              <h3 className="text-sm font-semibold">{formatDayHeader(group.date, todayKey)}</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatDuration(group.totalSeconds, state.user.durationFormat)}
                {/* planned time is not in the total until it starts (Q2): said beside it instead */}
                {group.plannedSeconds > 0 && ` · ${formatDuration(group.plannedSeconds, state.user.durationFormat)} planned`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode((on) => !on)
                  if (selectionMode) setSelected([])
                }}
                // 43x36 measured on an iPhone: one pixel under on width, which
                // is the same near-miss the app's tab bar carries a note about
                className="min-h-11 min-w-11 px-2 text-xs text-muted-foreground hover:text-foreground sm:min-h-9 sm:min-w-0 sm:px-1"
              >
                {selectionMode ? "Done" : "Select"}
              </button>
            </div>
          </header>

          <ul className="divide-y divide-border">
            {group.rows.map((row, index) => {
              const across = index === group.rows.length - 1 ? jointAcrossMidnight(group) : null
              const joint = jointBelow(group, index) ?? across
              return (
              <Fragment key={row.key}>
              <EntryRowView
                row={row}
                state={state}
                setState={setState}
                nowSec={nowSec}
                selectionMode={selectionMode}
                selected={selected}
                onToggleSelect={toggleSelect}
                expanded={expanded.includes(row.key)}
                onToggleExpand={() =>
                  setExpanded((current) =>
                    current.includes(row.key) ? current.filter((k) => k !== row.key) : [...current, row.key],
                  )
                }
                onDelete={removeEntries}
                pushToast={pushToast}
                onEditEntry={onEditEntry}
                onGoToProject={onGoToProject}
                isMobile={isMobile}
              />
              {joint && (
                <JointMark
                  joint={joint}
                  across={joint === across}
                  state={state}
                  latest={() => latestState.current}
                  setState={setState}
                  pushToast={pushToast}
                />
              )}
              </Fragment>
              )
            })}
          </ul>
        </section>
      ))}

      {inWeek && groups.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing tracked this week. ‹ shows the week before.
        </p>
      )}

      {!inWeek && allGroups.length > visibleDays && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setVisibleDays((v) => v + 7)}>
            Load more days ({allGroups.length - visibleDays} left)
          </Button>
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// One row (single entry or collapsed group)
// ---------------------------------------------------------------------------

interface EntryRowViewProps {
  row: EntryRow
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  selectionMode: boolean
  selected: Id[]
  onToggleSelect: (ids: Id[]) => void
  expanded: boolean
  onToggleExpand: () => void
  onDelete: (ids: Id[]) => void
  isMobile: boolean
  pushToast: PushToast
  onEditEntry: (entry: TimeEntry) => void
  onGoToProject?: (projectId: Id) => void
}

/**
 * A ROW IS REDRAWN WHEN SOMETHING IT SHOWS CHANGED — A SECOND ONLY FOR A RUNNING ONE.
 *
 * Every row got `nowSec`, so all of them (seven days of rows, each with its pickers)
 * were redrawn every second while a timer ran: ~130 ms long tasks a tick in the browser
 * with three months of entries (heavy-user audit of 2026-11-04, D6). The callbacks are
 * made fresh by each list render and are not compared: what they close over that can
 * change is the workspace (`state`), which is, so a row is never left holding a delete
 * that would act on an old copy of it.
 */
const rowTicks = new WeakMap<EntryRow, boolean>()
function rowIsRunning(row: EntryRow): boolean {
  let ticks = rowTicks.get(row)
  if (ticks === undefined) {
    ticks = row.entries.some(isRunning)
    rowTicks.set(row, ticks)
  }
  return ticks
}

function rowPropsEqual(prev: EntryRowViewProps, next: EntryRowViewProps): boolean {
  if (prev.nowSec !== next.nowSec && rowIsRunning(next.row)) return false
  return (
    prev.row === next.row &&
    prev.state === next.state &&
    prev.setState === next.setState &&
    prev.selectionMode === next.selectionMode &&
    prev.selected === next.selected &&
    prev.expanded === next.expanded &&
    prev.isMobile === next.isMobile &&
    prev.pushToast === next.pushToast &&
    prev.onEditEntry === next.onEditEntry &&
    prev.onGoToProject === next.onGoToProject
  )
}

const EntryRowView = memo(function EntryRowView({
  row,
  state,
  setState,
  nowSec,
  selectionMode,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
  onDelete,
  pushToast,
  onEditEntry,
  onGoToProject,
  isMobile,
}: EntryRowViewProps) {
  const lead = row.entries[0]
  const ids = row.entries.map((e) => e.id)
  const allSelected = ids.every((id) => selected.includes(id))

  return (
    <li>
      <EntryFields
        entry={lead}
        row={row}
        state={state}
        setState={setState}
        nowSec={nowSec}
        selectionMode={selectionMode}
        checked={allSelected}
        onCheck={() => onToggleSelect(ids)}
        onDelete={() => onDelete(ids)}
        pushToast={pushToast}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onEditEntry={onEditEntry}
        onGoToProject={onGoToProject}
        isMobile={isMobile}
      />
      {row.grouped && expanded && (
        <ul className="divide-y divide-border border-t border-border bg-secondary/20">
          {row.entries.map((entry) => (
            <li key={entry.id}>
              <EntryFields
                entry={entry}
                state={state}
                setState={setState}
                nowSec={nowSec}
                selectionMode={selectionMode}
                checked={selected.includes(entry.id)}
                onCheck={() => onToggleSelect([entry.id])}
                onDelete={() => onDelete([entry.id])}
                pushToast={pushToast}
                onEditEntry={onEditEntry}
                onGoToProject={onGoToProject}
                isMobile={isMobile}
                nested
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}, rowPropsEqual)

/**
 * One shared column template, so the project, tag, time and duration columns
 * line up down the whole list whether or not a row carries a group badge or a
 * long description — a flex row let each row's content decide its own columns.
 *
 * The description keeps a hard minimum: a bare `1fr` loses to the fixed tracks
 * and collapses to nothing on a narrow window. The tiers below give the space
 * back in the order the fields matter: 640–768px drops the start/end times
 * (still in the detail sheet), 768–1024px keeps the project and tag columns
 * modest, and above that they take their full width and the description grows.
 */
const ROW_GRID = {
  plain: cn(
    "sm:grid-cols-[24px_minmax(150px,1fr)_minmax(0,200px)_minmax(0,140px)_32px_0px_78px_auto]",
    "md:grid-cols-[24px_minmax(150px,1fr)_minmax(0,150px)_minmax(0,110px)_32px_120px_78px_auto]",
    "lg:grid-cols-[24px_minmax(150px,1fr)_200px_140px_32px_120px_78px_auto]",
  ),
  selecting: cn(
    "sm:grid-cols-[16px_24px_minmax(150px,1fr)_minmax(0,200px)_minmax(0,140px)_32px_0px_78px_auto]",
    "md:grid-cols-[16px_24px_minmax(150px,1fr)_minmax(0,150px)_minmax(0,110px)_32px_120px_78px_auto]",
    "lg:grid-cols-[16px_24px_minmax(150px,1fr)_200px_140px_32px_120px_78px_auto]",
  ),
}

function EntryFields({
  entry,
  row,
  state,
  setState,
  nowSec,
  selectionMode,
  checked,
  onCheck,
  onDelete,
  pushToast,
  expanded,
  onToggleExpand,
  onEditEntry,
  onGoToProject,
  isMobile,
  nested,
}: {
  entry: TimeEntry
  row?: EntryRow
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  selectionMode: boolean
  checked: boolean
  onCheck: () => void
  onDelete: () => void
  pushToast: PushToast
  expanded?: boolean
  onToggleExpand?: () => void
  onEditEntry: (entry: TimeEntry) => void
  onGoToProject?: (projectId: Id) => void
  /** which of the two layouts to build — see the note in `EntryList` */
  isMobile: boolean
  nested?: boolean
}) {
  const seconds = row ? row.totalSeconds : entrySeconds(entry, nowSec)
  const running = isRunning(entry)
  /**
   * On a day the entry reached from an earlier one (`continuedDays`): "from the
   * day before", and its end measured from THIS day — on a night's second
   * half the end is today, not "next day".
   */
  const continued = row?.continuedDays ? continuedMark(row.continuedDays) : null
  const shownOn = row?.continuedDays ? startOfDayIso(addDays(dateKey(entry.start), row.continuedDays)) : entry.start
  /** "next day" when the end is on a later day than the start, as the sheet says it */
  const endMark = endDayMark(shownOn, entry.stop)
  // not begun yet: striped, and in no total until it starts (Q2)
  const planned = isPlanned(entry, nowSec)
  const editable = canEditEntry(state, entry)
  const [description, setDescription] = useState(entry.description)
  // Keep the field in step when the entry changes elsewhere (bulk edit, undo, group edit)
  useEffect(() => {
    setDescription(entry.description)
  }, [entry.description])
  const [durationDraft, setDurationDraft] = useState<string | null>(null)
  /** a running entry's duration as it read on focus: the box holds still while you type */
  const [durationFrozen, setDurationFrozen] = useState<string | null>(null)
  const latestState = useRef(state)
  latestState.current = state
  const afterCheck = useContext(AfterCheckContext)
  const [startDraft, setStartDraft] = useState<string | null>(null)
  const [stopDraft, setStopDraft] = useState<string | null>(null)

  /**
   * ENTER COMMITS, ESCAPE THROWS THE EDIT AWAY. The three inline fields in this row —
   * start, end and duration — committed on blur and on nothing else, so typing a new
   * time and pressing Enter left the row looking edited while nothing had been written,
   * and Escape kept the change instead of cancelling it. The sheet's fields next door
   * already commit on the way out; these were the ones a person actually types into.
   *
   * Both keys work by blurring and letting the SINGLE blur handler do the writing.
   * Committing in the key handler and then blurring writes twice: React has not
   * re-rendered by the time blur fires, so the blur closure still holds the old draft.
   * Escape therefore parks a flag the blur handler reads — one ref for all three,
   * because only one of them can hold focus.
   */
  const discarding = useRef(false)
  const timeKeys = (clear: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      event.currentTarget.blur()
      return
    }
    if (event.key !== "Escape") return
    event.preventDefault()
    discarding.current = true
    clear()
    event.currentTarget.blur()
  }
  const project = state.projects.find((p) => p.id === entry.projectId)
  const nowIso = () => serverNowIso()

  const patch = (changes: Parameters<typeof updateEntry>[2]) => {
    // An edit made on a collapsed group applies to every entry in it, like Toggl
    if (row?.grouped) {
      const ids = row.entries.map((e) => e.id)
      const groupPatch = {
        projectId: changes.projectId,
        taskId: changes.taskId,
        billable: changes.billable,
        description: changes.description,
        tagIds: changes.tagIds,
      }
      // a locked day keeps its entries; the toast says how many and why (see `bulkEditEntries`)
      const preview = bulkEditEntries(latestState.current, ids, groupPatch, nowIso())
      if (preview.violations.length > 0) pushToast(keptMessage(preview.violations), "error")
      if (preview.changed.length === 0) return false
      setState((current) => bulkEditEntries(current, ids, groupPatch, nowIso()).state)
      return true
    }
    /**
     * Checked on the latest workspace and applied to whatever is current: an
     * answer to "That makes it 23 hours" is pressed later, after other changes,
     * and replacing the workspace with this render's copy would undo them.
     */
    const result = updateEntry(latestState.current, entry.id, changes, nowIso())
    if (result.violations.length > 0) {
      pushToast(result.violations[0].message, "error")
      return false
    }
    latestState.current = result.state
    setState((current) => {
      const applied = updateEntry(current, entry.id, changes, nowIso())
      return applied.violations.length > 0 ? current : applied.state
    })
    return true
  }

  const commitTime = (which: "start" | "stop", raw: string) => {
    // which day a bare time means: see `parseStartTimeInput` and `parseEndTimeInput`
    const iso =
      which === "start"
        ? parseStartTimeInput(raw, entry.start, entry.stop ?? nowIso())
        : parseEndTimeInput(raw, entry.start)
    if (!iso) {
      pushToast(unreadableTimeMessage(raw) ?? "Could not read that time", "error")
      return
    }
    const write = (at: string) => {
      /**
       * A touching neighbour moves with the edge (D12): see `withNeighbours`.
       * The row's start and end boxes are only drawn for a single entry, never
       * for a collapsed group, so this edits the one entry and not through
       * `patch`'s group path. A start after the end moves the entry
       * (`setEntryStart`), which moves no neighbour.
       */
      const now = nowIso()
      const apply = (base: TimetrackState) =>
        which === "stop"
          ? withNeighbours(base, entry.id, now, (edited) => updateEntry(edited, entry.id, { stop: at }, now))
          : typeStart(base, entry.id, at, now)
      const checked = apply(latestState.current)
      if (checked.violations[0]) {
        pushToast(checked.violations[0].message, "error")
        return
      }
      latestState.current = checked.state
      setState((current) => {
        const applied = apply(current)
        return applied.violations.length > 0 ? current : applied.state
      })
      if (which === "stop") announceNextDay(entry.start, at, checked.state, pushToast)
      announceNeighbours(checked, checked.state.user.timeFormat, setState, pushToast, () => latestState.current)
    }
    // longer than 12 hours, or 12 hours cut off a finished entry, asks first: see `askBeforeLong`
    const span = { start: entry.start, stop: entry.stop ?? nowIso(), running }
    askAboutTypedTime(which, iso, span, write, pushToast, state.user.timeFormat)
  }

  const commitDuration = (raw: string) => {
    const parsed = parseDurationInput(raw)
    if (parsed === null) {
      pushToast(DURATION_UNREADABLE, "error")
      return
    }
    // a running entry takes the timer bar's rule: shorter ends it, longer moves its start
    const options = { entryId: entry.id, shownSeconds: durationFrozen === null ? null : parseDurationInput(durationFrozen) }
    const apply = (base: TimetrackState) =>
      running
        ? setRunningElapsed(base, parsed, nowIso(), options)
        : { ...setEntryDuration(base, entry.id, parsed, nowIso()), stopped: null }
    // longer than 12 hours asks first: see `askBeforeLong`
    askBeforeLong(
      parsed,
      () => {
        const checked = apply(latestState.current)
        if (checked.violations[0]) {
          pushToast(checked.violations[0].message, "error")
          return
        }
        setState((current) => {
          const applied = apply(current)
          return applied.violations.length > 0 ? current : applied.state
        })
        if (checked.stopped) announceEndedEarly(checked.stopped, parsed, () => latestState.current, setState, pushToast)
      },
      pushToast,
      undefined,
      // a running timer keeps the bar's rule: a typed length is measured on its own
      running ? null : { seconds: entry.duration },
    )
  }

  /**
   * No ▶ on the row that is already running: a first-time user saw it and could
   * not tell what it would do (audit findability, 2026-11-05; the phone lost it
   * in Phase 3). Its slot holds ■ instead, which stops it, as Toggl Track's web
   * list has (Phase 8 Toggl-parity audit). It stops now, waits for the check
   * like every Stop (D2), and says so with the Undo Stop at… gives. Named "Stop
   * this timer": the bar's own is "Stop timer", and one name on two buttons in
   * one page is one too many for anyone finding them by name.
   */
  const stopHere = () =>
    (afterCheck ?? ((run) => run(latestState.current, nowIso())))((latest, tappedAt) => {
      const result = stopAt(latest, tappedAt, nowIso())
      if (result.violations[0] || !result.stopped || result.stopped.id !== entry.id) {
        pushToast(result.violations[0]?.message ?? "Nothing is running", "error")
        return
      }
      const stopped = result.stopped
      setState(layOnto(latest, result.state))
      const name = `“${stopped.description.trim() || "(no description)"}”`
      pushToast(`Stopped ${name} ${formatWhen(stopped.stop ?? tappedAt, latest.user.timeFormat, dateKey(nowIso()))}`, "info", () =>
        undoOrSay(() => latestState.current, (current) => undoStopAt(current, stopped.id, nowIso()), setState, pushToast),
      )
    })
  const continueButton = running ? (
    <button
      type="button"
      onClick={stopHere}
      aria-label="Stop this timer"
      title="Stop timer"
      className={cn(touchTarget, "rounded-full text-destructive hover:bg-destructive/10")}
    >
      <IconStop className="size-5 sm:size-4" />
    </button>
  ) : (
    <button
      type="button"
      onClick={() =>
        // held until the check after opening or waking lands, then run on the workspace as it is (D2)
        // stamped at the tap, not when the check let it through (bug audit A6)
        (afterCheck ?? ((run) => run(latestState.current, nowIso())))((latest, tappedAt) => {
          const result = continueEntry(latest, entry.id, tappedAt)
          if (result.violations.length > 0) {
            pushToast(result.violations[0].message, "error")
            return
          }
          setState(layOnto(latest, result.state))
          // This button is 8px from the row's own tap area. If the tap ended a
          // timer that was running, say which one and offer it back.
          const { displaced, started } = result
          if (displaced && started) {
            pushToast(
              `Stopped “${displaced.description.trim() || "(no description)"}” and started “${entry.description.trim() || "(no description)"}”`,
              "info",
              // both halves or neither, and a refusal is said (`undoDisplacement`)
              () => undoOrSay(() => latestState.current, (current) => undoDisplacement(current, started.id, displaced.id, nowIso()), setState, pushToast),
            )
          }
        })
      }
      title="Continue this entry (C)"
      aria-label="Continue this entry"
      className={cn(touchTarget, "rounded-md text-primary hover:bg-secondary/60")}
    >
      <IconStart className="size-5 sm:size-4" />
    </button>
  )

  const menu = (
    <EntryMenu
      entry={entry}
      state={state}
      setState={setState}
      running={running}
      project={project}
      onDelete={onDelete}
      pushToast={pushToast}
      onEditEntry={onEditEntry}
      onGoToProject={onGoToProject}
      nowIso={nowIso}
      pc={!isMobile}
    />
  )

  /** phones: two compact lines; the row itself opens the detail sheet */
  const phoneRow = (
    <div
      className={cn("flex items-center gap-1 px-3 py-2 sm:hidden", nested && "pl-11", running && "bg-primary/5")}
      style={planned ? plannedStripes : undefined}
    >
        {selectionMode && (
          <label className="flex size-11 shrink-0 items-center justify-center">
            <input type="checkbox" checked={checked} onChange={onCheck} aria-label="Select time entry" className="size-5" />
          </label>
        )}

        {/* its own control, not part of the tappable row: tapping the row opens
            the lead entry's sheet, which left the other entries in a group
            unreachable on a phone. Its column is what `pl-11` indents the
            expanded children by, so both line up — change one and change both.

            It was `w-7`: 28px wide, on the only control that opens the other
            entries in a group. Under the 44px this slice sets as its floor, and
            missed by the sweep for a reason worth knowing: the chip only exists
            on a GROUPED row, and the sweep was tracking a single entry. */}
        {row?.grouped ? (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? "Collapse group" : "Expand group"}
            aria-expanded={expanded}
            className="flex size-11 shrink-0 items-center justify-center"
          >
            <span className="flex size-6 items-center justify-center rounded bg-primary/15 text-[11px] font-semibold text-primary">
              {row.entries.length}
            </span>
          </button>
        ) : (
          !nested && state.user.groupSimilarEntries && <span className="w-11 shrink-0" />
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => onEditEntry(entry)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onEditEntry(entry)
          }}
          className="min-w-0 flex-1 py-1 text-left"
        >
          <div className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 truncate text-sm", !entry.description && "text-muted-foreground")}>
              {entry.description || "(no description)"}
            </span>
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {planned && <span className="mr-1.5 text-xs font-normal text-muted-foreground">planned</span>}
              {running ? formatClock(seconds) : formatDuration(seconds, state.user.durationFormat)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {project && <ColorDot color={project.color} />}
            <span className="min-w-0 flex-1 truncate">
              {project ? project.name : "No project"}
              {entry.tagIds.length > 0 && ` · ${tagNames(state, entry.tagIds).join(", ")}`}
            </span>
            {!row?.grouped && !entry.duronly && (
              <span className="shrink-0 tabular-nums">
                {continued && (
                  <span data-continued className="mr-1 text-[11px] text-primary">
                    {continued}
                  </span>
                )}
                {formatTimeLabel(entry.start, state)}–{entry.stop ? formatTimeLabel(entry.stop, state) : "now"}
                {endMark && (
                  <span data-end-day className="ml-1 text-[11px] text-primary">
                    {endMark}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      {continueButton}
      {menu}
    </div>
  )

  /** pointer devices: the full inline-editable row */
  const pointerRow = (
    <div
      className={cn(
        "group/row hidden items-center gap-2 px-3 py-2 sm:grid",
        selectionMode ? ROW_GRID.selecting : ROW_GRID.plain,
        running && "bg-primary/5",
      )}
      style={planned ? plannedStripes : undefined}
      title={planned ? "Planned: not counted until it starts" : undefined}
    >
        {selectionMode && <input type="checkbox" checked={checked} onChange={onCheck} aria-label="Select time entry" />}

        {row?.grouped ? (
          <button
            type="button"
            onClick={onToggleExpand}
            /* `size-11` never applies: this row is `hidden sm:grid`. Stated
               anyway so the source holds the 44px phone floor without an
               exception. */
            className="flex size-11 items-center justify-center rounded bg-primary/15 text-[11px] font-semibold text-primary sm:size-6"
            aria-label={expanded ? "Collapse group" : "Expand group"}
          >
            {row.entries.length}
          </button>
        ) : (
          <span />
        )}

        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          /*
            THE SAME TWO KEYS AS THE THREE FIELDS BESIDE IT. Those got Enter and Escape;
            this one kept commit-on-blur only, so within a single row Escape threw away
            a time edit and KEPT a description edit. One row, two rules, and the
            difference is invisible until it costs you something.
          */
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              event.currentTarget.blur()
              return
            }
            if (event.key !== "Escape") return
            event.preventDefault()
            discarding.current = true
            setDescription(entry.description)
            event.currentTarget.blur()
          }}
          onBlur={() => {
            if (discarding.current) {
              discarding.current = false
              setDescription(entry.description)
              return
            }
            if (description !== entry.description) patch({ description })
          }}
          disabled={!editable}
          // named for what it is: the placeholder alone made a screen reader call every row "(no description)"
          aria-label="Description"
          placeholder="(no description)"
          className={cn(
            // a ring while typing: with none, a new user could not tell the name had become a box (findability check, 2026-11-05)
            "w-full min-w-0 rounded-sm bg-transparent text-sm outline-none ring-ring placeholder:text-muted-foreground focus:ring-1 disabled:opacity-60",
            nested && "pl-4",
          )}
        />

        <ProjectPicker
          state={state}
          projectId={entry.projectId}
          taskId={entry.taskId}
          compact
          fill
          onChange={(projectId, taskId) => patch({ projectId, taskId })}
          onCreateProject={(name) => {
            // create + assign in ONE setState: two calls computed from this
            // render's state would overwrite each other. Computed outside the
            // updater so a refusal has somewhere to be said — the same shape
            // `patch` above uses.
            // checked on this render's state, applied to whatever is current —
            // a pull can land between the two and must not be overwritten
            const refusal = updateEntry(
              createProject(state, { name }, nowIso()).state,
              entry.id,
              { projectId: null, taskId: null },
              nowIso(),
            ).violations[0]
            setState((current) => {
              const made = createProject(current, { name }, nowIso())
              const result = updateEntry(made.state, entry.id, { projectId: made.id, taskId: null }, nowIso())
              // the project stays made even when the assignment is refused
              return result.violations.length > 0 ? made.state : result.state
            })
            if (refusal) pushToast(refusal.message, "error")
          }}
        />

        <TagPicker
          state={state}
          tagIds={entry.tagIds}
          align="right"
          fill
          onChange={(tagIds) => patch({ tagIds })}
          onCreateTag={(name) => {
            const checkTag = createTag(state, name, nowIso())
            const checkTarget = state.entries.find((e) => e.id === entry.id)
            const refusal = updateEntry(
              checkTag.state,
              entry.id,
              { tagIds: [...new Set([...(checkTarget?.tagIds ?? []), checkTag.id])] },
              nowIso(),
            ).violations[0]
            setState((current) => {
              const made = createTag(current, name, nowIso())
              const target = current.entries.find((e) => e.id === entry.id)
              const tagIds = [...new Set([...(target?.tagIds ?? []), made.id])]
              const result = updateEntry(made.state, entry.id, { tagIds }, nowIso())
              // the tag stays made even when the assignment is refused
              return result.violations.length > 0 ? made.state : result.state
            })
            if (refusal) pushToast(refusal.message, "error")
          }}
        />

        <BillableToggle billable={entry.billable} onChange={(billable) => patch({ billable })} disabled={!editable} />

        {/* the cell itself always stays in flow: a display:none grid child is
          skipped by auto-placement and shifts every later column. Clipped
          sideways only, so the "next day" under the end box still shows */}
        <div className="flex items-center justify-end overflow-x-clip">
          {!entry.duronly && !row?.grouped && (
            <div className="relative hidden items-center gap-1 text-xs md:flex">
              {/* under the start box, the way "next day" sits under the end box; the one shown when both would be */}
              {continued && (
                <span
                  data-continued
                  className="pointer-events-none absolute left-0 top-full whitespace-nowrap text-[9px] leading-none text-primary"
                >
                  {continued}
                </span>
              )}
              <input
                value={startDraft ?? formatTimeLabel(entry.start, state)}
                onChange={(event) => setStartDraft(event.target.value)}
                onKeyDown={timeKeys(() => setStartDraft(null))}
                onBlur={() => {
                  if (discarding.current) discarding.current = false
                  else if (startDraft !== null) commitTime("start", startDraft)
                  setStartDraft(null)
                }}
                disabled={!editable}
                // the number pad on a phone: "1155" is 11:55 (plan D11)
                inputMode="numeric"
                aria-label="Start time"
                className={cn(
                  timeInputWidth(state),
                  "rounded bg-transparent text-center tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60",
                )}
              />
              <span className="text-muted-foreground">–</span>
              {/* the end box, and under it the sheet's "next day" when the end is on a later day (B8) */}
              <span className="relative">
                <input
                  value={stopDraft ?? (entry.stop ? formatTimeLabel(entry.stop, state) : "now")}
                  onChange={(event) => setStopDraft(event.target.value)}
                  onKeyDown={timeKeys(() => setStopDraft(null))}
                  // "now" is a word, not a time: typing over it should not mean deleting it first
                  onFocus={(event) => event.currentTarget.select()}
                  onBlur={() => {
                    if (discarding.current) discarding.current = false
                    // on a running entry this stops it there, so a forgotten timer can end yesterday
                    else if (stopDraft !== null) commitTime("stop", stopDraft)
                    setStopDraft(null)
                  }}
                  disabled={!editable}
                  inputMode="numeric"
                  aria-label="End time"
                  className={cn(
                    timeInputWidth(state),
                    "rounded bg-transparent text-center tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60 disabled:text-muted-foreground",
                  )}
                />
                {endMark && !continued && (
                  <span
                    data-end-day
                    className="pointer-events-none absolute inset-x-0 top-full whitespace-nowrap text-center text-[9px] leading-none text-primary"
                  >
                    {endMark}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        <input
          value={durationDraft ?? durationFrozen ?? (running ? formatClock(seconds) : formatDuration(seconds, state.user.durationFormat))}
          onChange={(event) => setDurationDraft(event.target.value)}
          onKeyDown={timeKeys(() => setDurationDraft(null))}
          // a running clock rewrites the box every second, which threw away the caret and the selection
          onFocus={(event) => running && setDurationFrozen(event.currentTarget.value)}
          onBlur={() => {
            if (discarding.current) discarding.current = false
            else if (durationDraft !== null && durationDraft !== durationFrozen && !row?.grouped) commitDuration(durationDraft)
            setDurationDraft(null)
            setDurationFrozen(null)
          }}
          disabled={!editable || row?.grouped}
          // the decimal pad: "1.5" is an hour and a half (plan D11)
          inputMode="decimal"
          title={DURATION_HINT}
          aria-label="Duration"
          className="w-full rounded bg-transparent text-right text-sm tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60 disabled:opacity-100"
        />

      {/*
        ▶ AND ⋮ SHOW ON HOVER, as in Toggl Track's web list (D-PC-LIST): only
        where there is a pointer that hovers, so a touch screen at PC width
        still sees them, and kept while the row has the keyboard or its menu is
        open. Always on the running row.
      */}
      <div
        data-row-actions
        className={cn(
          "flex items-center justify-end",
          !running &&
            "pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:opacity-100 pointer-fine:has-[[aria-expanded=true]]:opacity-100",
        )}
      >
        {continueButton}
        {menu}
      </div>
    </div>
  )

  /**
   * ONE of the two, never both. The `sm:` variants stay on each so the layout
   * is still right through a resize, in the frame before the media-query
   * listener has reported it.
   */
  return isMobile ? phoneRow : pointerRow
}

/** Per-entry action menu, shared by the phone and pointer layouts */
/**
 * Per-entry action menu, shared by the phone and pointer layouts.
 *
 * ON THE PC, IN TOGGL TRACK'S ORDER AND WORDS (D-PC-LIST, Phase 5 item 4 of
 * Plans/toggl-parity.md): Split, Pin as favorite, Go to project, Copy
 * description, Copy start link, Duplicate, Delete [W25 15:31; Track web's
 * strings `TimeEntryContextMenu.*`]. "Edit details…", which Toggl's menu does
 * not have, is kept after them. The phone keeps its own order.
 */
export function EntryMenu({
  entry,
  state,
  setState,
  running,
  project,
  onDelete,
  pushToast,
  onEditEntry,
  onGoToProject,
  nowIso,
  pc,
}: {
  entry: TimeEntry
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  running: boolean
  project: TimetrackState["projects"][number] | undefined
  onDelete: () => void
  pushToast: (text: string, tone?: "info" | "error", undo?: () => void) => void
  onEditEntry: (entry: TimeEntry) => void
  onGoToProject?: (projectId: Id) => void
  nowIso: () => string
  /** the pointer layout: Toggl's order and words */
  pc?: boolean
}) {
  const favorite = Boolean(findFavorite(state, draftOf(entry)))
  return (
      <Dropdown
        align="right"
        width="w-48"
        ariaLabel="More actions for this time entry"
        trigger={() => (
          <span className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}>
            <IconMenu className="size-5 sm:size-4" />
          </span>
        )}
      >
        {(close) => {
          const duplicate = (
            <MenuItem
              key="duplicate"
              icon={<IconDuplicate className="size-3.5" />}
              label="Duplicate"
              onClick={() => {
                {
                  const refusal = duplicateEntry(state, entry.id, nowIso()).violations[0]
                  if (refusal) {
                    pushToast(refusal.message, "error")
                  } else {
                    setState((current) => {
                      const applied = duplicateEntry(current, entry.id, nowIso())
                      return applied.violations.length > 0 ? current : applied.state
                    })
                  }
                }
                close()
              }}
            />
          )
          const split = (
            <MenuItem
              key="split"
              icon={<IconSplit className="size-3.5" />}
              label={pc ? "Split" : "Split in two"}
              disabled={running || entry.duration <= MIN_SPLIT_SECONDS}
              hint={entry.duration <= MIN_SPLIT_SECONDS ? "Needs > 10 min" : undefined}
              onClick={() => {
                {
                  const result = splitEntry(state, entry.id, null, nowIso())
                  if (result.error) pushToast(result.error, "error")
                  else setState(layOnto(state, result.state))
                }
                close()
              }}
            />
          )
          const pin = (
            <MenuItem
              key="favorite"
              icon={<IconFavorite className="size-3.5" />}
              label={favorite ? "Remove favorite" : pc ? "Pin as favorite" : "Add to favorites"}
              onClick={() => {
                setState((current) => toggleFavorite(current, draftOf(entry), nowIso()))
                close()
              }}
            />
          )
          const copyLink = (
            <MenuItem
              key="link"
              icon={<IconLink className="size-3.5" />}
              label="Copy start link"
              onClick={() => {
                // the address this tracker is actually open at, not a guess
                const link = startLinkFor(entry, window.location.origin, window.location.pathname)
                navigator.clipboard?.writeText(link)
                pushToast("Start link copied to clipboard")
                close()
              }}
            />
          )
          const copyDescription = (
            <MenuItem
              key="description"
              icon={<IconCopyText className="size-3.5" />}
              label="Copy description"
              disabled={entry.description.trim() === ""}
              onClick={() => {
                navigator.clipboard?.writeText(entry.description)
                pushToast("Description copied to clipboard")
                close()
              }}
            />
          )
          const details = (
            <MenuItem
              key="details"
              icon={<IconEdit className="size-3.5" />}
              label="Edit details…"
              onClick={() => {
                onEditEntry(entry)
                close()
              }}
            />
          )
          // It set `#project-…` in the address, and nothing listened: the menu
          // closed and that was all. It now opens Projects on that project.
          const goToProject =
            project && onGoToProject ? (
              <MenuItem
                key="project"
                icon={<ColorDot color={project.color} />}
                label={pc ? "Go to project" : `Go to ${project.name}`}
                onClick={() => {
                  close()
                  onGoToProject(project.id)
                }}
              />
            ) : null
          const remove = (
            <MenuItem
              key="delete"
              icon={<IconDelete className="size-3.5" />}
              label="Delete"
              destructive
              onClick={() => {
                onDelete()
                close()
              }}
            />
          )
          const line = (key: string) => <div key={key} className="my-1 h-px bg-border" />
          return (
            <div className="py-1 text-sm">
              {pc
                ? [split, pin, goToProject, copyDescription, copyLink, duplicate, remove, line("extras"), details]
                : [duplicate, split, pin, copyLink, details, goToProject, line("delete"), remove]}
            </div>
          )
        }}
      </Dropdown>
  )
}

/**
 * THIS WAS A SECOND COPY OF `formatTimeOfDay`, WITH THE AM/PM DROPPED.
 *
 * In 12-hour mode it rendered 13:30 as "1:30" — the same string as 01:30 — and
 * that string is the value of an editable input whose blur runs it back through
 * `parseTimeInput`. With no meridiem to read, "1:45" is a quarter to two in the
 * morning, so changing an afternoon entry's minutes moved it back twelve hours.
 * The rest of the page was right the whole time, because the rest of the page
 * called the shared formatter that this was a copy of.
 *
 * It delegates now rather than being deleted outright, because the inputs need
 * the width the suffix takes and that is decided here too.
 */
function formatTimeLabel(iso: string, state: TimetrackState): string {
  return formatTimeOfDay(iso, state.user.timeFormat)
}

/**
 * Said when a typed end landed on the day after the start. That reading is what
 * lets a night's work be typed in, and it is also what a missing "pm" looks
 * like — "3:30" on a 2:00 PM entry is 3:30 the next morning — so it is never
 * silent.
 */
function announceNextDay(startIso: string, stopIso: string, state: TimetrackState, pushToast: PushToast) {
  if (dateKey(stopIso) === dateKey(startIso)) return
  pushToast(`Ends the next day, at ${formatTimeOfDay(stopIso, state.user.timeFormat)}`, "info")
}

/** "1:30 PM" needs more room than "13:30", and a clipped time is unreadable */
function timeInputWidth(state: TimetrackState): string {
  return state.user.timeFormat === "h12" ? "w-[72px]" : "w-[52px]"
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
  disabled,
  hint,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-secondary/60 disabled:opacity-40",
        touchRow,
        destructive && "text-destructive",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Overlap and gap marks (Phase 4, item 6)
// ---------------------------------------------------------------------------

/**
 * THE MARK BETWEEN TWO ENTRIES THAT DO NOT MEET.
 *
 * An overlap is time counted twice in the day's total, and in the list it
 * looked like nothing at all: the owner's records held three, from 33 seconds
 * to almost 4 minutes, and two small gaps, every one left by a hand fix. Red
 * for an overlap, with Fix; quiet for a gap, with Close gap. Each says what it
 * will do in its accessible name and puts it back with Undo.
 */
export function JointMark({
  joint,
  across,
  state,
  latest,
  setState,
  pushToast,
}: {
  joint: Joint
  /** between a day's first entry and one listed under an earlier day: the mark names that one */
  across: boolean
  state: TimetrackState
  /** the workspace when Undo is pressed: after a Fix this mark is gone, and its `state` with it */
  latest: () => TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  pushToast: PushToast
}) {
  const earlier = state.entries.find((e) => e.id === joint.earlierId)
  const later = state.entries.find((e) => e.id === joint.laterId)
  if (!earlier || !later) return null
  const format = state.user.timeFormat
  const quoted = (entry: TimeEntry) => `“${entry.description.trim() || "(no description)"}”`
  const overlap = joint.kind === "overlap"
  // Fix ends the earlier where the later starts; Close gap starts the later where the earlier ended
  const moment = overlap ? later.start : (earlier.stop ?? later.start)
  const time = formatTimeOfDay(moment, format)

  const mend = () => {
    const now = serverNowIso()
    const result = mendJoint(state, joint, now)
    if (result.violations[0]) {
      pushToast(result.violations[0].message, "error")
      return
    }
    setState((current) => {
      const applied = mendJoint(current, joint, now)
      return applied.violations.length > 0 ? current : applied.state
    })
    // Undo puts back the one edge the fix moved — never a running timer's: Fix does not end one (`mendJoint`)
    const undo = (current: TimetrackState): { state: TimetrackState; violations: SaveViolation[] } =>
      overlap
        ? updateEntry(current, earlier.id, { stop: earlier.stop }, serverNowIso())
        : updateEntry(current, later.id, { start: later.start }, serverNowIso())
    pushToast(
      overlap ? `Ended ${quoted(earlier)} at ${time}, where ${quoted(later)} starts` : `Started ${quoted(later)} at ${time}, where ${quoted(earlier)} ended`,
      "info",
      () => undoOrSay(latest, undo, setState, pushToast),
    )
  }

  /**
   * Said in words where Fix would cut more than the overlap, and no button: a
   * call inside a 10:00–12:00, or inside a timer still running (`noFixFor`).
   * Which part was really the call is the owner's to say, in the sheet.
   */
  const why =
    joint.noFix === "inside" ? `${quoted(later)} is inside ${quoted(earlier)}` : joint.noFix === "running" ? `${quoted(earlier)} is still running` : null
  const span = formatIdleSpan(joint.seconds)
  const said = [
    overlap ? `Overlap of ${span}${across ? ` with ${quoted(earlier)}` : ""}` : `Gap of ${span}${across ? ` after ${quoted(earlier)}` : ""}`,
    why,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li
      data-joint={joint.kind}
      className={cn("flex min-h-11 items-center gap-2 px-3 text-[11px] sm:min-h-7", overlap ? "text-destructive" : "text-muted-foreground")}
    >
      <span aria-hidden className={cn("h-px min-w-4 flex-1", overlap ? "bg-destructive/70" : "bg-border")} />
      <span className="min-w-0 text-center">{said}</span>
      {!why && (
        <button
          type="button"
          aria-label={overlap ? `Fix: end ${quoted(earlier)} at ${time}` : `Close gap: start ${quoted(later)} at ${time}`}
          onClick={mend}
          className="min-h-11 shrink-0 rounded px-2 font-medium underline-offset-2 hover:underline sm:min-h-7"
        >
          {overlap ? "Fix" : "Close gap"}
        </button>
      )}
      <span aria-hidden className={cn("h-px w-6 shrink-0", overlap ? "bg-destructive/70" : "bg-border")} />
    </li>
  )
}

// ---------------------------------------------------------------------------
// Bulk edit
// ---------------------------------------------------------------------------

/** "17 entries not changed: Time entries on or before … are locked" */
function keptMessage(violations: { message: string }[]): string {
  return `${plural(violations.length, "entry", "entries")} not changed: ${violations[0].message}`
}

function BulkEditBar({
  state,
  setState,
  selected,
  onClear,
  onDelete,
  pushToast,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  selected: Id[]
  onClear: () => void
  onDelete: () => void
  pushToast: PushToast
}) {
  const apply = (patch: Parameters<typeof bulkEditEntries>[2]) => {
    const now = serverNowIso()
    // the entries on a locked day stay as they were, and the toast says how many
    const preview = bulkEditEntries(state, selected, patch, now)
    if (preview.violations.length > 0) pushToast(keptMessage(preview.violations), "error")
    setState((current) => bulkEditEntries(current, selected, patch, now).state)
  }

  return (
    <div className="fixed inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-[9400] flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-card px-3 py-2 text-sm shadow-xl sm:static sm:inset-auto sm:bg-primary/10 sm:shadow-none">
      <span className="font-medium">{selected.length} selected</span>
      <div className="mx-1 h-5 w-px bg-border" />
      <ProjectPicker
        state={state}
        projectId={null}
        taskId={null}
        compact
        onChange={(projectId, taskId) => apply({ projectId, taskId })}
      />
      <TagPicker state={state} tagIds={[]} onChange={(tagIds) => apply({ addTagIds: tagIds })} />
      <Button size="sm" variant="ghost" className="h-11 sm:h-7" onClick={() => apply({ billable: true })}>
        Mark billable
      </Button>
      <Button size="sm" variant="ghost" className="h-11 sm:h-7" onClick={() => apply({ billable: false })}>
        Mark non-billable
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="destructive" className="h-11 sm:h-7" onClick={onDelete}>
          <IconDelete className="size-3.5" /> Delete
        </Button>
        <Button size="sm" variant="ghost" className="h-11 sm:h-7" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
}

/** Full-detail editor used by the row menu and the calendar view */
export function EntryDetailModalBody({
  entry,
  state,
  setState,
  pushToast,
  nowSec = Math.floor(serverNow() / 1000),
}: {
  entry: TimeEntry
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  pushToast: PushToast
  /** the running clock, so a running entry's duration counts here too */
  nowSec?: number
}) {
  const [description, setDescription] = useState(entry.description)
  const nowIso = () => serverNowIso()
  const running = isRunning(entry)
  const timeFormat = state.user.timeFormat

  const latestState = useRef(state)
  latestState.current = state
  const afterCheck = useContext(AfterCheckContext)

  /**
   * ON THIS SHEET, AN EDIT IS SAVED WHEN IT IS MADE.
   *
   * It used to be half and half: the project, tag and billable controls
   * committed as you touched them, while the description and the times waited
   * behind a button labelled "Save times". So a description typed here and a
   * sheet closed the way a phone closes one — the X — lost the description with
   * no warning, and the button's name never suggested it had anything to do
   * with the field above it. Reproduced before this was changed.
   *
   * There is no button now. Text lands on a pause and on the way out (see
   * `useDebouncedCommit`, which also flushes when this sheet unmounts); the
   * times land when you leave the field.
   */
  const land = (result: { state: TimetrackState; violations: { message: string }[] }): boolean => {
    if (result.violations.length > 0) {
      pushToast(result.violations[0].message, "error")
      return false
    }
    /**
     * ADVANCE THE SNAPSHOT, OR TWO COMMITS IN ONE TICK EAT EACH OTHER.
     *
     * On unmount React runs every cleanup before it renders anything, so the
     * description's flush and the times' flush both read `latestState.current`
     * — and whichever runs second overwrites the first. Cleanup order is
     * declaration order, so the times landed and the description was silently
     * discarded: the exact defect this sheet was repaired for, moved one field
     * to the left. Found by a reviewer; no test typed in both fields before
     * leaving, so nothing caught it.
     */
    const drawn = latestState.current
    latestState.current = result.state
    setState(layOnto(drawn, result.state))
    return true
  }
  const commit = (patch: Parameters<typeof updateEntry>[2]): boolean =>
    land(updateEntry(latestState.current, entry.id, patch, nowIso()))

  /**
   * `land` for a write that may happen LATER: the answer to "That makes it 23
   * hours", pressed after other changes or after this sheet has closed — when
   * `latestState` is no longer kept current. Checked on the latest copy this
   * sheet has, and applied to whatever the workspace is by then, so it cannot
   * replace newer work with an old copy.
   */
  const landOnCurrent = <R extends { state: TimetrackState; violations: { message: string }[] }>(
    apply: (base: TimetrackState) => R,
  ): R | null => {
    const checked = apply(latestState.current)
    if (checked.violations.length > 0) {
      pushToast(checked.violations[0].message, "error")
      return null
    }
    latestState.current = checked.state
    setState((current) => {
      const applied = apply(current)
      return applied.violations.length > 0 ? current : applied.state
    })
    return checked
  }

  const commitDescription = useDebouncedCommit<string>((value) => {
    commit({ description: value })
  })

  /**
   * DATE, START, END AND DURATION ARE FOUR BOXES, AND EACH ONE MEANS ONE THING.
   *
   * This was two `datetime-local` boxes, a date and a time in each. Moving an
   * entry to yesterday meant changing the date twice, and changing it once
   * made a 25-hour entry. A night's work needed the end's date changed by hand.
   * And a running entry's end was locked, so a timer forgotten overnight could
   * only be stopped now and then repaired.
   *
   * Now: the date moves the whole entry and keeps its length; the start moves
   * the start (or the entry, when it lands after the end — see
   * `setEntryStart`); the end is read as the first such time after the start, so
   * "01:00" after "22:00" is the next morning; the duration moves the end.
   * On a running entry the end and a shorter duration stop it there.
   *
   * One box is edited at a time, so one slot holds the edit. It is a ref as
   * well as state because the unmount flush runs after the last render.
   *
   * A box holds still from the moment it is focused (`hold`): a running
   * entry's duration is rewritten every second, which threw the selection and
   * the caret away mid-word. What it read then is also what "unchanged" means —
   * text retyped as it was is not an edit, and must not drop the seconds the
   * box cannot show.
   */
  type TimeField = "day" | "start" | "stop" | "duration"
  /** `edited`: typed into since focus, not only held (a held box is not something to read back) */
  const [typed, setTyped] = useState<{ field: TimeField; text: string; edited?: boolean } | null>(null)
  const pending = useRef<{ field: TimeField; text: string } | null>(null)
  const heldText = useRef<string | null>(null)
  const hold = (field: TimeField, text: string) => {
    heldText.current = text
    setTyped({ field, text })
  }
  const type = (field: TimeField, text: string) => {
    pending.current = { field, text }
    setTyped({ ...pending.current, edited: true })
  }
  const shown = (field: TimeField, stored: string) => (typed?.field === field ? typed.text : stored)

  /**
   * THE DRUMS HOLD A PAIR UNTIL ✓ (Phase 5; see `EntryDrums`).
   *
   * `drumPair` is the start and end the drums have been turned to and not
   * saved yet; null while they show the entry as it is. While one is held, the
   * boxes, the ±5 buttons and the one-tap fixes show and change THAT pair —
   * a typed end is read after the drums' start, not the saved one — so every
   * control on the sheet agrees with the drums, and ✓ saves both ends as one
   * change. A ref as well as state, because the way out runs after the last
   * render.
   */
  const savedPair: TimePair = { start: entry.start, stop: entry.stop }
  const [drumPair, setDrumPair] = useState<TimePair | null>(null)
  const drumPairRef = useRef<TimePair | null>(null)
  const holdDrums = (next: TimePair | null) => {
    const value = next && !samePair(next, savedPair) ? next : null
    drumPairRef.current = value
    setDrumPair(value)
  }
  const pair = drumPair ?? savedPair
  /** with the drums holding a pair, a control changes that pair; otherwise it saves, as it always has */
  const onPairOr = (change: (held: TimePair) => TimePair, save: () => void) => {
    const held = drumPairRef.current
    if (held) holdDrums(change(held))
    else save()
  }

  const commitTimes = () => {
    const edit = pending.current
    const held = heldText.current
    pending.current = null
    heldText.current = null
    setTyped(null)
    if (!edit || edit.text === held) return
    const current = latestState.current.entries.find((e) => e.id === entry.id) ?? entry
    const text = edit.text.trim()

    const drumsHeld = drumPairRef.current
    if (drumsHeld) {
      const next = typedIntoPair(drumsHeld, edit.field, text, nowIso())
      if (!next) {
        pushToast(
          edit.field === "duration" ? DURATION_UNREADABLE : (unreadableTimeMessage(text) ?? "Could not read that time — try 9:30, 930 or 9:30 pm"),
          "error",
        )
        return
      }
      holdDrums(next)
      return
    }

    if (edit.field === "day") {
      land(moveEntryToDay(latestState.current, entry.id, text, nowIso()))
      return
    }
    if (edit.field === "duration") {
      const seconds = parseDurationInput(text)
      if (seconds === null) {
        pushToast(DURATION_UNREADABLE, "error")
        return
      }
      // longer than 12 hours asks first: see `askBeforeLong`
      askBeforeLong(
        seconds,
        () => {
          if (isRunning(current)) {
            // shorter ends it, longer moves its start: see `setRunningElapsed`
            const shownSeconds = held === null ? null : parseDurationInput(held)
            const options = { entryId: entry.id, shownSeconds }
            const result = landOnCurrent((base) => setRunningElapsed(base, seconds, nowIso(), options))
            if (result?.stopped) announceEndedEarly(result.stopped, seconds, () => latestState.current, setState, pushToast)
            return
          }
          landOnCurrent((base) => setEntryDuration(base, entry.id, seconds, nowIso()))
        },
        pushToast,
        undefined,
        // a running timer keeps the bar's rule: a typed length is measured on its own
        isRunning(current) ? null : { seconds: current.duration },
      )
      return
    }
    if (edit.field === "stop" && !text) {
      // nothing typed into a running entry's end is no change; on a finished
      // one it is a restart, which `updateEntry` refuses and says why
      if (!isRunning(current)) commit({ stop: null })
      return
    }
    // which day a bare time means: see `parseStartTimeInput` and `parseEndTimeInput`
    const iso =
      edit.field === "start"
        ? parseStartTimeInput(text, current.start, current.stop ?? nowIso())
        : parseEndTimeInput(text, current.start)
    if (!iso) {
      pushToast(unreadableTimeMessage(text) ?? "Could not read that time — try 9:30, 930 or 9:30 pm", "error")
      return
    }
    const field = edit.field
    const write = (at: string) => {
      // a touching neighbour moves with the edge (D12); a start after the end moves the entry (`setEntryStart`)
      const now = nowIso()
      const landed = landOnCurrent((base) =>
        field === "stop"
          ? withNeighbours(base, entry.id, now, (edited) => updateEntry(edited, entry.id, { stop: at }, now))
          : typeStart(base, entry.id, at, now),
      )
      if (!landed) return
      if (field === "stop") announceNextDay(current.start, at, latestState.current, pushToast)
      announceNeighbours(landed, latestState.current.user.timeFormat, setState, pushToast, () => latestState.current)
    }
    // longer than 12 hours, or 12 hours cut off a finished entry, asks first: see `askBeforeLong`
    const span = { start: current.start, stop: current.stop ?? nowIso(), running: isRunning(current) }
    askAboutTypedTime(field, iso, span, write, pushToast, latestState.current.user.timeFormat)
  }

  /**
   * On blur, and on the way out. Escape closes this sheet without firing blur,
   * and a time typed then abandoned used to be lost in silence while the
   * description beside it was kept.
   */
  const stagedTimes = useStagedEdit(commitTimes)

  /** ✓: both ends at once. One edge moved takes a touching neighbour along (D12); both moved is a move, and does not. */
  const landPair = (target: TimePair) => {
    const now = nowIso()
    const patch = target.stop === null ? { start: target.start } : { start: target.start, stop: target.stop }
    const landed = landOnCurrent((base) => withNeighbours(base, entry.id, now, (edited) => updateEntry(edited, entry.id, patch, now)))
    if (!landed) return
    drumPairRef.current = null
    setDrumPair(null)
    announceNeighbours(landed, latestState.current.user.timeFormat, setState, pushToast, () => latestState.current)
  }

  /**
   * Turned and left: the sheet keeps the pair on the way out, like the boxes do
   * — except what cannot be saved (an end before its start, said instead), and a
   * running timer's Stop at… left open, which is not a Stop until ✓ says so.
   * Declared after the boxes' flush, so a time typed into a box while the
   * drums held a pair reaches the pair before it lands.
   */
  useStagedEdit(() => {
    const target = drumPairRef.current
    if (!target) return
    drumPairRef.current = null
    // to the millisecond, as `updateEntry` counts it
    if (target.stop !== null && Date.parse(target.stop) < Date.parse(target.start)) {
      pushToast("Times not changed: the end was before the start", "error")
      return
    }
    if (isRunning(entry) && target.stop !== null) {
      pushToast("Still running: Stop at… was closed without ✓", "info")
      return
    }
    const seconds = target.stop === null ? 0 : epochSeconds(target.stop) - epochSeconds(target.start)
    askBeforeLong(seconds, () => landPair(target), pushToast)
  })

  // Enter finishes the box; Escape is the sheet's, and keeps what was typed
  const enterCommits = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    event.currentTarget.blur()
  }
  const timeBox = (field: "start" | "stop" | "duration", label: string, stored: string, placeholder?: string) => (
    <Input
      // the number pad on a phone: "1155" is 11:55, and "1.5" an hour and a half (plan D11)
      inputMode={field === "duration" ? "decimal" : "numeric"}
      value={shown(field, stored)}
      onChange={(event) => type(field, event.target.value)}
      onFocus={(event) => {
        hold(field, event.currentTarget.value)
        event.currentTarget.select()
      }}
      onBlur={stagedTimes.flush}
      onKeyDown={enterCommits}
      placeholder={placeholder}
      aria-label={label}
      className="text-center tabular-nums sm:h-8"
    />
  )

  /**
   * THE ONE-TAP FIXES (Phase 4, item 4): −5 / +5 on each end, "Start where the
   * last one ended", "End where the next one starts" and "End now".
   *
   * Every fix here used to be a clock time read off one place and typed into
   * another — and the seconds of the entry next door are not shown anywhere,
   * which is how the owner's hand fixes left overlaps of 33 and 41 seconds.
   * These take the time itself. Each is an end or a start edit, so a touching
   * neighbour moves with it (D12), and the ones that can reach far — the entry
   * before may have ended yesterday — ask first when the result is over 12
   * hours (D10). Ending a running timer is a Stop, so that waits for the check
   * like Stop does (D2).
   */
  const oneTap = (apply: (base: TimetrackState, now: IsoDateTime) => { state: TimetrackState; violations: SaveViolation[] }, askIfLong = false) => {
    const run = () => {
      const now = nowIso()
      const landed = landOnCurrent((base) => withNeighbours(base, entry.id, now, (edited) => apply(edited, now)))
      if (landed) announceNeighbours(landed, latestState.current.user.timeFormat, setState, pushToast, () => latestState.current)
    }
    if (!askIfLong) {
      run()
      return
    }
    const checked = apply(latestState.current, nowIso())
    if (checked.violations[0]) {
      pushToast(checked.violations[0].message, "error")
      return
    }
    const fixed = checked.state.entries.find((e) => e.id === entry.id)
    askBeforeLong(fixed ? entrySeconds(fixed, Math.floor(serverNow() / 1000)) : 0, run, pushToast)
  }
  /**
   * A fix that ends a running timer goes through the check (D2), on the
   * workspace as it is when it lands, with the moment of the tap (bug audit A6)
   */
  const stopsTheTimer = (fix: (tappedAt: IsoDateTime) => void) => {
    if (!running || !afterCheck) {
      fix(nowIso())
      return
    }
    afterCheck((latest, tappedAt) => {
      latestState.current = latest
      fix(tappedAt)
    })
  }
  const before = entryBefore(state, entry.id)
  const after = entryAfter(state, entry.id)
  const nudge = (edge: "start" | "stop", minutes: number, label: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={label}
      onClick={() =>
        onPairOr(
          (held) => nudgePair(held, edge, minutes * 60),
          () => oneTap((base, now) => shiftEdge(base, entry.id, edge, minutes * 60, now)),
        )
      }
      className="h-11 min-w-0 flex-1 px-0 tabular-nums sm:h-7"
    >
      {minutes < 0 ? `−${-minutes}` : `+${minutes}`}
    </Button>
  )

  // what the boxes show: the drums' pair while they hold one, the entry otherwise
  const endDays = pair.stop ? daysBetween(dateKey(pair.start), dateKey(pair.stop)) : 0
  const typedLength = typed?.field === "duration" && typed.edited ? parseDurationInput(typed.text) : null
  const durationReading = typedLength === null ? null : `${typed!.text.trim()} = ${formatIdleSpan(typedLength)}`
  // an end the drums set before the start has no length to show: "Ends before it starts" says why
  const backwards = pair.stop !== null && Date.parse(pair.stop) < Date.parse(pair.start)
  const durationShown =
    pair.stop === null
      ? formatClock(drumPair ? Math.max(0, nowSec - epochSeconds(pair.start)) : entrySeconds(entry, nowSec))
      : backwards
        ? ""
        : formatDuration(epochSeconds(pair.stop) - epochSeconds(pair.start), state.user.durationFormat)

  return (
    <div className="space-y-3">
      <Input
        value={description}
        onChange={(event) => {
          setDescription(event.target.value)
          commitDescription.schedule(event.target.value)
        }}
        onBlur={commitDescription.flush}
        placeholder="Description"
      />
      <div className="flex flex-wrap gap-2">
        <ProjectPicker
          state={state}
          projectId={entry.projectId}
          taskId={entry.taskId}
          onChange={(projectId, taskId) => commit({ projectId, taskId })}
        />
        <TagPicker state={state} tagIds={entry.tagIds} onChange={(tagIds) => commit({ tagIds })} />
        <BillableToggle billable={entry.billable} onChange={(billable) => commit({ billable })} />
      </div>
      <div className="space-y-2">
        {/* the drums sit above the boxes, and both show the same pair (Phase 5) */}
        <EntryDrums
          pair={pair}
          held={drumPair !== null}
          running={running}
          nowIso={isoFromEpochSeconds(nowSec)}
          timeFormat={timeFormat}
          durationFormat={state.user.durationFormat}
          onTurn={holdDrums}
          onSet={() => {
            const target = drumPairRef.current
            if (!target) return
            // ending a running timer is a Stop: it waits for the check like Stop does (D2)
            if (running && target.stop !== null) stopsTheTimer(() => landPair(target))
            else landPair(target)
          }}
          onCancel={() => holdDrums(null)}
        />
        {/* the date box, for a day further back than the drums go */}
        <DayPicker
          value={shown("day", dateKey(pair.start))}
          onChange={(day) => type("day", day)}
          onBlur={stagedTimes.flush}
          onStep={(day) => {
            pending.current = null
            setTyped(null)
            onPairOr(
              (held) => typedIntoPair(held, "day", day, nowIso()) ?? held,
              () => land(moveEntryToDay(latestState.current, entry.id, day, nowIso())),
            )
          }}
          todayKey={dateKey(new Date(nowSec * 1000))}
        />
        {/* each caption in the same block, so the three boxes line up */}
        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Start</span>
            {timeBox("start", "Start time", formatTimeOfDay(pair.start, timeFormat))}
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="flex items-baseline justify-between gap-1">
              End
              {endDays > 0 && <span className="text-[11px] text-primary">{endDays === 1 ? "next day" : `+${endDays} days`}</span>}
            </span>
            {timeBox("stop", "End time", pair.stop ? formatTimeOfDay(pair.stop, timeFormat) : "", running ? "running" : undefined)}
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Duration</span>
            {timeBox("duration", "Duration", durationShown, backwards ? "—" : undefined)}
          </label>
        </div>
        {/* under the box each one moves, so a thumb finds them where it just was */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex gap-1">
            {nudge("start", -5, "Start 5 minutes earlier")}
            {nudge("start", 5, "Start 5 minutes later")}
          </div>
          {/* a running timer has no end to nudge; End now, below, is its Stop */}
          <div className="flex gap-1">
            {!running && nudge("stop", -5, "End 5 minutes earlier")}
            {!running && nudge("stop", 5, "End 5 minutes later")}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {before?.stop && before.stop !== pair.start && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 sm:h-7"
              onClick={() =>
                onPairOr(
                  (held) => ({ ...held, start: before.stop! }),
                  () => oneTap((base, now) => startWhereLastEnded(base, entry.id, now), true),
                )
              }
            >
              Start where the last one ended
            </Button>
          )}
          {after && after.start !== pair.stop && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 sm:h-7"
              onClick={() =>
                onPairOr(
                  (held) => ({ ...held, stop: after.start }),
                  () => stopsTheTimer(() => oneTap((base, now) => endWhereNextStarts(base, entry.id, now), true)),
                )
              }
            >
              End where the next one starts
            </Button>
          )}
          {/* not on an entry that has not begun: it would end before it starts */}
          {epochSeconds(pair.start) <= nowSec && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 sm:h-7"
              onClick={() =>
                onPairOr(
                  (held) => ({ ...held, stop: nowIso() }),
                  () => stopsTheTimer((tappedAt) => oneTap((base) => endNow(base, entry.id, tappedAt), !running)),
                )
              }
            >
              End now
            </Button>
          )}
        </div>
        {/* while a length is typed, what it will be read as; otherwise the rule (B7) */}
        <p className="text-xs text-muted-foreground">{durationReading ?? `Duration: ${DURATION_HINT}`}</p>
        {running && (
          <p className="text-xs text-muted-foreground">
            Still running. Forgot to stop it? Type when it ended, or how long you worked, and it ends there.
          </p>
        )}
      </div>
      {/* the box stays 16px; the label is the target, as everywhere else here */}
      <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground sm:min-h-0">
        <input
          type="checkbox"
          checked={entry.duronly}
          onChange={(event) => commit({ duronly: event.target.checked })}
        />
        Duration only (hide start and end times)
      </label>
      <div className={cn("space-y-1", state.members.filter((m) => !m.isSelf).length === 0 && "hidden")}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Shared with</p>
        <div className="flex flex-wrap gap-1">
          {state.members
            .filter((m) => !m.isSelf)
            .map((member) => {
              const shared = entry.sharedWith.includes(member.id)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() =>
                    commit({
                      sharedWith: shared
                        ? entry.sharedWith.filter((id) => id !== member.id)
                        : [...entry.sharedWith, member.id],
                    })
                  }
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs",
                    shared ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {member.name}
                </button>
              )
            })}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Created with {entry.createdWith}
        {entry.sourceEventId ? " · imported from a calendar event" : ""} · last updated {formatDate(dateKey(entry.at), state.user.dateFormat)} {formatTimeOfDay(entry.at, state.user.timeFormat)}
      </p>
    </div>
  )
}
