import { DAY } from "../../progress/shared/calc"
import { round2 } from "../shared/logic"

export interface Habit {
  /** Index into the habit list. */
  type: number
  /** Spend per day, in money. */
  spend: number
  startMs: number
}

export interface Entry {
  ms: number
  note: string
  relapse: boolean
  spend: number
}

export interface Reward {
  id: string
  name: string
  price: number
  bought: boolean
}

const days = (from: number, to: number) => Math.max(0, to - from) / DAY

/** Latest moment the clock restarted: the start, or the newest relapse entry that is not in the future. */
export function lastRestart(habit: Habit, entries: Entry[], now: number): number {
  const restarts = entries.filter((e) => e.relapse && e.ms <= now).map((e) => Math.max(e.ms, habit.startMs))
  return Math.max(habit.startMs, ...restarts)
}

/** Savings from the beginning: spend per day times every day since the start (the stretches join up, so a relapse does not remove them). */
export const savingsFromBeginning = (habit: Habit, now: number): number => round2(habit.spend * days(habit.startMs, now))

/** Savings since abstinence began: spend per day times the days since the clock last restarted. */
export const savingsSinceRestart = (habit: Habit, entries: Entry[], now: number): number => round2(habit.spend * days(lastRestart(habit, entries, now), now))

/** Money already spent on rewards bought. */
export const purchasedTotal = (rewards: Reward[]): number => round2(rewards.filter((r) => r.bought).reduce((a, r) => a + r.price, 0))

/** Money entered as spent on relapses. */
export const relapseSpend = (entries: Entry[]): number => round2(entries.filter((e) => e.relapse).reduce((a, e) => a + e.spend, 0))

/** Current balance: savings from the beginning minus rewards bought minus relapse spend. */
export const currentBalance = (habit: Habit, entries: Entry[], rewards: Reward[], now: number): number =>
  round2(savingsFromBeginning(habit, now) - purchasedTotal(rewards) - relapseSpend(entries))

/** A reward's progress: balance over price, at most 100, whole percent. */
export const rewardPct = (balance: number, price: number): number => (price > 0 ? Math.min(100, Math.max(0, Math.floor((balance / price) * 100 + 1e-9))) : 0)

/** Balance after buying a reward. */
export const balanceAfter = (balance: number, price: number): number => round2(balance - price)

/** Projected savings at a chosen date: savings to date plus spend per day times the days still to go. */
export function projectedAt(habit: Habit, now: number, dateMs: number): number {
  return round2(savingsFromBeginning(habit, now) + habit.spend * days(now, dateMs))
}
