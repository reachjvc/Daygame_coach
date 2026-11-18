import { addDays, pseudo, streakEnding } from "../shared/logic"

export type Outcome = "victory" | "setback"

/** Scales are stored as the position in the stack, 0 = top (lightest) to 4 = bottom (darkest). */
export interface CheckC {
  outcome: Outcome
  /** Time of day of the setback: 0 morning, 1 afternoon, 2 evening, 3 night. */
  time?: number
  places?: string[]
  /** Urge difficulty: 0 very easy to 4 very difficult. */
  urges: number
  /** Emotional state: 0 very good to 4 very poor. */
  emotion: number
  positive: string[]
  negative: string[]
  /** Five areas, 0 very good to 4 very poor, in the order of AREAS. */
  ratings: number[]
  title: string
  body: string
}

export type DaysC = Record<string, CheckC>

export const AREA_COUNT = 5
export const POINTS_PER_CHECKIN = 450
/** A correlation needs at least this many check-ins before it is shown. */
export const MIN_DAYS_FOR_INSIGHT = 7

export type Step = "howdid" | "time" | "where" | "urges" | "emotion" | "positive" | "negative" | "r0" | "r1" | "r2" | "r3" | "r4" | "journal"

/** Steps of the check-in; the two setback questions come only after the Setback answer. */
export function stepsFor(outcome: Outcome | null): Step[] {
  const head: Step[] = ["howdid"]
  const mid: Step[] = outcome === "setback" ? ["time", "where"] : []
  return [...head, ...mid, "urges", "emotion", "positive", "negative", "r0", "r1", "r2", "r3", "r4", "journal"]
}

/** Progress bar fill: 0 on the first step (no bar is shown there), 1 on the last. */
export function progressOf(steps: Step[], step: Step): number {
  const i = steps.indexOf(step)
  return i <= 0 ? 0 : i / (steps.length - 1)
}

export const pointsOf = (days: DaysC) => Object.keys(days).length * POINTS_PER_CHECKIN

/** Rank from points: only the first two names were seen, so there is no third one. */
export const rankIndex = (points: number) => (points > 0 ? 1 : 0)

export const checkinStreak = (days: DaysC, today: string) => streakEnding(new Set(Object.keys(days)), today)

/** A rating counts as good when it is in the top two positions. */
export const isGood = (position: number) => position <= 1

/** Wellness score of a day, 0 to 100: mean of the five ratings, best answer = 100. */
export function dayScore(c: CheckC): number {
  const mean = c.ratings.reduce((s, r) => s + (4 - r), 0) / c.ratings.length
  return Math.round((mean / 4) * 100)
}

export interface Insight {
  /** Indexes of the rated areas that go together with victories. */
  areas: number[]
  /** Days (n) with all of those areas good, and victories among them. */
  withDays: number
  withVictories: number
  /** Days without, and victories among them. */
  otherDays: number
  otherVictories: number
  /** How much more likely a victory is on the first kind of day, in percent; null when the other days have no victory. */
  percentMore: number | null
}

const rate = (v: number, n: number) => (n === 0 ? 0 : v / n)

/**
 * The areas whose good days best match victory days, up to three, and how much more likely a
 * victory was on days when all of them were good. Always carries the day counts it rests on.
 */
export function insightOf(days: DaysC): Insight | null {
  const list = Object.values(days)
  if (list.length < MIN_DAYS_FOR_INSIGHT) return null
  const scored: { area: number; diff: number }[] = []
  for (let a = 0; a < AREA_COUNT; a++) {
    const good = list.filter((c) => isGood(c.ratings[a]))
    const rest = list.filter((c) => !isGood(c.ratings[a]))
    if (good.length < 2 || rest.length < 2) continue
    const diff = rate(good.filter((c) => c.outcome === "victory").length, good.length) - rate(rest.filter((c) => c.outcome === "victory").length, rest.length)
    if (diff > 0) scored.push({ area: a, diff })
  }
  scored.sort((x, y) => y.diff - x.diff)
  const areas = scored.slice(0, 3).map((s) => s.area).sort()
  if (areas.length === 0) return null
  const withSet = list.filter((c) => areas.every((a) => isGood(c.ratings[a])))
  const other = list.filter((c) => !withSet.includes(c))
  const withVictories = withSet.filter((c) => c.outcome === "victory").length
  const otherVictories = other.filter((c) => c.outcome === "victory").length
  const pOther = rate(otherVictories, other.length)
  const percentMore = other.length === 0 || pOther === 0 ? null : Math.round((rate(withVictories, withSet.length) / pOther - 1) * 100)
  return { areas, withDays: withSet.length, withVictories, otherDays: other.length, otherVictories, percentMore }
}

/** Marker position on the Setback-to-Victory bar, 0 to 1. */
export function markerOf(i: Insight): number {
  return rate(i.withVictories, i.withDays)
}

/** Example data: 14 days ending yesterday; setbacks on four of them, with poorer sleep and connection. */
export function seedDaysC(today: string): DaysC {
  const out: DaysC = {}
  const setbacks = new Set([3, 6, 10, 13])
  for (let i = 1; i <= 14; i++) {
    const bad = setbacks.has(i)
    const r = (n: number) => Math.floor(pseudo(i * 7 + n) * 5)
    // Sleep (4), connection (3) and movement (2) are good on victory days and poor on setback days.
    const ratings = [r(1), r(2), bad ? 3 + (i % 2) : r(3) % 2, bad ? 3 : r(4) % 2, bad ? 4 : r(5) % 2]
    // On two setback days one of the three is still good, so the match is not perfect.
    if (i === 6) ratings[3] = 1
    if (i === 13) ratings[2] = 0
    if (i === 8) ratings[4] = 3
    out[addDays(today, -i)] = {
      outcome: bad ? "setback" : "victory",
      time: bad ? i % 4 : undefined,
      places: bad ? [i % 2 ? "Home office" : "Bedroom"] : undefined,
      urges: bad ? 3 + (i % 2) : r(6) % 3,
      emotion: bad ? 3 : r(7) % 3,
      positive: bad ? [] : [["Hopeful", "Peaceful", "Motivated", "Loved"][i % 4]],
      negative: bad ? ["Stressed", "Anxious"] : i % 5 === 0 ? ["Irritable"] : [],
      ratings,
      title: "",
      body: "",
    }
  }
  return out
}
