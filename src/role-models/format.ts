import type { RoleModelCategoryId } from "./categories"
import type { RoleModelPerson } from "./types"

/**
 * Pure helpers the browser needs. Nothing here imports the catalogue, so a
 * client component can use them without shipping every profile (catalog.ts
 * holds the reads of the data, server side).
 */
function yearText(y: number | string): string {
  if (typeof y === "string") return y
  return y < 0 ? `${-y} BC` : String(y)
}

/** "121–180", "c. 4 BC–65", "born 1989" for the living, "living" when no source gives the year. */
export function yearsLabel(p: Pick<RoleModelPerson, "born" | "died">): string {
  if (p.born === null) return p.died === null ? "living" : `died ${yearText(p.died)}`
  if (p.died === null) return `born ${yearText(p.born)}`
  return `${yearText(p.born)}–${yearText(p.died)}`
}

/** First letters of the first and last name: "Marcus Aurelius" is "MA". */
export function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\s-]/gu, "")
    .split(/\s+/)
    .filter((w) => w && !/^(jr|sr|ii|iii|iv)$/i.test(w))
  if (words.length === 0) return "?"
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ""
  return (first + last).toUpperCase()
}

/** What a card needs, and nothing more: the gallery's client code never carries whole profiles. */
export interface RoleModelCardData {
  id: string
  name: string
  years: string
  tagline: string
  category: RoleModelCategoryId
  categoryLabel: string
  color: string
  initials: string
  values: string[]
  /** every value word, lower case, for search only */
  search: string
}

/** Cards matching a search (name or any value word) and a category; an empty query matches all. */
export function filterCards(cards: readonly RoleModelCardData[], query: string, category: string | null): RoleModelCardData[] {
  const q = query.trim().toLowerCase()
  return cards.filter((c) => (!category || c.category === category) && (!q || c.search.includes(q)))
}

/** "his" or "her", for headings like "His shadow". */
export function possessiveOf(p: Pick<RoleModelPerson, "pronoun">): { lower: string; title: string; subject: string } {
  return p.pronoun === "she" ? { lower: "her", title: "Her", subject: "she" } : { lower: "his", title: "His", subject: "he" }
}
