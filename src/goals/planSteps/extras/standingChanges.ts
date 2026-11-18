/** Where you stand (E1): one line per area, kept in the plan's own per-area review. Pure. */

import { setAreaReview, weekStartISO, addDaysISO } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"
import { activeAreas, isActive, weeklyItems } from "../planFacts"
import type { EarlierNote } from "../earlierNotes"

export const setStanding = (plan: NsPlan, areaId: string, text: string): NsPlan =>
  plan.areas.some((a) => a.id === areaId) && (plan.review[areaId]?.snapshot ?? "") !== text ? setAreaReview(plan, areaId, { snapshot: text }) : plan

/** The areas in the order the screens walk them: this season's areas first, then the rest in area order. */
export function standingOrder(plan: NsPlan): string[] {
  const active = activeAreas(plan).map((a) => a.id)
  const first = plan.seasonAreaIds.filter((id) => active.includes(id))
  return [...first, ...active.filter((id) => !first.includes(id))]
}

export interface AreaFacts {
  goals: number
  done: number
  planned: number
}

/** Active goals in the area, and this week's weekly items that serve them: done against planned. */
export function areaFacts(plan: NsPlan, areaId: string, today: string): AreaFacts {
  const goalIds = new Set(plan.goals.filter((g) => isActive(g) && g.areaId === areaId).map((g) => g.id))
  const monday = weekStartISO(today)
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i))
  let done = 0
  let planned = 0
  for (const item of weeklyItems(plan)) {
    const routine = plan.routines.find((r) => r.steps.some((s) => s.id === item.id))
    const inArea = item.serves.some((id) => goalIds.has(id)) || (item.kind === "step" && routine?.areaId === areaId)
    if (!inArea) continue
    const goal = plan.goals.find((g) => g.id === item.id)
    const step = routine?.steps.find((s) => s.id === item.id)
    const want = goal ? goal.perWeek ?? goal.daysPerWeek : step?.daysPerWeek ?? 0
    const did = item.kind === "goal" ? days.reduce((n, d) => n + (plan.numbers[d]?.[item.id] ?? 0), 0) : days.filter((d) => (plan.logged[d] ?? []).includes(item.id)).length
    planned += want
    done += Math.min(did, want)
  }
  return { goals: goalIds.size, done, planned }
}

/** Old text for one area that no new screen asks for. Topic keys are the module's `earlier_notes` words. */
export function standingNotes(plan: NsPlan, areaId: string): EarlierNote[] {
  const r = plan.review[areaId]
  if (!r) return []
  const t = (s: string | undefined) => (s ?? "").trim()
  const out: EarlierNote[] = []
  if (t(r.blockers)) out.push({ topic: "review_blockers", text: t(r.blockers) })
  if (r.values.length) out.push({ topic: "area_values", text: r.values.join(", ") })
  if (t(r.purpose)) out.push({ topic: "review_purpose", text: t(r.purpose) })
  if (t(r.ten)) out.push({ topic: "review_ten", text: t(r.ten) })
  if (t(r.identity)) out.push({ topic: "review_identity", text: t(r.identity) })
  return out
}
