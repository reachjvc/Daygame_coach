import { lastDays, rnd, sortShares, type Share } from "../shared/logic"

/** Trigger index -> category index (1 feelings, 2 people, 3 activities, 5 places, 6 food and drinks; 4 personal has none seen). */
export const TRIGGER_CATEGORY = [1, 1, 1, 1, 2, 2, 2, 3, 3, 5, 6, 6] as const
export const TRIGGER_COUNT = TRIGGER_CATEGORY.length

export interface Craving {
  at: number
  date: string
  /** trigger indexes */
  tags: number[]
  ex?: boolean
}

export interface Note {
  at: number
  date: string
  mood: "neutral" | "smile"
  title: string
  body: string
  ex?: boolean
}

/** Share of each trigger among all tags of the cravings; one craving may carry several tags. `category` 0 pools all. */
export function triggerShares(cravings: Craving[], category: number): Share[] {
  const counts = Array.from({ length: TRIGGER_COUNT }, () => 0)
  for (const c of cravings) for (const t of c.tags) if (t >= 0 && t < TRIGGER_COUNT && (category === 0 || TRIGGER_CATEGORY[t] === category)) counts[t] += 1
  return sortShares(counts.map((count, i) => ({ key: String(i), count })))
}

/** 14 days of example cravings ending the day before `now`; one or two cravings on most days. */
export function seedCravings(now: number): Craving[] {
  const out: Craving[] = []
  lastDays(now - 86_400_000, 14).forEach((date, i) => {
    const n = rnd(i + 7) < 0.25 ? 0 : rnd(i + 8) < 0.5 ? 1 : 2
    for (let k = 0; k < n; k++) {
      const first = Math.floor(rnd(i * 5 + k + 60) * TRIGGER_COUNT)
      const tags = rnd(i * 7 + k + 70) < 0.4 ? [first, (first + 5) % TRIGGER_COUNT] : [first]
      out.push({ at: new Date(`${date}T${String(9 + k * 5).padStart(2, "0")}:30:00`).getTime(), date, tags, ex: true })
    }
  })
  return out
}

export function seedNotes(now: number, titles: readonly string[], bodies: readonly string[]): Note[] {
  const days = lastDays(now - 86_400_000, 14)
  return [11, 6, 1].map((d, i) => ({
    at: new Date(`${days[d]}T20:00:00`).getTime(),
    date: days[d],
    mood: i === 0 ? ("neutral" as const) : ("smile" as const),
    title: titles[i],
    body: bodies[i],
    ex: true,
  }))
}
