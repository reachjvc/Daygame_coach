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

export function isoFromEpochSeconds(seconds: number): IsoDateTime {
  return new Date(seconds * 1000).toISOString()
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Local YYYY-MM-DD for an ISO instant (not UTC — day buckets must match the UI) */
export function dateKey(iso: IsoDateTime | Date): IsoDate {
  const d = iso instanceof Date ? iso : new Date(iso)
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
  if (format === "h12") {
    const h = d.getHours() % 12 || 12
    const suffix = d.getHours() < 12 ? "AM" : "PM"
    return `${h}:${pad2(d.getMinutes())} ${suffix}`
  }
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
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

export function formatMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount * 100) / 100
  return `${currency} ${rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

/**
 * Parse a duration the way Toggl's duration field does.
 * "1:30" → 5400 · "1:30:15" → 5415 · "1.5" / "1,5" → 5400 (decimal hours)
 * "90" → 5400 (bare number = minutes) · "1h30m" / "45m" / "30s" → parsed units
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
    return Math.round(seconds)
  }

  if (/^\d+\.\d+$/.test(text)) return Math.round(Number(text) * 3600)
  if (/^\d+$/.test(text)) return Number(text) * 60

  return null
}

/**
 * Parse a time-of-day and apply it to `dayKey`.
 * Accepts "13:45", "1345", "1:45 pm", "9pm", "9".
 */
export function parseTimeInput(raw: string, dayKey: IsoDate): IsoDateTime | null {
  const text = raw.trim().toLowerCase()
  if (!text) return null

  const meridiem = /(am|pm)/.exec(text)?.[1] ?? null
  const digits = text.replace(/[^0-9:]/g, "")
  let h: number
  let m = 0

  if (digits.includes(":")) {
    const [hh, mm = "0"] = digits.split(":")
    h = Number(hh)
    m = Number(mm)
  } else if (digits.length <= 2) {
    h = Number(digits)
  } else if (digits.length === 3) {
    h = Number(digits.slice(0, 1))
    m = Number(digits.slice(1))
  } else {
    h = Number(digits.slice(0, 2))
    m = Number(digits.slice(2, 4))
  }

  if (!Number.isFinite(h) || !Number.isFinite(m) || m > 59) return null
  if (meridiem === "pm" && h < 12) h += 12
  if (meridiem === "am" && h === 12) h = 0
  if (h > 23) return null

  const d = dateKeyToDate(dayKey)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
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

/** Deterministic colour for labels that have no entity colour (tags, members) */
export function hashColor(seed: string, palette: readonly string[]): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}
