/** What could stop you (E5): obstacles hang on goals; the fallback is the obstacle's counter. Pure. */

import { addObstacle, updateGoal, updateObstacle } from "@/src/goals/northStarService"
import type { NsObstacle, NsPlan } from "@/src/goals/types"
import { activeObstacles, activeSeasonGoals, isActive, protectedId } from "../planFacts"
import type { EarlierNote } from "../earlierNotes"

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** The goal an obstacle starts on: the protected item's goal, else the first season goal, else the first active goal. */
export function defaultGoalId(plan: NsPlan): string | null {
  const p = protectedId(plan)
  if (p) {
    if (plan.goals.some((g) => g.id === p && isActive(g))) return p
    const step = plan.routines.flatMap((r) => r.steps).find((s) => s.id === p)
    const served = step?.servesGoalIds.find((id) => plan.goals.some((g) => g.id === id && isActive(g)))
    if (served) return served
  }
  return activeSeasonGoals(plan)[0]?.id ?? plan.goals.find(isActive)?.id ?? null
}

/** Add the problems not already named on any active goal. Returns the plan and the new obstacles' ids, in order. */
export function addProblems(plan: NsPlan, whats: string[], goalId: string): { plan: NsPlan; ids: string[] } {
  let next = plan
  const ids: string[] = []
  const have = activeObstacles(plan).map((o) => o.obstacle.what)
  for (const raw of whats) {
    const what = raw.trim()
    if (!what || have.some((h) => same(h, what))) continue
    have.push(what)
    const before = new Set(next.goals.find((g) => g.id === goalId)?.obstacles.map((o) => o.id))
    next = addObstacle(next, goalId, what)
    const made = next.goals.find((g) => g.id === goalId)?.obstacles.find((o) => !before.has(o.id))
    if (made) ids.push(made.id)
  }
  return { plan: next, ids }
}

export function findObstacle(plan: NsPlan, obstacleId: string): { goalId: string; obstacle: NsObstacle } | null {
  for (const g of plan.goals) {
    const o = g.obstacles.find((x) => x.id === obstacleId)
    if (o) return { goalId: g.id, obstacle: o }
  }
  return null
}

/** Move an obstacle to another goal; the text and fallback travel with it. */
export function moveProblem(plan: NsPlan, obstacleId: string, toGoalId: string): NsPlan {
  const at = findObstacle(plan, obstacleId)
  if (!at || at.goalId === toGoalId || !plan.goals.some((g) => g.id === toGoalId)) return plan
  const from = plan.goals.find((g) => g.id === at.goalId)!
  const to = plan.goals.find((g) => g.id === toGoalId)!
  const moved = updateGoal(plan, from.id, { obstacles: from.obstacles.filter((o) => o.id !== obstacleId) })
  return updateGoal(moved, to.id, { obstacles: [...to.obstacles, at.obstacle] })
}

export function setFallback(plan: NsPlan, obstacleId: string, text: string): NsPlan {
  const at = findObstacle(plan, obstacleId)
  return at && at.obstacle.counter !== text ? updateObstacle(plan, at.goalId, obstacleId, { counter: text }) : plan
}

export const SUPPORT_KEY = "support"
export const setHelp = (plan: NsPlan, text: string): NsPlan =>
  (plan.answers[SUPPORT_KEY] ?? "") === text ? plan : { ...plan, answers: { ...plan.answers, [SUPPORT_KEY]: text }, updatedAt: new Date().toISOString() }

/** Old text no new screen asks for. Topic keys: `stoppers`, `beliefs`, `review_blockers:<areaId>`. */
export function obstaclesNotes(plan: NsPlan): EarlierNote[] {
  const t = (s: string | undefined) => (s ?? "").trim()
  const out: EarlierNote[] = []
  if (t(plan.answers["stoppers"])) out.push({ topic: "stoppers", text: t(plan.answers["stoppers"]) })
  for (const a of plan.areas) if (t(plan.review[a.id]?.blockers)) out.push({ topic: `review_blockers:${a.id}`, text: t(plan.review[a.id].blockers) })
  for (const g of plan.goals) for (const b of g.beliefs) {
    const x = [b.old, b.evidence, b.replacement].map(t).filter(Boolean).join(" · ")
    if (x) out.push({ topic: "beliefs", text: x })
  }
  return out
}
