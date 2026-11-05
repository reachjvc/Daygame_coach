/**
 * READINGS ON A NUMBER GOAL (Plans/life-plan-readings.md): the days its number
 * was taken, and how far along the climb the latest one is.
 *
 * Stefan: "I'm going to check in with my body weight and take pictures of
 * myself and measurements on a weekly basis" (tYCT57Onfas). The owner's item
 * 3, goals that scale up, and item 21, tracking all the time. A reading is
 * the goal's number on a day (`setGoalReading`), so its history is the days
 * that hold one.
 *
 * Pure.
 */

import type { NsGoal, NsPlan } from "./types"

export interface Reading {
  date: string
  value: number
}

/** True for a goal that takes readings: a number to climb, not wired to the area's daily ratings. */
export function takesReadings(goal: NsGoal): boolean {
  return goal.type === "milestone_ladder" && goal.metric !== "daily_area" && goal.ladder != null
}

/** Every reading up to `upTo`, oldest first. */
export function readingsOf(plan: NsPlan, goalId: string, upTo: string): Reading[] {
  return Object.entries(plan.numbers ?? {})
    .filter(([date, row]) => date <= upTo && typeof row[goalId] === "number")
    .map(([date, row]) => ({ date, value: row[goalId] }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** The latest reading up to `upTo`, or null. */
export function latestReading(plan: NsPlan, goalId: string, upTo: string): Reading | null {
  const all = readingsOf(plan, goalId, upTo)
  return all.length > 0 ? all[all.length - 1] : null
}

/**
 * How far from the climb's start to its target a value is, 0 to 1 (more
 * than 1 past the target). Works both ways: a weight to lose climbs down.
 * Null when start and target are the same number.
 */
export function climbFraction(goal: NsGoal, value: number): number | null {
  if (!goal.ladder) return null
  const { start, target } = goal.ladder
  if (start === target) return null
  return Math.max(0, (value - start) / (target - start))
}
