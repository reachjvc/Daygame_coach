/**
 * SWITCHING A COPY FROM THE OLD TWELVE AREAS TO THE EIGHT THE OWNER PICKED.
 *
 * `foldAreas` is pure and deletes nothing: every goal, routine, weekly action,
 * experience and season area moves to its new area; the old area rows stay,
 * hidden, with their ratings and notes as history; a marker per old area says
 * where it went, so its old text can show under "From your earlier plan" on
 * the new one. An area it does not recognise is left exactly where it is.
 */

import type { NsArea, NsPlan } from "@/src/goals/types"
import { PLAN_AREAS } from "./copy/planAreas"
import { activeAreas, foldedKey } from "./planFacts"
import { setAreaHidden } from "./planChanges"

/** The old twelve, by their stable ids and by name (lower case), and the new area each one folds into. */
const OLD: { id: string; name: string; to: string }[] = [
  { id: "lm_health", name: "health", to: "health" },
  { id: "lm_fitness", name: "fitness", to: "health" },
  { id: "lm_mindset", name: "mind & beliefs", to: "growth" },
  { id: "lm_emotions", name: "emotions", to: "feeling" },
  { id: "lm_relationship", name: "relationship", to: "dating" },
  { id: "lm_mission", name: "mission & purpose", to: "career" },
  { id: "lm_money", name: "money", to: "career" },
  { id: "lm_family", name: "family", to: "social" },
  { id: "lm_friends", name: "friends", to: "social" },
  { id: "lm_fun", name: "fun", to: "lifestyle" },
  { id: "lm_contribution", name: "contribution", to: "growth" },
  { id: "lm_spirituality", name: "spirituality", to: "growth" },
]

const NEW_IDS = new Set<string>(PLAN_AREAS.map((a) => a.id))

export interface FoldMatch {
  /** Old area id to new area id. */
  mapping: Record<string, string>
  /** Areas that are neither one of the eight nor one of the old twelve; they stay as they are. */
  unmatched: NsArea[]
}

/** Which of the plan's visible areas fold where: by id first, then by name without regard to case. */
export function matchOldAreas(plan: NsPlan): FoldMatch {
  const mapping: Record<string, string> = {}
  const unmatched: NsArea[] = []
  for (const a of activeAreas(plan)) {
    if (NEW_IDS.has(a.id)) continue
    const hit = OLD.find((o) => o.id === a.id) ?? OLD.find((o) => o.name === a.label.trim().toLowerCase())
    if (hit) mapping[a.id] = hit.to
    else unmatched.push(a)
  }
  return { mapping, unmatched }
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)]

/** Fold the old areas named in `mapping` into the eight, adding any of the eight the plan does not have yet. */
export function foldAreas(plan: NsPlan, mapping: Record<string, string>): NsPlan {
  if (Object.keys(mapping).length === 0) return plan
  const target = (id: string) => mapping[id] ?? id
  const have = new Set(plan.areas.map((a) => a.id))
  const added: NsArea[] = PLAN_AREAS.filter((a) => !have.has(a.id)).map((a) => ({ id: a.id, label: a.label, sublabel: a.covers, color: a.color, custom: false }))
  let next: NsPlan = {
    ...plan,
    // The eight first, in his order, then everything that was here.
    areas: [...PLAN_AREAS.map((p) => added.find((a) => a.id === p.id) ?? plan.areas.find((a) => a.id === p.id)!).filter(Boolean), ...plan.areas.filter((a) => !NEW_IDS.has(a.id))],
    goals: plan.goals.map((g) => ({ ...g, areaId: target(g.areaId), serves: uniq(g.serves.map(target)).filter((id) => id !== target(g.areaId)) })),
    routines: plan.routines.map((r) => ({ ...r, areaId: r.areaId ? target(r.areaId) : r.areaId, serves: uniq(r.serves.map(target)).filter((id) => id !== (r.areaId ? target(r.areaId) : null)) })),
    experiences: plan.experiences.map((e) => ({ ...e, areaId: e.areaId ? target(e.areaId) : e.areaId })),
    seasonAreaIds: uniq(plan.seasonAreaIds.map(target)),
    seasonFocusId: plan.seasonFocusId ? target(plan.seasonFocusId) : plan.seasonFocusId,
    updatedAt: new Date().toISOString(),
  }
  const answers = { ...next.answers }
  for (const [old, to] of Object.entries(mapping)) answers[foldedKey(old)] = to
  next = { ...next, answers }
  for (const old of Object.keys(mapping)) next = setAreaHidden(next, old, true)
  return next
}

/** Old per-area text, by the new area it folded into: the area's own notes, shown read only. */
export function foldedNotes(plan: NsPlan, newAreaId: string): { from: string; text: string }[] {
  const out: { from: string; text: string }[] = []
  for (const a of plan.areas) {
    if (plan.answers[foldedKey(a.id)] !== newAreaId) continue
    const r = plan.review[a.id]
    if (!r) continue
    for (const t of [r.snapshot, r.purpose, r.identity, r.ten, r.blockers]) if (t?.trim()) out.push({ from: a.label, text: t.trim() })
  }
  return out
}
