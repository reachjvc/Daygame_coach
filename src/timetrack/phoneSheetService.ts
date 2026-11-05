/**
 * THE PHONE'S ONE ENTRY SHEET, AS DATA (Plans/toggl-parity.md Phase 2:
 * D-SHEET, D-DRUMS, D-START, D-MANUAL).
 *
 * One tap on the running bar or on a row opens one sheet, laid out like Toggl
 * Track's Android editor: ✕ · DONE, the big duration, the name, the chips,
 * start → end, the drums, Stop, Delete. Nothing in it is saved until DONE
 * (CREATE for a new entry), which is Toggl's rule and the opposite of the old
 * "Time entry details" sheet, where Cancel only undid the drums and X saved
 * everything else (`notes/ours-today.md` F, 2026-11-05).
 *
 * So the sheet holds CHANGES, not a copy of the entry: what is shown is the
 * entry as it is now with the changes laid over it (`shownDraft`). A field the
 * other device changes while the sheet is open shows its new value, and DONE
 * writes only what was changed here — onto the entry as it is at that moment
 * (`saveEdit`), never a copy taken when the sheet opened. That copy-and-replace
 * is exactly the bug `aRenameTypedWhileTheOtherDeviceStopsKeepsTheStop` fixed.
 *
 * The drums refuse silently, as Toggl's wheel does (`moveEdge`); a TYPED value
 * that cannot be is refused with Toggl's own words (`SHEET_REFUSALS`).
 */

import type { DrumBounds } from "./drumService"
import { entryBefore, switchAt, withNeighbours, type NeighbourHeld, type NeighbourMove } from "./timeFixService"
import {
  dateKey,
  epochMillis,
  parseDurationInput,
  parseStartTimeInput,
  parseTimeInput,
  unreadableTimeMessage,
} from "./timetrackFormatService"
import { createManualEntry, liveEntries, updateEntry } from "./timetrackService"
import type { DateFormatId, EntryDraft, Id, IsoDate, IsoDateTime, RoundingConfig, SaveViolation, TimeEntry, TimetrackState } from "./types"


/** Toggl's ceiling on one entry (`MaxTimeEntryDurationInHours = 999` in its code) */
export const MAX_SHEET_SECONDS = 999 * 3600

/** What a typed value that cannot be is told, in Toggl's own words [SRC `EditDurationViewModel.cs`] */
export const SHEET_REFUSALS = {
  startAfterStop: "Start time must be before Stop time!",
  stopBeforeStart: "Stop time must be after Start time!",
  startInFuture: "Start time must be before current time!",
  tooLong: "Duration can't exceed 999 hours!",
} as const

/** Shown while a length is typed into the big duration */
export const SHEET_DURATION_HINT = "90 = 90 min · 1.30 = 1 h 30"

export const UNREADABLE_TIME = "Could not read that time — try 9:30, 930 or 9:30 pm"
export const UNREADABLE_DURATION = "Could not read that duration — try 130 for 1:30, 1.30 or 90"

/** Everything the sheet edits: the entry's words and its two times */
export interface SheetDraft {
  description: string
  projectId: Id | null
  taskId: Id | null
  tagIds: Id[]
  billable: boolean
  start: IsoDateTime
  /** null while it runs: an edited running entry, or a new one started from the bar */
  stop: IsoDateTime | null
  duronly: boolean
}

/** What was changed in the sheet and not saved yet */
export type SheetChanges = Partial<SheetDraft>

export type Edge = "start" | "stop"

/** A staged edit, or why it was refused */
export type SheetResult = { draft: SheetDraft; refusal?: undefined } | { draft?: undefined; refusal: string }

const KEYS: (keyof SheetDraft)[] = ["description", "projectId", "taskId", "tagIds", "billable", "start", "stop", "duronly"]
const FIELD_KEYS = ["description", "projectId", "taskId", "tagIds", "billable", "duronly"] as const
const TIME_KEYS = ["start", "stop"] as const

const ms = (iso: IsoDateTime) => epochMillis(iso)
const isoAt = (millis: number) => new Date(millis).toISOString()
const same = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((value, index) => value === b[index]) : a === b

export function sheetDraftOf(entry: TimeEntry): SheetDraft {
  return {
    description: entry.description,
    projectId: entry.projectId,
    taskId: entry.taskId,
    tagIds: [...entry.tagIds],
    billable: entry.billable,
    start: entry.start,
    stop: entry.stop,
    duronly: entry.duronly,
  }
}

/**
 * A new entry from "I'm working on…": already counting from the tap, as
 * Toggl's start sheet does [V1 1:51–2:02] — the moment the sheet opened is its
 * start unless that is moved.
 */
export function startingDraft(base: EntryDraft, openedAt: IsoDateTime): SheetDraft {
  return { ...base, tagIds: [...base.tagIds], start: openedAt, stop: null, duronly: false }
}

/** A past entry from ⊕: 30 minutes ending now [V1 0:14, 2:52, 5:45] */
export function manualDraft(base: EntryDraft, nowIso: IsoDateTime): SheetDraft {
  return { ...base, tagIds: [...base.tagIds], start: isoAt(ms(nowIso) - 30 * 60_000), stop: nowIso, duronly: false }
}

export function shownDraft(base: SheetDraft, changes: SheetChanges): SheetDraft {
  return { ...base, ...changes }
}

/**
 * The changes `next` makes to `base`: only what differs. A value set back to
 * what it was, or matched meanwhile by the other device, is no change — so ✕
 * asks "Discard changes?" only when there is something to discard.
 */
export function changesBetween(base: SheetDraft, next: SheetDraft): SheetChanges {
  const changes: Record<string, unknown> = {}
  for (const key of KEYS) if (!same(base[key], next[key])) changes[key] = next[key]
  return changes as SheetChanges
}

export function isDirty(base: SheetDraft, changes: SheetChanges): boolean {
  return Object.keys(changesBetween(base, shownDraft(base, changes))).length > 0
}

export function entryDraftOf(draft: SheetDraft): EntryDraft {
  return {
    description: draft.description,
    projectId: draft.projectId,
    taskId: draft.taskId,
    tagIds: [...draft.tagIds],
    billable: draft.billable,
  }
}

// ---------------------------------------------------------------------------
// The two times
// ---------------------------------------------------------------------------

/**
 * Where a drum, or −15 −5 +5 +15, may take an edge: the wheel's rules
 * (D-DRUMS). A running start cannot pass now; a start cannot pass its end; an
 * end cannot come before its start; and no entry is longer than 999 hours.
 *
 * Now, but never before the start: a timer started at 16:00:00.500 read
 * against a clock at 16:00:00 would otherwise have no minute left to be in
 * (the same half second `EntryDrums` guards against).
 */
export function edgeBounds(draft: SheetDraft, edge: Edge, nowIso: IsoDateTime): DrumBounds {
  if (edge === "start") {
    if (draft.stop === null) {
      const latest = ms(nowIso) < ms(draft.start) ? draft.start : nowIso
      return { earliest: isoAt(ms(latest) - MAX_SHEET_SECONDS * 1000), latest }
    }
    return { earliest: isoAt(ms(draft.stop) - MAX_SHEET_SECONDS * 1000), latest: draft.stop }
  }
  return { earliest: draft.start, latest: isoAt(ms(draft.start) + MAX_SHEET_SECONDS * 1000) }
}

function clamp(iso: IsoDateTime, bounds: DrumBounds): IsoDateTime {
  if (bounds.earliest && ms(iso) < ms(bounds.earliest)) return bounds.earliest
  if (bounds.latest && ms(iso) > ms(bounds.latest)) return bounds.latest
  return iso
}

/** A drum turned: it lands inside the limits, and says nothing — Toggl's wheel clamps the same way [SRC] */
export function moveEdge(draft: SheetDraft, edge: Edge, iso: IsoDateTime, nowIso: IsoDateTime): SheetDraft {
  if (edge === "stop" && draft.stop === null) return draft
  return { ...draft, [edge]: clamp(iso, edgeBounds(draft, edge, nowIso)) }
}

/** −15 −5 +5 +15 under the drums: the same limits, the same silence */
export function nudgeEdge(draft: SheetDraft, edge: Edge, minutes: number, nowIso: IsoDateTime): SheetDraft {
  const from = edge === "start" ? draft.start : draft.stop
  if (from === null) return draft
  return moveEdge(draft, edge, isoAt(ms(from) + minutes * 60_000), nowIso)
}

/**
 * A START, TYPED OR CHOSEN: IT KEEPS THE END AND CHANGES THE LENGTH.
 *
 * One rule for a typed start everywhere (D-PC-LIST), as dragging Toggl's start
 * handle does. A start after the end is refused in Toggl's words rather than
 * moving the whole entry, which is what the old list row did and the old sheet
 * did not (`notes/ours-today.md` F).
 */
export function withStart(draft: SheetDraft, iso: IsoDateTime, nowIso: IsoDateTime): SheetResult {
  if (draft.stop === null) {
    if (ms(iso) > ms(nowIso)) return { refusal: SHEET_REFUSALS.startInFuture }
    if (ms(nowIso) - ms(iso) > MAX_SHEET_SECONDS * 1000) return { refusal: SHEET_REFUSALS.tooLong }
  } else {
    if (ms(iso) > ms(draft.stop)) return { refusal: SHEET_REFUSALS.startAfterStop }
    if (ms(draft.stop) - ms(iso) > MAX_SHEET_SECONDS * 1000) return { refusal: SHEET_REFUSALS.tooLong }
  }
  return { draft: { ...draft, start: iso } }
}

export function withStop(draft: SheetDraft, iso: IsoDateTime): SheetResult {
  if (ms(iso) < ms(draft.start)) return { refusal: SHEET_REFUSALS.stopBeforeStart }
  if (ms(iso) - ms(draft.start) > MAX_SHEET_SECONDS * 1000) return { refusal: SHEET_REFUSALS.tooLong }
  return { draft: { ...draft, stop: iso } }
}

/** A start typed into the start chip: "930", "9:30", "9:30 pm" — read on the start's own day (`parseStartTimeInput`) */
export function typeStart(draft: SheetDraft, text: string, nowIso: IsoDateTime): SheetResult {
  const iso = parseStartTimeInput(text, draft.start, draft.stop ?? nowIso)
  if (!iso) return { refusal: unreadableTimeMessage(text) ?? UNREADABLE_TIME }
  return withStart(draft, iso, nowIso)
}

/**
 * An end typed into the end chip, on the end's own day: in the sheet the day
 * is the day drum's to change. Read as "the first such time after the start"
 * (`parseEndTimeInput`, which the PC list keeps), 08:50 typed for an 18:20
 * start silently became tomorrow morning, a 14-hour entry (findability,
 * 2026-11-05); now it is refused in Toggl's words and the end stays.
 */
export function typeStop(draft: SheetDraft, text: string): SheetResult {
  const iso = parseTimeInput(text, dateKey(draft.stop ?? draft.start))
  if (!iso) return { refusal: unreadableTimeMessage(text) ?? UNREADABLE_TIME }
  return withStop(draft, iso)
}

// ---------------------------------------------------------------------------
// The big duration, typed
// ---------------------------------------------------------------------------

/**
 * DIGITS FILL FROM THE RIGHT, LIKE A MICROWAVE.
 *
 * Toggl's duration field [SRC `DurationFieldInfo.cs`]: the last two digits are
 * minutes, the rest hours, so 130 is 1:30, 45 is 0:45 and 90 is an hour and a
 * half (the minutes are not capped at 59: 190 is 2:30). At most five digits; a
 * leading 0 is ignored. Null when it is not digits.
 */
export function microwaveSeconds(digits: string): number | null {
  if (!/^\d{1,5}$/.test(digits)) return null
  const significant = digits.replace(/^0+/, "")
  if (!significant) return 0
  const minutes = Number(significant.slice(-2))
  const hours = significant.length > 2 ? Number(significant.slice(0, -2)) : 0
  return hours * 3600 + minutes * 60
}

/** The digits as they fill in: "1" is 0:01, "13" is 0:13, "130" is 1:30 */
export function microwaveShown(digits: string): string {
  const padded = digits.replace(/^0+/, "").padStart(3, "0")
  return `${Number(padded.slice(0, -2))}:${padded.slice(-2)}`
}

/** What a typed length means: digits as above, anything else the way every duration box reads it (1.30, 1:30, 2h, 45m) */
export function readTypedDuration(raw: string): number | null {
  const text = raw.trim()
  if (!text) return null
  if (/^\d+$/.test(text)) return microwaveSeconds(text.slice(0, 5))
  return parseDurationInput(text)
}

/**
 * One keystroke in the duration box: what it now holds (`raw`) and shows.
 *
 * Typed at the end, which is how a keypad types, a digit joins the raw digits
 * and the box shows them filled from the right; a backspace takes the last
 * one off. Anything that is not a digit ("1.30", "2h") is shown as typed.
 */
export function typeDuration(prev: { raw: string; shown: string }, value: string): { raw: string; shown: string } {
  let raw: string
  if (value.startsWith(prev.shown)) raw = prev.raw + value.slice(prev.shown.length)
  else if (prev.shown.startsWith(value)) raw = prev.raw.slice(0, Math.max(0, prev.raw.length - (prev.shown.length - value.length)))
  else raw = value
  if (/^\d*$/.test(raw)) {
    raw = raw.replace(/^0+/, "").slice(0, 5)
    return { raw, shown: raw === "" ? "" : microwaveShown(raw) }
  }
  return { raw, shown: raw }
}

/**
 * A typed length, applied. A finished entry keeps its start and ends that
 * long after it. A running one keeps the rule the timer has always had
 * (`setRunningElapsed`): longer than it has run moves its start back — "I
 * started 90 minutes ago" — and shorter ends it there — "I forgot to stop it
 * after an hour", which is what the forgotten-timer warning tells you to type.
 */
export function withDuration(draft: SheetDraft, seconds: number, nowIso: IsoDateTime): SheetResult {
  if (seconds > MAX_SHEET_SECONDS) return { refusal: SHEET_REFUSALS.tooLong }
  if (seconds < 0) return { refusal: UNREADABLE_DURATION }
  if (draft.stop !== null) return { draft: { ...draft, stop: isoAt(ms(draft.start) + seconds * 1000) } }
  const ran = Math.floor((ms(nowIso) - ms(draft.start)) / 1000)
  if (seconds >= ran) return { draft: { ...draft, start: isoAt(ms(nowIso) - seconds * 1000) } }
  return { draft: { ...draft, stop: isoAt(ms(draft.start) + seconds * 1000) } }
}

export function typeDurationInto(draft: SheetDraft, raw: string, nowIso: IsoDateTime): SheetResult {
  const seconds = readTypedDuration(raw)
  if (seconds === null) return { refusal: UNREADABLE_DURATION }
  return withDuration(draft, seconds, nowIso)
}

// ---------------------------------------------------------------------------
// "Set to last stop time" and "Round stop time"
// ---------------------------------------------------------------------------

/**
 * "Set to last stop time", under the start [V1 1:53; ST 2026-01-15]: where
 * the entry before this one ended, to the second (its seconds are the point,
 * see `momentChips`). For a new entry, the last one that has ended. Null when
 * there is none, or the start is already there.
 */
export function lastStopTime(state: TimetrackState, draft: SheetDraft, entryId: Id | null, nowIso: IsoDateTime): IsoDateTime | null {
  let found: IsoDateTime | null = null
  if (entryId !== null) {
    found = entryBefore(state, entryId)?.stop ?? null
  } else {
    for (const entry of liveEntries(state)) {
      if (entry.stop === null || entry.duronly || ms(entry.stop) > ms(nowIso)) continue
      if (found === null || ms(entry.stop) > ms(found)) found = entry.stop
    }
  }
  return found !== null && found !== draft.start ? found : null
}

/**
 * "Round stop time", under the end: the end on a round clock time — the
 * workspace's rounding when it has one (Settings › Workspace), otherwise the
 * nearest five minutes — and never before the start. Null while it runs, or
 * when it is round already. (What Toggl rounds to is not documented anywhere
 * that was found; this is the reading that needs no setting.)
 */
export function roundedStop(draft: SheetDraft, rounding: RoundingConfig): IsoDateTime | null {
  if (draft.stop === null) return null
  const minutes = rounding.enabled && rounding.minutes > 0 ? rounding.minutes : 5
  const mode = rounding.enabled ? rounding.mode : "nearest"
  const stop = new Date(draft.stop)
  const hourStart = new Date(stop)
  hourStart.setMinutes(0, 0, 0)
  const into = (stop.getTime() - hourStart.getTime()) / 60_000
  const steps = mode === "up" ? Math.ceil(into / minutes) : mode === "down" ? Math.floor(into / minutes) : Math.round(into / minutes)
  let rounded = hourStart.getTime() + steps * minutes * 60_000
  if (rounded < ms(draft.start)) rounded = ms(draft.start)
  const iso = isoAt(rounded)
  return rounded === ms(draft.stop) ? null : iso
}

// ---------------------------------------------------------------------------
// DONE and CREATE
// ---------------------------------------------------------------------------

function pick<K extends keyof SheetDraft>(changes: SheetChanges, keys: readonly K[]): Pick<SheetDraft, K> | null {
  const picked: Partial<SheetDraft> = {}
  let any = false
  for (const key of keys) {
    if (key in changes && changes[key] !== undefined) {
      ;(picked as Record<string, unknown>)[key] = changes[key]
      any = true
    }
  }
  return any ? (picked as Pick<SheetDraft, K>) : null
}

export interface SaveOutcome {
  state: TimetrackState
  violations: SaveViolation[]
  /** touching neighbours that followed an edge (D12), for the toast's "Keep ‘B’ as it was" */
  moved: NeighbourMove[]
  held: NeighbourHeld[]
}

/**
 * DONE: what was changed, laid onto the entry as it is now.
 *
 * The words first, then the times as one change, so one moved edge takes a
 * touching neighbour along (D12) and both moved is a move, which does not —
 * exactly the old sheet's ✓. Run it inside the update, on `current`.
 */
export function saveEdit(state: TimetrackState, entryId: Id, changes: SheetChanges, nowIso: IsoDateTime): SaveOutcome {
  const nothing = (violations: SaveViolation[]): SaveOutcome => ({ state, violations, moved: [], held: [] })
  const entry = state.entries.find((e) => e.id === entryId && !e.serverDeletedAt)
  if (!entry) return nothing([{ field: "time", message: "This time entry was deleted on another device" }])
  let next = state
  const fields = pick(changes, FIELD_KEYS)
  if (fields) {
    const written = updateEntry(next, entryId, fields, nowIso)
    if (written.violations.length > 0) return nothing(written.violations)
    next = written.state
  }
  const times = pick(changes, TIME_KEYS)
  if (!times) return { state: next, violations: [], moved: [], held: [] }
  // a running entry stays running unless the sheet ended it: a start alone is no end
  const patch = times.stop === null || times.stop === undefined ? { start: times.start ?? entry.start } : times
  const timed = withNeighbours(next, entryId, nowIso, (base) => updateEntry(base, entryId, patch, nowIso))
  if (timed.violations.length > 0) return nothing(timed.violations)
  return { state: timed.state, violations: [], moved: timed.moved, held: timed.held }
}

/** Whether DONE ends a timer that runs now: that waits for the check, as Stop does (D2) */
export function saveStops(state: TimetrackState, entryId: Id, changes: SheetChanges): boolean {
  const entry = state.entries.find((e) => e.id === entryId)
  return Boolean(entry && entry.stop === null && changes.stop)
}

export interface CreateOutcome {
  state: TimetrackState
  violations: SaveViolation[]
  created: TimeEntry | null
  /** the timer that was running and ended where this one began */
  stopped: TimeEntry | null
}

/**
 * CREATE: a running entry from the bar's sheet starts where the sheet says —
 * the tap, unless the start was moved — and a running one, if the other
 * device started one meanwhile, ends there (`switchAt`, one change, one
 * Undo). With an end it is a finished entry (⊕, or a length typed).
 */
export function createFromSheet(state: TimetrackState, draft: SheetDraft, nowIso: IsoDateTime): CreateOutcome {
  const words = entryDraftOf(draft)
  if (draft.stop === null) {
    const begun = switchAt(state, words, draft.start, nowIso)
    return { state: begun.state, violations: begun.violations, created: begun.started, stopped: begun.stopped }
  }
  const made = createManualEntry(state, { draft: words, start: draft.start, stop: draft.stop }, nowIso)
  return { state: made.state, violations: made.violations, created: made.entry, stopped: null }
}

// ---------------------------------------------------------------------------
// Words on the chips
// ---------------------------------------------------------------------------

/** The date on a time chip, without the year, in the person's date format: "11-05", "05.11", "11/05" */
export function chipDate(day: IsoDate, format: DateFormatId): string {
  const [, m, d] = day.split("-")
  switch (format) {
    case "DD.MM.YYYY":
      return `${d}.${m}`
    case "DD-MM-YYYY":
      return `${d}-${m}`
    case "MM/DD/YYYY":
      return `${m}/${d}`
    case "DD/MM/YYYY":
      return `${d}/${m}`
    default:
      return `${m}-${d}`
  }
}
