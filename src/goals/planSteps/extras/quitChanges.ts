/** THE CHANGES THE QUIT SCREENS MAKE, as pure functions over `NsPlan`. */

import type { NsGoal, NsPlan } from "@/src/goals/types"
import { addGoal, addObstacle, updateGoal, updateObstacle } from "@/src/goals/northStarService"
import { addDaysISO } from "@/src/goals/northStarService"
import { periodOf } from "@/src/goals/reviewService"
import { addToSeason, setAnswer, setPracticeNumbers } from "../planChanges"
import { activeAreas, quitGoals, tierKey } from "../planFacts"
import { quitCopy } from "../copy/quit"
import { fill } from "../text"

export const quitTitle = (habit: string) => fill(quitCopy.what.goal_title, { habit: habit.trim() })

/** The habit a quit goal is about, read back off its title. */
export function habitOf(goal: NsGoal): string {
  const prefix = fill(quitCopy.what.goal_title, { habit: "" })
  return goal.title.startsWith(prefix) && prefix ? goal.title.slice(prefix.length) : goal.title
}

/** The area a quit goal is filed in: the vices area, else a "vice" area, else the first season area, else the first area. */
export function quitAreaId(plan: NsPlan): string | null {
  const areas = activeAreas(plan)
  const vices = areas.find((a) => a.id === "vices") ?? areas.find((a) => /vice/i.test(a.label))
  if (vices) return vices.id
  const seasonArea = plan.seasonAreaIds.find((id) => areas.some((a) => a.id === id))
  return seasonArea ?? areas[0]?.id ?? plan.areas[0]?.id ?? null
}

/** Start the quit goal for a habit, or rename the one there is. Returns the goal's id. */
export function setQuitHabit(plan: NsPlan, habit: string): { plan: NsPlan; id: string } | null {
  const name = habit.trim()
  if (!name) return null
  const existing = quitGoals(plan)[0]
  if (existing) {
    const old = habitOf(existing)
    let next = updateGoal(plan, existing.id, { title: quitTitle(name) })
    // The urge's own words follow the habit.
    const was = fill(quitCopy.urge.obstacle_what, { habit: old })
    for (const o of existing.obstacles) if (o.what === was) next = updateObstacle(next, existing.id, o.id, { what: fill(quitCopy.urge.obstacle_what, { habit: name }) })
    return { plan: next, id: existing.id }
  }
  const areaId = quitAreaId(plan)
  if (!areaId) return null
  const before = new Set(plan.goals.map((g) => g.id))
  let next = addGoal(plan, areaId, quitTitle(name), "habit_ramp")
  const made = next.goals.find((g) => !before.has(g.id))
  if (!made) return null
  next = updateGoal(next, made.id, { isAbstinence: true, targetDate: null, daysPerWeek: 7 })
  next = setAnswer(next, tierKey(made.id), "season")
  if (next.season) next = addToSeason(next, made.id)
  return { plan: next, id: made.id }
}

/** Clean days a week to start with, and whether to build up to seven from there (two weeks at each step). */
export function setQuitDays(plan: NsPlan, goalId: string, days: number, buildUp: boolean): NsPlan {
  const per = Math.max(1, Math.min(7, Math.round(days)))
  const ease = buildUp && per < 7 ? Array.from({ length: 7 - per + 1 }, (_, i) => ({ frequencyPerWeek: per + i, durationWeeks: 2 })) : null
  return setPracticeNumbers(plan, goalId, { unit: "days", perWeek: per, ease })
}

/** What to do when the urge comes: one obstacle on the goal, its counter the answer. */
export function setQuitUrge(plan: NsPlan, goalId: string, then: string): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal || !then.trim()) return plan
  const first = goal.obstacles[0]
  if (first) return updateObstacle(plan, goalId, first.id, { counter: then.trim() })
  const next = addObstacle(plan, goalId, fill(quitCopy.urge.obstacle_what, { habit: habitOf(goal) }))
  const made = next.goals.find((g) => g.id === goalId)!.obstacles.at(-1)!
  return updateObstacle(next, goalId, made.id, { counter: then.trim() })
}

/** Clean days logged this week (Monday to Sunday). */
export function cleanDaysThisWeek(plan: NsPlan, goalId: string, today: string): number {
  const monday = periodOf("week", today).start
  let n = 0
  for (let i = 0; i < 7; i++) if ((plan.numbers[addDaysISO(monday, i)]?.[goalId] ?? 0) > 0) n++
  return n
}

/** The longest run of days in a row with a clean day logged. */
export function longestRun(plan: NsPlan, goalId: string): number {
  const dates = Object.keys(plan.numbers).filter((d) => (plan.numbers[d][goalId] ?? 0) > 0).sort()
  let best = 0, run = 0, prev = ""
  for (const d of dates) {
    run = prev && addDaysISO(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}
