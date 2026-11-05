/**
 * Two tabs of one browser, each holding the whole workspace: what a tab keeps
 * when another tells it about a change. Pure; the messaging is in `useTimetrack`.
 *
 * WHY. Every tab tells the others about each change it makes, and the other
 * tab used to take the workspace it was told about whole — and then tell the
 * first tab about it again. By the time that echo arrived the first tab had
 * moved on, so it took its own older workspace back and its next upload sent
 * the older version to the account. Two tabs changing at the same moment (one
 * typing, the other applying the account's answer) each threw the other's
 * change away the same way.
 *
 * THE RULE. A message says which shared workspace it was built on. What the
 * receiving tab changed since that workspace stays; everything else is taken
 * from the message — lists of things with an id (entries, projects, tags…)
 * item by item, objects (settings, each entry) field by field, at every level. A tab that changed nothing
 * since takes the message as it is, which is the common case and costs nothing.
 */

import { epochSeconds } from "./timetrackFormatService"
import type { TimeEntry, TimetrackState } from "./types"

type AnyRecord = Record<string, unknown>
type WithId = { id: string } & AnyRecord

function same(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
}

function isListOfIds(value: unknown): value is WithId[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "object" && item !== null && typeof (item as AnyRecord).id === "string")
  )
}

function byId(list: WithId[]): Map<string, WithId> {
  return new Map(list.map((item) => [item.id, item]))
}

function isPlainObject(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * One value, three ways: theirs where this tab left it as it was, this tab's
 * where it changed it. Objects (settings, an entry) go field by field, lists of
 * things with an id item by item; anything else changed here is this tab's.
 */
function mergeValue(ancestor: unknown, ours: unknown, theirs: unknown): unknown {
  if (same(ours, ancestor)) return theirs
  if (isListOfIds(ancestor) && isListOfIds(ours) && isListOfIds(theirs)) return mergeList(ancestor, ours, theirs)
  if (isPlainObject(ancestor) && isPlainObject(ours) && isPlainObject(theirs)) {
    const out: AnyRecord = {}
    // theirs' order first, so a merge that changes nothing reads the same
    for (const key of new Set([...Object.keys(theirs), ...Object.keys(ours), ...Object.keys(ancestor)])) {
      const value = mergeValue(ancestor[key], ours[key], theirs[key])
      if (value !== undefined) out[key] = value
    }
    return out
  }
  return ours
}

/**
 * Item by item: theirs, except what this tab added, changed or removed since
 * `ancestor`. An item this tab changed and theirs removed is kept — an edit is
 * a reason to keep something, and entries are deleted with a tombstone anyway.
 */
function mergeList(ancestor: WithId[], ours: WithId[], theirs: WithId[]): WithId[] {
  const base = byId(ancestor)
  const mine = byId(ours)
  const other = byId(theirs)
  const out: WithId[] = []
  for (const item of theirs) {
    const here = mine.get(item.id)
    const was = base.get(item.id)
    if (here === undefined) {
      if (was === undefined) out.push(item) // new over there
      continue // removed here
    }
    out.push(was === undefined ? here : (mergeValue(was, here, item) as WithId))
  }
  for (const item of ours) {
    if (other.has(item.id)) continue
    const was = base.get(item.id)
    if (was === undefined || !same(item, was)) out.push(item) // added here, or changed here and removed there
  }
  return out
}

/**
 * The workspace a tab should hold after `theirs` arrives, when this tab holds
 * `ours` and the message was built on `ancestor`. Returns `theirs` itself when
 * nothing of this tab's is left to lay on top, so the caller can tell a plain
 * take (nothing to tell anyone) from a merge (a change of this tab's own); and
 * `ours` itself when the message brings nothing this tab does not already have
 * — two messages crossing with the same news — so nothing is said twice.
 */
export function mergeTabStates(ancestor: TimetrackState, ours: TimetrackState, theirs: TimetrackState): TimetrackState {
  if (ours === ancestor || ours === theirs) return theirs
  const merged = mergeValue(ancestor, ours, theirs)
  if (same(merged, theirs)) return theirs
  if (same(merged, ours)) return ours
  return merged as TimetrackState
}

/**
 * A CHANGE MADE ON THE COPY ON SCREEN, LAID ONTO THE NEWEST COPY THERE IS.
 *
 * A tap is worked out on the workspace this page last DREW — `state` in a
 * component, `latestState` in a ref. By the time React applies it, a newer copy
 * may be waiting: the account's answer to a check, handed over a moment before
 * and not drawn yet. Writing the tap's result whole, ignoring the copy React
 * hands the update, put the drawn copy back over that answer. A timer the PC
 * had stopped ran again, a rename from the PC was undone — and the sync engine,
 * finding this device's copy different from the account's, sent it up as an
 * edit of this device's own, which the account took
 * (`aRenameTypedWhileTheOtherDeviceStopsKeepsTheStop`,
 * `aTapOnTheCopyOnScreenKeepsWhatTheOtherDeviceDid`).
 *
 * `setState(layOnto(drawn, next))` lays only what the tap changed onto
 * `current` — field by field, item by item, the rule two tabs already follow —
 * so what the tap added (a project the picker just created, a new entry) is
 * kept, and what the other device did meanwhile stays. With nothing newer
 * waiting it is `next` itself.
 */
export function layOnto(drawn: TimetrackState, next: TimetrackState): (current: TimetrackState) => TimetrackState {
  return (current) => {
    if (next === drawn) return current
    if (current === drawn) return next
    const merged = mergeTabStates(drawn, next, current)
    if (merged === current || merged === next) return merged
    const ours = new Map(next.entries.map((e) => [e.id, e]))
    const theirs = new Map(current.entries.map((e) => [e.id, e]))
    let mixed = false
    const entries = merged.entries.map((entry) => {
      const settled = keptWhole(entry, ours.get(entry.id), theirs.get(entry.id))
      if (settled !== entry) mixed = true
      return settled
    })
    return mixed ? { ...merged, entries } : merged
  }
}

/**
 * An entry's start, end and length belong together: a negative length is how
 * a RUNNING entry is written. Field by field, this tap's new start could meet
 * the other device's stop, and keep the running length beside it. When the
 * three did not all come from one side, the length is worked out again from
 * the start and end that were kept.
 */
function keptWhole(entry: TimeEntry, ours: TimeEntry | undefined, theirs: TimeEntry | undefined): TimeEntry {
  const sameTime = (other: TimeEntry | undefined) =>
    other !== undefined && other.start === entry.start && other.stop === entry.stop && other.duration === entry.duration
  if (sameTime(ours) || sameTime(theirs)) return entry
  const duration =
    entry.stop === null ? -epochSeconds(entry.start) : Math.max(0, epochSeconds(entry.stop) - epochSeconds(entry.start))
  return duration === entry.duration ? entry : { ...entry, duration }
}
