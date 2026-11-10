/**
 * The council's shapes and its one number, with no catalogue import, so client
 * components can use them without bundling every profile.
 */
export const COUNCIL_MAX = 5

export interface CouncilMember {
  roleModelId: string
  position: number
  takenValues: string[]
  addedAt: string
}

/**
 * What the plan's screens need about each council member: Today's card, the
 * "What would he do?" sheet and the weekly review's question.
 */
export interface CouncilPersonDetails {
  id: string
  name: string
  years: string
  color: string
  pronoun: "he" | "she"
  quotes: Array<{ text: string; place: string; translation?: string }>
  principles: string[]
  question: { text: string; principle: string }
}

/** Whole days since 1970-01-01 for a "YYYY-MM-DD" date. */
function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number)
  return Math.floor(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / 86_400_000)
}

/** Today's council member: the day number modulo the council's size, in council order. */
export function memberForDay<T>(members: readonly T[], date: string): T | null {
  if (members.length === 0) return null
  const n = dayNumber(date)
  return members[((n % members.length) + members.length) % members.length]
}

/** Which of his quotes Today shows: changes weekly, so a one-man council does not repeat one line forever. */
export function quoteForDay<T>(quotes: readonly T[], date: string): T | null {
  if (quotes.length === 0) return null
  return quotes[Math.floor(dayNumber(date) / 7) % quotes.length]
}

/** Values taken from the council and not yet in the plan's list, each with who it came from. */
export function councilValueSuggestions(
  members: readonly CouncilMember[],
  names: Record<string, string>,
  planValues: readonly string[],
): Array<{ value: string; from: string }> {
  const have = new Set(planValues.map((v) => v.trim().toLowerCase()))
  const out: Array<{ value: string; from: string }> = []
  for (const m of [...members].sort((a, b) => a.position - b.position)) {
    for (const v of m.takenValues) {
      const key = v.toLowerCase()
      if (have.has(key)) continue
      have.add(key)
      out.push({ value: v, from: names[m.roleModelId] ?? m.roleModelId })
    }
  }
  return out
}
