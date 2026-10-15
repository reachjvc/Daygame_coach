/**
 * THE VISION-PLAN SERVICE'S CONTRACT.
 *
 * These came back from the retired visionPlanService.test.ts on 2026-10-13
 * because app/api/goals/vision-plan/* shipped: any signed-in account could
 * call it, and each call ran Claude, though only the /test/vision-plan lab
 * used it. On 2026-10-15 the routes moved under app/api/test/goals/, where the
 * proxy refuses them in production. The tests stay for the service, which
 * Life Mastery also uses (northStarService, north-star/GoalCard).
 */
import { describe, it, expect } from "vitest"
import {
  buildGoalGenPrompt,
  parseGoalGenResponse,
  balancePlan,
  buildGoalRefinePrompt,
  parseGoalRefineResponse,
  VisionPlanRequestSchema,
  goalHorizon,
  addDays,
  monthOptions,
  monthlyReport,
  buildReportCommentaryPrompt,
  parseReportCommentary,
  readGoalVehicle,
  REASON_PROMPTS,
  buildReasonsPrompt,
  parseReasonsResponse,
} from "@/src/goals/visionPlanService"
import { goalFeedsArea } from "@/src/goals/data/lifeMasteryAreas"
import { PILLARS } from "@/src/goals/data/newGoalFramework"
import { RITUAL_LIBRARY } from "@/src/goals/data/visionRoutineLibrary"
import type { VisionGoalDraft, VisionProgress } from "@/src/goals/types"

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
    // v24 — one taxonomy: every goal carries its area explicitly. The loader
    // stamps it for legacy blobs, so a fixture without it isn't round-trippable.
    areaId: "lm_health",
  }
}

const MON = "2026-06-01"

function baseProgress(overrides: Partial<VisionProgress> = {}): VisionProgress {
  return { startDate: MON, completions: {}, tasksDone: [], ...overrides }
}

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

  // v25 — the room tray re-drafts on every goal the user writes, so the prompt
  // has to say what the room already holds and that rule 1 is off.
  it("stays a plan build when suggestFor is absent", () => {
    expect(buildGoalGenPrompt(REQ)).not.toContain("SUGGESTION-TRAY MODE")
  })

  it("switches to tray mode, lists what the room already has, and leads with the anchor", () => {
    const prompt = buildGoalGenPrompt({
      ...REQ,
      suggestFor: { anchor: "Bench 100 kg", have: ["Bench 100 kg", "Gym 4x/week"] },
    })
    expect(prompt).toContain("SUGGESTION-TRAY MODE")
    expect(prompt).toContain("OVERRIDES rule 1")
    expect(prompt).toContain("- Bench 100 kg")
    expect(prompt).toContain("- Gym 4x/week")
    expect(prompt).toContain('THE LINE THEY JUST WROTE: "Bench 100 kg"')
  })

  it("omits the anchor line when the tray was seeded by the 10 alone", () => {
    const prompt = buildGoalGenPrompt({ ...REQ, suggestFor: { anchor: null, have: ["Gym 4x/week"] } })
    expect(prompt).toContain("SUGGESTION-TRAY MODE")
    expect(prompt).toContain("- Gym 4x/week")
    expect(prompt).not.toContain("THE LINE THEY JUST WROTE")
  })
})


describe("VisionPlanRequestSchema", () => {
  it("accepts a valid request and rejects an empty or oversized one", () => {
    expect(VisionPlanRequestSchema.safeParse(REQ).success).toBe(true)
    expect(VisionPlanRequestSchema.safeParse({ vision: "x", intents: [] }).success).toBe(false)
    expect(VisionPlanRequestSchema.safeParse({ vision: "a".repeat(3000), intents: REQ.intents }).success).toBe(false)
  })

  it("accepts a tray refill and rejects an oversized one", () => {
    const tray = (have: string[]) => ({ ...REQ, suggestFor: { anchor: "Bench 100 kg", have } })
    expect(VisionPlanRequestSchema.safeParse(tray(["Gym 4x/week"])).success).toBe(true)
    expect(VisionPlanRequestSchema.safeParse({ ...REQ, suggestFor: { anchor: null, have: [] } }).success).toBe(true)
    expect(VisionPlanRequestSchema.safeParse(tray(Array(61).fill("Gym"))).success).toBe(false)
    expect(VisionPlanRequestSchema.safeParse(tray(["a".repeat(200)])).success).toBe(false)
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



describe("v18 — the reasons drill actually helps", () => {
  it("reads a goal title as a vehicle and names the ends underneath", () => {
    // "girlfriend" contains "friend" — the Friends rule must not swallow it.
    expect(readGoalVehicle("Get a girlfriend")).toEqual({ label: "Relationship", ends: ["Love", "Intimacy", "Passion", "Companionship", "Connection"] })
    expect(readGoalVehicle("Get a boyfriend")?.label).toBe("Relationship")
    expect(readGoalVehicle("Go on more dates")?.label).toBe("Relationship")
    expect(readGoalVehicle("See my friends more")?.label).toBe("Friends")
    expect(readGoalVehicle("Build passive income")).toEqual({ label: "Money", ends: ["Freedom", "Security", "Abundance", "Significance"] })
    // A bare number names no vehicle word — we decline rather than guess.
    expect(readGoalVehicle("Make 10k a month")).toBeNull()
  })

  it("returns null rather than guessing when the title names no known vehicle", () => {
    expect(readGoalVehicle("Do a strict muscle-up")).toBeNull()
    expect(readGoalVehicle("   ")).toBeNull()
  })

  it("hands back a fresh ends array — callers edit it without mutating the table", () => {
    const a = readGoalVehicle("relationship")!
    const before = a.ends.length
    a.ends.push("Mutated")
    expect(readGoalVehicle("relationship")!.ends).toHaveLength(before)
  })

  it("prompts cover distinct angles, not one restated", () => {
    expect(REASON_PROMPTS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(REASON_PROMPTS.map((p) => p.id)).size).toBe(REASON_PROMPTS.length)
    // The blunt ones are the point — a polite list doesn't move anyone.
    expect(REASON_PROMPTS.some((p) => /sex|touch/i.test(p.question))).toBe(true)
    expect(REASON_PROMPTS.some((p) => /takes? from you/i.test(p.question))).toBe(true)
  })

  it("the prompt tells the model to copy the user's voice and not sanitise", () => {
    const p = buildReasonsPrompt("Get a girlfriend", "I'm tired of my own company", ["Because I want to be touched"], 20)
    expect(p).toContain("Get a girlfriend")
    expect(p).toContain("I'm tired of my own company")
    expect(p).toContain("Because I want to be touched")
    expect(p).toMatch(/do not sanitise/i)
    expect(p).toContain("20 MORE")
  })

  it("handles an empty starting list without pretending there are examples", () => {
    expect(buildReasonsPrompt("Get a girlfriend", "", [], 10)).toContain("haven't written any yet")
  })

  it("parses an expansion and drops duplicates of what's already there", () => {
    const raw = JSON.stringify({ reasons: ["Because I want to be touched", "  BECAUSE I WANT TO BE TOUCHED  ", "So Sunday isn't silent"] })
    expect(parseReasonsResponse(raw, ["because i want to be touched"])).toEqual(["So Sunday isn't silent"])
  })

  it("de-duplicates within the batch too", () => {
    const raw = JSON.stringify({ reasons: ["Same thing", "same thing", "Different"] })
    expect(parseReasonsResponse(raw, [])).toEqual(["Same thing", "Different"])
  })

  it("fails closed — never a silent empty list", () => {
    expect(() => parseReasonsResponse("not json", [])).toThrow(/unparseable/)
    expect(() => parseReasonsResponse(JSON.stringify({ nope: [] }), [])).toThrow(/schema/)
    expect(() => parseReasonsResponse(JSON.stringify({ reasons: ["dupe"] }), ["Dupe"])).toThrow(/duplicated/)
  })

  it("tolerates markdown fences the CLI sometimes adds", () => {
    expect(parseReasonsResponse('```json\n{"reasons":["A real one"]}\n```', [])).toEqual(["A real one"])
  })
})



describe("v23 — refine reshapes the plan without deleting the user's work", () => {
  const qualified = {
    ...makeGoal([3]),
    id: "goal-1",
    areaId: "lm_fitness",
    beliefLevel: 9,
    desireLevel: 8,
    painWhy: "I stay stuck",
    reward: "a trip",
    stake: "$100 to a cause I hate",
    obstacles: "shiny objects",
    feeling: "quiet pride",
    smartSentence: "I will easily train 4x a week by December.",
    reasonsList: ["because my kids watch", "because I said I would"],
  }
  const llm = JSON.stringify({
    goals: [{
      title: "Train four times a week",
      pillarId: "health",
      objectiveId: null,
      type: "habit_ramp",
      why: "so training stops being a decision",
      sourceIntentIds: ["i1"],
      habits: [{ title: "Strength session", daysPerWeek: 4 }],
      tasks: [],
      measure: null,
      rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 4 }, { frequencyPerWeek: 4, durationWeeks: 8 }],
    }],
  })

  it("keeps every hand-written qualification field", () => {
    const out = parseGoalRefineResponse(llm, qualified as never, "x")
    expect(out.beliefLevel).toBe(9)
    expect(out.desireLevel).toBe(8)
    expect(out.painWhy).toBe("I stay stuck")
    expect(out.reward).toBe("a trip")
    expect(out.stake).toBe("$100 to a cause I hate")
    expect(out.obstacles).toBe("shiny objects")
    expect(out.feeling).toBe("quiet pride")
    expect(out.smartSentence).toBe("I will easily train 4x a week by December.")
    expect(out.reasonsList).toEqual(["because my kids watch", "because I said I would"])
  })

  it("keeps areaId — losing it silently re-routes the goal to another area", () => {
    const out = parseGoalRefineResponse(llm, qualified as never, "x")
    expect(out.areaId).toBe("lm_fitness")
    expect(goalFeedsArea(out, "lm_fitness")).toBe(true)
    expect(goalFeedsArea(out, "lm_health")).toBe(false)
  })

  it("still replaces the decomposition it was asked to change", () => {
    const out = parseGoalRefineResponse(llm, qualified as never, "x")
    expect(out.habits[0].title).toBe("Strength session")
    expect(out.rampSteps).toHaveLength(2)
    expect(out.id).toBe("goal-1")
  })

  it("an achievement goal cannot come back as a measured ladder", () => {
    const achievement = { ...qualified, type: "achievement" as const, measure: null, rampSteps: null }
    const ladder = JSON.stringify({
      goals: [{
        title: "Read 12 books", pillarId: "health", objectiveId: null,
        type: "milestone_ladder", why: "to keep learning", sourceIntentIds: ["i1"],
        habits: [{ title: "Read", daysPerWeek: 5 }], tasks: [],
        measure: { unit: "books", start: 0, target: 12, steps: 4 }, rampSteps: null,
      }],
    })
    const out = parseGoalRefineResponse(ladder, achievement as never, "x")
    expect(out.type).toBe("achievement")
    expect(out.measure).toBeNull()
  })
})
