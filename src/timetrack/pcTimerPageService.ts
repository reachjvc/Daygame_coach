/**
 * THE PC TIMER PAGE'S OWN NUMBERS AND WORDS (Phase 5 of Plans/toggl-parity.md).
 *
 * On a PC the Timer page has a row under the timer bar, as Toggl Track's web
 * app does: "‹ This week · W45 ›", the week's total, and a "Calendar | List
 * view" switch (D-PC-SHELL). The list and the calendar both show the week the
 * row names; ‹ and › step it a week at a time. Pure functions, so the screen
 * only draws them.
 *
 * The switch is remembered per browser, not per account: it is about this
 * screen, like the calendar's zoom. List view is the default here, unlike
 * Toggl, because the owner edits most entries in lists (D-PC-SHELL).
 */

import { TIMER_VIEW_KEY } from "./config"
import { addDays, dateKeyToDate, weekStartOf } from "./timetrackFormatService"
import type { IsoDate, WeekStart } from "./types"

export type TimerView = "list" | "calendar"

/** The first and last day of the week holding `anchor`, by the person's first day of the week */
export function weekOf(anchor: IsoDate, weekStart: WeekStart): { from: IsoDate; to: IsoDate } {
  const from = weekStartOf(anchor, weekStart)
  return { from, to: addDays(from, 6) }
}

/**
 * The ISO week number Toggl shows beside the range ("W45").
 *
 * An ISO week is the one its Thursday is in. A week that starts on another day
 * is numbered by its fourth day, which is the Thursday of a Monday week and the
 * Wednesday of a Sunday one: the same number the ISO week holding most of it has.
 */
export function weekNumber(anchor: IsoDate, weekStart: WeekStart): number {
  const middle = dateKeyToDate(addDays(weekStartOf(anchor, weekStart), 3))
  // the Thursday of the ISO week holding `middle`
  const thursday = new Date(middle.getFullYear(), middle.getMonth(), middle.getDate() + 3 - ((middle.getDay() + 6) % 7))
  // week 1 is the one whose Thursday is among the first seven days of the year
  const dayOfYear = Math.round((thursday.getTime() - new Date(thursday.getFullYear(), 0, 1).getTime()) / 86_400_000)
  return 1 + Math.floor(dayOfYear / 7)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/**
 * What the row calls the week: Toggl's "This week" and "Last week", and the
 * dates for any other ("26 Oct – 1 Nov").
 */
export function weekLabel(anchor: IsoDate, todayKey: IsoDate, weekStart: WeekStart): string {
  const { from, to } = weekOf(anchor, weekStart)
  const thisWeek = weekStartOf(todayKey, weekStart)
  if (from === thisWeek) return "This week"
  if (from === addDays(thisWeek, -7)) return "Last week"
  const a = dateKeyToDate(from)
  const b = dateKeyToDate(to)
  const left = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${MONTHS[a.getMonth()]}`
  const year = b.getFullYear() === dateKeyToDate(todayKey).getFullYear() ? "" : ` ${b.getFullYear()}`
  return `${left} – ${b.getDate()} ${MONTHS[b.getMonth()]}${year}`
}

/** The anchor one week earlier (-1) or later (+1) */
export function stepWeek(anchor: IsoDate, direction: -1 | 1): IsoDate {
  return addDays(anchor, direction * 7)
}

/** The view this browser chose last time; List view when it chose nothing or cannot say */
export function readTimerView(): TimerView {
  try {
    return window.localStorage.getItem(TIMER_VIEW_KEY) === "calendar" ? "calendar" : "list"
  } catch {
    return "list"
  }
}

export function keepTimerView(view: TimerView): void {
  try {
    if (view === "list") window.localStorage.removeItem(TIMER_VIEW_KEY)
    else window.localStorage.setItem(TIMER_VIEW_KEY, view)
  } catch {
    // storage blocked: the page opens on List view next time, as it always did
  }
}
