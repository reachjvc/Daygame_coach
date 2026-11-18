import { monthly, weekly, wholeDays, yearly } from "../shared/calc"

export type BSetup = {
  startMs: number
  cigsPerDay: number
  packSize: number
  packPrice: number
  /** 1 when started with the example data. */
  seeded: number
}

export interface Craving {
  day: string
  strength: number
  smoked: boolean
}

export const perDay = (s: BSetup) => (s.cigsPerDay / Math.max(1, s.packSize)) * s.packPrice

/** Cigarettes not smoked: whole days times the per-day count. */
export function notSmoked(s: BSetup, now: number): number {
  return wholeDays(s.startMs, now) * s.cigsPerDay
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Money kept: whole days without smoking times the daily rate, minus what he spent on cigarettes and on replacements since. */
export function savedMoney(s: BSetup, now: number, spentCigs: number, spentNrt: number): number {
  return round2(wholeDays(s.startMs, now) * perDay(s) - spentCigs - spentNrt)
}

/** Period rows from the same daily rate. */
export function periods(s: BSetup) {
  const d = perDay(s)
  return { day: round2(d), week: weekly(d), month: monthly(d), year: yearly(d) }
}

export const TIME_LADDER = [1, 7, 30, 90, 365] as const
export const MONEY_LADDER = [50, 100, 250, 500, 1000] as const
export const CIG_LADDER = [20, 100, 500, 1000] as const
export const DIARY_LADDER = [1, 10] as const

export interface BadgeInput {
  days: number
  money: number
  cigs: number
  cravings: number
  wish: boolean
  motive: boolean
}

export interface Badge {
  id: string
  family: "time" | "money" | "count" | "diary" | "setup"
  value: number
  earned: boolean
}

/** Every badge with its earned state; families: time, money, count not smoked, diary use, setup actions. */
export function badges(i: BadgeInput): Badge[] {
  const out: Badge[] = [{ id: "setup", family: "setup", value: 1, earned: true }]
  for (const t of TIME_LADDER) out.push({ id: `time-${t}`, family: "time", value: t, earned: i.days >= t })
  for (const t of MONEY_LADDER) out.push({ id: `money-${t}`, family: "money", value: t, earned: i.money >= t })
  for (const t of CIG_LADDER) out.push({ id: `count-${t}`, family: "count", value: t, earned: i.cigs >= t })
  for (const t of DIARY_LADDER) out.push({ id: `diary-${t}`, family: "diary", value: t, earned: i.cravings >= t })
  out.push({ id: "wish", family: "setup", value: 1, earned: i.wish })
  out.push({ id: "motive", family: "setup", value: 1, earned: i.motive })
  return out
}

/** Diary rows: per day, how many cravings and the average strength. */
export function diaryRows(list: Craving[]) {
  const by = new Map<string, Craving[]>()
  for (const c of list) by.set(c.day, [...(by.get(c.day) ?? []), c])
  return [...by.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, items]) => ({
      day,
      count: items.length,
      avg: items.reduce((s, c) => s + c.strength, 0) / items.length,
      smoked: items.some((c) => c.smoked),
    }))
}
