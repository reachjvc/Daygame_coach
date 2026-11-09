"use client"

/**
 * THE PHONE'S ONE ENTRY SHEET (Plans/toggl-parity.md Phase 2: D-SHEET,
 * D-DRUMS, D-START, D-MANUAL, D-SWITCHED).
 *
 * Toggl Track's Android editor, top to bottom [H25 help_14 f010–f017, help_18
 * f009; V1 1:37–2:02, 0:14]: ✕ · DONE (CREATE for a new entry); the big
 * duration with ✎; the name; the chips — project ×, "# Add tags", "$
 * Billable"; "Edit duration": start → end, "Set to last stop time" under the
 * start and "Round stop time" under the end; then, where Toggl draws its wheel,
 * the owner's drums for the chip that is chosen, with −15 −5 +5 +15 under them;
 * on a running entry a big Stop with Stop at… and Switched at… beside it; and
 * "Delete time entry" at the bottom.
 *
 * Nothing is written until DONE (`phoneSheetService`). ✕ with something
 * changed asks "Discard changes?"; Android's Back does what ✕ does (the
 * shell, `PhoneTracker`, owns the history step and asks the same question).
 *
 * Today's extras that Toggl's sheet lacks sit in its ⋮, left of DONE: End now,
 * Duration only, End where the next one starts, Move to another day, and on a
 * new entry Started at….
 */

import { useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MutableRefObject } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PushToast } from "../../hooks/useTimetrack"
import { IconAuto, IconClose, IconDelete, IconEdit, IconMenu, IconMoney, IconStop, IconTag, IconTimer } from "../../icons"
import {
  SHEET_DURATION_HINT,
  changesBetween,
  chipDate,
  createFromSheet,
  edgeBounds,
  entryDraftOf,
  isDirty,
  lastStopTime,
  manualDraft,
  moveEdge,
  nudgeEdge,
  roundedStop,
  saveEdit,
  saveStops,
  sheetDraftOf,
  shownDraft,
  startingDraft,
  typeDuration,
  typeDurationInto,
  typeStart,
  typeStop,
  withStart,
  type Edge,
  type SheetChanges,
  type SheetDraft,
  type SheetResult,
} from "../../phoneSheetService"
import { serverNow, serverNowIso } from "../../serverClock"
import { layOnto } from "../../tabMergeService"
import { entryAfter } from "../../timeFixService"
import {
  LONG_ENTRY_SECONDS,
  dateKey,
  epochSeconds,
  formatClock,
  formatDate,
  formatIdleSpan,
  formatTimeOfDay,
  isoFromEpochSeconds,
} from "../../timetrackFormatService"
import {
  applyAutotracker,
  createProject,
  createTag,
  forgottenTimer,
  matchAutotracker,
  moveEntryToDay,
  stopTimer,
  undoDisplacement,
} from "../../timetrackService"
import type { EntryDraft, Id, IsoDateTime, TimetrackState } from "../../types"
import type { AfterCheck } from "../afterCheck"
import { MomentDrums } from "../Drums"
import type { MomentKind } from "../MomentPicker"
import { announceNeighbours, undoOrSay } from "../neighbourNotice"
import { DescriptionField, ProjectPicker, TagPicker } from "../pickers"
import { ColorDot, DayPicker, Dropdown, touchRow } from "../primitives"
import { landOnCurrent, type SetState } from "./landOnCurrent"
import { deleteWithUndo } from "./PhoneEntryList"
import { UndoContext } from "./undoContext"
import { WORKED_ON, WORKING_ON } from "./RunBar"

export type SheetTarget =
  | { mode: "edit"; entryId: Id }
  | { mode: "start" | "manual"; openedAt: IsoDateTime; draft: EntryDraft }

export function sheetKey(target: SheetTarget): string {
  return target.mode === "edit" ? `edit:${target.entryId}` : `${target.mode}:${target.openedAt}`
}

const NUDGES: { minutes: number; text: string; label: string }[] = [
  { minutes: -15, text: "−15", label: "15 minutes earlier" },
  { minutes: -5, text: "−5", label: "5 minutes earlier" },
  { minutes: 5, text: "+5", label: "5 minutes later" },
  { minutes: 15, text: "+15", label: "15 minutes later" },
]

const FOCUSABLE = 'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function EntrySheet({
  target,
  state,
  setState,
  latestState,
  nowSec,
  pushToast,
  afterCheck,
  dirtyRef,
  backedOut,
  onClose,
  onKeepEditing,
  onMoment,
  focusName = false,
}: {
  target: SheetTarget
  state: TimetrackState
  setState: SetState
  /**
   * The workspace as it is now, for an Undo pressed after this sheet closed:
   * the switch's Undo asked the copy from before the create, so with a third
   * timer started since it found nothing in the way, then did nothing, in
   * silence (code review of ddffc410).
   */
  latestState: () => TimetrackState
  nowSec: number
  pushToast: PushToast
  afterCheck: AfterCheck
  /** whether anything is changed and not saved: the shell reads it when Back is pressed */
  dirtyRef: MutableRefObject<boolean>
  /** Back was pressed with something changed: ask, as ✕ does */
  backedOut: boolean
  /** done with it: saved, discarded, or closed with nothing changed */
  onClose: () => void
  /** "Keep editing", answering Back */
  onKeepEditing: () => void
  /** Stop at…, Switched at…, Started at…: the shell closes this and opens the moment picker */
  onMoment: (kind: MomentKind, draft: EntryDraft) => void
  /** the name takes the focus, as for a new entry: a block a held finger just made */
  focusName?: boolean
}) {
  const isNew = target.mode !== "edit"
  const entry = target.mode === "edit" ? (state.entries.find((e) => e.id === target.entryId && !e.serverDeletedAt) ?? null) : null
  const [newBase] = useState<SheetDraft | null>(() =>
    target.mode === "start" ? startingDraft(target.draft, target.openedAt) : target.mode === "manual" ? manualDraft(target.draft, target.openedAt) : null,
  )
  // the entry as it is now, so what the other device changes shows; a new one as it was opened
  const base = useMemo(() => (entry ? sheetDraftOf(entry) : newBase), [entry, newBase])

  const [changes, setChanges] = useState<SheetChanges>({})
  const baseRef = useRef(base)
  baseRef.current = base
  /**
   * Every edit goes through here, on the changes as they are now, so two edits
   * in one event build on each other (picking with @ writes the cleaned words
   * and then the project — the bug Phase 0 fixed in the timer bar).
   */
  const edit = (change: (draft: SheetDraft) => SheetDraft) => {
    setNotice(null)
    setChanges((prev) => (baseRef.current ? changesBetween(baseRef.current, change(shownDraft(baseRef.current, prev))) : prev))
  }

  const shown = base ? shownDraft(base, changes) : null
  /**
   * ITS OWN SECOND HAND WHILE IT RUNS. With nothing running the tracker's clock
   * ticks every ten seconds, so a new entry's "0:00:00" stood still while the
   * name was typed; Toggl's counts from the tap [V1 1:51–2:00].
   */
  const [ownSecond, setOwnSecond] = useState(() => Math.floor(serverNow() / 1000))
  const ticking = shown?.stop === null
  useEffect(() => {
    if (!ticking) return
    const timer = window.setInterval(() => setOwnSecond(Math.floor(serverNow() / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [ticking])
  const dirty = base ? isDirty(base, changes) : false
  dirtyRef.current = dirty
  const running = shown?.stop === null
  const nowIso = isoFromEpochSeconds(nowSec)
  const format = state.user.timeFormat

  const [edge, setEdge] = useState<Edge>(() => (base?.stop === null ? "start" : "stop"))
  const [drumsOpen, setDrumsOpen] = useState(!isNew)
  const [asking, setAsking] = useState(false)
  const offerUndo = useContext(UndoContext)
  /**
   * WHAT THE SHEET REFUSES, SAID IN THE SHEET. On a phone the toasts sit under
   * an open sheet (they used to cover a sheet's rows, findability 2026-11-05),
   * so a refusal made while it is open is written here instead.
   */
  const [notice, setNotice] = useState<string | null>(null)
  const refuse = (text: string) => setNotice(text)
  /** one tap on a chip makes it typeable: its input takes the focus, its time selected (findability 2026-11-05) */
  const focusChip = useRef<Edge | null>(null)
  const [moving, setMoving] = useState(false)
  /** the "@ Add a project" chip's asks (`DescriptionField`'s `askProject`) */
  const [askProject, setAskProject] = useState(0)
  /** "Create a new project" with no name typed: the name it asks for */
  const [namingProject, setNamingProject] = useState<string | null>(null)
  /** ⋮ "Project and task…": the full picker, with tasks, which the inline list does not offer */
  const [pickingProject, setPickingProject] = useState(false)

  // what is typed and not yet applied: a ref too, because Enter applies it and the blur that follows must not again
  const [chipText, setChipText] = useState<string | null>(null)
  const chipRef = useRef<string | null>(null)
  const [typing, setTyping] = useState<{ raw: string; shown: string } | null>(null)
  const typingRef = useRef<{ raw: string; shown: string } | null>(null)
  const putChip = (text: string | null) => {
    chipRef.current = text
    setChipText(text)
  }
  const putTyping = (box: { raw: string; shown: string } | null) => {
    typingRef.current = box
    setTyping(box)
  }

  // the entry was deleted while this was open (here, or on the other device): nothing left to edit
  const gone = target.mode === "edit" && !entry
  useEffect(() => {
    if (!gone) return
    pushToast("That time entry was deleted", "info")
    onClose()
  }, [gone, onClose, pushToast])

  /** A dialog keeps the keyboard: in on open, Tab wraps, and back where it was on close (as `Modal` does) */
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  if (!base || !shown) return null

  const show = (result: SheetResult, apply: (draft: SheetDraft) => SheetDraft) => {
    if (!result.draft) {
      refuse(result.refusal)
      return false
    }
    edit(apply)
    return true
  }

  /** a typed chip or duration, applied to `draft`: what DONE saves even when Enter was never pressed */
  const settle = (draft: SheetDraft): SheetResult => {
    let next = draft
    const chip = chipRef.current
    if (chip !== null && chip.trim() !== chipShown(next)) {
      const typed = edge === "start" ? typeStart(next, chip, serverNowIso()) : typeStop(next, chip)
      if (!typed.draft) return typed
      next = typed.draft
    }
    const box = typingRef.current
    if (box && box.raw.trim() !== "") {
      const typed = typeDurationInto(next, box.raw, serverNowIso())
      if (!typed.draft) return typed
      next = typed.draft
    }
    return { draft: next }
  }
  function chipShown(draft: SheetDraft): string {
    const iso = edge === "start" ? draft.start : draft.stop
    return iso ? formatTimeOfDay(iso, format) : ""
  }

  const commitChip = () => {
    const text = chipRef.current
    putChip(null)
    if (text === null || text.trim() === chipShown(shown)) return
    const typed = edge === "start" ? typeStart(shown, text, serverNowIso()) : typeStop(shown, text)
    show(typed, (d) => (typed.draft ? { ...d, start: typed.draft.start, stop: typed.draft.stop } : d))
  }

  const commitTyping = () => {
    const box = typingRef.current
    putTyping(null)
    if (!box || box.raw.trim() === "") return
    const typed = typeDurationInto(shown, box.raw, serverNowIso())
    show(typed, (d) => (typed.draft ? { ...d, start: typed.draft.start, stop: typed.draft.stop } : d))
  }

  const keys = (commit: () => void, cancel: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commit()
      event.currentTarget.blur()
    } else if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      cancel()
      event.currentTarget.blur()
    }
  }

  // --- DONE / CREATE -------------------------------------------------------

  const done = () => {
    const settled = settle(shown)
    if (!settled.draft) {
      refuse(settled.refusal)
      return
    }
    const final = settled.draft
    putChip(null)
    putTyping(null)

    if (target.mode === "edit") {
      const changesNow = changesBetween(base, final)
      if (Object.keys(changesNow).length === 0) {
        onClose()
        return
      }
      const id = target.entryId
      // asked first, so a refusal (a locked week, a required project) keeps the sheet open
      const refusal = saveEdit(state, id, changesNow, serverNowIso()).violations[0]
      if (refusal) {
        refuse(refusal.message)
        return
      }
      const write = (latest: TimetrackState, at: IsoDateTime) => {
        const saved = landOnCurrent(latest, (current) => saveEdit(current, id, changesNow, at), setState, pushToast)
        if (saved) announceNeighbours(saved, latest.user.timeFormat, setState, pushToast, () => latest)
      }
      // ending a running timer is a Stop: it waits for the check, as Stop does (D2)
      if (saveStops(state, id, changesNow)) afterCheck((latest, tappedAt) => write(latest, tappedAt), { keep: { kind: "stop", seen: id, at: changesNow.stop ?? undefined } })
      else write(state, serverNowIso())
      onClose()
      return
    }

    const refusal = createFromSheet(state, final, serverNowIso(), base?.start ?? null).violations[0]
    if (refusal) {
      refuse(refusal.message)
      return
    }
    const create = (latest: TimetrackState, at: IsoDateTime) => {
      const made = createFromSheet(latest, final, at, base?.start ?? null)
      if (made.violations[0]) {
        pushToast(made.violations[0].message, "error")
        return
      }
      // the new entry's id is made here, once
      setState(layOnto(latest, made.state))
      const { stopped, created } = made
      // the other device's timer stopped where this one began: said, with both halves back on Undo
      if (stopped && created) {
        pushToast(
          `Stopped “${stopped.description.trim() || "(no description)"}” and started “${created.description.trim() || "(no description)"}”`,
          "info",
          () => undoOrSay(latestState, (current) => undoDisplacement(current, created.id, stopped.id, serverNowIso()), setState, pushToast),
        )
      }
    }
    // a timer starting waits for the check like Start does; its words wait as the next thing if the other device beat it (A5)
    if (final.stop === null) afterCheck(create, { keepAsNext: entryDraftOf(final) })
    else create(state, serverNowIso())
    onClose()
  }

  const close = () => {
    if (dirty || (chipRef.current !== null && chipRef.current.trim() !== chipShown(shown)) || Boolean(typingRef.current?.raw)) {
      setAsking(true)
      return
    }
    onClose()
  }

  // --- the running entry's Stop, Stop at…, Switched at… ---------------------

  /**
   * ■ STOP: WHAT WAS TYPED IS SAVED NOW; ONLY THE STOP WAITS FOR THE CHECK (D2).
   *
   * Both used to wait, together. When the check found the PC had already
   * stopped this timer, the Stop was dropped ("Tap again if you still want
   * to") and the name typed here went with it (offline audit, Phase 8). The
   * name is the person's work whatever happens to the Stop: it goes onto the
   * entry as it is now, and the PC's stop stands.
   */
  const stopNow = () => {
    if (target.mode !== "edit") return
    const id = target.entryId
    const changesNow = changesBetween(base, settle(shown).draft ?? shown)
    if (Object.keys(changesNow).length > 0) landOnCurrent(state, (current) => saveEdit(current, id, changesNow, serverNowIso()), setState, pushToast)
    afterCheck((latest, tappedAt) => {
      landOnCurrent(
        latest,
        (current) => {
          const still = current.entries.find((e) => e.id === id)
          return still?.stop === null ? { state: stopTimer(current, tappedAt).state, violations: [] } : { state: current, violations: [] }
        },
        setState,
        pushToast,
      )
    }, { keep: { kind: "stop", seen: id } })
    onClose()
  }

  /** Stop at… and Switched at…: what was changed here is saved first, then the moment is asked */
  const moment = (kind: MomentKind) => {
    const settled = settle(shown)
    if (!settled.draft) {
      refuse(settled.refusal)
      return
    }
    if (target.mode === "edit") {
      const changesNow = changesBetween(base, settled.draft)
      if (Object.keys(changesNow).length > 0) {
        const id = target.entryId
        if (!landOnCurrent(state, (current) => saveEdit(current, id, changesNow, serverNowIso()), setState, (text) => refuse(text))) return
      }
    }
    onMoment(kind, kind === "start" ? entryDraftOf(settled.draft) : { description: "", projectId: null, taskId: null, tagIds: [], billable: false })
  }

  // --- the pieces ------------------------------------------------------------

  const seconds = running ? Math.max(0, Math.max(nowSec, ownSecond) - epochSeconds(shown.start)) : Math.max(0, epochSeconds(shown.stop!) - epochSeconds(shown.start))
  const project = state.projects.find((p) => p.id === shown.projectId) ?? null
  const task = state.tasks.find((t) => t.id === shown.taskId) ?? null
  const tagNames = state.tags.filter((t) => shown.tagIds.includes(t.id)).map((t) => t.name)
  const suggestion = matchAutotracker(state, shown.description)
  const suggestionProject = suggestion ? state.projects.find((p) => p.id === suggestion.projectId) : null
  const lastStop = lastStopTime(state, shown, target.mode === "edit" ? target.entryId : null, nowIso)
  const rounded = roundedStop(shown, state.workspace.rounding)
  const forgotten = target.mode === "edit" && running ? forgottenTimer(state, nowSec) : null
  const after = target.mode === "edit" ? entryAfter(state, target.entryId) : null
  const selected: Edge = running && edge === "stop" ? "start" : edge
  const selectedIso = selected === "start" ? shown.start : shown.stop!

  const chip = (which: Edge) => {
    const iso = which === "start" ? shown.start : shown.stop
    const label = which === "start" ? "Start" : "End"
    if (iso === null) {
      // a running entry's end is "now", with no date, as Toggl's is [H25 help_14 f012]
      return (
        <span data-testid="end-chip" className="flex min-h-11 items-center justify-center rounded-lg px-3 text-sm tabular-nums">
          {formatTimeOfDay(isoFromEpochSeconds(Math.max(nowSec, ownSecond)), format)}
        </span>
      )
    }
    const time = formatTimeOfDay(iso, format)
    const date = chipDate(dateKey(iso), state.user.dateFormat)
    if (which === selected) {
      return (
        <div className="flex min-h-11 items-center gap-1 rounded-lg border border-primary bg-primary/10 px-2">
          <input
            ref={(input) => {
              if (!input || focusChip.current !== which) return
              focusChip.current = null
              input.focus()
              input.select()
            }}
            aria-label={`${label} time`}
            inputMode="numeric"
            value={chipText ?? time}
            onFocus={(event) => {
              putChip(event.currentTarget.value)
              event.currentTarget.select()
            }}
            onChange={(event) => putChip(event.target.value)}
            onBlur={commitChip}
            onKeyDown={keys(commitChip, () => putChip(null))}
            className="w-full min-w-0 bg-transparent text-center text-sm tabular-nums outline-none"
          />
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{date}</span>
        </div>
      )
    }
    return (
      <button
        type="button"
        aria-label={`${label}: ${time} ${date}`}
        onClick={() => {
          commitChip()
          focusChip.current = which
          setEdge(which)
        }}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border px-2 text-sm tabular-nums hover:bg-secondary/60"
      >
        {time}
        <span className="text-xs text-muted-foreground">{date}</span>
      </button>
    )
  }

  const textLink = (label: string, enabled: boolean, run: () => void) => (
    <button
      type="button"
      disabled={!enabled}
      onClick={run}
      className="mt-1 min-h-9 w-full whitespace-nowrap rounded px-0.5 text-[10px] font-semibold uppercase text-primary disabled:text-muted-foreground disabled:opacity-60"
    >
      {label}
    </button>
  )

  const menuItems: { label: string; run: () => void; pressed?: boolean }[] = [
    ...(shown.stop !== null || epochSeconds(shown.start) <= nowSec
      ? [{ label: "End now", run: () => edit((d) => ({ ...d, stop: Date.parse(serverNowIso()) < Date.parse(d.start) ? d.start : serverNowIso() })) }]
      : []),
    ...(after && after.start !== shown.stop ? [{ label: "End where the next one starts", run: () => edit((d) => moveEdge({ ...d, stop: d.stop ?? d.start }, "stop", after.start, serverNowIso())) }] : []),
    { label: "Duration only (hide start and end times)", pressed: shown.duronly, run: () => edit((d) => ({ ...d, duronly: !d.duronly })) },
    ...(target.mode === "edit" ? [{ label: "Move to another day…", run: () => setMoving(true) }] : []),
    ...(target.mode === "start" ? [{ label: "Started at…", run: () => moment("start") }] : []),
    { label: "Project and task…", run: () => setPickingProject(true) },
  ]

  const title = isNew ? "New time entry" : "Time entry"

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault()
          if (asking) setAsking(false)
          else close()
          return
        }
        if (event.key !== "Tab" || !dialogRef.current) return
        const controls = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
        if (controls.length === 0) return
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      className="fixed inset-0 z-[9600] flex flex-col justify-end bg-black/60 outline-none"
    >
      {/* the list stays in view above it, as Toggl's does */}
      <button type="button" aria-hidden tabIndex={-1} className="min-h-[8dvh] flex-1 cursor-default" onClick={close} />
      <div className="flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl">
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/40" />
        <div className="flex items-center gap-1 px-2 pt-1">
          <button type="button" onClick={close} aria-label="Close" className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
            <IconClose className="size-5" />
          </button>
          <span className="ml-auto" />
          {menuItems.length > 0 && (
            <Dropdown
              align="right"
              width="w-64"
              ariaLabel="More options"
              trigger={() => (
                <span className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
                  <IconMenu className="size-5" />
                </span>
              )}
            >
              {(closeMenu) => (
                <div className="py-1 text-sm">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      aria-pressed={item.pressed}
                      onClick={() => {
                        closeMenu()
                        item.run()
                      }}
                      className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-secondary/60", touchRow)}
                    >
                      <span className="flex-1">{item.label}</span>
                      {item.pressed && <span className="text-xs text-primary">On</span>}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>
          )}
          <button
            type="button"
            onClick={done}
            className="min-h-11 rounded-md px-3 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-secondary"
          >
            {isNew ? "Create" : "Done"}
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* the big duration; ✎, or a tap on the number, types one in */}
          {typing ? (
            <div>
              <input
                aria-label="Duration"
                inputMode="decimal"
                autoFocus
                value={typing.shown}
                placeholder="0:00"
                onChange={(event) => putTyping(typeDuration(typingRef.current ?? { raw: "", shown: "" }, event.target.value))}
                onBlur={commitTyping}
                onKeyDown={keys(commitTyping, () => putTyping(null))}
                className="w-full bg-transparent text-3xl font-semibold tabular-nums outline-none"
              />
              <p className="text-xs text-muted-foreground">{SHEET_DURATION_HINT}</p>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Type a duration"
              onClick={() => {
                commitChip()
                // it clears to nothing, as Toggl's does, and the digits fill from the right
                putTyping({ raw: "", shown: "" })
              }}
              className="flex items-center gap-2 py-1 text-left"
            >
              <span className="text-3xl font-semibold tabular-nums">{formatClock(seconds)}</span>
              <IconEdit className="size-4 text-muted-foreground" />
            </button>
          )}
          {notice && (
            <p role="alert" className="mt-1 rounded-md bg-destructive/15 px-2 py-1.5 text-sm text-destructive">
              {notice}
            </p>
          )}
          {/* D10: over 12 hours is said here, not asked afterwards; DONE is the answer */}
          {seconds > LONG_ENTRY_SECONDS && <p className="text-xs text-muted-foreground">That makes it {formatIdleSpan(seconds)}.</p>}

          <DescriptionField
            state={state}
            value={shown.description}
            projectId={shown.projectId}
            placeholder={running ? WORKING_ON : WORKED_ON}
            autoFocus={isNew || focusName}
            onChange={(description) => edit((d) => ({ ...d, description }))}
            onPickProject={(projectId, taskId) => edit((d) => ({ ...d, projectId, taskId }))}
            onPickTag={(tagId) => edit((d) => ({ ...d, tagIds: [...new Set([...d.tagIds, tagId])] }))}
            onSubmit={done}
            askProject={askProject}
            inline={{
              onClearProject: () => edit((d) => ({ ...d, projectId: null, taskId: null })),
              onCreateProject: (name) => {
                // with only @ typed there is no name yet: ask for one
                if (!name.trim()) {
                  setNamingProject("")
                  return
                }
                // made now, as Toggl's makes it; choosing it waits for DONE
                const made = createProject(state, { name }, serverNowIso())
                setState(layOnto(state, made.state))
                edit((d) => ({ ...d, projectId: made.id, taskId: null }))
              },
              onCreateTag: (name) => {
                const made = createTag(state, name, serverNowIso())
                setState(layOnto(state, made.state))
                edit((d) => ({ ...d, tagIds: [...new Set([...d.tagIds, made.id])] }))
              },
            }}
            className="mt-1 border-b border-border"
          />
          {suggestion && suggestionProject && shown.projectId !== suggestion.projectId && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <IconAuto className="size-3.5 text-primary" />
              <span className="text-muted-foreground">“{suggestion.keyword}” usually goes to</span>
              <ColorDot color={suggestionProject.color} />
              <span>{suggestionProject.name}</span>
              <Button size="sm" variant="ghost" className="h-11 px-2" onClick={() => edit((d) => ({ ...d, ...applyAutotracker(entryDraftOf(d), suggestion) }))}>
                Apply
              </Button>
            </div>
          )}

          {/* the chips [H25 help_14 f012]: project ×, # Add tags, $ Billable */}
          <div className="flex flex-wrap items-center gap-2 py-3">
            <div className={cn("flex items-center rounded-full border border-border", project && "bg-secondary")}>
              {/* "@ Add a project" puts @ in the name and opens the inline list, as Toggl's chip does (V1 0:32) */}
              <button
                type="button"
                onClick={() => {
                  edit((d) => ({ ...d, description: d.description.trim() ? `${d.description.trimEnd()} @` : "@" }))
                  setAskProject((n) => n + 1)
                }}
                className={cn("flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm", !project && "text-muted-foreground")}
              >
                {project ? <ColorDot color={project.color} /> : <span aria-hidden>@</span>}
                <span className="max-w-[160px] truncate">{project ? (task ? `${project.name} · ${task.name}` : project.name) : "Add a project"}</span>
              </button>
              {project && (
                <button
                  type="button"
                  aria-label="Remove the project"
                  onClick={() => edit((d) => ({ ...d, projectId: null, taskId: null }))}
                  className="-ml-3 flex size-11 items-center justify-center rounded-full text-muted-foreground"
                >
                  <IconClose className="size-4" />
                </button>
              )}
            </div>
            <TagPicker
              state={state}
              tagIds={shown.tagIds}
              onChange={(tagIds) => edit((d) => ({ ...d, tagIds }))}
              onCreateTag={(name) => {
                const made = createTag(state, name, serverNowIso())
                setState(layOnto(state, made.state))
                edit((d) => ({ ...d, tagIds: [...new Set([...d.tagIds, made.id])] }))
              }}
              renderTrigger={() => (
                <span
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-sm",
                    tagNames.length ? "bg-secondary" : "text-muted-foreground",
                  )}
                >
                  <IconTag className="size-3.5" />
                  <span className="max-w-[160px] truncate">{tagNames.length ? tagNames.join(", ") : "Add tags"}</span>
                </span>
              )}
            />
            <button
              type="button"
              aria-pressed={shown.billable}
              onClick={() => edit((d) => ({ ...d, billable: !d.billable }))}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-sm",
                shown.billable ? "bg-secondary text-foreground" : "text-muted-foreground",
              )}
            >
              <IconMoney className="size-3.5" />
              Billable
            </button>
          </div>

          {namingProject !== null && (
            <div className="flex items-center gap-2 pb-3">
              <input
                aria-label="New project name"
                placeholder="Name your project"
                autoFocus
                value={namingProject}
                onChange={(event) => setNamingProject(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-md border border-border bg-background/60 px-3 text-base outline-none"
              />
              <Button
                type="button"
                className="h-11"
                disabled={!namingProject.trim()}
                onClick={() => {
                  const made = createProject(state, { name: namingProject.trim() }, serverNowIso())
                  setState(layOnto(state, made.state))
                  edit((d) => ({ ...d, projectId: made.id, taskId: null }))
                  setNamingProject(null)
                }}
              >
                Create project
              </Button>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setNamingProject(null)}>
                Cancel
              </Button>
            </div>
          )}
          {pickingProject && (
            <ProjectPicker
              state={state}
              projectId={shown.projectId}
              taskId={shown.taskId}
              autoOpen
              onClose={() => setPickingProject(false)}
              onChange={(projectId, taskId) => edit((d) => ({ ...d, projectId, taskId }))}
              onCreateProject={(name) => {
                const made = createProject(state, { name }, serverNowIso())
                setState(layOnto(state, made.state))
                edit((d) => ({ ...d, projectId: made.id, taskId: null }))
              }}
              renderTrigger={() => <span className="sr-only">Project and task</span>}
            />
          )}
          {/* Edit duration: start → end, the two shortcuts, the drums where Toggl's wheel is */}
          <section aria-label="Edit duration" className="rounded-xl bg-secondary/40 p-3">
            {!isNew && (
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <IconTimer className="size-3.5" /> Edit duration
              </p>
            )}
            {shown.duronly && <p className="mb-2 text-xs text-muted-foreground">Duration only: the list hides its start and end.</p>}
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <div>
                {chip("start")}
                {textLink("Set to last stop time", lastStop !== null, () => {
                  if (!lastStop) return
                  const moved = withStart(shown, lastStop, serverNowIso())
                  show(moved, (d) => ({ ...d, start: lastStop }))
                })}
              </div>
              <span className="flex min-h-11 items-center text-muted-foreground">→</span>
              <div>
                {chip("stop")}
                {textLink("Round stop time", rounded !== null, () => rounded && edit((d) => ({ ...d, stop: rounded })))}
              </div>
            </div>

            {isNew && (
              <button
                type="button"
                aria-expanded={drumsOpen}
                onClick={() => setDrumsOpen((open) => !open)}
                className="mt-1 flex min-h-11 items-center gap-1 text-sm font-medium text-primary"
              >
                <span aria-hidden className={cn("transition-transform", drumsOpen && "rotate-90")}>›</span> Edit duration
              </button>
            )}

            {drumsOpen && (
              <div className="pt-2">
                <MomentDrums
                  key={selected}
                  label={selected === "start" ? "Start" : "End"}
                  value={selectedIso}
                  onChange={(iso) => edit((d) => moveEdge(d, selected, iso, serverNowIso()))}
                  bounds={edgeBounds(shown, selected, serverNowIso())}
                  timeFormat={format}
                  todayKey={dateKey(nowIso)}
                />
                <div className="mt-2 flex justify-center gap-2">
                  {NUDGES.map((nudge) => (
                    <Button
                      key={nudge.minutes}
                      type="button"
                      variant="outline"
                      aria-label={nudge.label}
                      onClick={() => edit((d) => nudgeEdge(d, selected, nudge.minutes, serverNowIso()))}
                      className="h-11 min-w-0 flex-1 px-0 tabular-nums"
                    >
                      {nudge.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {moving && target.mode === "edit" && (
              <div className="pt-3">
                <p className="pb-1 text-xs text-muted-foreground">Move the whole entry to another day, keeping its length:</p>
                <DayPicker
                  value={dateKey(shown.start)}
                  onChange={(day) => moveTo(day)}
                  onStep={(day) => moveTo(day)}
                  todayKey={dateKey(nowIso)}
                />
              </div>
            )}
          </section>

          {/* running: the big Stop, with the owner's Stop at… and Switched at… beside it (D-SWITCHED) */}
          {target.mode === "edit" && running && (
            <div className="pt-4">
              <div className="flex items-center justify-center gap-6">
                <button type="button" onClick={stopNow} className="flex flex-col items-center gap-1 text-sm font-medium">
                  <span className="flex size-16 items-center justify-center rounded-full bg-destructive text-white shadow-md">
                    <IconStop className="size-6 fill-current" />
                  </span>
                  Stop
                </button>
                <div className="flex flex-col gap-1">
                  <Button type="button" variant="outline" className="h-11" onClick={() => moment("stop")}>
                    Stop at…
                  </Button>
                  <Button type="button" variant="outline" className="h-11" onClick={() => moment("switch")}>
                    Switched at…
                  </Button>
                </div>
              </div>
              {forgotten && (
                <p className="pt-2 text-center text-xs text-muted-foreground">
                  Running for {formatIdleSpan(forgotten.hours * 3600)}. Forgot to stop it? Stop at… ends it where the work did.
                </p>
              )}
            </div>
          )}

          <div className="mt-4 border-t border-border pt-2">
            {target.mode === "edit" ? (
              <button
                type="button"
                onClick={() => {
                  deleteWithUndo(state, [target.entryId], setState, pushToast, offerUndo)
                  onClose()
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-destructive"
              >
                <IconDelete className="size-4" /> Delete time entry
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-11 w-full items-center justify-center text-sm font-semibold uppercase tracking-wide text-destructive"
              >
                Discard entry
              </button>
            )}
            {entry && (
              <p className="pt-1 text-center text-[11px] text-muted-foreground">
                Created with {entry.createdWith}
                {entry.sourceEventId ? " · imported from a calendar event" : ""} · last updated {formatDate(dateKey(entry.at), state.user.dateFormat)}{" "}
                {formatTimeOfDay(entry.at, format)}
              </p>
            )}
          </div>
        </div>
      </div>

      {(asking || backedOut) && (
        <div className="fixed inset-0 z-[9610] flex items-center justify-center bg-black/40 p-6">
          <div role="alertdialog" aria-modal="true" aria-label="Discard changes?" className="w-full max-w-xs rounded-xl border border-border bg-card p-4 shadow-2xl">
            <p className="text-base font-semibold">Discard changes?</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                autoFocus
                onClick={() => {
                  setAsking(false)
                  if (backedOut) onKeepEditing()
                }}
              >
                Keep editing
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11"
                onClick={() => {
                  setAsking(false)
                  putChip(null)
                  putTyping(null)
                  dirtyRef.current = false
                  onClose()
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  /** Move to another day…: both ends together, the length kept (today's date stepper, `moveEntryToDay`) */
  function moveTo(day: string) {
    if (!shown || target.mode !== "edit") return
    const probe = moveEntryToDay({ ...state, entries: state.entries.map((e) => (e.id === target.entryId ? { ...e, start: shown.start, stop: shown.stop } : e)) }, target.entryId, day, serverNowIso())
    if (probe.violations[0]) {
      refuse(probe.violations[0].message)
      return
    }
    const moved = probe.state.entries.find((e) => e.id === target.entryId)
    if (moved) edit((d) => ({ ...d, start: moved.start, stop: moved.stop }))
  }
}
