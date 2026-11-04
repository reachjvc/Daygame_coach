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
 * from the message — for lists of things with an id (entries, projects, tags…)
 * item by item, for everything else field by field. A tab that changed nothing
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
    out.push(was !== undefined && same(here, was) ? item : here)
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
 * take (nothing to tell anyone) from a merge (a change of this tab's own).
 */
export function mergeTabStates(ancestor: TimetrackState, ours: TimetrackState, theirs: TimetrackState): TimetrackState {
  if (ours === ancestor || ours === theirs) return theirs
  const a = ancestor as unknown as AnyRecord
  const o = ours as unknown as AnyRecord
  const t = theirs as unknown as AnyRecord
  const out: AnyRecord = { ...t }
  let kept = false
  for (const key of new Set([...Object.keys(a), ...Object.keys(o), ...Object.keys(t)])) {
    if (same(o[key], a[key])) continue // not changed here: theirs stands
    const value = isListOfIds(a[key]) && isListOfIds(o[key]) && isListOfIds(t[key]) ? mergeList(a[key], o[key], t[key]) : o[key]
    if (same(value, t[key])) continue
    out[key] = value
    kept = true
  }
  return kept ? (out as unknown as TimetrackState) : theirs
}
