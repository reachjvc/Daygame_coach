/**
 * DUE NOW: what the plan asks of you today, on top of Today
 * (Plans/life-plan-after-setup.md, Phase 3; d3, d5, d11).
 *
 * At most three cards, in a fixed order: finish your plan, season over or
 * ending, plan the new year, year, quarter, month and week reviews, goals past
 * their date. Each card's `key` names it for its period; "Not now" hides that
 * key, and the next period brings a new one. Pure: the caller passes today's
 * date key and the hidden keys.
 */

import { addDays } from "./oneThingService"
import { daysBetweenDateKeys, dateKeyLabel } from "@/src/shared/dateUtils"
import { periodOf, periodLabel, reviewFor, isWrittenReview, type ReviewPeriod } from "./reviewService"
import { isActive } from "./goalStatus"
import type { NsPlan, NorthStarTabId } from "./types"
import { DUE_COPY, TAB_LABELS } from "./data/northStar"

export const DEFAULT_REVIEW_DAY = 7 // ISO weekday, 7 = Sunday (Q2: the app's pick, not Stefan's)
export const DUE_MAX = 3
/**
 * How long Review waits for the reminder's day before picking its week from the
 * default day (Phase 6). Long enough for a normal answer, short enough that a
 * hung request does not keep the step closed.
 */
export const REMINDER_WAIT_MS = 2000
export type DueKind = "finish-setup" | "season-ended" | "season-ending" | "new-year" | "year" | "quarter" | "month" | "week" | "goals-passed"
export type DueGo = { tab: NorthStarTabId; period?: ReviewPeriod } | { goalId: string }
/** `key` names this card for this period; "Not now" hides that key, and the next period has a new one. */
/** `percent` rides on the finish-setup card only, for its bar. */
export interface DueCard { kind: DueKind; key: string; title: string; detail: string; go: DueGo; percent?: number }
/**
 * How far the plan is (Plans/plan-progress-percent.md): the total, the step
 * with the most left and a few words on what is left there. Null when the
 * caller has not worked it out, which shows no finish-setup card.
 */
export interface DuePlanProgress { percent: number; mostLeft: NorthStarTabId | null; mostLeftDetail: string }
export interface DueOptions { reviewDay: number; hidden: ReadonlySet<string>; progress: DuePlanProgress | null }

/** 1 = Monday … 7 = Sunday, for a date key. */
export function isoWeekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number); const w = new Date(y, m - 1, d).getDay(); return w === 0 ? 7 : w
}

/**
 * The week the weekly card is about. A review day on Friday to Sunday looks back
 * at the week ending around it; an earlier day looks back at the last full week.
 */
export function dueWeekPeriod(today: string, reviewDay: number): ReviewPeriod {
  const since = (isoWeekday(today) - reviewDay + 7) % 7
  const D = addDays(today, -since)
  return reviewDay >= 5 ? periodOf("week", D) : periodOf("week", addDays(D, -7))
}

const written = (plan: NsPlan, p: ReviewPeriod) => {
  const r = reviewFor(plan, p)
  return r !== null && isWrittenReview(r)
}

export function dueNow(plan: NsPlan, today: string, opts: DueOptions): DueCard[] {
  const weekKey = periodOf("week", today).start
  const dayOfMonth = Number(today.slice(8, 10))
  const month = Number(today.slice(5, 7))
  const previous = (c: "month" | "quarter" | "year") => periodOf(c, addDays(periodOf(c, today).start, -1))
  const review = (go: ReviewPeriod) => ({ tab: "review" as const, period: go })

  const cards: DueCard[] = []

  // Shown until the plan is whole, committed or not: the point is to see what is left (Q3).
  const progress = opts.progress
  if (progress !== null && progress.percent < 100 && progress.mostLeft !== null) {
    const { percent, mostLeft, mostLeftDetail } = progress
    cards.push({ kind: "finish-setup", key: `finish-setup:${weekKey}`, ...DUE_COPY.finishSetup(percent, TAB_LABELS[mostLeft], mostLeftDetail), go: { tab: mostLeft }, percent })
  }

  const s = plan.season
  if (s !== null && s.sentence.trim() !== "" && s.endsOn !== null) {
    const left = daysBetweenDateKeys(today, s.endsOn)
    if (left < 0) {
      cards.push({ kind: "season-ended", key: `season:${s.id}:${weekKey}`, ...DUE_COPY.seasonEnded(dateKeyLabel(s.endsOn, { day: "numeric", month: "short" })), go: { tab: "focus" } })
    } else if (left <= 7) {
      cards.push({ kind: "season-ending", key: `season:${s.id}:${weekKey}`, ...DUE_COPY.seasonEnding(left), go: { tab: "focus" } })
    }
  }

  if (month === 1 && written(plan, previous("year"))) {
    cards.push({ kind: "new-year", key: `new-year:${today.slice(0, 4)}`, ...DUE_COPY.newYear, go: { tab: "star" } })
  }

  const yearP = month === 12 && dayOfMonth >= 26 ? periodOf("year", today) : month === 1 && dayOfMonth <= 15 ? previous("year") : null
  if (yearP && !written(plan, yearP)) {
    cards.push({ kind: "year", key: `year:${yearP.start}`, ...DUE_COPY.year(periodLabel(yearP)), go: review(yearP) })
  }

  const quarterNow = periodOf("quarter", today)
  const quarterP = daysBetweenDateKeys(quarterNow.start, today) < 14 ? previous("quarter") : quarterNow.end === today ? quarterNow : null
  if (quarterP && !written(plan, quarterP)) {
    cards.push({ kind: "quarter", key: `quarter:${quarterP.start}`, ...DUE_COPY.quarter(periodLabel(quarterP)), go: review(quarterP) })
  }

  const monthNow = periodOf("month", today)
  const monthP = dayOfMonth <= 7 ? previous("month") : monthNow.end === today ? monthNow : null
  if (monthP && !written(plan, monthP)) {
    cards.push({ kind: "month", key: `month:${monthP.start}`, ...DUE_COPY.month(periodLabel(monthP)), go: review(monthP) })
  }

  const since = (isoWeekday(today) - opts.reviewDay + 7) % 7
  if (since <= 2) {
    const p = dueWeekPeriod(today, opts.reviewDay)
    if (!written(plan, p)) cards.push({ kind: "week", key: `week:${p.start}`, ...DUE_COPY.week(periodLabel(p)), go: review(p) })
  }

  const passed = plan.goals.filter((g) => isActive(g) && g.targetDate !== null && g.targetDate < today)
  if (passed.length > 0) {
    cards.push({ kind: "goals-passed", key: `goals-passed:${weekKey}`, ...DUE_COPY.goalsPassed(passed.length, passed.slice(0, 2).map((g) => g.title)), go: { goalId: passed[0].id } })
  }

  return cards.filter((c) => !opts.hidden.has(c.key)).slice(0, DUE_MAX)
}
