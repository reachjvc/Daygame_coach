import type { ViceAttempt, ViceReport } from "@/src/vice/types"
import { isCalendarDay } from "@/src/vice/blackbox/blackboxStore"
import { runDays } from "@/src/vice/blackboxService"
import { shiftDay } from "../../blackboxLogic"
import { isDay, isObj, pickInt, pickOne, pickStr } from "../common"

export const MAX_OWN = 80
export const OTHER = "other"
/** The "Somewhere else" chip of the where screen. */
export const ELSE = "else"
/** The "Skip" answer of the where and voice screens. */
export const SKIP = "skip"
/** A half-answered visit older than this is a new visit. */
export const VISIT_MS = 60 * 60 * 1000

export type Step = "when" | "where" | "voice"
const STEPS: readonly Step[] = ["when", "where", "voice"]
export type Kase = "A" | "B" | "C"
export type WhenPick = "today" | "yesterday" | "another"
/** "keep": case C with a quit date already planned ahead; it stays unless Today or Tomorrow is tapped. */
export type Day1 = "today" | "tomorrow" | "keep"

export interface SlipState {
  /** The case this visit works in (A: a run lives, B: the slip is already filed, C: no run); null before the visit is set up. */
  kase: Kase | null
  /** The question screens of this visit, fixed when it began. */
  steps: Step[]
  /** Question screens passed with Continue or Skip. */
  done: number
  /** Epoch ms of the last change; null before any. */
  touched: number | null
  /** Case A: the earliest day a slip can be dated; null otherwise. */
  min: string | null
  pick: WhenPick | null
  /** The slip day chosen (YYYY-MM-DD). */
  day: string | null
  /** A moment id, "else" or "skip"; null until answered. */
  where: string | null
  /** A belief id, "other" or "skip"; null until answered. */
  told: string | null
  ownWords: string
  /** The Black Box report this visit is about (filed here in case A, already there in case B). */
  slipId: string | null
  day1: Day1 | null
  /** The calendar day of the new day 1, fixed at the moment of choosing. */
  day1On: string | null
  /** The record's quit date before this visit changed it; null when it was not changed. */
  quitBefore: { date: string | null } | null
  /** The quit date this tool set itself (never counted as the reader's plan). */
  ownDate: string | null
}

export const EMPTY_SLIP: SlipState = {
  kase: null,
  steps: [],
  done: 0,
  touched: null,
  min: null,
  pick: null,
  day: null,
  where: null,
  told: null,
  ownWords: "",
  slipId: null,
  day1: null,
  day1On: null,
  quitBefore: null,
  ownDate: null,
}

/** Saved state, checked. */
export function parseSlip(x: unknown): SlipState {
  const o = isObj(x) ? x : {}
  const steps = Array.isArray(o.steps) ? o.steps.filter((v): v is Step => (STEPS as readonly unknown[]).includes(v)) : []
  const qb = isObj(o.quitBefore) ? o.quitBefore : null
  return {
    kase: pickOne(o.kase, ["A", "B", "C"] as const, null),
    steps,
    done: pickInt(o.done, 0, 3, 0),
    touched: typeof o.touched === "number" && Number.isFinite(o.touched) && o.touched > 0 ? o.touched : null,
    min: isDay(o.min) ? o.min : null,
    pick: pickOne(o.pick, ["today", "yesterday", "another"] as const, null),
    day: isDay(o.day) ? o.day : null,
    where: pickStr(o.where, null),
    told: pickStr(o.told, null),
    ownWords: pickStr(o.ownWords, "").slice(0, MAX_OWN),
    slipId: pickStr(o.slipId, null),
    day1: pickOne(o.day1, ["today", "tomorrow", "keep"] as const, null),
    day1On: isDay(o.day1On) ? o.day1On : null,
    quitBefore: qb ? { date: isDay(qb.date) ? qb.date : null } : null,
    ownDate: isDay(o.ownDate) ? o.ownDate : null,
  }
}

/** The first question screen not passed yet; `steps.length + 1` is the result. */
export function firstUnanswered(s: SlipState): number {
  return Math.min(s.done, s.steps.length) + 1
}

/** The earliest day a slip can be dated: the later of the run's start and its latest report (what `fileReport` accepts). */
export function dayMin(run: Pick<ViceAttempt, "id" | "startedOn">, reports: Pick<ViceReport, "attemptId" | "at">[]): string {
  return reports.filter((r) => r.attemptId === run.id).reduce((m, r) => (r.at.slice(0, 10) > m ? r.at.slice(0, 10) : m), run.startedOn)
}

export interface WhenChoice {
  id: WhenPick
  /** The day the chip stands for; null for "another day". */
  day: string | null
}

/** The chips of screen 1. A chip whose day is before `min` is not shown; "another day" only when it could pick something else. */
export function whenChoices(min: string, today: string): WhenChoice[] {
  const yesterday = shiftDay(today, -1)
  const out: WhenChoice[] = [{ id: "today", day: today }]
  if (yesterday >= min) out.push({ id: "yesterday", day: yesterday })
  if (shiftDay(today, -2) >= min) out.push({ id: "another", day: null })
  return out
}

/** A day the Black Box takes for this slip: a real day from `min` to `today`. */
export function dayAllowed(day: string | null, min: string, today: string): day is string {
  return day !== null && isCalendarDay(day) && day >= min && day <= today
}

export interface Plan {
  kase: Kase
  /** A day to start the run on before anything else (the date tool's rule); null when nothing starts. */
  startOn: string | null
  steps: Step[]
  /** Case A: the earliest slip day. */
  min: string | null
  /** Case B: the report already there. */
  slipId: string | null
}

function latestEnded(runs: ViceAttempt[]): ViceAttempt | null {
  const ended = runs.filter((r) => r.endedOn !== null)
  if (ended.length === 0) return null
  return ended.reduce((a, b) => ((b.endedOn as string) > (a.endedOn as string) || ((b.endedOn as string) === (a.endedOn as string) && b.startedOn > a.startedOn) ? b : a))
}

/**
 * Which of the three cases this visit is, read from the Black Box (runs and reports of this vice, living only)
 * and the record's quit date. Never called before the Black Box is settled.
 */
export function decide(input: { runs: ViceAttempt[]; reports: ViceReport[]; quitDate: string | null; today: string }): Plan {
  const { runs, reports, quitDate, today } = input
  const liveRun = runs.find((r) => r.endedOn === null) ?? null
  const askA = (min: string): Pick<Plan, "steps" | "min"> => ({ min, steps: min < today ? ["when", "where", "voice"] : ["where", "voice"] })
  if (liveRun) return { kase: "A", startOn: null, slipId: null, ...askA(dayMin(liveRun, reports)) }
  const last = latestEnded(runs)
  // A new day 1 has come (or the quit date is today or past and no run exists): the run starts on it, then case A.
  if (quitDate && quitDate <= today && (!last || quitDate > (last.endedOn as string))) {
    return { kase: "A", startOn: quitDate, slipId: null, ...askA(quitDate) }
  }
  const slip = last ? reports.find((r) => r.id === last.endedByReportId && r.wentThrough) : undefined
  if (last && slip) {
    const steps: Step[] = []
    if (slip.where === "") steps.push("where")
    if (slip.thought === "") steps.push("voice")
    return { kase: "B", startOn: null, steps, min: null, slipId: slip.id }
  }
  return { kase: "C", startOn: null, steps: ["where", "voice"], min: null, slipId: null }
}

/**
 * Does the saved slip report still describe the latest slip: it is there, it ended a run, and no other run lives except
 * the day 1 run this visit started. That run counts only on the day it started: on a later day the result is old, and
 * its "Tomorrow" must never reach the run that holds the days since.
 */
export function describesLatest(s: SlipState, runs: ViceAttempt[], reports: ViceReport[], today: string): boolean {
  if (!s.slipId) return false
  if (!reports.some((r) => r.id === s.slipId)) return false
  const ended = runs.find((r) => r.endedByReportId === s.slipId)
  if (!ended) return false
  const liveRun = runs.find((r) => r.endedOn === null)
  if (liveRun) return s.day1 === "today" && s.day1On === liveRun.startedOn && liveRun.startedOn === today
  return latestEnded(runs)?.id === ended.id
}

/** Whether the saved answers carry into this visit: a result only while it still describes the latest slip, half-answers for an hour. */
export function keepsState(s: SlipState, plan: Plan, runs: ViceAttempt[], reports: ViceReport[], now: number, today: string): boolean {
  if (s.kase === null || plan.startOn !== null) return false
  if (s.slipId) return describesLatest(s, runs, reports, today)
  if (s.kase !== plan.kase) return false
  const fresh = s.touched !== null && now >= s.touched && now - s.touched <= VISIT_MS
  // Case C has no run to be stale against: its finished result stays. Case A with no slip filed starts again.
  if (s.done >= s.steps.length) return s.kase === "C"
  return fresh
}

/** The belief the slip was about: the one named in this visit, else the one whose short line the filed thought matches. */
export function lieOf<B extends { id: string; short: unknown }>(told: string | null, thought: string, beliefs: B[]): B | null {
  if (told && told !== OTHER && told !== SKIP) {
    const b = beliefs.find((x) => x.id === told)
    if (b) return b
  }
  if (!thought) return null
  const norm = (v: unknown) => (typeof v === "string" ? v.replace(/[\u2018\u2019]/g, "'") : v)
  return beliefs.find((x) => norm(x.short) === norm(thought)) ?? null
}

/** The moment id to show a place for: the answer of this visit, else the one on the filed report. */
export function placeOf(answer: string | null, filed: string, momentIds: string[]): string | null {
  if (answer && momentIds.includes(answer)) return answer
  return filed && momentIds.includes(filed) ? filed : null
}

/** The new day 1 chips: Today only when the slip day is before today (the Black Box takes no new run on the slip day). */
export function day1Options(slipDay: string | null, today: string): ("today" | "tomorrow")[] {
  return slipDay === null || slipDay < today ? ["today", "tomorrow"] : ["tomorrow"]
}

export function day1Day(choice: "today" | "tomorrow", today: string): string {
  return choice === "today" ? today : shiftDay(today, 1)
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `2026-10-29` as "Wed 29 Oct". */
export function dayWords(day: string): string {
  const [y, m, d] = day.split("-").map(Number)
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${wd} ${d} ${MONTHS[m - 1] ?? ""}`
}

export function daysWord(n: number): string {
  return n === 1 ? "1 day" : `${n} days`
}

export interface DaysCard {
  start: string
  end: string
  /** The Black Box's own count: day 1 to the slip day, both counted. */
  days: number
  /** Every ended run of this vice together; null with fewer than two ended runs. */
  all: number | null
}

/** The numbers of the days card for the run a slip ended. */
export function daysCard(ended: ViceAttempt | undefined, runs: ViceAttempt[], today: string): DaysCard | null {
  if (!ended || ended.endedOn === null) return null
  const done = runs.filter((r) => r.endedOn !== null)
  return {
    start: ended.startedOn,
    end: ended.endedOn,
    days: runDays(ended, today),
    all: done.length > 1 ? done.reduce((sum, r) => sum + runDays(r, today), 0) : null,
  }
}

/**
 * The new day 1 chosen for the reader once a slip is in the record (cases A and B): Today when the slip day is before
 * today, else Tomorrow. Nothing in case C (no slip day), and nothing when a quit date later than today is already planned.
 */
export function defaultDay1(slipDay: string | null, today: string, quitDate: string | null, ownDate: string | null = null): "today" | "tomorrow" | null {
  if (slipDay === null) return null
  if (quitDate !== null && quitDate > today && quitDate !== ownDate) return null
  return slipDay < today ? "today" : "tomorrow"
}
