import { describe, test, expect } from "vitest"
import { buildFrameworkPlanInserts, parseFrameworkPlan } from "@/src/goals/goalsService"
import { TARGETS, getAchievementTiers, getPrimaryTemplateForObjective } from "@/src/goals/data/newGoalFramework"
import type { NewGoalsFlowState } from "@/src/goals/types"
import type { UserGoalRow } from "@/src/db/goalTypes"

const benchStart = TARGETS.find((t) => t.id === "t_bench")!.milestoneConfig!.start // 40

const plan: NewGoalsFlowState = {
  pillars: ["health"],
  objectives: ["obj_strong"],
  targetOverrides: {
    t_bench: {
      enabled: true,
      value: 60,
      startValue: 50,
      steps: 7,
      curveTension: 0,
      targetDate: "2026-09-01",
      milestoneEdits: { 2: { value: 49, date: "2026-09-01" } },
    },
    t_gym_strong: {
      enabled: true,
      value: 0,
      steps: 0,
      curveTension: 0,
      targetDate: "",
      rampSteps: [{ frequencyPerWeek: 9, durationWeeks: 8 }],
    },
    t_squat: { enabled: false, value: 100, steps: 5, curveTension: 0, targetDate: "" },
  },
}

const find = (inserts: ReturnType<typeof buildFrameworkPlanInserts>, tpl: string) =>
  inserts.find((i) => i.template_id === tpl)

// Convert inserts to the minimal UserGoalRow shape the parser reads back.
const insertsToRows = (inserts: ReturnType<typeof buildFrameworkPlanInserts>): UserGoalRow[] =>
  inserts.map((ins, i) => ({
    id: `id-${i}`, user_id: "u", title: ins.title ?? "",
    template_id: ins.template_id ?? null,
    target_value: ins.target_value ?? 1, current_value: ins.current_value ?? 0,
    goal_type: ins.goal_type ?? "recurring",
    target_date: ins.target_date ?? null,
    milestone_config: (ins.milestone_config ?? null) as Record<string, unknown> | null,
    ramp_steps: (ins.ramp_steps ?? null) as Record<string, unknown>[] | null,
  }) as unknown as UserGoalRow)

describe("buildFrameworkPlanInserts", () => {
  const inserts = buildFrameworkPlanInserts(plan)

  test("emits pillar → objective → target hierarchy via temp ids", () => {
    const pillar = find(inserts, "fw:pillar:health")
    const obj = find(inserts, "fw:obj:obj_strong")
    const bench = find(inserts, "fw:tgt:t_bench")
    expect(pillar?._tempParentId).toBeNull()
    expect(pillar?.goal_level).toBe(0)
    expect(obj?._tempParentId).toBe("fw:pillar:health")
    expect(obj?.goal_level).toBe(1)
    expect(bench?._tempParentId).toBe("fw:obj:obj_strong")
    // Targets are L3 daily-actionable leaves parented straight to their L1
    // objective (skipping the badge-reserved L2), so they surface on Today.
    expect(bench?.goal_level).toBe(3)
  })

  test("maps a milestone target: value→target_value, start→current_value, config + edits", () => {
    const bench = find(inserts, "fw:tgt:t_bench")!
    expect(bench.goal_type).toBe("milestone")
    expect(bench.target_value).toBe(60)
    expect(bench.current_value).toBe(50)
    expect(bench.goal_nature).toBe("outcome") // bench is a metric
    const mc = bench.milestone_config as Record<string, unknown>
    expect(mc.start).toBe(50)
    expect(mc.steps).toBe(7)
    expect(mc.milestoneEdits).toEqual({ 2: { value: 49, date: "2026-09-01" } })
    expect(bench.target_date).toBe("2026-09-01")
  })

  test("maps a ramp driver: goal_type habit_ramp, ramp_steps, input nature", () => {
    const gym = find(inserts, "fw:tgt:t_gym_strong")!
    expect(gym.goal_type).toBe("habit_ramp")
    expect(gym.goal_nature).toBe("input") // gym sessions is a driver
    expect(gym.target_value).toBe(9)
    expect(gym.ramp_steps).toEqual([{ frequencyPerWeek: 9, durationWeeks: 8 }])
    expect(gym.milestone_config ?? null).toBeNull()
  })

  test("excludes disabled targets", () => {
    expect(find(inserts, "fw:tgt:t_squat")).toBeUndefined()
  })

  test("enabling a target pulls in its objective + pillar even if not listed", () => {
    const onlyTarget: NewGoalsFlowState = {
      pillars: [], objectives: [],
      targetOverrides: { t_bench: { enabled: true, value: 60, steps: 7, curveTension: 0, targetDate: "" } },
    }
    const out = buildFrameworkPlanInserts(onlyTarget)
    expect(find(out, "fw:pillar:health")).toBeDefined()
    expect(find(out, "fw:obj:obj_strong")).toBeDefined()
  })

  test("empty plan → no inserts", () => {
    expect(buildFrameworkPlanInserts({ pillars: [], objectives: [], targetOverrides: {} })).toEqual([])
  })
})

describe("shared-driver dedup + linked_metric", () => {
  test("writes linked_metric for drivers that map to a metric, null otherwise", () => {
    const inserts = buildFrameworkPlanInserts(plan)
    expect(find(inserts, "fw:tgt:t_gym_strong")!.linked_metric).toBe("gym_sessions_weekly")
    expect(find(inserts, "fw:tgt:t_bench")!.linked_metric ?? null).toBeNull()
  })

  test("approaches driver maps to approaches_weekly", () => {
    const inserts = buildFrameworkPlanInserts({
      pillars: ["relations"], objectives: ["obj_girlfriend"],
      targetOverrides: { t_approaches_gf: { enabled: true, value: 0, steps: 0, curveTension: 0, targetDate: "" } },
    })
    expect(find(inserts, "fw:tgt:t_approaches_gf")!.linked_metric).toBe("approaches_weekly")
  })

  test("collapses two objectives sharing a driver into a single persisted row", () => {
    const both: NewGoalsFlowState = {
      pillars: ["health"], objectives: ["obj_strong", "obj_body"],
      targetOverrides: {
        t_gym_strong: { enabled: true, value: 0, steps: 0, curveTension: 0, targetDate: "" },
        t_gym_body: { enabled: true, value: 0, steps: 0, curveTension: 0, targetDate: "" },
      },
    }
    const inserts = buildFrameworkPlanInserts(both)
    const gymRows = inserts.filter((i) => i.linked_metric === "gym_sessions_weekly")
    expect(gymRows).toHaveLength(1)
    // First target in canonical TARGETS order wins (matches the config UI dedup).
    expect(find(inserts, "fw:tgt:t_gym_strong")).toBeDefined()
    expect(find(inserts, "fw:tgt:t_gym_body")).toBeUndefined()
  })
})

describe("getPrimaryTemplateForObjective (intake → enabled targets)", () => {
  test("picks the most-specific (single-objective) template for an objective", () => {
    expect(getPrimaryTemplateForObjective("obj_strong")?.id).toBe("tmpl_strength")
    expect(getPrimaryTemplateForObjective("obj_nofap")?.id).toBe("tmpl_reboot")
    // obj_income is in tmpl_hustle (1 obj) AND tmpl_fi (2 objs) → prefers the focused one
    expect(getPrimaryTemplateForObjective("obj_income")?.id).toBe("tmpl_hustle")
  })
  test("returns null for an objective no template covers", () => {
    expect(getPrimaryTemplateForObjective("obj_nonexistent")).toBeNull()
  })
})

describe("getAchievementTiers (Summary badge preview)", () => {
  test("derives Bronze/Silver/Gold from a template's level values", () => {
    expect(getAchievementTiers("t_nofap_streak")).toEqual([
      { tier: "Bronze", value: 30 },
      { tier: "Silver", value: 90 },
      { tier: "Gold", value: 365 },
    ])
  })

  test("returns null for targets a template never tiers (drivers/stages)", () => {
    expect(getAchievementTiers("t_nofap_checkin")).toBeNull() // habit driver
    expect(getAchievementTiers("t_nofap_stages")).toBeNull()  // stage ladder
  })

  test("works for a non-vices metric (bench from the strength template)", () => {
    expect(getAchievementTiers("t_bench")).toEqual([
      { tier: "Bronze", value: 60 },
      { tier: "Silver", value: 100 },
      { tier: "Gold", value: 140 },
    ])
  })
})

describe("parseFrameworkPlan (round-trip)", () => {
  const restored = parseFrameworkPlan(insertsToRows(buildFrameworkPlanInserts(plan)))

  test("restores selected pillars + objectives", () => {
    expect(restored.pillars).toContain("health")
    expect(restored.objectives).toContain("obj_strong")
  })

  test("restores milestone override (value, start, steps, edits, date)", () => {
    const ov = restored.targetOverrides.t_bench
    expect(ov.enabled).toBe(true)
    expect(ov.value).toBe(60)
    expect(ov.startValue).toBe(50) // differs from default → surfaced
    expect(ov.steps).toBe(7)
    expect(ov.milestoneEdits).toEqual({ 2: { value: 49, date: "2026-09-01" } })
    expect(ov.targetDate).toBe("2026-09-01")
  })

  test("restores ramp override", () => {
    expect(restored.targetOverrides.t_gym_strong.rampSteps).toEqual([{ frequencyPerWeek: 9, durationWeeks: 8 }])
  })

  test("does NOT surface startValue when it equals the framework default", () => {
    const atDefault: NewGoalsFlowState = {
      pillars: ["health"], objectives: ["obj_strong"],
      targetOverrides: { t_bench: { enabled: true, value: 60, startValue: benchStart, steps: 7, curveTension: 0, targetDate: "" } },
    }
    const out = parseFrameworkPlan(insertsToRows(buildFrameworkPlanInserts(atDefault)))
    expect(out.targetOverrides.t_bench.startValue).toBeUndefined()
  })
})

describe("ranked priority round-trips via emit order → position", () => {
  // insertsToRows preserves array (emit) order; createGoalBatch assigns `position`
  // in that order and getFrameworkPlanGoals fetches `.order(goal_level, position)`,
  // so emit order == fetched order for our monotonic-by-level emit. This locks the
  // contract that user rank survives save→reload.
  test("preserves a non-canonical pillar + objective order", () => {
    const ranked: NewGoalsFlowState = {
      pillars: ["relations", "health"], // canonical PILLARS order is health before relations
      objectives: ["obj_girlfriend", "obj_strong"], // canonical is obj_strong first
      targetOverrides: {},
    }
    const restored = parseFrameworkPlan(insertsToRows(buildFrameworkPlanInserts(ranked)))
    expect(restored.pillars).toEqual(["relations", "health"])
    expect(restored.objectives).toEqual(["obj_girlfriend", "obj_strong"])
  })

  test("user-ranked items come first; target-implied items append in canonical order", () => {
    const implied: NewGoalsFlowState = {
      pillars: ["relations"], // health is pulled in only via the bench target below
      objectives: [],
      targetOverrides: { t_bench: { enabled: true, value: 60, steps: 7, curveTension: 0, targetDate: "" } },
    }
    const restored = parseFrameworkPlan(insertsToRows(buildFrameworkPlanInserts(implied)))
    expect(restored.pillars[0]).toBe("relations") // ranked first
    expect(restored.pillars).toContain("health") // implied, appended
    expect(restored.objectives).toContain("obj_strong") // implied by t_bench
  })
})

describe("custom titles (labels)", () => {
  const renamed: NewGoalsFlowState = {
    ...plan,
    labels: { health: "Fitness", obj_strong: "Get Jacked", t_bench: "Bench PR" },
  }

  test("labels become the goal row titles", () => {
    const inserts = buildFrameworkPlanInserts(renamed)
    expect(find(inserts, "fw:pillar:health")?.title).toBe("Fitness")
    expect(find(inserts, "fw:obj:obj_strong")?.title).toBe("Get Jacked")
    expect(find(inserts, "fw:tgt:t_bench")?.title).toBe("Bench PR")
  })

  test("round-trip restores renamed labels (and only renamed ones)", () => {
    const out = parseFrameworkPlan(insertsToRows(buildFrameworkPlanInserts(renamed)))
    expect(out.labels?.health).toBe("Fitness")
    expect(out.labels?.obj_strong).toBe("Get Jacked")
    expect(out.labels?.t_bench).toBe("Bench PR")
    // gym wasn't renamed → no label entry
    expect(out.labels?.t_gym_strong).toBeUndefined()
  })
})

describe("custom (user-added) goals", () => {
  const withCustom: NewGoalsFlowState = {
    pillars: ["health"],
    objectives: [],
    labels: { custom_tgt_1: "Run a marathon" },
    customTargets: [{ id: "custom_tgt_1", pillarId: "health", unit: "km" }],
    targetOverrides: {
      custom_tgt_1: { enabled: true, value: 42, startValue: 5, steps: 6, curveTension: 0, targetDate: "2026-12-01" },
    },
  }

  test("emits a custom container objective + custom target under the pillar", () => {
    const inserts = buildFrameworkPlanInserts(withCustom)
    const container = find(inserts, "fw:obj:custom:health")
    const goal = find(inserts, "fw:custom:custom_tgt_1")
    expect(container?._tempParentId).toBe("fw:pillar:health")
    expect(goal?._tempParentId).toBe("fw:obj:custom:health")
    expect(goal?.title).toBe("Run a marathon")
    expect(goal?.goal_type).toBe("milestone")
    expect(goal?.target_value).toBe(42)
    expect(goal?.current_value).toBe(5)
    const mc = goal?.milestone_config as Record<string, unknown>
    expect(mc.customPillar).toBe("health")
    expect(mc.customUnit).toBe("km")
  })

  test("round-trips: custom goal + its title, pillar, unit, value, start", () => {
    const out = parseFrameworkPlan(insertsToRows(buildFrameworkPlanInserts(withCustom)))
    expect(out.customTargets).toEqual([{ id: "custom_tgt_1", pillarId: "health", unit: "km" }])
    expect(out.labels?.custom_tgt_1).toBe("Run a marathon")
    const ov = out.targetOverrides.custom_tgt_1
    expect(ov.value).toBe(42)
    expect(ov.startValue).toBe(5) // differs from custom default (0)
    expect(ov.targetDate).toBe("2026-12-01")
    // the synthetic container is NOT exposed as a user objective
    expect(out.objectives).not.toContain("custom:health")
  })
})
