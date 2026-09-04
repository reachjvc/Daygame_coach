/**
 * THE SCREEN THAT PROPOSES AND NEVER CHANGES.
 *
 * "Not necessarily automatically" was the requirement, so the guarantee worth
 * testing is that `triage` is inert: it returns suggestions, mutates nothing,
 * and produces no row for a goal that is already fine.
 */

import { describe, it, expect } from "vitest"
import { triage, groupTriage, TRIAGE_PROBLEMS } from "@/src/goals/goalTriageService"
import type { UserGoalRow } from "@/src/db/goalTypes"

const goal = (over: Partial<UserGoalRow> = {}): UserGoalRow =>
  ({
    id: "g1", user_id: "u1", title: "Gym", life_area: "fitness", category: "fitness",
    goal_type: "habit_ramp", tracking_type: "counter", period: "weekly",
    target_value: 4, current_value: 0, is_archived: false,
    ...over,
  }) as UserGoalRow

describe("it proposes and never changes", () => {
  it("is pure — same input, same output, and the input is untouched", () => {
    const goals = [goal({ target_value: 1, tracking_type: "counter" }), goal({ id: "g2" })]
    const copy = structuredClone(goals)

    const once = triage(goals)
    const twice = triage(goals)

    expect(twice).toEqual(once)
    expect(goals).toEqual(copy)
  })

  it("names the one field accepting would change, and nothing else", () => {
    const rows = triage([goal({ tracking_type: "counter", target_value: 1 })])
    expect(rows).toHaveLength(1)
    expect(rows[0].fix).toEqual({ field: "tracking_type", to: "boolean" })
  })

  it("offers no fix where only the person can decide", () => {
    // Guessing an area from the words is the fault this whole area removed.
    const rows = triage([goal({ life_area: "custom" })])
    expect(rows[0].problem).toBe("no_area")
    expect(rows[0].fix).toBeNull()
  })
})

describe("it lists problems, not goals", () => {
  it("says nothing about a goal that is already clear", () => {
    expect(triage([goal()])).toEqual([])
  })

  it("ignores archived goals — they are on nobody's screen", () => {
    expect(triage([goal({ is_archived: true, life_area: "custom" })])).toEqual([])
  })

  it("gives a goal with two problems two rows, so neither hides the other", () => {
    const rows = triage([goal({ tracking_type: "counter", target_value: 1, life_area: "" })])
    expect(rows.map((r) => r.problem).sort()).toEqual(["counter_of_one", "no_area"])
  })
})

describe("each rule fires on the contradiction it names", () => {
  it("finds a counter that can only ever be one", () => {
    const rows = triage([goal({ goal_type: "milestone", tracking_type: "counter", target_value: 1 })])
    expect(rows.map((r) => r.problem)).toContain("counter_of_one")
  })

  it("treats an empty area and 'custom' as the same missing answer", () => {
    for (const life_area of ["", "   ", "custom"]) {
      expect(triage([goal({ life_area })]).map((r) => r.problem)).toContain("no_area")
    }
  })

  it("finds a rate that completes itself", () => {
    const rows = triage([goal({ goal_type: "recurring", target_value: 0 })])
    expect(rows.map((r) => r.problem)).toContain("practice_without_rate")
  })

  it("does not fire on a finish line, which is a boolean by design", () => {
    const finish = goal({ goal_type: "milestone", tracking_type: "boolean", target_value: 1 })
    expect(triage([finish])).toEqual([])
  })
})

describe("grouping for the screen", () => {
  it("keeps a stable order and drops empty groups", () => {
    const groups = groupTriage(triage([goal({ life_area: "custom" })]))
    expect(groups.map((g) => g.problem)).toEqual(["no_area"])
  })

  it("every problem it can report has a group it can appear in", () => {
    // Exhaustive both ways: a problem added without a heading would show a row
    // in no group, and vanish from the screen while the count still counted it.
    const all = triage([
      goal({ id: "a", tracking_type: "counter", target_value: 1 }),
      goal({ id: "b", life_area: "custom" }),
      goal({ id: "c", goal_type: "recurring", target_value: 0 }),
    ])
    expect(groupTriage(all).map((g) => g.problem).sort()).toEqual([...TRIAGE_PROBLEMS].sort())
  })

  it("says something a person can act on for every problem", () => {
    for (const row of triage([
      goal({ id: "a", tracking_type: "counter", target_value: 1 }),
      goal({ id: "b", life_area: "custom" }),
      goal({ id: "c", goal_type: "recurring", target_value: 0 }),
    ])) {
      expect(row.says.length, row.problem).toBeGreaterThan(30)
      expect(row.says, row.problem).not.toMatch(/tracking_type|life_area|target_value|goal_type/)
    }
  })
})
