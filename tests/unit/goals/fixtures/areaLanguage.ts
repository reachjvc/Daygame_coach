/**
 * Whose language is this line written in?
 *
 * One rule, used by everything on the Life Mastery page that puts words in an
 * area before the person has: an area may speak its neighbours' language and
 * never a stranger's. A bench press in Money is not a small mistake — it says
 * the page has not understood its own question.
 *
 * It lives here rather than inside one test file because it is now enforced in
 * two places that must not be allowed to disagree: the catalogue of offers
 * (`northStarOffers.test.ts`) and the examples in the empty boxes
 * (`northStarAreaBoxes.test.tsx`). The catalogue was fixed first, the boxes
 * were not, and the same bug was reported again through the other door.
 *
 * "Belong" is decided against `AREA_KEYWORDS`, the same word lists the filing
 * guess uses, so the page and the filer cannot hold different opinions about
 * what Money is.
 */

import { AREA_KEYWORDS } from "@/src/goals/data/northStarStart"

/**
 * Which areas are neighbours.
 *
 * Areas overlap on purpose and the overlap is not the bug: Health should offer
 * stretching, Fitness should care about sleep, Money and Mission share the work
 * that produces income, and this product's inner game work is about approach
 * anxiety. What is NOT allowed is a jump across the map.
 */
export const NEIGHBOURHOODS: string[][] = [
  ["lm_health", "lm_fitness"],
  ["lm_mindset", "lm_emotions", "lm_spirituality"],
  ["lm_mission", "lm_money"],
  ["lm_relationship", "lm_family", "lm_friends", "lm_fun", "lm_contribution"],
]

/**
 * The inner work in this product IS approach work — "Inner Game First" is a set
 * about anxiety, comfort zones and cold showers, filed under Mind & Beliefs and
 * pointing at Relationship on purpose.
 */
export const CROSSINGS_ON_PURPOSE: Array<[string, string]> = [
  ["lm_mindset", "lm_relationship"],
  ["lm_emotions", "lm_relationship"],
  ["lm_mindset", "lm_contribution"],
]

/**
 * Words that mean different things in different areas, and so convict nobody.
 * "Text Game" is not gaming, "Sales & Networking" is not a social life, and
 * "read your north star out loud" is not a reading habit.
 */
export const AMBIGUOUS = new Set([
  "game", "notes", "read", "networking", "work", "sharing", "projects", "social-media-free",
  /**
   * The page's own vocabulary for a goal, which collides with two areas.
   *
   * "By a date" is the calendar, not Relationship. "A climb" is a ladder of
   * rungs, not the sport in Fun. Every explanation of what a target IS uses
   * both words, so leaving them convictable would make the copy around every
   * box unwritable in ten of the twelve areas.
   */
  "date", "climb",
])

const neighbourhoodOf = (areaId: string) => NEIGHBOURHOODS.findIndex((group) => group.includes(areaId))

export function allowed(offering: string, owner: string): boolean {
  if (offering === owner) return true
  const a = neighbourhoodOf(offering)
  const b = neighbourhoodOf(owner)
  if (a >= 0 && a === b) return true
  return CROSSINGS_ON_PURPOSE.some(([x, y]) => (x === offering && y === owner) || (x === owner && y === offering))
}

/**
 * Words that name exactly one area.
 *
 * A word on two lists ("sleep" is Health's and Fitness's) proves nothing about
 * where a title belongs, so only the exclusive ones can convict — and they must
 * match a whole word. Prefix matching made "workouts" the property of Mission,
 * via "work".
 */
export const OWNER = (() => {
  const seen = new Map<string, string[]>()
  for (const [areaId, words] of Object.entries(AREA_KEYWORDS)) {
    for (const word of words) seen.set(word, [...(seen.get(word) ?? []), areaId])
  }
  const owned = new Map<string, string>()
  for (const [word, areaIds] of seen) {
    if (areaIds.length === 1 && word.length >= 4 && !AMBIGUOUS.has(word)) owned.set(word, areaIds[0])
  }
  return owned
})()

/**
 * Which far-away area a line obviously belongs to, if any.
 *
 * Plurals count. The keyword lists are singular, and the first thing anybody
 * writes in a box is "5 pull-ups" or "24 books" — matching only the exact token
 * let the whole plural half of the language through, which is how a pull-up
 * ladder survived in Family.
 */
export function belongsElsewhere(title: string, areaId: string): string | null {
  const tokens = title.toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter(Boolean)
  for (const token of tokens) {
    const forms = [...new Set([token, token.replace(/s$/, "")])]
    // A word is ambiguous in BOTH numbers or in neither. "projects" is on the
    // exempt list and "project" is Mission's, so checking form by form
    // convicted "Projects Built" through the singular of an exempt word.
    if (forms.some((form) => AMBIGUOUS.has(form))) continue
    for (const form of forms) {
      const owner = OWNER.get(form)
      if (owner && !allowed(areaId, owner)) return `"${token}" belongs to ${owner}`
    }
  }
  return null
}
