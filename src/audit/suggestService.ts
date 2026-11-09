/**
 * SUGGESTIONS THAT FINISH YOUR WORDS (Plans/energy-audit.md, D-SUGGEST).
 *
 * Empty field: your most frequent activities. While typing, only the words up
 * to the cursor are matched, with the rules the Thoughts page used
 * (`src/shared/textMatch.ts`): same wording first, then word starts, then
 * small spelling slips, most frequent first.
 */

import { matchPhrases } from "@/src/shared/textMatch"

export interface ActivityCount {
  activity: string
  count: number
}

export const TOP_CHIPS = 6

/** The most frequent activities, for the empty field. */
export function topActivities(counts: readonly ActivityCount[], limit = TOP_CHIPS): ActivityCount[] {
  return [...counts].sort((a, b) => b.count - a.count || a.activity.localeCompare(b.activity)).slice(0, limit)
}

/** Past activities matching what is typed before the cursor, best first. */
export function matchActivities(textBeforeCursor: string, items: readonly ActivityCount[], limit = TOP_CHIPS): ActivityCount[] {
  return matchPhrases(textBeforeCursor, items, (i) => i.activity, (i) => [i.count], limit)
}

/**
 * Put a picked suggestion into the field. The match was made on every word up
 * to the cursor, so the phrase already holds those words: it replaces the
 * field from its start to its end. (Replacing only from the edited word would
 * repeat the words before it: "Gym ar" + "Gym arms" would read "Gym Gym arms".)
 * Returns the new text and where the cursor goes: its end.
 */
export function applySuggestion(field: string, cursor: number, phrase: string): { text: string; cursor: number } {
  void field
  void cursor
  return { text: phrase, cursor: phrase.length }
}
