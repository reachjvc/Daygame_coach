import { describe, it, expect } from "vitest"
import { addGoal, emptyNsPlan, normalizeNsPlan, serializeNsPlan, setGoalStatus, updateGoal } from "@/src/goals/northStarService"
import { trackActivities } from "@/src/goals/northStarTrackService"
import { readGoalStatus } from "@/src/goals/goalStatus"
import { allAchievements } from "@/src/goals/planAchievementsService"
import { goalsReadBack } from "@/src/goals/reviewReadBack"
import { periodOf } from "@/src/goals/reviewService"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import type { NsPlan } from "@/src/goals/types"

/**
 * A GOAL CAN BE ACHIEVED, PAUSED OR DROPPED (Plans/life-plan-goal-status.md):
 * kept with its history, off Today and Track, listed in the review of the
 * period it changed in, and an achieved one celebrated on its day.
 */

const NOW = "2026-11-05T09:00:00.000Z"
const TODAY = "2026-11-05"

function plan(): NsPlan {
  let p = addGoal(emptyNsPlan(), "lm_fitness", "Gym", "habit_ramp", NOW)
  p = updateGoal(p, p.goals[0].id, { daysPerWeek: 4 }, NOW)
  p = addGoal(p, "lm_fitness", "Squat 140 kg", "achievement", NOW)
  p = updateGoal(p, p.goals[1].id, { reward: "A steak dinner" }, NOW)
  return { ...p, numbers: { "2026-11-02": { [p.goals[0].id]: 1 } } }
}

describe("a goal's status", () => {
  it("is set with its day, back to active with none, and keeps the goal's counts", () => {
    const p0 = plan()
    const [gym] = p0.goals
    const paused = setGoalStatus(p0, gym.id, "paused", TODAY, NOW)
    expect(paused.goals[0]).toMatchObject({ status: "paused", statusOn: TODAY })
    expect(paused.numbers).toEqual(p0.numbers)
    expect(setGoalStatus(paused, gym.id, "paused", "2026-11-09", NOW)).toBe(paused)
    expect(setGoalStatus(paused, gym.id, "active", "2026-11-09", NOW).goals[0]).toMatchObject({ status: "active", statusOn: null })
  })

  it("takes a paused or dropped goal off Today and Track", () => {
    const p0 = plan()
    const [gym] = p0.goals
    expect(trackActivities(p0).some((a) => a.id === gym.id)).toBe(true)
    expect(trackActivities(setGoalStatus(p0, gym.id, "dropped", TODAY, NOW)).some((a) => a.id === gym.id)).toBe(false)
  })

  it("lists in the review what changed in its period, and reads back the goals worked on during it", () => {
    const p0 = plan()
    const [gym, squat] = p0.goals
    let p = setGoalStatus(p0, squat.id, "achieved", "2026-11-04", NOW)
    p = setGoalStatus(p, gym.id, "paused", "2026-10-20", NOW)
    const week = goalsReadBack(p, periodOf("week", TODAY), TODAY)
    expect(week.changed.map((g) => g.id)).toEqual([squat.id])
    // Set aside before the week began: not read back. Achieved inside it: still read back.
    expect(week.counted).toEqual([])
    expect(week.rest.map((g) => g.id)).toEqual([squat.id])
  })

  it("keeps a goal paused after a period in that period's review, with its counts", () => {
    const p0 = plan()
    const [gym] = p0.goals
    const october = { ...p0, numbers: { "2026-10-06": { [gym.id]: 1 }, "2026-10-08": { [gym.id]: 1 } } }
    const p = setGoalStatus(october, gym.id, "paused", "2026-11-03", NOW)
    const back = goalsReadBack(p, periodOf("month", "2026-10-15"), TODAY)
    expect(back.counted).toEqual([expect.objectContaining({ goal: expect.objectContaining({ id: gym.id }), count: 2 })])
    expect(back.changed).toEqual([])
  })

  it("stops a goal set aside from being the season's focus; an achieved one stays", () => {
    const p0 = { ...plan(), seasonFocusId: plan().goals[1].id }
    expect(setGoalStatus(p0, p0.goals[1].id, "dropped", TODAY, NOW).seasonFocusId).toBeNull()
    expect(setGoalStatus(p0, p0.goals[1].id, "achieved", TODAY, NOW).seasonFocusId).toBe(p0.goals[1].id)
  })

  it("celebrates an achieved goal on the day it was marked", () => {
    const p0 = plan()
    const p = setGoalStatus(p0, p0.goals[1].id, "achieved", TODAY, NOW)
    expect(allAchievements(p, TODAY)).toContainEqual(expect.objectContaining({ partTitle: "Squat 140 kg", label: "Achieved", earnedOn: TODAY }))
  })

  it("is kept through a save and the browser copy, and a damaged one reads as active", () => {
    const p0 = plan()
    const p = setGoalStatus(p0, p0.goals[1].id, "achieved", TODAY, NOW)
    const minted = new Map<string, string>()
    let n = 0
    const rows = planToRows(p, {
      planId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      idFor: (l) => minted.get(l) ?? minted.set(l, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`).get(l)!,
    })
    expect(rows.goals.map((g) => [g.status, g.status_on])).toEqual([["active", null], ["achieved", TODAY]])
    expect(rowsToPlan(rows)!.goals.map((g) => [g.status, g.statusOn])).toEqual([["active", null], ["achieved", TODAY]])
    expect(normalizeNsPlan(JSON.parse(serializeNsPlan(p)))!.goals[1]).toMatchObject({ status: "achieved", statusOn: TODAY })
    expect(readGoalStatus("finished", TODAY)).toEqual({ status: "active", statusOn: null })
    expect(readGoalStatus("active", TODAY)).toEqual({ status: "active", statusOn: null })
    // A row read before the column existed is active.
    const before = rows.goals.map((g) => {
      const old = { ...g }
      delete old.status
      delete old.status_on
      return old
    })
    expect(rowsToPlan({ ...rows, goals: before })!.goals[1].status).toBe("active")
  })
})
