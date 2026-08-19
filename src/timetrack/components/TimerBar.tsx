"use client"

/**
 * The timer bar: description + project + tags + billable, in either timer mode
 * (live start/stop) or manual mode (typed start/stop/duration), plus the
 * favorites strip and the autotracker suggestion.
 */

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { IconAuto, IconFavorite, IconStart, IconStop, IconTimer, IconEdit } from "../icons"
import {
  dateKey,
  formatClock,
  formatDuration,
  formatTimeOfDay,
  parseDurationInput,
  parseTimeInput,
} from "../timetrackFormatService"
import {
  applyAutotracker,
  createManualEntry,
  createTag,
  createProject,
  entrySeconds,
  findFavorite,
  matchAutotracker,
  setRunningElapsed,
  toggleFavorite,
} from "../timetrackService"
import type { EntryDraft, Id, TimetrackState } from "../types"
import { BillableToggle, DescriptionField, ProjectPicker, TagPicker } from "./pickers"
import { ColorDot, touchTarget } from "./primitives"

export type TimerMode = "timer" | "manual"

interface TimerBarProps {
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  draft: EntryDraft
  setDraft: (draft: EntryDraft) => void
  mode: TimerMode
  setMode: (mode: TimerMode) => void
  runningSeconds: number
  running: ReturnType<typeof import("../timetrackService").runningEntry>
  nowSec: number
  onStart: () => void
  onStop: () => void
  pushToast: (text: string, tone?: "info" | "error") => void
}

export function TimerBar({
  state,
  setState,
  draft,
  setDraft,
  mode,
  setMode,
  runningSeconds,
  running,
  onStart,
  onStop,
  pushToast,
}: TimerBarProps) {
  const [durationInput, setDurationInput] = useState("")
  const [manualStart, setManualStart] = useState("09:00")
  const [manualStop, setManualStop] = useState("10:00")
  const [manualDay, setManualDay] = useState(() => dateKey(new Date()))
  const [editingDuration, setEditingDuration] = useState(false)

  const suggestion = matchAutotracker(state, draft.description)
  const suggestionProject = suggestion ? state.projects.find((p) => p.id === suggestion.projectId) : null
  const showSuggestion = Boolean(suggestion) && draft.projectId !== suggestion?.projectId
  const isFavorite = Boolean(findFavorite(state, draft))

  // Keep the manual duration field in sync while the timer runs
  useEffect(() => {
    if (!editingDuration) setDurationInput(formatClock(runningSeconds))
  }, [runningSeconds, editingDuration])

  const commitRunningDuration = () => {
    const seconds = parseDurationInput(durationInput)
    setEditingDuration(false)
    if (seconds === null) {
      pushToast("Could not read that duration — try 1:30, 1.5 or 90m", "error")
      setDurationInput(formatClock(runningSeconds))
      return
    }
    setState((current) => setRunningElapsed(current, seconds, new Date().toISOString()))
  }

  const addManualEntry = () => {
    const start = parseTimeInput(manualStart, manualDay)
    const stop = parseTimeInput(manualStop, manualDay)
    if (!start || !stop) {
      pushToast("Enter start and end times like 09:00 or 9:00 am", "error")
      return
    }
    let stopIso = stop
    if (new Date(stopIso).getTime() <= new Date(start).getTime()) {
      // Treat an end before the start as crossing midnight
      const shifted = new Date(stopIso)
      shifted.setDate(shifted.getDate() + 1)
      stopIso = shifted.toISOString()
    }
    const result = createManualEntry(state, { draft, start, stop: stopIso }, new Date().toISOString())
    if (result.violations.length > 0) {
      pushToast(result.violations[0].message, "error")
      return
    }
    setState(() => result.state)
    setDraft({ ...draft, description: "" })
  }

  // Both helpers derive the new id from the current snapshot: React does not
  // promise to run a setState updater before this function returns.
  const handleCreateProject = (name: string): Id => {
    const result = createProject(state, { name }, new Date().toISOString())
    setState(() => result.state)
    return result.id
  }

  const handleCreateTag = (name: string): Id => {
    const result = createTag(state, name, new Date().toISOString())
    setState(() => result.state)
    return result.id
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center">
        <DescriptionField
          state={state}
          value={draft.description}
          onChange={(description) => setDraft({ ...draft, description })}
          onPickProject={(projectId, taskId) => setDraft({ ...draft, projectId, taskId })}
          onPickTag={(tagId) => setDraft({ ...draft, tagIds: [...new Set([...draft.tagIds, tagId])] })}
          onSubmit={mode === "timer" ? onStart : addManualEntry}
        />

        <div className="flex flex-wrap items-center gap-1">
          <ProjectPicker
            state={state}
            projectId={draft.projectId}
            taskId={draft.taskId}
            onChange={(projectId, taskId) => setDraft({ ...draft, projectId, taskId })}
            onCreateProject={handleCreateProject}
          />
          <TagPicker
            state={state}
            tagIds={draft.tagIds}
            onChange={(tagIds) => setDraft({ ...draft, tagIds })}
            onCreateTag={handleCreateTag}
          />
          <BillableToggle billable={draft.billable} onChange={(billable) => setDraft({ ...draft, billable })} />

          {mode === "manual" ? (
            <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
              <Input value={manualStart} onChange={(e) => setManualStart(e.target.value)} className="h-10 w-[76px] text-center sm:h-8 sm:w-[70px]" aria-label="Start time" />
              <span className="text-muted-foreground">–</span>
              <Input value={manualStop} onChange={(e) => setManualStop(e.target.value)} className="h-10 w-[76px] text-center sm:h-8 sm:w-[70px]" aria-label="End time" />
              <Input
                type="date"
                value={manualDay}
                onChange={(e) => setManualDay(e.target.value)}
                className="h-10 w-[150px] sm:h-8 sm:w-[140px]"
                aria-label="Date"
              />
            </div>
          ) : (
            <Input
              value={durationInput}
              onFocus={() => setEditingDuration(true)}
              onChange={(event) => {
                setEditingDuration(true)
                setDurationInput(event.target.value)
              }}
              onBlur={() => (running ? commitRunningDuration() : setEditingDuration(false))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && running) commitRunningDuration()
              }}
              aria-label="Duration"
              className="h-10 w-[100px] text-center tabular-nums sm:h-8 sm:w-[92px]"
            />
          )}

          <button
            type="button"
            onClick={() => setState((current) => toggleFavorite(current, draft, new Date().toISOString()))}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label="Toggle favorite"
            className={cn(touchTarget, "rounded-md hover:bg-secondary/60", isFavorite ? "text-primary" : "text-muted-foreground")}
          >
            <IconFavorite className="size-5 sm:size-4" />
          </button>

          <div className="mx-1 hidden h-6 w-px bg-border lg:block" />

          <button
            type="button"
            onClick={() => setMode(mode === "timer" ? "manual" : "timer")}
            title={mode === "timer" ? "Switch to manual mode (M)" : "Switch to timer mode (N)"}
            aria-label="Toggle timer or manual mode"
            className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}
          >
            {mode === "timer" ? <IconEdit className="size-5 sm:size-4" /> : <IconTimer className="size-5 sm:size-4" />}
          </button>

          {mode === "manual" ? (
            <Button size="sm" className="ml-auto min-w-[104px] flex-1 sm:flex-none" onClick={addManualEntry}>
              Add
            </Button>
          ) : running ? (
            <Button
              size="sm"
              variant="destructive"
              className="ml-auto min-w-[104px] flex-1 sm:flex-none"
              onClick={onStop}
              aria-label="Stop timer"
            >
              <IconStop className="size-4" /> Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="ml-auto min-w-[104px] flex-1 sm:flex-none"
              onClick={onStart}
              aria-label="Start timer"
            >
              <IconStart className="size-4" /> Start
            </Button>
          )}
        </div>
      </div>

      {showSuggestion && suggestion && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs">
          <IconAuto className="size-3.5 text-primary" />
          <span className="text-muted-foreground">
            AutoTracker: “{suggestion.keyword}” usually goes to
          </span>
          {suggestionProject && <ColorDot color={suggestionProject.color} />}
          <span>{suggestionProject?.name ?? "no project"}</span>
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setDraft(applyAutotracker(draft, suggestion))}>
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Favorites strip
// ---------------------------------------------------------------------------

export function FavoritesBar({
  state,
  onStart,
  onRemove,
}: {
  state: TimetrackState
  onStart: (draft: EntryDraft) => void
  onRemove: (id: Id) => void
}) {
  if (state.favorites.length === 0) return null
  return (
    <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Favorites</span>
      {state.favorites.map((favorite, index) => {
        const project = state.projects.find((p) => p.id === favorite.draft.projectId)
        return (
          <div
            key={favorite.id}
            className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-2 pr-1 text-xs sm:py-1"
          >
            <button type="button" onClick={() => onStart(favorite.draft)} className="flex min-h-10 items-center gap-1.5 sm:min-h-0">
              {index < 9 && (
                <span className="rounded bg-secondary px-1 text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
              )}
              {project && <ColorDot color={project.color} />}
              <span className="max-w-[180px] truncate">{favorite.draft.description || "(no description)"}</span>
              <IconStart className="size-3 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(favorite.id)}
              className="hidden size-5 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 sm:flex"
              aria-label="Remove favorite"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Compact running-entry readout used in the app header */
export function RunningPill({
  state,
  nowSec,
  onStop,
}: {
  state: TimetrackState
  nowSec: number
  onStop: () => void
}) {
  const running = state.entries.find((e) => e.duration < 0 && !e.serverDeletedAt)
  if (!running) return null
  const project = state.projects.find((p) => p.id === running.projectId)
  return (
    <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs sm:px-3">
      <span className="size-2 animate-pulse rounded-full bg-primary" />
      {/* the description would crowd out the workspace name on a phone */}
      <span className="hidden max-w-[160px] truncate sm:inline">{running.description || "(no description)"}</span>
      {project && <ColorDot color={project.color} />}
      <span className="tabular-nums">{formatClock(entrySeconds(running, nowSec))}</span>
      {/* A 12px icon is not a clickable target; give it a real hit area */}
      <button
        type="button"
        onClick={onStop}
        className="-mr-1 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground sm:size-6"
        aria-label="Stop the running timer"
        title="Stop the running timer"
      >
        <IconStop className="size-3.5" />
      </button>
    </div>
  )
}

export function DayTotalLabel({
  seconds,
  format,
  label,
}: {
  seconds: number
  format: TimetrackState["user"]["durationFormat"]
  label: string
}) {
  return (
    <span className="text-xs text-muted-foreground">
      {label} <span className="font-semibold tabular-nums text-foreground">{formatDuration(seconds, format)}</span>
    </span>
  )
}

export function TimeRangeLabel({
  start,
  stop,
  timeFormat,
}: {
  start: string
  stop: string | null
  timeFormat: TimetrackState["user"]["timeFormat"]
}) {
  return (
    <span className="tabular-nums text-muted-foreground">
      {formatTimeOfDay(start, timeFormat)} – {stop ? formatTimeOfDay(stop, timeFormat) : "now"}
    </span>
  )
}
