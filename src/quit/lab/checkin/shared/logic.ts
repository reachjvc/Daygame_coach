import { addDays, dayKey, keyToMs } from "../../progress/shared/calc"

export { addDays, dayKey, keyToMs }

/** Long date such as "Sunday, November 15". */
export function longDate(key: string, weekdays: readonly string[], months: readonly string[]): string {
  const d = new Date(keyToMs(key))
  return `${weekdays[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
}

/** Consecutive days in `set` ending today, or ending yesterday while today is still open. */
export function streakEnding(set: ReadonlySet<string>, today: string): number {
  let k = set.has(today) ? today : addDays(today, -1)
  let n = 0
  while (set.has(k)) {
    n++
    k = addDays(k, -1)
  }
  return n
}

/** Longest run of consecutive days in `set`. */
export function longestRun(set: ReadonlySet<string>): number {
  let best = 0
  for (const k of set) {
    if (set.has(addDays(k, -1))) continue
    let n = 0
    let c = k
    while (set.has(c)) {
      n++
      c = addDays(c, 1)
    }
    best = Math.max(best, n)
  }
  return best
}

/** Small deterministic number 0..1 from a seed, so the example data is the same on every open. */
export function pseudo(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Pick from a list by a seed. */
export function pick<T>(list: readonly T[], seed: number): T {
  return list[Math.floor(pseudo(seed) * list.length) % list.length]
}

/** The `n` day keys ending today, newest first. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, -i))
}

/** Month key `YYYY-MM`. */
export const monthOf = (key: string) => key.slice(0, 7)

/** Monday-first grid cells of a month: day keys, with null for leading blanks. */
export function monthGrid(ym: string): (string | null)[] {
  const [y, m] = ym.split("-").map(Number)
  const first = new Date(y, m - 1, 1)
  const lead = (first.getDay() + 6) % 7
  const count = new Date(y, m, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= count; d++) cells.push(dayKey(new Date(y, m - 1, d).getTime()))
  return cells
}

/** Previous month key. */
export function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  return dayKey(new Date(y, m - 2, 1).getTime()).slice(0, 7)
}
