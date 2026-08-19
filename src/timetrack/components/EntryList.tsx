"use client"

/**
 * The timer-page entry list: day buckets with totals, collapsed identical
 * entries, inline editing of every field, per-entry menu (continue, duplicate,
 * split, favorite, copy start link, delete) and multi-select bulk edit.
 */

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MIN_SPLIT_SECONDS } from "../config"
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
  formatDayHeader,
  formatDuration,
  parseDurationInput,
  parseTimeInput,
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
        <label className="flex min-h-9 items-center gap-2 text-xs text-muted-foreground">
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
                <input
                  type="checkbox"
                  aria-label={`Select all entries on ${group.date}`}
                  checked={group.rows.flatMap((r) => r.entries.map((e) => e.id)).every((id) => selected.includes(id))}
                  onChange={() => toggleSelect(group.rows.flatMap((r) => r.entries.map((e) => e.id)))}
                />
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
                className="min-h-9 px-1 text-xs text-muted-foreground hover:text-foreground"
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
      />
      {row.grouped && expanded && (
        <ul className="divide-y divide-border border-t border-border bg-secondary/20">
          {row.entries.map((entry) => (
            <li key={entry.id} className="pl-8">
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
                nested
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
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
    setState((current) => setEntryDuration(current, entry.id, parsed, nowIso()))
  }

  const continueButton = (
    <button
      type="button"
      onClick={() => {
        const result = continueEntry(state, entry.id, nowIso())
        if (result.violations.length > 0) pushToast(result.violations[0].message, "error")
        else setState(() => result.state)
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

  return (
    <>
      {/* --- phones: two compact lines; the row itself opens the detail sheet --- */}
      <div className={cn("flex items-center gap-1 px-3 py-2 sm:hidden", running && "bg-primary/5")}>
        {selectionMode && (
          <label className="flex size-11 shrink-0 items-center justify-center">
            <input type="checkbox" checked={checked} onChange={onCheck} aria-label="Select time entry" className="size-5" />
          </label>
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
            {row?.grouped && (
              <span className="shrink-0 rounded bg-primary/15 px-1 text-[11px] font-semibold text-primary">
                {row.entries.length}
              </span>
            )}
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

      {/* --- pointer devices: the full inline-editable row --- */}
      <div className={cn("hidden flex-wrap items-center gap-2 px-3 py-2 sm:flex", running && "bg-primary/5")}>
        {selectionMode && (
          <input type="checkbox" checked={checked} onChange={onCheck} aria-label="Select time entry" />
        )}

      {row?.grouped ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex size-6 items-center justify-center rounded bg-primary/15 text-[11px] font-semibold text-primary"
          aria-label={expanded ? "Collapse group" : "Expand group"}
        >
          {row.entries.length}
        </button>
      ) : (
        !nested && <span className="w-6" />
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
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />

      <ProjectPicker
        state={state}
        projectId={entry.projectId}
        taskId={entry.taskId}
        compact
        onChange={(projectId, taskId) => patch({ projectId, taskId })}
        onCreateProject={(name) => {
          const result = createProject(state, { name }, nowIso())
          setState(() => result.state)
          return result.id
        }}
      />

      <TagPicker
        state={state}
        tagIds={entry.tagIds}
        align="right"
        onChange={(tagIds) => patch({ tagIds })}
        onCreateTag={(name) => {
          const result = createTag(state, name, nowIso())
          setState(() => result.state)
          return result.id
        }}
      />

      <BillableToggle billable={entry.billable} onChange={(billable) => patch({ billable })} disabled={!editable} />

      {!entry.duronly && !row?.grouped && (
        <div className="hidden items-center gap-1 text-xs sm:flex">
          <input
            value={startDraft ?? formatTimeLabel(entry.start, state)}
            onChange={(event) => setStartDraft(event.target.value)}
            onBlur={() => {
              if (startDraft !== null) commitTime("start", startDraft)
              setStartDraft(null)
            }}
            disabled={!editable}
            aria-label="Start time"
            className="w-[52px] rounded bg-transparent text-center tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60"
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
            className="w-[52px] rounded bg-transparent text-center tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60 disabled:text-muted-foreground"
          />
        </div>
      )}

      <input
        value={durationDraft ?? (running ? formatClock(seconds) : formatDuration(seconds, state.user.durationFormat))}
        onChange={(event) => setDurationDraft(event.target.value)}
        onBlur={() => {
          if (durationDraft !== null && !running && !row?.grouped) commitDuration(durationDraft)
          setDurationDraft(null)
        }}
        disabled={!editable || running || row?.grouped}
        aria-label="Duration"
        className="w-[74px] rounded bg-transparent text-right text-sm tabular-nums outline-none hover:bg-secondary/60 focus:bg-secondary/60 disabled:opacity-100"
      />

      {continueButton}
      {menu}
      </div>
    </>
  )
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
                setState((current) => duplicateEntry(current, entry.id, nowIso()))
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
                const link = startLinkFor(entry, window.location.origin)
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

function formatTimeLabel(iso: string, state: TimetrackState): string {
  const date = new Date(iso)
  if (state.user.timeFormat === "h12") {
    const h = date.getHours() % 12 || 12
    return `${h}:${String(date.getMinutes()).padStart(2, "0")}`
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
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
      <Button size="sm" variant="ghost" className="h-7" onClick={() => apply({ billable: true })}>
        Mark billable
      </Button>
      <Button size="sm" variant="ghost" className="h-7" onClick={() => apply({ billable: false })}>
        Mark non-billable
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="destructive" className="h-7" onClick={onDelete}>
          <IconDelete className="size-3.5" /> Delete
        </Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onClear}>
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
  const [start, setStart] = useState(entry.start.slice(0, 16))
  const [stop, setStop] = useState(entry.stop ? entry.stop.slice(0, 16) : "")
  const nowIso = () => new Date().toISOString()

  const save = () => {
    const startIso = new Date(start).toISOString()
    const stopIso = stop ? new Date(stop).toISOString() : null
    if (stopIso && new Date(stopIso) <= new Date(startIso)) {
      pushToast("End must be after start", "error")
      return
    }
    const result = updateEntry(state, entry.id, { description, start: startIso, stop: stopIso }, nowIso())
    if (result.violations.length > 0) {
      pushToast(result.violations[0].message, "error")
      return
    }
    setState(() => result.state)
  }

  return (
    <div className="space-y-3">
      <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
      <div className="flex flex-wrap gap-2">
        <ProjectPicker
          state={state}
          projectId={entry.projectId}
          taskId={entry.taskId}
          onChange={(projectId, taskId) =>
            setState((current) => updateEntry(current, entry.id, { projectId, taskId }, nowIso()).state)
          }
        />
        <TagPicker
          state={state}
          tagIds={entry.tagIds}
          onChange={(tagIds) => setState((current) => updateEntry(current, entry.id, { tagIds }, nowIso()).state)}
        />
        <BillableToggle
          billable={entry.billable}
          onChange={(billable) => setState((current) => updateEntry(current, entry.id, { billable }, nowIso()).state)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          Start
          <Input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          End
          <Input type="datetime-local" value={stop} onChange={(event) => setStop(event.target.value)} disabled={isRunning(entry)} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={entry.duronly}
          onChange={(event) => setState((current) => updateEntry(current, entry.id, { duronly: event.target.checked }, nowIso()).state)}
        />
        Duration only (hide start and end times)
      </label>
      <div className="space-y-1">
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
                    setState((current) =>
                      updateEntry(
                        current,
                        entry.id,
                        {
                          sharedWith: shared
                            ? entry.sharedWith.filter((id) => id !== member.id)
                            : [...entry.sharedWith, member.id],
                        },
                        nowIso(),
                      ).state,
                    )
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
      <div className="flex justify-end">
        <Button size="sm" onClick={save}>
          Save times
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Created with {entry.createdWith}
        {entry.sourceEventId ? " · imported from a calendar event" : ""} · last updated{" "}
        {new Date(entry.at).toLocaleString()}
      </p>
    </div>
  )
}
