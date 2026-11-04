/**
 * Time-tracking slice — the drums (Phase 5 of Plans/time-tracker-like-toggl.md).
 *
 * The owner picked scrolling drums, [day][hour][minute], like an alarm clock,
 * and asked what happens across days (Q1 and its 11 scenarios). A drum shows a
 * wall clock — "Yesterday · 22 · 30" — and an entry stores an instant, so this
 * file is the step between the two, and the readings the drums show under
 * themselves: the length, "ends next day", "Ends before it starts" and its
 * one-tap mend.
 *
 * THE ZONE is the one the page draws in, through the `Date` local getters, like
 * every other time in the sheet (`formatTimeOfDay`, `parseEndTimeInput`). Two
 * nights a year that clock is not a straight line, and the drums say so rather
 * than guess:
 *   - when the clocks go forward (last Sunday of March, 02:00 → 03:00) the hour
 *     that never happens is greyed and refused — `new Date` would quietly turn
 *     02:30 into 03:30, a time nobody picked;
 *   - when they go back (last Sunday of October, 03:00 → 02:00) 02:30 happens
 *     twice, and the drums keep to the one you are in: turning the minute
 *     never jumps an hour, and coming down from 03:10 lands in the second
 *     02:00, the way the clock on the wall did that night.
 *
 * Pure: an explicit `now` in, values out. The drums set whole minutes
 * (scenario 10); a time to the second is still typed in the box beside them.
 */

import { addDays, dateKey, dateKeyToDate, daysBetween, formatDuration, pad2, parseDurationInput, parseEndTimeInput, parseStartTimeInput } from "./timetrackFormatService"
import { LONG_ENTRY_SECONDS } from "./timetrackFormatService"
import type { DurationFormat, IsoDate, IsoDateTime, TimeFormat } from "./types"

/** What three drums show: a day and a time on the wall clock, 24-hour */
export interface DrumParts {
  day: IsoDate
  hour: number
  minute: number
}

/** Where a moment may fall; null is no limit that way */
export interface DrumBounds {
  earliest: IsoDateTime | null
  latest: IsoDateTime | null
}

/** The day drum runs this far each way from today (scenario 4); older days use the date box */
export const DAYS_EACH_WAY = 14

const HOUR_MS = 3_600_000

/**
 * MILLISECONDS, NOT SECONDS, for every comparison here. A timer started by a
 * tap carries milliseconds and the drums set whole minutes, so a comparison
 * that floors to the second calls 09:00:00.000 "not before" a start at
 * 09:00:00.500 — and that end is stored before its start.
 */
const ms = (iso: IsoDateTime) => Date.parse(iso)
const isoAt = (at: number) => new Date(at).toISOString()
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// ---------------------------------------------------------------------------
// A drum value to a time, and back
// ---------------------------------------------------------------------------

/** The wall clock of a moment, as the page draws it */
export function partsOf(iso: IsoDateTime): DrumParts {
  const d = new Date(iso)
  return { day: dateKey(d), hour: d.getHours(), minute: d.getMinutes() }
}

/**
 * Every moment whose wall clock reads `parts`, earliest first: one on an
 * ordinary day, none in the hour the clocks skip, two in the hour they repeat.
 *
 * `new Date(y, m, d, h, min)` gives one answer for all three, and two of them
 * are wrong for a drum: for a skipped time it moves forward by the gap, and for
 * a repeated one it picks the first. So the moments an hour either side are
 * tried as well, and kept when they read the same.
 */
export function instantsAt(parts: DrumParts): IsoDateTime[] {
  const [y, m, d] = parts.day.split("-").map(Number)
  const guess = new Date(y, m - 1, d, parts.hour, parts.minute, 0, 0).getTime()
  const found: number[] = []
  for (const candidate of [guess - HOUR_MS, guess, guess + HOUR_MS]) {
    const at = new Date(candidate)
    if (dateKey(at) === parts.day && at.getHours() === parts.hour && at.getMinutes() === parts.minute) found.push(candidate)
  }
  return found.map((ms) => new Date(ms).toISOString())
}

/**
 * The moment the drums show, or null when that time does not happen that day.
 * In a repeated hour, the one nearest `near` — the moment the drums were at
 * before this turn — so a drum never jumps an hour the person did not turn.
 */
export function momentOf(parts: DrumParts, near: IsoDateTime | null = null): IsoDateTime | null {
  const all = instantsAt(parts)
  if (all.length <= 1 || near === null) return all[0] ?? null
  const from = ms(near)
  return all.reduce((best, at) => (Math.abs(ms(at) - from) < Math.abs(ms(best) - from) ? at : best))
}

/** In the hour the clocks repeat, which time round this is; null on any other hour */
export function repeatedHour(iso: IsoDateTime): "first" | "second" | null {
  const all = instantsAt(partsOf(iso))
  if (all.length < 2) return null
  const minuteOf = (at: IsoDateTime) => Math.floor(ms(at) / 60_000)
  return minuteOf(iso) === minuteOf(all[0]) ? "first" : "second"
}

/** Whether `hour` happens at all on `day`: not the one skipped when the clocks go forward */
export function hourExists(day: IsoDate, hour: number): boolean {
  return instantsAt({ day, hour, minute: 0 }).length > 0 || instantsAt({ day, hour, minute: 59 }).length > 0
}

/** The ends of a stretch of wall clock, in epoch ms: the first instant it begins, the last it ends */
function stretch(day: IsoDate, fromHour: number, toHour: number): { first: number; last: number } | null {
  let first: number | null = null
  let last: number | null = null
  for (let hour = fromHour; hour <= toHour; hour++) {
    const starts = instantsAt({ day, hour, minute: 0 })
    const ends = instantsAt({ day, hour, minute: 59 })
    if (first === null && starts.length > 0) first = ms(starts[0])
    if (ends.length > 0) last = ms(ends[ends.length - 1]) + 59_999
  }
  return first === null || last === null ? null : { first, last }
}

/** True when nothing in [first, last] (epoch ms) is inside the bounds */
function outside(first: number, last: number, bounds: DrumBounds): boolean {
  if (bounds.latest !== null && first > ms(bounds.latest)) return true
  if (bounds.earliest !== null && last < ms(bounds.earliest)) return true
  return false
}

export function clampToBounds(iso: IsoDateTime, bounds: DrumBounds): IsoDateTime {
  if (bounds.latest !== null && ms(iso) > ms(bounds.latest)) return bounds.latest
  if (bounds.earliest !== null && ms(iso) < ms(bounds.earliest)) return bounds.earliest
  return iso
}

/**
 * One drum turned: the moment with that part changed, the others kept.
 *
 * Whole minutes, so the seconds of the moment it started from are dropped. A
 * time the clocks skip is null — refused, and the drum goes back. A time past
 * a limit lands on the limit: hour 14 with the minute at 45 and now 14:30 is
 * now, not a refusal, because 14 was a fair thing to turn to.
 */
export function moveDrum(value: IsoDateTime, change: Partial<DrumParts>, bounds: DrumBounds): IsoDateTime | null {
  const at = momentOf({ ...partsOf(value), ...change }, value)
  return at === null ? null : clampToBounds(at, bounds)
}

/** Why a turn was refused or held at a limit, for the words beside the drums */
export type DrumRefusal = "after" | "before" | "skipped"

/**
 * Why turning a drum this way is refused — after the latest moment, before
 * the earliest, or a time the clocks skip — or null when it is not. A time
 * inside the limit's own minute is no refusal: 09:00 on a timer begun at
 * 09:00:40 is that start, to the millisecond, not a mistake to point at.
 * `moveDrum` still lands an allowed drum on the limit; this is what the screen
 * says when it does, or when a greyed item is refused outright.
 */
export function refusalOf(value: IsoDateTime, change: Partial<DrumParts>, bounds: DrumBounds): DrumRefusal | null {
  const at = momentOf({ ...partsOf(value), ...change }, value)
  if (at === null) return "skipped"
  const minute = (iso: IsoDateTime) => Math.floor(ms(iso) / 60_000)
  if (bounds.latest !== null && minute(at) > minute(bounds.latest)) return "after"
  if (bounds.earliest !== null && minute(at) < minute(bounds.earliest)) return "before"
  return null
}

// ---------------------------------------------------------------------------
// What each drum offers, and what it greys
// ---------------------------------------------------------------------------

/** Today, 14 days back and 14 ahead — and the entry's own day, when it is older or further than that */
export function dayChoices(todayKey: IsoDate, valueDay: IsoDate): IsoDate[] {
  const days: IsoDate[] = []
  for (let offset = -DAYS_EACH_WAY; offset <= DAYS_EACH_WAY; offset++) days.push(addDays(todayKey, offset))
  if (valueDay < days[0]) days.unshift(valueDay)
  else if (valueDay > days[days.length - 1]) days.push(valueDay)
  return days
}

/** "Yesterday", "Today", "Tomorrow", then "Fri 30 Oct" — and the year when it is not this one */
export function dayLabel(day: IsoDate, todayKey: IsoDate): string {
  const offset = daysBetween(todayKey, day)
  if (offset === 0) return "Today"
  if (offset === -1) return "Yesterday"
  if (offset === 1) return "Tomorrow"
  const d = dateKeyToDate(day)
  const label = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === dateKeyToDate(todayKey).getFullYear() ? label : `${label} ${d.getFullYear()}`
}

/** The hour drum's labels: 00 … 23, or 12, 1 … 11 beside an AM/PM drum */
export function hourLabels(format: TimeFormat): string[] {
  if (format === "h12") return Array.from({ length: 12 }, (_, index) => String(index === 0 ? 12 : index))
  return Array.from({ length: 24 }, (_, hour) => pad2(hour))
}

export const MINUTE_LABELS: string[] = Array.from({ length: 60 }, (_, minute) => pad2(minute))

/** A 24-hour hour as the 12-hour drums show it: the hour drum's place (12 is the first) and the half */
export function toTwelve(hour: number): { index: number; pm: boolean } {
  return { index: hour % 12, pm: hour >= 12 }
}

export function fromTwelve(index: number, pm: boolean): number {
  return (index % 12) + (pm ? 12 : 0)
}

/** A day is greyed when none of it is inside the bounds */
export function dayRefused(day: IsoDate, bounds: DrumBounds): boolean {
  const span = stretch(day, 0, 23)
  return span === null || outside(span.first, span.last, bounds)
}

/** An hour is greyed when it does not happen that day, or none of it is inside the bounds */
export function hourRefused(day: IsoDate, hour: number, bounds: DrumBounds): boolean {
  if (!hourExists(day, hour)) return true
  const span = stretch(day, hour, hour)
  return span === null || outside(span.first, span.last, bounds)
}

/** AM or PM is greyed when none of that half of the day is inside the bounds */
export function halfRefused(day: IsoDate, pm: boolean, bounds: DrumBounds): boolean {
  const span = pm ? stretch(day, 12, 23) : stretch(day, 0, 11)
  return span === null || outside(span.first, span.last, bounds)
}

/** A minute is greyed when it does not happen, or none of its sixty seconds is inside the bounds */
export function minuteRefused(parts: DrumParts, bounds: DrumBounds): boolean {
  const all = instantsAt(parts)
  if (all.length === 0) return true
  return outside(ms(all[0]), ms(all[all.length - 1]) + 59_999, bounds)
}

// ---------------------------------------------------------------------------
// What the drums say under themselves
// ---------------------------------------------------------------------------

export interface PairReading {
  /** stop − start; below zero when it ends before it starts */
  seconds: number
  /** calendar days from the start's day to the end's: 1 is "ends next day" */
  laterDays: number
  endsBeforeStart: boolean
  /** it starts after now: striped, and in no total until it starts (Q2) */
  planned: boolean
  /** longer than 12 hours, which D10 asks about before it is written */
  long: boolean
}

export function readPair(start: IsoDateTime, stop: IsoDateTime, nowIso: IsoDateTime): PairReading {
  const length = ms(stop) - ms(start)
  const seconds = Math.trunc(length / 1000)
  return {
    seconds,
    laterDays: daysBetween(dateKey(start), dateKey(stop)),
    endsBeforeStart: length < 0,
    planned: ms(start) > ms(nowIso),
    long: seconds > LONG_ENTRY_SECONDS,
  }
}

/** "2:45 · ends next day", "1:30 · planned", or "Ends before it starts" */
export function lengthLine(reading: PairReading, format: DurationFormat): string {
  if (reading.endsBeforeStart) return "Ends before it starts"
  const parts = [formatDuration(reading.seconds, format)]
  if (reading.laterDays === 1) parts.push("ends next day")
  if (reading.laterDays > 1) parts.push(`ends ${reading.laterDays} days later`)
  if (reading.planned) parts.push("planned")
  return parts.join(" · ")
}

/**
 * THE ONE-TAP MEND FOR AN END BEFORE ITS START (scenario 6).
 *
 * The end's clock time, on the first day it falls after the start: 14:00 →
 * 13:00 becomes 13:00 the next day. It is offered, never done: the day drums
 * are explicit, so an end set before its start is a mistake to point at, and
 * rolling it to tomorrow behind the person's back would turn a slip of the
 * thumb into a 23-hour entry. An end left on an earlier day at a later clock
 * time mends to the start's own day, and the button says which.
 */
export function mendEnd(start: IsoDateTime, stop: IsoDateTime): { stop: IsoDateTime; label: string } | null {
  if (ms(stop) >= ms(start)) return null
  const { hour, minute } = partsOf(stop)
  const startDay = dateKey(start)
  for (const day of [startDay, addDays(startDay, 1), addDays(startDay, 2)]) {
    const at = momentOf({ day, hour, minute }, start)
    if (at !== null && ms(at) >= ms(start)) {
      return { stop: at, label: day === startDay ? "End same day" : "End next day" }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// The sheet's other controls, on a pair the drums have not saved yet
// ---------------------------------------------------------------------------

/** A start and an end being set together; a null end is a running timer */
export interface TimePair {
  start: IsoDateTime
  stop: IsoDateTime | null
}

export function samePair(a: TimePair, b: TimePair): boolean {
  return a.start === b.start && a.stop === b.stop
}

/**
 * A box typed into while the drums hold an unsaved pair: read against THAT
 * pair, by the rules the boxes use on a saved entry — an end is the first such
 * time after the start (`parseEndTimeInput`), a duration moves the end, a day
 * moves both ends and keeps the length. Null when it cannot be read.
 */
export function typedIntoPair(
  pair: TimePair,
  field: "start" | "stop" | "duration" | "day",
  text: string,
  nowIso: IsoDateTime,
): TimePair | null {
  const end = pair.stop ?? nowIso
  if (field === "start") {
    const start = parseStartTimeInput(text, pair.start, end)
    return start ? { ...pair, start } : null
  }
  if (field === "stop") {
    const stop = parseEndTimeInput(text, pair.start)
    return stop ? { ...pair, stop } : null
  }
  if (field === "duration") {
    const seconds = parseDurationInput(text)
    if (seconds === null) return null
    if (pair.stop === null) return { ...pair, start: isoAt(ms(nowIso) - seconds * 1000) }
    return { ...pair, stop: isoAt(ms(pair.start) + seconds * 1000) }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null
  // whole days on the wall clock, like `moveEntryToDay`: 09:00 stays 09:00 across a clock change
  const moved = new Date(pair.start)
  moved.setDate(moved.getDate() + daysBetween(dateKey(pair.start), text))
  const start = moved.toISOString()
  if (pair.stop === null) return { start, stop: null }
  return { start, stop: isoAt(ms(start) + ms(pair.stop) - ms(pair.start)) }
}

/** ±5 on one end of the unsaved pair */
export function nudgePair(pair: TimePair, edge: "start" | "stop", seconds: number): TimePair {
  if (edge === "start") return { ...pair, start: isoAt(ms(pair.start) + seconds * 1000) }
  if (pair.stop === null) return pair
  return { ...pair, stop: isoAt(ms(pair.stop) + seconds * 1000) }
}
