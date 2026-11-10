import { cardOf, shownPerson, valueWordsOf } from "./catalog"
import { COUNCIL_MAX, type CouncilMember, type CouncilPersonDetails } from "./councilTypes"
import type { RoleModelPerson } from "./types"
import { canonicalValueWord } from "./valueWords"

/**
 * THE COUNCIL'S RULES (Plans/role-models.md, Phase 7).
 *
 * Seneca, Letter 11: keep a man of high character before your eyes. You pick one
 * to five people and, for each, the values you take from him: not all of them,
 * and only his. Pure functions; the route applies them before the repo writes,
 * and the database refuses a sixth on its own as well.
 */
export { COUNCIL_MAX, councilValueSuggestions, memberForDay, quoteForDay } from "./councilTypes"
export type { CouncilMember, CouncilPersonDetails } from "./councilTypes"

export type CouncilCheck =
  | { ok: true; takenValues: string[] }
  | { ok: false; status: 400 | 404 | 409; message: string }

export const COUNCIL_FULL_MESSAGE = "Your council has five people. Remove one before you add another."

/** Whether `takenValues` may be saved for `roleModelId`, given the council as it is now. */
export function checkCouncilPick(
  current: readonly CouncilMember[],
  roleModelId: string,
  takenValues: readonly string[],
  lookup: (id: string) => RoleModelPerson | null = shownPerson,
): CouncilCheck {
  const person = lookup(roleModelId)
  if (!person) return { ok: false, status: 404, message: "That person is not in the library." }
  const his = new Map(valueWordsOf(person).map((w) => [w.toLowerCase(), w]))
  const taken: string[] = []
  for (const raw of takenValues) {
    const word = canonicalValueWord(raw)
    const own = word ? his.get(word.toLowerCase()) : undefined
    if (!own) return { ok: false, status: 400, message: `"${raw}" is not one of ${person.name}'s values.` }
    if (!taken.includes(own)) taken.push(own)
  }
  if (taken.length === 0) return { ok: false, status: 400, message: "Take at least one of his values." }
  const already = current.some((m) => m.roleModelId === roleModelId)
  if (!already && current.length >= COUNCIL_MAX) return { ok: false, status: 409, message: COUNCIL_FULL_MESSAGE }
  return { ok: true, takenValues: taken }
}

/** The position a new member gets: the first free slot from the top. */
export function nextPosition(current: readonly CouncilMember[]): number {
  const used = new Set(current.map((m) => m.position))
  for (let i = 0; i < COUNCIL_MAX; i++) if (!used.has(i)) return i
  return COUNCIL_MAX - 1
}

/**
 * A new order for the council: exactly the current members, each once. Returns
 * the positions to write, or null when the list is not a reordering of them.
 */
export function reorderPositions(current: readonly CouncilMember[], order: readonly string[]): Map<string, number> | null {
  const ids = new Set(current.map((m) => m.roleModelId))
  if (order.length !== ids.size || new Set(order).size !== order.length || order.some((id) => !ids.has(id))) return null
  return new Map(order.map((id, i) => [id, i]))
}

/** Members in their order, and only those still shown in the library. */
export function visibleCouncil(
  members: readonly CouncilMember[],
  lookup: (id: string) => RoleModelPerson | null = shownPerson,
): CouncilMember[] {
  return members.filter((m) => lookup(m.roleModelId) !== null).sort((a, b) => a.position - b.position)
}

/** Reads an unknown request body as a pick: `{ roleModelId, takenValues }`. */
export function readPick(body: unknown): { roleModelId: string; takenValues: string[] } | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  const keys = Object.keys(b)
  if (keys.some((k) => k !== "roleModelId" && k !== "takenValues")) return null
  if (typeof b.roleModelId !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.roleModelId) || b.roleModelId.length > 80) return null
  if (!Array.isArray(b.takenValues) || b.takenValues.length > 5 || !b.takenValues.every((v) => typeof v === "string" && v.length <= 40)) return null
  return { roleModelId: b.roleModelId, takenValues: b.takenValues as string[] }
}

/** Reads an unknown request body as a reorder: `{ order: string[] }`. */
export function readOrder(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>
  if (Object.keys(b).length !== 1 || !Array.isArray(b.order)) return null
  if (b.order.length > COUNCIL_MAX || !b.order.every((v) => typeof v === "string" && v.length <= 80)) return null
  return b.order as string[]
}

/** Each member's details for the plan's screens (see CouncilPersonDetails). */
export function councilDetails(
  members: readonly CouncilMember[],
  lookup: (id: string) => RoleModelPerson | null = shownPerson,
): Record<string, CouncilPersonDetails> {
  const out: Record<string, CouncilPersonDetails> = {}
  for (const m of members) {
    const p = lookup(m.roleModelId)
    if (!p) continue
    const card = cardOf(p)
    const title = new Map(p.sources.map((s) => [s.id, s.title]))
    out[p.id] = {
      id: p.id,
      name: p.name,
      years: card.years,
      color: card.color,
      pronoun: p.pronoun ?? "he",
      quotes: p.quotes.map((q) => ({ text: q.text, place: `${title.get(q.sourceId) ?? ""}, ${q.locator}`, translation: q.translation })),
      principles: p.principles.map((x) => x.text),
      question: { text: p.councilQuestion.text, principle: p.principles[p.councilQuestion.principleIndex]?.text ?? "" },
    }
  }
  return out
}
