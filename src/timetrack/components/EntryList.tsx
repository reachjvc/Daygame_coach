"use client"

/**
 * The timer-page entry list: day buckets with totals, collapsed identical
 * entries, inline editing of every field, per-entry menu (continue, duplicate,
 * split, favorite, copy start link, delete) and multi-select bulk edit.
 */

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MIN_SPLIT_SECONDS } from "../config"
import { useDebouncedCommit } from "../hooks/useDebouncedCommit"
import { useStagedEdit } from "../hooks/useStagedEdit"
import { useIsMobile } from "../hooks/useIsMobile"
import {
  IconDelete,
  IconDuplicate,
  IconEdit,
  IconFavorite,
  IconLink,
  IconMenu,
  IconSplit,
  IconStart,
} from "../icons"
import {
  dateKey,
  formatClock,
  formatDate,
  formatDayHeader,
  formatDuration,
  formatTimeOfDay,
  fromLocalInputValue,
  parseDurationInput,
  parseTimeInput,
  toLocalInputValue,
} from "../timetrackFormatService"
import {
  bulkEditEntries,
  buildDayGroups,
  canEditEntry,
  continueEntry,
  createProject,
  createTag,
  deleteEntries,
  draftOf,
  duplicateEntry,
  entrySeconds,
  findFavorite,
  isRunning,
  liveEntries,
  restoreEntries,
  setEntryDuration,
  splitEntry,
  startLinkFor,
  undoDisplacement,
  tagNames,
  toggleFavorite,
  updateEntry,
  weekTotalSeconds,
} from "../timetrackService"
import type { EntryRow, Id, TimeEntry, TimetrackState } from "../types"
import { BillableToggle, ProjectPicker, TagPicker } from "./pickers"
import { ColorDot, Dropdown, EmptyState, touchRow, touchTarget } from "./primitives"

interface EntryListProps {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  nowSec: number
  pushToast: (text: string, tone?: "info" | "error", undo?: () => void) => void
  onEditEntry: (entry: TimeEntry) => void
}

export function EntryList({ state, setState, nowSec, pushToast, onEditEntry }: EntryListProps) {
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

  const entries = liveEntries(state)
  const allGroups = buildDayGroups(entries, { groupSimilar: state.user.groupSimilarEntries, nowSec })
  const groups = allGroups.slice(0, visibleDays)
  const todayKey = dateKey(new Date(nowSec * 1000))
  const weekSeconds = weekTotalSeconds(entries, todayKey, state.user.weekStart, nowSec)

  const toggleSelect = (ids: Id[]) => {
    setSelected((current) => {
      const allSelected = ids.every((id) => current.includes(id))
      return allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]
    })
  }

  const nowIso = () => new Date().toISOString()

  const removeEntries = (ids: Id[]) => {
    const result = deleteEntries(state, ids, nowIso())
    setState(() => result.state)
    pushToast(`${ids.length} time ${ids.length === 1 ? "entry" : "entries"} deleted`, "info", () =>
      setState((latest) => restoreEntries(latest, result.removed)),
    )
    setSelected((current) => current.filter((id) => !ids.includes(id)))
  }

  if (entries.length === 0) {
    return <EmptyState title="No time entries yet" hint="Start the timer above, or switch to manual mode to add time you already worked." />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          This week{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatDuration(weekSeconds, state.user.durationFormat)}
          </span>
        </p>
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
            {group.rows.map((row) => (
              <EntryRowView
                key={row.key}
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
                isMobile={isMobile}
              />
            ))}
          </ul>
        </section>
      ))}

      {allGroups.length > visibleDays && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setVisibleDays((v) => v + 7)}>
            Load more days ({allGroups.length - visibleDays} left)
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// One row (single entry or collapsed group)
// ---------------------------------------------------------------------------

function EntryRowView({
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
  isMobile,
}: {
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
  pushToast: (text: string, tone?: "info" | "error", undo?: () => void) => void
  onEditEntry: (entry: TimeEntry) => void
}) {
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
                isMobile={isMobile}
                nested
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

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
  pushToast: (text: string, tone?: "info" | "error", undo?: () => void) => void
  expanded?: boolean
  onToggleExpand?: () => void
  onEditEntry: (entry: TimeEntry) => void
  /** which of the two layouts to build — see the note in `EntryList` */
  isMobile: boolean
  nested?: boolean
}) {
  const seconds = row ? row.totalSeconds : entrySeconds(entry, nowSec)
  const running = isRunning(entry)
  const editable = canEditEntry(state, entry)
  const [description, setDescription] = useState(entry.description)
  // Keep the field in step when the entry changes elsewhere (bulk edit, undo, group edit)
  useEffect(() => {
    setDescription(entry.description)
  }, [entry.description])
  const [durationDraft, setDurationDraft] = useState<string | null>(null)
  const [startDraft, setStartDraft] = useState<string | null>(null)
  const [stopDraft, setStopDraft] = useState<string | null>(null)
  const project = state.projects.find((p) => p.id === entry.projectId)
  const nowIso = () => new Date().toISOString()

  const patch = (changes: Parameters<typeof updateEntry>[2]) => {
    // An edit made on a collapsed group applies to every entry in it, like Toggl
    if (row?.grouped) {
      const ids = row.entries.map((e) => e.id)
      setState((current) =>
        bulkEditEntries(
          current,
          ids,
          {
            projectId: changes.projectId,
            taskId: changes.taskId,
            billable: changes.billable,
            description: changes.description,
            tagIds: changes.tagIds,
          },
          nowIso(),
        ),
      )
      return
    }
    const result = updateEntry(state, entry.id, changes, nowIso())
    if (result.violations.length > 0) {
      pushToast(result.violations[0].message, "error")
      return
    }
    setState(() => result.state)
  }

  const commitTime = (which: "start" | "stop", raw: string) => {
    const day = dateKey(entry.start)
    const iso = parseTimeInput(raw, day)
    if (!iso) {
      pushToast("Could not read that time", "error")
      return
    }
    if (which === "start") patch({ start: iso })
    else patch({ stop: iso })
  }

  const commitDuration = (raw: string) => {
    const parsed = parseDurationInput(raw)
    if (parsed === null) {
      pushToast("Could not read that duration — try 1:30, 1.5 or 90m", "error")
      return
    }
    const refusal = setEntryDuration(state, entry.id, parsed, nowIso()).violations[0]
    if (refusal) {
      pushToast(refusal.message, "error")
      return
    }
    setState((current) => {
      const applied = setEntryDuration(current, entry.id, parsed, nowIso())
      return applied.violations.length > 0 ? current : applied.state
    })
  }

  const continueButton = (
    <button
      type="button"
      onClick={() => {
        const result = continueEntry(state, entry.id, nowIso())
        if (result.violations.length > 0) {
          pushToast(result.violations[0].message, "error")
          return
        }
        setState(() => result.state)
        // This button is 8px from the row's own tap area. If the tap ended a
        // timer that was running, say which one and offer it back.
        const { displaced, started } = result
        if (displaced && started) {
          pushToast(
            `Stopped “${displaced.description.trim() || "(no description)"}” and started “${entry.description.trim() || "(no description)"}”`,
            "info",
            () => setState((current) => undoDisplacement(current, started.id, displaced.id, nowIso())),
          )
        }
      }}
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
      nowIso={nowIso}
    />
  )

  /** phones: two compact lines; the row itself opens the detail sheet */
  const phoneRow = (
    <div className={cn("flex items-center gap-1 px-3 py-2 sm:hidden", nested && "pl-11", running && "bg-primary/5")}>
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
                {formatTimeLabel(entry.start, state)}–{entry.stop ? formatTimeLabel(entry.stop, state) : "now"}
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
        "hidden items-center gap-2 px-3 py-2 sm:grid",
        selectionMode ? ROW_GRID.selecting : ROW_GRID.plain,
        running && "bg-primary/5",
      )}
    >
        {selectionMode && <input type="checkbox" checked={checked} onChange={onCheck} aria-label="Select time entry" />}

        {row?.grouped ? (
          <button
            type="button"
            onClick={onToggleExpand}
            /* `size-11` never applies: this row is `hidden sm:grid`. Stated
               anyway so the source scan needs no entry excusing it. */
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
          onBlur={() => description !== entry.description && patch({ description })}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
          }}
          disabled={!editable}
          placeholder="(no description)"
          className={cn(
            "w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60",
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
          skipped by auto-placement and shifts every later column */}
        <div className="flex items-center justify-end overflow-hidden">
          {!entry.duronly && !row?.grouped && (
            <div className="hidden items-center gap-1 text-xs md:flex">
              <input
                value={startDraft ?? formatTimeLabel(entry.start, state)}
                onChange={(event) => setStartDraft(event.target.value)}
                onBlur={() => {
                  if (startDraft !== null) commitTime("start", startDraft)
                  setStartDraft(null)
                }}
                disabled={!editable}
                aria-label="Start time"
                className={cn(
                  timeInputWidth(state),
                  "rounded bg-transparent text-center tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60",
                )}
              />
              <span className="text-muted-foreground">–</span>
              <input
                value={stopDraft ?? (entry.stop ? formatTimeLabel(entry.stop, state) : "now")}
                onChange={(event) => setStopDraft(event.target.value)}
                onBlur={() => {
                  if (stopDraft !== null && !running) commitTime("stop", stopDraft)
                  setStopDraft(null)
                }}
                disabled={!editable || running}
                aria-label="End time"
                className={cn(
                  timeInputWidth(state),
                  "rounded bg-transparent text-center tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60 disabled:text-muted-foreground",
                )}
              />
            </div>
          )}
        </div>

        <input
          value={durationDraft ?? (running ? formatClock(seconds) : formatDuration(seconds, state.user.durationFormat))}
          onChange={(event) => setDurationDraft(event.target.value)}
          onBlur={() => {
            if (durationDraft !== null && !running && !row?.grouped) commitDuration(durationDraft)
            setDurationDraft(null)
          }}
          disabled={!editable || running || row?.grouped}
          aria-label="Duration"
          className="w-full rounded bg-transparent text-right text-sm tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60 disabled:opacity-100"
        />

      <div className="flex items-center justify-end">
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
function EntryMenu({
  entry,
  state,
  setState,
  running,
  project,
  onDelete,
  pushToast,
  onEditEntry,
  nowIso,
}: {
  entry: TimeEntry
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  running: boolean
  project: TimetrackState["projects"][number] | undefined
  onDelete: () => void
  pushToast: (text: string, tone?: "info" | "error", undo?: () => void) => void
  onEditEntry: (entry: TimeEntry) => void
  nowIso: () => string
}) {
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
        {(close) => (
          <div className="py-1 text-sm">
            <MenuItem
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
            <MenuItem
              icon={<IconSplit className="size-3.5" />}
              label="Split in two"
              disabled={running || entry.duration <= MIN_SPLIT_SECONDS}
              hint={entry.duration <= MIN_SPLIT_SECONDS ? "Needs > 10 min" : undefined}
              onClick={() => {
                {
                  const result = splitEntry(state, entry.id, null, nowIso())
                  if (result.error) pushToast(result.error, "error")
                  else setState(() => result.state)
                }
                close()
              }}
            />
            <MenuItem
              icon={<IconFavorite className="size-3.5" />}
              label={findFavorite(state, draftOf(entry)) ? "Remove favorite" : "Add to favorites"}
              onClick={() => {
                setState((current) => toggleFavorite(current, draftOf(entry), nowIso()))
                close()
              }}
            />
            <MenuItem
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
            <MenuItem
              icon={<IconEdit className="size-3.5" />}
              label="Edit details…"
              onClick={() => {
                onEditEntry(entry)
                close()
              }}
            />
            {project && (
              <MenuItem
                icon={<ColorDot color={project.color} />}
                label={`Go to ${project.name}`}
                onClick={() => {
                  window.location.hash = `#project-${project.id}`
                  close()
                }}
              />
            )}
            <div className="my-1 h-px bg-border" />
            <MenuItem
              icon={<IconDelete className="size-3.5" />}
              label="Delete"
              destructive
              onClick={() => {
                onDelete()
                close()
              }}
            />
          </div>
        )}
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
// Bulk edit
// ---------------------------------------------------------------------------

function BulkEditBar({
  state,
  setState,
  selected,
  onClear,
  onDelete,
}: {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  selected: Id[]
  onClear: () => void
  onDelete: () => void
}) {
  const apply = (patch: Parameters<typeof bulkEditEntries>[2]) => {
    setState((current) => bulkEditEntries(current, selected, patch, new Date().toISOString()))
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
}: {
  entry: TimeEntry
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  pushToast: (text: string, tone?: "info" | "error") => void
}) {
  const [description, setDescription] = useState(entry.description)
  const [start, setStart] = useState(toLocalInputValue(entry.start))
  const [stop, setStop] = useState(entry.stop ? toLocalInputValue(entry.stop) : "")
  const nowIso = () => new Date().toISOString()

  const latestState = useRef(state)
  latestState.current = state

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
  const commit = (patch: Parameters<typeof updateEntry>[2]): boolean => {
    const result = updateEntry(latestState.current, entry.id, patch, nowIso())
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
    latestState.current = result.state
    setState(() => result.state)
    return true
  }

  const commitDescription = useDebouncedCommit<string>((value) => {
    commit({ description: value })
  })

  /**
   * Compared as the strings in the boxes, not as instants: the datetime-local
   * value has no seconds, so a round trip through it never equals the stored
   * timestamp and every blur would file an edit nobody made.
   */
  const commitTimes = () => {
    const storedStart = toLocalInputValue(entry.start)
    const storedStop = entry.stop ? toLocalInputValue(entry.stop) : ""
    if (start === storedStart && stop === storedStop) return

    const startIso = fromLocalInputValue(start)
    if (!startIso) {
      pushToast("Enter a start date and time", "error")
      setStart(storedStart)
      return
    }
    const stopIso = stop ? fromLocalInputValue(stop) : null
    if (stop && !stopIso) {
      pushToast("Enter a valid end date and time", "error")
      setStop(storedStop)
      return
    }
    /**
     * No ordering check here any more. It used to live in this function — and
     * only here, so the inline row and the calendar could write a reversed pair
     * that the database then refused, which blocked the upload queue for
     * everything behind it. The rule is in `validateEntry` now, so `commit`
     * below returns false and says why, wherever the time was typed.
     */
    if (!commit({ start: startIso, stop: stopIso })) {
      setStart(storedStart)
      setStop(storedStop)
    }
  }

  /**
   * On blur, and on the way out. Escape closes this sheet without firing blur,
   * and a time typed then abandoned used to be lost in silence while the
   * description beside it was kept.
   */
  const stagedTimes = useStagedEdit(commitTimes)

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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          Start
          <Input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} onBlur={stagedTimes.flush} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          End
          <Input type="datetime-local" value={stop} onChange={(event) => setStop(event.target.value)} onBlur={stagedTimes.flush} disabled={isRunning(entry)} />
        </label>
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
