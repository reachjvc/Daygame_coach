/** THE CHANGES THE JOURNAL QUESTIONS AND DAILY RATINGS SCREENS MAKE, as pure functions over `NsPlan`. */

import type { NsFieldKind, NsPlan } from "@/src/goals/types"
import { addDailyField, setDailyFieldKind, setDailyFieldSource } from "@/src/goals/northStarService"
import { ROUTES } from "@/src/shared/routes"

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** One more question (of a kind). A blank or a repeat (same words, same kind) adds nothing. Returns the new field's id. */
export function addField(plan: NsPlan, label: string, kind: NsFieldKind): { plan: NsPlan; id: string | null } {
  const text = label.trim()
  if (!text || plan.fields.some((f) => f.kind === kind && same(f.label, text))) return { plan, id: null }
  const before = new Set(plan.fields.map((f) => f.id))
  const next = addDailyField(plan, null, text, kind)
  return { plan: next, id: next.fields.find((f) => !before.has(f.id))?.id ?? null }
}

/** Several questions at once; the ids made, in order. */
export function addFields(plan: NsPlan, labels: string[], kind: NsFieldKind): { plan: NsPlan; ids: string[] } {
  let next = plan
  const ids: string[] = []
  for (const l of labels) {
    const made = addField(next, l, kind)
    next = made.plan
    if (made.id) ids.push(made.id)
  }
  return { plan: next, ids }
}

/** Where a question shows: a goal or step id, or null for the day itself. */
export function setFieldWhere(plan: NsPlan, id: string, targetId: string | null): NsPlan {
  if (!plan.fields.some((f) => f.id === id)) return plan
  return { ...plan, fields: plan.fields.map((f) => (f.id === id ? { ...f, targetId } : f)), updatedAt: new Date().toISOString() }
}

/** A link a question may open: a page of the new version. */
export const isPlanLink = (path: string): boolean => path.startsWith(`${ROUTES.planNew}/`) || path === ROUTES.planNew

/**
 * What a question is. `write` keeps any earlier answers; `read` needs a source id; `go` needs a link inside the
 * new version (anything else leaves the plan as it was).
 */
export function setFieldKind(plan: NsPlan, id: string, kind: "write" | "read" | "go", source: string | null): NsPlan {
  if (!plan.fields.some((f) => f.id === id)) return plan
  if (kind === "go" && !(source && isPlanLink(source.trim()))) return plan
  let next = setDailyFieldKind(plan, id, kind)
  next = setDailyFieldSource(next, id, kind === "write" ? null : source?.trim() || null)
  return next
}
