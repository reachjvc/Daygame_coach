/**
 * REVIEWS: A WEEK, MONTH, QUARTER OR YEAR, LOOKED BACK ON.
 *
 * Stefan's rhythm (Plans/life-plan-rebuild.md, Phase 5; Q7 of
 * Plans/life-plan-tables.md): every week, score each area 0-10, write the magic
 * moments and the lessons, and set what the next week is to bring; then the
 * same each month, quarter and year. Any day works (N2): the page suggests
 * Sunday and says how long ago the last one was.
 *
 * ONE REVIEW PER PERIOD. Its id is `<cadence>-<first day>`, so opening last
 * week again opens last week's review rather than a second one, and the
 * database's own key (plan, cadence, start) can never be broken from here.
 *
 * NOTHING EMPTY IS KEPT. A review appears when the first score or word is put
 * in it and goes when the last is taken out, so stepping through old weeks to
 * look leaves nothing behind.
 *
 * Pure: the day is handed in. Period boundaries are `periodStartFor`'s, the one
 * week rule in the codebase (Monday to Sunday), not a second copy of it.
 */

import type { NsPlan, NsReview, NsReviewCadence } from "./types"
import { addDays } from "./oneThingService"
import { dateKeyLabel, daysBetweenDateKeys, periodStartFor, previousPeriodStart, type GoalPeriod } from "@/src/shared/dateUtils"

/** Every kind a stored review can be, as the database's CHECK lists them. */
export const ALL_REVIEW_CADENCES = ["week", "fortnight", "month", "quarter", "year"] as const satisfies readonly NsReviewCadence[]

/** The kinds a person can start, shortest first. `fortnight` is only ever copied in. */
export const REVIEW_CADENCES = ["week", "month", "quarter", "year"] as const satisfies readonly NsReviewCadence[]
export type OfferedCadence = (typeof REVIEW_CADENCES)[number]

/** Matches the text columns' CHECK, which counts characters, not UTF-16 units. */
export const REVIEW_LIMITS = { text: 100_000 } as const

export interface ReviewPeriod {
  cadence: NsReviewCadence
  start: string
  end: string
}

const GOAL_PERIOD: Record<OfferedCadence, GoalPeriod> = { week: "weekly", month: "monthly", quarter: "quarterly", year: "yearly" }

/** The calendar fields of a date key, or null when it is not a real day (31 February). */
function calendarDay(key: unknown): [number, number, number] | null {
  if (typeof key !== "string") return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const at = new Date(Date.UTC(y, mo - 1, d))
  return at.getUTCFullYear() === y && at.getUTCMonth() === mo - 1 && at.getUTCDate() === d ? [y, mo, d] : null
}

function fields(key: string): [number, number, number] {
  const day = calendarDay(key)
  if (!day) throw new Error(`Not a calendar day: "${key}"`)
  return day
}

/** The wall-clock Date `periodStartFor` takes, for a date key. */
function wallClock(key: string): Date {
  const [y, m, d] = fields(key)
  return new Date(y, m - 1, d)
}

/** The first day of the period after the one starting on `start`. */
function nextStart(cadence: OfferedCadence, start: string): string {
  const [y, m, d] = fields(start)
  const ahead =
    cadence === "week" ? new Date(y, m - 1, d + 7)
    : cadence === "month" ? new Date(y, m, 1)
    : cadence === "quarter" ? new Date(y, m + 2, 1)
    : new Date(y + 1, 0, 1)
  return periodStartFor(GOAL_PERIOD[cadence], ahead)
}

/** The period of this kind that holds `day`. Weeks run Monday to Sunday. */
export function periodOf(cadence: OfferedCadence, day: string): ReviewPeriod {
  const start = periodStartFor(GOAL_PERIOD[cadence], wallClock(day))
  return { cadence, start, end: addDays(nextStart(cadence, start), -1) }
}

/** The period before (-1) or after (+1) this one. A copied fortnight has neither. */
export function shiftPeriod(period: ReviewPeriod, by: -1 | 1): ReviewPeriod {
  if (period.cadence === "fortnight") return period
  const cadence = period.cadence
  const start = by < 0 ? previousPeriodStart(GOAL_PERIOD[cadence], period.start) : nextStart(cadence, period.start)
  return periodOf(cadence, start)
}

export function reviewIdFor(period: Pick<ReviewPeriod, "cadence" | "start">): string {
  return `${period.cadence}-${period.start}`
}

/** The review written for this period, or null. */
export function reviewFor(plan: NsPlan, period: ReviewPeriod): NsReview | null {
  const id = reviewIdFor(period)
  return plan.reviews.find((r) => r.id === id) ?? null
}

export type ReviewPatch =
  | { score: { areaId: string; value: number | null } }
  | { magicMoments: string }
  | { lessons: string }
  | { nextOutcomes: string }

/** True when a review holds no score and no word: such a review is not kept. */
export function isEmptyReview(r: NsReview): boolean {
  return (
    Object.keys(r.scores).length === 0 &&
    !r.magicMoments.trim() && !r.lessons.trim() && !r.nextOutcomes.trim()
  )
}

/** Oldest first, by the day each period ends: a year sorts after the weeks inside it. */
function byEnd(reviews: NsReview[]): NsReview[] {
  return [...reviews].sort(
    (a, b) => a.periodEnd.localeCompare(b.periodEnd) || a.periodStart.localeCompare(b.periodStart) || a.cadence.localeCompare(b.cadence),
  )
}

/**
 * Cut to the limit in characters, never through the middle of one. A cut
 * between the two halves of an emoji leaves text the database's JSON refuses,
 * and then every save after it fails.
 */
function clip(text: string): string {
  if (text.length <= REVIEW_LIMITS.text) return text
  return Array.from(text).slice(0, REVIEW_LIMITS.text).join("")
}

/**
 * Put one score or one text into the period's review.
 *
 * Made on the first thing written, stamped with `today`; removed again when
 * the last thing is taken out. A score for an area the plan does not have is
 * refused, as is a score off the 0-10 scale.
 */
export function writeReview(plan: NsPlan, period: ReviewPeriod, patch: ReviewPatch, today: string, now = new Date().toISOString()): NsPlan {
  const id = reviewIdFor(period)
  const existing = plan.reviews.find((r) => r.id === id)
  const base: NsReview = existing ?? {
    id,
    cadence: period.cadence,
    periodStart: period.start,
    periodEnd: period.end,
    writtenOn: today,
    scores: {},
    magicMoments: "",
    lessons: "",
    nextOutcomes: "",
  }

  let next: NsReview
  if ("score" in patch) {
    const { areaId, value } = patch.score
    if (!plan.areas.some((a) => a.id === areaId)) return plan
    const scores = { ...base.scores }
    const scoredOn = { ...base.scoredOn }
    if (value == null) {
      delete scores[areaId]
      delete scoredOn[areaId]
    } else if (Number.isInteger(value) && value >= 0 && value <= 10) {
      scores[areaId] = value
      scoredOn[areaId] = today
    } else return plan
    next = { ...base, scores, scoredOn }
    // No empty map is kept, so a review reads back from storage as it was written.
    if (Object.keys(scoredOn).length === 0) delete next.scoredOn
  } else {
    const [field, text] = Object.entries(patch)[0] as ["magicMoments" | "lessons" | "nextOutcomes", string]
    next = { ...base, [field]: clip(text) }
  }

  const others = plan.reviews.filter((r) => r.id !== id)
  if (isEmptyReview(next)) {
    if (!existing) return plan
    return { ...plan, reviews: others, updatedAt: now }
  }
  return { ...plan, reviews: byEnd([...others, next]), updatedAt: now }
}

/** Delete one review whole. */
export function removeReview(plan: NsPlan, id: string, now = new Date().toISOString()): NsPlan {
  if (!plan.reviews.some((r) => r.id === id)) return plan
  return { ...plan, reviews: plan.reviews.filter((r) => r.id !== id), updatedAt: now }
}

/** The reviews of one kind, newest period first. */
export function reviewsOf(plan: NsPlan, cadence: NsReviewCadence): NsReview[] {
  return byEnd(plan.reviews.filter((r) => r.cadence === cadence)).reverse()
}

/** The review of this kind written most recently (the newest period on a tie), or null. */
export function lastReviewOf(plan: NsPlan, cadence: NsReviewCadence): NsReview | null {
  return reviewsOf(plan, cadence).reduce<NsReview | null>((best, r) => (!best || r.writtenOn > best.writtenOn ? r : best), null)
}

/**
 * Each area's score in the latest review that scored it and was over before
 * `before`, any kind. What the score rows show as "last time", so a number
 * has something to be compared with. A month holding this week is not "last
 * time" for this week: it has not ended.
 */
export function lastScores(plan: NsPlan, before: string): Record<string, { score: number; review: NsReview }> {
  const out: Record<string, { score: number; review: NsReview }> = {}
  const earlier = byEnd(plan.reviews.filter((r) => r.periodEnd < before)).reverse()
  for (const area of plan.areas) {
    const hit = earlier.find((r) => typeof r.scores[area.id] === "number")
    if (hit) out[area.id] = { score: hit.scores[area.id], review: hit }
  }
  return out
}


/**
 * The last day a score can speak for: the earlier of its period's last day and
 * the day it was given. A month scored on its second day says nothing about
 * the rest of it; a week scored after it ended speaks for its Sunday. A score
 * with no day of its own (the copied first review, scores saved before
 * 2026-11-05) takes the day its review was first written.
 */
function asOf(review: NsReview, areaId: string): string {
  const given = review.scoredOn?.[areaId] ?? review.writtenOn
  return given < review.periodEnd ? given : review.periodEnd
}

/**
 * WHERE EACH AREA STANDS NOW: its score in the latest review that scored it,
 * any kind. This is the number Your 10s shows on the wheel (the owner,
 * 2026-11-05), so the wheel and the reviews are one history, not two numbers
 * that drift apart.
 *
 * "Latest" is the score that speaks for the most recent day (`asOf`). On a tie
 * the review that began later wins, then the shorter kind: this week's score
 * beats this month's, and this month's beats this year's. A review of a period
 * that has not begun is not read.
 */
export function latestScores(plan: NsPlan, today: string): Record<string, { score: number; review: NsReview }> {
  const out: Record<string, { score: number; review: NsReview }> = {}
  const begun = plan.reviews.filter((r) => r.periodStart <= today)
  for (const area of plan.areas) {
    let best: NsReview | null = null
    for (const r of begun) {
      if (typeof r.scores[area.id] !== "number") continue
      if (
        !best ||
        (asOf(r, area.id).localeCompare(asOf(best, area.id)) ||
          r.periodStart.localeCompare(best.periodStart) ||
          // `ALL_REVIEW_CADENCES` runs shortest first: the narrower look back is the more recent.
          ALL_REVIEW_CADENCES.indexOf(best.cadence) - ALL_REVIEW_CADENCES.indexOf(r.cadence)) > 0
      ) best = r
    }
    if (best) out[area.id] = { score: best.scores[area.id], review: best }
  }
  return out
}

/** How many days before `today` a review's score for this area speaks for (`asOf`). */
export function scoreAge(review: NsReview, areaId: string, today: string): number {
  return daysBetweenDateKeys(asOf(review, areaId), today)
}

/** How many of the plan's areas have a score on the wheel: what "rated" counts everywhere. */
export function ratedAreaCount(plan: NsPlan, today: string): number {
  return Object.keys(latestScores(plan, today)).length
}

/**
 * Rate an area on Your 10s: the score goes into this week's review, the same
 * row the Review step scores. Null takes this week's score out again, and the
 * wheel falls back to the review before it.
 */
export function rateArea(plan: NsPlan, areaId: string, value: number | null, today: string, now = new Date().toISOString()): NsPlan {
  return writeReview(plan, periodOf("week", today), { score: { areaId, value } }, today, now)
}

/** The reviews holding a score, oldest first by the day they end: the columns of the scores-over-time table. */
export function scoredReviews(plan: NsPlan): NsReview[] {
  return byEnd(plan.reviews.filter((r) => Object.keys(r.scores).length > 0))
}

/** The average of a review's scores, to one decimal, or null when it scored nothing. */
export function averageScore(review: NsReview): number | null {
  const values = Object.values(review.scores)
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

/**
 * A stored or imported review list, repaired: bad rows dropped, scores kept to
 * known areas and 0-10, and nothing empty kept. A day that is not on the
 * calendar is dropped here, because the database's date columns refuse it and
 * would refuse every save after.
 */
export function readReviews(value: unknown, areaIds: Set<string>): NsReview[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: NsReview[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue
    const r = raw as Record<string, unknown>
    const cadence = r.cadence as NsReviewCadence
    if (!ALL_REVIEW_CADENCES.includes(cadence)) continue
    if (!calendarDay(r.periodStart) || !calendarDay(r.periodEnd)) continue
    const periodStart = r.periodStart as string
    const periodEnd = r.periodEnd as string
    if (periodEnd < periodStart) continue
    const id = reviewIdFor({ cadence, start: periodStart })
    if (seen.has(id)) continue
    seen.add(id)
    const scores: Record<string, number> = {}
    if (r.scores && typeof r.scores === "object") {
      for (const [area, score] of Object.entries(r.scores as Record<string, unknown>)) {
        if (areaIds.has(area) && typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= 10) {
          scores[area] = score
        }
      }
    }
    const scoredOn: Record<string, string> = {}
    if (r.scoredOn && typeof r.scoredOn === "object") {
      for (const [area, day] of Object.entries(r.scoredOn as Record<string, unknown>)) {
        if (area in scores && calendarDay(day)) scoredOn[area] = day as string
      }
    }
    const text = (v: unknown) => (typeof v === "string" ? clip(v) : "")
    const review: NsReview = {
      id,
      cadence,
      periodStart,
      periodEnd,
      writtenOn: calendarDay(r.writtenOn) ? (r.writtenOn as string) : periodEnd,
      scores,
      ...(Object.keys(scoredOn).length > 0 ? { scoredOn } : {}),
      magicMoments: text(r.magicMoments),
      lessons: text(r.lessons),
      nextOutcomes: text(r.nextOutcomes),
    }
    if (!isEmptyReview(review)) out.push(review)
  }
  return byEnd(out)
}

const day = (key: string) => dateKeyLabel(key, { day: "numeric" })
const dayMonth = (key: string) => dateKeyLabel(key, { day: "numeric", month: "short" })
const full = (key: string) => dateKeyLabel(key, { day: "numeric", month: "short", year: "numeric" })

/** "2 – 8 Nov 2026", "November 2026", "Q4 2026", "2026". */
export function periodLabel(period: Pick<ReviewPeriod, "cadence" | "start" | "end">): string {
  const [y1, m1] = fields(period.start)
  const [y2, m2] = fields(period.end)
  if (period.cadence === "month") return dateKeyLabel(period.start, { month: "long", year: "numeric" })
  if (period.cadence === "quarter") return `Q${Math.floor((m1 - 1) / 3) + 1} ${y1}`
  if (period.cadence === "year") return String(y1)
  if (y1 !== y2) return `${full(period.start)} – ${full(period.end)}`
  if (m1 !== m2) return `${dayMonth(period.start)} – ${full(period.end)}`
  return `${day(period.start)} – ${full(period.end)}`
}

/** A short column head for the scores-over-time table: "2 Nov", "Nov 26", "Q4 26", "2026". */
export function periodShortLabel(review: NsReview): string {
  const [y, m] = fields(review.periodStart)
  if (review.cadence === "month") return dateKeyLabel(review.periodStart, { month: "short", year: "2-digit" })
  if (review.cadence === "quarter") return `Q${Math.floor((m - 1) / 3) + 1} ${String(y).slice(2)}`
  if (review.cadence === "year") return String(y)
  return dayMonth(review.periodStart)
}

/** "today", "yesterday", "9 days ago". */
export function agoLabel(dayKey: string, today: string): string {
  const n = daysBetweenDateKeys(dayKey, today)
  if (n <= 0) return "today"
  if (n === 1) return "yesterday"
  return `${n} days ago`
}

/** A review's own period, for opening it again. */
export function periodOfReview(review: NsReview): ReviewPeriod {
  return { cadence: review.cadence, start: review.periodStart, end: review.periodEnd }
}
