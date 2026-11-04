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

import type { TimetrackState } from "./types"

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
