/**
 * BADGES ON YOUR OWN GOALS.
 *
 * Fourteen rules applied to every goal, rather than 103 hand-written ones that
 * can only ever be about approaches. Every test here is either a rule that
 * would be wrong in a way nobody would notice, or a decision that would be
 * quietly reversed by somebody who did not know why it was made.
 */

import { describe, it, expect } from "vitest"
import { badgesForGoal, factsFor, earnedFor } from "@/src/goals/goalAchievementsService"
import {
  GOAL_ACHIEVEMENT_RULES,
  GOAL_RULE_IDS,
  isNextPeriod,
} from "@/src/goals/data/goalAchievementRules"
import type { UserGoalRow, DailyGoalSnapshotRow } from "@/src/db/goalTypes"

const TODAY = "2026-09-03"

const goal = (over: Partial<UserGoalRow> = {}): UserGoalRow =>
  ({
    id: "g1", user_id: "u1", title: "Gym", category: "fitness", life_area: "fitness",
    goal_type: "habit_ramp", tracking_type: "counter", period: "weekly",
    target_value: 4, current_value: 0, milestone_config: null,
    ...over,
  }) as UserGoalRow

const snap = (date: string, value: number, complete: boolean): DailyGoalSnapshotRow =>
  ({
    id: `s-${date}`, user_id: "u1", goal_id: "g1", snapshot_date: date,
    current_value: value, target_value: 4, was_complete: complete,
    current_streak: 0, best_streak: 0, period: "weekly", created_at: date,
  }) as DailyGoalSnapshotRow

/** Consecutive Mondays, so the calendar and the list agree. */
const mondays = (n: number, from = "2026-01-05") => {
  const out: string[] = []
  const d = new Date(`${from}T00:00:00Z`)
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return out
}

describe("the rule table is complete and honest", () => {
  it("has a rule for every id and an id for every rule", () => {
    expect(Object.keys(GOAL_ACHIEVEMENT_RULES).sort()).toEqual([...GOAL_RULE_IDS].sort())
  })

  it("gives every badge a label and a line a person would read", () => {
    for (const id of GOAL_RULE_IDS) {
      const rule = GOAL_ACHIEVEMENT_RULES[id]
      expect(rule.label.length, id).toBeGreaterThan(0)
      expect(rule.blurb.length, id).toBeGreaterThan(10)
      expect(rule.shapes.length, id).toBeGreaterThan(0)
    }
  })
})

describe("a rule only runs on the shapes it belongs to", () => {
  it("never asks a finish line how far up a climb it is", () => {
    const done = goal({ goal_type: "milestone", tracking_type: "boolean", target_value: 1, current_value: 1 })
    const ids = badgesForGoal(done, [], TODAY).map((b) => b.ruleId)
    expect(ids).not.toContain("climb_50")
    expect(ids).not.toContain("streak_4")
    expect(ids).toContain("complete")
  })

  it("never gives a climb a streak — there are no periods to hold", () => {
    const climb = goal({
      goal_type: "milestone", tracking_type: "counter", target_value: 100, current_value: 60,
      milestone_config: { start: 0, target: 100 },
    })
    const ids = badgesForGoal(climb, mondays(30).map((d) => snap(d, 4, true)), TODAY).map((b) => b.ruleId)
    expect(ids).not.toContain("streak_4")
    expect(ids).toContain("climb_50")
    expect(ids).not.toContain("climb_75")
  })
})

describe("streaks count calendar periods, not rows", () => {
  it("earns four-in-a-row on the fourth consecutive week", () => {
    const weeks = mondays(4)
    const b = badgesForGoal(goal(), weeks.map((d) => snap(d, 4, true)), TODAY)
    const streak = b.find((x) => x.ruleId === "streak_4")
    expect(streak?.earnedOn).toBe(weeks[3])
  })

  /**
   * THE ONE THAT WOULD HAVE BEEN WRONG SILENTLY. A missed period writes no
   * snapshot at all, so four complete weeks with a gap between them are four
   * adjacent ROWS and are not a streak of four. Counting list adjacency would
   * award it and nobody would ever notice.
   */
  it("does not count two runs of two as a run of four", () => {
    const early = mondays(2, "2026-01-05")
    const late = mondays(2, "2026-03-02")
    const rows = [...early, ...late].map((d) => snap(d, 4, true))
    expect(badgesForGoal(goal(), rows, TODAY).map((x) => x.ruleId)).not.toContain("streak_4")
  })

  it("knows which day follows which, per cadence", () => {
    expect(isNextPeriod("2026-01-05", "2026-01-12", "weekly")).toBe(true)
    expect(isNextPeriod("2026-01-05", "2026-01-06", "daily")).toBe(true)
    // Monthly period starts are the 1st, which is what this actually sees.
    expect(isNextPeriod("2026-01-01", "2026-02-01", "monthly")).toBe(true)
    expect(isNextPeriod("2026-12-01", "2027-01-01", "monthly")).toBe(true)
    expect(isNextPeriod("2026-01-01", "2026-04-01", "quarterly")).toBe(true)
    expect(isNextPeriod("2026-01-01", "2027-01-01", "yearly")).toBe(true)
    expect(isNextPeriod("2026-01-05", "2026-01-13", "weekly")).toBe(false)
    expect(isNextPeriod("2026-01-01", "2026-03-01", "monthly")).toBe(false)
    /* The overflow that broke the first version of this: `setUTCMonth(+1)` on
       the 31st gives March 3rd, so a naive implementation called this true. */
    expect(isNextPeriod("2026-01-31", "2026-03-03", "monthly")).toBe(false)
    // A custom period does not repeat, so nothing can follow anything.
    expect(isNextPeriod("2026-01-05", "2026-01-12", "custom")).toBe(false)
  })
})

describe("totals are dated to the day they were crossed", () => {
  it("dates one hundred to the week it was passed, not to today", () => {
    const weeks = mondays(30)
    const rows = weeks.map((d) => snap(d, 4, true))
    const b = badgesForGoal(goal(), rows, TODAY).find((x) => x.ruleId === "total_100")
    // 4 a week: 100 lands in week 25 (index 24).
    expect(b?.earnedOn).toBe(weeks[24])
    expect(b?.earnedOn).not.toBe(TODAY)
  })

  it("counts the period in progress, so the total matches the tracking page", () => {
    const rows = mondays(3).map((d) => snap(d, 4, true))
    const facts = factsFor(goal({ current_value: 3 }), rows, TODAY)
    expect(facts.totalByDate.at(-1)).toEqual([TODAY, 15])
  })
})

describe("a goal about stopping something", () => {
  /**
   * The quit-vice module has no streak counter by research verdict: a resetting
   * counter delivers both halves of the abstinence-violation effect. `user_goals`
   * zeroes `current_streak` on any missed period, so without this a "no weed"
   * goal would earn streak badges and contradict that verdict two screens away.
   */
  it("earns no streak badge at any history", () => {
    const rows = mondays(60).map((d) => snap(d, 7, true))
    const ids = badgesForGoal(goal({ target_value: 7 }), rows, TODAY, true).map((b) => b.ruleId)
    expect(ids.filter((i) => i.startsWith("streak_"))).toEqual([])
  })

  it("still earns the totals — the number that only goes up", () => {
    const rows = mondays(20).map((d) => snap(d, 7, true))
    const ids = badgesForGoal(goal({ target_value: 7 }), rows, TODAY, true).map((b) => b.ruleId)
    expect(ids).toContain("total_100")
  })

  it("is off unless the caller says so — never guessed from the title", () => {
    const rows = mondays(4).map((d) => snap(d, 4, true))
    const ids = badgesForGoal(goal({ title: "No weed" }), rows, TODAY).map((b) => b.ruleId)
    expect(ids).toContain("streak_4")
  })
})

describe("the same rows always give the same answer", () => {
  /** No clock and no randomness: two runs cannot disagree, and neither can two
   *  devices. This is what lets the badges be recomputed instead of stored. */
  it("is deterministic", () => {
    const rows = mondays(12).map((d) => snap(d, 4, true))
    expect(badgesForGoal(goal(), rows, TODAY)).toEqual(badgesForGoal(goal(), rows, TODAY))
  })

  it("does not care what order the snapshots arrive in", () => {
    const rows = mondays(6).map((d) => snap(d, 4, true))
    const forwards = badgesForGoal(goal(), rows, TODAY)
    const backwards = badgesForGoal(goal(), [...rows].reverse(), TODAY)
    expect(backwards).toEqual(forwards)
  })

  it("returns badges oldest first, the order they were lived", () => {
    const rows = mondays(30).map((d) => snap(d, 4, true))
    const dates = badgesForGoal(goal(), rows, TODAY).map((b) => b.earnedOn)
    expect([...dates].sort()).toEqual(dates)
  })
})

describe("a goal with no history", () => {
  it("earns nothing rather than throwing", () => {
    expect(badgesForGoal(goal(), [], TODAY)).toEqual([])
  })

  it("earns first_move as soon as anything is recorded this period", () => {
    const b = badgesForGoal(goal({ current_value: 1 }), [], TODAY)
    expect(b.map((x) => x.ruleId)).toContain("first_move")
    expect(b.find((x) => x.ruleId === "first_move")?.earnedOn).toBe(TODAY)
  })
})

describe("a descending climb", () => {
  /** 95 kg down to 85 kg. `current / target` reads 100% on day one, which is why
   *  goalToInsert pushes these as finish lines. A percentage badge here would be
   *  the same lie in a different place. */
  it("earns no climb badge", () => {
    const down = goal({
      goal_type: "milestone", tracking_type: "counter", target_value: 85, current_value: 95,
      milestone_config: { start: 95, target: 85 },
    })
    const ids = earnedFor(factsFor(down, [], TODAY)).map((b) => b.ruleId)
    expect(ids.filter((i) => i.startsWith("climb_"))).toEqual([])
  })
})
