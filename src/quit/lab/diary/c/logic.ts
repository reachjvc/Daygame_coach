import { lastDays, mean, rnd, sortShares, trailingZeroDays, type Share } from "../shared/logic"

export interface CheckIn {
  date: string
  smoked: boolean
  urges: number
  intensity: number
  /** index into the mood list, or null */
  mood: number | null
  ex?: boolean
}

export const MOOD_COUNT = 8

/** 14 days of example check-ins ending the day before `now`, urges easing off over time. */
export function seedCheckIns(now: number): CheckIn[] {
  const days = lastDays(now - 86_400_000, 14)
  return days.map((date, i) => {
    const urges = Math.max(0, Math.round(7 - i * 0.45 + (rnd(i + 3) - 0.5) * 3))
    const intensity = urges === 0 ? 0 : Math.min(10, Math.max(1, Math.round(8.5 - i * 0.3 + (rnd(i + 40) - 0.5) * 3)))
    return { date, smoked: i === 2, urges, intensity, mood: urges === 0 ? null : Math.floor(rnd(i + 90) * MOOD_COUNT), ex: true }
  })
}

export function sorted(entries: CheckIn[]): CheckIn[] {
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** One check-in per date: a save on a date replaces the earlier one. */
export function upsert(entries: CheckIn[], next: CheckIn): CheckIn[] {
  return sorted([...entries.filter((e) => e.date !== next.date), next])
}

/** Mood shares: count of check-ins per mood, largest first. `only` keeps one mood (null = all). */
export function moodShares(entries: CheckIn[], only: number | null = null): Share[] {
  const counts = Array.from({ length: MOOD_COUNT }, () => 0)
  for (const e of entries) if (e.mood !== null && (only === null || e.mood === only)) counts[e.mood] += 1
  return sortShares(counts.map((count, i) => ({ key: String(i), count })))
}

export function mostCommonMood(entries: CheckIn[]): number | null {
  const s = moodShares(entries)
  return s.length ? Number(s[0].key) : null
}

/** Points for "Urges per Day" (the times-you-had-urges number of each day). */
export const urgesSeries = (entries: CheckIn[]) => sorted(entries).map((e) => ({ date: e.date, value: e.urges }))

/** Points for the intensity charts: only days that had urges carry an intensity. */
export const intensitySeries = (entries: CheckIn[]) => sorted(entries).map((e) => ({ date: e.date, value: e.intensity }))

/** Mean of the daily intensity over all check-ins (one decimal as text). */
export function meanIntensity(entries: CheckIn[]): number | null {
  return mean(entries.map((e) => e.intensity))
}

export interface InsightNumbers {
  days: number
  streak: number
  urgeDays: number
  smokedDays: number
  avg: number | null
}

export function insightNumbers(entries: CheckIn[]): InsightNumbers {
  const s = sorted(entries)
  return {
    days: s.length,
    streak: trailingZeroDays(s.map((e) => e.urges)),
    urgeDays: s.filter((e) => e.urges > 0).length,
    smokedDays: s.filter((e) => e.smoked).length,
    avg: meanIntensity(s),
  }
}
