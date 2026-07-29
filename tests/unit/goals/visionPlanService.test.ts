import { describe, it, expect } from "vitest"
import {
  deriveIntents,
  confidenceTier,
  buildGoalGenPrompt,
  parseGoalGenResponse,
  measureToLadderConfig,
  balancePlan,
  parseVisionPlanState,
  orderGoalIdsByArea,
  addRoutineHabit,
  removeRoutineHabit,
  routineGoalId,
  routineHabitId,
  dayNumber,
  calWeekday,
  habitDueOnDate,
  habitsDueOnDate,
  tasksDueByDate,
  expectedToDate,
  goalRollup,
  areaRollups,
  visionPercent,
  rampFrequencyForWeek,
  buildGoalRefinePrompt,
  parseGoalRefineResponse,
  applyWorkoutSplit,
  routineDayForDate,
  routineWeekPreview,
  rampSummary,
  VisionPlanRequestSchema,
  goalHorizon,
  addDays,
  visionReviewedOn,
  toggleVisionReviewed,
  ritualFromPreset,
  ritualMinutes,
  toggleRitualStep,
  moveRitualStep,
  ritualStepDoneOn,
  toggleRitualStepDone,
  ritualAdherence,
  dayPlanFor,
  toggleMustItem,
  addAdhocItem,
  toggleAdhocItem,
  adhocOriginDate,
  rolloverAdhoc,
  MAX_MUST_ITEMS,
  weekWindow,
  completedWeeks,
  reviewDue,
  saveWeeklyReview,
  expectedInRange,
  goalRollupRange,
  monthOptions,
  monthlyReport,
  buildReportCommentaryPrompt,
  parseReportCommentary,
  lastRatingsBefore,
  buildSmartSentence,
  BELIEF_SWEET_SPOT,
  eveningReflectionFor,
  saveEveningReflection,
  areasTouchedInWeek,
  rebaselineDue,
  suggestVerdict,
  verdictsFor,
  saveVerdict,
  yearReport,
  areaRatingSeries,
  wheelAvgSeries,
  dayStreak,
  ritualPerfectStreak,
  habitStreak,
  weekIndexFor,
  pendingActions,
  createAreaGoal,
  classifyGoalInput,
  loadVisionPlanState,
  softLayerRollup,
  goalFeeders,
  goalEdges,
  wouldCycle,
  addGoalEdge,
  removeGoalEdge,
  removeGoal,
  setBlockReason,
  logMeasure,
  latestMeasure,
  measureRunRate,
  dueWeeklyRituals,
  installDay,
  rotationDue,
  ritualCoverage,
  materializeOutcomes,
  counterDay,
  dayPlanFor as dayPlanForV10,
} from "@/src/goals/visionPlanService"
import { LIFE_MASTERY_AREAS, LIFE_MASTERY_SUCCESS_LEVEL, BLUEPRINT_ROWS, blueprintCoverage, goalFeedsArea } from "@/src/goals/data/lifeMasteryAreas"
import { WORKOUT_SPLITS } from "@/src/goals/data/visionWorkoutSplits"
import type { VisionGoalDraft } from "@/src/goals/types"
import { generateMilestoneLadder } from "@/src/goals/milestoneService"
import type { IntakeMatches, TextSpan } from "@/src/goals/intakeService"
import { PILLARS } from "@/src/goals/data/newGoalFramework"
import { ROUTINE_CATEGORIES, RITUAL_LIBRARY, RITUAL_PRESETS, RITUAL_DIMENSIONS, WEEKLY_RITUAL_LIBRARY } from "@/src/goals/data/visionRoutineLibrary"
import { LIFE_MASTERY_CORPUS } from "@/src/goals/data/lifeMasteryCorpus"
import { MANIFESTO_PROGRAM_CREDO, INCANTATION_DECK, MONEY_JARS, MONEY_RULES, CONSEQUENCE_MENU, RELATIONSHIP_JOURNAL_SCRIPT, RULES_EXERCISE, SIX_NEEDS, MASTERY_TEN_KEYS } from "@/src/goals/data/lifeMasteryContent"
import type { VisionProgress } from "@/src/goals/types"

/**
 * Pure-logic tests for vision → intent derivation (M1 of the vision-plan test
 * page). Embedding happens in the browser; these tests feed synthetic taxonomy
 * matches, so they're fully deterministic. The real-embedder acceptance test
 * lives in visionPlanService.embedder.test.ts (opt-in via RUN_EMBEDDER_TESTS).
 */

function span(text: string, start: number): TextSpan {
  return { text, start, end: start + text.length }
}

/** Synthetic IntakeMatches: every real pillar at a base score, overrides on top. */
function mk(
  pillarScores: Record<string, number>,
  objectives: Array<{ id: string; pillarId: string; score: number }> = [],
): IntakeMatches {
  const pillars = PILLARS.map((p) => ({
    id: p.id,
    label: p.label,
    pillarId: p.id,
    score: pillarScores[p.id] ?? 0.05,
  })).sort((a, b) => b.score - a.score)
  return {
    pillars,
    objectives: objectives
      .map((o) => ({ id: o.id, label: o.id, pillarId: o.pillarId, score: o.score }))
      .sort((a, b) => b.score - a.score),
  }
}

describe("deriveIntents", () => {
  it("routes each clause to its area with the best objective attached (happy path)", () => {
    // Arrange: "wake up happy with my life" / "build a business" / "be in love"
    const spans = [span("wake up happy with my life", 0), span("build a business", 28), span("be in love", 46)]
    const matches = [
      mk({ meaning: 0.5 }),
      mk({ wealth: 0.4 }, [{ id: "obj_business", pillarId: "wealth", score: 0.6 }]),
      mk({ relations: 0.45 }, [{ id: "obj_girlfriend", pillarId: "relations", score: 0.5 }]),
    ]

    // Act
    const res = deriveIntents(spans, matches)

    // Assert: three intents, in clause order, with objective attach where strong
    expect(res.intents).toHaveLength(3)
    expect(res.unmatched).toHaveLength(0)
    expect(res.intents.map((i) => i.pillarId)).toEqual(["meaning", "wealth", "relations"])
    expect(res.intents[0].objectiveId).toBeNull()
    expect(res.intents[1].objectiveId).toBe("obj_business")
    expect(res.intents[2].objectiveId).toBe("obj_girlfriend")
    expect(res.intents[1].text).toBe("build a business")
    expect(res.intents.map((i) => i.id)).toEqual(["intent-0", "intent-1", "intent-2"])
    // Pillar metadata resolved from the real framework
    expect(res.intents[1].pillarLabel).toBe("Wealth")
    expect(res.intents[1].pillarColor).toMatch(/^#/)
  })

  it("pillar inherits its best objective's score (effective scoring)", () => {
    // Pillar's own score is under the floor, but its objective matches strongly.
    const spans = [span("quit watching porn", 0)]
    const matches = [mk({ vices: 0.1 }, [{ id: "obj_quit", pillarId: "vices", score: 0.55 }])]

    const res = deriveIntents(spans, matches)

    expect(res.intents).toHaveLength(1)
    expect(res.intents[0].pillarId).toBe("vices")
    expect(res.intents[0].confidence).toBeCloseTo(0.55)
  })

  it("sends filler clauses below the floor to unmatched", () => {
    const spans = [span("I want to", 0), span("build a business", 10)]
    const matches = [mk({}), mk({ wealth: 0.5 })]

    const res = deriveIntents(spans, matches)

    expect(res.intents).toHaveLength(1)
    expect(res.unmatched).toHaveLength(1)
    expect(res.unmatched[0].text).toBe("I want to")
  })

  it("keeps the intent pillar-only when the objective is too weak", () => {
    const spans = [span("do better with money", 0)]
    const matches = [mk({ wealth: 0.4 }, [{ id: "obj_income", pillarId: "wealth", score: 0.1 }])]

    const res = deriveIntents(spans, matches)

    expect(res.intents[0].objectiveId).toBeNull()
    expect(res.intents[0].objectiveLabel).toBeNull()
  })

  it("merges adjacent clauses with the same pillar + objective", () => {
    const spans = [span("get in shape", 0), span("feel strong in my body", 14)]
    const objective = { id: "obj_body", pillarId: "health", score: 0.5 }
    const matches = [mk({ health: 0.4 }, [objective]), mk({ health: 0.48 }, [objective])]

    const res = deriveIntents(spans, matches)

    expect(res.intents).toHaveLength(1)
    expect(res.intents[0].text).toBe("get in shape · feel strong in my body")
    expect(res.intents[0].spans).toHaveLength(2)
    expect(res.intents[0].confidence).toBeCloseTo(0.5) // max of the group (objective-inherited)
  })

  it("does NOT merge same-pillar clauses with different objectives", () => {
    const spans = [span("get strong", 0), span("sleep better", 12)]
    const matches = [
      mk({ health: 0.4 }, [{ id: "obj_strong", pillarId: "health", score: 0.5 }]),
      mk({ health: 0.4 }, [{ id: "obj_recovery", pillarId: "health", score: 0.5 }]),
    ]

    const res = deriveIntents(spans, matches)

    expect(res.intents).toHaveLength(2)
    expect(res.intents.map((i) => i.objectiveId)).toEqual(["obj_strong", "obj_recovery"])
  })

  it("does not merge when mergeAdjacent is false", () => {
    const spans = [span("get in shape", 0), span("feel strong", 14)]
    const objective = { id: "obj_body", pillarId: "health", score: 0.5 }
    const matches = [mk({ health: 0.4 }, [objective]), mk({ health: 0.4 }, [objective])]

    const res = deriveIntents(spans, matches, { mergeAdjacent: false })

    expect(res.intents).toHaveLength(2)
  })

  it("returns empty results for empty input", () => {
    const res = deriveIntents([], [])
    expect(res.intents).toEqual([])
    expect(res.unmatched).toEqual([])
  })

  it("treats a missing match entry as unmatched (defensive)", () => {
    const spans = [span("build a business", 0), span("orphan clause", 20)]
    const matches = [mk({ wealth: 0.5 })] // second entry missing

    const res = deriveIntents(spans, matches)

    expect(res.intents).toHaveLength(1)
    expect(res.unmatched.map((s) => s.text)).toEqual(["orphan clause"])
  })
})

describe("confidenceTier", () => {
  it("maps scores to tiers at the documented boundaries", () => {
    expect(confidenceTier(0.45)).toBe("strong")
    expect(confidenceTier(0.6)).toBe("strong")
    expect(confidenceTier(0.44)).toBe("medium")
    expect(confidenceTier(0.35)).toBe("medium")
    expect(confidenceTier(0.34)).toBe("weak")
    expect(confidenceTier(0)).toBe("weak")
  })
})

// ---------------------------------------------------------------------------
// M2 — LLM goal generation (prompt + response validation with mocked LLM)
// ---------------------------------------------------------------------------

const REQ = {
  vision: "wake up happy with my life, build a business, be in love",
  intents: [
    { id: "intent-0", text: "wake up happy with my life", pillarId: "meaning", pillarLabel: "Meaning", objectiveId: null, objectiveLabel: null },
    { id: "intent-1", text: "build a business", pillarId: "wealth", pillarLabel: "Wealth", objectiveId: "obj_business", objectiveLabel: "Start a Business" },
    { id: "intent-2", text: "be in love", pillarId: "relations", pillarLabel: "Relations", objectiveId: "obj_girlfriend", objectiveLabel: "Get a Girlfriend" },
  ],
}

const VALID_LLM_GOAL = {
  title: "Get my business going",
  pillarId: "wealth",
  objectiveId: "obj_business",
  type: "milestone_ladder",
  why: "You said you want to build a business — this is how you own your time.",
  sourceIntentIds: ["intent-1"],
  habits: [{ title: "90 min deep work on the business", daysPerWeek: 5 }],
  tasks: [{ title: "Register the company", dueOffsetDays: 7 }],
  measure: { unit: "$/month", start: 0, target: 10000, steps: 5 },
  rampSteps: null,
}

const VALID_LLM_HABIT_GOAL = {
  title: "Approach consistently",
  pillarId: "relations",
  objectiveId: "obj_girlfriend",
  type: "habit_ramp",
  why: "You want to be in love — volume and courage get you there.",
  sourceIntentIds: ["intent-2"],
  habits: [{ title: "Approach 3 people", daysPerWeek: 3 }],
  tasks: [],
  measure: null,
  rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }],
}

describe("buildGoalGenPrompt", () => {
  it("includes the vision, every intent, and the framework menu", () => {
    const prompt = buildGoalGenPrompt(REQ)

    expect(prompt).toContain(REQ.vision)
    for (const i of REQ.intents) expect(prompt).toContain(`${i.id}: "${i.text}"`)
    // Menu grounded in the real framework: every pillar id present
    for (const p of PILLARS) expect(prompt).toContain(`- ${p.id}: ${p.label}`)
    expect(prompt).toContain("obj_business")
    expect(prompt).toContain("STRICT JSON")
  })
})

describe("VisionPlanRequestSchema", () => {
  it("accepts a valid request and rejects an empty or oversized one", () => {
    expect(VisionPlanRequestSchema.safeParse(REQ).success).toBe(true)
    expect(VisionPlanRequestSchema.safeParse({ vision: "x", intents: [] }).success).toBe(false)
    expect(VisionPlanRequestSchema.safeParse({ vision: "a".repeat(3000), intents: REQ.intents }).success).toBe(false)
  })
})

describe("parseGoalGenResponse", () => {
  it("maps a valid response into drafts with framework labels/colors", () => {
    const raw = JSON.stringify({ goals: [VALID_LLM_GOAL] })

    const drafts = parseGoalGenResponse(raw)

    expect(drafts).toHaveLength(1)
    expect(drafts[0].id).toBe("goal-0")
    expect(drafts[0].pillarLabel).toBe("Wealth")
    expect(drafts[0].pillarColor).toMatch(/^#/)
    expect(drafts[0].objectiveLabel).toBe("Start a Business")
    expect(drafts[0].type).toBe("milestone_ladder")
  })

  it("strips markdown fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify({ goals: [VALID_LLM_GOAL] }) + "\n```"
    expect(parseGoalGenResponse(raw)).toHaveLength(1)
  })

  it("allows a custom goal (objectiveId null)", () => {
    const raw = JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, objectiveId: null }] })
    const drafts = parseGoalGenResponse(raw)
    expect(drafts[0].objectiveId).toBeNull()
    expect(drafts[0].objectiveLabel).toBeNull()
  })

  it("throws on non-JSON output (fail-closed)", () => {
    expect(() => parseGoalGenResponse("Sorry, I can't help with that.")).toThrow(/not JSON/)
  })

  it("throws on schema violations (empty goals, bad type)", () => {
    expect(() => parseGoalGenResponse(JSON.stringify({ goals: [] }))).toThrow(/validation/)
    expect(() => parseGoalGenResponse(JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, type: "sprint" }] }))).toThrow(/validation/)
  })

  it("throws on an unknown pillar id", () => {
    const raw = JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, pillarId: "happiness" }] })
    expect(() => parseGoalGenResponse(raw)).toThrow(/unknown pillar/)
  })

  it("throws on an unknown objective id", () => {
    const raw = JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, objectiveId: "obj_made_up" }] })
    expect(() => parseGoalGenResponse(raw)).toThrow(/unknown objective/)
  })

  it("throws when the objective belongs to a different pillar", () => {
    const raw = JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, pillarId: "health", objectiveId: "obj_business" }] })
    expect(() => parseGoalGenResponse(raw)).toThrow(/wrong pillar/)
  })

  // --- M3: decomposition ---

  it("maps habits/tasks/measure with generated ids and schedules", () => {
    const drafts = parseGoalGenResponse(JSON.stringify({ goals: [VALID_LLM_GOAL] }))

    expect(drafts[0].habits).toEqual([{ id: "goal-0-habit-0", title: "90 min deep work on the business", daysPerWeek: 5, sourceTargetId: null }])
    expect(drafts[0].tasks).toEqual([{ id: "goal-0-task-0", title: "Register the company", dueOffsetDays: 7 }])
    expect(drafts[0].measure).toEqual({ unit: "$/month", start: 0, target: 10000, steps: 5 })
    expect(drafts[0].rampSteps).toBeNull()
  })

  it("maps a habit_ramp goal with rampSteps and null measure", () => {
    const drafts = parseGoalGenResponse(JSON.stringify({ goals: [VALID_LLM_HABIT_GOAL] }))

    expect(drafts[0].rampSteps).toHaveLength(2)
    expect(drafts[0].measure).toBeNull()
  })

  it("throws when a milestone_ladder goal is missing its measure", () => {
    const raw = JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, measure: null }] })
    expect(() => parseGoalGenResponse(raw)).toThrow(/no measure/)
  })

  it("throws on a zero-range measure (start === target)", () => {
    const raw = JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, measure: { unit: "kg", start: 80, target: 80, steps: 4 } }] })
    expect(() => parseGoalGenResponse(raw)).toThrow(/zero-range/)
  })

  it("throws when a habit_ramp goal has no rampSteps", () => {
    const raw = JSON.stringify({ goals: [{ ...VALID_LLM_HABIT_GOAL, rampSteps: [] }] })
    expect(() => parseGoalGenResponse(raw)).toThrow(/no rampSteps/)
  })

  it("throws when a goal has no habits at all", () => {
    const raw = JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, habits: [] }] })
    expect(() => parseGoalGenResponse(raw)).toThrow(/no habits/)
  })

  it("rejects out-of-range habit schedules (daysPerWeek 0 or 8)", () => {
    for (const daysPerWeek of [0, 8]) {
      const raw = JSON.stringify({ goals: [{ ...VALID_LLM_GOAL, habits: [{ title: "x", daysPerWeek }] }] })
      expect(() => parseGoalGenResponse(raw)).toThrow(/validation/)
    }
  })

  it("prompt asks for the full decomposition contract", () => {
    const prompt = buildGoalGenPrompt(REQ)
    for (const key of ["habits", "tasks", "measure", "rampSteps", "daysPerWeek", "dueOffsetDays"]) {
      expect(prompt).toContain(key)
    }
  })

  // --- M8: provenance + curated-target grounding ---

  it("prompt menu includes curated targets with ramps/ladders and the provenance contract", () => {
    const prompt = buildGoalGenPrompt(REQ)
    expect(prompt).toContain("basedOnTargetId")
    // At least one real curated target id with its numbers appears in the menu
    const anyTarget = /· \w+: .+ \(.+(ramp \d+\/wk×\d+w|ladder .+ in \d+ steps)/.test(prompt)
    expect(anyTarget).toBe(true)
  })

  it("maps a valid basedOnTargetId to sourceTargetId and rejects unknown ones", () => {
    const realTargetId = (JSON.parse(JSON.stringify(VALID_LLM_GOAL)), // keep fixture untouched
      /· (\w+):/.exec(buildGoalGenPrompt(REQ))?.[1])
    expect(realTargetId).toBeTruthy()
    const withProvenance = { ...VALID_LLM_GOAL, habits: [{ title: "x", daysPerWeek: 3, basedOnTargetId: realTargetId }] }
    const drafts = parseGoalGenResponse(JSON.stringify({ goals: [withProvenance] }))
    expect(drafts[0].habits[0].sourceTargetId).toBe(realTargetId)

    const bogus = { ...VALID_LLM_GOAL, habits: [{ title: "x", daysPerWeek: 3, basedOnTargetId: "tgt_made_up" }] }
    expect(() => parseGoalGenResponse(JSON.stringify({ goals: [bogus] }))).toThrow(/unknown framework target/)
  })
})

// ---------------------------------------------------------------------------
// M8 — per-goal AI refine
// ---------------------------------------------------------------------------

describe("goal refine", () => {
  const existing = {
    ...makeGoal([3], [0]),
    targetDate: "2026-12-01" as string | null,
  }

  it("refine prompt carries the instruction, current goal, and the date rule", () => {
    const prompt = buildGoalRefinePrompt("my vision", existing, "one more gym day")

    expect(prompt).toContain("one more gym day")
    expect(prompt).toContain(existing.title)
    expect(prompt).toContain("2026-12-01")
    expect(prompt).toContain("EXACTLY ONE goal")
    expect(prompt).toContain("basedOnTargetId")
  })

  it("parseGoalRefineResponse keeps the goal id + targetDate and re-seeds habit/task ids", () => {
    const raw = JSON.stringify({ goals: [VALID_LLM_HABIT_GOAL] })

    const refined = parseGoalRefineResponse(raw, existing, "seed1")

    expect(refined.id).toBe(existing.id)
    expect(refined.targetDate).toBe("2026-12-01")
    expect(refined.habits[0].id).toBe(`${existing.id}-hseed1-0`)
    expect(refined.habits[0].id).not.toBe(existing.habits[0].id)
    expect(refined.title).toBe(VALID_LLM_HABIT_GOAL.title)
  })

  it("throws when the LLM returns more than one goal", () => {
    const raw = JSON.stringify({ goals: [VALID_LLM_GOAL, VALID_LLM_HABIT_GOAL] })
    expect(() => parseGoalRefineResponse(raw, existing, "s")).toThrow(/exactly one goal/)
  })
})

describe("measureToLadderConfig", () => {
  it("produces a config the real milestone generator accepts", () => {
    const config = measureToLadderConfig({ unit: "$/month", start: 0, target: 10000, steps: 5 })

    const ladder = generateMilestoneLadder(config)

    expect(ladder).toHaveLength(5)
    expect(ladder[ladder.length - 1].value).toBe(10000)
  })
})

// ---------------------------------------------------------------------------
// M4 — cross-goal balancing + drip dosing (the differentiator: test hardest)
// ---------------------------------------------------------------------------

let goalSeq = 0
function makeGoal(habitsDaysPerWeek: number[], taskOffsets: number[] = []): VisionGoalDraft {
  const gid = `g${goalSeq++}`
  return {
    id: gid,
    title: `Goal ${gid}`,
    pillarId: "health",
    pillarLabel: "Health",
    pillarColor: "#22c55e",
    objectiveId: null,
    objectiveLabel: null,
    type: "habit_ramp",
    why: "because",
    sourceIntentIds: ["intent-0"],
    habits: habitsDaysPerWeek.map((d, i) => ({ id: `${gid}-h${i}`, title: `${gid} habit ${i}`, daysPerWeek: d })),
    tasks: taskOffsets.map((o, i) => ({ id: `${gid}-t${i}`, title: `${gid} task ${i}`, dueOffsetDays: o })),
    measure: null,
    rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }],
  }
}

describe("balancePlan", () => {
  it("never lets any week's load exceed its ramped capacity", () => {
    const goals = [makeGoal([5, 3]), makeGoal([4, 2]), makeGoal([7, 1]), makeGoal([3])]

    const plan = balancePlan(goals, { dailyBudget: 4, rampWeeks: 4 })

    for (const w of plan.weeks) expect(w.load).toBeLessThanOrEqual(w.cap)
    expect(plan.steadyLoad).toBeLessThanOrEqual(plan.weeklyCap)
  })

  it("phases in gently: week 1 only carries a ramp fraction of capacity", () => {
    // cap 28, rampWeeks 4 → week-1 cap is 7
    const goals = [makeGoal([5, 5]), makeGoal([5, 5])]

    const plan = balancePlan(goals, { dailyBudget: 4, rampWeeks: 4 })

    const week1 = plan.weeks.find((w) => w.week === 1)!
    expect(week1.cap).toBe(7)
    expect(week1.load).toBeLessThanOrEqual(7)
    // Priority goal's first habit is live in week 1
    const first = plan.habits.find((h) => h.habitId === goals[0].habits[0].id)!
    expect(first.startWeek).toBe(1)
  })

  it("staggers by priority: reordering goals changes who starts first", () => {
    const a = makeGoal([7])
    const b = makeGoal([7])

    const ab = balancePlan([a, b], { dailyBudget: 2, rampWeeks: 4 }) // cap 14, w1 cap 4 → nobody fits w1 except... 7>4 so w2 (cap 7)
    const ba = balancePlan([b, a], { dailyBudget: 2, rampWeeks: 4 })

    const startOf = (plan: ReturnType<typeof balancePlan>, id: string) =>
      plan.habits.find((h) => h.habitId === id)!.startWeek
    // Whoever is priority #1 starts strictly earlier
    expect(startOf(ab, a.habits[0].id)!).toBeLessThan(startOf(ab, b.habits[0].id)!)
    expect(startOf(ba, b.habits[0].id)!).toBeLessThan(startOf(ba, a.habits[0].id)!)
  })

  it("flags habits beyond total capacity as overflow — never drops them silently", () => {
    const goals = [makeGoal([7, 7]), makeGoal([7, 7]), makeGoal([7])] // total 35 > cap 28

    const plan = balancePlan(goals, { dailyBudget: 4 })

    expect(plan.overflowHabitIds).toEqual([goals[2].habits[0].id])
    const overflow = plan.habits.find((h) => h.habitId === goals[2].habits[0].id)!
    expect(overflow.startWeek).toBeNull()
    expect(plan.habits).toHaveLength(5) // still present in output
    expect(plan.steadyLoad).toBe(28)
  })

  it("levels weekdays: no day exceeds the daily budget at steady state", () => {
    const goals = [makeGoal([5, 3]), makeGoal([4, 2]), makeGoal([7, 1]), makeGoal([3])] // total 25, cap 28

    const plan = balancePlan(goals, { dailyBudget: 4 })

    expect(plan.dayLoads.reduce((a, b) => a + b, 0)).toBe(plan.steadyLoad)
    for (const d of plan.dayLoads) expect(d).toBeLessThanOrEqual(plan.dailyBudget)
    // Each scheduled habit sits on exactly daysPerWeek distinct weekdays
    for (const h of plan.habits.filter((x) => x.startWeek !== null)) {
      expect(h.weekdays).toHaveLength(h.daysPerWeek)
      expect(new Set(h.weekdays).size).toBe(h.daysPerWeek)
    }
  })

  it("shifts a late-starting goal's tasks by its activation week", () => {
    // Priority goal saturates early capacity, second goal activates later.
    const first = makeGoal([7], [0])
    const second = makeGoal([7], [0, 10])

    const plan = balancePlan([first, second], { dailyBudget: 2, rampWeeks: 4 })

    const secondStart = plan.habits.find((h) => h.goalId === second.id)!.startWeek!
    expect(secondStart).toBeGreaterThan(1)
    const t0 = plan.tasks.find((t) => t.taskId === second.tasks[0].id)!
    expect(t0.dueDay).toBe((secondStart - 1) * 7)
    expect(t0.week).toBe(secondStart)
    // First goal's day-0 task lands exactly in its own activation week
    // (with budget 2, even priority #1's 7-day habit only fits week 2's ramped cap)
    const firstStart = plan.habits.find((h) => h.goalId === first.id)!.startWeek!
    expect(plan.tasks.find((t) => t.taskId === first.tasks[0].id)!.week).toBe(firstStart)
    expect(firstStart).toBeLessThan(secondStart)
  })

  it("is deterministic — identical input gives identical output", () => {
    const goals = [makeGoal([5, 3], [0, 7]), makeGoal([4], [14])]
    expect(balancePlan(goals, { dailyBudget: 3 })).toEqual(balancePlan(goals, { dailyBudget: 3 }))
  })

  it("handles edges: single goal, budget 1, and a 7-day habit", () => {
    // One daily habit with budget 1: fits exactly (cap 7), but only at full ramp
    const solo = balancePlan([makeGoal([7])], { dailyBudget: 1, rampWeeks: 4 })
    expect(solo.overflowHabitIds).toEqual([])
    expect(solo.habits[0].startWeek).toBe(4) // needs the full cap → last ramp week
    expect(solo.habits[0].weekdays).toEqual([0, 1, 2, 3, 4, 5, 6])

    // Ten small goals under a generous budget: all scheduled
    const many = balancePlan(Array.from({ length: 10 }, () => makeGoal([2])), { dailyBudget: 8 })
    expect(many.overflowHabitIds).toEqual([])
    expect(many.steadyLoad).toBe(20)

    // Empty input
    const empty = balancePlan([], {})
    expect(empty.habits).toEqual([])
    expect(empty.weeks).toHaveLength(1)
  })

  it("clamps a nonsensical budget up to 1 instead of dividing by zero", () => {
    const plan = balancePlan([makeGoal([2])], { dailyBudget: 0 })
    expect(plan.dailyBudget).toBe(1)
    expect(plan.weeklyCap).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// M5 — sandbox persistence round-trip
// ---------------------------------------------------------------------------

describe("parseVisionPlanState", () => {
  const goal = makeGoal([3, 2], [0, 7])
  const state = {
    vision: "wake up happy, build a business, be in love",
    intents: [
      {
        id: "intent-0", text: "build a business", pillarId: "wealth", pillarLabel: "Wealth",
        pillarColor: "#a855f7", objectiveId: "obj_business", objectiveLabel: "Start a Business",
        confidence: 0.6, spans: [{ text: "build a business", start: 0, end: 16 }],
      },
    ],
    goals: [goal],
    priorityIds: [goal.id],
    dailyBudget: 4,
    confirmed: false,
  }

  it("round-trips losslessly through JSON", () => {
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })

  it("returns null for null, corrupt JSON, and schema violations", () => {
    expect(parseVisionPlanState(null)).toBeNull()
    expect(parseVisionPlanState("{not json")).toBeNull()
    expect(parseVisionPlanState(JSON.stringify({ ...state, goals: [] }))).toBeNull()
    expect(parseVisionPlanState(JSON.stringify({ ...state, dailyBudget: 0 }))).toBeNull()
  })

  it("rejects a priority list that doesn't exactly cover the goals", () => {
    expect(parseVisionPlanState(JSON.stringify({ ...state, priorityIds: ["ghost-goal"] }))).toBeNull()
    expect(parseVisionPlanState(JSON.stringify({ ...state, priorityIds: [goal.id, "extra"] }))).toBeNull()
  })

  it("rejects a goal whose habits were edited away entirely", () => {
    const eviscerated = { ...state, goals: [{ ...goal, habits: [] }] }
    expect(parseVisionPlanState(JSON.stringify(eviscerated))).toBeNull()
  })

  it("round-trips v8 goal-workshop fields (goalInbox + manifestoName) and rejects junk", () => {
    const v8 = { ...state, goalInbox: ["run a marathon", "learn spanish"], manifestoName: "Sam" }
    expect(parseVisionPlanState(JSON.stringify(v8))).toEqual(v8)
    expect(parseVisionPlanState(JSON.stringify({ ...state, manifestoName: "" }))).toBeNull()
    expect(parseVisionPlanState(JSON.stringify({ ...state, goalInbox: [""] }))).toBeNull()
    expect(parseVisionPlanState(JSON.stringify({ ...state, goalInbox: ["x".repeat(301)] }))).toBeNull()
  })

  it("round-trips progress (M6) and rejects malformed dates", () => {
    const withProgress = {
      ...state,
      confirmed: true,
      progress: { startDate: "2026-07-13", completions: { [goal.habits[0].id]: ["2026-07-14"] }, tasksDone: [goal.tasks[0].id] },
    }
    expect(parseVisionPlanState(JSON.stringify(withProgress))).toEqual(withProgress)
    const badDate = { ...withProgress, progress: { ...withProgress.progress, startDate: "13/07/2026" } }
    expect(parseVisionPlanState(JSON.stringify(badDate))).toBeNull()
  })

  it("round-trips the area board fields and accepts blobs saved without them", () => {
    const withBoard = { ...state, areaOrder: ["wealth", "health"], deselectedAreas: ["health"] }
    expect(parseVisionPlanState(JSON.stringify(withBoard))).toEqual(withBoard)
    // Blobs from before the board existed still hydrate.
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })
})

describe("orderGoalIdsByArea", () => {
  const goals = [
    { id: "g1", pillarId: "health" },
    { id: "g2", pillarId: "wealth" },
    { id: "g3", pillarId: "health" },
    { id: "g4", pillarId: "relations" },
  ]

  it("groups ids by area rank, keeping relative order within an area", () => {
    expect(orderGoalIdsByArea(["g1", "g2", "g3", "g4"], goals, ["wealth", "health", "relations"]))
      .toEqual(["g2", "g1", "g3", "g4"])
  })

  it("never drops ids — unknown pillars sink to the end in original order", () => {
    const out = orderGoalIdsByArea(["g4", "g1", "ghost", "g2"], goals, ["health"])
    expect(out).toEqual(["g1", "g4", "ghost", "g2"])
    expect(out).toHaveLength(4)
  })

  it("is a no-op when the area order already matches", () => {
    expect(orderGoalIdsByArea(["g1", "g3", "g2", "g4"], goals, ["health", "wealth", "relations"]))
      .toEqual(["g1", "g3", "g2", "g4"])
  })
})

describe("routine library (M10)", () => {
  const cat = ROUTINE_CATEGORIES.find((c) => c.id === "morning")!
  const meditate = cat.items.find((i) => i.id === "meditate")!
  const journal = cat.items.find((i) => i.id === "journal")!
  const llmGoal = makeGoal([3])

  it("first pick creates the category goal under its primary area, later picks append", () => {
    const one = addRoutineHabit([llmGoal], cat, meditate)
    expect(one).toHaveLength(2)
    const routine = one.find((g) => g.id === routineGoalId("morning"))!
    expect(routine.title).toBe("Morning routine")
    expect(routine.pillarId).toBe(cat.pillarIds[0])
    expect(routine.pillarLabel).toBeTruthy()
    expect(routine.pillarColor).toMatch(/^#/)
    expect(routine.type).toBe("habit_ramp")
    // 7/wk phase = no cap, each habit's own daysPerWeek rules the schedule.
    expect(routine.rampSteps).toEqual([{ frequencyPerWeek: 7, durationWeeks: 4 }])
    expect(routine.habits).toEqual([
      { id: routineHabitId("morning", "meditate"), title: meditate.title, daysPerWeek: meditate.daysPerWeek, sourceTargetId: null },
    ])

    const two = addRoutineHabit(one, cat, journal)
    expect(two).toHaveLength(2)
    expect(two.find((g) => g.id === routine.id)!.habits).toHaveLength(2)
  })

  it("adding an already-added item is a no-op", () => {
    const one = addRoutineHabit([], cat, meditate)
    expect(addRoutineHabit(one, cat, meditate)).toBe(one)
  })

  it("every library category names a real pillar and ~5 items", () => {
    for (const c of ROUTINE_CATEGORIES) {
      expect(() => addRoutineHabit([], c, c.items[0])).not.toThrow()
      expect(c.items.length).toBeGreaterThanOrEqual(4)
      expect(c.pillarIds.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("removing the last routine habit drops the routine goal; earlier removals keep it", () => {
    const two = addRoutineHabit(addRoutineHabit([llmGoal], cat, meditate), cat, journal)
    const one = removeRoutineHabit(two, routineHabitId("morning", "meditate"))
    expect(one.find((g) => g.id === routineGoalId("morning"))!.habits).toHaveLength(1)
    const none = removeRoutineHabit(one, routineHabitId("morning", "journal"))
    expect(none.find((g) => g.id === routineGoalId("morning"))).toBeUndefined()
    expect(none).toHaveLength(1) // the LLM goal survives
  })

  it("never empties a non-routine goal", () => {
    const single = { ...llmGoal, habits: [llmGoal.habits[0]] }
    const out = removeRoutineHabit([single], single.habits[0].id)
    expect(out).toEqual([single])
  })

  it("a routine goal round-trips through persisted-state parsing", () => {
    const withRoutine = addRoutineHabit([llmGoal], cat, meditate)
    const state = {
      vision: "morning person",
      intents: [],
      goals: withRoutine,
      priorityIds: withRoutine.map((g) => g.id),
      dailyBudget: 4,
      confirmed: false,
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })
})

// ---------------------------------------------------------------------------
// M6 — track-time math (dates passed in, fully deterministic)
// ---------------------------------------------------------------------------

describe("track math", () => {
  // 2026-07-13 is a Monday.
  const MON = "2026-07-13"

  it("dayNumber and calWeekday are calendar-correct", () => {
    expect(dayNumber(MON, MON)).toBe(0)
    expect(dayNumber(MON, "2026-07-20")).toBe(7)
    expect(dayNumber(MON, "2026-07-12")).toBe(-1)
    expect(calWeekday(MON)).toBe(0) // Monday
    expect(calWeekday("2026-07-19")).toBe(6) // Sunday
  })

  it("habitDueOnDate respects start week and weekday slots", () => {
    const goals = [makeGoal([3])] // week-1 start under default budget
    const plan = balancePlan(goals, { dailyBudget: 4 })
    const h = plan.habits[0]
    expect(h.startWeek).toBe(1)
    // Due exactly on its leveled weekdays in week 1
    for (let d = 0; d < 7; d++) {
      const iso = `2026-07-${String(13 + d).padStart(2, "0")}`
      expect(habitDueOnDate(h, MON, iso)).toBe(h.weekdays.includes(d))
    }
    // Never due before the plan starts
    expect(habitDueOnDate(h, MON, "2026-07-12")).toBe(false)
    expect(habitsDueOnDate(plan, goals, MON, MON).length).toBeGreaterThanOrEqual(0)
  })

  it("a week-2 habit is not due during week 1", () => {
    // Saturate week 1 so the second goal starts later.
    const goals = [makeGoal([7]), makeGoal([7])]
    const plan = balancePlan(goals, { dailyBudget: 2, rampWeeks: 4 })
    const late = plan.habits.find((h) => h.goalId === goals[1].id)!
    expect(late.startWeek).toBeGreaterThan(2)
    expect(habitDueOnDate(late, MON, "2026-07-14")).toBe(false)
  })

  it("expectedToDate excludes today (unchecked morning = on pace)", () => {
    const goals = [makeGoal([7])]
    const plan = balancePlan(goals, { dailyBudget: 7 })
    const h = plan.habits[0]
    expect(h.startWeek).toBe(1)
    expect(expectedToDate(h, MON, MON)).toBe(0) // day 1: nothing expected yet
    expect(expectedToDate(h, MON, "2026-07-16")).toBe(3) // Mon..Wed done, Thu open
  })

  it("tasksDueByDate surfaces tasks as their day arrives and hides done ones", () => {
    const goals = [makeGoal([3], [0, 5])]
    const plan = balancePlan(goals, { dailyBudget: 4 })
    expect(tasksDueByDate(plan, MON, MON, []).map((t) => t.taskId)).toEqual([goals[0].tasks[0].id])
    expect(tasksDueByDate(plan, MON, "2026-07-18", []).length).toBe(2)
    expect(tasksDueByDate(plan, MON, "2026-07-18", [goals[0].tasks[0].id]).length).toBe(1)
  })

  it("goalRollup blends adherence and tasks; pace flips at the boundaries", () => {
    const goal = makeGoal([7], [0]) // daily habit + one task
    const plan = balancePlan([goal], { dailyBudget: 7 })
    const habitId = goal.habits[0].id
    const base = { startDate: MON, completions: {} as Record<string, string[]>, tasksDone: [] as string[] }

    // Day 4 (Thu): 3 expected. 2 done → behind; 3 → on-pace; +today's check → ahead.
    const at = (dates: string[], tasksDone: string[] = []) =>
      goalRollup(goal, plan, { ...base, completions: { [habitId]: dates }, tasksDone }, "2026-07-16")

    expect(at(["2026-07-13", "2026-07-14"]).pace).toBe("behind")
    expect(at(["2026-07-13", "2026-07-14", "2026-07-15"]).pace).toBe("on-pace")
    expect(at(["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16"]).pace).toBe("ahead")

    // Percent: full adherence (3/3) + task done = 0.7*1 + 0.3*1 = 100
    const full = at(["2026-07-13", "2026-07-14", "2026-07-15"], [goal.tasks[0].id])
    expect(full.percent).toBe(100)
    // Half adherence, no task: 0.7 * (1.5/3 → capped ratio 0.5) ≈ 35
    const half = at(["2026-07-13"], [])
    expect(half.percent).toBe(Math.round(100 * 0.7 * (1 / 3)))
  })

  it("day one with no history is on-pace and 0% (no tasks done)", () => {
    const goal = makeGoal([3], [7])
    const plan = balancePlan([goal], { dailyBudget: 4 })
    const r = goalRollup(goal, plan, { startDate: MON, completions: {}, tasksDone: [] }, MON)
    expect(r.pace).toBe("on-pace")
    expect(r.percent).toBe(0)
  })

  it("rampFrequencyForWeek walks phases and holds the final frequency", () => {
    const ramp = [{ frequencyPerWeek: 2, durationWeeks: 2 }, { frequencyPerWeek: 4, durationWeeks: 3 }]
    expect(rampFrequencyForWeek(ramp, 1)).toBe(2)
    expect(rampFrequencyForWeek(ramp, 2)).toBe(2)
    expect(rampFrequencyForWeek(ramp, 3)).toBe(4)
    expect(rampFrequencyForWeek(ramp, 5)).toBe(4)
    expect(rampFrequencyForWeek(ramp, 99)).toBe(4) // past the end → final holds
    expect(rampFrequencyForWeek(null, 1)).toBeNull()
    expect(rampFrequencyForWeek([], 1)).toBeNull()
  })

  it("ramps limit due-days and expected counts in early weeks (M8: ramps are real)", () => {
    // 5-day habit, but the goal ramps 2/wk for the first 2 weeks.
    const goal = { ...makeGoal([5]), rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 2 }, { frequencyPerWeek: 5, durationWeeks: 4 }] }
    const plan = balancePlan([goal], { dailyBudget: 7, rampWeeks: 1 })
    const h = plan.habits[0]
    expect(h.startWeek).toBe(1)
    expect(h.weekdays).toHaveLength(5)

    // Week 1: only the first 2 weekday slots are due
    let dueWeek1 = 0
    for (let d = 0; d < 7; d++) {
      const iso = `2026-07-${String(13 + d).padStart(2, "0")}`
      if (habitDueOnDate(h, MON, iso, goal.rampSteps)) dueWeek1++
    }
    expect(dueWeek1).toBe(2)

    // Week 3 (ramp phase 2): all 5 slots due
    let dueWeek3 = 0
    for (let d = 14; d < 21; d++) {
      const iso = new Date(Date.UTC(2026, 6, 13 + d)).toISOString().slice(0, 10)
      if (habitDueOnDate(h, MON, iso, goal.rampSteps)) dueWeek3++
    }
    expect(dueWeek3).toBe(5)

    // Expected after 2 full weeks = 2+2, not 5+5
    expect(expectedToDate(h, MON, "2026-07-27", goal.rampSteps)).toBe(4)
    // goalRollup uses the ramp: nothing done after 2 weeks → behind by 4, not 10
    const r = goalRollup(goal, plan, { startDate: MON, completions: {}, tasksDone: [] }, "2026-07-27")
    expect(r.expected).toBe(4)
  })

  it("areaRollups averages goals per pillar and visionPercent averages areas", () => {
    const g1 = makeGoal([7])
    const g2 = makeGoal([7])
    const rollups = [
      { goalId: g1.id, done: 0, expected: 0, adherence: 0, tasksDone: 0, tasksTotal: 0, percent: 80, pace: "on-pace" as const },
      { goalId: g2.id, done: 0, expected: 0, adherence: 0, tasksDone: 0, tasksTotal: 0, percent: 40, pace: "on-pace" as const },
    ]
    const areas = areaRollups([g1, g2], rollups) // both health
    expect(areas).toHaveLength(1)
    expect(areas[0].percent).toBe(60)
    expect(visionPercent(areas)).toBe(60)
    expect(visionPercent([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// M11 — workout day designer (splits, day-for-date mapping, persistence)
// ---------------------------------------------------------------------------

describe("workout routine designer (M11)", () => {
  const MON11 = "2026-07-13" // Monday

  it("WORKOUT_SPLITS are sane: 1-7 recommended days, ≥1 named day each", () => {
    expect(WORKOUT_SPLITS.length).toBeGreaterThanOrEqual(4)
    for (const s of WORKOUT_SPLITS) {
      expect(s.days.length).toBeGreaterThanOrEqual(1)
      expect(s.recommendedPerWeek).toBeGreaterThanOrEqual(1)
      expect(s.recommendedPerWeek).toBeLessThanOrEqual(7)
    }
  })

  it("applyWorkoutSplit names the days and adopts the split frequency (only on the target habit)", () => {
    const goal = makeGoal([3, 2])
    const ppl = WORKOUT_SPLITS.find((s) => s.id === "ppl")!

    const next = applyWorkoutSplit([goal], goal.id, goal.habits[0].id, ppl)

    const h0 = next[0].habits[0]
    expect(h0.routine?.days.map((d) => d.name)).toEqual(["Push", "Pull", "Legs"])
    expect(h0.daysPerWeek).toBe(3)
    expect(new Set(h0.routine!.days.map((d) => d.id)).size).toBe(3) // unique ids
    expect(next[0].habits[1].routine).toBeUndefined() // untouched sibling
  })

  it("routineDayForDate maps weekday slots to named days in order, weekly-stable", () => {
    const goal = makeGoal([3])
    const ppl = WORKOUT_SPLITS.find((s) => s.id === "ppl")!
    const withSplit = applyWorkoutSplit([goal], goal.id, goal.habits[0].id, ppl)
    const plan = balancePlan(withSplit, { dailyBudget: 7 })
    const bh = plan.habits[0]
    const routine = withSplit[0].habits[0].routine!

    // Each scheduled weekday runs its slot's day; same mapping in week 1 and week 2
    for (const [slot, wd] of bh.weekdays.entries()) {
      for (const weekOffset of [0, 7]) {
        const iso = new Date(Date.UTC(2026, 6, 13 + wd + weekOffset)).toISOString().slice(0, 10)
        expect(routineDayForDate(bh, routine, MON11, iso)?.name).toBe(routine.days[slot % 3].name)
      }
    }
    // Not-due day → null
    const offDay = [0, 1, 2, 3, 4, 5, 6].find((d) => !bh.weekdays.includes(d))!
    const offIso = new Date(Date.UTC(2026, 6, 13 + offDay)).toISOString().slice(0, 10)
    expect(routineDayForDate(bh, routine, MON11, offIso)).toBeNull()
    // No routine → null
    expect(routineDayForDate(bh, null, MON11, "2026-07-13")).toBeNull()
  })

  it("cycles days when frequency exceeds day count, and ramp weeks run only the first days", () => {
    const goal = { ...makeGoal([4]), rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 1 }, { frequencyPerWeek: 4, durationWeeks: 4 }] }
    const upperLower = WORKOUT_SPLITS.find((s) => s.id === "upper-lower")!
    // 2 named days on a 4-day habit → A,B,A,B across the week
    const twoDay = { days: [{ id: "d1", name: "Upper" }, { id: "d2", name: "Lower" }] }
    const plan = balancePlan([goal], { dailyBudget: 7, rampWeeks: 1 })
    const bh = plan.habits[0]

    const names = bh.weekdays.map((wd, slot) => routineWeekPreview(bh, twoDay)[slot].dayName)
    expect(names).toEqual(["Upper", "Lower", "Upper", "Lower"])

    // Ramp week 1 allows 2 of the 4 slots → only slots 0-1 are due (Upper, Lower)
    const dueNames: string[] = []
    for (let d = 0; d < 7; d++) {
      const iso = new Date(Date.UTC(2026, 6, 13 + d)).toISOString().slice(0, 10)
      const day = routineDayForDate(bh, twoDay, MON11, iso, goal.rampSteps)
      if (day) dueNames.push(day.name)
    }
    expect(dueNames).toEqual(["Upper", "Lower"])
    void upperLower
  })

  it("persists routines through the state round-trip and rejects empty day lists", () => {
    const goal = applyWorkoutSplit([makeGoal([3])], undefined as never, "", WORKOUT_SPLITS[0])[0] // no-op apply keeps shape valid
    const withRoutine = { ...goal, habits: [{ ...goal.habits[0], routine: { days: [{ id: "d", name: "Push" }] } }] }
    const state = {
      vision: "get fit",
      intents: [{ id: "i", text: "get fit", pillarId: "health", pillarLabel: "Health", pillarColor: "#22c55e", objectiveId: null, objectiveLabel: null, confidence: 0.5, spans: [{ text: "get fit", start: 0, end: 7 }] }],
      goals: [withRoutine],
      priorityIds: [withRoutine.id],
      dailyBudget: 4,
      confirmed: false,
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)

    const empty = { ...state, goals: [{ ...withRoutine, habits: [{ ...withRoutine.habits[0], routine: { days: [] } }] }] }
    expect(parseVisionPlanState(JSON.stringify(empty))).toBeNull()
  })

  it("rampSummary reads as plain language", () => {
    expect(rampSummary([{ frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }]))
      .toBe("Starts gentle: 3×/wk for the first 4w, then 5×/wk for 8w — your daily list only asks for the current phase.")
    expect(rampSummary(null)).toBe("")
  })
})

// ---------------------------------------------------------------------------
// PLM layer — horizons, vision review, morning ritual, RPM day plan, weekly
// evaluation, monthly report (docs/plans/plm-goal-system-vision-plan-lab.md)
// ---------------------------------------------------------------------------

/** 2026-06-01 is a Monday — calWeekday 0, so the balancer's weekday slots line up. */
const MON = "2026-06-01"

function baseProgress(overrides: Partial<VisionProgress> = {}): VisionProgress {
  return { startDate: MON, completions: {}, tasksDone: [], ...overrides }
}

describe("PLM M1 — goal horizons + LLM targetDate", () => {
  it("habit goals are 'now'; dated outcome goals classify by distance", () => {
    expect(goalHorizon({ type: "habit_ramp", targetDate: null }, MON)).toBe("now")
    expect(goalHorizon({ type: "milestone_ladder", targetDate: addDays(MON, 60) }, MON)).toBe("quarter")
    expect(goalHorizon({ type: "milestone_ladder", targetDate: addDays(MON, 300) }, MON)).toBe("year")
    expect(goalHorizon({ type: "milestone_ladder", targetDate: addDays(MON, 1000) }, MON)).toBe("vision")
    expect(goalHorizon({ type: "milestone_ladder", targetDate: null }, MON)).toBe("year")
  })

  it("gen prompt carries the targetDate rule and the parser maps it", () => {
    expect(buildGoalGenPrompt(REQ)).toContain("targetDate")
    const withDate = { ...VALID_LLM_GOAL, targetDate: "2027-06-30" }
    expect(parseGoalGenResponse(JSON.stringify({ goals: [withDate] }))[0].targetDate).toBe("2027-06-30")
    const without = parseGoalGenResponse(JSON.stringify({ goals: [VALID_LLM_GOAL] }))
    expect(without[0].targetDate).toBeNull()
  })

  it("rejects a malformed targetDate (fail-closed)", () => {
    const bad = { ...VALID_LLM_GOAL, targetDate: "June 2027" }
    expect(() => parseGoalGenResponse(JSON.stringify({ goals: [bad] }))).toThrow(/validation/)
  })
})

describe("PLM M2 — daily vision review", () => {
  it("toggles per date and reads back", () => {
    let p = baseProgress()
    expect(visionReviewedOn(p, MON)).toBe(false)
    p = toggleVisionReviewed(p, MON)
    expect(visionReviewedOn(p, MON)).toBe(true)
    expect(visionReviewedOn(p, addDays(MON, 1))).toBe(false)
    p = toggleVisionReviewed(p, MON)
    expect(visionReviewedOn(p, MON)).toBe(false)
  })
})

describe("PLM M3 — morning ritual", () => {
  it("presets resolve every id, keep order, and carry the preset tag", () => {
    for (const preset of [15, 30, 60] as const) {
      const r = ritualFromPreset(preset)
      expect(r.items.map((i) => i.id)).toEqual(RITUAL_PRESETS[preset])
      expect(r.preset).toBe(preset)
    }
    expect(ritualMinutes(ritualFromPreset(15))).toBeGreaterThan(0)
  })

  it("toggleRitualStep appends, removes, clears the preset tag, and nulls when empty", () => {
    const water = RITUAL_LIBRARY[0]
    const bed = RITUAL_LIBRARY[1]
    let r = toggleRitualStep(null, water)
    expect(r!.items).toEqual([water])
    r = toggleRitualStep(r, bed)
    expect(r!.items.map((i) => i.id)).toEqual([water.id, bed.id])
    expect(r!.preset).toBeNull()
    const seeded = ritualFromPreset(15)
    expect(toggleRitualStep(seeded, { id: "rit-custom", title: "X", minutes: 1 })!.preset).toBeNull()
    r = toggleRitualStep(toggleRitualStep(r, bed), water)
    expect(r).toBeNull()
  })

  it("moveRitualStep swaps neighbours and ignores out-of-range moves", () => {
    const r = ritualFromPreset(15)
    const ids = r.items.map((i) => i.id)
    const moved = moveRitualStep(r, 1, -1)
    expect(moved.items.map((i) => i.id)).toEqual([ids[1], ids[0], ...ids.slice(2)])
    expect(moved.preset).toBeNull()
    expect(moveRitualStep(r, 0, -1)).toBe(r)
    expect(moveRitualStep(r, r.items.length - 1, 1)).toBe(r)
  })

  it("step completion is per-date and adherence counts only ritual steps", () => {
    const r = { items: [RITUAL_LIBRARY[0], RITUAL_LIBRARY[1]], preset: null as null }
    let p = baseProgress()
    p = toggleRitualStepDone(p, MON, RITUAL_LIBRARY[0].id)
    expect(ritualStepDoneOn(p, MON, RITUAL_LIBRARY[0].id)).toBe(true)
    expect(ritualStepDoneOn(p, addDays(MON, 1), RITUAL_LIBRARY[0].id)).toBe(false)
    // A stray completion id not in the ritual doesn't inflate adherence.
    p = toggleRitualStepDone(p, MON, "rit-ghost")
    const a = ritualAdherence(p, r, MON, addDays(MON, 1)) // 2 days × 2 steps
    expect(a).toEqual({ done: 1, expected: 4, rate: 0.25 })
  })
})

describe("PLM M4 — RPM day plan", () => {
  it("caps must items at MAX_MUST_ITEMS and rejects the 6th star", () => {
    let p = baseProgress()
    for (let i = 0; i < MAX_MUST_ITEMS; i++) p = toggleMustItem(p, MON, `h${i}`)
    expect(dayPlanFor(p, MON).mustIds).toHaveLength(5)
    const rejected = toggleMustItem(p, MON, "h5")
    expect(rejected).toBe(p)
    // Unstar then star works again.
    p = toggleMustItem(p, MON, "h0")
    p = toggleMustItem(p, MON, "h5")
    expect(dayPlanFor(p, MON).mustIds).toContain("h5")
  })

  it("ad-hoc items get origin-dated ids and toggle done", () => {
    let p = baseProgress()
    p = addAdhocItem(p, MON, "buy running shoes")
    p = addAdhocItem(p, MON, "  ") // whitespace rejected
    const plan = dayPlanFor(p, MON)
    expect(plan.adhoc).toHaveLength(1)
    expect(plan.adhoc[0].id).toBe(`adhoc-${MON}-0`)
    expect(adhocOriginDate(plan.adhoc[0].id)).toBe(MON)
    p = toggleAdhocItem(p, MON, plan.adhoc[0].id)
    expect(dayPlanFor(p, MON).adhoc[0].done).toBe(true)
  })

  it("rollover copies only undone items, is idempotent, and chains across days", () => {
    const d2 = addDays(MON, 1)
    const d3 = addDays(MON, 2)
    let p = baseProgress()
    p = addAdhocItem(p, MON, "call the bank")
    p = addAdhocItem(p, MON, "ship the deck")
    const doneId = dayPlanFor(p, MON).adhoc[1].id
    p = toggleAdhocItem(p, MON, doneId)

    p = rolloverAdhoc(p, MON, d2)
    expect(dayPlanFor(p, d2).adhoc.map((a) => a.title)).toEqual(["call the bank"])
    const again = rolloverAdhoc(p, MON, d2)
    expect(again).toBe(p) // idempotent — same object, no dupes

    p = rolloverAdhoc(p, d2, d3) // still undone → keeps rolling
    expect(dayPlanFor(p, d3).adhoc.map((a) => a.title)).toEqual(["call the bank"])
    expect(adhocOriginDate(dayPlanFor(p, d3).adhoc[0].id)).toBe(MON)
  })
})

describe("PLM M5 — weekly evaluation ritual", () => {
  it("weekWindow and completedWeeks anchor on the plan start", () => {
    expect(weekWindow(MON, 1)).toEqual({ start: MON, end: addDays(MON, 6) })
    expect(weekWindow(MON, 2)).toEqual({ start: addDays(MON, 7), end: addDays(MON, 13) })
    expect(completedWeeks(MON, addDays(MON, 6))).toBe(0)
    expect(completedWeeks(MON, addDays(MON, 7))).toBe(1)
    expect(completedWeeks(MON, addDays(MON, 20))).toBe(2)
  })

  it("reviewDue fires once a week completes and clears after saving", () => {
    let p = baseProgress()
    expect(reviewDue(p, addDays(MON, 6))).toBeNull()
    const due = reviewDue(p, addDays(MON, 7))
    expect(due).toEqual({ weekIndex: 1, start: MON, end: addDays(MON, 6) })
    p = saveWeeklyReview(p, { weekStart: MON, areaRatings: { health: 8 }, note: "solid", focusPillarId: "health" })
    expect(reviewDue(p, addDays(MON, 7))).toBeNull()
    // Next week comes due independently.
    expect(reviewDue(p, addDays(MON, 14))?.weekIndex).toBe(2)
  })

  it("saveWeeklyReview upserts by weekStart", () => {
    let p = baseProgress()
    p = saveWeeklyReview(p, { weekStart: MON, areaRatings: { health: 4 }, note: "", focusPillarId: null })
    p = saveWeeklyReview(p, { weekStart: MON, areaRatings: { health: 9 }, note: "revised", focusPillarId: null })
    expect(p.weeklyReviews).toHaveLength(1)
    expect(p.weeklyReviews![0].areaRatings.health).toBe(9)
  })

  it("range rollups count inclusively, unlike the to-date pace math", () => {
    const goal = makeGoal([3]) // 3×/wk, ramp 3/wk → due Mon/Tue/Wed
    const plan = balancePlan([goal], { dailyBudget: 4 })
    const habit = plan.habits[0]
    expect(expectedInRange(habit, MON, MON, addDays(MON, 6), goal.rampSteps)).toBe(3)
    const p = baseProgress({ completions: { [goal.habits[0].id]: [MON, addDays(MON, 1), addDays(MON, 8)] } })
    const week1 = goalRollupRange(goal, plan, p, MON, addDays(MON, 6))
    expect(week1.done).toBe(2) // the day-8 check-in is next week's
    expect(week1.expected).toBe(3)
    expect(week1.pace).toBe("behind")
  })
})

describe("PLM M6 — monthly goals report", () => {
  it("monthOptions spans start month through today's month", () => {
    expect(monthOptions("2026-11-15", "2027-01-02")).toEqual(["2026-11", "2026-12", "2027-01"])
  })

  it("reports finished days only, with ritual + vision-review + rating rollups", () => {
    const goal = makeGoal([3]) // due Mon/Tue/Wed every week (ramp holds at 3)
    const plan = balancePlan([goal], { dailyBudget: 4 })
    const ritual = { items: [RITUAL_LIBRARY[0], RITUAL_LIBRARY[1]], preset: null as null }
    const p = baseProgress({
      completions: { [goal.habits[0].id]: [MON, addDays(MON, 1)] },
      visionReviews: [MON, addDays(MON, 1), addDays(MON, 2)],
      ritualCompletions: { [MON]: [RITUAL_LIBRARY[0].id, RITUAL_LIBRARY[1].id] },
      weeklyReviews: [{ weekStart: MON, areaRatings: { health: 8, wealth: 6 }, note: "", focusPillarId: null }],
    })

    const report = monthlyReport([goal], plan, p, ritual, "2026-06", "2026-07-01")

    expect(report.rangeStart).toBe(MON)
    expect(report.rangeEnd).toBe("2026-06-30")
    // June: Mon/Tue/Wed × 4 full weeks + Mon 29th + Tue 30th = 14 expected
    expect(report.perGoal[0].rollup.expected).toBe(14)
    expect(report.perGoal[0].rollup.done).toBe(2)
    expect(report.ritual).toEqual({ done: 2, expected: 60, rate: 2 / 60 })
    expect(report.visionReviewRate).toBeCloseTo(3 / 30)
    expect(report.weeklyRatings).toEqual([{ weekStart: MON, avg: 7 }])
    expect(report.areas[0].pillarId).toBe("health")
  })

  it("a month with no finished days yields a zeroed report, never throws", () => {
    const goal = makeGoal([3])
    const plan = balancePlan([goal], { dailyBudget: 4 })
    const report = monthlyReport([goal], plan, baseProgress(), null, "2026-06", MON) // today = day 0
    expect(report.rangeEnd < report.rangeStart).toBe(true)
    expect(report.perGoal[0].rollup.expected).toBe(0)
    expect(report.visionReviewRate).toBe(0)
  })

  it("commentary prompt carries the numbers; parse is fail-closed and capped", () => {
    const goal = makeGoal([3])
    const plan = balancePlan([goal], { dailyBudget: 4 })
    const report = monthlyReport([goal], plan, baseProgress(), null, "2026-06", "2026-07-01")
    const prompt = buildReportCommentaryPrompt("my vision", report)
    expect(prompt).toContain("my vision")
    expect(prompt).toContain(goal.title)

    expect(parseReportCommentary("```\nGood month.\n```")).toBe("Good month.")
    expect(() => parseReportCommentary("   ")).toThrow(/no commentary/)
    expect(parseReportCommentary("x".repeat(5000))).toHaveLength(4001) // 4000 + ellipsis
  })
})

describe("PLM — state persistence compat", () => {
  const goal = makeGoal([3])
  const oldState = {
    vision: "get fit",
    intents: [{ id: "i", text: "get fit", pillarId: "health", pillarLabel: "Health", pillarColor: "#22c55e", objectiveId: null, objectiveLabel: null, confidence: 0.5, spans: [{ text: "get fit", start: 0, end: 7 }] }],
    goals: [goal],
    priorityIds: [goal.id],
    dailyBudget: 4,
    confirmed: true,
    progress: { startDate: MON, completions: {}, tasksDone: [] },
  }

  it("pre-PLM payloads (no ritual/dayPlans/reviews) still hydrate", () => {
    expect(parseVisionPlanState(JSON.stringify(oldState))).toEqual(oldState)
  })

  it("round-trips the full PLM state", () => {
    const full = {
      ...oldState,
      ritual: { items: [{ id: "rit-water", title: "Water", minutes: 1 }], preset: 30 },
      progress: {
        ...oldState.progress,
        visionReviews: [MON],
        ritualCompletions: { [MON]: ["rit-water"] },
        dayPlans: { [MON]: { mustIds: ["h1"], adhoc: [{ id: `adhoc-${MON}-0`, title: "x", done: false }] } },
        weeklyReviews: [{ weekStart: MON, areaRatings: { health: 8 }, note: "n", focusPillarId: "health" }],
      },
    }
    expect(parseVisionPlanState(JSON.stringify(full))).toEqual(full)
  })

  it("rejects out-of-contract PLM data (6 musts, rating 11, empty ritual)", () => {
    const sixMusts = { ...oldState, progress: { ...oldState.progress, dayPlans: { [MON]: { mustIds: ["1", "2", "3", "4", "5", "6"], adhoc: [] } } } }
    expect(parseVisionPlanState(JSON.stringify(sixMusts))).toBeNull()
    const badRating = { ...oldState, progress: { ...oldState.progress, weeklyReviews: [{ weekStart: MON, areaRatings: { health: 11 }, note: "", focusPillarId: null }] } }
    expect(parseVisionPlanState(JSON.stringify(badRating))).toBeNull()
    const emptyRitual = { ...oldState, ritual: { items: [], preset: null } }
    expect(parseVisionPlanState(JSON.stringify(emptyRitual))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PLM Blueprint v2 — Stefan James' canonical areas, wheel ratings history,
// blueprint coverage (sources: canonical course slide + livestream Kz83kMosOWU)
// ---------------------------------------------------------------------------

describe("PLM Blueprint — life mastery areas", () => {
  it("has the 12 canonical areas in Stefan's hierarchy order with unique ids/colors", () => {
    expect(LIFE_MASTERY_AREAS).toHaveLength(12)
    expect(new Set(LIFE_MASTERY_AREAS.map((a) => a.id)).size).toBe(12)
    expect(new Set(LIFE_MASTERY_AREAS.map((a) => a.color)).size).toBe(12)
    expect(LIFE_MASTERY_AREAS.map((a) => a.label)).toEqual([
      "Health", "Fitness", "Mind & Beliefs", "Emotions", "Relationship",
      "Mission & Purpose", "Money", "Family", "Friends", "Fun", "Contribution", "Spirituality",
    ])
    for (const a of LIFE_MASTERY_AREAS) {
      expect(a.prompt.length).toBeGreaterThan(10)
      expect(a.sublabel.length).toBeGreaterThan(3)
      for (const p of a.pillarIds) expect(PILLARS.some((x) => x.id === p)).toBe(true)
    }
    expect(LIFE_MASTERY_SUCCESS_LEVEL).toBe(7)
  })

  it("pyramid rows match the slide: 9 bands base→apex, spirituality excluded (foundation/circle)", () => {
    expect(BLUEPRINT_ROWS).toHaveLength(9)
    expect(BLUEPRINT_ROWS[0].label).toBe("Health + Fitness")
    expect(BLUEPRINT_ROWS[6].label).toBe("Family + Friends")
    expect(BLUEPRINT_ROWS[8].label).toBe("Contribution")
    expect(BLUEPRINT_ROWS.flatMap((r) => r.areaIds)).not.toContain("lm_spirituality")
  })

  it("blueprintCoverage lights areas via the goals' pillars", () => {
    const covered = blueprintCoverage([{ pillarId: "health" }, { pillarId: "wealth" }])
    expect(covered.has("lm_health")).toBe(true)
    expect(covered.has("lm_fitness")).toBe(true)
    expect(covered.has("lm_money")).toBe(true)
    expect(covered.has("lm_mission")).toBe(true)
    expect(covered.has("lm_relationship")).toBe(false)
    expect(covered.has("lm_fun")).toBe(false)
    expect(blueprintCoverage([]).size).toBe(0)
  })

  it("lastRatingsBefore returns the newest review strictly before the week", () => {
    let p = baseProgress()
    expect(lastRatingsBefore(p, MON)).toBeNull()
    p = saveWeeklyReview(p, { weekStart: MON, areaRatings: { lm_health: 3 }, note: "", focusPillarId: null })
    p = saveWeeklyReview(p, { weekStart: addDays(MON, 7), areaRatings: { lm_health: 5 }, note: "", focusPillarId: null })
    expect(lastRatingsBefore(p, addDays(MON, 14))).toEqual({ lm_health: 5 })
    expect(lastRatingsBefore(p, addDays(MON, 7))).toEqual({ lm_health: 3 })
    expect(lastRatingsBefore(p, MON)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PLM OS (M0-M6) — docs/plans/life-mastery-os.md
// ---------------------------------------------------------------------------

describe("PLM OS — smart sentences + belief", () => {
  it("builds an affirmation sentence for ladder and habit goals", () => {
    const ladder = buildSmartSentence({ title: "First $5k month", type: "milestone_ladder", measure: { unit: "$/month", start: 0, target: 5000, steps: 5 }, targetDate: "2027-06-30", habits: [] })
    expect(ladder).toBe("I will easily reach at least 5000 $/month (from 0) by 2027-06-30.")
    const habit = buildSmartSentence({ title: "Get strong", type: "habit_ramp", measure: null, targetDate: null, habits: [{ id: "h", title: "Strength session", daysPerWeek: 3 }] })
    expect(habit).toContain('I will easily follow through on "Get strong"')
    expect(habit).toContain("3×/week")
    expect(habit).not.toContain("I want")
    expect(BELIEF_SWEET_SPOT).toBe(7)
  })
})

describe("PLM OS — evening reflection (M5)", () => {
  it("saves per-date and merges partial patches", () => {
    let p = baseProgress()
    p = saveEveningReflection(p, MON, { amazing: "shipped the thing" })
    p = saveEveningReflection(p, MON, { better: "sleep earlier" })
    expect(eveningReflectionFor(p, MON)).toEqual({ amazing: "shipped the thing", better: "sleep earlier" })
    expect(eveningReflectionFor(p, addDays(MON, 1))).toEqual({ amazing: "", better: "" })
  })
})

describe("PLM OS — touch-every-area + rebaseline (M4/M2)", () => {
  it("areasTouchedInWeek maps check-ins through pillars to Blueprint areas", () => {
    const g = makeGoal([3]) // pillar health
    const p = baseProgress({ completions: { [g.habits[0].id]: [MON] } })
    const touched = areasTouchedInWeek([g], p, MON, addDays(MON, 6))
    expect(touched.has("lm_health")).toBe(true)
    expect(touched.has("lm_fitness")).toBe(true)
    expect(touched.has("lm_money")).toBe(false)
    expect(areasTouchedInWeek([g], p, addDays(MON, 7), addDays(MON, 13)).size).toBe(0)
  })

  it("rebaselineDue needs N consecutive latest reviews at level", () => {
    let p = baseProgress()
    expect(rebaselineDue(p, "lm_health")).toBe(false)
    p = saveWeeklyReview(p, { weekStart: MON, areaRatings: { lm_health: 9 }, note: "", focusPillarId: null })
    expect(rebaselineDue(p, "lm_health")).toBe(false) // only one review
    p = saveWeeklyReview(p, { weekStart: addDays(MON, 7), areaRatings: { lm_health: 10 }, note: "", focusPillarId: null })
    expect(rebaselineDue(p, "lm_health")).toBe(true)
    p = saveWeeklyReview(p, { weekStart: addDays(MON, 14), areaRatings: { lm_health: 6 }, note: "", focusPillarId: null })
    expect(rebaselineDue(p, "lm_health")).toBe(false) // dip resets
  })
})

describe("PLM OS — verdicts + year report (M6)", () => {
  it("suggestVerdict follows the pace/deadline heuristics", () => {
    const base = { goalId: "g", done: 0, expected: 0, adherence: 0, tasksDone: 0, tasksTotal: 0, percent: 0, pace: "on-pace" as const }
    expect(suggestVerdict({ targetDate: null }, { ...base, done: 3, expected: 2, pace: "ahead" }, MON)).toBe("over-achieved")
    expect(suggestVerdict({ targetDate: null }, { ...base, done: 5, expected: 6, pace: "behind" }, MON)).toBe("likely-miss")
    expect(suggestVerdict({ targetDate: "2020-01-01" }, { ...base, done: 6, expected: 6 }, MON)).toBe("achieved")
    expect(suggestVerdict({ targetDate: "2020-01-01" }, { ...base, done: 2, expected: 6, pace: "behind" }, MON)).toBe("rescheduled")
    expect(suggestVerdict({ targetDate: null }, { ...base, done: 4, expected: 4 }, MON)).toBe("on-track")
    // Zero activity → "Haven't started yet", even past the deadline.
    expect(suggestVerdict({ targetDate: null }, base, MON)).toBe("not-started")
    expect(suggestVerdict({ targetDate: "2020-01-01" }, base, MON)).toBe("not-started")
  })

  it("saveVerdict upserts per period+goal and reads back", () => {
    let p = baseProgress()
    p = saveVerdict(p, "2026-06", "g1", { verdict: "likely-miss", reason: "travel month" })
    p = saveVerdict(p, "2026-06", "g1", { verdict: "modified", reason: "shrunk target" })
    p = saveVerdict(p, "2026", "g1", { verdict: "achieved", reason: "" })
    expect(verdictsFor(p, "2026-06").g1.verdict).toBe("modified")
    expect(verdictsFor(p, "2026").g1.verdict).toBe("achieved")
    expect(verdictsFor(p, "2026-07")).toEqual({})
  })

  it("yearReport spans the year and matches monthly shape", () => {
    const goal = makeGoal([3])
    const plan = balancePlan([goal], { dailyBudget: 4 })
    const p = baseProgress({ completions: { [goal.habits[0].id]: [MON, addDays(MON, 1)] } })
    const yr = yearReport([goal], plan, p, null, "2026", "2026-07-01")
    expect(yr.month).toBe("2026")
    expect(yr.rangeStart).toBe(MON) // clamped to plan start
    expect(yr.rangeEnd).toBe("2026-06-30")
    const mo = monthlyReport([goal], plan, p, null, "2026-06", "2026-07-01")
    expect(yr.perGoal[0].rollup).toEqual(mo.perGoal[0].rollup) // same window here
  })
})

describe("PLM OS — state persistence (M0-M6 fields)", () => {
  const goal = makeGoal([3])
  const oldState = {
    vision: "get fit",
    intents: [{ id: "i", text: "get fit", pillarId: "health", pillarLabel: "Health", pillarColor: "#22c55e", objectiveId: null, objectiveLabel: null, confidence: 0.5, spans: [{ text: "get fit", start: 0, end: 7 }] }],
    goals: [goal],
    priorityIds: [goal.id],
    dailyBudget: 4,
    confirmed: true,
    progress: { startDate: MON, completions: {}, tasksDone: [] },
  }

  it("round-trips the full OS state and stays backward compatible", () => {
    const full = {
      ...oldState,
      committedAt: MON,
      values: ["Freedom", "Growth", "Family"],
      drivingForce: { purpose: "To grow and to give.", reasons: ["freedom", "legacy"], identity: ["I am disciplined", "I am a builder"] },
      yourTens: { lm_health: "Wake up energized every day, 12% bodyfat." },
      goals: [{ ...goal, smartSentence: "I will easily…", beliefLevel: 8, painWhy: "Stay stuck." }],
      progress: {
        ...oldState.progress,
        weeklyReviews: [{
          weekStart: MON, areaRatings: { lm_health: 8 }, note: "", focusPillarId: "lm_fun",
          magicMoment: "beach day", accomplishment: "gym 3x", lesson: "book mornings",
          outcomes: [{ areaId: "lm_fun", outcome: "Plan one adventure", why: "life is short" }],
        }],
        eveningReflections: { [MON]: { amazing: "sunset run", better: "less phone", dayScore: 8 } },
        reportVerdicts: { "2026-06": { [goal.id]: { verdict: "on-track", reason: "" } }, "2026": { [goal.id]: { verdict: "achieved", reason: "done" } } },
      },
    }
    expect(parseVisionPlanState(JSON.stringify(full))).toEqual(full)
    // Pre-OS payloads still hydrate untouched.
    expect(parseVisionPlanState(JSON.stringify(oldState))).toEqual(oldState)
  })

  it("rejects out-of-contract OS data (4 outcomes, belief 11, bad verdict)", () => {
    const fourOutcomes = { ...oldState, progress: { ...oldState.progress, weeklyReviews: [{ weekStart: MON, areaRatings: {}, note: "", focusPillarId: null, outcomes: [1, 2, 3, 4].map((i) => ({ areaId: "lm_fun", outcome: `o${i}`, why: "" })) }] } }
    expect(parseVisionPlanState(JSON.stringify(fourOutcomes))).toBeNull()
    const badBelief = { ...oldState, goals: [{ ...goal, beliefLevel: 11 }] }
    expect(parseVisionPlanState(JSON.stringify(badBelief))).toBeNull()
    const badVerdict = { ...oldState, progress: { ...oldState.progress, reportVerdicts: { "2026-06": { g: { verdict: "crushed-it", reason: "" } } } } }
    expect(parseVisionPlanState(JSON.stringify(badVerdict))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PLM OS v2 — history, streaks, guided actions
// ---------------------------------------------------------------------------

describe("PLM OS v2 — rating history + streaks", () => {
  it("areaRatingSeries and wheelAvgSeries sort oldest-first", () => {
    let p = baseProgress()
    p = saveWeeklyReview(p, { weekStart: addDays(MON, 7), areaRatings: { lm_health: 5, lm_money: 7 }, note: "", focusPillarId: null })
    p = saveWeeklyReview(p, { weekStart: MON, areaRatings: { lm_health: 3 }, note: "", focusPillarId: null })
    expect(areaRatingSeries(p, "lm_health")).toEqual([
      { weekStart: MON, rating: 3 },
      { weekStart: addDays(MON, 7), rating: 5 },
    ])
    expect(areaRatingSeries(p, "lm_money")).toEqual([{ weekStart: addDays(MON, 7), rating: 7 }])
    expect(wheelAvgSeries(p).map((x) => x.avg)).toEqual([3, 6])
  })

  it("dayStreak counts back with today-grace", () => {
    const today = addDays(MON, 3)
    expect(dayStreak([MON, addDays(MON, 1), addDays(MON, 2)], today)).toBe(3) // today unchecked → grace
    expect(dayStreak([MON, addDays(MON, 1), addDays(MON, 2), today], today)).toBe(4)
    expect(dayStreak([MON, addDays(MON, 2)], today)).toBe(1) // gap at day 1 breaks
    expect(dayStreak([], today)).toBe(0)
  })

  it("ritualPerfectStreak requires every step done", () => {
    const ritual = { items: [{ id: "a", title: "A", minutes: 1 }, { id: "b", title: "B", minutes: 1 }], preset: null as null }
    const today = addDays(MON, 2)
    const p = baseProgress({
      ritualCompletions: {
        [MON]: ["a", "b"],
        [addDays(MON, 1)]: ["a", "b"],
        [today]: ["a"], // incomplete today → grace, counts back from yesterday
      },
    })
    expect(ritualPerfectStreak(p, ritual, today)).toBe(2)
    expect(ritualPerfectStreak(p, null, today)).toBe(0)
  })

  it("habitStreak counts consecutive completed due-instances, skipping non-due days", () => {
    const goal = makeGoal([3]) // due Mon/Tue/Wed
    const plan = balancePlan([goal], { dailyBudget: 4 })
    const h = plan.habits[0]
    // week 1 Mon+Tue+Wed done, week 2 Mon done → streak 4 from Tue wk2 (due, unchecked → grace)
    const p = baseProgress({ completions: { [goal.habits[0].id]: [MON, addDays(MON, 1), addDays(MON, 2), addDays(MON, 7)] } })
    expect(habitStreak(h, goal.rampSteps, p, addDays(MON, 8))).toBe(4)
    // missing Tue wk1 breaks the chain counted from wk2 Mon
    const p2 = baseProgress({ completions: { [goal.habits[0].id]: [MON, addDays(MON, 2), addDays(MON, 7)] } })
    expect(habitStreak(h, goal.rampSteps, p2, addDays(MON, 8))).toBe(2)
  })

  it("weekIndexFor is 1-based", () => {
    expect(weekIndexFor(MON, MON)).toBe(1)
    expect(weekIndexFor(MON, addDays(MON, 6))).toBe(1)
    expect(weekIndexFor(MON, addDays(MON, 7))).toBe(2)
  })
})

describe("PLM OS v2 — guided pendingActions", () => {
  const goal = makeGoal([3])
  const base = {
    committedAt: null as string | null,
    values: [] as string[],
    drivingForce: null,
    yourTens: {},
    ritual: null,
    goals: [goal],
    progress: null,
    confirmed: false,
    today: MON,
  }

  it("walks Stefan's sequence: commit → values → purpose → belief → tens → ritual", () => {
    const ids = pendingActions(base).map((a) => a.id)
    expect(ids[0]).toBe("commit")
    expect(ids).toContain("purpose")
    expect(ids).toContain("belief")
    expect(ids).toContain("tens")
    expect(ids).toContain("ritual")
    expect(ids).not.toContain("values") // gated behind commit
    const committed = pendingActions({ ...base, committedAt: MON })
    expect(committed.map((a) => a.id)[0]).toBe("values")
  })

  it("clears as the user completes, and adds track rhythms when confirmed", () => {
    const tens = Object.fromEntries(["lm_health","lm_fitness","lm_mindset","lm_emotions","lm_relationship","lm_mission","lm_money","lm_family","lm_friends","lm_fun","lm_contribution","lm_spirituality"].map((id) => [id, "my ten"]))
    const done = pendingActions({
      ...base,
      committedAt: MON,
      values: ["a", "b", "c"],
      drivingForce: { purpose: "grow and give", reasons: [], identity: [] },
      yourTens: tens,
      ritual: { items: [{ id: "x", title: "X", minutes: 1 }], preset: null },
      goals: [{ ...goal, beliefLevel: 8, desireLevel: 8 }],
      progress: baseProgress(),
      confirmed: true,
      today: addDays(MON, 7), // week 1 complete → weekly due; vision unread today
    })
    const ids = done.map((a) => a.id)
    // Setup actions cleared; the v3 per-area demands + track rhythms remain.
    for (const cleared of ["commit", "values", "purpose", "belief", "tens", "ritual"]) expect(ids).not.toContain(cleared)
    expect(ids).toContain("weekly")
    expect(ids).toContain("read")
    expect(ids).toContain("area-goals") // health-pillar goal leaves 10 areas empty
  })

  it("flags low-belief goals and missing workout split", () => {
    const gym = { ...makeGoal([3]), pillarId: "health", beliefLevel: 4, habits: [{ id: "hg", title: "Strength training session", daysPerWeek: 3 }] }
    const ids = pendingActions({ ...base, committedAt: MON, values: ["a", "b", "c"], goals: [gym] }).map((a) => a.id)
    expect(ids).toContain("shrink")
    expect(ids).toContain("split")
  })
})

// ---------------------------------------------------------------------------
// PLM v3 — the Life Plan: per-area goals, per-area plans, area-scoped feeding
// ---------------------------------------------------------------------------

describe("PLM v3 — goalFeedsArea + coverage with areaId", () => {
  it("explicit areaId feeds ONLY that area; pillar goals feed all mapped areas", () => {
    const pillarGoal = { pillarId: "health" }
    expect(goalFeedsArea(pillarGoal, "lm_health")).toBe(true)
    expect(goalFeedsArea(pillarGoal, "lm_fitness")).toBe(true)
    expect(goalFeedsArea(pillarGoal, "lm_money")).toBe(false)
    const areaGoal = { pillarId: "health", areaId: "lm_fitness" }
    expect(goalFeedsArea(areaGoal, "lm_fitness")).toBe(true)
    expect(goalFeedsArea(areaGoal, "lm_health")).toBe(false)
    const covered = blueprintCoverage([areaGoal])
    expect(covered.has("lm_fitness")).toBe(true)
    expect(covered.has("lm_health")).toBe(false)
  })
})

describe("PLM v3 — createAreaGoal", () => {
  it("builds a valid habit goal bound to its area with collision-safe ids", () => {
    const g = createAreaGoal({ areaId: "lm_fun", title: "Monthly adventure", type: "habit_ramp", why: "life is short", daysPerWeek: 1 }, ["lp-lm_fun-g0"])
    expect(g.id).toBe("lp-lm_fun-g1")
    expect(g.areaId).toBe("lm_fun")
    expect(g.pillarId).toBe("meaning") // fun's primary pillar
    expect(g.habits).toHaveLength(1)
    expect(g.habits[0].daysPerWeek).toBe(1)
    expect(g.rampSteps).toEqual([{ frequencyPerWeek: 1, durationWeeks: 4 }])
    expect(g.measure).toBeNull()
    expect(g.beliefLevel).toBeNull() // feeds the guided belief action
  })

  it("milestone goals require a non-zero measure and get a working habit", () => {
    const g = createAreaGoal({ areaId: "lm_money", title: "6 months runway", type: "milestone_ladder", why: "", measure: { unit: "months", start: 0, target: 6, steps: 5 }, daysPerWeek: 2 }, [])
    expect(g.type).toBe("milestone_ladder")
    expect(g.habits[0].title).toContain("Work toward")
    expect(g.rampSteps).toBeNull()
    expect(g.why.length).toBeGreaterThan(5) // default why filled
    expect(() => createAreaGoal({ areaId: "lm_money", title: "x", type: "milestone_ladder", why: "" }, [])).toThrow(/measure/)
    expect(() => createAreaGoal({ areaId: "nope", title: "x", type: "habit_ramp", why: "" }, [])).toThrow(/Unknown Blueprint area/)
  })

  it("round-trips through state persistence (areaId + areaPlans)", () => {
    const g = createAreaGoal({ areaId: "lm_family", title: "Call home weekly", type: "habit_ramp", why: "they matter", daysPerWeek: 1 }, [])
    const state = {
      vision: "family matters",
      intents: [{ id: "i", text: "family", pillarId: "relations", pillarLabel: "Relations", pillarColor: "#f43f5e", objectiveId: null, objectiveLabel: null, confidence: 0.5, spans: [{ text: "family", start: 0, end: 6 }] }],
      goals: [g],
      priorityIds: [g.id],
      dailyBudget: 4,
      confirmed: false,
      areaPlans: { lm_family: { name: "Tribe", purpose: "belonging", identity: "I am a present son" } },
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })
})

describe("M1.5 — classifyGoalInput", () => {
  const TODAY = "2026-07-28"
  it("a bare number becomes a dated target with a measure", () => {
    const g = classifyGoalInput("bench 100 kg", TODAY)
    expect(g.type).toBe("milestone_ladder")
    expect(g.measure).toEqual({ unit: "kg", start: 0, target: 100, steps: 5 })
    expect(g.targetDate).toBe("2027-07-28") // +365d
    expect(g.title).toBe("Bench 100 kg")
  })
  it("unit before the number is picked up too", () => {
    expect(classifyGoalInput("10 pull-ups", TODAY).measure).toEqual({ unit: "pull-ups", start: 0, target: 10, steps: 5 })
  })
  it("k/m suffixes scale the target", () => {
    expect(classifyGoalInput("50k invested", TODAY).measure?.target).toBe(50000)
  })
  it("a frequency becomes a weekly practice with no date, freq stripped from title", () => {
    const g = classifyGoalInput("gym 4×/week", TODAY)
    expect(g.type).toBe("habit_ramp")
    expect(g.daysPerWeek).toBe(4)
    expect(g.targetDate).toBeNull()
    expect(g.measure).toBeNull()
    expect(g.title).toBe("Gym")
  })
  it("'daily' and 'times a week' variants parse", () => {
    expect(classifyGoalInput("meditate daily", TODAY)).toMatchObject({ type: "habit_ramp", daysPerWeek: 7, title: "Meditate" })
    expect(classifyGoalInput("journal 3 times a week", TODAY)).toMatchObject({ type: "habit_ramp", daysPerWeek: 3, title: "Journal" })
  })
  // v17 supersedes the old "everything unmatched is a weekly practice" rule:
  // "muscle up" is a named achievement, not a habit you do 3×/week.
  it("a named achievement is an achievement, not a weekly practice", () => {
    const g = classifyGoalInput("muscle up", TODAY)
    expect(g.type).toBe("achievement")
    expect(g.measure).toBeNull()
    expect(g.targetDate).toBe("2027-07-28")
    expect(g.title).toBe("Muscle up")
  })
  it("text with no number, no frequency and no achievement cue is still a practice", () => {
    const g = classifyGoalInput("presence with my kids", TODAY)
    expect(g.type).toBe("habit_ramp")
    expect(g.daysPerWeek).toBe(3)
    expect(g.title).toBe("Presence with my kids")
  })
  it("output feeds createAreaGoal without throwing (target + practice)", () => {
    const t = classifyGoalInput("bench 100 kg", TODAY)
    expect(() => createAreaGoal({ areaId: "lm_fitness", ...t }, [])).not.toThrow()
    const p = classifyGoalInput("gym 4x/week", TODAY)
    expect(() => createAreaGoal({ areaId: "lm_fitness", ...p }, [])).not.toThrow()
  })
})

describe("PLM v3 — pendingActions per-area", () => {
  const goal = makeGoal([3]) // health pillar → covers lm_health/lm_fitness only
  it("demands a goal in every area and a why per area", () => {
    const ids = pendingActions({
      committedAt: MON, values: ["a", "b", "c"],
      drivingForce: { purpose: "p", reasons: [], identity: [] },
      yourTens: {}, areaPlans: {}, ritual: null,
      goals: [goal], progress: null, confirmed: false, today: MON,
    })
    const areaGoals = ids.find((a) => a.id === "area-goals")
    expect(areaGoals?.label).toContain("10 areas have none") // 12 - health/fitness
    expect(areaGoals?.mode).toBe("lifeplan")
    expect(ids.some((a) => a.id === "area-purpose")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// v4 — UX layer: focus areas, dual qualifier, example plan, education data
// ---------------------------------------------------------------------------

import { PRINCIPLES, SOS_PROTOCOLS } from "@/src/goals/data/lifeMasteryPrinciples"
import { buildExamplePlan, EXAMPLE_VISION } from "@/src/goals/data/lifeMasteryExample"

describe("v4 — focus areas + dual qualifier", () => {
  const goal = makeGoal([3])
  it("state round-trips focusAreaIds and desireLevel; rejects 4 focus areas", () => {
    const state = {
      vision: "v", intents: [{ id: "i", text: "t", pillarId: "health", pillarLabel: "Health", pillarColor: "#22c55e", objectiveId: null, objectiveLabel: null, confidence: 0.5, spans: [{ text: "t", start: 0, end: 1 }] }],
      goals: [{ ...goal, desireLevel: 9 }], priorityIds: [goal.id], dailyBudget: 4, confirmed: false,
      focusAreaIds: ["lm_health", "lm_money"],
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
    expect(parseVisionPlanState(JSON.stringify({ ...state, focusAreaIds: ["a", "b", "c", "d"] }))).toBeNull()
    expect(parseVisionPlanState(JSON.stringify({ ...state, goals: [{ ...goal, desireLevel: 11 }] }))).toBeNull()
  })

  it("pendingActions demands focus pick and rates belief+desire together", () => {
    const base = {
      committedAt: MON, values: ["a", "b", "c"],
      drivingForce: { purpose: "p", reasons: [], identity: [] },
      yourTens: {}, areaPlans: {}, focusAreaIds: [] as string[],
      ritual: null, goals: [{ ...goal, beliefLevel: 8, desireLevel: null }],
      progress: null, confirmed: false, today: MON,
    }
    const ids = pendingActions(base).map((a) => a.id)
    expect(ids).toContain("focus")
    expect(ids).toContain("belief") // desire unrated counts
    const withFocus = pendingActions({ ...base, focusAreaIds: ["lm_health"], goals: [{ ...goal, beliefLevel: 8, desireLevel: 4 }] }).map((a) => a.id)
    expect(withFocus).not.toContain("focus")
    expect(withFocus).toContain("shrink") // desire under 7 hits the 7/7 gate
  })
})

describe("v4 — worked example plan", () => {
  it("parses through the full state schema (the fixture is always valid)", () => {
    const ex = buildExamplePlan("2026-07-25")
    expect(ex.vision).toBe(EXAMPLE_VISION)
    const parsed = parseVisionPlanState(JSON.stringify(ex))
    expect(parsed).not.toBeNull()
    expect(parsed!.goals).toHaveLength(3)
    expect(parsed!.focusAreaIds).toEqual(["lm_health", "lm_money"])
    // Deterministic: same input date → same plan.
    expect(buildExamplePlan("2026-07-25")).toEqual(ex)
    // The area goal stays scoped.
    expect(parsed!.goals.find((g) => g.id === "lp-lm_family-g0")!.areaId).toBe("lm_family")
  })
})

describe("v4 — education data integrity", () => {
  it("all principle cards are complete and all UI-referenced ids exist", () => {
    const referenced = ["commit", "values", "vision", "purpose", "identity", "tens", "goals", "focus", "ritual", "rpm", "weekly", "report", "evening", "sos"]
    for (const id of referenced) {
      const c = PRINCIPLES[id]
      expect(c, `principle ${id}`).toBeTruthy()
      expect(c.principle.length).toBeGreaterThan(20)
      expect(c.mechanism.length).toBeGreaterThan(20)
      expect(c.practice.length).toBeGreaterThan(20)
      expect(c.quotes.length).toBeGreaterThanOrEqual(1)
      expect(c.trap.length).toBeGreaterThan(10)
    }
    // v10 added the wrong-thought drill (the change-toolkit's rewrite protocol).
    expect(SOS_PROTOCOLS).toHaveLength(5)
    for (const p of SOS_PROTOCOLS) {
      expect(p.steps.length).toBeGreaterThanOrEqual(3)
      expect(p.closer.length).toBeGreaterThan(10)
    }
  })
})

// ---------------------------------------------------------------------------
// v5 — the real values exercise: pairwise ranking, away-froms, conflict audit
// ---------------------------------------------------------------------------

import { detectValueConflicts, startPairwise, pairwiseQuestion, pairwiseAnswer, VEHICLE_CONVERSIONS } from "@/src/goals/data/valuesFramework"

describe("v5 — values framework", () => {
  it("pairwise insertion ranks correctly with minimal questions", () => {
    // Simulate a user whose true order is A > B > C > D, starting from [B, A, C, D].
    const truth = ["A", "B", "C", "D"]
    let s = startPairwise(["B", "A", "C", "D"])
    let guard = 0
    for (let q = pairwiseQuestion(s); q; q = pairwiseQuestion(s)) {
      s = pairwiseAnswer(s, truth.indexOf(q.a) < truth.indexOf(q.b))
      if (++guard > 20) throw new Error("pairwise did not terminate")
    }
    expect(s.ranked).toEqual(truth)
    expect(guard).toBeLessThanOrEqual(6) // n log n, not n²
  })

  it("single and empty inputs terminate immediately", () => {
    expect(pairwiseQuestion(startPairwise(["only"]))).toBeNull()
    expect(startPairwise(["only"]).ranked).toEqual(["only"])
    expect(pairwiseQuestion(startPairwise([]))).toBeNull()
  })

  it("detects his worked-example conflicts, order-sensitively", () => {
    const conflicts = detectValueConflicts(["Security", "Fun", "Success", "Happiness", "Honesty"], ["Failure"])
    const titles = conflicts.map((c) => c.title)
    expect(titles).toContain("Security ranked above growth")
    expect(titles).toContain("Success ranked above happiness")
    expect(titles).toContain("Success ranked above integrity")
    expect(titles).toContain("Chasing success while fleeing failure")
    // Reversed order → no conflict.
    expect(detectValueConflicts(["Happiness", "Success"], []).map((c) => c.title)).not.toContain("Success ranked above happiness")
    expect(detectValueConflicts([], [])).toEqual([])
  })

  it("vehicle conversions cover the classic means-values", () => {
    for (const probe of ["family", "money", "my career", "fitness"]) {
      expect(VEHICLE_CONVERSIONS.some((v) => v.match.test(probe)), probe).toBe(true)
    }
  })

  it("awayValues round-trips and the guided path asks for them", () => {
    const goal = makeGoal([3])
    const state = {
      vision: "v", intents: [{ id: "i", text: "t", pillarId: "health", pillarLabel: "Health", pillarColor: "#22c55e", objectiveId: null, objectiveLabel: null, confidence: 0.5, spans: [{ text: "t", start: 0, end: 1 }] }],
      goals: [goal], priorityIds: [goal.id], dailyBudget: 4, confirmed: false,
      values: ["Freedom", "Growth", "Love"], awayValues: ["Rejection", "Failure"],
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
    const ids = pendingActions({
      committedAt: MON, values: ["a", "b", "c"], awayValues: [],
      drivingForce: null, yourTens: {}, areaPlans: {}, focusAreaIds: [],
      ritual: null, goals: [goal], progress: null, confirmed: false, today: MON,
    }).map((a) => a.id)
    expect(ids).toContain("away")
  })
})

describe("v5 — foundation-only persistence", () => {
  it("a commit+values state with no plan yet round-trips", () => {
    const state = {
      vision: "", intents: [], goals: [], priorityIds: [], dailyBudget: 4, confirmed: false,
      committedAt: MON, values: ["Love", "Freedom", "Growth"], awayValues: ["Rejection"],
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
    // Mismatched priority list still rejected.
    expect(parseVisionPlanState(JSON.stringify({ ...state, priorityIds: ["ghost"] }))).toBeNull()
  })
})

describe("v9 — RPM block reasons", () => {
  const p: VisionProgress = { startDate: "2026-06-01", completions: {}, tasksDone: [] }

  it("sets, overwrites, and clears a block's fresh reason per day", () => {
    let next = setBlockReason(p, "2026-06-02", "wealth", "ship week")
    expect(dayPlanFor(next, "2026-06-02").blockReasons).toEqual({ wealth: "ship week" })
    next = setBlockReason(next, "2026-06-02", "wealth", "offer page day")
    expect(dayPlanFor(next, "2026-06-02").blockReasons).toEqual({ wealth: "offer page day" })
    next = setBlockReason(next, "2026-06-02", "wealth", "  ")
    expect(dayPlanFor(next, "2026-06-02").blockReasons).toEqual({})
    // yesterday's reason never leaks into another day
    expect(dayPlanFor(next, "2026-06-03").blockReasons).toBeUndefined()
  })

  it("keeps musts and adhoc intact when writing a reason", () => {
    const withMust = toggleMustItem(p, "2026-06-02", "h1")
    const next = setBlockReason(withMust, "2026-06-02", "health", "energy first")
    expect(dayPlanFor(next, "2026-06-02").mustIds).toEqual(["h1"])
  })
})

describe("v9 — numeric RESULT logging + run-rate", () => {
  const p: VisionProgress = { startDate: "2026-06-01", completions: {}, tasksDone: [] }
  const goal = { measure: { unit: "$/month", start: 0, target: 3000, steps: 5 }, targetDate: "2026-08-10" }

  it("logs readings sorted by date and upserts same-day values", () => {
    let next = logMeasure(p, "g1", "2026-06-20", 900)
    next = logMeasure(next, "g1", "2026-06-10", 400)
    expect(next.measureLogs?.g1.map((l) => l.value)).toEqual([400, 900])
    next = logMeasure(next, "g1", "2026-06-20", 950)
    expect(next.measureLogs?.g1.map((l) => l.value)).toEqual([400, 950])
  })

  it("latestMeasure respects the as-of date", () => {
    let next = logMeasure(p, "g1", "2026-06-10", 400)
    next = logMeasure(next, "g1", "2026-06-20", 950)
    expect(latestMeasure(next, "g1", "2026-06-15")?.value).toBe(400)
    expect(latestMeasure(next, "g1", "2026-06-25")?.value).toBe(950)
    expect(latestMeasure(next, "g1", "2026-06-01")).toBeNull()
  })

  it("rejects non-finite values", () => {
    expect(logMeasure(p, "g1", "2026-06-10", NaN)).toBe(p)
  })

  it("measureRunRate compares done-fraction to time-fraction", () => {
    const next = logMeasure(p, "g1", "2026-06-15", 1500)
    const rr = measureRunRate(goal, next, "g1", "2026-06-15")
    expect(rr?.current).toBe(1500)
    expect(rr?.donePct).toBeCloseTo(0.5)
    // 14 of 70 days elapsed
    expect(rr?.timePct).toBeCloseTo(0.2)
  })

  it("returns null without a measure, reading, or dated window", () => {
    expect(measureRunRate({ measure: null, targetDate: "2026-08-10" }, p, "g1", "2026-06-15")).toBeNull()
    expect(measureRunRate(goal, p, "g1", "2026-06-15")).toBeNull()
    const logged = logMeasure(p, "g1", "2026-06-15", 100)
    expect(measureRunRate({ ...goal, targetDate: null }, logged, "g1", "2026-06-15")).toBeNull()
  })
})

describe("v9 — purpose baked into the affirmation sentence", () => {
  it("inlines a short why as 'to …' before the date", () => {
    const s = buildSmartSentence({ title: "First $3k month", type: "milestone_ladder", measure: { unit: "$/month", start: 0, target: 3000, steps: 5 }, targetDate: "2027-01-31", habits: [], why: "Buy back my mornings." })
    expect(s).toBe("I will easily reach at least 3000 $/month (from 0) to buy back my mornings by 2027-01-31.")
  })

  it("leaves the sentence unchanged for long or absent whys", () => {
    const noWhy = buildSmartSentence({ title: "Get strong", type: "habit_ramp", measure: null, targetDate: null, habits: [{ id: "h", title: "Strength", daysPerWeek: 3 }] })
    expect(noWhy).not.toContain(" to ")
    const longWhy = buildSmartSentence({ title: "Get strong", type: "habit_ramp", measure: null, targetDate: null, habits: [], why: "x".repeat(120) })
    expect(longWhy).toBe("I will easily get strong.")
  })
})

describe("v9 — schema round-trips for the new fields", () => {
  const goal = makeGoal([3])
  const base = {
    vision: "v", intents: [], goals: [goal], priorityIds: [goal.id], dailyBudget: 4, confirmed: true,
    progress: { startDate: "2026-06-01", completions: {}, tasksDone: [] },
  }

  it("accepts goal teeth, manifesto lines, primary question, block reasons, measure logs, verdict fixes", () => {
    const full = {
      ...base,
      goals: [{ ...goal, reward: "cabin weekend", stake: "no streaming", obstacles: "mornings eaten → block before email", reasonsList: ["because freedom"] }],
      manifestoName: "Sam",
      manifestoLines: ["I show up on the hard days."],
      drivingForce: { purpose: "grow", reasons: [], identity: [], primaryQuestion: "How do I make today count?" },
      progress: {
        ...base.progress,
        dayPlans: { "2026-06-02": { mustIds: [], adhoc: [], blockReasons: { wealth: "ship week" } } },
        measureLogs: { [goal.id]: [{ date: "2026-06-10", value: 400 }] },
        reportVerdicts: { "2026-06": { [goal.id]: { verdict: "likely-miss" as const, reason: "underplanned", fix: "Money Tuesday" } } },
      },
    }
    expect(parseVisionPlanState(JSON.stringify(full))).toEqual(full)
  })

  it("rejects malformed new fields", () => {
    expect(parseVisionPlanState(JSON.stringify({ ...base, manifestoLines: [""] }))).toBeNull()
    expect(parseVisionPlanState(JSON.stringify({ ...base, progress: { ...base.progress, measureLogs: { g: [{ date: "junk", value: 1 }] } } }))).toBeNull()
  })
})

describe("v10 — ritual design method + weekly matrix", () => {
  const ritual = {
    items: [{ id: "rit-water", title: "Water", minutes: 1 }],
    preset: null,
    builtAt: "2026-06-01",
    weekly: [
      { id: "writ-money", title: "Money Tuesday", areaId: "lm_money", weekday: 1 },
      { id: "writ-jar", title: "Magic-moment jar", areaId: null, weekday: 6 },
    ],
  }

  it("dueWeeklyRituals matches by weekday", () => {
    // 2026-06-02 is a Tuesday (weekday 1), 2026-06-07 a Sunday (6)
    expect(dueWeeklyRituals(ritual, "2026-06-02").map((w) => w.id)).toEqual(["writ-money"])
    expect(dueWeeklyRituals(ritual, "2026-06-07").map((w) => w.id)).toEqual(["writ-jar"])
    expect(dueWeeklyRituals(ritual, "2026-06-03")).toEqual([])
    expect(dueWeeklyRituals(null, "2026-06-02")).toEqual([])
  })

  it("installDay counts 1-based, caps at 30; rotationDue flips at day 31", () => {
    expect(installDay(ritual, "2026-06-01")).toBe(1)
    expect(installDay(ritual, "2026-06-15")).toBe(15)
    expect(installDay(ritual, "2026-08-01")).toBe(30)
    expect(installDay({ ...ritual, builtAt: undefined }, "2026-06-15")).toBeNull()
    expect(rotationDue(ritual, "2026-06-30")).toBe(false)
    expect(rotationDue(ritual, "2026-07-01")).toBe(true)
  })

  it("ritualCoverage reports which of mind/body/spirit are touched", () => {
    expect(ritualCoverage(ritual, RITUAL_DIMENSIONS)).toEqual({ mind: false, body: true, spirit: false })
    const full = { ...ritual, items: [
      { id: "rit-water", title: "w", minutes: 1 },
      { id: "rit-plan", title: "p", minutes: 5 },
      { id: "rit-vision", title: "v", minutes: 2 },
      { id: "custom-x", title: "c", minutes: 2 },
    ] }
    expect(ritualCoverage(full, RITUAL_DIMENSIONS)).toEqual({ mind: true, body: true, spirit: true })
  })

  it("every library step has a dimension; weekly library areas are valid", () => {
    for (const item of RITUAL_LIBRARY) expect(RITUAL_DIMENSIONS[item.id], item.id).toBeTruthy()
    for (const w of WEEKLY_RITUAL_LIBRARY) {
      if (w.areaId) expect(LIFE_MASTERY_AREAS.some((a) => a.id === w.areaId), w.id).toBe(true)
      expect(w.weekday).toBeGreaterThanOrEqual(0)
      expect(w.weekday).toBeLessThanOrEqual(6)
    }
  })
})

describe("v10 — outcome scheduling materializes onto the day", () => {
  // review of week starting Mon 2026-06-01; outcomes apply to the FOLLOWING week
  const base: VisionProgress = {
    startDate: "2026-06-01", completions: {}, tasksDone: [],
    weeklyReviews: [{
      weekStart: "2026-06-01", areaRatings: {}, note: "", focusPillarId: null,
      outcomes: [
        { areaId: "lm_money", outcome: "Ship the offer", why: "income", weekday: 1 },
        { areaId: "lm_health", outcome: "Book physio", why: "back", weekday: 3 },
        { areaId: "lm_fun", outcome: "Unscheduled wish", why: "" },
      ],
    }],
  }

  it("adds the matching weekday's outcome, idempotently, only in the following week", () => {
    // Tue of the following week = 2026-06-09
    const next = materializeOutcomes(base, "2026-06-09")
    expect(dayPlanForV10(next, "2026-06-09").adhoc).toEqual([{ id: "out-2026-06-01-0", title: "Ship the offer", done: false }])
    expect(materializeOutcomes(next, "2026-06-09")).toBe(next)
    // Thu (weekday 3) → the other outcome; unscheduled one never materializes
    const thu = materializeOutcomes(next, "2026-06-11")
    expect(dayPlanForV10(thu, "2026-06-11").adhoc.map((a) => a.id)).toEqual(["out-2026-06-01-1"])
    // Tue INSIDE the reviewed week (2026-06-02) → nothing
    expect(materializeOutcomes(base, "2026-06-02")).toBe(base)
    // Tue two weeks later (2026-06-16, offset 15) → nothing
    expect(materializeOutcomes(base, "2026-06-16")).toBe(base)
  })
})

describe("v10 — 30-day counters + schema round-trips", () => {
  it("counterDay is 1-based and uncapped", () => {
    expect(counterDay({ startDate: "2026-06-01" }, "2026-06-01")).toBe(1)
    expect(counterDay({ startDate: "2026-06-01" }, "2026-07-05")).toBe(35)
  })

  it("round-trips ritual builtAt/weekly, review captures/weekday, areaPlan maintenance, letters, counters", () => {
    const goal = makeGoal([3])
    const full = {
      vision: "v", intents: [], goals: [goal], priorityIds: [goal.id], dailyBudget: 4, confirmed: true,
      ritual: {
        items: [{ id: "rit-water", title: "Water", minutes: 1 }], preset: null, builtAt: "2026-06-01",
        weekly: [{ id: "writ-money", title: "Money Tuesday", areaId: "lm_money", weekday: 1 }],
      },
      areaPlans: { lm_health: { maintenance: "45 min movement daily" } },
      letters: [{ habit: "doom-scroll", thankYou: "you gave me escape", goodbye: "I have better doors now", date: "2026-06-01" }],
      counters: [{ label: "no sugar", startDate: "2026-06-01" }],
      progress: {
        startDate: "2026-06-01", completions: {}, tasksDone: [],
        weeklyReviews: [{
          weekStart: "2026-06-01", areaRatings: { lm_health: 5 }, note: "", focusPillarId: null,
          outcomes: [{ areaId: "lm_money", outcome: "Ship it", why: "w", weekday: 2 }],
          captures: [{ text: "renew passport", areaId: null }, { text: "call accountant", areaId: "lm_money" }],
        }],
      },
    }
    expect(parseVisionPlanState(JSON.stringify(full))).toEqual(full)
    expect(parseVisionPlanState(JSON.stringify({ ...full, counters: [{ label: "", startDate: "2026-06-01" }] }))).toBeNull()
    expect(parseVisionPlanState(JSON.stringify({ ...full, ritual: { ...full.ritual, weekly: [{ id: "x", title: "t", areaId: null, weekday: 7 }] } }))).toBeNull()
  })
})

describe("v11 — mechanical critique fixes", () => {
  it("weekly ratings accept 0 (his scale has a floor end)", () => {
    const goal = makeGoal([3])
    const state = {
      vision: "v", intents: [], goals: [goal], priorityIds: [goal.id], dailyBudget: 4, confirmed: true,
      progress: {
        startDate: "2026-06-01", completions: {}, tasksDone: [],
        weeklyReviews: [{ weekStart: "2026-06-01", areaRatings: { lm_fun: 0, lm_health: 10 }, note: "", focusPillarId: null, challenge: "overbooked evenings — no buffer" }],
        eveningReflections: { "2026-06-02": { amazing: "", better: "", magicMoment: "kid's dinosaur speech" } },
      },
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
    expect(parseVisionPlanState(JSON.stringify({ ...state, progress: { ...state.progress, weeklyReviews: [{ ...state.progress.weeklyReviews[0], areaRatings: { lm_fun: -1 } }] } }))).toBeNull()
  })

  it("bi-weekly matrix rituals fire on alternating weeks only", () => {
    const ritual = {
      items: [{ id: "rit-water", title: "W", minutes: 1 }], preset: null,
      weekly: [{ id: "writ-relationship", title: "Journal", areaId: "lm_relationship", weekday: 0, everyOtherWeek: true }],
    }
    // Mondays 2026-06-01 and 2026-06-08 fall in adjacent anchor weeks
    const a = dueWeeklyRituals(ritual, "2026-06-01").length
    const b = dueWeeklyRituals(ritual, "2026-06-08").length
    expect(a + b).toBe(1)
    // and the cadence repeats: same parity two weeks later
    expect(dueWeeklyRituals(ritual, "2026-06-15").length).toBe(a)
  })

  it("smart sentence carries the 'creating [feeling]' clause", () => {
    const s = buildSmartSentence({ title: "First $3k month", type: "milestone_ladder", measure: { unit: "$/month", start: 0, target: 3000, steps: 5 }, targetDate: "2027-01-31", habits: [], why: "Buy back my mornings", feeling: "Quiet pride" })
    expect(s).toBe("I will easily reach at least 3000 $/month (from 0) to buy back my mornings creating quiet pride by 2027-01-31.")
  })

  it("goal feeling field round-trips", () => {
    const goal = { ...makeGoal([3]), feeling: "freedom" }
    const state = { vision: "v", intents: [], goals: [goal], priorityIds: [goal.id], dailyBudget: 4, confirmed: false }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })
})

describe("v12 — provenance: quoted his-voice strings must be cited (Rule 2)", () => {
  // v14 hardening: a citation alone is not enough — the quoted TEXT must
  // fuzzily match the corpus wording for that videoId (catches composites,
  // injected words, and fabrications wearing a real id).
  const normText = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()
  const corpusByVid = new Map<string, string>()
  for (const e of LIFE_MASTERY_CORPUS) {
    corpusByVid.set(e.videoId, (corpusByVid.get(e.videoId) ?? "") + " " + normText(e.text))
  }
  const verbatimBacked = (display: string, vid: string): boolean => {
    const hay = corpusByVid.get(vid)
    if (!hay) return false
    for (const seg of display.split(/…|\.\.\./)) {
      const words = normText(seg).split(" ").filter(Boolean)
      if (words.length < 4) continue
      const grams: string[] = []
      for (let i = 0; i + 4 <= words.length; i += 2) grams.push(words.slice(i, i + 4).join(" "))
      if (grams.length && grams.filter((g) => hay.includes(g)).length / grams.length < 0.6) return false
    }
    return true
  }

  it("every principle-card quote is cited AND its text matches the corpus for that source", () => {
    const ids = new Set(LIFE_MASTERY_CORPUS.map((e) => e.videoId))
    for (const card of Object.values(PRINCIPLES)) {
      for (const q of card.quotes) {
        const m = /\(([A-Za-z0-9_-]{11})\)\s*$/.exec(q)
        expect(m, `uncited quote: "${q.slice(0, 60)}…"`).toBeTruthy()
        const vid = m![1]
        const inner = q.replace(/\s*\([A-Za-z0-9_-]{11}\)\s*$/, "").replace(/^"|"$/g, "")
        expect(verbatimBacked(inner, vid), `quote text not backed by corpus[${vid}]: "${inner.slice(0, 70)}"`).toBe(true)
      }
    }
    expect(ids.size).toBeGreaterThan(50)
  })

  it("quote-marked spans inside journal script details match their cited source", () => {
    for (const st of RELATIONSHIP_JOURNAL_SCRIPT.steps) {
      for (const m of st.detail.matchAll(/"([^"]{16,})"/g)) {
        expect(verbatimBacked(m[1], st.videoId), `journal quote not backed by corpus[${st.videoId}]: "${m[1].slice(0, 60)}"`).toBe(true)
      }
    }
  })

  it("corpus entries are well-formed and unique", () => {
    const seen = new Set<string>()
    for (const e of LIFE_MASTERY_CORPUS) {
      expect(e.text.length).toBeGreaterThan(0)
      expect(e.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/)
      expect(seen.has(e.id), `duplicate id ${e.id}`).toBe(false)
      seen.add(e.id)
    }
    expect(LIFE_MASTERY_CORPUS.length).toBeGreaterThanOrEqual(400)
  })
})

describe("v13 — Phase-3 content integrity (provenance on every artifact)", () => {
  it("all content structures carry corpus-known videoIds", () => {
    const ids = new Set(LIFE_MASTERY_CORPUS.map((e) => e.videoId))
    for (const l of MANIFESTO_PROGRAM_CREDO) expect(ids.has(l.videoId), `manifesto line source ${l.videoId}`).toBe(true)
    for (const c of INCANTATION_DECK) expect(ids.has(c.videoId), `card source ${c.videoId}: ${c.text.slice(0, 30)}`).toBe(true)
    for (const j of MONEY_JARS) expect(ids.has(j.videoId), `jar source ${j.videoId}`).toBe(true)
    for (const r of MONEY_RULES) expect(ids.has(r.videoId)).toBe(true)
    for (const c of CONSEQUENCE_MENU) expect(ids.has(c.videoId)).toBe(true)
    for (const st of RELATIONSHIP_JOURNAL_SCRIPT.steps) expect(ids.has(st.videoId)).toBe(true)
    for (const ex of RULES_EXERCISE.rewriteExamples) expect(ids.has(ex.videoId)).toBe(true)
    expect(ids.has(RULES_EXERCISE.invertExample.videoId)).toBe(true)
  })

  it("the manifesto is complete (26 credo lines, one source) and jars sum to 100%", () => {
    expect(MANIFESTO_PROGRAM_CREDO).toHaveLength(26)
    expect(new Set(MANIFESTO_PROGRAM_CREDO.map((l) => l.videoId)).size).toBe(1)
    expect(MONEY_JARS.reduce((a, j) => a + j.pct, 0)).toBe(100)
    expect(SIX_NEEDS).toHaveLength(6)
    expect(MASTERY_TEN_KEYS).toHaveLength(10)
    expect(INCANTATION_DECK.length).toBeGreaterThanOrEqual(50)
  })

  it("valueRules round-trips through the state schema", () => {
    const goal = makeGoal([3])
    const state = { vision: "v", intents: [], goals: [goal], priorityIds: [goal.id], dailyBudget: 4, confirmed: false, valueRules: ["I feel successful the moment I wake up."] }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
    expect(parseVisionPlanState(JSON.stringify({ ...state, valueRules: [""] }))).toBeNull()
  })
})

describe("v16 — monthly matrix cadence", () => {
  it("monthly items fire on their day-of-month, ignoring weekday", () => {
    const ritual = {
      items: [{ id: "rit-water", title: "W", minutes: 1 }], preset: null,
      weekly: [{ id: "writ-pl", title: "P&L", areaId: "lm_money", weekday: 0, monthlyDay: 1 }],
    }
    expect(dueWeeklyRituals(ritual, "2026-06-01").map((w) => w.id)).toEqual(["writ-pl"]) // Mon the 1st
    expect(dueWeeklyRituals(ritual, "2026-06-08")).toEqual([]) // a Monday, but not the 1st
    expect(dueWeeklyRituals(ritual, "2026-07-01").map((w) => w.id)).toEqual(["writ-pl"]) // Wed the 1st
  })

  it("round-trips monthlyDay through the schema", () => {
    const goal = makeGoal([3])
    const state = {
      vision: "v", intents: [], goals: [goal], priorityIds: [goal.id], dailyBudget: 4, confirmed: true,
      ritual: { items: [{ id: "rit-water", title: "W", minutes: 1 }], preset: null, weekly: [{ id: "writ-pl", title: "P&L", areaId: null, weekday: 0, monthlyDay: 28 }] },
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
    expect(parseVisionPlanState(JSON.stringify({ ...state, ritual: { ...state.ritual, weekly: [{ ...state.ritual.weekly[0], monthlyDay: 31 }] } }))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// v17 — the area-first rebuild: a third goal shape, real ramps, the goal graph,
// the per-area soft layer, and a load path that repairs instead of nuking.
// ---------------------------------------------------------------------------

describe("v17 — per-area soft layer rolls up with provenance", () => {
  const base = { values: undefined, affirmations: undefined, incantations: undefined, valueRules: undefined }

  it("a value authored in one area keeps that area as its provenance", () => {
    const out = softLayerRollup({ ...base, areaPlans: { lm_health: { values: ["Vitality"] } } }, "values")
    expect(out).toEqual([{ text: "Vitality", areaIds: ["lm_health"], lifeWide: false }])
  })

  it("the same text in three areas collapses to ONE entry naming all three", () => {
    const out = softLayerRollup({
      ...base,
      areaPlans: {
        lm_health: { values: ["Freedom"] },
        lm_money: { values: ["Freedom"] },
        lm_fun: { values: ["Freedom"] },
      },
    }, "values", ["lm_money", "lm_health", "lm_fun"])
    expect(out).toHaveLength(1)
    expect(out[0].areaIds).toEqual(["lm_money", "lm_health", "lm_fun"]) // areaOrder wins
  })

  it("area-authored AND life-wide keeps both facts", () => {
    const out = softLayerRollup({
      ...base,
      values: ["Freedom"],
      areaPlans: { lm_health: { values: ["Freedom"] } },
    }, "values")
    expect(out).toEqual([{ text: "Freedom", areaIds: ["lm_health"], lifeWide: true }])
  })

  it("a life-wide-only entry has no areas and sorts after the area-authored ones", () => {
    const out = softLayerRollup({
      ...base,
      values: ["Courage"],
      areaPlans: { lm_health: { values: ["Vitality"] } },
    }, "values")
    expect(out.map((e) => e.text)).toEqual(["Vitality", "Courage"])
    expect(out[1]).toEqual({ text: "Courage", areaIds: [], lifeWide: true })
  })

  it("matching ignores case and whitespace; the FIRST spelling is returned", () => {
    const out = softLayerRollup({
      ...base,
      areaPlans: { lm_health: { values: ["Freedom"] }, lm_money: { values: ["  freedom  "] } },
    }, "values", ["lm_health", "lm_money"])
    expect(out).toHaveLength(1)
    expect(out[0].text).toBe("Freedom")
    expect(out[0].areaIds).toEqual(["lm_health", "lm_money"])
  })

  it("'rules' maps to the life-wide valueRules field, not values", () => {
    const state = { ...base, values: ["NotThis"], valueRules: ["I feel strong anytime I train"] }
    const out = softLayerRollup({ ...state, areaPlans: {} }, "rules")
    expect(out).toEqual([{ text: "I feel strong anytime I train", areaIds: [], lifeWide: true }])
  })

  it("all four kinds resolve independently", () => {
    const state = {
      areaPlans: { lm_health: { values: ["V"], affirmations: ["A"], incantations: ["I"], rules: ["R"] } },
      ...base,
    }
    expect(softLayerRollup(state, "values")[0].text).toBe("V")
    expect(softLayerRollup(state, "affirmations")[0].text).toBe("A")
    expect(softLayerRollup(state, "incantations")[0].text).toBe("I")
    expect(softLayerRollup(state, "rules")[0].text).toBe("R")
  })

  it("empty everything is an empty list", () => {
    expect(softLayerRollup({ ...base, areaPlans: {} }, "values")).toEqual([])
  })
})

describe("v17 — goal graph: edges, cycles, deletion", () => {
  const graph = () => {
    const a = { ...makeGoal([3]), id: "a", title: "Sleep", areaId: "lm_health" }
    const b = { ...makeGoal([3]), id: "b", title: "Revenue", areaId: "lm_money" }
    const c = { ...makeGoal([3]), id: "c", title: "Focus", areaId: "lm_health" }
    return [a, b, c]
  }

  it("addGoalEdge writes on the SOURCE only — direction is outward", () => {
    const g = addGoalEdge(graph(), "a", "b")
    expect(g.find((x) => x.id === "a")!.feedsGoalIds).toEqual(["b"])
    expect(g.find((x) => x.id === "b")!.feedsGoalIds).toBeUndefined()
  })

  it("goalFeeders is the exact inverse of feedsGoalIds", () => {
    const g = addGoalEdge(addGoalEdge(graph(), "a", "b"), "c", "b")
    expect(goalFeeders(g, "b").map((x) => x.id)).toEqual(["a", "c"])
    expect(goalFeeders(g, "a")).toEqual([])
  })

  it("goalEdges flags cross-area edges by effective area", () => {
    const g = addGoalEdge(addGoalEdge(graph(), "a", "b"), "a", "c")
    const edges = goalEdges(g)
    expect(edges.find((e) => e.toId === "b")!.crossArea).toBe(true)  // health → money
    expect(edges.find((e) => e.toId === "c")!.crossArea).toBe(false) // health → health
  })

  it("goalEdges falls back to the pillar when areaId is absent", () => {
    const a = { ...makeGoal([3]), id: "a", feedsGoalIds: ["b"] }
    const b = { ...makeGoal([3]), id: "b" }
    expect(goalEdges([a, b])[0].crossArea).toBe(false) // same pillar, no areaId
  })

  it("wouldCycle catches direct and 3-hop back-edges, and allows a diamond", () => {
    const direct = addGoalEdge(graph(), "a", "b")
    expect(wouldCycle(direct, "b", "a")).toBe(true)
    const chain = addGoalEdge(addGoalEdge(graph(), "a", "b"), "b", "c")
    expect(wouldCycle(chain, "c", "a")).toBe(true)
    // diamond: a→b, a→c, then c→b is two paths to b, not a loop
    const diamond = addGoalEdge(addGoalEdge(graph(), "a", "b"), "a", "c")
    expect(wouldCycle(diamond, "c", "b")).toBe(false)
  })

  it("addGoalEdge fails closed on every bad edge", () => {
    const g = graph()
    expect(() => addGoalEdge(g, "nope", "b")).toThrow(/Unknown goal id "nope"/)
    expect(() => addGoalEdge(g, "a", "nope")).toThrow(/Unknown goal id "nope"/)
    expect(() => addGoalEdge(g, "a", "a")).toThrow(/can't feed itself/)
    const once = addGoalEdge(g, "a", "b")
    expect(() => addGoalEdge(once, "a", "b")).toThrow(/already feeds/)
    expect(() => addGoalEdge(once, "b", "a")).toThrow(/loop.*"Sleep".*"Revenue"/)
  })

  it("removeGoalEdge drops just that edge", () => {
    const g = removeGoalEdge(addGoalEdge(addGoalEdge(graph(), "a", "b"), "a", "c"), "a", "b")
    expect(g.find((x) => x.id === "a")!.feedsGoalIds).toEqual(["c"])
  })

  it("removeGoal strips every inbound edge — no survivor references it", () => {
    const g = removeGoal(addGoalEdge(addGoalEdge(graph(), "a", "b"), "c", "b"), "b")
    expect(g.map((x) => x.id)).toEqual(["a", "c"])
    expect(g.flatMap((x) => x.feedsGoalIds ?? [])).not.toContain("b")
  })
})

describe("v17 — loadVisionPlanState repairs instead of nuking", () => {
  const stateWith = (goals: VisionGoalDraft[]) => ({
    vision: "v", intents: [], goals, priorityIds: goals.map((g) => g.id), dailyBudget: 4, confirmed: false,
  })

  it("a dangling edge is dropped and REPORTED — the plan survives", () => {
    const a = { ...makeGoal([3]), id: "a", feedsGoalIds: ["ghost"] }
    const loaded = loadVisionPlanState(JSON.stringify(stateWith([a])))!
    expect(loaded.state.goals[0].feedsGoalIds).toEqual([])
    expect(loaded.repairs).toEqual([{ kind: "dangling-edge", goalId: "a", missingId: "ghost" }])
  })

  it("parseVisionPlanState returns the repaired state, not null", () => {
    const a = { ...makeGoal([3]), id: "a", feedsGoalIds: ["ghost"] }
    const parsed = parseVisionPlanState(JSON.stringify(stateWith([a])))
    expect(parsed).not.toBeNull()
    expect(parsed!.goals[0].feedsGoalIds).toEqual([])
  })

  it("a persisted cycle is broken deterministically and reported", () => {
    const a = { ...makeGoal([3]), id: "a", feedsGoalIds: ["b"] }
    const b = { ...makeGoal([3]), id: "b", feedsGoalIds: ["a"] }
    const loaded = loadVisionPlanState(JSON.stringify(stateWith([a, b])))!
    expect(loaded.repairs).toEqual([{ kind: "cycle-broken", goalId: "b", removedId: "a" }])
    const goals = loaded.state.goals
    for (const g of goals) {
      for (const to of g.feedsGoalIds ?? []) expect(wouldCycle(goals, to, g.id)).toBe(true)
    }
    expect(goals.find((g) => g.id === "b")!.feedsGoalIds).toEqual([])
  })

  it("a habit_ramp that lost its phases is backfilled from its habits", () => {
    const a = { ...makeGoal([5, 2]), id: "a", type: "habit_ramp" as const, rampSteps: null }
    const loaded = loadVisionPlanState(JSON.stringify(stateWith([a])))!
    expect(loaded.state.goals[0].rampSteps).toEqual([{ frequencyPerWeek: 5, durationWeeks: 4 }])
    expect(loaded.repairs).toEqual([{ kind: "ramp-backfilled", goalId: "a" }])
  })

  it("a clean plan reports nothing", () => {
    expect(loadVisionPlanState(JSON.stringify(stateWith([makeGoal([3])])))!.repairs).toEqual([])
  })

  it("broken priorityIds is STILL fatal — the balancer would silently drop goals", () => {
    const g = makeGoal([3])
    const bad = { ...stateWith([g]), priorityIds: [] }
    expect(loadVisionPlanState(JSON.stringify(bad))).toBeNull()
    expect(parseVisionPlanState(JSON.stringify(bad))).toBeNull()
  })

  it("a milestone with no measure is hard-rejected, never coerced", () => {
    // No writer can produce this: parseGoalGenResponse and createAreaGoal both
    // throw without a measure. Coercing it would change the goal's meaning.
    const bad = { ...makeGoal([3]), id: "a", type: "milestone_ladder" as const, measure: null }
    expect(loadVisionPlanState(JSON.stringify(stateWith([bad])))).toBeNull()
  })

  it("an achievement carrying a measure is hard-rejected too", () => {
    const bad = { ...makeGoal([3]), id: "a", type: "achievement" as const, measure: { unit: "reps", start: 0, target: 5, steps: 5 } }
    expect(loadVisionPlanState(JSON.stringify(stateWith([bad])))).toBeNull()
  })
})

describe("v17 — achievement goals", () => {
  const TODAY = "2026-07-28"

  it("createAreaGoal builds a binary goal: no measure, a date, one practice habit", () => {
    const g = createAreaGoal({ areaId: "lm_fitness", title: "First muscle-up", type: "achievement", why: "", targetDate: "2027-03-01" }, [])
    expect(g.measure).toBeNull()
    expect(g.targetDate).toBe("2027-03-01")
    expect(g.habits).toHaveLength(1)
    expect(g.habits[0].title).toBe("Work toward: First muscle-up")
  })

  it("passing a measure to an achievement throws", () => {
    expect(() => createAreaGoal({
      areaId: "lm_fitness", title: "First muscle-up", type: "achievement", why: "",
      measure: { unit: "reps", start: 0, target: 1, steps: 5 },
    }, [])).toThrow(/binary/)
  })

  it("checkpoints become tasks with sequential ids and preserved offsets", () => {
    const g = createAreaGoal({
      areaId: "lm_fitness", title: "First muscle-up", type: "achievement", why: "",
      checkpoints: [{ title: "10 strict pull-ups", dueOffsetDays: 60 }, { title: "Band-assisted rep", dueOffsetDays: 120 }],
    }, [])
    expect(g.tasks).toEqual([
      { id: `${g.id}-t0`, title: "10 strict pull-ups", dueOffsetDays: 60 },
      { id: `${g.id}-t1`, title: "Band-assisted rep", dueOffsetDays: 120 },
    ])
  })

  it("goalHorizon dates an achievement instead of calling it 'now'", () => {
    const g = { ...makeGoal([3]), type: "achievement" as const, targetDate: addDays(TODAY, 400) }
    expect(goalHorizon(g, TODAY)).not.toBe("now")
  })

  it("goalRollup needs no new track math — it blends habits and checkpoints", () => {
    const g = createAreaGoal({
      areaId: "lm_fitness", title: "First muscle-up", type: "achievement", why: "", daysPerWeek: 3,
      checkpoints: [{ title: "c1", dueOffsetDays: 7 }, { title: "c2", dueOffsetDays: 14 }],
    }, [])
    const balanced = balancePlan([g], { dailyBudget: 4, rampWeeks: 4 })
    const progress = { startDate: TODAY, completions: {}, tasksDone: [`${g.id}-t0`] }
    const roll = goalRollup(g, balanced, progress, addDays(TODAY, 21))
    expect(roll.percent).toBeGreaterThanOrEqual(0)
    expect(roll.percent).toBeLessThanOrEqual(100)
  })

  it("balancePlan schedules an achievement's checkpoints like any other task", () => {
    const g = createAreaGoal({
      areaId: "lm_fitness", title: "First muscle-up", type: "achievement", why: "", daysPerWeek: 2,
      checkpoints: [{ title: "c1", dueOffsetDays: 7 }],
    }, [])
    const plan = balancePlan([g], { dailyBudget: 4, rampWeeks: 4 })
    expect(plan.tasks.some((t) => t.taskId === `${g.id}-t0`)).toBe(true)
  })

  it("an achievement round-trips through the schema", () => {
    const g = createAreaGoal({ areaId: "lm_fitness", title: "First muscle-up", type: "achievement", why: "w", targetDate: "2027-03-01" }, [])
    const state = { vision: "v", intents: [], goals: [g], priorityIds: [g.id], dailyBudget: 4, confirmed: false }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })
})

describe("v17 — classifyGoalInput knows an achievement from a habit", () => {
  const TODAY = "2026-07-28"
  const type = (s: string) => classifyGoalInput(s, TODAY).type

  it("achievement-shaped input becomes an achievement", () => {
    for (const s of ["muscle up", "get my driver's licence", "run a marathon", "first pull-up", "my first handstand", "quit smoking", "buy a house", "graduate"]) {
      expect(type(s), s).toBe("achievement")
    }
  })

  it("practice-shaped input stays a habit", () => {
    for (const s of ["meditate", "gym 4x/week", "read daily", "journal every morning", "5 days a week of cardio", "presence with my kids"]) {
      expect(type(s), s).toBe("habit_ramp")
    }
  })

  it("a gradable comparative is a practice, not a finish line", () => {
    expect(type("get better at guitar")).toBe("habit_ramp")
    expect(type("get stronger")).toBe("habit_ramp")
  })

  it("an explicit cadence beats an achievement verb", () => {
    expect(type("buy groceries every week")).toBe("habit_ramp")
  })

  it("an achievement verb WITH an ascending count is a real ladder", () => {
    expect(classifyGoalInput("publish 3 articles", TODAY)).toMatchObject({ type: "milestone_ladder", measure: { unit: "articles", start: 0, target: 3, steps: 5 } })
    expect(classifyGoalInput("earn 100k", TODAY).measure).toMatchObject({ unit: "$", target: 100000 })
    expect(classifyGoalInput("run 10k", TODAY).measure).toMatchObject({ unit: "km", target: 10 })
    expect(classifyGoalInput("hit 100 pushups", TODAY).measure).toMatchObject({ target: 100 })
  })

  it("a DESCENDING target stays binary — we never invent a start value", () => {
    const g = classifyGoalInput("run a marathon under 4 hours", TODAY)
    expect(g.type).toBe("achievement")
    expect(g.measure).toBeNull()
  })

  it("ordinals and bare years never become measures", () => {
    expect(classifyGoalInput("my 1st marathon", TODAY).measure).toBeNull()
    expect(classifyGoalInput("the 2026 goal", TODAY).measure).toBeNull()
  })

  it("every achievement has a null measure and a date; every milestone a real range", () => {
    for (const s of ["muscle up", "quit smoking", "publish 3 articles", "bench 100 kg", "meditate daily"]) {
      const g = classifyGoalInput(s, TODAY)
      if (g.type === "achievement") {
        expect(g.measure, s).toBeNull()
        expect(g.targetDate, s).not.toBeNull()
      }
      if (g.type === "milestone_ladder") {
        expect(g.measure!.target, s).toBeGreaterThan(g.measure!.start)
      }
    }
  })

  it("is pure — same input and same today give an identical result", () => {
    expect(classifyGoalInput("run a marathon", TODAY)).toEqual(classifyGoalInput("run a marathon", TODAY))
    expect(classifyGoalInput("run a marathon", "2030-01-01").targetDate).toBe("2031-01-01")
  })

  it("output still feeds createAreaGoal without throwing, for all three shapes", () => {
    for (const s of ["bench 100 kg", "gym 4x/week", "muscle up"]) {
      const c = classifyGoalInput(s, TODAY)
      expect(() => createAreaGoal({ areaId: "lm_fitness", ...c }, []), s).not.toThrow()
    }
  })
})

describe("v17 — createAreaGoal takes real multi-phase ramps", () => {
  const ramp = [{ frequencyPerWeek: 2, durationWeeks: 4 }, { frequencyPerWeek: 3, durationWeeks: 4 }, { frequencyPerWeek: 5, durationWeeks: 8 }]
  const build = (over: Record<string, unknown> = {}) =>
    createAreaGoal({ areaId: "lm_fitness", title: "Train", type: "habit_ramp", why: "", rampSteps: ramp, ...over } as never, [])

  it("stores the phases verbatim", () => {
    expect(build().rampSteps).toEqual(ramp)
  })

  it("habits[0].daysPerWeek is the LAST phase — the balancer sizes on steady state", () => {
    expect(build().habits[0].daysPerWeek).toBe(5)
  })

  it("rampFrequencyForWeek walks the phases and then holds", () => {
    const g = build()
    expect(rampFrequencyForWeek(g.rampSteps!, 0)).toBe(2)
    expect(rampFrequencyForWeek(g.rampSteps!, 5)).toBe(3)
    expect(rampFrequencyForWeek(g.rampSteps!, 9)).toBe(5)
    expect(rampFrequencyForWeek(g.rampSteps!, 40)).toBe(5)
  })

  it("fails closed on every malformed ramp", () => {
    expect(() => build({ rampSteps: [] })).toThrow(/1-8 phases/)
    expect(() => build({ rampSteps: Array(9).fill({ frequencyPerWeek: 1, durationWeeks: 1 }) })).toThrow(/1-8 phases/)
    expect(() => build({ rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 0 }] })).toThrow(/Phase 1.*weeks/)
    expect(() => build({ rampSteps: [{ frequencyPerWeek: 2.5, durationWeeks: 4 }] })).toThrow(/Phase 1.*whole number/)
    expect(() => build({ rampSteps: [{ frequencyPerWeek: 31, durationWeeks: 4 }] })).toThrow(/Phase 1.*1-30/)
    expect(() => build({ rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 52 }, { frequencyPerWeek: 3, durationWeeks: 52 }, { frequencyPerWeek: 3, durationWeeks: 4 }] })).toThrow(/two years/)
  })

  it("omitting rampSteps keeps the legacy single flat phase", () => {
    const g = createAreaGoal({ areaId: "lm_fitness", title: "Train", type: "habit_ramp", why: "", daysPerWeek: 4 }, [])
    expect(g.rampSteps).toEqual([{ frequencyPerWeek: 4, durationWeeks: 4 }])
  })

  it("a ramp is now RETAINED for milestone and achievement goals, not nulled", () => {
    const m = createAreaGoal({ areaId: "lm_fitness", title: "Bench 100", type: "milestone_ladder", why: "", rampSteps: ramp, measure: { unit: "kg", start: 0, target: 100, steps: 5 } }, [])
    expect(m.rampSteps).toEqual(ramp)
    const a = createAreaGoal({ areaId: "lm_fitness", title: "Muscle-up", type: "achievement", why: "", rampSteps: ramp }, [])
    expect(a.rampSteps).toEqual(ramp)
  })

  it("feedsGoalIds referencing an unknown goal throws", () => {
    expect(() => createAreaGoal({ areaId: "lm_fitness", title: "T", type: "habit_ramp", why: "", feedsGoalIds: ["ghost"] }, ["real"])).toThrow(/Unknown goal id "ghost"/)
    expect(() => createAreaGoal({ areaId: "lm_fitness", title: "T", type: "habit_ramp", why: "", feedsGoalIds: ["real"] }, ["real"])).not.toThrow()
  })
})

describe("v17 — schema round-trips for the new fields", () => {
  const goal = () => ({
    ...makeGoal([3]),
    id: "g-v17",
    feedsGoalIds: [],
    whoItServes: "my kids",
    unlocks: "mornings without dread",
    firstStep: "book the gym induction",
  })

  it("a full v17 state round-trips", () => {
    const g = goal()
    const state = {
      vision: "v", intents: [], goals: [g], priorityIds: [g.id], dailyBudget: 4, confirmed: false,
      yourZeros: { lm_health: "Exhausted by 3pm every day" },
      baselineRatedAt: { lm_health: "2026-07-28" },
      affirmations: ["I am the master of my life"],
      areaScope: { lm_health: "deep" as const, lm_fun: "later" as const },
      areaPlans: {
        lm_health: {
          purpose: "energy", identity: "I'm an athlete", whyWork: "everything else runs on it",
          values: ["Vitality"], affirmations: ["I am strong"], incantations: ["All I need is within me"], rules: ["I feel fit anytime I move"],
        },
      },
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })

  it("a PRE-v17 blob hydrates unchanged — the migration guarantee", () => {
    const g = makeGoal([3])
    const old = { vision: "v", intents: [], goals: [g], priorityIds: [g.id], dailyBudget: 4, confirmed: true }
    expect(parseVisionPlanState(JSON.stringify(old))).toEqual(old)
  })

  it("rejects over-limit soft lists and edges", () => {
    const g = goal()
    const withState = (over: Record<string, unknown>) => JSON.stringify({
      vision: "v", intents: [], goals: [g], priorityIds: [g.id], dailyBudget: 4, confirmed: false, ...over,
    })
    expect(parseVisionPlanState(withState({ areaPlans: { lm_health: { values: Array(11).fill("v") } } }))).toBeNull()
    expect(parseVisionPlanState(withState({ affirmations: [""] }))).toBeNull()
    expect(parseVisionPlanState(withState({ baselineRatedAt: { lm_health: "28-07-2026" } }))).toBeNull()
    expect(parseVisionPlanState(withState({ areaScope: { lm_health: "kinda" } }))).toBeNull()
    const many = { ...g, feedsGoalIds: Array(13).fill("x") }
    expect(parseVisionPlanState(JSON.stringify({ vision: "v", intents: [], goals: [many], priorityIds: [many.id], dailyBudget: 4, confirmed: false }))).toBeNull()
  })

  it("rejects a 9-phase ramp and frequency 31, but ACCEPTS 30", () => {
    const mk = (rampSteps: unknown) => {
      const g = { ...makeGoal([3]), rampSteps }
      return JSON.stringify({ vision: "v", intents: [], goals: [g], priorityIds: [g.id], dailyBudget: 4, confirmed: false })
    }
    expect(parseVisionPlanState(mk(Array(9).fill({ frequencyPerWeek: 3, durationWeeks: 4 })))).toBeNull()
    expect(parseVisionPlanState(mk([{ frequencyPerWeek: 31, durationWeeks: 4 }]))).toBeNull()
    // 30 stays legal: framework drivers really do run "15-20 approaches a week".
    expect(parseVisionPlanState(mk([{ frequencyPerWeek: 30, durationWeeks: 4 }]))).not.toBeNull()
  })
})

describe("v17 — the LLM can propose achievements", () => {
  const goal = (over: Record<string, unknown> = {}) => ({
    title: "First muscle-up", pillarId: "health", objectiveId: null, type: "achievement",
    why: "because", sourceIntentIds: ["intent-0"],
    habits: [{ title: "Pull work", daysPerWeek: 3, basedOnTargetId: null }],
    tasks: [{ title: "10 strict pull-ups", dueOffsetDays: 60 }],
    measure: null, rampSteps: null, targetDate: "2027-03-01", ...over,
  })

  it("parses an achievement with checkpoints as tasks and no measure", () => {
    const [g] = parseGoalGenResponse(JSON.stringify({ goals: [goal()] }))
    expect(g.type).toBe("achievement")
    expect(g.measure).toBeNull()
    expect(g.tasks).toHaveLength(1)
    expect(g.targetDate).toBe("2027-03-01")
  })

  it("rejects a faked ladder on an achievement", () => {
    expect(() => parseGoalGenResponse(JSON.stringify({
      goals: [goal({ measure: { unit: "reps", start: 0, target: 1, steps: 5 } })],
    }))).toThrow(/achievement but carries a measure/)
  })

  it("the prompt tells the model the third shape exists", () => {
    const prompt = buildGoalGenPrompt({
      vision: "v",
      intents: [{ id: "intent-0", text: "t", pillarId: "health", pillarLabel: "Health", objectiveId: null, objectiveLabel: null }],
    })
    expect(prompt).toContain("achievement")
    expect(prompt).toContain("BINARY")
  })
})
