import { addDays, isIsoDay } from "../../record"
import { isObj, pickBool, pickInt, pickStr } from "../common"
import { isFeelingId } from "./text"

/** One day of the check-in. Every part is optional. */
export interface Day {
  pledge?: string
  /** Expected difficulty, 1 easy to 5 very hard. */
  forecast?: number
  slipped?: boolean
  /** How hard it was, same 1 to 5 scale. */
  hard?: number
  /** Strength of the urges, 1 to 5. */
  urges?: number
  feelings?: string[]
  note?: string
  /** The Black Box report this tool filed for the day's slip. */
  slipReportId?: string
}
export type Days = Record<string, Day>

export type FlowKind = "morning" | "evening"
export interface Draft {
  kind: FlowKind
  date: string
  step: number
  /** What is answered so far on the screens after the slip question (which is saved at once). */
  answers: Day
}

export const DEFAULT_REMINDERS = { morning: "08:00", evening: "21:00" }
export type Reminders = typeof DEFAULT_REMINDERS

export interface CheckinState {
  days: Days
  draft: Draft | null
  reminders: Reminders
}

export const EMPTY_CHECKIN: CheckinState = { days: {}, draft: null, reminders: DEFAULT_REMINDERS }

export const PLEDGE_MAX = 140
export const NOTE_MAX = 500
/** Pattern lines start from this many check-ins with a result. */
export const MIN_CHECKINS = 14
/** A comparison needs at least this many days on each side. */
export const MIN_SIDE = 3
/** Forecast values from here up count as "hard". */
export const HARD_FROM = 4
/** The Month screen can fill in a day this many days back. */
export const LOOKBACK_DAYS = 60
/** Last month's numbers show on the first days of a month. */
export const LAST_MONTH_UNTIL = 7

/* ---------- reading what is stored ---------- */

/** One day; every bad part is dropped. */
export function parseDay(x: unknown): Day {
  if (!isObj(x)) return {}
  const out: Day = {}
  const pledge = pickStr(x.pledge, "").slice(0, PLEDGE_MAX)
  if (pledge.trim()) out.pledge = pledge
  const forecast = pickInt(x.forecast, 1, 5, undefined)
  if (forecast !== undefined) out.forecast = forecast
  const slipped = pickBool(x.slipped, undefined)
  if (slipped !== undefined) out.slipped = slipped
  const hard = pickInt(x.hard, 1, 5, undefined)
  if (hard !== undefined) out.hard = hard
  const urges = pickInt(x.urges, 1, 5, undefined)
  if (urges !== undefined) out.urges = urges
  if (Array.isArray(x.feelings)) {
    const list = [...new Set(x.feelings.filter((f): f is string => typeof f === "string" && isFeelingId(f)))]
    if (list.length > 0) out.feelings = list
  }
  const note = pickStr(x.note, "").slice(0, NOTE_MAX)
  if (note.trim()) out.note = note
  const id = pickStr(x.slipReportId, "")
  if (id) out.slipReportId = id
  return out
}

function parseDraft(x: unknown): Draft | null {
  if (!isObj(x)) return null
  if (x.kind !== "morning" && x.kind !== "evening") return null
  if (!isIsoDay(x.date)) return null
  const steps = x.kind === "morning" ? 2 : 5
  const step = pickInt(x.step, 1, steps, 0)
  if (step === 0) return null
  const answers = parseDay(x.answers)
  delete answers.slipped
  delete answers.slipReportId
  return { kind: x.kind, date: x.date, step, answers }
}

const isTime = (x: unknown): x is string => typeof x === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x)

/** The stored state of the tool; whatever is bad falls back to empty. */
export function parseCheckin(x: unknown): CheckinState {
  const o = isObj(x) ? x : {}
  const days: Days = {}
  if (isObj(o.days)) {
    for (const [k, v] of Object.entries(o.days)) {
      if (!isIsoDay(k)) continue
      const d = parseDay(v)
      if (Object.keys(d).length > 0) days[k] = d
    }
  }
  const r = isObj(o.reminders) ? o.reminders : {}
  return {
    days,
    draft: parseDraft(o.draft),
    reminders: { morning: isTime(r.morning) ? r.morning : DEFAULT_REMINDERS.morning, evening: isTime(r.evening) ? r.evening : DEFAULT_REMINDERS.evening },
  }
}

/* ---------- days and months ---------- */

export const monthOf = (day: string) => day.slice(0, 7)

export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** "Thu 19 Nov", the format of Tool 4. */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00Z`)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`
}

export function monthName(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

/** Monday-first cells of a month: day keys, null for the leading blanks. */
export function monthGrid(ym: string): (string | null)[] {
  const [y, m] = ym.split("-").map(Number)
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= count; d++) cells.push(`${ym}-${String(d).padStart(2, "0")}`)
  return cells
}

export const hasOutcome = (d: Day | undefined): d is Day & { slipped: boolean } => typeof d?.slipped === "boolean"

const hasAnyMoment = (d: Day | undefined): boolean =>
  !!d && (!!d.pledge?.trim() || d.forecast !== undefined || d.slipped !== undefined || d.hard !== undefined || d.urges !== undefined || (d.feelings?.length ?? 0) > 0 || !!d.note?.trim())

/** Days of one month with anything saved, and how many of them were clear. Another month is another count. */
export function monthCounts(days: Days, ym: string): { checkedIn: number; clear: number } {
  const keys = Object.keys(days).filter((k) => monthOf(k) === ym)
  return { checkedIn: keys.filter((k) => hasAnyMoment(days[k])).length, clear: keys.filter((k) => days[k].slipped === false).length }
}

/** Last month's numbers show on days 1 to 7 of a month. */
export const showsLastMonth = (today: string): boolean => Number(today.slice(8)) <= LAST_MONTH_UNTIL

/** The first month the Month screen can show: the month of the first entry, or this month. */
export function firstMonth(days: Days, today: string): string {
  const keys = Object.keys(days).filter((k) => hasAnyMoment(days[k])).sort()
  return keys.length > 0 && keys[0] < today ? monthOf(keys[0]) : monthOf(today)
}

/** Any day from LOOKBACK_DAYS back to today can be filled in; a future day cannot. */
export const canFill = (date: string, today: string): boolean => isIsoDay(date) && date <= today && date >= addDays(today, -LOOKBACK_DAYS)

/** Yesterday's key when it has no evening answer and an earlier entry exists (not on the first day), else null. */
export function lookBack(days: Days, today: string): string | null {
  const y = addDays(today, -1)
  if (hasOutcome(days[y])) return null
  const earlier = Object.keys(days).some((k) => k < y && hasAnyMoment(days[k]))
  return earlier ? y : null
}

/* ---------- Black Box slip days ---------- */

interface ReportLike {
  at: string
  wentThrough: boolean
}

/** The days on which a living Black Box report says the run ended with a slip. */
export function slipDays(reports: readonly ReportLike[]): Set<string> {
  return new Set(reports.filter((r) => r.wentThrough).map((r) => r.at.slice(0, 10)))
}

/** The stored days with every Black Box slip day counted as slipped, even when the day holds no check-in. */
export function mergeSlips(days: Days, slips: ReadonlySet<string>): Days {
  if (slips.size === 0) return days
  const out: Days = { ...days }
  for (const d of slips) out[d] = { ...out[d], slipped: true }
  return out
}

/* ---------- pattern ---------- */

export interface Pairing {
  forecast: number
  hard: number
  /** Result minus forecast: above 0 means harder than expected. */
  diff: number
}

export function pairing(d: Day | undefined): Pairing | null {
  if (!d || d.forecast === undefined || d.hard === undefined) return null
  return { forecast: d.forecast, hard: d.hard, diff: d.hard - d.forecast }
}

/** Over all days with a forecast and a result: harder than expected, easier, the same. */
export function pairingCounts(days: Days): { n: number; harder: number; easier: number; same: number } {
  const all = Object.values(days)
    .map(pairing)
    .filter((p): p is Pairing => p !== null)
  return { n: all.length, harder: all.filter((p) => p.diff > 0).length, easier: all.filter((p) => p.diff < 0).length, same: all.filter((p) => p.diff === 0).length }
}

export interface ForecastLine {
  withDays: number
  withSlips: number
  otherDays: number
  otherSlips: number
}

export interface Patterns {
  /** Days with a result. */
  count: number
  ready: boolean
  /** The expected-hard comparison, or null when a side is under MIN_SIDE days or the two shares are equal. */
  forecast: ForecastLine | null
  /** Why there is no forecast line once there are enough results: too few days on a side, or equal shares. */
  reason: "sides" | "equal" | null
  pairs: ReturnType<typeof pairingCounts>
}

/**
 * Pattern lines from the morning forecast only: the evening answers (urges, feelings) are given at the same time as the
 * slip, so they would only restate the result. Nothing shows before MIN_CHECKINS days with a result.
 */
export function patternsOf(days: Days): Patterns {
  const rows = Object.values(days).filter(hasOutcome)
  const pairs = pairingCounts(days)
  if (rows.length < MIN_CHECKINS) return { count: rows.length, ready: false, forecast: null, reason: null, pairs }
  const withF = rows.filter((d) => d.forecast !== undefined)
  const hardDays = withF.filter((d) => (d.forecast ?? 0) >= HARD_FROM)
  const other = withF.filter((d) => (d.forecast ?? 0) < HARD_FROM)
  let forecast: ForecastLine | null = null
  let reason: Patterns["reason"] = "sides"
  if (hardDays.length >= MIN_SIDE && other.length >= MIN_SIDE) {
    const withSlips = hardDays.filter((d) => d.slipped).length
    const otherSlips = other.filter((d) => d.slipped).length
    if (withSlips * other.length !== otherSlips * hardDays.length) {
      forecast = { withDays: hardDays.length, withSlips, otherDays: other.length, otherSlips }
      reason = null
    } else reason = "equal"
  }
  return { count: rows.length, ready: true, forecast, reason, pairs }
}

/* ---------- month calendar ---------- */

export type Mode = "clear" | "hard" | "feelings" | "notes"
export const MODES: readonly Mode[] = ["clear", "hard", "feelings", "notes"]

/** What a cell shows in a mode: "none" when the day has nothing for it, else a level 1 to 5 (clear and notes use 1). */
export function cellLevel(d: Day | undefined, mode: Mode): { state: "none" | "clear" | "slip" | "set"; level: number } {
  if (!d) return { state: "none", level: 0 }
  if (mode === "clear") return d.slipped === undefined ? { state: "none", level: 0 } : { state: d.slipped ? "slip" : "clear", level: 1 }
  if (mode === "hard") return d.hard === undefined ? { state: "none", level: 0 } : { state: "set", level: d.hard }
  if (mode === "feelings") {
    const n = d.feelings?.length ?? 0
    return n === 0 ? { state: "none", level: 0 } : { state: "set", level: Math.min(5, n) }
  }
  return d.note?.trim() ? { state: "set", level: 1 } : { state: "none", level: 0 }
}

/* ---------- the example (in memory only) ---------- */

/** Rows are [forecast, slipped, hard, urges, feelings, note]. */
const SEED: [number, boolean, number, number, string[], string?][] = [
  [4, true, 5, 5, ["bored", "restless"], "Long evening alone, gave in around ten."],
  [2, false, 1, 1, ["calm"]],
  [3, false, 2, 2, ["sad"]],
  [5, false, 4, 4, ["stressed", "bored"], "Hard morning, got through it by walking."],
  [2, false, 2, 1, ["happy"]],
  [1, false, 1, 1, ["proud"]],
  [4, true, 4, 4, ["bored", "short-tempered"]],
  [3, false, 3, 2, ["anxious"]],
  [2, false, 2, 2, ["happy"]],
  [4, false, 3, 3, ["stressed"]],
  [2, false, 1, 1, ["calm"]],
  [3, true, 4, 4, ["bored"], "Slipped after a bad call."],
  [2, false, 2, 1, ["calm", "proud"]],
  [4, false, 4, 4, ["restless"]],
  [1, false, 1, 1, ["calm"]],
  [3, false, 2, 2, ["anxious"]],
  [5, true, 5, 5, ["short-tempered", "stressed"], "Everything went wrong at work."],
  [2, false, 2, 2, ["happy"]],
  [3, false, 3, 3, ["restless"]],
  [2, false, 1, 1, ["proud"]],
]

/** 20 example days ending two days ago. Never stored, never sent to the Black Box. */
export function seedExample(today: string): Days {
  const out: Days = { [today]: { pledge: "No smoking at the bar.", forecast: 4 } }
  SEED.forEach(([forecast, slipped, hard, urges, feelings, note], i) => {
    out[addDays(today, -(i + 2))] = { pledge: "Today I stay clear.", forecast, slipped, hard, urges, feelings, ...(note ? { note } : {}) }
  })
  return out
}

/* ---------- calendar file ---------- */

const compact = (d: string) => d.replace(/-/g, "")
const stampOf = (now: Date) => now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
const clock = (hhmm: string) => `${hhmm.replace(":", "")}00`
/** Ten minutes after a HH:MM time (the same day; the last ten minutes of the day end at 23:59). */
function endTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number)
  const t = Math.min(h * 60 + m + 10, 23 * 60 + 59)
  return `${String(Math.floor(t / 60)).padStart(2, "0")}${String(t % 60).padStart(2, "0")}00`
}

/** Lines over 75 octets are folded with a CRLF and a space, as the format asks. */
function fold(line: string): string {
  if (line.length <= 73) return line
  const parts: string[] = [line.slice(0, 73)]
  for (let i = 73; i < line.length; i += 72) parts.push(line.slice(i, i + 72))
  return parts.join("\r\n ")
}

/** The link in an event description; commas and semicolons are escaped. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

/**
 * Two events that repeat every day, from `start` on: the morning and the evening check-in, at the times given (local
 * time, no zone). DTSTAMP is the time the file was made.
 */
export function icsFor(times: Reminders, start: string, now: Date, link: string, names: { morning: string; evening: string }): string {
  const event = (kind: "morning" | "evening") => {
    const t = times[kind]
    return [
      "BEGIN:VEVENT",
      `UID:checkin-${kind}-${compact(start)}-${now.getTime()}@quit-checkin`,
      `DTSTAMP:${stampOf(now)}`,
      `DTSTART:${compact(start)}T${clock(t)}`,
      `DTEND:${compact(start)}T${endTime(t)}`,
      "RRULE:FREQ=DAILY",
      `SUMMARY:${names[kind]}`,
      `DESCRIPTION:${esc(`Open the check-in: ${link}`)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${names[kind]}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
    ]
  }
  return [...["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Quit check-in//EN", "CALSCALE:GREGORIAN"], ...event("morning"), ...event("evening"), "END:VCALENDAR", ""].map(fold).join("\r\n")
}

/** A Google Calendar link for one daily event. */
export function googleCalendarUrl(kind: "morning" | "evening", times: Reminders, start: string, link: string, names: { morning: string; evening: string }): string {
  const t = times[kind]
  const q = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(names[kind])}`,
    `dates=${compact(start)}T${clock(t)}/${compact(start)}T${endTime(t)}`,
    `details=${encodeURIComponent(`Open the check-in: ${link}`)}`,
    `recur=${encodeURIComponent("RRULE:FREQ=DAILY")}`,
  ]
  return `https://calendar.google.com/calendar/render?${q.join("&")}`
}

/** A day put back into the days map: parts that are empty are dropped, and a day with nothing left is removed (never stored as {}). */
export function putDay(days: Days, date: string, day: Day): Days {
  const kept = Object.fromEntries(Object.entries(day).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0) && !(typeof v === "string" && v.trim() === ""))) as Day
  const out = { ...days }
  if (Object.keys(kept).length === 0) delete out[date]
  else out[date] = kept
  return out
}

interface RunLike {
  startedOn: string
  endedOn: string | null
}

/**
 * Why a "Yes" for `date` was kept in the check-in only:
 * "later" the day lies inside a run that a later slip already ended; "notStarted" no run, or the day is before the first run;
 * "ended" the last slip ended the clean days and no run is going; "other" a run is going but holds a later entry.
 */
export function noSlipCase(date: string, runs: readonly RunLike[]): "later" | "notStarted" | "ended" | "other" {
  if (runs.length === 0 || date < runs.reduce((m, r) => (r.startedOn < m ? r.startedOn : m), runs[0].startedOn)) return "notStarted"
  if (runs.some((r) => r.endedOn !== null && r.startedOn <= date && date <= r.endedOn)) return "later"
  if (!runs.some((r) => r.endedOn === null)) return "ended"
  return "other"
}
