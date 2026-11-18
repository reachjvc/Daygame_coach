import { addDays, pseudo } from "../shared/logic"

export const ITEMS = ["mood", "energy", "sleep", "cravings"] as const
export type Item = (typeof ITEMS)[number]

export interface DayD {
  status: "dry" | "drank"
  /** Units, only on a day with a drink. */
  units?: number
  /** Each item 1 to 5 when recorded. */
  wellbeing: Partial<Record<Item, number>>
  note?: string
}

export type DaysD = Record<string, DayD>

/** Mean of the recorded wellbeing items of a day, or null when none was recorded. */
export function dayAverage(d: DayD | undefined): number | null {
  const v = ITEMS.map((i) => d?.wellbeing[i]).filter((x): x is number => typeof x === "number")
  return v.length === 0 ? null : v.reduce((s, x) => s + x, 0) / v.length
}

/** Mean of the day averages of one month, or null when no day has data. */
export function monthAverage(days: DaysD, ym: string): number | null {
  const v = Object.keys(days)
    .filter((k) => k.startsWith(ym))
    .map((k) => dayAverage(days[k]))
    .filter((x): x is number => x !== null)
  return v.length === 0 ? null : v.reduce((s, x) => s + x, 0) / v.length
}

export const dryCount = (days: DaysD, ym: string) => Object.keys(days).filter((k) => k.startsWith(ym) && days[k].status === "dry").length

export const unitsTotal = (days: DaysD, ym: string) => Object.keys(days).filter((k) => k.startsWith(ym)).reduce((s, k) => s + (days[k].units ?? 0), 0)

export const noteCount = (days: DaysD, ym: string) => Object.keys(days).filter((k) => k.startsWith(ym) && days[k].note?.trim()).length

/** One decimal, no trailing ".0". */
export const oneDecimal = (n: number) => String(Math.round(n * 10) / 10)

/** Example data: 14 days ending yesterday; three days with a drink, wellbeing on most days, notes on four. */
export function seedDaysD(today: string): DaysD {
  const out: DaysD = {}
  const drinks = new Map([
    [4, 3],
    [8, 5],
    [12, 2],
  ])
  for (let i = 1; i <= 14; i++) {
    const r = (n: number) => 1 + Math.floor(pseudo(i * 5 + n) * 5)
    const drank = drinks.has(i)
    out[addDays(today, -i)] = {
      status: drank ? "drank" : "dry",
      units: drank ? drinks.get(i) : undefined,
      wellbeing: i === 9 ? {} : { mood: Math.max(2, r(1)), energy: r(2), sleep: Math.max(2, r(3)), cravings: drank ? 4 : Math.min(3, r(4)) },
      note: i % 4 === 1 ? "Kept busy and went to bed early." : undefined,
    }
  }
  return out
}

/** Inserts starter words at the end of a note, on a new line when the note already has text. */
export function withStarter(note: string, starter: string): string {
  return note.trim() === "" ? starter : `${note.replace(/\s+$/, "")}\n${starter}`
}
