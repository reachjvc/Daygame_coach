/**
 * Time-tracking slice — formatting & parsing.
 * Duration formats, time/date formats, duration & time input parsing, rounding.
 * All functions are pure; callers pass an explicit `now` where time matters.
 */

import type {
  DateFormatId,
  DurationFormat,
  IsoDate,
  IsoDateTime,
  RoundingConfig,
  TimeFormat,
  WeekStart,
} from "./types"

// ---------------------------------------------------------------------------
// Epoch / date helpers (local timezone, matching what the user sees)
// ---------------------------------------------------------------------------

export function epochSeconds(iso: IsoDateTime | Date): number {
  const ms = iso instanceof Date ? iso.getTime() : new Date(iso).getTime()
  return Math.floor(ms / 1000)
}

/**
 * The exact moment, to the millisecond. For ORDER — is this end before that
 * start? — and for building one time from another.
 *
 * Starts are stamped to the millisecond (`serverNowIso`), so whole seconds are
 * too coarse to compare them by: `epochSeconds` rounds both down, and an end
 * 640 ms before its start compared equal. Built from a start rounded down, a
 * zero-length end landed up to 999 ms before the start — a row the database
 * refuses (`timetrack_entries_stop_after_start`). Lengths stay in seconds.
 */
export function epochMillis(iso: IsoDateTime | Date): number {
  return iso instanceof Date ? iso.getTime() : new Date(iso).getTime()
}

export function isoFromEpochSeconds(seconds: number): IsoDateTime {
  return new Date(seconds * 1000).toISOString()
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/**
 * Local YYYY-MM-DD for an ISO instant (not UTC — day buckets must match the UI).
 *
 * IT REFUSES TO INVENT ONE. Given an unparseable date this returned the string
 * `"NaN-NaN-NaN"`, which looks like a date key, satisfies every `string` type on the
 * way down, and reaches a Postgres `date` column. It was reachable by clearing the
 * week field on the approvals card: an empty `<input type="date">` fires `change`
 * with `""`, `weekStartOf("")` built `new Date(NaN, NaN, NaN)`, and the card then
 * showed every member at 0:00 while Submit wrote `week_start: "NaN-NaN-NaN"` into
 * `timetrack_approvals` — table 13 of 19, so the refusal would take webhooks, the
 * webhook log, autotracker rules, the timeline, calendars and settings down with it.
 *
 * A caller reaching here with an invalid date has a bug, and this project's rule is
 * that such a thing fails loudly rather than passing something shaped like an answer.
 *
 * THAT DEPENDS ON EVERY DATE INPUT GUARDING ITS OWN EMPTY VALUE, AND WHEN THIS THROW
 * WAS ADDED ONLY ONE OF THEM DID. The comment here claimed "user input is checked at
 * its own edge — see the approvals card", which was true of that card and of nothing
 * else: clearing either date box on the Reports screen and clicking the ‹ or › arrow
 * reached this line, and because a throw inside a click handler goes to
 * `window.onerror` rather than to React, the arrow simply did nothing, silently. The
 * fix before that was worse — it moved the range to "NaN-NaN-NaN" — but it was at
 * least visible in the label.
 *
 * THAT PARAGRAPH THEN CLAIMED A TEST THAT DID NOT EXIST. It said the premise was
 * "enforced rather than asserted" by a file at
 * `tests/unit/architecture/aDateInputCannotSendNothing.test.ts`, and the only
 * occurrence of that name anywhere in the repository was the sentence claiming it. A
 * false claim of coverage is worse than none, because it stops the next person
 * looking — which is the failure this project has written down more times than any
 * other, committed here in the act of closing it.
 *
 * That file was written afterwards and has since been removed. The premise needs two
 * things, not one: every `type="date"` in the slice deals with an empty value, AND every
 * writer of a report's date range produces keys that parse. The live bug was not at an
 * input — `decodeReportConfig` cast any JSON to a `ReportConfig`, so a share link could
 * put empty strings in the range and the ‹ › arrows reached this throw inside a click
 * handler, where it goes to `window.onerror` and the button simply does nothing.
 */
export function dateKey(iso: IsoDateTime | Date): IsoDate {
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) {
    /**
     * Named, not stringified. `JSON.stringify(new Date(NaN))` is the four characters
     * `null`, so the loudest error in this slice could not say what it was handed for
     * any `Date` argument at all.
     */
    const given = iso instanceof Date ? "an Invalid Date" : JSON.stringify(iso)
    throw new Error(`dateKey was given something that is not a date: ${given}`)
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function dateKeyToDate(key: IsoDate): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function addDays(key: IsoDate, days: number): IsoDate {
  const d = dateKeyToDate(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms = dateKeyToDate(b).getTime() - dateKeyToDate(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = []
  const total = daysBetween(start, end)
  for (let i = 0; i <= total; i++) out.push(addDays(start, i))
  return out
}

/** Start of the week containing `key`, honouring the user's first-day-of-week */
export function weekStartOf(key: IsoDate, weekStart: WeekStart): IsoDate {
  const d = dateKeyToDate(key)
  const diff = (d.getDay() - weekStart + 7) % 7
  return addDays(key, -diff)
}

export function monthStartOf(key: IsoDate): IsoDate {
  const [y, m] = key.split("-").map(Number)
  return `${y}-${pad2(m)}-01`
}

export function startOfDayIso(key: IsoDate): IsoDateTime {
  return dateKeyToDate(key).toISOString()
}

export function endOfDayIso(key: IsoDate): IsoDateTime {
  const d = dateKeyToDate(key)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

/** Minutes since local midnight */
export function minutesIntoDay(iso: IsoDateTime): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

export function isoAtMinutes(dayKey: IsoDate, minutes: number): IsoDateTime {
  const d = dateKeyToDate(dayKey)
  d.setMinutes(Math.round(minutes))
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Duration formatting
// ---------------------------------------------------------------------------

export function splitDuration(totalSeconds: number): { h: number; m: number; s: number; negative: boolean } {
  const negative = totalSeconds < 0
  const abs = Math.abs(Math.round(totalSeconds))
  return {
    h: Math.floor(abs / 3600),
    m: Math.floor((abs % 3600) / 60),
    s: abs % 60,
    negative,
  }
}

/** classic = 1:30:00 · improved = 1:30 · decimal = 1.50 */
export function formatDuration(totalSeconds: number, format: DurationFormat = "improved"): string {
  const { h, m, s, negative } = splitDuration(totalSeconds)
  const sign = negative ? "-" : ""
  if (format === "decimal") return `${sign}${(Math.abs(totalSeconds) / 3600).toFixed(2)}`
  if (format === "classic") return `${sign}${h}:${pad2(m)}:${pad2(s)}`
  return `${sign}${h}:${pad2(m)}`
}

/** Always H:MM:SS — used for the live running clock, where seconds must tick */
export function formatClock(totalSeconds: number): string {
  const { h, m, s, negative } = splitDuration(totalSeconds)
  return `${negative ? "-" : ""}${h}:${pad2(m)}:${pad2(s)}`
}

/**
 * Plain-language span for prompts: "45 seconds", "12 minutes", "1 hour 5 minutes".
 * The h:mm and decimal formats are for tracked time, not for short gaps.
 */
export function formatIdleSpan(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hourPart = `${hours} hour${hours === 1 ? "" : "s"}`
  return rest === 0 ? hourPart : `${hourPart} ${rest} minute${rest === 1 ? "" : "s"}`
}

/** Compact label for charts and totals, e.g. "3h 05m" / "12m" */
export function formatCompact(totalSeconds: number): string {
  const { h, m } = splitDuration(totalSeconds)
  if (h === 0) return `${m}m`
  return `${h}h ${pad2(m)}m`
}

export function formatDecimalHours(totalSeconds: number): string {
  return (totalSeconds / 3600).toFixed(2)
}

// ---------------------------------------------------------------------------
// Time / date formatting
// ---------------------------------------------------------------------------

export function formatTimeOfDay(iso: IsoDateTime, format: TimeFormat = "h24"): string {
  const d = new Date(iso)
  return formatWallClock(d.getHours(), d.getMinutes(), format)
}

/**
 * AN INSTANT, WRITTEN IN THE PERSON'S OWN CLOCK, WITH ITS OFFSET.
 *
 * `2026-08-11T00:30:00+02:00` rather than `2026-08-10T22:30:00.000Z`. Both name the
 * same moment, and a machine reading either gets it right — but a human reading the
 * second one, or a spreadsheet grouping a column of them by date, gets the previous
 * day for everything after 22:00.
 *
 * That is what the Detailed CSV exported while the screen beside it showed the local
 * date, and a monthly invoice is exactly somebody grouping that file by date. The
 * offset is included so the value stays an unambiguous instant: `importEntriesCsv`
 * parses this column back with `new Date(...)` and must not have to guess a zone.
 */
export function localIsoWithOffset(iso: IsoDateTime): string {
  const d = new Date(iso)
  const offsetMinutes = -d.getTimezoneOffset()
  const sign = offsetMinutes < 0 ? "-" : "+"
  const abs = Math.abs(offsetMinutes)
  const stamp =
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  return `${stamp}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

/**
 * A LABEL FOR AN HOUR OF THE DAY, WITH NO DATE INVOLVED.
 *
 * The calendar's hour ruler built a real `Date` for today and called
 * `setHours(hour, 0, 0, 0)`. On the spring-forward day 02:00 does not exist in a
 * zone that has one, so it landed on 03:00: measured in Europe/Copenhagen on
 * 2026-03-29, twenty-four rows carried twenty-three distinct labels, "02:00" was
 * missing and "03:00" appeared twice — and every label below it was one row out of
 * step with the block beside it. The ruler is built from `new Date()`, so it showed
 * that on the real clock-change day whatever week was on screen.
 *
 * An hour label is a number and a format. It does not need a day, and asking for one
 * is what let a day that is missing an hour break it. This is here rather than in the
 * component because a second copy of the 12-hour rule is exactly what put "1:30"
 * where "1:30 PM" belonged in the entry list and moved an afternoon entry back twelve
 * hours.
 */
export function formatHourOfDay(hour: number, format: TimeFormat = "h24"): string {
  return formatWallClock(hour, 0, format)
}

/** The one place the 12-hour rule is written down */
function formatWallClock(hours: number, minutes: number, format: TimeFormat): string {
  if (format === "h12") {
    const h = hours % 12 || 12
    const suffix = hours < 12 ? "AM" : "PM"
    return `${h}:${pad2(minutes)} ${suffix}`
  }
  return `${pad2(hours)}:${pad2(minutes)}`
}

export function formatDate(key: IsoDate, format: DateFormatId = "YYYY-MM-DD"): string {
  const [y, m, d] = key.split("-")
  switch (format) {
    case "DD.MM.YYYY":
      return `${d}.${m}.${y}`
    case "DD-MM-YYYY":
      return `${d}-${m}-${y}`
    case "MM/DD/YYYY":
      return `${m}/${d}/${y}`
    case "DD/MM/YYYY":
      return `${d}/${m}/${y}`
    default:
      return `${y}-${m}-${d}`
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "Today" / "Yesterday" / "Mon, 4 Aug" — the timer-list day header */
export function formatDayHeader(key: IsoDate, todayKey: IsoDate): string {
  if (key === todayKey) return "Today"
  if (key === addDays(todayKey, -1)) return "Yesterday"
  const d = dateKeyToDate(key)
  const sameYear = d.getFullYear() === dateKeyToDate(todayKey).getFullYear()
  const base = `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
  return sameYear ? base : `${base} ${d.getFullYear()}`
}

/**
 * When something happened, to finish a sentence: "at 09:12", "yesterday at
 * 09:12", "on Mon, 19 Oct at 09:12". A bare "09:12" on a timer started
 * yesterday reads as this morning, which is how a 16-hour timer hides.
 */
export function formatWhen(iso: IsoDateTime, format: TimeFormat, todayKey: IsoDate): string {
  const day = dateKey(iso)
  const time = formatTimeOfDay(iso, format)
  if (day === todayKey) return `at ${time}`
  if (day === addDays(todayKey, -1)) return `yesterday at ${time}`
  return `on ${formatDayHeader(day, todayKey)} at ${time}`
}

/**
 * Compact range for narrow controls: "24–30 Aug", "28 Aug – 3 Sep",
 * "28 Dec 2026 – 3 Jan 2027". The full, format-respecting dates stay on the
 * wider layouts; at 390px two of them truncate to "2026-08-24 – 202…".
 */
export function formatRangeShort(start: IsoDate, end: IsoDate): string {
  const a = dateKeyToDate(start)
  const b = dateKeyToDate(end)
  const sameYear = a.getFullYear() === b.getFullYear()
  const day = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`

  if (sameYear && a.getMonth() === b.getMonth()) {
    if (a.getDate() === b.getDate()) return `${day(a)}`
    return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
  }
  if (sameYear) return `${day(a)} – ${day(b)}`
  return `${day(a)} ${a.getFullYear()} – ${day(b)} ${b.getFullYear()}`
}

export function formatDayShort(key: IsoDate): string {
  const d = dateKeyToDate(key)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`
}

export function formatMonthLabel(key: IsoDate): string {
  const d = dateKeyToDate(key)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatRangeLabel(start: IsoDate, end: IsoDate, format: DateFormatId): string {
  if (start === end) return formatDate(start, format)
  return `${formatDate(start, format)} – ${formatDate(end, format)}`
}

/**
 * "1 project", not "1 projects".
 *
 * The workspace summary in Settings › Data counted eight things and got every
 * singular wrong. English plurals are irregular enough that the caller should
 * pass the plural when it is not just an "s".
 */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

export function formatMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100
  return `${currency} ${rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

/**
 * What a duration box teaches next to it (plan D11), and what it says when it
 * cannot read what was typed. One wording, every box.
 */
export const DURATION_HINT = "90 = 90 min · 1.30 = 1 h 30 · 1.5 = 1 h 30"
export const DURATION_UNREADABLE = "Could not read that duration — try 1:30, 1.30 or 90"

/**
 * Parse a duration the way Toggl's duration field does.
 * "1:30" → 5400 · "1:30:15" → 5415 · "1.5" / "1,5" → 5400 (decimal hours)
 * "1.30" / "1,30" → 5400 (two digits under 60 after the separator: hours and minutes)
 * "90" → 5400 (bare number = minutes) · "1h30m" / "45m" / "30s" → parsed units
 * "1h30" → 5400 · "5m30" → 330 (a bare number after the last unit is the next unit down)
 * Returns null when nothing sensible can be read.
 */
export function parseDurationInput(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/,/g, ".")
  if (!text) return null

  if (/^\d{1,3}:\d{1,2}(:\d{1,2})?$/.test(text)) {
    const parts = text.split(":").map(Number)
    const [h, m, s = 0] = parts
    if (m > 59 || s > 59) return null
    return h * 3600 + m * 60 + s
  }

  const unitMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(h|m|s)/g)]
  if (unitMatches.length > 0) {
    let seconds = 0
    for (const [, value, unit] of unitMatches) {
      const n = Number(value)
      seconds += unit === "h" ? n * 3600 : unit === "m" ? n * 60 : n
    }
    /**
     * "1h30" IS AN HOUR AND A HALF. The 30 has no unit of its own, and it was
     * read past and dropped: 1:00:00. A bare number after the last unit is the
     * next unit down — minutes after hours, seconds after minutes — which is
     * how a person writes it and how it is said aloud.
     */
    const last = unitMatches[unitMatches.length - 1]
    const trailing = /^\D*(\d+)$/.exec(text.slice((last.index ?? 0) + last[0].length))
    if (trailing && last[2] !== "s") seconds += Number(trailing[1]) * (last[2] === "h" ? 60 : 1)
    return Math.round(seconds)
  }

  /**
   * "1.30" AND "1,30" ARE AN HOUR AND A HALF. The phone opens the decimal pad
   * here (plan D11), which has no ":" key, and a Dane writes half past one as
   * 1.30. Both were read as 1.3 hours — 1:18 — and written without a word
   * (edits audit B7, 2026-11-04). Exactly two digits after the separator, under
   * 60, are minutes; one digit, or 60 and up, is still a decimal hour, so "1.5"
   * and "1.75" mean what they always did.
   */
  const hoursAndMinutes = /^(\d+)\.(\d{2})$/.exec(text)
  if (hoursAndMinutes && Number(hoursAndMinutes[2]) < 60) {
    return Number(hoursAndMinutes[1]) * 3600 + Number(hoursAndMinutes[2]) * 60
  }
  if (/^\d+\.\d+$/.test(text)) return Math.round(Number(text) * 3600)
  if (/^\d+$/.test(text)) return Number(text) * 60

  return null
}

/**
 * `YYYY-MM-DDTHH:mm` in the *viewer's* timezone, which is what an
 * `<input type="datetime-local">` shows and returns.
 *
 * Slicing the stored ISO string instead hands the input a UTC wall clock that
 * it then reads as local time: an entry at 12:00 in Copenhagen displayed as
 * 10:00, and saving moved it two hours earlier every time.
 */
export function toLocalInputValue(iso: IsoDateTime): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return `${dateKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** The reverse: a datetime-local value is local wall-clock time, never UTC. */
export function fromLocalInputValue(value: string): IsoDateTime | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim())
  if (!match) return null
  const [, year, month, day, hour, minute] = match.map(Number) as unknown as number[]
  const d = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

/**
 * A typed clock time, before any day is attached to it.
 *
 * `bareHour` marks the one form that does not say which half of the day it
 * means: an hour from 1 to 12, typed alone, with no leading zero and no am/pm
 * ("9", "3", "12"). Anything more is taken as written — "09", "0900", "930",
 * "9:30" and "21:00" are clock times on the 24-hour clock, and "3p" says so.
 */
function readClock(raw: string): { h: number; m: number; bareHour: boolean } | null {
  const text = raw.trim().toLowerCase()
  if (!text) return null

  /**
   * "4p" IS FOUR IN THE AFTERNOON. Only "am" and "pm" were looked for, so a
   * lone "p" was read past and "4p" became 04:00 — twelve hours out, and on an
   * end, a different day. One letter is how it is typed in a hurry, and
   * "p.m." is how some people were taught to write it.
   */
  const meridiem = /([ap])\.?\s*(?:m\.?)?$/.exec(text)?.[1] ?? null
  /**
   * Only digits, a separator (":", "." or ","), "h" and am/pm. Everything else was stripped and the
   * rest read as a time, so "-5" became 5 and then 17:00 after a 10:00 start,
   * silently (edits audit, 2026-11-04).
   */
  if (/[^0-9:.,\sapmh]/.test(text)) return null
  /**
   * "10.30" AND "10,30" ARE HALF PAST TEN: between digits, a dot or a comma is
   * the clock's colon. They were stripped instead, so "10.30" came out right by
   * luck while "10.5" became "105", 01:05, and "12.5" 01:25 — in a start box,
   * with nothing asked (code review, 2026-11-04). One digit after it is refused
   * (`unreadableTimeMessage` says why): "10.5" could be 10:05, 10:30 or 10:50.
   * Durations have their own rules (`parseDurationInput`).
   */
  if (/\d[.,]\d(?!\d)/.test(text)) return null
  const digits = text.replace(/(\d)[.,](?=\d)/g, "$1:").replace(/[^0-9:]/g, "")
  // "now", "pm", "x": no digits is no time — `Number("")` is 0, and it read as midnight
  if (!/\d/.test(digits)) return null
  // "12345" is not a clock time; it read as 12:34 and dropped the 5
  if (!digits.includes(":") && digits.length > 4) return null
  let hourText: string
  let m = 0

  if (digits.includes(":")) {
    const [hh, mm = "0"] = digits.split(":")
    hourText = hh
    m = Number(mm)
  } else if (digits.length <= 2) {
    hourText = digits
  } else if (digits.length === 3) {
    hourText = digits.slice(0, 1)
    m = Number(digits.slice(1))
  } else {
    hourText = digits.slice(0, 2)
    m = Number(digits.slice(2, 4))
  }

  let h = Number(hourText)
  if (!Number.isFinite(h) || !Number.isFinite(m) || m > 59) return null
  const bareHour = meridiem === null && hourText === digits && !hourText.startsWith("0") && h >= 1 && h <= 12
  if (meridiem === "p" && h < 12) h += 12
  if (meridiem === "a" && h === 12) h = 0
  if (h > 23) return null
  return { h, m, bareHour }
}

/**
 * What to say when a clock time cannot be read because it says too little: one
 * digit after a dot or a comma ("10.5"), which could mean any of three times.
 * Null for anything else, which keeps the box's own "Could not read that time".
 */
export function unreadableTimeMessage(raw: string): string | null {
  const match = /^(\d{1,2})([.,])(\d)$/.exec(raw.trim())
  if (!match) return null
  const [typed, hour, , digit] = match
  const d = Number(digit)
  const minutes = [...new Set([d, d * 6, d * 10])].filter((m) => m < 60).sort((a, b) => a - b)
  const list = (separator: string) => {
    const times = minutes.map((m) => `${hour}${separator}${pad2(m)}`)
    return times.length > 1 ? `${times.slice(0, -1).join(", ")} or ${times[times.length - 1]}` : times[0]
  }
  return `“${typed}” could be ${list(":")} — type ${list(".")}`
}

/** `h:m` on `dayKey`, in the viewer's own zone */
function atClock(dayKey: IsoDate, h: number, m: number): IsoDateTime {
  const d = dateKeyToDate(dayKey)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

/**
 * Parse a time-of-day and apply it to `dayKey`.
 * Accepts "13:45", "1345", "1:45 pm", "9pm", "4p", "8a", "9".
 *
 * A bare "9" here is 09:00. Only an END has a start to measure "the nearest
 * sensible time" from — see `parseEndTimeInput`.
 */
export function parseTimeInput(raw: string, dayKey: IsoDate): IsoDateTime | null {
  const clock = readClock(raw)
  return clock ? atClock(dayKey, clock.h, clock.m) : null
}

/**
 * The first moment at `h:m` that is not before the start: the start's own day,
 * or the day after. The start's own minute counts as the start itself, so a
 * timer started at 09:00:40 and ended "09:00" is zero minutes long, not a day.
 */
function firstClockFrom(startIso: IsoDateTime, h: number, m: number): IsoDateTime {
  const sameDay = atClock(dateKey(startIso), h, m)
  const startEpoch = epochSeconds(startIso)
  const endEpoch = epochSeconds(sameDay)
  if (endEpoch >= startEpoch) return sameDay
  if (endEpoch >= Math.floor(startEpoch / 60) * 60) return startIso
  const nextDay = new Date(sameDay)
  nextDay.setDate(nextDay.getDate() + 1)
  return nextDay.toISOString()
}

/**
 * An END typed as a time of day: the nearest sensible time after the start
 * (plan D10).
 *
 * THE RULE, in full:
 *   1. A bare hour from 1 to 12 ("9", "3", "12": no minutes, no leading zero,
 *      no am/pm) is whichever of h and h+12 comes first at or after the start.
 *      Start 10:00: "3" is 15:00, "9" is 21:00, "11" is 11:00, "12" is noon.
 *      Start 22:00: "1" is 01:00, "11" is 23:00, "12" is midnight.
 *   2. Anything else is the exact clock time it says — "09:00", "0900", "930",
 *      "9:30", "21", "3p" — on the first day it is not before the start. So
 *      "09:00" after a 10:00 start is 09:00 TOMORROW. That reading is never
 *      written silently: the screens ask before any typed value makes an entry
 *      longer than 12 hours (`LONG_ENTRY_SECONDS`), and offer the other half of
 *      the day as the likely meaning.
 *
 * Why not apply rule 1 to "9:30" as well: minutes are what a person on the
 * 24-hour clock types, and for them "9:30" is half past nine in the morning.
 * A bare "9" on the other hand is said, not read off a clock — and read on the
 * 24-hour clock it turned a 10:00 start and an end of "9" into 23 hours, and
 * "3" into 17.
 *
 * Read on the start's own day, the way every end field here used to, "01:00" on
 * an entry begun at 22:00 was twenty-one hours BEFORE it began and was refused —
 * so a night's work could not be typed in at all. And on a timer forgotten
 * overnight, the end you remember ("10:30") is on the day it started, not today.
 */
export function parseEndTimeInput(raw: string, startIso: IsoDateTime): IsoDateTime | null {
  const clock = readClock(raw)
  if (!clock) return null
  const asTyped = firstClockFrom(startIso, clock.h, clock.m)
  if (!clock.bareHour) return asTyped
  const otherHalf = firstClockFrom(startIso, (clock.h + 12) % 24, clock.m)
  return epochSeconds(otherHalf) < epochSeconds(asTyped) ? otherHalf : asTyped
}

/**
 * A MOMENT TYPED INTO SWITCHED AT…, STOPPED AT… OR STARTED AT…: a time that
 * has already happened.
 *
 * With a timer running, the moment is where that timer ends, so it is read the
 * way every end is (`parseEndTimeInput`): the first such time at or after the
 * timer's start. That is what makes "1730" on a timer forgotten since Friday
 * Friday evening, and "1" on one started at 22:00 one in the morning.
 *
 * With nothing running there is no start to measure from, and the moment is
 * the last time that clock time came round: "2330" just after midnight is last
 * night, and a bare "3" in the afternoon is three o'clock, the half of the day
 * that has happened. Whether it is still ahead of the clock is the caller's to
 * say, because that is a refusal with words, not an unreadable time.
 */
export function parseMomentInput(raw: string, earliestIso: IsoDateTime | null, nowIso: IsoDateTime): IsoDateTime | null {
  const clock = readClock(raw)
  if (!clock) return null
  // the minute being typed in counts as passed: 14:30 typed at 14:29:50 is now, not yesterday
  const latest = epochSeconds(nowIso) + 60
  if (earliestIso) {
    const forward = parseEndTimeInput(raw, earliestIso)
    /**
     * "0800" on a timer started at 09:00 is 08:00 TOMORROW by the end rule —
     * which has not happened. What was meant is this morning, before the start,
     * and saying THAT is the useful refusal; the time that has passed is read
     * below and the caller says why it cannot be used.
     */
    if (forward && epochSeconds(forward) <= latest) return forward
  }
  const hours = clock.bareHour ? [clock.h, (clock.h + 12) % 24] : [clock.h]
  let best: IsoDateTime | null = null
  const today = dateKey(nowIso)
  for (const day of [today, addDays(today, -1)]) {
    for (const h of hours) {
      const candidate = atClock(day, h, clock.m)
      if (epochSeconds(candidate) > latest) continue
      if (best === null || epochSeconds(candidate) > epochSeconds(best)) best = candidate
    }
  }
  return best
}

/** Longer than this, a typed time or length asks before it is written (plan D10) */
export const LONG_ENTRY_SECONDS = 12 * 3600

/**
 * The same clock time twelve hours away, for "Did you mean 21:00?".
 *
 * For an end, the first such moment not before the start; for a start, the
 * same calendar day. `null` when that reading is no better: it would make the
 * entry run backwards, or still be longer than 12 hours.
 */
export function otherHalfOfDay(
  which: "start" | "stop",
  typedIso: IsoDateTime,
  startIso: IsoDateTime,
  endIso: IsoDateTime,
): IsoDateTime | null {
  const typed = new Date(typedIso)
  const h = (typed.getHours() + 12) % 24
  const m = typed.getMinutes()
  const alternative = which === "stop" ? firstClockFrom(startIso, h, m) : atClock(dateKey(typedIso), h, m)
  const seconds =
    which === "stop" ? epochSeconds(alternative) - epochSeconds(startIso) : epochSeconds(endIso) - epochSeconds(alternative)
  return seconds >= 0 && seconds <= LONG_ENTRY_SECONDS ? alternative : null
}

/**
 * A START typed as a bare time of day: on the start's own day — or the day
 * after it, when that is still not after the end and is nearer the start you
 * are changing.
 *
 * Read on the start's day alone, "00:30" on a 22:00–02:00 entry was half past
 * midnight the night BEFORE, and the entry became 25 hours long; the day after
 * fixes that. It used to be the END's day instead, which on an entry longer
 * than a day is a different day altogether: Mon 09:00 → Wed 10:00 given the
 * start "09:30" became Wed 09:30 → Wed 10:00, 48 hours gone without a question,
 * and a timer running since yesterday 09:00 jumped to today (edits audit B5,
 * 2026-11-04). `endIso` is the stop, or now for a running entry.
 */
export function parseStartTimeInput(raw: string, startIso: IsoDateTime, endIso: IsoDateTime): IsoDateTime | null {
  const clock = readClock(raw)
  if (!clock) return null
  const startDay = dateKey(startIso)
  const sameDay = atClock(startDay, clock.h, clock.m)
  const dayAfter = atClock(addDays(startDay, 1), clock.h, clock.m)
  if (epochMillis(dayAfter) > epochMillis(endIso)) return sameDay
  const from = epochMillis(startIso)
  return Math.abs(epochMillis(dayAfter) - from) < Math.abs(epochMillis(sameDay) - from) ? dayAfter : sameDay
}

/**
 * Whether a typed time or length asks before it is written (plan D10), and how.
 *
 * `long`: it makes the entry longer than 12 hours — and longer than it was. An
 * entry that is already two days long, given a start half an hour later, is not
 * a 23-hour accident; asking there blocked the very fix it needed.
 *
 * `cut`: it takes more than 12 hours off a finished entry, which is what a time
 * read on the wrong day looks like — Mon 09:00 → Wed 10:00 given the end
 * "11:00" is Monday 11:00, and 47 hours would go in silence (edits audit B5,
 * 2026-11-04). Never on a running timer, whose whole point in being given an
 * end or a length is to be cut short: a timer forgotten overnight.
 *
 * `before` is the entry's length before the edit (for a running timer, up to
 * now), or nothing for an entry that does not exist yet.
 */
export function lengthQuestion(
  seconds: number,
  before?: { seconds: number; running?: boolean } | null,
): "long" | "cut" | null {
  if (seconds > LONG_ENTRY_SECONDS && (!before || seconds > before.seconds)) return "long"
  if (before && !before.running && before.seconds - seconds > LONG_ENTRY_SECONDS) return "cut"
  return null
}

/**
 * The sheet's mark for an end on a later day than the start: "next day", "+2
 * days", or nothing. The list's rows use it too, so "22:30–01:15" no longer
 * reads as a 21-hour entry backwards (edits audit B8).
 */
export function endDayMark(startIso: IsoDateTime, stopIso: IsoDateTime | null): string | null {
  if (!stopIso) return null
  const days = daysBetween(dateKey(startIso), dateKey(stopIso))
  if (days <= 0) return null
  return days === 1 ? "next day" : `+${days} days`
}

/** The other way round: on a row listed on a day its entry reached from an earlier one, where it began */
export function continuedMark(days: number): string {
  return days === 1 ? "from the day before" : `from ${days} days before`
}

/**
 * The zone every time on this page is drawn in: this browser's own. The
 * workspace also keeps a zone, the one of whichever browser first made it, and
 * Settings showed that one — "Asia/Tokyo — Taken from this browser" in
 * Copenhagen (edits audit B10, 2026-11-04).
 */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

/** Round a duration to the configured interval (Toggl's report rounding) */
export function roundSeconds(seconds: number, rounding: RoundingConfig): number {
  if (!rounding.enabled || rounding.minutes <= 0) return seconds
  const step = rounding.minutes * 60
  if (seconds === 0) return 0
  switch (rounding.mode) {
    case "up":
      return Math.ceil(seconds / step) * step
    case "down":
      return Math.floor(seconds / step) * step
    default:
      return Math.round(seconds / step) * step
  }
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function slugKey(value: string | number | null): string {
  return value === null ? "none" : String(value)
}

/** Deterministic color for labels that have no entity color (tags, members) */
export function hashColor(seed: string, palette: readonly string[]): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

/**
 * A NUMBER TYPED INTO A SETTING, PULLED INTO THE RANGE IT CAN ACTUALLY WORK IN.
 *
 * `Number(event.target.value) || 1` was the pattern, and it only catches 0 and NaN. A
 * browser round typed `-5` into the Pomodoro work interval: it was stored, and every
 * press of Start then created and instantly stopped a zero-length entry while the
 * header read `Break 0:05:08 · 1 done` — the timer was unusable and nothing said why.
 * `99` went into "From hour", and there is no 99 o'clock.
 *
 * `min`/`max` on the input do not stop this: they are constraint-validation flags, not
 * clamps, which this slice has now learned twice. The clamp has to be at the write.
 */
export function clampSetting(raw: string, min: number, max: number, fallback: number): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

/**
 * Is `hour` inside a daily window that may WRAP PAST MIDNIGHT?
 *
 * `hour < from || hour >= to` is true for all 24 hours when `from` is 20 and `to` is 3,
 * so an evening reminder window — which reads perfectly sensible, and which the form
 * accepts — could never fire once. Nothing said so.
 */
export function hourIsInWindow(hour: number, fromHour: number, toHour: number): boolean {
  if (fromHour === toHour) return false
  if (fromHour < toHour) return hour >= fromHour && hour < toHour
  return hour >= fromHour || hour < toHour
}

/**
 * The seven weekday chips, starting on the workspace's own first day of the week.
 *
 * `index` stays the JS `getDay()` number, because that is what `reminders.days` holds
 * and what the firing check compares against — only the ORDER changes. The reminder row
 * was hardcoded Sun→Sat while every other weekday row in the app honours `weekStart`.
 */
export function weekdayChips(weekStart: 0 | 1 | 6): { label: string; index: number }[] {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return Array.from({ length: 7 }, (_, offset) => {
    const index = (weekStart + offset) % 7
    return { label: names[index], index }
  })
}

/**
 * Why a reminder configuration can never fire, or `null` when it can.
 *
 * Each of these was accepted in silence under a card reading "Reminds you to start a
 * timer during the hours you set below".
 */
export function reminderNeverFiresBecause(reminders: {
  days: number[]
  fromHour: number
  toHour: number
}): string | null {
  if (reminders.days.length === 0) return "No days are selected, so no reminder will be sent. Pick at least one."
  if (reminders.fromHour === reminders.toHour) {
    return "The window starts and ends at the same hour, so no reminder will be sent."
  }
  return null
}
