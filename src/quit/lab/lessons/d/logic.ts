/** Money as dollars; whole amounts without cents. Null (no input typed) gives null. */
export function money(n: number | null): string | null {
  if (n === null || !Number.isFinite(n)) return null
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`
}

export const MONEY_STEPS = [20, 200, 300, 400, 500, 600] as const

export interface BadgeInput {
  day: number
  saved: number | null
  buddy: boolean
  reminders: boolean
  reasons: boolean
  played: boolean
}

/** Which badges are earned, by group id and index. Only rules the names or the screens state; the rest stay grey. */
export function earnedBadges(i: BadgeInput): Record<string, boolean[]> {
  const weeks = [8, 15, 22, 29]
  return {
    stay: [true, true, ...weeks.map((w) => i.day >= w), false],
    health: [true, false, false, false, false, false, false, false, false, false, false, false],
    money: MONEY_STEPS.map((m) => i.saved !== null && i.saved >= m),
    engage: [i.buddy, false, i.played, i.reminders, i.reasons, false, false, false],
  }
}

export function countEarned(e: Record<string, boolean[]>): number {
  return Object.values(e).reduce((n, a) => n + a.filter(Boolean).length, 0)
}

/** Month grid: weeks of seven cells, null where the cell is outside the month. Monday first. */
export function monthCells(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}
