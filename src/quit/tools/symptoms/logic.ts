import type { QuitSymptomCourse, QuitSymptomHelp } from "../../types"
import { isIsoDay, type QuitGoal } from "../../record"
import { daysBetween } from "../date/logic"
import { bandFor } from "./bands"
import { phaseOf } from "./bandMath"

/** The label of a symptom: the data file's plain word, else a fallback, else the key. */
export function symptomLabel(key: string, words: Record<string, string>, fallback: Record<string, string>): string {
  return words[key] ?? fallback[key] ?? key
}

/** Help rows for one symptom, in data order. */
export function helpFor(symptom: string, help: QuitSymptomHelp[]): QuitSymptomHelp[] {
  return help.filter((h) => h.symptom === symptom)
}

/** Rows the guide may show: every course row with a source, never tiredness. */
export function listable(course: QuitSymptomCourse[]): QuitSymptomCourse[] {
  return course.filter((c) => c.symptom !== "tired" && c.refs.length > 0)
}

/* ---------- Tool 6: "What you'll feel, and when" ---------- */

export type DayState =
  | { kind: "none" }
  /** Before day 1: `n` days to go; `date` is day 1. */
  | { kind: "ahead"; n: number; date: string }
  /** Day `n`, counted from `from` (day 1). */
  | { kind: "day"; n: number; from: string }
  /** No run going since a slip on `slipDay`. */
  | { kind: "slip"; slipDay: string }

export interface DayInput {
  /** Start of the living nicotine run in the Black Box, or null. */
  runStart: string | null
  /** The shared record's date and goal. */
  recordDate: string | null
  goal: QuitGoal | null
  /** The day of the latest nicotine slip report, or null. */
  slipDay: string | null
  today: string
}

function fromDate(start: string, today: string): DayState {
  const d = daysBetween(today, start)
  if (d > 0) return { kind: "ahead", n: d, date: start }
  return { kind: "day", n: -d + 1, from: start }
}

/**
 * Which day he is on: the living run first, else the record's date (goal stop or break), else none.
 * With no run, a slip on or after the record's date (or any slip when there is no date) means "no run going".
 */
export function dayState(i: DayInput): DayState {
  if (i.runStart && isIsoDay(i.runStart)) return fromDate(i.runStart, i.today)
  const rd = (i.goal === "stop" || i.goal === "break") && i.recordDate && isIsoDay(i.recordDate) ? i.recordDate : null
  if (i.slipDay && (rd === null || rd <= i.slipDay)) return { kind: "slip", slipDay: i.slipDay }
  if (rd) return fromDate(rd, i.today)
  return { kind: "none" }
}

/** The day of the latest slip (a report that went through) in the list, or null. Reports carry ISO datetimes. */
export function latestSlipDay(reports: readonly { at: string; wentThrough: boolean }[]): string | null {
  let best: string | null = null
  for (const r of reports) {
    if (!r.wentThrough) continue
    const day = r.at.slice(0, 10)
    if (isIsoDay(day) && (best === null || day > best)) best = day
  }
  return best
}

/** The day number to mark on the cards, or null when there is none. */
export function markDay(s: DayState): number | null {
  return s.kind === "day" ? s.n : null
}

export type CardId = "craving" | "cue" | "mood" | "sleep" | "hunger"

/** The "Right now" line, by phase (the brief's words). */
export function rightNow(day: number): string {
  if (day <= 7) return "The hardest week for most. Mood, focus, sleep and restlessness peak now, and cravings are at their strongest."
  if (day <= 28) return "For most, mood and focus settle somewhere between day 10 and week 4. Hunger and cravings set off by places can last longer."
  if (day <= 42) return "You are past the 4 weeks the studies give for mood, focus and sleep. Cravings set off by places and moments can still be strong around day 35."
  return "Everyday urges keep fading over months. A year on, none of the people still off in one study had strong urges; about a third still had some."
}

/** True when his day is inside the card's peak or fade range: the "Now" pill. Hunger has no range. */
export function isNow(card: CardId, day: number | null): boolean {
  if (day === null || day < 1) return false
  if (card === "craving") return day <= 28
  if (card === "cue") return day >= 7 && day <= 35
  if (card === "mood" || card === "sleep") return day <= 28
  return false
}

/** The plain words after "You are on day N." for one card. */
export function phaseWords(card: CardId, day: number): string {
  if (card === "craving") {
    if (day <= 28) return "These are the strongest weeks."
    if (day <= 182) return "Past week 4. They fade over months."
    if (day <= 365) return "Past month 6: 13 in 100 of the people still off had strong urges then."
    return "Past month 12: none of the people still off had strong urges; about 34 in 100 had some."
  }
  if (card === "hunger") return "It can last weeks; most of the weight comes in the first 3 months."
  const band = bandFor("nicotine", card === "cue" ? "cue-craving" : card === "sleep" ? "sleep" : "irritable")
  if (!band) return ""
  const p = phaseOf(band, day)
  switch (p) {
    case "open-before":
      return "Not tested before day 7."
    case "open-within":
      return "Within the days tested."
    case "open-past":
      return "Past the last day tested: no end known."
    case "peak":
      return "Inside the peak week."
    case "after-peak":
      return card === "sleep" ? "Past the peak week. A review says it can last to day 28." : "Past the peak week. On average, back to normal by day 10 in one study, by week 4 in a review."
    case "in-range":
      return card === "sleep" ? "Inside the 2 to 4 weeks a review gives." : "Inside the days the studies give: day 10 to week 4."
    default:
      return card === "sleep" ? "Past the 4 weeks the review gives." : "Past the 4 weeks the studies give."
  }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const parts = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  return { wd: WEEKDAYS[d.getUTCDay()], m: MONTHS[d.getUTCMonth()], d: d.getUTCDate() }
}

/** "Thu, Oct 30". */
export function fmtDay(iso: string): string {
  const p = parts(iso)
  return `${p.wd}, ${p.m} ${p.d}`
}

/** "Wed 29 Oct". */
export function fmtSlip(iso: string): string {
  const p = parts(iso)
  return `${p.wd} ${p.d} ${p.m}`
}

/** "3 days to go." */
export function daysToGo(n: number): string {
  return n === 1 ? "1 day to go." : `${n} days to go.`
}

