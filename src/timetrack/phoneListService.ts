/**
 * THE PHONE LIST'S RULES, AS DATA (Plans/toggl-parity.md Phase 3, D-SWIPE,
 * D-PLANNED).
 *
 * Swipe a row right to continue it, left to delete it, as Toggl's Android
 * list does [H25 #04; SRC `MainRecyclerViewTouchCallback`]: the row follows the
 * finger and acts only past 75% of its width, so a half swipe is nothing. A
 * finger that sets off up or down is a scroll and the row never moves.
 *
 * Planned entries — ones that have not begun — are in the calendar and not in
 * the list until they start, as Toggl's future entries are [HELP]. The day
 * still says how much is planned beside its total.
 */

import { isPlanned } from "./timetrackService"
import type { DayGroup, EntryRow } from "./types"

/** How far a finger may drift before it is going somewhere */
export const ROW_SLOP_PX = 10
/** Toggl's threshold: three quarters of the row's width [SRC] */
export const SWIPE_FRACTION = 0.75

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

/** What letting go does: right past 75% continues, left past 75% deletes, anything less springs back */
export function swipeAction(dx: number, width: number): SwipeAction {
  if (width <= 0) return null
  if (dx >= SWIPE_FRACTION * width) return "continue"
  if (dx <= -SWIPE_FRACTION * width) return "delete"
  return null
}

/** A row the list shows: not one whose every entry has yet to begin (D-PLANNED) */
export function listedRows(group: DayGroup, nowSec: number): EntryRow[] {
  return group.rows.filter((row) => row.entries.some((entry) => !isPlanned(entry, nowSec)))
}
