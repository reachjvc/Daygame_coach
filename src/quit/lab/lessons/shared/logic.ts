export const DAY_MS = 86_400_000

/** Day number of a program: 1 on the start day, plus real whole days since, plus the lab skips. */
export function dayNumber(startedAt: number, now: number, skips: number): number {
  const elapsed = startedAt > 0 ? Math.max(0, Math.floor((now - startedAt) / DAY_MS)) : 0
  return 1 + elapsed + skips
}

/** In a list that opens in order, item i is open when every item above it is done. */
export function taskOpen(done: readonly boolean[], i: number): boolean {
  for (let k = 0; k < i; k++) if (!done[k]) return false
  return true
}

/** Week of a 28-day program, 1 to 4. */
export function weekOf(day: number): number {
  return Math.min(4, Math.max(1, Math.ceil(day / 7)))
}

/** Share of a program that is behind you, 0 to 1. */
export function arcFraction(day: number, total: number): number {
  return Math.min(1, Math.max(0, day / total))
}

/** Money not spent: what the user typed (items a day, cost of a pack) times whole days. Null if either is missing. */
export function savedAmount(perDay: number | null, packCost: number | null, days: number, packSize = 20): number | null {
  if (perDay === null || packCost === null || !Number.isFinite(perDay) || !Number.isFinite(packCost)) return null
  return (packCost / packSize) * perDay * Math.max(0, days)
}

/** Cost of one item of the pack. */
export function perItem(packCost: number | null, packSize = 20): number | null {
  return packCost === null || !Number.isFinite(packCost) ? null : packCost / packSize
}

/** Run of finished days that ends today, or yesterday when today is not finished yet. */
export function streakEnding(finished: readonly number[], today: number): number {
  const set = new Set(finished)
  let d = set.has(today) ? today : today - 1
  let n = 0
  while (d >= 1 && set.has(d)) {
    n += 1
    d -= 1
  }
  return n
}

/** Longest run of finished days anywhere. */
export function bestRun(finished: readonly number[]): number {
  const sorted = [...new Set(finished)].sort((a, b) => a - b)
  let best = 0
  let run = 0
  let prev = -10
  for (const d of sorted) {
    run = d === prev + 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** A course module opens when the one before it is done and its day has come (one module a day). */
export function moduleOpen(k: number, startDay: number, day: number, completed: readonly number[]): boolean {
  if (k === 1) return true
  return completed.includes(k - 1) && day >= startDay + k - 1
}

/** A journey day opens when the day before it is done and its day has come (inferred rule: one a day). */
export function journeyDayOpen(k: number, day: number, completed: readonly number[]): boolean {
  if (k === 1) return true
  return completed.includes(k - 1) && day >= k
}

/** Whole days and hours of a running streak given in hours. */
export function splitHours(hours: number): { days: number; hours: number } {
  const h = Math.max(0, Math.floor(hours))
  return { days: Math.floor(h / 24), hours: h % 24 }
}

/** Hours of a streak that started at `startedAt`, with lab skips counted as whole days. */
export function streakHours(startedAt: number, now: number, skips: number): number {
  const real = startedAt > 0 ? Math.max(0, now - startedAt) : 0
  return (real + skips * DAY_MS) / 3_600_000
}

/** Breath cycle length in seconds per tempo step: slowest to fastest. */
export const TEMPO_SECONDS = [12, 10, 8, 6, 4] as const

/** True during the first half of a breath cycle (breathing in). */
export function breatheIn(elapsedSeconds: number, cycle: number): boolean {
  return elapsedSeconds % cycle < cycle / 2
}

/** Date typed in a date field ("2026-11-18") to local midnight milliseconds; 0 when empty or invalid. */
export function dateToMs(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return 0
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
}

/** Local date as "YYYY-MM-DD". */
export function msToDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
