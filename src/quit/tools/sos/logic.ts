import type { QuitBelief, QuitOption } from "../../types"
import liveTools from "../../data/liveTools.json"
import { isObj, pickInt, pickStr } from "../common"

/** The wait lengths he can choose, in minutes; the middle one is the default. */
export const WAIT_CHOICES = [5, 10, 15] as const
export type WaitMinutes = (typeof WAIT_CHOICES)[number]
export const DEFAULT_WAIT: WaitMinutes = 10
/** The extra time of "Still fighting it". */
export const FIGHT_WAIT: WaitMinutes = 5
/** A visit that began longer ago than this is over. */
export const VISIT_MS = 60 * 60 * 1000
/** A second close call inside this many milliseconds updates the first. */
export const LOG_WINDOW_MS = 5 * 60 * 1000
/** The situation list shows from this many saves that name one. */
export const PATTERN_MIN = 3
/** The move tile's countdown. */
export const MOVE_MS = 5 * 60 * 1000
export const OTHER = "other"

export interface SosState {
  /** Epoch ms when this visit began; null before the first visit. */
  visit: number | null
  /** True once the after-flow was answered: the next visit is a new one. */
  ended: boolean
  ringMinutes: WaitMinutes
  /** Epoch ms when the ring started; null when none runs. */
  ringStartedAt: number | null
  /** A belief id or "other" from the voice tile; null until chosen. */
  belief: string | null
  /** Black Box report id filed in this visit. */
  reportId: string | null
  reportKind: "close" | "slip" | null
  /** His reasons, kept across visits. */
  reasons: string
  /** Best score of the block puzzle, kept across visits. */
  best2048: number
}

export const EMPTY_SOS: SosState = {
  visit: null,
  ended: false,
  ringMinutes: DEFAULT_WAIT,
  ringStartedAt: null,
  belief: null,
  reportId: null,
  reportKind: null,
  reasons: "",
  best2048: 0,
}

export function parseSos(x: unknown): SosState {
  const o = isObj(x) ? x : {}
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null)
  const minutes = (WAIT_CHOICES as readonly number[]).includes(o.ringMinutes as number) ? (o.ringMinutes as WaitMinutes) : DEFAULT_WAIT
  const kind = o.reportKind === "close" || o.reportKind === "slip" ? o.reportKind : null
  return {
    visit: num(o.visit),
    ended: o.ended === true,
    ringMinutes: minutes,
    ringStartedAt: num(o.ringStartedAt),
    belief: pickStr(o.belief, null),
    reportId: pickStr(o.reportId, null),
    reportKind: kind,
    reasons: typeof o.reasons === "string" ? o.reasons.slice(0, 300) : "",
    best2048: pickInt(o.best2048, 0, 100_000_000, 0),
  }
}

/** True when this visit starts fresh: none yet, the last one ended, or it began over 60 minutes ago. */
export function isNewVisit(s: SosState, now: number): boolean {
  if (s.visit === null || s.ended) return true
  return now - s.visit > VISIT_MS || now < s.visit
}

/** The state a new visit starts from: his reasons and best score stay, the ring starts at once. */
export function freshVisit(s: SosState, now: number): SosState {
  return {
    ...EMPTY_SOS,
    visit: now,
    ringStartedAt: now,
    reasons: s.reasons,
    best2048: s.best2048,
  }
}

export interface RingView {
  running: boolean
  over: boolean
  leftMs: number
  /** 1 at the start, 0 at the end. */
  fraction: number
}

/** Where the ring stands at `now`. */
export function ringView(minutes: number, startedAt: number | null, now: number): RingView {
  const total = minutes * 60_000
  if (startedAt === null) return { running: false, over: false, leftMs: total, fraction: 1 }
  const leftMs = Math.min(total, Math.max(0, total - (now - startedAt)))
  return { running: leftMs > 0, over: leftMs === 0, leftMs, fraction: leftMs / total }
}

/** mm:ss, rounded up to the second so 00:00 shows only at the very end. */
export function ringClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export interface LogEntry {
  /** Local report time, `YYYY-MM-DDTHH:mm:ss`. */
  at: string
  /** An id of the addiction's `riskyMoments`, or "". */
  where: string
}

export interface Bar {
  id: string
  label: string
  count: number
  percent: number
}

export interface Pattern {
  /** Saves that name a situation. */
  total: number
  ready: boolean
  bars: Bar[]
}

/** His saved situations as bars, most often first; `ready` from three saves on. */
export function situationBars(logs: LogEntry[], moments: Pick<QuitOption, "id" | "label">[]): Pattern {
  const counts = moments.map((m) => logs.filter((l) => l.where === m.id).length)
  const total = counts.reduce((a, b) => a + b, 0)
  const bars = moments
    .map((m, i) => ({ id: m.id, label: m.label, count: counts[i], percent: total === 0 ? 0 : Math.round((counts[i] / total) * 100) }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count)
  return { total, ready: total >= PATTERN_MIN, bars }
}

/** Milliseconds between two local report times (`YYYY-MM-DDTHH:mm:ss`), or NaN. */
export function reportGap(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime())
}

/** The close call to update instead of filing a new one: the latest within five minutes of `at`. */
export function recentCloseCall<T extends { id: string; at: string; wentThrough: boolean }>(reports: T[], at: string): T | null {
  const near = reports.filter((r) => !r.wentThrough && reportGap(r.at, at) < LOG_WINDOW_MS)
  return near.length === 0 ? null : near.reduce((a, b) => (a.at >= b.at ? a : b))
}

/** The belief behind a chosen voice id, or null (also for "something else"). */
export function beliefOf(id: string | null, beliefs: QuitBelief[]): QuitBelief | null {
  return id && id !== OTHER ? (beliefs.find((b) => b.id === id) ?? null) : null
}

/** A tool counts as built when it is listed in liveTools.json (links to it are drawn). */
export function isFinished(id: string): boolean {
  return (liveTools as string[]).includes(id)
}

export interface Kept {
  amountUsd: number
  days: number
  /** Price of one counted thing: a cigarette, a vape, a tin. */
  eachUsd: number
  perDay: number
}

/**
 * Money kept since a past quit date, from his own numbers: count a day times the price of one
 * (the record's price is per cigarette, per vape, per can). Null without a past date, a count or a price.
 */
export function moneyKept(quitDate: string | null, today: string, unit: { id: string; perDay: number | null; priceUsd: number } | null): Kept | null {
  if (!quitDate || !unit || quitDate >= today) return null
  if (unit.perDay === null || !(unit.perDay > 0) || !(unit.priceUsd > 0)) return null
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${quitDate}T00:00:00Z`)) / 86_400_000)
  if (days < 1) return null
  const eachUsd = unit.priceUsd
  return { amountUsd: eachUsd * unit.perDay * days, days, eachUsd, perDay: unit.perDay }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `2026-10-19` as "19 Oct 2026". */
export function niceDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number)
  return `${d} ${MONTHS[m - 1] ?? ""} ${y}`
}
