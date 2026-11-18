import { addDays, dayKey, keyToMs } from "../../progress/shared/calc"

export { addDays, dayKey, keyToMs }

/** Whole days from one day key to another (to minus from), never negative. */
export function daysBetween(from: string, to: string): number {
  return Math.max(0, Math.round((keyToMs(to) - keyToMs(from)) / 86_400_000))
}

/** Age of a feed card: minutes under an hour, hours under a day, else days. */
export function ago(ms: number): { unit: "minutes" | "hours" | "days"; n: number } {
  const min = Math.max(0, Math.floor(ms / 60_000))
  if (min < 60) return { unit: "minutes", n: min }
  if (min < 1440) return { unit: "hours", n: Math.floor(min / 60) }
  return { unit: "days", n: Math.floor(min / 1440) }
}

/** Valid-looking email: something@something.tld. Only used to enable a button. */
export const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
