/**
 * ONE RULE FOR A TYPED START, WHEREVER IT IS TYPED (D-PC-LIST in
 * Plans/toggl-parity.md).
 *
 * A new start keeps the end, so the length changes — the way dragging the
 * start handle of a block does. A running entry has no end to keep: it goes on
 * running from the new start.
 *
 * The one exception is a start typed AFTER the end, where keeping the end is
 * impossible. Then the entry moves to the new start and keeps its length, as
 * it has since the edits audit: refusing that case made the order you type in
 * matter (a 15:47–17:00 entry could not be given its real start of 22:00
 * without typing the end first), and nobody should have to know that.
 *
 * The list row, the entry sheet (its boxes, and its boxes while the drums hold
 * an unsaved pair), and the PC's running-time box all go through here, so a
 * start typed in one place lands where the same start typed in another does.
 * The plan saw "a row moves the entry, the sheet keeps the end": that was the
 * same rule met in its two cases (a start after the end in the row, before the
 * end in the sheet), and only the drums' unsaved pair disagreed with it.
 */

import type { IsoDateTime } from "./types"

/** A start and an end; a null end is a running timer */
export interface StartAndEnd {
  start: IsoDateTime
  stop: IsoDateTime | null
}

const ms = (iso: IsoDateTime) => new Date(iso).getTime()

/** Where an entry's two ends land when `start` is typed as its start */
export function startTypedInto(entry: StartAndEnd, start: IsoDateTime): StartAndEnd {
  if (entry.stop === null || ms(start) <= ms(entry.stop)) return { start, stop: entry.stop }
  // to the millisecond, so a zero-length entry stays in order (B1)
  const lengthMs = ms(entry.stop) - ms(entry.start)
  return { start, stop: new Date(ms(start) + lengthMs).toISOString() }
}
