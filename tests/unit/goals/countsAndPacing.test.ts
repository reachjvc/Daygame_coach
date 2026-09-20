/**
 * TWO KINDS THAT TURNED OUT TO BE BUILT ALREADY, AND ONE THAT ONLY HALF WAS.
 *
 * Item 15 of the owner's concept list — "lav Z ting", do Z things — and the
 * second half of item 22: a goal finished by reaching a total rather than by a
 * date. And item 27: a to-do with twenty items that should be done in twenty
 * days, paced.
 *
 * These are here because the honest answer to "does the product do this" was
 * not obvious from reading, and a claim that something works is worth exactly
 * as much as the test that proves it. The verdict, checked:
 *
 *   Item 15 / 22 — WORKS, through the ordinary climb. No new machinery.
 *   Item 27 — the pacing was already written and had nowhere to land until
 *             stages existed. It lands now, on the plan side. The goals hub
 *             draws the stages but not their dates; that is a screen, not a
 *             shape, and it is not what these assert.
 */

import { describe, it, expect } from "vitest"
import { addGoal, emptyNsPlan, goalMilestones, updateGoal } from "@/src/goals/northStarService"
import { goalToInsert } from "@/src/goals/northStarTrackService"
import { badgesForGoal } from "@/src/goals/goalAchievementsService"
import { progressPercent } from "@/src/db/goalProgress"
import type { DailyGoalSnapshotRow, UserGoalRow } from "@/src/db/goalTypes"

const RUN = "run-1"

describe("item 15 — a count of things, finished by reaching a total", () => {
  /** The owner's real Deep Work Hours goal: 0 to 500 hours in total. */
  function total(start: number, target: number) {
    const seed = addGoal(emptyNsPlan(), "lm_money", "Deep Work Hours", "milestone_ladder")
    const plan = updateGoal(seed, seed.goals[0].id, {
      unit: "hours in total",
      ladder: { start, target, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
    })
    return goalToInsert(plan, RUN, plan.goals[0])
  }

  it("is a counter that runs to the total", () => {
    const insert = total(0, 500)
    expect(insert.tracking_type).toBe("counter")
    expect(insert.current_value).toBe(0)
    expect(insert.target_value).toBe(500)
  })

  it("reports progress against the total, counting from where it began", () => {
    // Comfort Zone Challenges in his plan starts at 1, not 0, which is exactly
    // the case the old current/target formula got wrong.
    const row = { current_value: 1, target_value: 100, milestone_config: { start: 1, target: 100 } }
    expect(progressPercent(row)).toBe(0)
    expect(progressPercent({ ...row, current_value: 50 })).toBe(49)
  })
})

describe("item 22 — a rate you hold, rewarded by a lifetime total", () => {
  /**
   * "Even though the goal is to approach 25 a week, you can have an achievement
   * for having approached 100 in total." The rate is the goal; the total is a
   * reward alongside it, and it is not the same number as the weekly target.
   */
  const practice = (): UserGoalRow =>
    ({
      id: "g1", user_id: "u1", title: "Approaches", category: "daygame", life_area: "daygame",
      goal_type: "habit_ramp", tracking_type: "counter", period: "weekly",
      target_value: 5, current_value: 0, milestone_config: null,
      is_abstinence: false, stages: null,
    }) as UserGoalRow

  /** Weeks of five approaches each. */
  const weeks = (n: number, each: number): DailyGoalSnapshotRow[] => {
    const out: DailyGoalSnapshotRow[] = []
    const d = new Date("2026-01-05T00:00:00Z")
    for (let i = 0; i < n; i++) {
      out.push({
        id: `s${i}`, user_id: "u1", goal_id: "g1", snapshot_date: d.toISOString().slice(0, 10),
        current_value: each, target_value: 5, was_complete: each >= 5,
        current_streak: 0, best_streak: 0, period: "weekly", created_at: d.toISOString(),
      } as DailyGoalSnapshotRow)
      d.setUTCDate(d.getUTCDate() + 7)
    }
    return out
  }

  it("earns the hundred at a hundred approaches, whatever the weekly target is", () => {
    const ids = badgesForGoal(practice(), weeks(20, 5), "2027-01-01").map((b) => b.ruleId)
    expect(ids).toContain("total_100")
    expect(ids).not.toContain("total_365")
  })

  it("has not earned it at ninety-five", () => {
    const ids = badgesForGoal(practice(), weeks(19, 5), "2027-01-01").map((b) => b.ruleId)
    expect(ids).not.toContain("total_100")
  })
})

describe("item 27 — twenty things, twenty days, one a day", () => {
  const TODAY = "2026-03-01"

  function todoList(items: number, days: number) {
    const seed = addGoal(emptyNsPlan(), "lm_mission", "Clear the backlog", "achievement")
    const goal = seed.goals[0]
    const due = new Date(`${TODAY}T00:00:00Z`)
    due.setUTCDate(due.getUTCDate() + days)
    return updateGoal(seed, goal.id, {
      targetDate: due.toISOString().slice(0, 10),
      checkpoints: Array.from({ length: items }, (_, i) => ({
        id: `c${i}`, title: `Item ${i + 1}`, done: false, celebration: "",
      })),
    })
  }

  it("all twenty reach the goal as named stages", () => {
    const plan = todoList(20, 20)
    const insert = goalToInsert(plan, RUN, plan.goals[0])

    expect(insert.stages).toHaveLength(20)
    expect(insert.stages?.[0]).toBe("Item 1")
    expect(insert.target_value).toBe(20)
  })

  it("and they are paced, roughly one a day, to the date", () => {
    const plan = todoList(20, 20)
    const all = goalMilestones(plan.goals[0], TODAY)

    // Twenty items plus the goal itself on its due date.
    expect(all).toHaveLength(21)
    expect(all.filter((m) => m.kind === "checkpoint")).toHaveLength(20)
    expect(all[all.length - 1].kind).toBe("finish")

    // Evenly spread between today and the due date: never two days apart, and
    // never all bunched on the deadline.
    const items = all.filter((m) => m.kind === "checkpoint")
    const gaps = items.slice(1).map((m, i) => {
      const a = new Date(`${items[i].date}T00:00:00Z`).getTime()
      const b = new Date(`${m.date}T00:00:00Z`).getTime()
      return Math.round((b - a) / 86400000)
    })
    expect(Math.max(...gaps)).toBeLessThanOrEqual(1)
    expect(new Set(items.map((m) => m.date)).size).toBeGreaterThan(15)
  })

  it("a list with no date is not paced, because nothing says when", () => {
    /* `addGoal` stamps every new goal with a DEFAULT target date
       (`defaultGoalDate`), which is why 47 of the owner's 50 goals carry one of
       two identical dates that he never chose. Clearing it is what "no date"
       actually looks like in this plan. */
    const seed = addGoal(emptyNsPlan(), "lm_mission", "Someday list", "achievement")
    const plan = updateGoal(seed, seed.goals[0].id, {
      targetDate: null,
      checkpoints: [{ id: "c1", title: "A thing", done: false, celebration: "" }],
    })
    expect(plan.goals[0].targetDate).toBeNull()
    expect(goalMilestones(plan.goals[0], TODAY)).toEqual([])
    // It still crosses over as a stage, though — the names are not lost.
    expect(goalToInsert(plan, RUN, plan.goals[0]).stages).toEqual(["A thing"])
  })
})
