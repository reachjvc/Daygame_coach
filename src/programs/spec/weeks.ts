/**
 * "1-11", "12", "1,3,5-7" — week sets, read and written.
 */

import type { WeekSet } from "./types"

/** The longest program the format holds. */
export const MAX_WEEKS = 52

const PART = /^(\d{1,2})(?:-(\d{1,2}))?$/

/**
 * The weeks a set names, ascending and without repeats, or a sentence saying
 * why it cannot be read. A range written backwards ("5-3") is refused rather
 * than flipped: the person meant something, and guessing which is how a
 * program quietly does the wrong thing.
 */
export function parseWeekSet(set: WeekSet): { weeks: number[] } | { error: string } {
  const text = set.replace(/\s+/g, "")
  if (!text) return { error: "no weeks are named" }
  const out = new Set<number>()
  for (const part of text.split(",")) {
    const m = part.match(PART)
    if (!m) return { error: `"${part}" is not a week or a range of weeks like 1-4` }
    const from = Number(m[1])
    const to = m[2] ? Number(m[2]) : from
    if (from < 1 || to < 1) return { error: "weeks start at 1" }
    if (to < from) return { error: `"${part}" runs backwards` }
    if (to > MAX_WEEKS) return { error: `week ${to} is past the longest program (${MAX_WEEKS} weeks)` }
    for (let w = from; w <= to; w++) out.add(w)
  }
  return { weeks: [...out].sort((a, b) => a - b) }
}

/** The weeks a set names. Throws on a set the schema would have refused. */
export function weeksIn(set: WeekSet): number[] {
  const parsed = parseWeekSet(set)
  if ("error" in parsed) throw new Error(`Week set "${set}": ${parsed.error}`)
  return parsed.weeks
}

export function weekSetHas(set: WeekSet | undefined, week: number): boolean {
  return set != null && weeksIn(set).includes(week)
}

/** Weeks back to the shortest text: [1,2,3,5] → "1-3,5". */
export function formatWeekSet(weeks: readonly number[]): WeekSet {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b)
  const parts: string[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`)
    i = j + 1
  }
  return parts.join(",")
}
