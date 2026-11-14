/**
 * THE PHONE LIST'S RULES, AS DATA (Plans/toggl-parity.md Phase 3, D-SWIPE,
 * D-PLANNED).
 *
 * Swipe a row right to continue it, left to delete it, as Toggl's Android
 * list does [H25 #04; SRC `MainRecyclerViewTouchCallback`]: the row follows the
 * finger and acts past 40% of its width or on a fast flick (Toggl's is 75%). A
 * finger that sets off up or down is a scroll and the row never moves.
 *
 * Planned entries — ones that have not begun — are in the calendar and not in
 * the list until they start, as Toggl's future entries are [HELP]. The day
 * still says how much is planned beside its total. The running entry is the
 * bar's, not a row, until it stops (Toggl, V1 2:02, 4:33; H25 help_14 f001);
 * the day's total keeps counting it, which is ours, not Toggl's.
 */

import { entrySeconds, isPlanned, isRunning } from "./timetrackService"
import type { DayGroup, EntryRow } from "./types"

/** How far a finger may drift before it is going somewhere */
export const ROW_SLOP_PX = 10
/**
 * HOW FAR A ROW MUST GO: 40% OF ITS WIDTH, OR A FAST FLICK
 * (Plans/time-log-phone.md 4.4, 2026-11-14). Toggl's three quarters [SRC]
 * meant dragging a thumb almost across a phone; the owner found it hard.
 */
export const SWIPE_FRACTION = 0.4
/** A flick: this fast (px per millisecond) and at least this far acts, short of 40% */
export const FLICK_SPEED = 0.6
export const FLICK_MIN_PX = 48

export type SwipeAxis = "x" | "y" | null
export type SwipeAction = "continue" | "delete" | null

/**
 * Which way a finger is going, decided once it has moved past the slop:
 * sideways only when clearly more sideways than up or down, so a scroll that
 * wobbles never drags a row.
 */
export function swipeAxis(dx: number, dy: number): SwipeAxis {
  if (Math.hypot(dx, dy) < ROW_SLOP_PX) return null
  return Math.abs(dx) > 1.5 * Math.abs(dy) ? "x" : "y"
}

/** What letting go does: right past 40% (or a flick) continues, left deletes, anything less springs back */
export function swipeAction(dx: number, width: number, msTaken = Infinity): SwipeAction {
  if (width <= 0) return null
  const flick = Math.abs(dx) >= FLICK_MIN_PX && msTaken > 0 && Math.abs(dx) / msTaken >= FLICK_SPEED
  if (dx >= SWIPE_FRACTION * width || (flick && dx > 0)) return "continue"
  if (dx <= -SWIPE_FRACTION * width || (flick && dx < 0)) return "delete"
  return null
}

/** Has the drag passed the line where letting go acts: the label fills in (4.4) */
export function swipeArmed(dx: number, width: number): boolean {
  return width > 0 && Math.abs(dx) >= SWIPE_FRACTION * width
}

/**
 * The rows the list shows: each with its entries that have begun and stopped.
 * A row left with none is not shown — a group whose only live member runs
 * shows nothing until it stops; one left with some is shown with those.
 */
export function listedRows(group: DayGroup, nowSec: number): EntryRow[] {
  return group.rows.flatMap((row) => {
    const shown = row.entries.filter((entry) => !isPlanned(entry, nowSec) && !isRunning(entry))
    if (shown.length === 0) return []
    if (shown.length === row.entries.length) return [row]
    return [{ ...row, entries: shown, grouped: shown.length > 1, totalSeconds: shown.reduce((sum, entry) => sum + entrySeconds(entry, nowSec), 0) }]
  })
}
