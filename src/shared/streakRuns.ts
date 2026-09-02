/**
 * A RUN OF CONSECUTIVE PERIODS — one implementation, for every streak.
 *
 * Pure: dates in, numbers out, no clock and no database. It exists because the
 * same rule was written twice and the two copies disagreed. The daygame streak
 * never went down at all; the health streak (`getConsecutiveTrainingWeeks`) went
 * down every Monday morning, because it started counting at the current week and
 * stopped the moment it found a week with nothing in it — so ten weeks of
 * training read as 0 until you trained again.
 *
 * COUNTING AND HIDING ARE DIFFERENT JOBS, and keeping them apart is the whole
 * point of this file. This counts. It answers "how long is the run that ends
 * with the last period in this list", and nothing else — it does not know what
 * day it is and cannot decide whether that run is still alive.
 *
 * Whether to SHOW it is `isStreakCurrent` in `dateUtils`, applied at the moment
 * of display (`gateStreaks`). That split means a stored streak is the truth
 * about what somebody achieved, the screen shows only what is live, and neither
 * can quietly become the other. Before the split, one path gated on write, one
 * gated on read, and a comment said the opposite of the code.
 */

export interface StreakRun {
  /** The length of the run ending at the last period. NOT gated — see above. */
  run: number
  /** The longest run anywhere in the list. Never decays. */
  longest: number
  /** The last period in the list, or null when the list is empty. */
  last: string | null
}

/**
 * @param keys           period keys (Mondays, or YYYY-MM-DD days), ASCENDING and
 *                       already deduplicated — only the caller knows how its own
 *                       keys sort.
 * @param isConsecutive  does `b` directly follow `a`?
 */
export function streakRun(
  keys: string[],
  isConsecutive: (a: string, b: string) => boolean
): StreakRun {
  let run = 0
  let longest = 0
  for (let i = 0; i < keys.length; i++) {
    run = i > 0 && isConsecutive(keys[i - 1], keys[i]) ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  return { run, longest, last: keys.at(-1) ?? null }
}

/**
 * `streakRun` over weeks, given the Mondays something happened in.
 *
 * Unsorted and duplicated input is fine here — a week is named by its Monday and
 * those sort lexicographically, which is a property of the key format rather
 * than of the caller, so this can do it safely.
 */
export function weeklyStreakRun(
  mondays: string[],
  previousOf: (monday: string) => string
): StreakRun {
  return streakRun([...new Set(mondays)].sort(), (a, b) => previousOf(b) === a)
}
