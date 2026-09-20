/**
 * A GOAL YOU DO NOT DO. Item 14 of the owner's concept list: "gør aldrig Y".
 *
 * THE DEFECT THESE PIN, from his live plan on 2026-09-19. His "No weed" goal
 * was stored as a weekly practice with `daysPerWeek: 3` — the template's
 * default, kept by the abstinence repair — and pushed as a WEEKLY COUNTER with
 * a target of three. So the product recorded "be weed-free three times this
 * week". Clean on Monday, Tuesday and Wednesday and the goal read 100%
 * complete with a streak of one, while he smoked the other four days.
 *
 * A prohibition is not a quota. It is a day at a time, and the reward is the
 * days that accumulate — never a streak, because one bad day deleting the
 * record of two hundred good ones is the thing that makes people stop opening
 * the app. That is the quit-vice module's own research verdict, two screens
 * away, and the goal system used to contradict it.
 */

import { describe, it, expect } from "vitest"
import {
  addGoal,
  emptyNsPlan,
  loadNsPlan,
  readsAsAbstinence,
  serializeNsPlan,
  updateGoal,
} from "@/src/goals/northStarService"
import { goalToInsert } from "@/src/goals/northStarTrackService"
import { badgesForGoal } from "@/src/goals/goalAchievementsService"
import type { DailyGoalSnapshotRow, UserGoalRow } from "@/src/db/goalTypes"

const RUN = "run-1"

function planWith(title: string, type: "achievement" | "habit_ramp" | "milestone_ladder" = "achievement") {
  const plan = addGoal(emptyNsPlan(), "lm_health", title, type)
  return { plan, goal: plan.goals[0] }
}

describe("the plan records that a goal is a thing not to do", () => {
  it("reads the line once, when it is typed", () => {
    expect(planWith("No weed").goal.isAbstinence).toBe(true)
    expect(planWith("Quit porn").goal.isAbstinence).toBe(true)
    expect(planWith("Run a marathon").goal.isAbstinence).toBe(false)
  })

  it("does not read a line that only sounds like one", () => {
    // `readsAsAbstinence` requires the bare "no X" form to name something a
    // person does. "No pain in my back" is an outcome, not a habit.
    expect(readsAsAbstinence("No pain in my back")).toBe(false)
    expect(planWith("No pain in my back").goal.isAbstinence).toBe(false)
  })

  it("is a stored fact afterwards, so renaming cannot change the kind", () => {
    // The title used to be re-read on every load, so editing "No weed" to
    // "Weekends only" would silently turn it back into an ordinary goal.
    const { plan, goal } = planWith("No weed")
    const renamed = updateGoal(plan, goal.id, { title: "Weekends only" })
    const reloaded = loadNsPlan(serializeNsPlan(renamed))!
    expect(reloaded.goals[0].isAbstinence).toBe(true)
  })

  it("still repairs one filed as a finish line", () => {
    // Written before the rule existed, it sat under the things you want to
    // have DONE, asking for a date by which you will have finished not smoking.
    const { plan } = planWith("No weed", "achievement")
    const raw = serializeNsPlan({ ...plan, goals: plan.goals.map((g) => ({ ...g, type: "achievement" as const })) })
    const loaded = loadNsPlan(raw)!
    expect(loaded.goals[0].type).toBe("habit_ramp")
    expect(loaded.goals[0].daysPerWeek).toBe(7)
  })
})

describe("what No weed becomes when it is pushed", () => {
  it("is a day at a time, not three times a week", () => {
    const { plan, goal } = planWith("No weed")
    const insert = goalToInsert(plan, RUN, goal)

    expect(insert.period).toBe("daily") // was "weekly"
    expect(insert.tracking_type).toBe("boolean") // was "counter"
    expect(insert.target_value).toBe(1) // was 3
    expect(insert.is_abstinence).toBe(true)
  })

  it("the owner's own goal, with the day count that caused it", () => {
    // daysPerWeek 3 is exactly what his plan carried. It used to become the
    // weekly target; it is now irrelevant, because every day is its own answer.
    const { plan, goal } = planWith("No weed")
    const withThree = updateGoal(plan, goal.id, { daysPerWeek: 3 })
    expect(goalToInsert(withThree, RUN, withThree.goals[0]).target_value).toBe(1)
  })

  it("an ordinary practice is untouched", () => {
    const { plan, goal } = planWith("Workout", "habit_ramp")
    const withRate = updateGoal(plan, goal.id, { daysPerWeek: 5 })
    const insert = goalToInsert(withRate, RUN, withRate.goals[0])
    expect(insert.period).toBe("weekly")
    expect(insert.target_value).toBe(5)
    expect(insert.is_abstinence).toBeUndefined()
  })
})

describe("how a day clean is rewarded", () => {
  const row = (over: Partial<UserGoalRow> = {}): UserGoalRow =>
    ({
      id: "g1", user_id: "u1", title: "No weed", category: "health", life_area: "health",
      goal_type: "recurring", tracking_type: "boolean", period: "daily",
      target_value: 1, current_value: 1, milestone_config: null, is_abstinence: true,
      ...over,
    }) as UserGoalRow

  /** One clean day per row, which is what a daily boolean snapshots. */
  const days = (n: number): DailyGoalSnapshotRow[] => {
    const out: DailyGoalSnapshotRow[] = []
    const d = new Date("2026-01-01T00:00:00Z")
    for (let i = 0; i < n; i++) {
      out.push({
        id: `s${i}`, user_id: "u1", goal_id: "g1", snapshot_date: d.toISOString().slice(0, 10),
        current_value: 1, target_value: 1, was_complete: true,
        current_streak: 0, best_streak: 0, period: "daily", created_at: d.toISOString(),
      } as DailyGoalSnapshotRow)
      d.setUTCDate(d.getUTCDate() + 1)
    }
    return out
  }

  it("earns no streak badge, however long the run", () => {
    const ids = badgesForGoal(row(), days(400), "2027-06-01").map((b) => b.ruleId)
    expect(ids.filter((i) => i.startsWith("streak_"))).toEqual([])
  })

  it("earns the days instead — the number that only goes up", () => {
    const ids = badgesForGoal(row(), days(120), "2027-06-01").map((b) => b.ruleId)
    expect(ids).toContain("total_10")
    expect(ids).toContain("total_50")
    expect(ids).toContain("total_100")
  })

  it("the same goal NOT marked as abstinence does earn streaks", () => {
    // The flag is the only thing that decides it. Nothing reads the title.
    const ids = badgesForGoal(row({ is_abstinence: false }), days(400), "2027-06-01").map((b) => b.ruleId)
    expect(ids.filter((i) => i.startsWith("streak_")).length).toBeGreaterThan(0)
  })
})
