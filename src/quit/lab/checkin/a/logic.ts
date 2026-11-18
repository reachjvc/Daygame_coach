import { addDays, longestRun, pick, pseudo, streakEnding } from "../shared/logic"

export interface Review {
  sober: boolean
  /** 0 Easy, 1 Not bad, 2 Questionable, 3 Hard, 4 Impossible. */
  difficulty: number
  /** 0 to 4 into the face list, or null when no mood was set. */
  mood: number | null
  activities: string[]
  note: string
}

export interface DayA {
  pledge: boolean
  review?: Review
}

export type DaysA = Record<string, DayA>

export const ACTIVITIES = ["Family", "Friends", "Dating", "Exercising"] as const

/**
 * Example data: 14 days. Pledged on each of the last six days (streak 6, the
 * checklist for today starts at 0 of 2), a gap seven days back, then older days
 * pledged except one. Every pledged day has a review; one has no mood.
 */
export function seedDaysA(today: string): DaysA {
  const out: DaysA = {}
  for (let i = 1; i <= 13; i++) {
    if (i === 7 || i === 10) continue
    const date = addDays(today, -i)
    out[date] = {
      pledge: true,
      review: {
        sober: true,
        difficulty: [0, 1, 2, 0, 1, 3, 0, 1, 2, 0, 1, 0, 1][i - 1],
        mood: i === 2 ? null : Math.floor(pseudo(i + 3) * 3),
        activities: [pick(ACTIVITIES, i), pick(ACTIVITIES, i + 9)].filter((a, k, l) => l.indexOf(a) === k),
        note: i % 3 === 0 ? "A quiet evening, kept busy." : "",
      },
    }
  }
  return out
}

export const pledgeDates = (days: DaysA): Set<string> => new Set(Object.keys(days).filter((k) => days[k].pledge))

export const pledgeStreak = (days: DaysA, today: string) => streakEnding(pledgeDates(days), today)

export const bestPledgeRun = (days: DaysA) => longestRun(pledgeDates(days))

/** Segments filled in the seven-day challenge bar. */
export const challengeFill = (streak: number) => Math.min(7, streak)

/** Jobs done today out of two: the pledge and the review. */
export const checklistDone = (day: DayA | undefined) => (day?.pledge ? 1 : 0) + (day?.review ? 1 : 0)

/** Notes written through the review, newest first. */
export function notesOf(days: DaysA): { date: string; note: string }[] {
  return Object.keys(days)
    .filter((k) => days[k].review?.note.trim())
    .sort()
    .reverse()
    .map((date) => ({ date, note: days[date].review!.note }))
}

/** Index of the message of a day, so the same day always shows the same message. */
export function messageIndex(dateKey: string, count: number): number {
  let n = 0
  for (const ch of dateKey) n = (n * 31 + ch.charCodeAt(0)) % 9973
  return n % count
}
