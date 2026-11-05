/**
 * WHERE A GOAL IS: active, achieved, paused or dropped (Plans/life-plan-goal-status.md).
 *
 * Stefan: "I go over the goals that I achieved. I go over the goals that I
 * didn't achieve"; "so I'm taking a break from that goal" (zuEb-1Ll2h8). And
 * his warning after reaching one: "I didn't set a new goal after that … my
 * intensity has diminished". The owner's item 2 (a goal is a condition you
 * reach) and item 32 (celebrating yourself after).
 *
 * Pure.
 */

import type { NsGoal, NsGoalStatus } from "./types"

export const GOAL_STATUSES = ["active", "achieved", "paused", "dropped"] as const satisfies readonly NsGoalStatus[]

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** A stored status, repaired: an unknown one is active, and only a goal that left active keeps a day. */
export function readGoalStatus(status: unknown, on: unknown): { status: NsGoalStatus; statusOn: string | null } {
  const s = GOAL_STATUSES.includes(status as NsGoalStatus) ? (status as NsGoalStatus) : "active"
  return { status: s, statusOn: s !== "active" && isDay(on) ? on : null }
}

/** True for a goal still being worked on: the only kind Today, Track and the review's list show. */
export function isActive(goal: Pick<NsGoal, "status">): boolean {
  return (goal.status ?? "active") === "active"
}
