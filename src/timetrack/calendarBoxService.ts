/**
 * WHAT THE PC'S CALENDAR BOX SHOWS WHEN ITS ENTRY CHANGES ELSEWHERE
 * (D-FOLLOW, Plans/time-tracker-leftovers.md, Phase 2).
 *
 * The box copies the entry when it opens (`opened`) and holds what is typed
 * (`shown`). When a newer copy arrives (the phone renamed it, stopped it), a
 * field not touched since the box opened takes the newer value; a field typed
 * in keeps the typing. The newer copy becomes the new `opened`, so Save, which
 * writes only what differs from `opened`, writes the typing and nothing the
 * other device just did.
 *
 * Fields, as Save writes them: the name; project and task together; tags;
 * billable; the start; the end. Start and end follow one by one: a start
 * typed into a running entry must not hide the phone's Stop, and a start typed
 * here must not let Save put back an end the phone moved.
 *
 * The phone's sheet needs no copy of this: it keeps only its changes over the
 * newest entry (`shownDraft(base, changes)` in phoneSheetService), so an
 * untouched field there is always the newest one.
 */

import type { TimePair } from "./drumService"
import type { EntryDraft } from "./types"

export interface BoxFields {
  draft: EntryDraft
  pair: TimePair
}

const sameTags = (a: string[], b: string[]) => a.join(",") === b.join(",")
const sameProject = (a: EntryDraft, b: EntryDraft) => a.projectId === b.projectId && a.taskId === b.taskId
const samePair = (a: TimePair, b: TimePair) => a.start === b.start && a.stop === b.stop

function sameFields(a: BoxFields, b: BoxFields): boolean {
  return (
    a.draft.description === b.draft.description &&
    sameProject(a.draft, b.draft) &&
    sameTags(a.draft.tagIds, b.draft.tagIds) &&
    a.draft.billable === b.draft.billable &&
    samePair(a.pair, b.pair)
  )
}

/** The box after a newer copy of its entry: untouched fields follow it; `opened` becomes it */
export function followNewest(opened: BoxFields, shown: BoxFields, newest: BoxFields): { opened: BoxFields; shown: BoxFields } {
  if (sameFields(opened, newest)) return { opened, shown }
  const was = opened.draft
  const now = shown.draft
  const next = newest.draft
  const draft: EntryDraft = {
    description: now.description === was.description ? next.description : now.description,
    projectId: sameProject(now, was) ? next.projectId : now.projectId,
    taskId: sameProject(now, was) ? next.taskId : now.taskId,
    tagIds: sameTags(now.tagIds, was.tagIds) ? next.tagIds : now.tagIds,
    billable: now.billable === was.billable ? next.billable : now.billable,
  }
  // each edge on its own: a start typed here must not hold back the other device's stop or end
  const pair = {
    start: shown.pair.start === opened.pair.start ? newest.pair.start : shown.pair.start,
    stop: shown.pair.stop === opened.pair.stop ? newest.pair.stop : shown.pair.stop,
  }
  return { opened: newest, shown: { draft, pair } }
}
