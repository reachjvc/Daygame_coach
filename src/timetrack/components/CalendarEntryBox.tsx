"use client"

/**
 * THE BOX BESIDE A CALENDAR BLOCK, ON THE PC (D-PC-CAL, Phase 6 of
 * Plans/toggl-parity.md).
 *
 * Toggl Track's web calendar edits in a box beside the block, not in a sheet
 * [W25 12:14; LIVE web-08, web-14]:
 *   - a drag (or a click) on empty space draws a block and opens the box with
 *     "Add description", project, tags, $, the date, start → end and the
 *     length, and "Add time entry". Nothing is written until that is pressed:
 *     ✕ or Escape and the block is gone again.
 *   - a click on a block opens the same box with ▶ (continue), Duplicate, ⋮
 *     and ✕ at the top, and Save at the bottom. What is typed waits for Save.
 *     The running block's box says RUNNING and has ■ Stop instead of ▶ and
 *     Duplicate [LIVE web-08].
 *
 * The times follow the sheet's rules for an unsaved pair (`typedIntoPair`): a
 * start keeps the end (the one rule, `startTypedInto`), an end is the first
 * such time after the start, a length moves the end, a date moves both. A
 * length over 12 hours asks first (`askBeforeLong`). A start or end that moved
 * alone takes a touching neighbour along (D-NEIGHBOURS, `withNeighbours`).
 * Everything is checked on the copy on screen to say a refusal, and applied
 * inside the update to the copy that is current.
 */

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { typedIntoPair, type TimePair } from "../drumService"
import type { PushToast } from "../hooks/useTimetrack"
import { IconClose, IconDuplicate, IconStart, IconStop } from "../icons"
import { serverNowIso } from "../serverClock"
import { withNeighbours } from "../timeFixService"
import {
  DURATION_UNREADABLE,
  dateKey,
  epochSeconds,
  formatClock,
  formatDuration,
  formatTimeOfDay,
  unreadableTimeMessage,
} from "../timetrackFormatService"
import { createManualEntry, duplicateEntry, isRunning, updateEntry } from "../timetrackService"
import type { EntryDraft, Id, IsoDateTime, SaveViolation, TimeEntry, TimetrackState } from "../types"
import { EntryMenu } from "./EntryList"
import { announceNeighbours } from "./neighbourNotice"
import { DayPicker, touchTarget } from "./primitives"
import { BillableToggle, ProjectPicker, TagPicker } from "./pickers"
import { askBeforeLong } from "./TimerBar"

const BOX_WIDTH = 360

export type CalendarBoxTarget =
  | { kind: "new"; start: IsoDateTime; stop: IsoDateTime }
  | { kind: "edit"; entryId: Id }

type Field = "start" | "stop" | "duration"

export function CalendarEntryBox({
  target,
  state,
  setState,
  latestState,
  pushToast,
  nowSec,
  anchor,
  onClose,
  onContinue,
  onStop,
  onDelete,
  onEditEntry,
  onGoToProject,
  onAdded,
}: {
  target: CalendarBoxTarget
  state: TimetrackState
  setState: (updater: (current: TimetrackState) => TimetrackState) => void
  /** the workspace as it is when a button is pressed */
  latestState: () => TimetrackState
  pushToast: PushToast
  nowSec: number
  /** the block the box sits beside, found again whenever the calendar moves */
  anchor: () => HTMLElement | null
  onClose: () => void
  onContinue: (entry: TimeEntry) => void
  /** ■ on the running block: it stops now (the calendar says so, with Undo) */
  onStop: (entry: TimeEntry) => void
  onDelete: (entry: TimeEntry) => void
  /** the full sheet, from ⋮ → Edit details… */
  onEditEntry: (entry: TimeEntry) => void
  onGoToProject?: (projectId: Id) => void
  /** a new entry was written (the calendar forgets its drawn block) */
  onAdded?: () => void
}) {
  const saved = target.kind === "edit" ? (state.entries.find((e) => e.id === target.entryId) ?? null) : null
  const running = saved ? isRunning(saved) : false
  const format = state.user.timeFormat

  const initialPair = (): TimePair => (saved ? { start: saved.start, stop: saved.stop } : target.kind === "new" ? { start: target.start, stop: target.stop } : { start: serverNowIso(), stop: null })
  const initialDraft = (): EntryDraft =>
    saved
      ? { description: saved.description, projectId: saved.projectId, taskId: saved.taskId, tagIds: saved.tagIds, billable: saved.billable }
      : { description: "", projectId: null, taskId: null, tagIds: [], billable: state.workspace.projectsBillableByDefault }

  const [draft, setDraft] = useState<EntryDraft>(initialDraft)
  const [pair, setPair] = useState<TimePair>(initialPair)
  /**
   * What the box showed when it opened. Save writes only what differs from it,
   * laid onto the newest copy: it wrote every field it had copied, so a rename
   * made on the phone while the box was open was put back by a billable tick
   * on the PC, and a running entry the phone stopped was set running again by
   * a rename (Phase 8 two-devices audit of Plans/toggl-parity.md).
   */
  const opened = useRef<{ draft: EntryDraft; pair: TimePair } | null>(null)
  if (opened.current === null) opened.current = { draft, pair }
  const [typed, setTyped] = useState<{ field: Field; text: string } | null>(null)
  /** what the box holds now, for Save, which may run before React has drawn the last keystroke */
  const now = useRef({ draft, pair })
  now.current = { draft, pair }

  // another block, or a fresh drag: the box starts over from it
  const targetKey = target.kind === "edit" ? `edit:${target.entryId}` : `new:${target.start}:${target.stop}`
  useEffect(() => {
    const fresh = { draft: initialDraft(), pair: initialPair() }
    opened.current = fresh
    setDraft(fresh.draft)
    setPair(fresh.pair)
    setTyped(null)
  }, [targetKey]) // eslint-disable-line react-hooks/exhaustive-deps -- only a new target resets what is being typed

  // beside the block: to its right where there is room, else to its left; kept on screen
  const box = useRef<HTMLDivElement | null>(null)
  const [place, setPlace] = useState<{ left: number; top: number }>({ left: 8, top: 8 })
  useLayoutEffect(() => {
    const measure = () => {
      const rect = anchor()?.getBoundingClientRect()
      if (!rect) return
      const height = box.current?.offsetHeight ?? 260
      const roomRight = window.innerWidth - rect.right - 8 >= BOX_WIDTH
      const left = roomRight ? rect.right + 8 : Math.max(8, rect.left - BOX_WIDTH - 8)
      const top = Math.max(8, Math.min(rect.top, window.innerHeight - height - 8))
      setPlace((was) => (was.left === left && was.top === top ? was : { left, top }))
    }
    measure()
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [anchor, targetKey])

  /**
   * Escape closes the box wherever the keyboard is: after a click on a block
   * the focus is still on the block, not in the box. An open picker inside it
   * takes its own Escape first.
   */
  const closeNow = useRef(onClose)
  closeNow.current = onClose
  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector("[data-dropdown-panel]")) return
      closeNow.current()
    }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  }, [])

  if (target.kind === "edit" && !saved) return null

  /** A typed box, read against the pair the box holds (the sheet's rules for an unsaved pair) */
  const landTyped = (): TimePair | null => {
    if (!typed) return now.current.pair
    const next = typedIntoPair(now.current.pair, typed.field, typed.text.trim(), serverNowIso())
    setTyped(null)
    if (!next) {
      pushToast(typed.field === "duration" ? DURATION_UNREADABLE : (unreadableTimeMessage(typed.text) ?? "Could not read that time — try 9:30, 930 or 9:30 pm"), "error")
      return null
    }
    setPair(next)
    now.current = { ...now.current, pair: next }
    return next
  }

  /** Checked on the latest copy so a refusal is said once; applied to the current one */
  const land = <R extends { state: TimetrackState; violations: SaveViolation[] }>(apply: (base: TimetrackState) => R): R | null => {
    const checked = apply(latestState())
    if (checked.violations[0]) {
      pushToast(checked.violations[0].message, "error")
      return null
    }
    setState((current) => {
      const applied = apply(current)
      return applied.violations.length > 0 ? current : applied.state
    })
    return checked
  }

  const save = () => {
    const at = landTyped()
    if (!at) return
    const fields = now.current.draft
    const stamp = serverNowIso()
    const seconds = (at.stop === null ? epochSeconds(stamp) : epochSeconds(at.stop)) - epochSeconds(at.start)
    if (target.kind === "new") {
      askBeforeLong(
        seconds,
        () => {
          const input = { draft: { ...fields, description: fields.description.trim() }, start: at.start, stop: at.stop ?? stamp }
          if (land((base) => createManualEntry(base, input, serverNowIso()))) {
            onAdded?.()
            onClose()
          }
        },
        pushToast,
      )
      return
    }
    const entry = saved!
    // only what was changed here (see `opened`); a running end is never written, so a Save cannot restart a timer
    const was = opened.current!
    const patch: Parameters<typeof updateEntry>[2] = {}
    if (fields.description !== was.draft.description) patch.description = fields.description
    if (fields.projectId !== was.draft.projectId || fields.taskId !== was.draft.taskId) {
      patch.projectId = fields.projectId
      patch.taskId = fields.taskId
    }
    if (fields.tagIds.join(",") !== was.draft.tagIds.join(",")) patch.tagIds = fields.tagIds
    if (fields.billable !== was.draft.billable) patch.billable = fields.billable
    if (at.start !== was.pair.start) patch.start = at.start
    if (at.stop !== was.pair.stop && at.stop !== null) patch.stop = at.stop
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    const before = running ? null : { seconds: entry.duration }
    askBeforeLong(
      seconds,
      () => {
        const when = serverNowIso()
        // one edge moved alone takes a touching neighbour along (D-NEIGHBOURS); both moved is a move, and does not
        const landed = land((base) => withNeighbours(base, entry.id, when, (edited) => updateEntry(edited, entry.id, patch, when)))
        if (!landed) return
        announceNeighbours(landed, latestState().user.timeFormat, setState, pushToast, latestState)
        onClose()
      },
      pushToast,
      undefined,
      before,
    )
  }

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
  }

  const timeBox = (field: Field, shown: string, label: string, disabled = false) => (
    <Input
      value={typed?.field === field ? typed.text : shown}
      onChange={(event) => setTyped({ field, text: event.target.value })}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => landTyped()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          save()
        }
      }}
      disabled={disabled}
      inputMode={field === "duration" ? "decimal" : "numeric"}
      aria-label={label}
      className={cn("h-8 text-center tabular-nums", field === "duration" ? "w-[76px]" : "w-[72px]")}
    />
  )

  const lengthSeconds = (pair.stop === null ? nowSec : epochSeconds(pair.stop)) - epochSeconds(pair.start)

  return createPortal(
    <div
      ref={box}
      role="dialog"
      aria-label={target.kind === "new" ? "New time entry" : "Edit time entry"}
      onKeyDown={keys}
      data-calendar-box
      // drawn outside the tracker's own root (a portal), so it carries the root's rule that makes fields visible on a card
      className="fixed z-[9600] space-y-3 rounded-lg border border-border bg-card p-3 text-sm shadow-xl [&_input[data-slot=input]]:border-border [&_input[data-slot=input]]:bg-background/60"
      style={{ left: place.left, top: place.top, width: BOX_WIDTH }}
    >
      <div className="flex items-center gap-1">
        {saved && running && (
          <>
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-primary">Running</span>
            <button
              type="button"
              onClick={() => onStop(saved)}
              aria-label="Stop time entry"
              title="Stop time entry"
              className={cn(touchTarget, "rounded-full text-destructive hover:bg-destructive/10")}
            >
              <IconStop className="size-4" />
            </button>
          </>
        )}
        {saved && !running && (
          <button
            type="button"
            onClick={() => onContinue(saved)}
            aria-label="Continue time entry"
            title="Continue time entry"
            className={cn(touchTarget, "rounded-md text-primary hover:bg-secondary/60")}
          >
            <IconStart className="size-4" />
          </button>
        )}
        {saved && !running && (
          <button
            type="button"
            onClick={() => {
              const refusal = duplicateEntry(latestState(), saved.id, serverNowIso()).violations[0]
              if (refusal) {
                pushToast(refusal.message, "error")
                return
              }
              setState((current) => {
                const applied = duplicateEntry(current, saved.id, serverNowIso())
                return applied.violations.length > 0 ? current : applied.state
              })
              onClose()
            }}
            aria-label="Duplicate time entry"
            title="Duplicate time entry"
            className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}
          >
            <IconDuplicate className="size-4" />
          </button>
        )}
        {saved && (
          <EntryMenu
            entry={saved}
            state={state}
            setState={setState}
            running={running}
            project={state.projects.find((p) => p.id === saved.projectId)}
            onDelete={() => {
              onDelete(saved)
              onClose()
            }}
            pushToast={pushToast}
            onEditEntry={(entry) => {
              onClose()
              onEditEntry(entry)
            }}
            onGoToProject={onGoToProject}
            nowIso={serverNowIso}
            pc
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(touchTarget, "ml-auto rounded-md text-muted-foreground hover:bg-secondary/60")}
        >
          <IconClose className="size-4" />
        </button>
      </div>

      <input
        autoFocus={target.kind === "new"}
        value={draft.description}
        onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            save()
          }
        }}
        placeholder="Add description"
        aria-label="Description"
        className="h-10 w-full rounded-md bg-secondary/40 px-3 text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground focus:bg-secondary/60"
      />

      <div className="flex flex-wrap items-center gap-1">
        <ProjectPicker
          state={state}
          projectId={draft.projectId}
          taskId={draft.taskId}
          onChange={(projectId, taskId) => setDraft({ ...now.current.draft, projectId, taskId })}
        />
        <TagPicker state={state} tagIds={draft.tagIds} onChange={(tagIds) => setDraft({ ...now.current.draft, tagIds })} />
        <BillableToggle billable={draft.billable} onChange={(billable) => setDraft({ ...now.current.draft, billable })} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DayPicker
          value={dateKey(pair.start)}
          onChange={(day) => setPair((held) => typedIntoPair(held, "day", day, serverNowIso()) ?? held)}
          onStep={(day) => setPair((held) => typedIntoPair(held, "day", day, serverNowIso()) ?? held)}
        />
        <div className="flex items-center gap-1">
          {timeBox("start", formatTimeOfDay(pair.start, format), "Start time")}
          <span className="text-muted-foreground">→</span>
          {timeBox("stop", pair.stop ? formatTimeOfDay(pair.stop, format) : "now", "End time", pair.stop === null)}
          {timeBox(
            "duration",
            pair.stop === null ? formatClock(Math.max(0, lengthSeconds)) : formatDuration(Math.max(0, lengthSeconds), state.user.durationFormat),
            "Duration",
            pair.stop === null,
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <Button size="sm" onClick={save}>
          {target.kind === "new" ? "Add time entry" : "Save"}
        </Button>
      </div>
    </div>,
    document.body,
  )
}
