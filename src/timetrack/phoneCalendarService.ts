/**
 * THE PHONE CALENDAR'S RULES, AS DATA (Plans/toggl-parity.md Phase 4,
 * D-PHONE-CAL).
 *
 * Toggl's Android calendar [V1 2:14; H25 #21; SRC]: a day line "WEDNESDAY,
 * DEC 10" with the day's total, a week strip, the hour grid. A held finger on
 * empty space makes a 30-minute block — or, inside a gap of two hours or less
 * between two entries, one that fills the gap [SRC `CalendarViewModel`]. A
 * dragged edge lands on a quarter hour or on a neighbour's edge, whichever is
 * closer. Touching neighbours still move together (D-NEIGHBOURS).
 *
 * A NEIGHBOUR'S EDGE IS ITS OWN INSTANT, SECONDS INCLUDED. The grid counts in
 * minutes and writes whole minutes (`isoAtMinutes`), so an edge put "on" a
 * neighbour ending at 10:20:40 was written as 10:21 — and the list then marked
 * an overlap of 20 seconds, the very thing D-NEIGHBOURS is there to prevent.
 * So a snap to an edge carries the neighbour's instant (`at`), and that
 * instant is what is written.
 */

import { entriesForDay, entryInterval, type BlockDragPatch, type GrabMode } from "./calendarService"
import { CALENDAR_SNAP_MINUTES } from "./config"
import { addDays, dateKey, dateKeyToDate, isoAtMinutes, weekStartOf } from "./timetrackFormatService"
import type { Id, IsoDate, IsoDateTime, TimeEntry, WeekStart } from "./types"

export const QUARTER = 15
export const HELD_BLOCK_MINUTES = 30
export const FILLED_GAP_MINUTES = 120
const DAY_MINUTES = 24 * 60
/** the shortest a drag leaves an entry, as `blockDragPatch` has it: one snap step */
const SHORTEST_MS = CALENDAR_SNAP_MINUTES * 60_000

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "WEDNESDAY, DEC 10" (upper-cased by the page) */
export function dayLine(day: IsoDate): string {
  const d = dateKeyToDate(day)
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** The seven days of the week holding `day`, from the person's first day of the week */
export function weekStrip(day: IsoDate, weekStart: WeekStart): { day: IsoDate; letter: string; date: number }[] {
  const start = weekStartOf(day, weekStart)
  return Array.from({ length: 7 }, (_, offset) => {
    const each = addDays(start, offset)
    const d = dateKeyToDate(each)
    return { day: each, letter: WEEKDAYS[d.getDay()][0], date: d.getDate() }
  })
}

/** Where a dragged edge lands: minutes of the day, and the exact instant when it is a neighbour's edge */
export interface Landing {
  minutes: number
  at: IsoDateTime | null
}

/** An entry's span on a day, in minutes, with the instants its own edges are on that day (null: midnight, or now) */
export interface DaySpan {
  startMin: number
  endMin: number
  start: IsoDateTime | null
  end: IsoDateTime | null
}

/** Each entry's span on `day`, with its own instants where its edges are on that day */
export function spansOfDay(entries: TimeEntry[], day: IsoDate, nowSec: number, except: Id | null = null): DaySpan[] {
  return entriesForDay(entries, day, nowSec)
    .filter((entry) => entry.id !== except)
    .map((entry) => {
      const interval = entryInterval(entry, day, nowSec)
      // an edge on another day is this day's midnight, not the entry's own instant
      const ownStart = dateKey(entry.start) === day ? entry.start : null
      const ownEnd = entry.stop !== null && dateKey(entry.stop) === day ? entry.stop : null
      return { startMin: interval.startMin, endMin: interval.endMin, start: ownStart, end: ownEnd }
    })
}

/** The edges a dragged edge can snap to: every other entry's start and end on that day, with their instants */
export function edgesOfDay(entries: TimeEntry[], day: IsoDate, nowSec: number, except: Id | null): Landing[] {
  return spansOfDay(entries, day, nowSec, except).flatMap((span) => [
    { minutes: span.startMin, at: span.start },
    { minutes: span.endMin, at: span.end },
  ])
}

/** A quarter hour or a neighbour's edge, whichever is closer to where the finger is; inside the day */
export function snapToQuarterOrEdge(minutes: number, edges: Landing[]): Landing {
  const clamped = Math.min(DAY_MINUTES, Math.max(0, minutes))
  let best: Landing = { minutes: Math.min(DAY_MINUTES, Math.round(clamped / QUARTER) * QUARTER), at: null }
  for (const edge of edges) if (Math.abs(edge.minutes - clamped) < Math.abs(best.minutes - clamped)) best = edge
  return best
}

/**
 * The block a still hold on empty space makes: the gap it is in when that gap
 * is two hours or less between two entries — to their own instants, seconds
 * included — otherwise 30 minutes from the quarter hour under the finger, cut
 * short exactly where the next entry begins.
 */
export function heldBlock(
  spans: DaySpan[],
  minute: number,
): { from: number; to: number; fromAt: IsoDateTime | null; toAt: IsoDateTime | null } {
  const earlier = spans.filter((s) => s.endMin <= minute).sort((a, b) => b.endMin - a.endMin)[0]
  const later = spans.filter((s) => s.startMin >= minute).sort((a, b) => a.startMin - b.startMin)[0]
  if (earlier && later && later.startMin - earlier.endMin > 0 && later.startMin - earlier.endMin <= FILLED_GAP_MINUTES) {
    return { from: earlier.endMin, to: later.startMin, fromAt: earlier.end, toAt: later.start }
  }
  const from = Math.min(DAY_MINUTES - QUARTER, Math.floor(minute / QUARTER) * QUARTER)
  const cut = later && later.startMin > from && later.startMin < from + HELD_BLOCK_MINUTES
  const to = cut ? later.startMin : Math.min(DAY_MINUTES, from + HELD_BLOCK_MINUTES)
  return { from, to, fromAt: null, toAt: cut ? later.start : null }
}

/**
 * A dragged block's new times, with the moving edge put on the instant it
 * landed on (a neighbour's own, or the quarter hour's): a resized edge exactly
 * there, a moved block with its top exactly there and its length kept to the
 * millisecond.
 *
 * INSIDE `blockDragPatch`'S RULES. `rules` is what `blockDragPatch` wrote for
 * the same drag, and null (nothing to write) stays null. Its clamps stay too:
 * a top dragged past the bottom stops at the shortest block, a moved block's
 * top stays on the day it is drawn on, and a night shift moved by its
 * second-day half moves whole, its first half kept — the top that landed is
 * the drawn one, midnight, not the entry's start (code review of 47e97f0c:
 * the instant used to go straight in, and 22:00–02:00 dragged an hour down on
 * day two was written 01:00–05:00 on day two).
 */
export function landOnEdge(
  entry: TimeEntry,
  day: IsoDate,
  mode: GrabMode,
  at: IsoDateTime,
  rules: BlockDragPatch | null,
  nowIso: IsoDateTime,
): BlockDragPatch | null {
  if (rules === null) return null
  const atMs = Date.parse(at)
  const startMs = Date.parse(entry.start)
  const endMs = Date.parse(entry.stop ?? nowIso)
  if (mode === "resize-start") {
    const start = Math.min(atMs, endMs - SHORTEST_MS)
    return start === startMs ? null : { start: new Date(start).toISOString() }
  }
  if (mode === "resize-end") {
    const stop = Math.max(atMs, startMs + SHORTEST_MS)
    return entry.stop && stop === endMs ? null : { stop: new Date(stop).toISOString() }
  }
  // the top as drawn on this day: the entry's start, or midnight for a night's second half
  const topMs = dateKey(entry.start) === day ? startMs : Date.parse(isoAtMinutes(day, 0))
  const lastTopMs = Date.parse(isoAtMinutes(day, DAY_MINUTES - CALENDAR_SNAP_MINUTES))
  // a top past the day's last step, or above its midnight: `blockDragPatch`'s clamp has it
  if (atMs < Date.parse(isoAtMinutes(day, 0)) || atMs > lastTopMs) return rules
  const shift = atMs - topMs
  if (shift === 0) return null
  const start = startMs + shift
  return { start: new Date(start).toISOString(), stop: entry.stop ? new Date(Date.parse(entry.stop) + shift).toISOString() : null }
}
