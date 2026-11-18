/** Values (E2): the chosen list is `plan.values`; "matters most" is its first three; "where it shows" is each goal's own value list. Pure. */

import { setValues, updateGoal } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"
import { isActive } from "../planFacts"
import type { EarlierNote } from "../earlierNotes"
import { ONE_ANSWERS } from "@/src/goals/data/northStarStart"

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Append values, keeping the list's order and leaving out ones it already holds. */
export function addValues(plan: NsPlan, values: string[]): NsPlan {
  const next = [...plan.values]
  for (const raw of values) {
    const v = raw.trim()
    if (v && !next.some((x) => same(x, v))) next.push(v)
  }
  return next.length === plan.values.length ? plan : setValues(plan, next)
}

/** The picks (in tap order, at most three) go first; the rest keep their order after them. */
export function setMostImportant(plan: NsPlan, picks: string[]): NsPlan {
  const first: string[] = []
  for (const p of picks) {
    const own = plan.values.find((v) => same(v, p))
    if (own && !first.includes(own) && first.length < 3) first.push(own)
  }
  const next = [...first, ...plan.values.filter((v) => !first.includes(v))]
  return next.every((v, i) => v === plan.values[i]) ? plan : setValues(plan, next)
}

/** Active goals that carry the value in their own list, exactly these: others lose it. */
export function setValueServes(plan: NsPlan, value: string, goalIds: string[]): NsPlan {
  let next = plan
  for (const g of plan.goals.filter(isActive)) {
    const has = g.values.some((v) => same(v, value))
    const want = goalIds.includes(g.id)
    if (want && !has) next = updateGoal(next, g.id, { values: [...g.values, value] })
    if (!want && has) next = updateGoal(next, g.id, { values: g.values.filter((v) => !same(v, value)) })
  }
  return next
}

export function valuesNotes(plan: NsPlan): EarlierNote[] {
  const out: EarlierNote[] = []
  for (const a of plan.areas) {
    const v = plan.review[a.id]?.values ?? []
    if (v.length) out.push({ topic: "area_values", text: `${a.label}: ${v.join(", ")}` })
  }
  const note = (plan.answers[ONE_ANSWERS.values] ?? "").trim()
  if (note) out.push({ topic: "values_note", text: note })
  return out
}
