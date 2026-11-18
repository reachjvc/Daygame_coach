import { cigMoney, cigsAvoided, fracDays, wholeDays } from "../shared/calc"

export type DSetup = {
  startMs: number
  cigsPerDay: number
  packSize: number
  packPrice: number
}

export interface Overall {
  days: number
  cigs: number
  money: number
}

/** Four-tile row: whole days; cigarettes = fractional days x per-day count, floored; money = cigarettes x pack price / pack size. */
export function overall(s: DSetup, now: number): Overall {
  const cigs = cigsAvoided(s.cigsPerDay, fracDays(s.startMs, now))
  return { days: wholeDays(s.startMs, now), cigs, money: cigMoney(cigs, s.packPrice, s.packSize) }
}

export type AchState = "unlocked" | "locked" | "unsourced"

export interface Ach {
  id: string
  state: AchState
}

/** The achievements with a computable rule. "life" needs the unsourced time-won-back figure, so it stays unsourced. */
export function achievements(o: Overall): Ach[] {
  return [
    { id: "c5", state: o.cigs >= 5 ? "unlocked" : "locked" },
    { id: "c10", state: o.cigs >= 10 ? "unlocked" : "locked" },
    { id: "life", state: "unsourced" },
    { id: "d1", state: o.days >= 1 ? "unlocked" : "locked" },
  ]
}

export const unlockedCount = (list: Ach[]) => list.filter((a) => a.state === "unlocked").length
