"use client"

/**
 * THE BAR AT THE BOTTOM OF THE PHONE, ABOVE THE TABS (Plans/toggl-parity.md
 * Phase 1 item 3, D-PHONE-SHELL, D-START).
 *
 * Toggl's place for the timer, where the thumb is [V1 0:05, 2:02, 4:33; H25
 * help_14 f001]. Idle: "I'm working on…", which opens the new-entry sheet, and
 * a round ▶ that starts a timer at once with no name. Running: the time, the
 * name ("+ Add description" when there is none), "● project • client" and $,
 * and a round ■ that stops it in one tap. A tap anywhere else on it opens the
 * running entry's sheet with the drums showing (D-SHEET) — that tap used to put
 * the cursor in the name, and the drums were two screens away.
 *
 * The same bar on every tab, as Toggl's is on its Calendar.
 */

import { cn } from "@/lib/utils"
import { IconMoney, IconStart, IconStop } from "../../icons"
import { formatClock, formatTimeOfDay } from "../../timetrackFormatService"
import { clientById, entrySeconds, projectById } from "../../timetrackService"
import type { EntryDraft, TimeEntry, TimetrackState } from "../../types"
import { ColorDot } from "../primitives"

/** Toggl's placeholders, with the typographic apostrophe the rest of the slice uses */
export const WORKING_ON = "I’m working on…"
export const WORKED_ON = "I’ve worked on…"

/** "● Alpha • Acme": a project and its client; nothing at all with no project, as Toggl leaves that line empty */
export function ProjectLine({ state, entry, className }: { state: TimetrackState; entry: Pick<TimeEntry, "projectId" | "billable">; className?: string }) {
  const project = projectById(state, entry.projectId)
  if (!project) return null
  const client = clientById(state, project.clientId)
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <ColorDot color={project.color} />
      <span className="min-w-0 truncate">
        {project.name}
        {client && ` • ${client.name}`}
      </span>
    </span>
  )
}

export function RunBar({
  state,
  running,
  nowSec,
  draft,
  onOpenRunning,
  onOpenNew,
  onStart,
  onStop,
}: {
  state: TimetrackState
  running: TimeEntry | null
  nowSec: number
  /** what waits to be started: usually nothing, a start link's words, or the PC's half-typed name in this tab */
  draft: EntryDraft
  onOpenRunning: () => void
  onOpenNew: () => void
  onStart: () => void
  onStop: () => void
}) {
  if (running) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={onOpenRunning} aria-label="Edit the running time entry" className="min-w-0 flex-1 text-left">
          <span className="block text-lg font-semibold leading-tight tabular-nums">{formatClock(entrySeconds(running, nowSec))}</span>
          <span className={cn("block truncate text-sm leading-snug", !running.description.trim() && "text-muted-foreground")}>
            {running.description.trim() || "+ Add description"}
          </span>
          {/* the project's dot and when it began (Plans/time-log-phone.md 4.3) */}
          <span className="flex min-h-4 items-center gap-2">
            <ProjectLine state={state} entry={running} className="shrink" />
            {running.billable && <IconMoney aria-label="Billable" className="size-3.5 shrink-0 text-muted-foreground" />}
            <span className="shrink-0 text-xs text-muted-foreground">since {formatTimeOfDay(running.start, state.user.timeFormat)}</span>
          </span>
        </button>
        {/* one tap stops it [V1 4:33]; 56px, the size of the thing a thumb is reaching for */}
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop timer"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-destructive text-white shadow-md active:scale-95"
        >
          <IconStop className="size-5 fill-current" />
        </button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        onClick={onOpenNew}
        className={cn(
          "flex h-12 min-w-0 flex-1 items-center rounded-full border border-border bg-background/60 px-4 text-left text-base",
          draft.description.trim() ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="truncate">{draft.description.trim() || WORKING_ON}</span>
      </button>
      <button
        type="button"
        onClick={onStart}
        aria-label="Start timer"
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md active:scale-95"
      >
        <IconStart className="size-5 fill-current" />
      </button>
    </div>
  )
}
