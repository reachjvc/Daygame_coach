import { NS_VALUE_LIBRARY } from "@/src/goals/data/northStar"

/**
 * The only words a role model's values may use: the life plan's list.
 *
 * Four value lists existed when the library was planned (life plan, inner game,
 * and two database tables). The plan lives in this one, so a role model's value
 * can be taken straight into it. A word missing here is added to
 * `NS_VALUE_GROUPS` (after the owner has seen it on the decision page), never
 * invented in a person file.
 */
export const ROLE_MODEL_VALUE_WORDS: readonly string[] = NS_VALUE_LIBRARY

const BY_LOWER = new Map(ROLE_MODEL_VALUE_WORDS.map((w) => [w.toLowerCase(), w]))

/** The list's own spelling of a word, compared without case; `null` when it is not on the list. */
export function canonicalValueWord(word: string): string | null {
  return BY_LOWER.get(word.trim().toLowerCase()) ?? null
}

export function isValueWord(word: string): boolean {
  return canonicalValueWord(word) !== null
}
