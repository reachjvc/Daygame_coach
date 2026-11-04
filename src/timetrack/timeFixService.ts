/**
 * Time-tracking slice — fixing times without arithmetic (Phase 4 of
 * Plans/time-tracker-like-toggl.md).
 *
 * The owner tracks whole days back to back, and the repairs he makes most are
 * the ones this file is for: a timer that ran on after he moved on, an end
 * that should sit where the next entry starts, and the gaps and overlaps that
 * typed fixes leave behind. On 2 and 3 November every hand repair left one —
 * gaps of 1 min 29 s and 1 min 6 s, overlaps of 41 s, 33 s and 3 min 49 s —
 * because each repair was a clock time read off one row and retyped into
 * another, seconds out of sight.
 *
 * So everything here takes a moment or an entry, never arithmetic:
 *   - Switched at…, Stopped at… and Started at… (`switchAt`, `stopAt`);
 *   - the sheet's one-tap fixes (`shiftEdge`, `endNow`, `startWhereLastEnded`,
 *     `endWhereNextStarts`);
 *   - touching neighbours moving together (D12, `withNeighbours`);
 *   - the overlap and gap marks in the list (`jointsOf`, `mendJoint`).
 *
 * Pure, like the rest of the slice: state and an explicit `now` in, state and
 * the refusals out. Every write goes through `updateEntry` or `startTimer`, so
 * the locks, the required fields and "an entry cannot end before it starts"
 * hold here exactly as they do everywhere else.
 */

import { dateKey, epochMillis, epochSeconds, formatWhen, isoFromEpochSeconds, startOfDayIso } from "./timetrackFormatService"
import { liveEntries, reconcileRunningEntries, runningEntry, startTimer, updateEntry } from "./timetrackService"
import type { EntryDraft, Id, IsoDateTime, SaveViolation, TimeEntry, TimetrackState } from "./types"

/**
 * Two ends this close are one moment (D12). A Stop on the phone and a Start on
 * the PC half a minute later are a switch, not a gap — the owner's own
 * hand-offs land like that — and a Stop then a Start on one screen are seconds
 * apart.
 */
export const TOUCHING_SECONDS = 60

/** A neighbour is never moved shorter than this: never to nothing (Q3, case 4) */
export const SHORTEST_NEIGHBOUR_SECONDS = 60

/** A gap this long or longer is a break you took, not a slip to close */
export const SMALL_GAP_SECONDS = 5 * 60

/**
 * The minute you are typing in. "14:30" typed at 14:29:50 is now, not a time
 * that has not happened yet — the same grace `updateEntry` gives a running
 * timer's end.
 */
const TYPING_GRACE_SECONDS = 60

const named = (entry: TimeEntry) => entry.description.trim() || "(no description)"

const refused = (message: string): SaveViolation[] => [{ field: "time", message }]

const byId = (state: TimetrackState, id: Id) => state.entries.find((e) => e.id === id && !e.serverDeletedAt) ?? null

// ---------------------------------------------------------------------------
// Switched at…, Stopped at…, Started at…
// ---------------------------------------------------------------------------

/**
 * Where a moment may fall: not before the running timer began (it would end
 * before it started), and not after now (a running entry that begins in the
 * future counts down, and a finished one claims work nobody has done yet).
 */
export function momentBounds(
  state: TimetrackState,
  nowIso: IsoDateTime,
): { running: TimeEntry | null; earliest: IsoDateTime | null; latest: IsoDateTime } {
  const running = runningEntry(state)
  return { running, earliest: running?.start ?? null, latest: nowIso }
}

/** Why a moment cannot be used, in words for the picker; null when it can */
export function momentRefusal(state: TimetrackState, atIso: IsoDateTime, nowIso: IsoDateTime): string | null {
  const { running } = momentBounds(state, nowIso)
  if (running && epochSeconds(atIso) < epochSeconds(running.start)) {
    return `That is before “${named(running)}” started ${formatWhen(running.start, state.user.timeFormat, dateKey(nowIso))}`
  }
  if (epochSeconds(atIso) - epochSeconds(nowIso) >= TYPING_GRACE_SECONDS) return "That has not happened yet"
  return null
}

/**
 * Inside the minute of grace, a moment just ahead of the clock is now. And a
 * moment in the running timer's own second, a fraction before its start, is
 * the start: `momentRefusal` counts whole seconds, a timer's start has
 * milliseconds, and the end built from it otherwise landed before the start
 * (edits audit B1) — which the rule refuses, so the tap did nothing.
 */
function settle(atIso: IsoDateTime, nowIso: IsoDateTime, running: TimeEntry | null = null): IsoDateTime {
  const moment = epochSeconds(atIso) > epochSeconds(nowIso) ? nowIso : atIso
  return running && epochMillis(moment) < epochMillis(running.start) ? running.start : moment
}

export interface MomentChip {
  id: string
  label: string
  at: IsoDateTime
  /** before the running timer began: shown greyed, so the row of chips holds still */
  disabled: boolean
}

const MINUTES_AGO: [number, string][] = [
  [5, "5 min ago"],
  [15, "15 min ago"],
  [30, "30 min ago"],
  [60, "1 h ago"],
]

/**
 * The end of the most recent finished entry, seconds and all.
 *
 * The seconds are the point. A box can only take minutes, and starting at
 * 11:55 an entry that ended at 11:55:40 overlaps it by forty seconds — the
 * size of the overlaps in the owner's records after every hand-added entry.
 */
function lastEnd(state: TimetrackState, nowIso: IsoDateTime): IsoDateTime | null {
  let latest: IsoDateTime | null = null
  for (const entry of liveEntries(state)) {
    if (entry.stop === null || entry.duronly || epochSeconds(entry.stop) > epochSeconds(nowIso)) continue
    if (latest === null || epochSeconds(entry.stop) > epochSeconds(latest)) latest = entry.stop
  }
  return latest
}

/**
 * The picker's chips: 5, 15 and 30 minutes and an hour ago, then "When the
 * last entry ended" — for the gap you left without starting the next thing.
 *
 * That last one is only offered when it can be used. With a timer running it
 * ended before that timer began, every time, so a chip that is always greyed
 * would only be one more thing to read. The others are greyed rather than
 * dropped, so the row does not rearrange itself between one timer and the next.
 */
export function momentChips(state: TimetrackState, nowIso: IsoDateTime): MomentChip[] {
  const { earliest } = momentBounds(state, nowIso)
  const now = epochSeconds(nowIso)
  const before = (iso: IsoDateTime) => earliest !== null && epochSeconds(iso) < epochSeconds(earliest)
  const chips: MomentChip[] = MINUTES_AGO.map(([minutes, label]) => {
    const at = isoFromEpochSeconds(now - minutes * 60)
    return { id: `${minutes}m`, label, at, disabled: before(at) }
  })
  const gap = lastEnd(state, nowIso)
  if (gap && !before(gap)) chips.push({ id: "last-end", label: "When the last entry ended", at: gap, disabled: false })
  return chips
}

/**
 * SWITCHED AT…: the running entry ends at the moment and the next one starts
 * at the same moment, to the second, in one change.
 *
 * One change so that one Undo takes it back: `undoDisplacement` removes the
 * new entry and sets the old one running again from its own start, which is
 * the state before the tap. With nothing running this is Started at…: the next
 * entry starts at the moment, filling the gap behind it.
 *
 * Two timers running (two devices without signal) are put right first, the
 * way a Stop puts them right, so the one that ends is the one on screen.
 */
export function switchAt(
  state: TimetrackState,
  draft: EntryDraft,
  atIso: IsoDateTime,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[]; stopped: TimeEntry | null; started: TimeEntry | null } {
  const nothing = (violations: SaveViolation[]) => ({ state, violations, stopped: null, started: null })
  const reconciled = reconcileRunningEntries(state).state
  const refusal = momentRefusal(reconciled, atIso, nowIso)
  if (refusal) return nothing(refused(refusal))
  const moment = settle(atIso, nowIso, runningEntry(reconciled))

  let next = reconciled
  let stopped: TimeEntry | null = null
  const running = runningEntry(reconciled)
  if (running) {
    const ended = updateEntry(next, running.id, { stop: moment }, nowIso)
    if (ended.violations.length > 0) return nothing(ended.violations)
    next = ended.state
    stopped = byId(next, running.id)
  }

  // `startTimer` validates the new entry on the moment's own day, so a locked
  // or approved week refuses it here the way it refuses a Start
  const begun = startTimer(next, draft, moment)
  if (begun.violations.length > 0) return nothing(begun.violations)
  // made now, starting then: `at` is when the row changed, not when the work began
  const started: TimeEntry = { ...begun.entry, at: nowIso }
  next = { ...begun.state, entries: begun.state.entries.map((e) => (e.id === started.id ? started : e)) }
  return { state: next, violations: [], stopped, started }
}

/** STOPPED AT…: the running entry ends at the moment, and nothing starts */
export function stopAt(
  state: TimetrackState,
  atIso: IsoDateTime,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[]; stopped: TimeEntry | null } {
  const reconciled = reconcileRunningEntries(state).state
  const running = runningEntry(reconciled)
  if (!running) return { state, violations: refused("Nothing is running"), stopped: null }
  const refusal = momentRefusal(reconciled, atIso, nowIso)
  if (refusal) return { state, violations: refused(refusal), stopped: null }
  const ended = updateEntry(reconciled, running.id, { stop: settle(atIso, nowIso, running) }, nowIso)
  if (ended.violations.length > 0) return { state, violations: ended.violations, stopped: null }
  return { state: ended.state, violations: [], stopped: byId(ended.state, running.id) }
}

/**
 * Undo for Stopped at…: running again from its own start.
 *
 * Not on top of another timer started since — two running is the state
 * `reconcileRunningEntries` exists to undo, and it would undo it by stopping
 * this one again.
 */
export function undoStopAt(
  state: TimetrackState,
  entryId: Id,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const other = runningEntry(state)
  if (other && other.id !== entryId) return { state, violations: refused("Another timer is running now — stop it first") }
  return updateEntry(state, entryId, { stop: null }, nowIso, { resuming: true })
}

// ---------------------------------------------------------------------------
// Touching neighbours (D12)
// ---------------------------------------------------------------------------

/** A neighbour that moved with an edit, and where from: what "Keep ‘B’ as it was" puts back */
export interface NeighbourMove {
  entryId: Id
  description: string
  /** the NEIGHBOUR's edge: the next entry's start, or the previous entry's end */
  edge: "start" | "stop"
  from: IsoDateTime
  to: IsoDateTime
}

/** A neighbour that touched, and was left where it was because following would shrink it under a minute */
export interface NeighbourHeld {
  entryId: Id
  description: string
}

/**
 * The entry on the other side of an edge that is moving, if it touched it:
 * for an end, the next entry, whose start was within a minute of it; for a
 * start, the previous entry, whose end was. The nearest, if two qualify.
 *
 * Never across midnight (Q3, case 9): an entry ending just before 00:00 and
 * one starting just after belong to two days, and the day totals are kept per
 * day. Never a duration-only entry, whose times are hidden on purpose.
 */
function touchingNeighbour(state: TimetrackState, edited: TimeEntry, edge: "start" | "stop", oldEdge: IsoDateTime): TimeEntry | null {
  const old = epochSeconds(oldEdge)
  let nearest: TimeEntry | null = null
  let nearestDistance = Infinity
  for (const other of liveEntries(state)) {
    if (other.id === edited.id || other.duronly) continue
    // the next entry starts after this one starts; the previous one before it
    const onTheRightSide =
      edge === "stop" ? epochSeconds(other.start) > epochSeconds(edited.start) : epochSeconds(other.start) < epochSeconds(edited.start)
    if (!onTheRightSide) continue
    const otherEdge = edge === "stop" ? other.start : other.stop
    if (otherEdge === null) continue
    const distance = Math.abs(epochSeconds(otherEdge) - old)
    if (distance > TOUCHING_SECONDS || dateKey(otherEdge) !== dateKey(oldEdge)) continue
    if (distance < nearestDistance) {
      nearest = other
      nearestDistance = distance
    }
  }
  return nearest
}

/**
 * TOUCHING NEIGHBOURS MOVE TOGETHER (D12).
 *
 * `apply` is the edit as the caller would make it anyway — a typed end, a
 * start, a one-tap ±5, a calendar resize. If it moved ONE end of the entry,
 * and the entry on the other side of that end touched it, that entry's edge
 * follows: A's end set to 11:55 takes B's start to 11:55, because B is what
 * you were doing from 11:55 (Q3, case 1). The same for a start and the entry
 * before it (case 6).
 *
 * Not when both ends moved: that is the entry being moved — a calendar drag,
 * a new day — and moving a block is a different intent (case 7). Not when the
 * neighbour would come out under a minute: it stays, the overlap shows in the
 * list with its Fix, and `held` says so (case 4). A running neighbour follows
 * and keeps running (case 5). A neighbour the locks refuse stays put, and your
 * own edit stands.
 *
 * The answer carries `moved`, for the toast's "Keep ‘B’ as it was", and both
 * rows go out through the normal versioned sync like any other edit (case 11).
 */
export function withNeighbours<R extends { state: TimetrackState; violations: SaveViolation[] }>(
  base: TimetrackState,
  entryId: Id,
  nowIso: IsoDateTime,
  apply: (base: TimetrackState) => R,
): R & { moved: NeighbourMove[]; held: NeighbourHeld[] } {
  const result = apply(base)
  const alone: R & { moved: NeighbourMove[]; held: NeighbourHeld[] } = { ...result, moved: [], held: [] }
  if (result.violations.length > 0) return alone

  const before = byId(base, entryId)
  const after = byId(result.state, entryId)
  if (!before || !after || before.duronly || after.duronly) return alone
  const startMoved = before.start !== after.start
  const stopMoved = before.stop !== after.stop
  // a running entry given an end has no old end to have touched anything
  if (startMoved === stopMoved || (stopMoved && (before.stop === null || after.stop === null))) return alone

  const edge = startMoved ? "start" : "stop"
  const oldEdge = edge === "start" ? before.start : before.stop!
  const newEdge = edge === "start" ? after.start : after.stop!
  if (dateKey(newEdge) !== dateKey(oldEdge)) return alone

  const touching = touchingNeighbour(base, before, edge, oldEdge)
  const neighbour = touching ? byId(result.state, touching.id) : null
  if (!neighbour) return alone
  /**
   * ALREADY THERE IS NOT MOVED. "End where the next one starts" lands the edge
   * exactly on the neighbour — the fix the owner makes most — and Email was
   * "moved" from 11:55:10 to 11:55:10: its row written and synced, and a toast
   * offering to keep it as it was (code review, 2026-11-04). Equal to the
   * millisecond; half a second off still follows.
   */
  const neighbourEdge = edge === "stop" ? neighbour.start : neighbour.stop
  if (neighbourEdge !== null && epochMillis(neighbourEdge) === epochMillis(newEdge)) return alone

  const start = edge === "stop" ? newEdge : neighbour.start
  const end = edge === "stop" ? (neighbour.stop ?? nowIso) : newEdge
  if (epochSeconds(end) - epochSeconds(start) < SHORTEST_NEIGHBOUR_SECONDS) {
    return { ...alone, held: [{ entryId: neighbour.id, description: named(neighbour) }] }
  }

  const followed = updateEntry(result.state, neighbour.id, edge === "stop" ? { start: newEdge } : { stop: newEdge }, nowIso)
  if (followed.violations.length > 0) return alone
  const move: NeighbourMove = {
    entryId: neighbour.id,
    description: named(neighbour),
    edge: edge === "stop" ? "start" : "stop",
    from: edge === "stop" ? neighbour.start : neighbour.stop!,
    to: newEdge,
  }
  return { ...alone, state: followed.state, moved: [move] }
}

/** "Keep ‘B’ as it was": B's edge goes back, and the edit that moved it stays */
export function keepNeighbour(
  state: TimetrackState,
  move: NeighbourMove,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  return updateEntry(state, move.entryId, move.edge === "start" ? { start: move.from } : { stop: move.from }, nowIso)
}

// ---------------------------------------------------------------------------
// The detail sheet's one-tap fixes
// ---------------------------------------------------------------------------

/**
 * ±5 minutes on one end. The other end stays, so the length changes.
 *
 * A start moved past the end is refused, not turned into a moved entry the way
 * a typed start is (`setEntryStart`): a nudge means "a little earlier or
 * later", and an entry that jumped somewhere else would not be that.
 */
export function shiftEdge(
  state: TimetrackState,
  entryId: Id,
  edge: "start" | "stop",
  seconds: number,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const entry = byId(state, entryId)
  if (!entry) return { state, violations: [] }
  // from the exact time, milliseconds and all: rounded down first, −5 on a
  // five-minute timer-made entry ended it before it began (edits audit B1)
  if (edge === "stop") {
    if (entry.stop === null) return { state, violations: refused("It is still running — use Stop at… to end it") }
    return updateEntry(state, entryId, { stop: new Date(epochMillis(entry.stop) + seconds * 1000).toISOString() }, nowIso)
  }
  const start = new Date(epochMillis(entry.start) + seconds * 1000).toISOString()
  // a running timer that has not started yet would count down, not up
  if (entry.stop === null && epochMillis(start) > epochMillis(nowIso)) {
    return { state, violations: refused("A running timer cannot start in the future") }
  }
  return updateEntry(state, entryId, { start }, nowIso)
}

/**
 * End now: a finished entry ends at this moment, and a running one stops.
 * Never before it began: on a timer started this very second, now can be a
 * fraction before its start, and that end would be refused (edits audit B1).
 */
export function endNow(state: TimetrackState, entryId: Id, nowIso: IsoDateTime): { state: TimetrackState; violations: SaveViolation[] } {
  const entry = byId(state, entryId)
  if (!entry) return { state, violations: [] }
  const stop = epochMillis(nowIso) < epochMillis(entry.start) ? entry.start : nowIso
  return updateEntry(state, entryId, { stop }, nowIso)
}

/** Entries the one-tap fixes may measure from: live, with times shown */
function others(state: TimetrackState, entry: TimeEntry): TimeEntry[] {
  return liveEntries(state).filter((e) => e.id !== entry.id && !e.duronly)
}

/** The finished entry that started most recently before this one did */
export function entryBefore(state: TimetrackState, entryId: Id): TimeEntry | null {
  const entry = byId(state, entryId)
  if (!entry) return null
  let found: TimeEntry | null = null
  for (const other of others(state, entry)) {
    if (other.stop === null || epochSeconds(other.start) >= epochSeconds(entry.start)) continue
    if (!found || epochSeconds(other.start) > epochSeconds(found.start)) found = other
  }
  return found
}

/** The entry that started first after this one did */
export function entryAfter(state: TimetrackState, entryId: Id): TimeEntry | null {
  const entry = byId(state, entryId)
  if (!entry) return null
  let found: TimeEntry | null = null
  for (const other of others(state, entry)) {
    if (epochSeconds(other.start) <= epochSeconds(entry.start)) continue
    if (!found || epochSeconds(other.start) < epochSeconds(found.start)) found = other
  }
  return found
}

/** "Start where the last one ended", to the second */
export function startWhereLastEnded(
  state: TimetrackState,
  entryId: Id,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const before = entryBefore(state, entryId)
  if (!before?.stop) return { state, violations: refused("There is no entry before this one") }
  return updateEntry(state, entryId, { start: before.stop }, nowIso)
}

/** "End where the next one starts", to the second; on a running timer, that stops it there */
export function endWhereNextStarts(
  state: TimetrackState,
  entryId: Id,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const after = entryAfter(state, entryId)
  if (!after) return { state, violations: refused("There is no entry after this one") }
  return updateEntry(state, entryId, { stop: after.start }, nowIso)
}

// ---------------------------------------------------------------------------
// Overlap and gap marks
// ---------------------------------------------------------------------------

export interface Joint {
  kind: "overlap" | "gap"
  earlierId: Id
  laterId: Id
  /** how long the overlap or the gap is */
  seconds: number
  /**
   * Why an overlap has no Fix. "inside": the later entry ends before the
   * earlier one does, so ending the earlier where the later starts would cut
   * far more than the overlap. "running": the earlier is still running, and
   * Fix never stops a timer. Absent when Fix removes just the overlap.
   */
  noFix?: "inside" | "running"
}

/**
 * Whether "end the earlier where the later starts" removes ONLY the overlap.
 *
 * It does when the later entry runs on to the earlier one's end or past it —
 * the 33-second and 4-minute overlaps that hand fixes leave. It does not when
 * the later one sits inside: a call added for 10:30–10:45 inside a finished
 * 10:00–12:00 cut the earlier to 10:30, 1:30 gone to remove 15 minutes; inside
 * a timer running since 10:00 it stopped the timer and threw away everything
 * from 10:45 to now (code review, 2026-11-04). And a running earlier is never
 * ended here at all: Stop and Stopped at… are how a timer ends.
 */
function noFixFor(earlier: TimeEntry, later: TimeEntry, nowIso: IsoDateTime): Joint["noFix"] {
  if (epochMillis(later.stop ?? nowIso) < epochMillis(earlier.stop ?? nowIso)) return "inside"
  if (earlier.stop === null) return "running"
  return undefined
}

/** The overlap or small gap between two entries next to each other in time; null where they meet */
function jointBetween(earlier: TimeEntry, later: TimeEntry, nowIso: IsoDateTime): Joint | null {
  const earlierEnd = epochSeconds(earlier.stop ?? nowIso)
  const laterStart = epochSeconds(later.start)
  if (earlierEnd > laterStart) {
    // an entry wholly inside the one before overlaps it by its own length
    const laterEnd = epochSeconds(later.stop ?? nowIso)
    const joint: Joint = { kind: "overlap", earlierId: earlier.id, laterId: later.id, seconds: Math.min(earlierEnd, laterEnd) - laterStart }
    const noFix = noFixFor(earlier, later, nowIso)
    return noFix ? { ...joint, noFix } : joint
  }
  if (laterStart - earlierEnd >= TOUCHING_SECONDS && laterStart - earlierEnd < SMALL_GAP_SECONDS) {
    return { kind: "gap", earlierId: earlier.id, laterId: later.id, seconds: laterStart - earlierEnd }
  }
  return null
}

/**
 * Where two entries next to each other in time do not meet: they overlap, or
 * a small gap lies between them.
 *
 * Any overlap counts — it is time counted twice in the day's total, and the
 * owner's ran from 33 seconds to almost 4 minutes. A gap counts from a minute
 * (closer is touching, D12: a Stop and a Start seconds apart is how back-to-
 * back tracking looks) up to five (longer is a break you took).
 *
 * Within a day, by start, like the list's own day groups — and across the
 * midnight before it: each day's first entry is also compared with the entry
 * from an earlier day that reaches furthest into it. Compared within start days
 * only, sleep from 23:00 to 07:00:40 and an entry from 07:00 counted 40 seconds
 * twice and were never marked (code review, 2026-11-04). Only when that entry
 * does reach the day: an evening ended at 23:58 and a start at 00:01 are two
 * days, and closing that "gap" would move the morning back onto the night.
 *
 * Duration-only entries have no times to compare. A running entry ends now.
 */
export function jointsOf(entries: TimeEntry[], nowIso: IsoDateTime): Joint[] {
  const days = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    if (entry.serverDeletedAt || entry.duronly) continue
    const key = dateKey(entry.start)
    days.set(key, [...(days.get(key) ?? []), entry])
  }

  const joints: Joint[] = []
  const endOf = (entry: TimeEntry) => epochMillis(entry.stop ?? nowIso)
  /** of the days so far, the entry that ends latest: the one that can run on into the next */
  let reaching: TimeEntry | null = null
  for (const key of [...days.keys()].sort()) {
    const day = days.get(key)!
    // to the millisecond: two entries begun in the same second are still in an order, and Fix needs the right one (B1)
    day.sort((a, b) => epochMillis(a.start) - epochMillis(b.start))
    if (reaching && endOf(reaching) >= epochMillis(startOfDayIso(key))) {
      const across = jointBetween(reaching, day[0], nowIso)
      if (across) joints.push(across)
    }
    for (let i = 1; i < day.length; i++) {
      const joint = jointBetween(day[i - 1], day[i], nowIso)
      if (joint) joints.push(joint)
    }
    for (const entry of day) if (!reaching || endOf(entry) > endOf(reaching)) reaching = entry
  }
  return joints
}

/**
 * Fix and Close gap.
 *
 * An overlap is fixed by ending the earlier entry where the later one starts —
 * the later one is the thing you moved on to — and only where that removes
 * just the overlap (`noFixFor`); anywhere else it is refused, in words. A gap
 * is closed by starting the later one where the earlier ended: the later is
 * usually the one added by hand afterwards, which is where the gap came from.
 */
export function mendJoint(
  state: TimetrackState,
  joint: Joint,
  nowIso: IsoDateTime,
): { state: TimetrackState; violations: SaveViolation[] } {
  const earlier = byId(state, joint.earlierId)
  const later = byId(state, joint.laterId)
  if (!earlier || !later) return { state, violations: refused("One of those entries is gone") }
  if (joint.kind === "overlap") {
    // asked of the entries as they are now, not as the mark was drawn
    const noFix = noFixFor(earlier, later, nowIso)
    if (noFix === "inside") {
      return { state, violations: refused(`“${named(later)}” is inside “${named(earlier)}”: ending “${named(earlier)}” where it starts would cut more than the overlap`) }
    }
    if (noFix === "running") return { state, violations: refused(`“${named(earlier)}” is still running: Fix never stops a timer`) }
    return updateEntry(state, earlier.id, { stop: later.start }, nowIso)
  }
  if (!earlier.stop) return { state, violations: refused("The entry before it is still running") }
  return updateEntry(state, later.id, { start: earlier.stop }, nowIso)
}
