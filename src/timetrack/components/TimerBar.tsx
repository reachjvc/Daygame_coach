"use client"

/**
 * The timer bar: description + project + tags + billable, in either timer mode
 * (live start/stop) or manual mode (typed start/stop/duration), plus the
 * favorites strip and the autotracker suggestion.
 */

import { useCallback, useContext, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { serverNowIso } from "../serverClock"
import { layOnto } from "../tabMergeService"
import { IconAdd, IconAuto, IconClose, IconFavorite, IconMenu, IconStart, IconStop, IconTimer, IconEdit } from "../icons"
import {
  DURATION_HINT,
  DURATION_UNREADABLE,
  dateKey,
  epochSeconds,
  formatClock,
  formatDuration,
  formatIdleSpan,
  formatTimeOfDay,
  formatWhen,
  isoFromEpochSeconds,
  lengthQuestion,
  otherHalfOfDay,
  parseDurationInput,
  parseEndTimeInput,
  parseTimeInput,
  unreadableTimeMessage,
} from "../timetrackFormatService"
import {
  applyAutotracker,
  applyDraftPatch,
  createManualEntry,
  createTag,
  createProject,
  emptyDraft,
  entrySeconds,
  findFavorite,
  forgottenTimer,
  liveEntries,
  matchAutotracker,
  resumeFrom,
  resumeStartFor,
  runningEntry,
  setRunningElapsed,
  toggleFavorite,
  updateEntry,
} from "../timetrackService"
import type { EntryDraft, Id, IsoDate, IsoDateTime, SaveViolation, TimeEntry, TimetrackState } from "../types"
import { MANUAL_FORM_KEY } from "../config"
import { useDebouncedCommit } from "../hooks/useDebouncedCommit"
import { useIsMobile } from "../hooks/useIsMobile"
import type { PushToast } from "../hooks/useTimetrack"
import { AfterCheckContext } from "./afterCheck"
import { MomentDialog, type MomentKind } from "./MomentPicker"
import { useMomentActions } from "./useMomentActions"
import { RunningTimeBox } from "./RunningTimeBox"
import { BillableToggle, DescriptionField, ProjectPicker, TagPicker } from "./pickers"
import { ColorDot, DayPicker, Dropdown, touchRow, touchTarget } from "./primitives"

/**
 * Said whenever a duration typed into a running timer ended it, with the other
 * reading one tap away. A shorter time ending the timer is new, and the person
 * who meant "I started late" must not have to find out from their week total.
 *
 * `getState` is read when the button is pressed, not now: by then another timer
 * may be running, and the refusal has to be said rather than swallowed.
 */
export function announceEndedEarly(
  stopped: TimeEntry,
  seconds: number,
  getState: () => TimetrackState,
  setState: (updater: (current: TimetrackState) => TimetrackState) => void,
  pushToast: PushToast,
) {
  const what = stopped.description.trim()
  const format = getState().user.timeFormat
  const when = formatWhen(stopped.stop ?? stopped.start, format, dateKey(new Date()))
  /**
   * The other reading MOVES the start to that long before now — Toggl's meaning
   * of a running timer's length — so the button says where it will start, and
   * pressing it later starts it there, not later than it said (edits audit B9).
   */
  const from = resumeStartFor(seconds, serverNowIso())
  pushToast(
    `Ended ${what ? `“${what}”` : "the timer"} ${when}, ${formatIdleSpan(seconds)} after it started`,
    "info",
    () => {
      const refusal = resumeFrom(getState(), stopped.id, from, serverNowIso()).violations[0]
      if (refusal) {
        pushToast(refusal.message, "error")
        return
      }
      setState((current) => {
        const resumed = resumeFrom(current, stopped.id, from, serverNowIso())
        return resumed.violations.length > 0 ? current : resumed.state
      })
    },
    `Keep running from ${formatTimeOfDay(from, format)}`,
  )
}

/**
 * The bar's typed name, on the entry it was typed into — running or, by the
 * time the pause is up, stopped by the other device. Gone, or deleted
 * elsewhere, it is nobody's to name: see `commitDescription`.
 */
function describeEntry(
  state: TimetrackState,
  entryId: Id,
  description: string,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const entry = state.entries.find((e) => e.id === entryId)
  if (!entry || entry.serverDeletedAt) return { state, violations: [] }
  return updateEntry(state, entryId, { description }, nowIso)
}

/**
 * A TYPED TIME OR LENGTH THAT MAKES AN ENTRY LONGER THAN 12 HOURS ASKS FIRST (plan D10).
 *
 * "09:00" typed as the end of a 10:00 start is 09:00 tomorrow — an exact clock
 * time, read the only way it can be — and it was written without a word: a
 * 23-hour entry, found later in the week total. Now nothing is written until
 * an answer is pressed: the other half of the day, when that reading is a
 * sensible one ("Use 21:00"), or what was typed ("Keep 23 hours"). Dismissing
 * the question, or letting it time out, writes nothing.
 *
 * A toast rather than a dialog, because the detail sheet also commits on its
 * way out, and by then there is no sheet left to ask in. Each `write` reads the
 * workspace when it is pressed, not now.
 */
export function askBeforeLong(
  seconds: number,
  write: () => void,
  pushToast: PushToast,
  alternative?: { label: string; write: () => void },
  /**
   * The entry's length before this edit, when it has one. Then a typed value
   * asks only when it makes the entry longer, and also when it cuts more than
   * 12 hours off a finished one: see `lengthQuestion` (edits audit B5).
   */
  before?: { seconds: number; running?: boolean } | null,
) {
  const question = lengthQuestion(seconds, before)
  if (question === null) {
    write()
    return
  }
  const span = formatIdleSpan(seconds)
  if (question === "cut") {
    pushToast(`That cuts it from ${formatIdleSpan(before?.seconds ?? 0)} to ${span}.`, "info", write, `Keep ${span}`)
    return
  }
  if (alternative) {
    pushToast(`That makes it ${span}. Did you mean ${alternative.label}?`, "info", alternative.write, `Use ${alternative.label}`, {
      label: `Keep ${span}`,
      run: write,
    })
    return
  }
  pushToast(`That makes it ${span}.`, "info", write, `Keep ${span}`)
}

/** The same question for a typed time: the length it makes, and the other half of the day as the likely meaning */
export function askAboutTypedTime(
  which: "start" | "stop",
  typedIso: IsoDateTime,
  /**
   * The entry as it is: `stop` is now for a running one, and `running` says so.
   * `isNew` for manual mode's form, which has no length before this one.
   */
  entry: { start: IsoDateTime; stop: IsoDateTime; running?: boolean; isNew?: boolean },
  write: (iso: IsoDateTime) => void,
  pushToast: PushToast,
  timeFormat: TimetrackState["user"]["timeFormat"],
) {
  const start = which === "start" ? typedIso : entry.start
  const stop = which === "stop" ? typedIso : entry.stop
  // a start typed after the end moves the whole entry and keeps its length (`setEntryStart`)
  const seconds = epochSeconds(stop) >= epochSeconds(start) ? epochSeconds(stop) - epochSeconds(start) : epochSeconds(entry.stop) - epochSeconds(entry.start)
  const other = otherHalfOfDay(which, typedIso, entry.start, entry.stop)
  askBeforeLong(
    seconds,
    () => write(typedIso),
    pushToast,
    other ? { label: formatTimeOfDay(other, timeFormat), write: () => write(other) } : undefined,
    entry.isNew ? null : { seconds: epochSeconds(entry.stop) - epochSeconds(entry.start), running: entry.running },
  )
}

/**
 * WHERE MANUAL MODE OPENS: AT THE GAP YOU ARE MOST LIKELY FILLING.
 *
 * It opened at 09:00–10:00 whatever the time was, so every hand-added entry
 * began with two clock times retyped. Now: from where the last entry ended to
 * now, when that was earlier today — you track whole days back to back, so the
 * time you forgot is the gap after the last thing you tracked — and otherwise
 * from half an hour ago. An entry planned for later today is not where you
 * left off, so only ends already past count.
 *
 * `startIso` is the exact end, seconds and all: the box can only show minutes,
 * and starting at 13:05:00 an entry that ended at 13:05:40 overlapped it by 40
 * seconds — the size of the overlaps found in the owner's own data after every
 * hand-added entry.
 */
function manualRange(state: TimetrackState, now: Date): { start: string; stop: string; day: IsoDate; startIso: IsoDateTime } {
  const nowEpoch = Math.floor(now.getTime() / 1000)
  let lastEnd: IsoDateTime | null = null
  for (const entry of liveEntries(state)) {
    if (entry.stop === null || epochSeconds(entry.stop) > nowEpoch) continue
    if (lastEnd === null || epochSeconds(entry.stop) > epochSeconds(lastEnd)) lastEnd = entry.stop
  }
  const usable =
    lastEnd !== null && dateKey(lastEnd) === dateKey(now) && Math.floor(epochSeconds(lastEnd) / 60) < Math.floor(nowEpoch / 60)
  const startIso = usable && lastEnd ? lastEnd : isoFromEpochSeconds(nowEpoch - 30 * 60)
  const format = state.user.timeFormat
  // the start's own day, so "half an hour ago" just after midnight is yesterday evening
  return { start: formatTimeOfDay(startIso, format), stop: formatTimeOfDay(now.toISOString(), format), day: dateKey(startIso), startIso }
}

export type TimerMode = "timer" | "manual"

/**
 * A MANUAL ENTRY HALF FILLED IN SURVIVES LEAVING THE SCREEN.
 *
 * Its three boxes lived in this bar, which unmounts on every other section and
 * whenever the tracker is left, so the times somebody had typed were gone when
 * they came back (getting-around #9 in Plans/time-tracker-like-toggl.md). Kept
 * for this tab in `sessionStorage`, and only once something was TYPED: an
 * untouched form opens at the current gap again (`manualRange`), not at the
 * one from an hour ago.
 */
interface ManualForm {
  start: string
  stop: string
  day: IsoDate
}

function savedManualForm(): ManualForm | null {
  try {
    const raw = window.sessionStorage.getItem(MANUAL_FORM_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ManualForm>
    if (typeof parsed.start !== "string" || typeof parsed.stop !== "string" || typeof parsed.day !== "string") return null
    return { start: parsed.start, stop: parsed.stop, day: parsed.day }
  } catch {
    return null
  }
}

function keepManualForm(form: ManualForm | null) {
  try {
    if (form) window.sessionStorage.setItem(MANUAL_FORM_KEY, JSON.stringify(form))
    else window.sessionStorage.removeItem(MANUAL_FORM_KEY)
  } catch {
    // storage blocked: the form opens at the current gap next time, as it always did
  }
}

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
  /** opens the detail sheet, where a running timer's date and end can be set */
  onEditEntry: (entry: TimeEntry) => void
  pushToast: PushToast
  /**
   * The next thing, typed under a running timer for Switched at… — held by the
   * tracker, because a Start the other device beat puts its words here (bug
   * audit A5). Without them the bar keeps its own.
   */
  next?: EntryDraft
  setNext?: (draft: EntryDraft) => void
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
  nowSec,
  onStart,
  onStop,
  onEditEntry,
  pushToast,
  next: nextFromTracker,
  setNext: setNextInTracker,
}: TimerBarProps) {
  /**
   * The freshest state and draft, for the description commit that runs on a
   * timer: by the time it fires, the props this render closed over are old.
   */
  const latestState = useRef(state)
  latestState.current = state
  const latestDraft = useRef(draft)
  latestDraft.current = draft
  /**
   * Every write to the draft goes through here, so the next write in the same
   * event builds on it. Picking with @ writes the cleaned words and then the
   * project; both copied the draft of the last render, so the second put
   * "Call @Gy" back over "Call" (found 2026-11-05, Plans/toggl-parity.md).
   */
  const putDraft = (next: EntryDraft) => {
    latestDraft.current = next
    setDraft(next)
  }
  const latestMode = useRef(mode)
  latestMode.current = mode
  /**
   * THE PC'S OWN BAR (Phase 5 of Plans/toggl-parity.md). From 640px the bar
   * reads as Toggl Track's web bar: one click on the running time opens the
   * box under it (`RunningTimeBox`), manual mode is a switch beside the main
   * button with "+" "Add time entry", and the row under the bar moves into
   * that box. The phone's bar is unchanged.
   */
  const isPc = !useIsMobile()
  const [boxOpen, setBoxOpen] = useState(false)
  const durationWrap = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!boxOpen) return
    // a press anywhere outside the time and its box closes it, as Toggl's does
    const outside = (event: PointerEvent) => {
      if (!durationWrap.current?.contains(event.target as Node)) setBoxOpen(false)
    }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [boxOpen])

  /**
   * EVERY CONTROL IN THIS BAR GOES THROUGH HERE. See `applyDraftPatch` for what
   * it is protecting against: the bar used to write only to the draft, so
   * anything entered after pressing Start was shown back to you and thrown
   * away. Nothing below may call `setDraft` directly (`putDraft` is its one door).
   */
  const edit = (patch: Partial<EntryDraft>, baseState: TimetrackState = latestState.current) => {
    // Manual mode is a form for an entry that does not exist yet. It never
    // reaches into a timer that happens to be running at the same moment.
    if (latestMode.current === "manual") {
      if (baseState !== latestState.current) setState(layOnto(latestState.current, baseState))
      putDraft({ ...latestDraft.current, ...patch })
      return
    }
    const result = applyDraftPatch(baseState, latestDraft.current, patch, serverNowIso())
    if (result.violations.length > 0) {
      /**
       * A refused patch must not take a just-created project or tag down with
       * it. `baseState` already holds one when this came from the picker's
       * "Create" button, and returning without it would delete something the
       * user made while telling them about something else. Reachable: a
       * workspace that requires a task, a timer running, a new project created
       * from the picker — the selection is refused for having no task, and the
       * project would have vanished.
       */
      if (result.state !== latestState.current) setState(layOnto(latestState.current, result.state))
      pushToast(result.violations[0].message, "error")
      return
    }
    if (result.state !== latestState.current) setState(layOnto(latestState.current, result.state))
    putDraft(result.draft)
  }

  /**
   * The description is the one field that must not commit per keystroke — one
   * commit clones the workspace, writes it to this browser, tells the other
   * tabs and queues a sync row. It lands on a pause, on blur, and on unmount.
   *
   * It carries the entry it was typed into. Press Continue on some other entry
   * within the pause and the running entry is no longer the one you were
   * describing; writing it there would put your words on the wrong row.
   *
   * AND IT LANDS ON THAT ENTRY AS IT IS NOW, NOT AS THIS BAR LAST DREW IT.
   *
   * This built the renamed workspace from `latestState` — the copy of the last
   * render — and put that whole copy in place. Typing "Call with Ana" on the
   * phone while the PC stopped the call, then waking the phone, did this: the
   * check handed the stopped copy over, the pause ended before it was drawn,
   * and the bar's running copy with the new name replaced it. The engine then
   * saw this device set the call running again, on top of the version the PC's
   * stop wrote, and the account took it — the call ran again everywhere
   * (`aRenameTypedWhileTheOtherDeviceStopsKeepsTheStop`). Drawn first, the
   * other way round, the name looked for a RUNNING entry by that id, found
   * none, and was thrown away.
   *
   * So the name goes onto the entry it was typed into, running or stopped by
   * now, inside the update, where `current` is the newest copy there is: only
   * what this bar changed itself is laid onto it. A refusal is asked of the
   * drawn copy, so it is said once and not from inside React's update.
   */
  const commitDescription = useDebouncedCommit<{ entryId: Id | null; description: string }>(
    ({ entryId, description }) => {
      // Nothing running, or manual mode: the draft is already the only record
      if (entryId === null || latestMode.current === "manual") return
      const nowIso = serverNowIso()
      const drawn = describeEntry(latestState.current, entryId, description, nowIso)
      if (drawn.violations.length > 0) {
        pushToast(drawn.violations[0].message, "error")
        return
      }
      setState((current) => describeEntry(current, entryId, description, nowIso).state)
    },
  )

  const [durationInput, setDurationInput] = useState("")
  const [manualStart, setManualStart] = useState("09:00")
  const [manualStop, setManualStop] = useState("10:00")
  const [manualDay, setManualDay] = useState(() => dateKey(new Date()))
  /** the exact start manual mode opened at, used while its box still reads it: see `manualRange` */
  const manualStartExact = useRef<{ text: string; day: IsoDate; iso: IsoDateTime } | null>(null)
  const [editingDuration, setEditingDuration] = useState(false)
  /** what the box read when you started typing — leaving it as it was is not an edit */
  const durationAtFocus = useRef<string | null>(null)
  /**
   * Escape throws the edit away, timer running or not. It did only while none
   * ran: with a timer running the typed value stayed in the box and the next
   * click anywhere committed it, so a two-hour timer ended at one hour (edits
   * audit B4). The flag is for the blur Escape causes, which would otherwise
   * commit — React has not re-rendered by then, so the blur still sees the
   * typed text. The same shape as the entry row's `discarding`.
   */
  const discardDuration = useRef(false)

  const openManualAt = useCallback((base: TimetrackState) => {
    const range = manualRange(base, new Date())
    setManualStart(range.start)
    setManualStop(range.stop)
    setManualDay(range.day)
    manualStartExact.current = { text: range.start, day: range.day, iso: range.startIso }
    // a fresh form is nothing typed: see `keepManualForm`
    keepManualForm(null)
  }, [])

  /** A box typed into: shown, and kept for coming back (see `ManualForm`) */
  const typeManual = (patch: Partial<ManualForm>) => {
    const form = { start: manualStart, stop: manualStop, day: manualDay, ...patch }
    if (patch.start !== undefined) setManualStart(patch.start)
    if (patch.stop !== undefined) setManualStop(patch.stop)
    if (patch.day !== undefined) setManualDay(patch.day)
    keepManualForm(form)
  }

  // Each time manual mode is opened, at the gap you are most likely filling —
  // or, coming back to a form you had typed into, at what you typed
  useEffect(() => {
    if (mode !== "manual") {
      keepManualForm(null)
      return
    }
    const kept = savedManualForm()
    if (!kept) {
      openManualAt(latestState.current)
      return
    }
    setManualStart(kept.start)
    setManualStop(kept.stop)
    setManualDay(kept.day)
    manualStartExact.current = null
  }, [mode, openManualAt])

  /**
   * A LENGTH TYPED WITH NO TIMER RUNNING WAITS TO BE LOGGED, AS IN TOGGL.
   *
   * The box was locked whenever nothing ran, because the clock effect below
   * rewrote it to 0:00:00 on the next tick and typing into it did nothing. Now
   * "2h" stays in the box, the Start button becomes Add, and Enter or Add logs
   * a finished entry that ends now. Leaving the box does not log anything by
   * itself: a tap elsewhere is not a decision.
   */
  /**
   * THE TIMER THE LENGTH IS BEING TYPED FOR, when it was running at the first
   * keystroke. The other device can stop it before Enter; the box, with
   * nothing running any more, read the typed "90" as a length to log, its
   * button turned into "Add this time" without a word, and Enter added a new,
   * unnamed 90-minute entry (Phase 8 two-devices audit of
   * Plans/toggl-parity.md). Until it is let go, the length is not a new entry.
   */
  const [durationFor, setDurationFor] = useState<Id | null>(null)
  const typedLength =
    !running && durationFor === null && editingDuration && durationInput.trim() !== "" && durationInput !== formatClock(0)

  // a timer that starts while a length waits to be logged takes the box back
  const runningId = running?.id ?? null
  useEffect(() => {
    if (runningId !== null) setEditingDuration(false)
    // the box is about the timer that was running: another one, or none, closes it
    setBoxOpen(false)
  }, [runningId])

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
    /**
     * Untouched, it is not committed. A shorter time ends the timer now, and the
     * box froze at focus while the clock went on: clicking in and out a minute
     * later would have read as "it ended a minute ago" and stopped it.
     */
    const shown = durationAtFocus.current
    durationAtFocus.current = null
    if (durationInput === shown) return
    if (seconds === null) {
      pushToast(DURATION_UNREADABLE, "error")
      setDurationInput(formatClock(runningSeconds))
      return
    }
    /**
     * Say why, like every other control that writes a time.
     *
     * `setRunningElapsed` was given violations so this field could report them,
     * and the comment on it names "the timer bar's elapsed field" as one of the
     * three that were fixed — while this call site went on discarding them. A
     * locked date or a submitted timesheet made the number snap back with
     * nothing said.
     */
    const options = { shownSeconds: shown === null ? null : parseDurationInput(shown) }
    // a length over 12 hours asks first: see `askBeforeLong`
    askBeforeLong(
      seconds,
      () => {
        const checked = setRunningElapsed(latestState.current, seconds, serverNowIso(), options)
        if (checked.violations[0]) {
          pushToast(checked.violations[0].message, "error")
          setDurationInput(formatClock(runningSeconds))
          return
        }
        setState((current) => {
          const applied = setRunningElapsed(current, seconds, serverNowIso(), options)
          return applied.violations.length > 0 ? current : applied.state
        })
        if (checked.stopped) announceEndedEarly(checked.stopped, seconds, () => latestState.current, setState, pushToast)
      },
      pushToast,
    )
  }

  /**
   * A finished entry from manual mode or a typed length, then a cleared
   * description. Checked on the latest workspace and applied to whatever is
   * current, because it can be the answer to "That makes it 13 hours", pressed
   * after other changes — or after this bar has left the screen. Returns the
   * workspace as checked, or null when it was refused.
   */
  const writeNewEntry = (input: { draft: EntryDraft; start: IsoDateTime; stop: IsoDateTime }): TimetrackState | null => {
    const nowIso = serverNowIso()
    const checked = createManualEntry(latestState.current, input, nowIso)
    if (checked.violations.length > 0) {
      pushToast(checked.violations[0].message, "error")
      return null
    }
    setState((current) => {
      const applied = createManualEntry(current, input, nowIso)
      return applied.violations.length > 0 ? current : applied.state
    })
    // the draft only: with a timer running by now, clearing it would clear that timer's description
    if (latestMode.current === "manual" || !runningEntry(latestState.current)) edit({ description: "" })
    return checked.state
  }

  /** The typed length, logged as a finished entry that ends now: see `typedLength` */
  const logTypedLength = () => {
    const seconds = parseDurationInput(durationInput)
    if (seconds === null) {
      pushToast(DURATION_UNREADABLE, "error")
      return
    }
    // read, and nothing to add: say that, rather than that it could not be read
    if (seconds <= 0) {
      pushToast("Nothing was added: 0 minutes would be an empty entry. Type how long it took, like 1:30 or 45.", "error")
      return
    }
    askBeforeLong(
      seconds,
      () => {
        const nowIso = serverNowIso()
        const start = isoFromEpochSeconds(epochSeconds(nowIso) - seconds)
        if (writeNewEntry({ draft: latestDraft.current, start, stop: nowIso })) setEditingDuration(false)
      },
      pushToast,
    )
  }

  /**
   * A click on a time box selects the time it holds, as the list's boxes do: the
   * cursor landed in the middle of "08:50", and "9:00" typed there read
   * "089:00:50" (findability check, 2026-11-05).
   */
  const selectAll = (event: { currentTarget: HTMLInputElement }) => event.currentTarget.select()

  /** The manual entry's start and end as the boxes read now, or null while one is unreadable */
  const manualSpan = (() => {
    if (mode !== "manual") return null
    const exact = manualStartExact.current
    const start =
      exact && exact.text === manualStart.trim() && exact.day === manualDay ? exact.iso : parseTimeInput(manualStart, manualDay)
    const stop = start ? parseEndTimeInput(manualStop, start) : null
    if (!start || !stop) return null
    return { start, stop }
  })()
  const manualLength = manualSpan ? Math.max(0, epochSeconds(manualSpan.stop) - epochSeconds(manualSpan.start)) : null

  /**
   * THE LENGTH IS A BOX TOO (Phase 8 audit of Plans/toggl-parity.md): it looked
   * like one and a user typed 30 minutes into it. A length typed there keeps the
   * end and moves the start, read as the running duration reads it ("30" is 30
   * minutes, "1:30" and "1.30" an hour and a half). Null while nobody is typing.
   */
  const [lengthText, setLengthText] = useState<string | null>(null)
  /**
   * What is being typed, as a ref too: Enter writes it and then blurs, and the
   * blur runs in the same key press with this render's `lengthText` still
   * holding the text, so reading state wrote it twice (and an unreadable length
   * said so twice). The ref is emptied by the first write; Escape empties it too.
   */
  const lengthTyping = useRef<string | null>(null)
  const typeLength = (text: string | null) => {
    lengthTyping.current = text
    setLengthText(text)
  }
  const commitLength = () => {
    const text = lengthTyping.current
    typeLength(null)
    if (text === null || !manualSpan || text.trim() === formatDuration(manualLength ?? 0, state.user.durationFormat)) return
    const seconds = parseDurationInput(text)
    if (seconds === null) {
      pushToast(DURATION_UNREADABLE, "error")
      return
    }
    // the end stays; the start is that long before it, to the second (`resumeStartFor`)
    const start = resumeStartFor(seconds, manualSpan.stop)
    const shown = formatTimeOfDay(start, state.user.timeFormat)
    typeManual({ start: shown, day: dateKey(start) })
    manualStartExact.current = { text: shown, day: dateKey(start), iso: start }
  }

  const addManualEntry = () => {
    // the exact end manual mode opened at, while its box still says so: see `manualRange`
    const exact = manualStartExact.current
    const start =
      exact && exact.text === manualStart.trim() && exact.day === manualDay ? exact.iso : parseTimeInput(manualStart, manualDay)
    /**
     * The end is read the way every end box reads it (`parseEndTimeInput`): a
     * bare "5" after a 10:00 start is 17:00, an end before the start is the
     * next morning, and an end EQUAL to the start is a zero-length entry, which
     * the save rules allow — turning that into twenty-four hours because of a
     * `<=` was a silent, enormous edit.
     */
    const stop = start ? parseEndTimeInput(manualStop, start) : null
    if (!start || !stop) {
      pushToast(
        unreadableTimeMessage(manualStart) ?? unreadableTimeMessage(manualStop) ?? "Enter start and end times like 09:00 or 9:00 am",
        "error",
      )
      return
    }
    const write = (stopIso: IsoDateTime) => {
      const written = writeNewEntry({ draft: latestDraft.current, start, stop: stopIso })
      // the next one opens where this one ended, if that is already past
      if (written) openManualAt(written)
    }
    askAboutTypedTime("stop", stop, { start, stop, isNew: true }, write, pushToast, latestState.current.user.timeFormat)
  }

  // The picker hands back a name, not an id, so these create the thing and
  // select it. Both halves land as one state update, because a draft or an
  // entry pointing at a project that does not exist yet is a broken row.
  const handleCreateProject = (name: string) => {
    const created = createProject(latestState.current, { name }, serverNowIso())
    edit({ projectId: created.id, taskId: null }, created.state)
  }

  const handleCreateTag = (name: string) => {
    const created = createTag(latestState.current, name, serverNowIso())
    edit({ tagIds: [...new Set([...latestDraft.current.tagIds, created.id])] }, created.state)
  }

  /**
   * SWITCHED AT…, STOPPED AT… AND STARTED AT… (Phase 4 in
   * Plans/time-tracker-like-toggl.md).
   *
   * The next thing has a box of its own while a timer runs, because the bar's
   * description box is the running entry's: typing "Email" there renames Deep
   * work, which is right for a typo and wrong for a switch. With nothing
   * running, the bar's description IS the next thing, and the same picker
   * starts it at a moment that has passed (Started at…).
   */
  const [ownNext, setOwnNext] = useState<EntryDraft>(emptyDraft)
  const nextDraft = nextFromTracker ?? ownNext
  const setNextDraft = setNextInTracker ?? setOwnNext
  const nextDescription = nextDraft.description
  const setNextDescription = (description: string) => setNextDraft({ ...nextDraft, description })
  const [moment, setMoment] = useState<{ kind: MomentKind; openedAt: IsoDateTime; draft: EntryDraft } | null>(null)
  const afterCheck = useContext(AfterCheckContext)

  const openMoment = (kind: MomentKind) => {
    commitDescription.flush()
    const draftForNext = kind === "start" ? latestDraft.current : { ...nextDraft, description: nextDescription.trim() }
    setMoment({ kind, openedAt: serverNowIso(), draft: draftForNext })
  }

  /**
   * Ends the running timer, so it waits for the check like Stop does (D2): run
   * on the account's copy when the check lands, or dropped with a word when the
   * timer it was about is no longer the one running (`TogglLab`'s `afterCheck`).
   * Without the tracker around it — a test, a component on its own — it runs
   * at once on the workspace this bar holds.
   */
  const runMoment = useMomentActions({ state, setState, pushToast, afterCheck, onSwitched: () => setNextDraft(emptyDraft) })
  const confirmMoment = (kind: MomentKind, atIso: IsoDateTime, nextDraft: EntryDraft) => {
    setMoment(null)
    runMoment(kind, atIso, nextDraft)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center">
        <DescriptionField
          state={state}
          value={draft.description}
          projectId={draft.projectId}
          // Toggl's words for its manual bar, on the PC (D-PC-MANUAL); the phone's bar keeps its own
          placeholder={isPc && mode === "manual" ? "What have you done?" : undefined}
          onChange={(description) => {
            // shown at once, stored on a pause: see `commitDescription`
            putDraft({ ...latestDraft.current, description })
            commitDescription.schedule({ entryId: running?.id ?? null, description })
          }}
          onBlur={commitDescription.flush}
          onPickProject={(projectId, taskId) => edit({ projectId, taskId })}
          onPickTag={(tagId) => edit({ tagIds: [...new Set([...latestDraft.current.tagIds, tagId])] })}
          onSubmit={() => {
            // whatever is half-typed belongs to the entry before it is acted on
            commitDescription.flush()
            if (mode === "manual") addManualEntry()
            else if (typedLength) logTypedLength()
            else onStart()
          }}
        />

        <div className="flex flex-wrap items-center gap-1">
          <ProjectPicker
            state={state}
            projectId={draft.projectId}
            taskId={draft.taskId}
            onChange={(projectId, taskId) => edit({ projectId, taskId })}
            onCreateProject={handleCreateProject}
          />
          <TagPicker
            state={state}
            tagIds={draft.tagIds}
            onChange={(tagIds) => edit({ tagIds })}
            onCreateTag={handleCreateTag}
          />
          <BillableToggle billable={draft.billable} onChange={(billable) => edit({ billable })} />

          {mode === "manual" ? (
            <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
              {/* the number pad on a phone: "1155" is 11:55 (plan D11) */}
              <Input value={manualStart} onChange={(e) => typeManual({ start: e.target.value })} onFocus={selectAll} inputMode="numeric" className="h-11 w-[76px] text-center sm:h-8 sm:w-[70px]" aria-label="Start time" />
              {/* the PC reads as Toggl Track's manual bar: start and its date, then → stop (D-PC-MANUAL) */}
              {isPc && <DayPicker value={manualDay} onChange={(day) => typeManual({ day })} onStep={(day) => typeManual({ day })} />}
              <span className="text-muted-foreground">{isPc ? "→" : "–"}</span>
              <Input value={manualStop} onChange={(e) => typeManual({ stop: e.target.value })} onFocus={selectAll} inputMode="numeric" className="h-11 w-[76px] text-center sm:h-8 sm:w-[70px]" aria-label="End time" />
              {/* the length, to check before "+" (findability check, 2026-11-05) */}
              {manualLength !== null && (
                <Input
                  value={lengthText ?? formatDuration(manualLength, state.user.durationFormat)}
                  onFocus={(event) => {
                    typeLength(event.currentTarget.value)
                    event.currentTarget.select()
                  }}
                  onChange={(event) => typeLength(event.target.value)}
                  onBlur={commitLength}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      // written here; the blur after it finds nothing left to write
                      event.preventDefault()
                      commitLength()
                      event.currentTarget.blur()
                    } else if (event.key === "Escape") {
                      event.preventDefault()
                      // nothing left for the blur to write
                      typeLength(null)
                      event.currentTarget.blur()
                    }
                  }}
                  // the decimal pad: "1.5" is an hour and a half (plan D11)
                  inputMode="decimal"
                  title={DURATION_HINT}
                  aria-label="Length"
                  className="h-11 w-[76px] text-center tabular-nums sm:h-8 sm:w-[70px]"
                />
              )}
              {/* "" makes `parseTimeInput` build an Invalid Date and throw, and the
                  "pick a start and an end" toast on the next line never gets its turn —
                  `DayPicker` passes on only a whole date */}
              {!isPc && <DayPicker value={manualDay} onChange={(day) => typeManual({ day })} onStep={(day) => typeManual({ day })} />}
            </div>
          ) : (
            <div ref={durationWrap} className="relative">
            <Input
              value={durationInput}
              onFocus={() => {
                setDurationFor(running?.id ?? null)
                durationAtFocus.current = durationInput
                setEditingDuration(true)
                // one click on the running time: typeable, and the box opens (D-PC-RUNNING)
                if (isPc && running) setBoxOpen(true)
              }}
              onChange={(event) => {
                setEditingDuration(true)
                setDurationInput(event.target.value)
              }}
              onBlur={() => {
                if (discardDuration.current) {
                  discardDuration.current = false
                  return
                }
                if (running) commitRunningDuration()
                // a typed length stays, waiting for Enter or Add: see `typedLength`
                else if (!typedLength) setEditingDuration(false)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && running) {
                  // through the blur, so the edit is written once and not again on the way out
                  setBoxOpen(false)
                  event.currentTarget.blur()
                } else if (event.key === "Enter" && durationFor !== null) {
                  // the timer it was typed for was stopped elsewhere: nothing is written, the length stays, and it says so
                  event.preventDefault()
                  const was = latestState.current.entries.find((e) => e.id === durationFor)
                  const name = `“${was?.description.trim() || "(no description)"}”`
                  pushToast(
                    `${name} was stopped on your other device, so the length you typed was not set. Press Enter again to add it as a new entry, or Esc to drop it.`,
                  )
                  // a second Enter, now that it is said, logs it as a finished entry like any typed length
                  setDurationFor(null)
                } else if (event.key === "Enter" && typedLength) {
                  event.preventDefault()
                  logTypedLength()
                } else if (event.key === "Escape") {
                  event.preventDefault()
                  setBoxOpen(false)
                  discardDuration.current = true
                  durationAtFocus.current = null
                  setEditingDuration(false)
                  setDurationInput(formatClock(runningSeconds))
                  event.currentTarget.blur()
                }
              }}
              /* Open with nothing running too: a length typed here is logged
                 as a finished entry ending now (`logTypedLength`). It was
                 locked, because the effect above rewrote it to 0:00:00 on the
                 next tick and the typing went nowhere. */
              // the decimal pad on a phone: "1.5" is an hour and a half (plan D11)
              inputMode="decimal"
              title={DURATION_HINT}
              aria-label="Duration"
              className="h-11 w-[100px] text-center tabular-nums sm:h-8 sm:w-[92px]"
            />
            {boxOpen && running && isPc && (
              <RunningTimeBox
                running={running}
                state={state}
                setState={setState}
                latestState={() => latestState.current}
                pushToast={pushToast}
                nowSec={nowSec}
                forgotten={forgottenTimer(state, nowSec) !== null}
                onClose={() => setBoxOpen(false)}
                onStopAt={() => {
                  setBoxOpen(false)
                  openMoment("stop")
                }}
                onSwitchAt={() => {
                  setBoxOpen(false)
                  openMoment("switch")
                }}
                next={
                  // the next thing, as under the bar on a phone: typed here, then Switch now
                  <div className="flex items-center gap-2">
                    <Input
                      value={nextDescription}
                      onChange={(event) => setNextDescription(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" || !nextDescription.trim()) return
                        event.preventDefault()
                        setBoxOpen(false)
                        openMoment("switch")
                      }}
                      placeholder="Switched to something else?"
                      aria-label="Next entry"
                      className="h-8 min-w-0 flex-1 text-sm"
                    />
                    {nextDescription.trim() !== "" && (
                      <Button
                        size="sm"
                        className="h-8 px-3"
                        onClick={() => {
                          setBoxOpen(false)
                          confirmMoment("switch", serverNowIso(), { ...nextDraft, description: nextDescription.trim() })
                        }}
                      >
                        Switch now
                      </Button>
                    )}
                  </div>
                }
              />
            )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setState((current) => toggleFavorite(current, draft, serverNowIso()))}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label="Toggle favorite"
            className={cn(touchTarget, "rounded-md hover:bg-secondary/60", isFavorite ? "text-primary" : "text-muted-foreground")}
          >
            <IconFavorite className="size-5 sm:size-4" />
          </button>

          <div className="mx-1 hidden h-6 w-px bg-border lg:block" />

          {!isPc && (
            <button
              type="button"
              onClick={() => setMode(mode === "timer" ? "manual" : "timer")}
              title={mode === "timer" ? "Switch to manual mode (M)" : "Switch to timer mode (N)"}
              aria-label="Toggle timer or manual mode"
              className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}
            >
              {mode === "timer" ? <IconEdit className="size-5 sm:size-4" /> : <IconTimer className="size-5 sm:size-4" />}
            </button>
          )}

          {mode === "manual" && isPc ? (
            // Toggl Track's round "+" with its tooltip (D-PC-MANUAL)
            <Button
              size="icon"
              className="ml-auto size-9 rounded-full"
              onClick={addManualEntry}
              aria-label="Add time entry"
              title="Add time entry"
            >
              <IconAdd className="size-5" />
            </Button>
          ) : mode === "manual" ? (
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
              title="Stop time entry (S)"
            >
              <IconStop className="size-4" /> Stop
            </Button>
          ) : typedLength ? (
            <Button size="sm" className="ml-auto min-w-[104px] flex-1 sm:flex-none" onClick={logTypedLength} aria-label="Add this time">
              Add
            </Button>
          ) : (
            <Button
              size="sm"
              className="ml-auto min-w-[104px] flex-1 sm:flex-none"
              onClick={onStart}
              aria-label="Start timer"
              title="Start time entry"
            >
              <IconStart className="size-4" /> Start
            </Button>
          )}

          {/* Toggl Track's mode switch, beside the main button: timer above, manual below (D-PC-MANUAL) */}
          {isPc && (
            <button
              type="button"
              onClick={() => setMode(mode === "timer" ? "manual" : "timer")}
              title={mode === "timer" ? "Manual Mode (M)" : "Timer Mode (M)"}
              aria-label="Toggle timer or manual mode"
              aria-pressed={mode === "manual"}
              className="flex h-9 w-6 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border border-border bg-secondary/40 hover:bg-secondary"
            >
              <IconTimer className={cn("size-3", mode === "timer" ? "text-primary" : "text-muted-foreground")} />
              <IconAdd className={cn("size-3", mode === "manual" ? "text-primary" : "text-muted-foreground")} />
            </button>
          )}
        </div>
      </div>

      {/*
        WHEN IT STARTED, SAID IN WORDS. The box shows 16:02:11 and nothing else, so a
        timer left running since yesterday looked like a long day. Naming the day
        is what tells you it was forgotten, and the fix sits beside it.
      */}
      {/*
        "STARTED 09:00 · STOP AT…" (Phase 4, item 7). The end of a running timer
        lived in the detail sheet, behind "Change times", so ending a forgotten
        one where the work ended was a trip to another screen. Stop at… sits
        beside the start now; the sheet is in the ⋮ menu.
      */}
      {/*
        WHAT WAITS AS THE NEXT THING, IN SIGHT ON THE PC (bug audit A5, found
        again in Phase 8 of Plans/toggl-parity.md). Words Started while the
        other device ran something else are kept as the next thing; on a PC
        their box is in the closed popover and the row below is hidden, so they
        were kept where nobody could see them. While they have words, they show
        here, as the phone's strip shows them, until switched to or let go.
      */}
      {isPc && mode === "timer" && running && nextDescription.trim() !== "" && (
        <div data-next-strip className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate">
            Next: <strong>“{nextDescription.trim()}”</strong>
          </span>
          <Button size="sm" className="h-8 px-3" onClick={() => confirmMoment("switch", serverNowIso(), { ...nextDraft, description: nextDescription.trim() })}>
            Switch now
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => openMoment("switch")}>
            Switched at…
          </Button>
          <button
            type="button"
            onClick={() => setNextDraft(emptyDraft)}
            aria-label="Forget the next entry"
            title="Forget the next entry"
            className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}
          >
            <IconClose className="size-4" />
          </button>
        </div>
      )}

      {/* on the PC all of this is in the box under the running time (`RunningTimeBox`, D-SWITCHED) */}
      {mode === "timer" && running && (
        <div className="border-t border-border px-3 pb-2 text-xs text-muted-foreground sm:hidden">
          <div className="flex items-center gap-x-1">
            <span className="min-w-0 flex-1">
              Started {formatWhen(running.start, state.user.timeFormat, dateKey(new Date(nowSec * 1000)))}
              {forgottenTimer(state, nowSec) && (
                <span className="text-foreground"> — forgot to stop it? Stop at… ends it where the work did.</span>
              )}
            </span>
            <Button size="sm" variant="ghost" className="h-11 shrink-0 px-2 sm:h-7" onClick={() => openMoment("stop")}>
              Stop at…
            </Button>
            <Dropdown
              align="right"
              width="w-52"
              ariaLabel="More timer actions"
              trigger={() => (
                <span className={cn(touchTarget, "rounded-md text-muted-foreground hover:bg-secondary/60")}>
                  <IconMenu className="size-5 sm:size-4" />
                </span>
              )}
            >
              {(close) => (
                <div className="py-1 text-sm">
                  {(
                    [
                      ["Switched at…", () => openMoment("switch")],
                      ["Stopped at…", () => openMoment("stop")],
                      ["Change times", () => onEditEntry(running)],
                    ] as const
                  ).map(([label, run]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        close()
                        run()
                      }}
                      className={cn("flex w-full items-center px-3 py-1.5 text-left hover:bg-secondary/60", touchRow)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>
          </div>
          {/* the next thing, in a box of its own: see `nextDescription` */}
          {/* on a phone the box keeps its whole row and the two buttons share the next: beside them it was 90px wide */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={nextDescription}
              onChange={(event) => setNextDescription(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || !nextDescription.trim()) return
                event.preventDefault()
                openMoment("switch")
              }}
              placeholder="Switched to something else?"
              aria-label="Next entry"
              className="h-11 min-w-0 basis-full text-sm sm:h-8 sm:basis-0 sm:flex-1"
            />
            {nextDescription.trim() !== "" && !isPc && (
              <>
                {/* one tap: the running one ends now and this starts now, stamped at the tap (A5, A6) */}
                <Button
                  size="sm"
                  className="h-11 flex-1 px-3 sm:h-8 sm:flex-none"
                  onClick={() => confirmMoment("switch", serverNowIso(), { ...nextDraft, description: nextDescription.trim() })}
                >
                  Switch now
                </Button>
                <Button size="sm" variant="outline" className="h-11 flex-1 px-3 sm:h-8 sm:flex-none" onClick={() => openMoment("switch")}>
                  Switched at…
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Started at…: a typed description, nothing running, and the work began a while ago */}
      {mode === "timer" && !running && !typedLength && draft.description.trim() !== "" && (
        <div className="flex items-center justify-end gap-x-1 border-t border-border px-3 text-xs text-muted-foreground">
          <span>Began a while ago?</span>
          <Button size="sm" variant="ghost" className="h-11 px-2 sm:h-7" onClick={() => openMoment("start")}>
            Started at…
          </Button>
        </div>
      )}

      {moment && (
        <MomentDialog
          kind={moment.kind}
          state={state}
          openedAt={moment.openedAt}
          draft={moment.draft}
          onConfirm={(atIso, nextDraft) => confirmMoment(moment.kind, atIso, nextDraft)}
          onClose={() => setMoment(null)}
        />
      )}

      {showSuggestion && suggestion && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs">
          <IconAuto className="size-3.5 text-primary" />
          <span className="text-muted-foreground">
            AutoTracker: “{suggestion.keyword}” usually goes to
          </span>
          {suggestionProject && <ColorDot color={suggestionProject.color} />}
          <span>{suggestionProject?.name ?? "no project"}</span>
          <Button size="sm" variant="ghost" className="h-11 px-2 sm:h-6" onClick={() => edit(applyAutotracker(draft, suggestion))}>
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
            {/* 40px, on the control whose job is starting a timer one-handed.
                The slice's floor is 44. */}
            <button type="button" onClick={() => onStart(favorite.draft)} className="flex min-h-11 items-center gap-1.5 sm:min-h-0">
              {index < 9 && (
                <span className="rounded bg-secondary px-1 text-[10px] tabular-nums text-muted-foreground">{index + 1}</span>
              )}
              {project && <ColorDot color={project.color} />}
              <span className="max-w-[180px] truncate">{favorite.draft.description || "(no description)"}</span>
              <IconStart className="size-3 text-primary" />
            </button>
            {/*
              * A FAVORITE YOU CAN GET RID OF ON A PHONE.
              *
              * This was `hidden … sm:flex`, so below 640px it did not exist —
              * and the only other way to un-favorite something is the star in
              * the timer bar, which acts on the draft and so only works while
              * the draft still matches that favorite exactly. Move on to
              * anything else and the favorite was permanent: a tile you cannot
              * remove, whose whole behaviour is starting a timer when tapped.
              *
              * Revealed on hover with a pointer, where that keeps the strip
              * quiet; always there on a phone, where there is no hover and
              * hiding a control behind one is hiding it for good. Sized by the
              * slice's own rule rather than the 20px it was.
              */}
            <button
              type="button"
              onClick={() => onRemove(favorite.id)}
              className={cn(
                touchTarget,
                "rounded-full text-muted-foreground transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100",
              )}
              aria-label={`Remove “${favorite.draft.description.trim() || "(no description)"}” from favorites`}
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
    <div className="flex min-w-0 shrink items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs sm:px-3">
      <span className="size-2 animate-pulse rounded-full bg-primary" />
      {/* the description would crowd out the workspace name on a phone */}
      <span className="hidden max-w-[160px] truncate sm:inline">{running.description || "(no description)"}</span>
      {project && <ColorDot color={project.color} />}
      <span className="tabular-nums">{formatClock(entrySeconds(running, nowSec))}</span>
      {/* A 12px icon is not a clickable target; give it a real hit area.
          It was given 36px, which is not the real hit area either — this slice's
          floor is 44 and this is the only way to stop a timer from five of the
          six screens. */}
      <button
        type="button"
        onClick={onStop}
        className="-mr-1 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground sm:size-6"
        aria-label="Stop the running timer"
        title="Stop the running timer"
      >
        <IconStop className="size-3.5" />
      </button>
    </div>
  )
}


