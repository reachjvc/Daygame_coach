/**
 * The promise this file guards: every goal a user has resolves to at least one
 * thing that can track it, including goals the user typed themselves that no
 * table in the app knows anything about.
 */

import { describe, test, expect } from "vitest"
import {
  buildGoalMetricId,
  goalMetricViews,
  isTrackableGoal,
  parseGoalMetricId,
  isGoalMetricId,
  metricsForGoal,
  metricDefFor,
  readGoalMetric,
  formatMetricValue,
  metricSubLabel,
  goalMetricDef,
  GOAL_METRIC_VIEWS,
} from "@/src/tracking/metricsService"
import type { UserGoalRow } from "@/src/db/goalTypes"

function goal(overrides: Partial<UserGoalRow> = {}): UserGoalRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "user-1",
    title: "Deep work 4 hours daily",
    category: "custom",
    tracking_type: "counter",
    period: "daily",
    target_value: 4,
    current_value: 3,
    period_start_date: "2026-08-26",
    custom_end_date: null,
    current_streak: 5,
    best_streak: 12,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    position: 0,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-26T00:00:00Z",
    life_area: "career_business",
    parent_goal_id: null,
    target_date: null,
    description: null,
    goal_type: "recurring",
    goal_nature: "input",
    display_category: null,
    goal_level: null,
    template_id: null,
    milestone_config: null,
    ramp_steps: null,
    motivation_note: null,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
    goal_phase: null,
    aligned_values: [],
    ...overrides,
  }
}

describe("goal-derived metric ids", () => {
  test("round-trips", () => {
    const id = buildGoalMetricId("abc", "period")
    expect(parseGoalMetricId(id)).toEqual({ goalId: "abc", view: "period" })
    expect(isGoalMetricId(id)).toBe(true)
  })

  test("a catalogue id is not a goal id", () => {
    expect(parseGoalMetricId("approaches_weekly")).toBeNull()
    expect(isGoalMetricId("approaches_weekly")).toBe(false)
  })

  test("an unknown view is rejected rather than guessed", () => {
    expect(parseGoalMetricId("goal:abc:sideways")).toBeNull()
    expect(parseGoalMetricId("goal::period")).toBeNull()
    expect(parseGoalMetricId("goal:abc")).toBeNull()
  })
})

describe("a reading is only offered when it means something", () => {
  // The failure this guards: the picker offered "Get a girlfriend (best streak)
  // — the longest run of weeks you have hit this goal" for a one-off outcome.

  test("a milestone has no streak, no best streak and no separate total", () => {
    const views = goalMetricViews(goal({ goal_type: "milestone", title: "Squat 100kg" }))
    expect(views).not.toContain("streak")
    expect(views).not.toContain("best")
    // current_value already IS the running figure for a milestone; adding period
    // history on top of it would count the same reps twice.
    expect(views).not.toContain("total")
  })

  test("a milestone is still measurable — progress and % of target", () => {
    const views = goalMetricViews(goal({ goal_type: "milestone" }))
    expect(views).toContain("period")
    expect(views).toContain("percent")
    expect(metricsForGoal(goal({ goal_type: "milestone" })).length).toBeGreaterThan(0)
  })

  test("a milestone's progress reading does not claim to be a period", () => {
    const def = goalMetricDef(goal({ goal_type: "milestone", period: "weekly" }), "period")
    expect(def.description).not.toContain("this week")
    expect(def.description).toContain("milestone")
  })

  test("a recurring goal keeps all five readings", () => {
    const views = goalMetricViews(goal({ goal_type: "recurring", period: "weekly" }))
    expect(views).toEqual(expect.arrayContaining(["period", "percent", "total", "streak", "best"]))
  })

  test("no reading is offered twice for one goal", () => {
    const ids = metricsForGoal(goal({ goal_type: "recurring" })).map((m) => m.id)
    expect(ids.length).toBe(new Set(ids).size)
  })
})

describe("container goals are not offered as trackers", () => {
  // L1/L2 goals ("Get a girlfriend", "Approach Legend") are outcomes above the
  // goals you log against. Nothing writes their current_value, so a tile on one
  // reads 0 forever. Same line as goalsService.isDailyActionable.

  test.each([
    ["L1 outcome", 1],
    ["L2 outcome", 2],
  ])("%s is not trackable", (_name, level) => {
    const g = goal({ goal_level: level, goal_nature: "outcome" })
    expect(isTrackableGoal(g)).toBe(false)
    expect(metricsForGoal(g)).toEqual([])
  })

  test.each([
    ["L3 goal", 3],
    ["standalone goal", null],
  ])("%s is trackable", (_name, level) => {
    const g = goal({ goal_level: level })
    expect(isTrackableGoal(g)).toBe(true)
    expect(metricsForGoal(g).length).toBeGreaterThan(0)
  })

  test("an archived or inactive goal is not offered", () => {
    expect(metricsForGoal(goal({ is_archived: true }))).toEqual([])
    expect(metricsForGoal(goal({ is_active: false }))).toEqual([])
  })
})

describe("every goal is trackable", () => {
  test("a self-input goal with no metric backend still has trackers", () => {
    const metrics = metricsForGoal(goal())
    expect(metrics.length).toBeGreaterThan(0)
    expect(metrics.every((m) => m.source === "goal")).toBe(true)
  })

  test("a template goal offers its real metric first, then its own readings", () => {
    const metrics = metricsForGoal(goal({
      title: "10 approaches per week",
      period: "weekly",
      life_area: "daygame",
      linked_metric: "approaches_weekly",
    }))
    expect(metrics[0].id).toBe("approaches_weekly")
    expect(metrics[0].source).toBe("tracking_stats")
    expect(metrics.slice(1).every((m) => m.source === "goal")).toBe(true)
  })

  test("deep work is trackable both daily and accumulated", () => {
    const ids = metricsForGoal(goal()).map((m) => m.id)
    expect(ids).toContain(buildGoalMetricId(goal().id, "period"))
    expect(ids).toContain(buildGoalMetricId(goal().id, "total"))
  })

  test("a goal with no target offers no percentage, but is still trackable", () => {
    const metrics = metricsForGoal(goal({ target_value: 0 }))
    expect(metrics.length).toBeGreaterThan(0)
    expect(metrics.some((m) => m.id.endsWith(":percent"))).toBe(false)
  })

  test.each([
    ["daily recurring", goal({ period: "daily", goal_type: "recurring" })],
    ["weekly recurring", goal({ period: "weekly", goal_type: "recurring" })],
    ["monthly milestone", goal({ period: "monthly", goal_type: "milestone" })],
    ["yearly, no target", goal({ period: "yearly", target_value: 0 })],
    ["habit ramp with linked metric", goal({ goal_type: "habit_ramp", linked_metric: "gym_sessions_weekly", period: "weekly" })],
    ["custom period", goal({ period: "custom" })],
  ])("%s resolves to at least one tracker", (_name, g) => {
    expect(metricsForGoal(g).length).toBeGreaterThan(0)
  })

  test("a goal with no target is still trackable, just without a percentage", () => {
    const metrics = metricsForGoal(goal({ target_value: 0 }))
    expect(metrics.length).toBeGreaterThan(0)
    expect(metrics.some((m) => m.id.endsWith(":percent"))).toBe(false)
  })
})

describe("goal metric descriptions read correctly for the period", () => {
  test("a daily goal talks in days", () => {
    const def = goalMetricDef(goal({ period: "daily" }), "streak")
    expect(def.description).toContain("day")
    expect(def.format).toBe("days")
  })

  test("a weekly goal talks in weeks", () => {
    const def = goalMetricDef(goal({ period: "weekly" }), "streak")
    expect(def.description).toContain("week")
    expect(def.format).toBe("weeks")
  })

  test("the goal's own title is what the tile says", () => {
    const def = goalMetricDef(goal({ title: "Read 20 pages" }), "period")
    expect(def.tileLabel).toBe("Read 20 pages")
  })
})

describe("reading a goal", () => {
  test("this period is the goal's current value, against its target", () => {
    const v = readGoalMetric(goal(), "period", 0)
    expect(v.value).toBe(3)
    expect(v.target).toBe(4)
  })

  test("accumulated adds completed periods to the period in progress", () => {
    expect(readGoalMetric(goal(), "total", 40).value).toBe(43)
  })

  test("a goal with no completed periods accumulates to what it has logged so far", () => {
    // No history is not missing data: the goal has simply only had one period.
    const v = readGoalMetric(goal({ current_value: 3 }), "total", 0)
    expect(v.value).toBe(3)
    expect(v.reason).toBeUndefined()
  })

  test("each view labels itself, so two tiles from one goal are distinguishable", () => {
    const g = goal({ title: "Deep work" })
    expect(readGoalMetric(g, "period", 0).label).toBe("Deep work")
    expect(readGoalMetric(g, "total", 0).label).toBe("Deep work (total)")
    expect(readGoalMetric(g, "streak", 0).label).toBe("Deep work (streak)")
  })

  test("percent of a zero target is undefined, not 0%", () => {
    const v = readGoalMetric(goal({ target_value: 0 }), "percent", 0)
    expect(v.value).toBeNull()
    expect(v.reason).toBeTruthy()
  })

  test("percent rounds to whole points", () => {
    expect(readGoalMetric(goal({ current_value: 1, target_value: 3 }), "percent", 0).value).toBe(33)
  })

  test("every view produces a reading", () => {
    for (const view of GOAL_METRIC_VIEWS) {
      const v = readGoalMetric(goal(), view, 10)
      expect(v.id).toBe(buildGoalMetricId(goal().id, view))
      // Either a number or an explained absence — never an unexplained null.
      if (v.value === null) expect(v.reason).toBeTruthy()
    }
  })
})

describe("metricDefFor", () => {
  test("finds catalogue metrics without any goals", () => {
    expect(metricDefFor("approaches_weekly")?.label).toBe("Approaches this week")
  })

  test("a goal id with no matching goal resolves to nothing rather than a guess", () => {
    expect(metricDefFor(buildGoalMetricId("missing-goal", "period"), [])).toBeNull()
  })

  test("a goal id resolves against the goal it names", () => {
    const g = goal()
    expect(metricDefFor(buildGoalMetricId(g.id, "period"), [g])?.label).toBe(g.title)
  })
})

describe("formatting", () => {
  test("no data renders as an em dash, never as zero", () => {
    expect(formatMetricValue(null)).toBe("—")
    expect(formatMetricValue(null, "count")).toBe("—")
    expect(formatMetricValue(NaN)).toBe("—")
  })

  test("a real zero is still shown", () => {
    expect(formatMetricValue(0, "count")).toBe("0")
  })

  test("units are attached to the number", () => {
    expect(formatMetricValue(82.5, "kg")).toBe("82.5 kg")
    expect(formatMetricValue(5, "km")).toBe("5 km")
    expect(formatMetricValue(7.25, "hours")).toBe("7.3h")
    expect(formatMetricValue(66.6, "percent")).toBe("67%")
  })

  test("the sub-label explains an absence instead of leaving it blank", () => {
    const def = goalMetricDef(goal(), "total")
    const sub = metricSubLabel(def, { id: def.id, value: null, reason: "No history recorded for this goal yet" })
    expect(sub).toBe("No history recorded for this goal yet")
  })

  test("the sub-label shows the target when there is one", () => {
    const def = goalMetricDef(goal(), "period")
    expect(metricSubLabel(def, { id: def.id, value: 3, target: 4 })).toBe("of 4")
  })
})
