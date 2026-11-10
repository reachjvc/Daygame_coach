import { ROLE_MODEL_CATEGORY_MAP, type RoleModelCategoryId } from "./categories"
import { PEOPLE } from "./data/index.generated"
import type { RoleModelPerson } from "./types"
import { initialsOf, type RoleModelCardData, yearsLabel } from "./format"
import { canonicalValueWord } from "./valueWords"

export { filterCards, initialsOf, possessiveOf, type RoleModelCardData, yearsLabel } from "./format"

/**
 * Reads of the catalogue. The files are bundled at build time (D1), so nothing
 * here touches the database or the file system.
 *
 * Only `validated` people are ever shown. `flagged` people wait for the owner's
 * mark (O4), `draft` people for their checks, and `excluded` and
 * `proposed-remove` never show.
 */
export function shownPeople(all: readonly RoleModelPerson[] = PEOPLE): RoleModelPerson[] {
  return all.filter((p) => p.review.status === "validated").sort((a, b) => a.name.localeCompare(b.name))
}

export function shownPerson(id: string, all: readonly RoleModelPerson[] = PEOPLE): RoleModelPerson | null {
  return shownPeople(all).find((p) => p.id === id) ?? null
}

/** The list's own spelling of each value, so "courage" in a file reads "Courage" on the page. */
export function valueWordsOf(p: RoleModelPerson): string[] {
  return p.values.map((v) => canonicalValueWord(v.word) ?? v.word)
}

export function cardOf(p: RoleModelPerson): RoleModelCardData {
  const cat = ROLE_MODEL_CATEGORY_MAP.get(p.category as RoleModelCategoryId)
  const words = valueWordsOf(p)
  return {
    id: p.id,
    name: p.name,
    years: yearsLabel(p),
    tagline: p.tagline,
    category: p.category as RoleModelCategoryId,
    categoryLabel: cat?.label ?? p.category,
    color: cat?.color ?? "#555555",
    initials: initialsOf(p.name),
    values: words.slice(0, 3),
    search: [p.name, ...words].join(" ").toLowerCase(),
  }
}


/** One person offered in a life area: who, where he started, and his profile. */
export interface AreaPerson {
  id: string
  name: string
  years: string
  color: string
  startedFrom: string
  inCouncil: boolean
}

/**
 * "People who lived this at a 10" (Plans/role-models.md, Phase 9): up to
 * `limit` shown people whose areas include `areaId`. Your council first, then
 * people from categories that serve the area, then the rest; within each, by
 * name. Only validated people ever appear (`shownPeople`).
 */
export function peopleForArea(
  areaId: string,
  councilIds: readonly string[],
  limit = 3,
  all: readonly RoleModelPerson[] = PEOPLE,
): AreaPerson[] {
  const council = new Set(councilIds)
  const rank = (p: RoleModelPerson) => {
    if (council.has(p.id)) return 0
    const cat = ROLE_MODEL_CATEGORY_MAP.get(p.category as RoleModelCategoryId)
    return cat?.areaIds.includes(areaId) ? 1 : 2
  }
  return shownPeople(all)
    .filter((p) => p.areaIds.includes(areaId))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((p) => {
      const card = cardOf(p)
      return { id: p.id, name: p.name, years: card.years, color: card.color, startedFrom: p.startedFrom, inCouncil: council.has(p.id) }
    })
}
