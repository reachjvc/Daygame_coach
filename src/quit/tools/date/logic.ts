import { addDays, isIsoDay } from "../../record"

/** Whole days from `a` to `b` (positive when b is later). Calendar days, no clock. */
export function daysBetween(a: string, b: string): number {
  const n = (d: string) => Math.round(new Date(`${d}T00:00:00Z`).getTime() / 86_400_000)
  return n(b) - n(a)
}

/** Monday-first weekday index 0..6 of an ISO day. */
export function mondayIndex(day: string): number {
  return (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7
}

/* ---------- date chips ---------- */

export type ChipId = "today" | "tomorrow" | "in3" | "weekend" | "monday" | "in14"
/** The order the chips are offered in when two fall on the same day: the earlier one stays. */
export const CHIP_PRIORITY: readonly ChipId[] = ["today", "tomorrow", "in3", "weekend", "monday", "in14"]

/** The day a chip stands for. "This weekend" is the coming Saturday (tomorrow on a Saturday, next Saturday on a Sunday); "next Monday" is never today. */
export function chipDate(chip: ChipId, today: string): string {
  const wd = mondayIndex(today)
  switch (chip) {
    case "today":
      return today
    case "tomorrow":
      return addDays(today, 1)
    case "in3":
      return addDays(today, 3)
    case "in14":
      return addDays(today, 14)
    case "monday":
      return addDays(today, 7 - wd)
    case "weekend":
      if (wd === 5) return addDays(today, 1)
      if (wd === 6) return addDays(today, 6)
      return addDays(today, 5 - wd)
  }
}

/** The chips in date order; one that falls on the same day as an earlier one (in `CHIP_PRIORITY`) is skipped. */
export function dateChips(today: string): { id: ChipId; date: string }[] {
  const seen = new Set<string>()
  const out: { id: ChipId; date: string }[] = []
  for (const id of CHIP_PRIORITY) {
    const date = chipDate(id, today)
    if (seen.has(date)) continue
    seen.add(date)
    out.push({ id, date })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/* ---------- date limits ---------- */

export const MAX_BACK_DAYS = 365
export const MAX_AHEAD_DAYS = 42
/** Past this many days ahead the plain information lines show. */
export const INFO_AFTER_DAYS = 28

export function dateBounds(today: string): { min: string; max: string } {
  return { min: addDays(today, -MAX_BACK_DAYS), max: addDays(today, MAX_AHEAD_DAYS) }
}

export function dateAllowed(date: string | null, today: string): date is string {
  if (date === null || !isIsoDay(date)) return false
  const { min, max } = dateBounds(today)
  return date >= min && date <= max
}

export const showsInfo = (date: string | null, today: string): boolean => date !== null && isIsoDay(date) && daysBetween(today, date) > INFO_AFTER_DAYS

/* ---------- break ---------- */

export type BreakLen = "w1" | "w2" | "w4" | "set"
export const BREAK_LENS: readonly BreakLen[] = ["w1", "w2", "w4", "set"]
export const BREAK_DAYS: Record<Exclude<BreakLen, "set">, number> = { w1: 7, w2: 14, w4: 28 }

/** The day a break ends: start plus 7, 14 or 28 days, or the chosen day (it has to come after the start). */
export function breakEnd(start: string, len: BreakLen, setEnd: string | null): string | null {
  if (len !== "set") return addDays(start, BREAK_DAYS[len])
  return setEnd !== null && isIsoDay(setEnd) && setEnd > start ? setEnd : null
}

/* ---------- day counts ---------- */

export type DayLine = { kind: "ahead"; n: number } | { kind: "dayOne" } | { kind: "day"; n: number }

/** Where today stands against day 1: days to go, day 1 itself, or day N. */
export function dayLine(day1: string, today: string): DayLine {
  const d = daysBetween(today, day1)
  if (d > 0) return { kind: "ahead", n: d }
  if (d === 0) return { kind: "dayOne" }
  return { kind: "day", n: -d + 1 }
}

/* ---------- numbers typed by the reader ---------- */

export type Typed = { kind: "empty" } | { kind: "ok"; value: number } | { kind: "bad" }

/** "7,50" and "7.50" both give 7.5; blank is empty; anything else is bad. */
export function parseTyped(text: string, max: number): Typed {
  const t = text.trim()
  if (t === "") return { kind: "empty" }
  if (!/^\d*[.,]?\d+$|^\d+[.,]$/.test(t)) return { kind: "bad" }
  const value = Number(t.replace(",", "."))
  if (!Number.isFinite(value) || value < 0 || value > max) return { kind: "bad" }
  return { kind: "ok", value }
}

export const MAX_PRICE = 1000
export const MAX_PER_DAY = 500

/* ---------- calendar file ---------- */

const compact = (d: string) => d.replace(/-/g, "")

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

/** An all-day event called "Day 1" with a reminder at 19:00 the evening before (5 hours before the day starts). DTSTAMP is the time it was made. */
export function icsFor(day1: string, now: Date): string {
  const d = compact(day1)
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Quit date//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:day1-${d}-${now.getTime()}@quit-date`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${compact(addDays(day1, 1))}`,
    "SUMMARY:Day 1",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Day 1",
    "TRIGGER:-PT5H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n")
}

export function googleCalendarUrl(day1: string): string {
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Day 1")}&dates=${compact(day1)}/${compact(addDays(day1, 1))}`
}

/* ---------- six-week calendar ---------- */

export interface CalCell {
  date: string
  /** 1 on the quit date. */
  dayNo: number
}
export const CALENDAR_DAYS = 42

/** Week rows, Monday first, from the week holding day 1; cells before day 1 and after day 42 are null. */
export function calendarWeeks(day1: string): (CalCell | null)[][] {
  const lead = mondayIndex(day1)
  const cells: (CalCell | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: CALENDAR_DAYS }, (_, i) => ({ date: addDays(day1, i), dayNo: i + 1 })),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (CalCell | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}
