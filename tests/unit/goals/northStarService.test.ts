import { describe, it, expect } from "vitest"
import {
  addArea,
  addAction,
  answerOf,
  addBelief,
  addCheckpoint,
  addReasons,
  addCustomStep,
  addGoal,
  addGoalFromTarget,
  addGoalsFromTemplate,
  addObstacle,
  addRoutine,
  addSplitDay,
  applyRoutinePreset,
  applySplit,
  areaGoalsByPriority,
  areaReview,
  areasWithoutGoals,
  areasTouched,
  clearDailyRating,
  clearRoutineSteps,
  collectValues,
  dailyAverage,
  dailyCount,
  defaultsForType,
  emptyNsPlan,
  goalGaps,
  goalHorizon,
  goalIsQualified,
  goalNeedsAction,
  goalRank,
  goalsByPriority,
  goalsInArea,
  libraryFor,
  libraryPillarForArea,
  linkGoal,
  loadNsPlan,
  moveGoalPriority,
  moveStep,
  nsProgress,
  planAsText,
  planIsUntouched,
  qualifyWarnings,
  removeArea,
  removeAction,
  removeGoal,
  removeReason,
  removeRoutine,
  removeSplitDay,
  routineCoverage,
  routineIsUntouched,
  routineMinutes,
  routineSummary,
  serializeNsPlan,
  setAnswer,
  setAreaReview,
  setDailyRating,
  setGoalPriority,
  setGoalType,
  setHorizon,
  setNorthStar,
  setRung,
  setValues,
  starWorkAnswered,
  starWorkTotal,
  splitPreview,
  subGoalsOf,
  suggestSentence,
  tabHasContent,
  toggleRoutineStep,
  targetsForTemplate,
  templatesFor,
  todayISO,
  unlinkGoal,
  updateArea,
  updateGoal,
  updateRoutine,
  wheelRatings,
  wouldCycle,
  addDaysISO,
  addMonthsISO,
  areaCoverage,
  areaReach,
  areasWithoutValueSupport,
  cumulativeUnit,
  derivedValueSuggestions,
  goalAlreadyInRoutine,
  goalCanUseDailyMetric,
  goalMetricProgress,
  goalMetricValue,
  goalToolLink,
  looksLikeMeansValue,
  matchingDatePreset,
  moveValue,
  nextValuePair,
  planTodos,
  presetDate,
  rankValueAbove,
  seasonFocus,
  shapeFromTarget,
  setCurrentValues,
  setGoalMetric,
  setGoalServes,
  setSeasonFocus,
  valueConflicts,
  valuesDiff,
  valuesShortBy,
} from "@/src/goals/northStarService"
import {
  DEFAULT_AREAS,
  DEFAULT_ROUTINE_IDS,
  NS_QUALIFY_THRESHOLD,
  REVIEW_PROMPTS,
  ROUTINE_BLUEPRINTS,
  ROUTINE_BLUEPRINT_MAP,
  STAR_PROMPTS,
} from "@/src/goals/data/northStar"
import { AREA_TEN_EXAMPLES, TAB_ORDER } from "@/src/goals/data/northStar"
import { TARGETS, TEMPLATES } from "@/src/goals/data/newGoalFramework"
import type { NsPlan } from "@/src/goals/types"

const NOW = "2026-08-07T10:00:00.000Z"
const TODAY = "2026-08-07"

/** A plan with one goal in the first area, for the tests that need one. */
function planWithGoal(): { plan: NsPlan; goalId: string; areaId: string } {
  const areaId = DEFAULT_AREAS[0].id
  const plan = addGoal(emptyNsPlan(), areaId, "Squat 140kg", "milestone_ladder", NOW)
  return { plan, goalId: plan.goals[0].id, areaId }
}

describe("emptyNsPlan", () => {
  it("opens with the twelve Blueprint areas and the three default routines", () => {
    const plan = emptyNsPlan()
    expect(plan.areas).toHaveLength(12)
    expect(plan.areas.map((a) => a.label)).toEqual([
      "Health", "Fitness", "Mind & Beliefs", "Emotions", "Relationship", "Mission & Purpose",
      "Money", "Family", "Friends", "Fun", "Contribution", "Spirituality",
    ])
    expect(plan.routines.map((r) => r.blueprintId)).toEqual(DEFAULT_ROUTINE_IDS)
    expect(plan.goals).toEqual([])
    expect(plan.updatedAt).toBeNull()
  })

  it("arrives with every routine already carrying its starting stack", () => {
    const plan = emptyNsPlan()
    for (const routine of plan.routines) {
      const bp = ROUTINE_BLUEPRINT_MAP.get(routine.blueprintId)!
      expect(routine.steps.map((s) => s.id)).toEqual(bp.defaultStepIds)
      expect(routine.steps.length).toBeGreaterThan(0)
      expect(routineSummary(routine)).not.toBe("Nothing in it yet")
    }
  })

  it("seeds a morning stack that touches mind, body and spirit", () => {
    const morning = emptyNsPlan().routines[0]
    expect(morning.blueprintId).toBe("morning")
    expect(routineCoverage(morning)).toEqual({ mind: true, body: true, spirit: true })
    expect(routineMinutes(morning)).toBeGreaterThan(0)
  })

  it("gives every seeded step and split day a distinct id", () => {
    const plan = addRoutine(emptyNsPlan(), "workout", NOW)
    const ids = plan.routines.flatMap((r) => [r.id, ...r.splitDays.map((d) => d.id)])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("gives every seeded routine a distinct id", () => {
    const ids = emptyNsPlan().routines.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("ids never repeat", () => {
  it("does not hand a deleted goal's id to the next one written", () => {
    const areaId = DEFAULT_AREAS[0].id
    let plan = addGoal(emptyNsPlan(), areaId, "First", "achievement", NOW)
    const firstId = plan.goals[0].id
    plan = removeGoal(plan, firstId, NOW)
    plan = addGoal(plan, areaId, "Second", "achievement", NOW)
    expect(plan.goals[0].id).not.toBe(firstId)
  })

  it("keeps counting across areas, routines and goals", () => {
    let plan = emptyNsPlan()
    plan = addArea(plan, "Fun", NOW)
    plan = addRoutine(plan, "workout", NOW)
    plan = addGoal(plan, DEFAULT_AREAS[0].id, "Run", "habit_ramp", NOW)
    const ids = [...plan.areas.map((a) => a.id), ...plan.routines.map((r) => r.id), ...plan.goals.map((g) => g.id)]
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("north star", () => {
  it("stores the paragraph and stamps updatedAt", () => {
    const plan = setNorthStar(emptyNsPlan(), "I wake up near the water.", NOW)
    expect(plan.northStar).toBe("I wake up near the water.")
    expect(plan.updatedAt).toBe(NOW)
  })

  it("only accepts a horizon it offers", () => {
    const plan = emptyNsPlan()
    expect(setHorizon(plan, 20, NOW).horizonYears).toBe(20)
    expect(setHorizon(plan, 7, NOW).horizonYears).toBe(plan.horizonYears)
  })

  it("keeps ladder answers keyed by rung", () => {
    const plan = setRung(emptyNsPlan(), "place", "a small house near the water", NOW)
    expect(plan.rungs.place).toBe("a small house near the water")
  })
})

describe("areas", () => {
  it("adds a custom area with a colour off the pool", () => {
    const plan = addArea(emptyNsPlan(), "Fun & adventure", NOW)
    const added = plan.areas[plan.areas.length - 1]
    expect(added.label).toBe("Fun & adventure")
    expect(added.custom).toBe(true)
    expect(added.color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it("ignores a blank name", () => {
    const plan = emptyNsPlan()
    expect(addArea(plan, "   ", NOW).areas).toHaveLength(plan.areas.length)
  })

  it("renames without touching anything else", () => {
    const plan = updateArea(emptyNsPlan(), DEFAULT_AREAS[0].id, { label: "Body" }, NOW)
    expect(plan.areas[0].label).toBe("Body")
    expect(plan.areas[0].color).toBe(DEFAULT_AREAS[0].color)
  })

  it("moves an area's goals to the first survivor rather than deleting them", () => {
    const { plan: withGoal, areaId } = planWithGoal()
    const plan = removeArea(withGoal, areaId, NOW)
    expect(plan.areas.some((a) => a.id === areaId)).toBe(false)
    expect(plan.goals).toHaveLength(1)
    expect(plan.goals[0].areaId).toBe(plan.areas[0].id)
  })

  it("frees a routine that pointed at the removed area", () => {
    // The night routine seeds onto Health.
    const plan = removeArea(emptyNsPlan(), "lm_health", NOW)
    expect(plan.routines.every((r) => r.areaId !== "lm_health")).toBe(true)
  })

  it("drops the removed area's review and daily ratings", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_health", { ten: "Strong and light" }, NOW)
    plan = setDailyRating(plan, TODAY, "lm_health", 6, NOW)
    plan = removeArea(plan, "lm_health", NOW)
    expect(plan.review["lm_health"]).toBeUndefined()
    expect(plan.daily[TODAY]?.["lm_health"]).toBeUndefined()
  })

  it("refuses to remove the last area, because a goal would have nowhere to live", () => {
    let plan = emptyNsPlan()
    for (const a of DEFAULT_AREAS.slice(1)) plan = removeArea(plan, a.id, NOW)
    expect(plan.areas).toHaveLength(1)
    const after = removeArea(plan, plan.areas[0].id, NOW)
    expect(after.areas).toHaveLength(1)
  })
})

describe("routines", () => {
  it("adds only known blueprints", () => {
    const plan = emptyNsPlan()
    expect(addRoutine(plan, "workout", NOW).routines).toHaveLength(plan.routines.length + 1)
    expect(addRoutine(plan, "not-a-routine", NOW).routines).toHaveLength(plan.routines.length)
  })

  it("toggles a library step in and back out", () => {
    const base = emptyNsPlan()
    const plan = clearRoutineSteps(base, base.routines[0].id, NOW)
    const id = plan.routines[0].id
    const on = toggleRoutineStep(plan, id, "water", NOW)
    expect(on.routines[0].steps.map((s) => s.id)).toEqual(["water"])
    const off = toggleRoutineStep(on, id, "water", NOW)
    expect(off.routines[0].steps).toEqual([])
  })

  it("ignores a step id that is not in that routine's library", () => {
    const base = emptyNsPlan()
    const plan = clearRoutineSteps(base, base.routines[0].id, NOW)
    const id = plan.routines[0].id
    // "strength" belongs to the training week, not the morning routine.
    expect(toggleRoutineStep(plan, id, "strength", NOW).routines[0].steps).toEqual([])
  })

  it("applies a preset as an ordered stack", () => {
    const plan = emptyNsPlan()
    const id = plan.routines[0].id
    const after = applyRoutinePreset(plan, id, "15", NOW)
    expect(after.routines[0].steps.map((s) => s.id)).toEqual(["water", "bed", "star", "gratitude", "breath", "plan"])
  })

  it("moves a step and refuses to move past either end", () => {
    let plan = applyRoutinePreset(emptyNsPlan(), emptyNsPlan().routines[0].id, "15", NOW)
    const id = plan.routines[0].id
    plan = moveStep(plan, id, 0, 1, NOW)
    expect(plan.routines[0].steps.map((s) => s.id).slice(0, 2)).toEqual(["bed", "water"])
    const unchanged = moveStep(plan, id, 0, -1, NOW)
    expect(unchanged.routines[0].steps.map((s) => s.id)).toEqual(plan.routines[0].steps.map((s) => s.id))
  })

  it("adds a custom step with its own id and no dimension", () => {
    const base = emptyNsPlan()
    const plan = clearRoutineSteps(base, base.routines[0].id, NOW)
    const after = addCustomStep(plan, plan.routines[0].id, "  Ice bath  ", 4, 3, NOW)
    const step = after.routines[0].steps[0]
    expect(step.title).toBe("Ice bath")
    expect(step.minutes).toBe(4)
    expect(step.dimension).toBeNull()
  })

  it("sums minutes and reports mind, body and spirit coverage", () => {
    const plan = applyRoutinePreset(emptyNsPlan(), emptyNsPlan().routines[0].id, "15", NOW)
    const routine = plan.routines[0]
    expect(routineMinutes(routine)).toBe(1 + 2 + 2 + 3 + 5 + 5)
    expect(routineCoverage(routine)).toEqual({ mind: true, body: true, spirit: true })
  })

  it("summarises a sequence in minutes and a weekly routine in sessions", () => {
    let plan = applyRoutinePreset(emptyNsPlan(), emptyNsPlan().routines[0].id, "15", NOW)
    expect(routineSummary(plan.routines[0])).toContain("min")

    plan = addRoutine(plan, "workout", NOW)
    expect(routineSummary(plan.routines[plan.routines.length - 1])).toContain("sessions a week")
  })

  it("applies a split, keeps its days distinct, and previews the week", () => {
    let plan = addRoutine(emptyNsPlan(), "workout", NOW)
    const id = plan.routines[plan.routines.length - 1].id
    plan = applySplit(plan, id, "ppl", NOW)
    const routine = plan.routines[plan.routines.length - 1]
    expect(routine.splitDays.map((d) => d.name)).toEqual(["Push", "Pull", "Legs"])
    expect(new Set(routine.splitDays.map((d) => d.id)).size).toBe(3)
    expect(routine.daysPerWeek).toBe(3)
    expect(splitPreview(routine).map((p) => p.dayName)).toEqual(["Push", "Pull", "Legs"])
  })

  it("cycles the split days when the week is longer than the split", () => {
    let plan = addRoutine(emptyNsPlan(), "workout", NOW)
    const id = plan.routines[plan.routines.length - 1].id
    plan = applySplit(plan, id, "ppl", NOW)
    plan = updateRoutine(plan, id, { daysPerWeek: 5 }, NOW)
    expect(splitPreview(plan.routines[plan.routines.length - 1]).map((p) => p.dayName)).toEqual([
      "Push", "Pull", "Legs", "Push", "Pull",
    ])
  })

  it("keeps at least one split day", () => {
    let plan = addRoutine(emptyNsPlan(), "workout", NOW)
    const id = plan.routines[plan.routines.length - 1].id
    plan = applySplit(plan, id, "custom", NOW)
    plan = addSplitDay(plan, id, NOW)
    let routine = plan.routines[plan.routines.length - 1]
    for (const d of [...routine.splitDays]) plan = removeSplitDay(plan, id, d.id, NOW)
    routine = plan.routines[plan.routines.length - 1]
    expect(routine.splitDays).toHaveLength(1)
  })

  it("removes a routine without touching the rest", () => {
    const plan = emptyNsPlan()
    const after = removeRoutine(plan, plan.routines[0].id, NOW)
    expect(after.routines.map((r) => r.blueprintId)).toEqual(DEFAULT_ROUTINE_IDS.slice(1))
  })
})

describe("goals", () => {
  it("refuses a goal in an area that does not exist", () => {
    expect(addGoal(emptyNsPlan(), "nope", "Something", "achievement", NOW).goals).toHaveLength(0)
  })

  it("gives a target goal a ladder and the other shapes none", () => {
    expect(defaultsForType("milestone_ladder").ladder).not.toBeNull()
    expect(defaultsForType("habit_ramp").ladder).toBeNull()
    expect(defaultsForType("achievement").ladder).toBeNull()
  })

  it("keeps the numbers already typed when the shape is flipped back and forth", () => {
    const { plan, goalId } = planWithGoal()
    let next = updateGoal(plan, goalId, { ladder: { start: 100, target: 140, steps: 5, curveTension: 0 } }, NOW)
    next = setGoalType(next, goalId, "habit_ramp", NOW)
    next = setGoalType(next, goalId, "milestone_ladder", NOW)
    expect(next.goals[0].ladder).toEqual({ start: 100, target: 140, steps: 5, curveTension: 0 })
  })

  it("gives a goal flipped into a target a ladder it did not have", () => {
    let plan = addGoal(emptyNsPlan(), DEFAULT_AREAS[0].id, "Get strong", "achievement", NOW)
    plan = setGoalType(plan, plan.goals[0].id, "milestone_ladder", NOW)
    expect(plan.goals[0].ladder).not.toBeNull()
  })

  it("files goals under the right area", () => {
    let plan = addGoal(emptyNsPlan(), "lm_health", "Run", "habit_ramp", NOW)
    plan = addGoal(plan, "lm_money", "Earn", "milestone_ladder", NOW)
    expect(goalsInArea(plan, "lm_health").map((g) => g.title)).toEqual(["Run"])
    const without = areasWithoutGoals(plan).map((a) => a.id)
    expect(without).toHaveLength(10)
    expect(without).not.toContain("lm_health")
    expect(without).not.toContain("lm_money")
  })
})

describe("goal links", () => {
  function twoGoals() {
    let plan = addGoal(emptyNsPlan(), "lm_health", "Sleep 8 hours", "habit_ramp", NOW)
    plan = addGoal(plan, "lm_money", "Ten thousand a month", "milestone_ladder", NOW)
    return { plan, a: plan.goals[0].id, b: plan.goals[1].id }
  }

  it("links across areas, which is the whole point", () => {
    const { plan, a, b } = twoGoals()
    const linked = linkGoal(plan, a, b, NOW)
    expect(linked.goals[0].feedsGoalIds).toEqual([b])
    expect(subGoalsOf(linked, b).map((g) => g.id)).toEqual([a])
  })

  it("refuses a link that would close a loop", () => {
    const { plan, a, b } = twoGoals()
    const linked = linkGoal(plan, a, b, NOW)
    expect(wouldCycle(linked.goals, b, a)).toBe(true)
    expect(linkGoal(linked, b, a, NOW).goals[1].feedsGoalIds).toEqual([])
  })

  it("refuses a self-link and a duplicate", () => {
    const { plan, a, b } = twoGoals()
    expect(linkGoal(plan, a, a, NOW).goals[0].feedsGoalIds).toEqual([])
    const once = linkGoal(plan, a, b, NOW)
    expect(linkGoal(once, a, b, NOW).goals[0].feedsGoalIds).toEqual([b])
  })

  it("unlinks", () => {
    const { plan, a, b } = twoGoals()
    expect(unlinkGoal(linkGoal(plan, a, b, NOW), a, b, NOW).goals[0].feedsGoalIds).toEqual([])
  })

  it("cleans up inbound links when the target goal is removed", () => {
    const { plan, a, b } = twoGoals()
    const linked = linkGoal(plan, a, b, NOW)
    expect(removeGoal(linked, b, NOW).goals[0].feedsGoalIds).toEqual([])
  })
})

describe("the qualification stack", () => {
  it("names what is still missing, in order", () => {
    const { plan } = planWithGoal()
    expect(goalGaps(plan.goals[0])).toContain("a why")
    expect(goalGaps(plan.goals[0])).toContain("an action")
    expect(goalIsQualified(plan.goals[0])).toBe(false)
  })

  it("counts a goal qualified once every part is written", () => {
    const { plan, goalId } = planWithGoal()
    const done = updateGoal(plan, goalId, {
      why: "Because I want to still be lifting at sixty",
      painWhy: "Another year of a back that hurts",
      targetDate: "2026-12-31",
      beliefLevel: 8,
      desireLevel: 9,
      sentence: "I will easily squat 140kg by 31 December 2026.",
      ladder: { start: 100, target: 140, steps: 5, curveTension: 0 },
    }, NOW)
    // An outcome with nothing you could do on a Tuesday is still a gap.
    expect(goalGaps(done.goals[0])).toEqual(["an action"])
    const withAction = addAction(done, goalId, "Squat session", 3, NOW)
    expect(goalGaps(withAction.goals[0])).toEqual([])
    expect(goalIsQualified(withAction.goals[0])).toBe(true)
  })

  it("asks a finish-line goal for checkpoints instead of a number", () => {
    let plan = addGoal(emptyNsPlan(), "lm_health", "First muscle-up", "achievement", NOW)
    expect(goalGaps(plan.goals[0])).toContain("checkpoints")
    plan = addCheckpoint(plan, plan.goals[0].id, "Ten strict pull-ups", NOW)
    expect(goalGaps(plan.goals[0])).not.toContain("checkpoints")
    // Checkpoints are actions, so naming one clears the action gap too.
    expect(goalGaps(plan.goals[0])).not.toContain("an action")
  })

  it("warns under the threshold and stays quiet at or above it", () => {
    expect(qualifyWarnings({ beliefLevel: NS_QUALIFY_THRESHOLD - 1, desireLevel: 10 })).toHaveLength(1)
    expect(qualifyWarnings({ beliefLevel: 10, desireLevel: NS_QUALIFY_THRESHOLD - 1 })).toHaveLength(1)
    expect(qualifyWarnings({ beliefLevel: NS_QUALIFY_THRESHOLD, desireLevel: NS_QUALIFY_THRESHOLD })).toEqual([])
    expect(qualifyWarnings({ beliefLevel: null, desireLevel: null })).toEqual([])
  })

  it("writes the sentence with and without a date", () => {
    expect(suggestSentence({ title: "Squat 140kg", targetDate: "2026-12-31", feeling: "" })).toBe("I will easily squat 140kg by 31 December 2026.")
    expect(suggestSentence({ title: "Squat 140kg", targetDate: null, feeling: "" })).toBe("I will easily squat 140kg.")
    expect(suggestSentence({ title: "   ", targetDate: null, feeling: "" })).toBe("")
  })

  it("keeps obstacles and beliefs on the goal that owns them", () => {
    const { plan, goalId } = planWithGoal()
    let next = addObstacle(plan, goalId, "Work eats my mornings", NOW)
    next = addBelief(next, goalId, "I don't have the time", NOW)
    expect(next.goals[0].obstacles[0].what).toBe("Work eats my mornings")
    expect(next.goals[0].obstacles[0].counter).toBe("")
    expect(next.goals[0].beliefs[0].useful).toBeNull()
  })

  it("ignores a blank obstacle, belief or checkpoint", () => {
    const { plan, goalId } = planWithGoal()
    expect(addObstacle(plan, goalId, "  ", NOW).goals[0].obstacles).toEqual([])
    expect(addBelief(plan, goalId, "", NOW).goals[0].beliefs).toEqual([])
    expect(addCheckpoint(plan, goalId, " ", NOW).goals[0].checkpoints).toEqual([])
  })
})

describe("ratings", () => {
  it("keeps one score per area per day and overwrites on a re-rate", () => {
    let plan = setDailyRating(emptyNsPlan(), TODAY, "lm_health", 6, NOW)
    plan = setDailyRating(plan, TODAY, "lm_health", 8, NOW)
    expect(plan.daily[TODAY]["lm_health"]).toBe(8)
  })

  it("averages only the days inside the window", () => {
    let plan = emptyNsPlan()
    plan = setDailyRating(plan, "2026-08-07", "lm_health", 8, NOW)
    plan = setDailyRating(plan, "2026-08-06", "lm_health", 6, NOW)
    // 30 days back: outside a 14-day window.
    plan = setDailyRating(plan, "2026-07-08", "lm_health", 2, NOW)
    expect(dailyAverage(plan, "lm_health", TODAY)).toBe(7)
    expect(dailyCount(plan, "lm_health", TODAY)).toBe(2)
  })

  it("returns null when nothing in the window was rated", () => {
    expect(dailyAverage(emptyNsPlan(), "lm_health", TODAY)).toBeNull()
  })

  it("ignores a rating for an area that does not exist", () => {
    expect(setDailyRating(emptyNsPlan(), TODAY, "nope", 5, NOW).daily).toEqual({})
  })

  it("clears a rating and drops the day when it empties", () => {
    let plan = setDailyRating(emptyNsPlan(), TODAY, "lm_health", 6, NOW)
    plan = clearDailyRating(plan, TODAY, "lm_health", NOW)
    expect(plan.daily[TODAY]).toBeUndefined()
  })

  it("clamps out-of-range scores rather than storing them", () => {
    const plan = setDailyRating(emptyNsPlan(), TODAY, "lm_health", 99, NOW)
    expect(plan.daily[TODAY]["lm_health"]).toBe(10)
  })

  it("gives today's date in local time", () => {
    expect(todayISO(new Date(2026, 7, 7, 23, 30))).toBe("2026-08-07")
  })
})

describe("review", () => {
  it("returns an empty review for an area never opened", () => {
    expect(areaReview(emptyNsPlan(), "lm_health")).toEqual({
      ten: "", purpose: "", snapshot: "", fortnight: null, goalsAim: null, blockers: "", values: [], identity: "",
    })
  })

  it("merges a patch into the existing review", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_health", { ten: "Strong and light" }, NOW)
    plan = setAreaReview(plan, "lm_health", { fortnight: 6 }, NOW)
    expect(areaReview(plan, "lm_health")).toMatchObject({ ten: "Strong and light", fortnight: 6 })
  })

  it("collects values from every area and goal, without duplicates", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_health", { values: ["Vitality", "Discipline"] }, NOW)
    plan = addGoal(plan, "lm_money", "Earn", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { values: ["discipline", "Courage"] }, NOW)
    expect(collectValues(plan)).toEqual(["Vitality", "Discipline", "Courage"])
  })
})

describe("progress", () => {
  it("marks a tab done only when its work is actually done", () => {
    let plan = emptyNsPlan()
    expect(nsProgress(plan).done).toEqual({ star: false, now: false, review: false })

    plan = setNorthStar(plan, "I wake up near the water.", NOW)
    // "water" ships in the morning stack, so toggling it is an edit either way.
    plan = toggleRoutineStep(plan, plan.routines[0].id, "water", NOW)
    plan = addGoal(plan, "lm_health", "Run", "habit_ramp", NOW)
    expect(nsProgress(plan).done).toMatchObject({ star: true, now: false })
    // Rating and picturing an area is no longer enough on its own: the areas,
    // the goals and the routines share one tab now, so the tick has to mean all
    // of it, which is every goal carrying the reason that keeps it alive.
    plan = setAreaReview(plan, "lm_health", { ten: "Strong and light", fortnight: 6 }, NOW)
    expect(nsProgress(plan).done.now).toBe(false)

    plan = updateGoal(plan, plan.goals[0].id, { why: "Because I want to feel light" }, NOW)
    expect(nsProgress(plan).done.now).toBe(true)

    // Review is done when the goals have been read against the 10, not when
    // every area carries a number.
    plan = setAreaReview(plan, "lm_health", { goalsAim: "yes" }, NOW)
    expect(nsProgress(plan).done.review).toBe(true)
  })
})

describe("round trip through storage", () => {
  function fullPlan(): NsPlan {
    let plan = setNorthStar(emptyNsPlan(), "I wake up near the water.", NOW)
    plan = setRung(plan, "place", "a small house", NOW)
    plan = setHorizon(plan, 20, NOW)
    plan = addArea(plan, "Fun", NOW)
    plan = applyRoutinePreset(plan, plan.routines[0].id, "30", NOW)
    plan = addRoutine(plan, "workout", NOW)
    plan = applySplit(plan, plan.routines[plan.routines.length - 1].id, "ppl", NOW)
    plan = addGoal(plan, "lm_health", "Squat 140kg", "milestone_ladder", NOW)
    plan = addGoal(plan, "lm_money", "Ten thousand a month", "milestone_ladder", NOW)
    plan = linkGoal(plan, plan.goals[0].id, plan.goals[1].id, NOW)
    plan = addObstacle(plan, plan.goals[0].id, "Work eats my mornings", NOW)
    plan = addBelief(plan, plan.goals[0].id, "I don't have the time", NOW)
    plan = addCheckpoint(plan, plan.goals[0].id, "Squat 120kg", NOW)
    plan = setAreaReview(plan, "lm_health", { ten: "Strong and light", fortnight: 6, values: ["Vitality"] }, NOW)
    plan = setDailyRating(plan, TODAY, "lm_health", 7, NOW)
    return plan
  }

  it("survives serialize and load unchanged", () => {
    const plan = fullPlan()
    expect(loadNsPlan(serializeNsPlan(plan))).toEqual(plan)
  })

  it("returns null for anything unreadable", () => {
    expect(loadNsPlan(null)).toBeNull()
    expect(loadNsPlan("not json")).toBeNull()
    expect(loadNsPlan('"a string"')).toBeNull()
  })

  it("drops goals filed under an area that no longer exists", () => {
    const raw = JSON.stringify({
      ...emptyNsPlan(),
      goals: [{ id: "g1", areaId: "gone", title: "Orphan", type: "achievement" }],
    })
    expect(loadNsPlan(raw)!.goals).toEqual([])
  })

  it("drops links to goals that did not survive the load", () => {
    const plan = emptyNsPlan()
    const raw = JSON.stringify({
      ...plan,
      goals: [
        { id: "g1", areaId: "lm_health", title: "Kept", type: "achievement", feedsGoalIds: ["g2", "gone"] },
        { id: "g2", areaId: "lm_health", title: "Also kept", type: "achievement" },
      ],
    })
    expect(loadNsPlan(raw)!.goals[0].feedsGoalIds).toEqual(["g2"])
  })

  it("drops a routine whose blueprint no longer exists", () => {
    const raw = JSON.stringify({
      ...emptyNsPlan(),
      routines: [{ id: "r1", blueprintId: "gone", label: "Ghost", steps: [] }],
    })
    expect(loadNsPlan(raw)!.routines).toEqual([])
  })

  it("falls back to the four areas when a save has none", () => {
    const raw = JSON.stringify({ ...emptyNsPlan(), areas: [] })
    expect(loadNsPlan(raw)!.areas.map((a) => a.id)).toEqual(DEFAULT_AREAS.map((a) => a.id))
  })

  it("never hands out an id already in a hand-edited save", () => {
    const raw = JSON.stringify({
      ...emptyNsPlan(),
      seq: 0,
      goals: [{ id: "g9", areaId: "lm_health", title: "High id", type: "achievement" }],
    })
    const loaded = loadNsPlan(raw)!
    expect(loaded.seq).toBeGreaterThanOrEqual(9)
    expect(addGoal(loaded, "lm_health", "Next", "achievement", NOW).goals[1].id).not.toBe("g9")
  })

  it("drops daily ratings for areas that are gone and clamps the rest", () => {
    const raw = JSON.stringify({ ...emptyNsPlan(), daily: { [TODAY]: { lm_health: 42, gone: 5 } } })
    expect(loadNsPlan(raw)!.daily[TODAY]).toEqual({ lm_health: 10 })
  })
})

describe("planAsText", () => {
  it("says nothing when there is nothing written", () => {
    expect(planAsText(emptyNsPlan(), TODAY)).toBe("")
  })

  it("reads back the star, the routines, the goals and the review", () => {
    let plan = setNorthStar(emptyNsPlan(), "I wake up near the water.", NOW)
    plan = applyRoutinePreset(plan, plan.routines[0].id, "15", NOW)
    plan = addGoal(plan, "lm_health", "Squat 140kg", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, {
      why: "Because I want to still be lifting at sixty",
      targetDate: "2026-12-31",
      unit: "kg",
      ladder: { start: 100, target: 140, steps: 5, curveTension: 0 },
    }, NOW)
    plan = addObstacle(plan, plan.goals[0].id, "Work eats my mornings", NOW)
    plan = setAreaReview(plan, "lm_health", { ten: "Strong and light", fortnight: 6 }, NOW)

    const text = planAsText(plan, TODAY)
    expect(text).toContain("MY NORTH STAR (10 years out)")
    expect(text).toContain("MY ROUTINES")
    expect(text).toContain("1. Big glass of water")
    expect(text).toContain("100 to 140 kg")
    expect(text).toContain("By 31 December 2026")
    expect(text).toContain("What could stop me: Work eats my mornings")
    expect(text).toContain("Health: 6/10 over the last two weeks")
    expect(text).toContain("A 10 here: Strong and light")
  })
})

describe("the work under the north star", () => {
  it("asks the why, the identity, the standards, the gap and the affirmations, in his order", () => {
    // vision -> purpose -> (values, its own card) -> identity -> standards ->
    // the gap -> affirmations. `become` is deliberately NOT next to
    // `identity_total`: one is who you declare yourself to be, the other is
    // what the paragraph needs that you do not have yet. See
    // docs/research/life-mastery/values-and-identity.md.
    expect(STAR_PROMPTS.map((p) => p.id)).toEqual([
      "star_why", "identity_total", "conduct", "become", "affirmations",
    ])
  })

  it("keeps the ids the review tab used, so answers written there still load", () => {
    // `conduct` moved off the review tab and must not change id.
    const plan = setAnswer(emptyNsPlan(), "conduct", "To be disciplined", NOW)
    const back = loadNsPlan(serializeNsPlan(plan))!
    expect(answerOf(back, "conduct")).toBe("To be disciplined")
  })

  it("asks each of them once, on the star tab only", () => {
    const reviewIds = new Set(REVIEW_PROMPTS.map((p) => p.id))
    for (const p of STAR_PROMPTS) expect(reviewIds.has(p.id)).toBe(false)
  })

  it("counts the card's own questions and the values list, and not the why", () => {
    const fresh = emptyNsPlan()
    expect(starWorkAnswered(fresh)).toBe(0)
    expect(starWorkTotal()).toBe(STAR_PROMPTS.length)

    // The why is printed above the card that carries the count.
    let plan = setAnswer(fresh, "star_why", "So my kids see it done", NOW)
    expect(starWorkAnswered(plan)).toBe(0)

    plan = setAnswer(plan, "affirmations", "I am someone who finishes", NOW)
    expect(starWorkAnswered(plan)).toBe(1)

    // Whitespace is not an answer, and the values list is worth one.
    plan = setAnswer(plan, "become", "   ", NOW)
    expect(starWorkAnswered(plan)).toBe(1)
    expect(starWorkAnswered(setValues(plan, ["Freedom"], NOW))).toBe(2)
  })

  it("survives a save and a reload", () => {
    let plan = setAnswer(emptyNsPlan(), "star_why", "Because I am tired of starting again", NOW)
    plan = setAnswer(plan, "identity_total", "I am disciplined", NOW)
    const loaded = loadNsPlan(serializeNsPlan(plan))!
    expect(loaded.answers.star_why).toBe("Because I am tired of starting again")
    expect(loaded.answers.identity_total).toBe("I am disciplined")
  })

  it("reads back under the paragraph", () => {
    let plan = setNorthStar(emptyNsPlan(), "I wake up near the water.", NOW)
    plan = setAnswer(plan, "star_why", "So my kids see it done", NOW)
    plan = setAnswer(plan, "become", "Someone who trains at six", NOW)
    plan = setAnswer(plan, "affirmations", "I am someone who finishes", NOW)

    const text = planAsText(plan, TODAY)
    expect(text).toContain("WHY IS THIS IMPORTANT TO YOU?\nSo my kids see it done")
    expect(text).toContain("WHO DO YOU NEED TO BECOME TO HAVE ALL OF THIS?")
    expect(text).toContain("YOUR AFFIRMATIONS\nI am someone who finishes")
    expect(text.indexOf("WHY IS THIS IMPORTANT")).toBeGreaterThan(text.indexOf("MY NORTH STAR"))
  })

  it("is enough on its own to count the star tab as having content", () => {
    const plan = setAnswer(emptyNsPlan(), "star_why", "Because I am tired of starting again", NOW)
    expect(nsProgress(plan).starWritten).toBe(false)
    expect(tabHasContent(plan, "star")).toBe(true)
    expect(planIsUntouched(plan)).toBe(false)
  })
})

describe("regressions", () => {
  it("does not call a training week with a split but no exercises 'nothing yet'", () => {
    let plan = addRoutine(emptyNsPlan(), "workout", NOW)
    const id = plan.routines[plan.routines.length - 1].id
    plan = clearRoutineSteps(plan, id, NOW)
    plan = applySplit(plan, id, "ppl", NOW)
    const summary = routineSummary(plan.routines[plan.routines.length - 1])
    expect(summary).not.toContain("Nothing in it yet")
    expect(summary).toContain("Push · Pull · Legs")
  })

  it("reads back nothing until the user has actually touched something", () => {
    const fresh = emptyNsPlan()
    expect(planIsUntouched(fresh)).toBe(true)
    expect(planAsText(fresh, TODAY)).toBe("")

    // Editing only a routine counts, and the kept stack then reads back.
    const edited = clearRoutineSteps(fresh, fresh.routines[0].id, NOW)
    expect(planIsUntouched(edited)).toBe(false)
    expect(planAsText(edited, TODAY)).toContain("MY ROUTINES")
  })

  it("ticks the areas tab only once something on it is the user's", () => {
    const fresh = emptyNsPlan()
    expect(fresh.routines.every(routineIsUntouched)).toBe(true)
    expect(areasTouched(fresh)).toBe(false)
    expect(nsProgress(fresh).done.now).toBe(false)

    expect(areasTouched(updateArea(fresh, "lm_health", { label: "Body" }, NOW))).toBe(true)
    expect(areasTouched(addArea(fresh, "Fun", NOW))).toBe(true)
    expect(areasTouched(addRoutine(fresh, "workout", NOW))).toBe(true)
    expect(areasTouched(removeRoutine(fresh, fresh.routines[0].id, NOW))).toBe(true)
    expect(areasTouched(toggleRoutineStep(fresh, fresh.routines[0].id, "meditate", NOW))).toBe(true)
    expect(areasTouched(updateRoutine(fresh, fresh.routines[0].id, { label: "My mornings" }, NOW))).toBe(true)
  })

  it("still says nothing yet once a routine has actually been cleared", () => {
    const base = emptyNsPlan()
    const cleared = clearRoutineSteps(base, base.routines[0].id, NOW)
    expect(routineSummary(cleared.routines[0])).toBe("Nothing in it yet")
  })

  it("creates a target ladder that survives a storage round trip unchanged", () => {
    const plan = addGoal(emptyNsPlan(), "lm_health", "Squat 140kg", "milestone_ladder", NOW)
    expect(loadNsPlan(serializeNsPlan(plan))!.goals[0].ladder).toEqual(plan.goals[0].ladder)
  })
})

describe("presets", () => {
  it("gives every routine, weekly ones included, at least three presets", () => {
    for (const bp of ROUTINE_BLUEPRINTS) {
      expect(bp.presets.length, `${bp.id} has no presets`).toBeGreaterThanOrEqual(3)
      for (const preset of bp.presets) {
        expect(preset.stepIds.length, `${bp.id}/${preset.id} is empty`).toBeGreaterThan(0)
        // A preset that names a step the library does not have would silently
        // apply a shorter stack than it advertises.
        for (const id of preset.stepIds) {
          expect(bp.library.some((s) => s.id === id), `${bp.id}/${preset.id} references unknown step "${id}"`).toBe(true)
        }
      }
      expect(new Set(bp.presets.map((p) => p.id)).size).toBe(bp.presets.length)
    }
  })

  it("offers the full ritual on the morning routine, in its documented order", () => {
    const morning = ROUTINE_BLUEPRINT_MAP.get("morning")!
    expect(morning.presets.map((p) => p.id)).toEqual(["15", "30", "60", "full"])
    expect(morning.presets.find((p) => p.id === "full")!.stepIds).toEqual([
      "smile", "stretch", "breath", "water", "move", "incantations", "questions", "driving-force", "read", "plan",
    ])
  })

  it("applies a preset by id and replaces whatever was there", () => {
    const base = emptyNsPlan()
    const id = base.routines[0].id
    const full = applyRoutinePreset(base, id, "full", NOW)
    expect(full.routines[0].steps[0].id).toBe("smile")
    expect(full.routines[0].steps).toHaveLength(10)
    const back = applyRoutinePreset(full, id, "15", NOW)
    expect(back.routines[0].steps).toHaveLength(6)
  })

  it("ignores a preset id that routine does not have", () => {
    const base = emptyNsPlan()
    const id = base.routines[0].id
    expect(applyRoutinePreset(base, id, "nope", NOW).routines[0].steps).toEqual(base.routines[0].steps)
    // "full" belongs to the morning routine only.
    const night = base.routines[1].id
    expect(applyRoutinePreset(base, night, "full", NOW).routines[1].steps).toEqual(base.routines[1].steps)
  })

  it("keeps every routine's default stack pickable as a preset too", () => {
    for (const bp of ROUTINE_BLUEPRINTS) {
      for (const id of bp.defaultStepIds) {
        expect(bp.library.some((s) => s.id === id), `${bp.id} default references unknown step "${id}"`).toBe(true)
      }
    }
  })
})

describe("priority (the full system's ordered list)", () => {
  function threeGoals() {
    let plan = addGoal(emptyNsPlan(), "lm_health", "First", "achievement", NOW)
    plan = addGoal(plan, "lm_money", "Second", "achievement", NOW)
    plan = addGoal(plan, "lm_health", "Third", "achievement", NOW)
    return plan
  }

  it("hands out 1, 2, 3 in the order goals are added", () => {
    const plan = threeGoals()
    expect(plan.goals.map((g) => goalRank(plan, g.id))).toEqual([1, 2, 3])
    expect(goalsByPriority(plan).map((g) => g.title)).toEqual(["First", "Second", "Third"])
  })

  it("covers every goal exactly once", () => {
    const plan = threeGoals()
    expect([...plan.priorityIds].sort()).toEqual(plan.goals.map((g) => g.id).sort())
  })

  it("does not renumber anything already ranked when a goal arrives", () => {
    let plan = threeGoals()
    const before = plan.goals.map((g) => [g.title, goalRank(plan, g.id)])
    plan = addGoal(plan, "lm_spirituality", "Fourth", "achievement", NOW)
    for (const [title, rank] of before) {
      expect(goalRank(plan, plan.goals.find((g) => g.title === title)!.id)).toBe(rank)
    }
    expect(goalRank(plan, plan.goals.find((g) => g.title === "Fourth")!.id)).toBe(4)
  })

  it("moves a goal to a typed rank and shifts the rest", () => {
    let plan = threeGoals()
    const third = plan.goals.find((g) => g.title === "Third")!.id
    plan = setGoalPriority(plan, third, 1, NOW)
    expect(goalsByPriority(plan).map((g) => g.title)).toEqual(["Third", "First", "Second"])
  })

  it("clamps a rank outside the list instead of refusing it", () => {
    let plan = threeGoals()
    const first = plan.goals[0].id
    expect(goalsByPriority(setGoalPriority(plan, first, 99, NOW)).map((g) => g.title)).toEqual(["Second", "Third", "First"])
    plan = setGoalPriority(plan, first, 99, NOW)
    expect(goalsByPriority(setGoalPriority(plan, first, 0, NOW)).map((g) => g.title)).toEqual(["First", "Second", "Third"])
  })

  it("moves one step at a time and stops at both ends", () => {
    let plan = threeGoals()
    const first = plan.goals[0].id
    expect(goalsByPriority(moveGoalPriority(plan, first, -1, NOW)).map((g) => g.title)).toEqual(["First", "Second", "Third"])
    plan = moveGoalPriority(plan, first, 1, NOW)
    expect(goalsByPriority(plan).map((g) => g.title)).toEqual(["Second", "First", "Third"])
  })

  it("closes the numbering when a goal is deleted", () => {
    let plan = threeGoals()
    plan = removeGoal(plan, plan.goals.find((g) => g.title === "Second")!.id, NOW)
    expect(goalsByPriority(plan).map((g) => [g.title, goalRank(plan, g.id)])).toEqual([["First", 1], ["Third", 2]])
  })

  it("sorts an area's goals by global priority, not by when they were typed", () => {
    let plan = threeGoals()
    plan = setGoalPriority(plan, plan.goals.find((g) => g.title === "Third")!.id, 1, NOW)
    expect(areaGoalsByPriority(plan, "lm_health").map((g) => g.title)).toEqual(["Third", "First"])
  })

  it("repairs a saved order rather than losing the goals", () => {
    const plan = threeGoals()
    const ids = plan.goals.map((g) => g.id)
    // A save with one id missing, one unknown, and the rest out of order.
    const raw = JSON.stringify({ ...plan, priorityIds: ["ghost", ids[2], ids[0]] })
    const loaded = loadNsPlan(raw)!
    expect(loaded.goals).toHaveLength(3)
    expect(loaded.priorityIds).toEqual([ids[2], ids[0], ids[1]])
  })

  it("survives a round trip with the order intact", () => {
    let plan = threeGoals()
    plan = setGoalPriority(plan, plan.goals[2].id, 1, NOW)
    expect(loadNsPlan(serializeNsPlan(plan))).toEqual(plan)
  })
})

describe("actions, horizon, reasons and the feeling clause", () => {
  it("asks for an action on an outcome and stops once there is one", () => {
    const { plan, goalId } = planWithGoal()
    expect(goalNeedsAction(plan.goals[0])).toBe(true)
    const withAction = addAction(plan, goalId, "  Squat session  ", 3, NOW)
    expect(withAction.goals[0].habits[0]).toMatchObject({ title: "Squat session", daysPerWeek: 3 })
    expect(goalNeedsAction(withAction.goals[0])).toBe(false)
    expect(goalNeedsAction(removeAction(withAction, goalId, withAction.goals[0].habits[0].id, NOW).goals[0])).toBe(true)
  })

  it("never asks a practice for an action, because the goal is the action", () => {
    const plan = addGoal(emptyNsPlan(), "lm_health", "Run", "habit_ramp", NOW)
    expect(goalNeedsAction(plan.goals[0])).toBe(false)
  })

  it("counts goals still missing an action", () => {
    let plan = addGoal(emptyNsPlan(), "lm_health", "Squat 140kg", "milestone_ladder", NOW)
    expect(nsProgress(plan).goalsNeedingAction).toBe(1)
    plan = addAction(plan, plan.goals[0].id, "Squat session", 3, NOW)
    expect(nsProgress(plan).goalsNeedingAction).toBe(0)
  })

  it("classifies the horizon from the date, and a practice is always now", () => {
    let plan = addGoal(emptyNsPlan(), "lm_health", "Run", "habit_ramp", NOW)
    expect(goalHorizon(plan.goals[0], TODAY)).toBe("now")
    plan = addGoal(plan, "lm_money", "Ten thousand a month", "milestone_ladder", NOW)
    const target = plan.goals[1].id
    plan = updateGoal(plan, target, { targetDate: "2026-09-01" }, NOW)
    expect(goalHorizon(plan.goals[1], TODAY)).toBe("quarter")
    plan = updateGoal(plan, target, { targetDate: "2030-01-01" }, NOW)
    expect(goalHorizon(plan.goals[1], TODAY)).toBe("vision")
  })

  it("takes reasons a line at a time, strips bullets, and refuses duplicates", () => {
    const { plan, goalId } = planWithGoal()
    let next = addReasons(plan, goalId, "- Because my back hurts\n2) Because I want to lift at sixty\n\n  \n")
    expect(next.goals[0].reasonsList).toEqual(["Because my back hurts", "Because I want to lift at sixty"])
    next = addReasons(next, goalId, "because my BACK hurts")
    expect(next.goals[0].reasonsList).toHaveLength(2)
    expect(removeReason(next, goalId, 0, NOW).goals[0].reasonsList).toEqual(["Because I want to lift at sixty"])
  })

  it("writes the feeling clause into the sentence when there is one", () => {
    expect(suggestSentence({ title: "Squat 140kg", targetDate: "2026-12-31", feeling: "Unstoppable energy" }))
      .toBe("I will easily squat 140kg creating unstoppable energy by 31 December 2026.")
    expect(suggestSentence({ title: "Squat 140kg", targetDate: null, feeling: "quiet confidence" }))
      .toBe("I will easily squat 140kg creating quiet confidence.")
  })
})

describe("horizon is only claimed when it is known", () => {
  it("falls back to a year for a dateless goal, which is why the chip hides it", () => {
    // Goals now arrive dated, so this exercises the classifier directly. The
    // card must still not present the fallback as a decision somebody made;
    // see `showHorizon` in GoalCard.
    const plan = addGoal(emptyNsPlan(), "lm_health", "Squat 140kg", "milestone_ladder", NOW)
    const dateless = { ...plan.goals[0], targetDate: null }
    expect(goalHorizon(dateless, TODAY)).toBe("year")
  })
})

describe("the common-goal library", () => {
  it("maps each Blueprint area to a framework library and leaves custom areas unmapped", () => {
    const plan = emptyNsPlan()
    // Read off each area's own pillarIds, so the two taxonomies join in one place.
    expect(plan.areas.every((a) => libraryPillarForArea(a) !== null)).toBe(true)
    expect(libraryPillarForArea(plan.areas.find((a) => a.id === "lm_fitness")!)).toBe("health")
    expect(libraryPillarForArea(plan.areas.find((a) => a.id === "lm_money")!)).toBe("wealth")
    expect(libraryPillarForArea(plan.areas.find((a) => a.id === "lm_family")!)).toBe("relations")
    const custom = addArea(plan, "Fun", NOW)
    expect(libraryPillarForArea(custom.areas[custom.areas.length - 1])).toBeNull()
  })

  it("gives every pillar objectives with targets under them", () => {
    for (const pillarId of ["health", "wealth", "relations", "meaning", "vices"]) {
      const groups = libraryFor(pillarId)
      expect(groups.length, `${pillarId} has no objectives`).toBeGreaterThan(0)
      expect(groups.some((g) => g.targets.length > 0), `${pillarId} has no targets`).toBe(true)
      expect(templatesFor(pillarId).length, `${pillarId} has no templates`).toBeGreaterThan(0)
    }
  })

  it("turns a numbered target into a target goal with its ladder", () => {
    const plan = addGoalFromTarget(emptyNsPlan(), "lm_health", "t_squat", undefined, NOW)
    const goal = plan.goals[0]
    expect(goal.title).toBe("Squat 1RM")
    expect(goal.type).toBe("milestone_ladder")
    expect(goal.unit).toBe("kg")
    expect(goal.ladder).toMatchObject({ start: 100, target: 140 })
  })

  it("turns a ramped target into a practice at its steady state", () => {
    const plan = addGoalFromTarget(emptyNsPlan(), "lm_health", "t_gym_strong", undefined, NOW)
    const goal = plan.goals[0]
    expect(goal.type).toBe("habit_ramp")
    expect(goal.rampSteps?.length).toBeGreaterThan(1)
    expect(goal.daysPerWeek).toBe(goal.rampSteps![goal.rampSteps!.length - 1].frequencyPerWeek)
  })

  it("turns a staged target into a finish line whose stages are the checkpoints", () => {
    const plan = addGoalFromTarget(emptyNsPlan(), "lm_health", "t_lift_form", undefined, NOW)
    const goal = plan.goals[0]
    expect(goal.type).toBe("achievement")
    expect(goal.checkpoints.map((c) => c.title)).toEqual([
      "nail the movement pattern", "clean reps at light weight", "form holds at heavy weight", "self-correct mid-set",
    ])
  })

  it("adds a whole template at the chosen level, and the level sets the numbers", () => {
    const beginner = addGoalsFromTemplate(emptyNsPlan(), "lm_health", "tmpl_strength", 0, NOW)
    const advanced = addGoalsFromTemplate(emptyNsPlan(), "lm_health", "tmpl_strength", 2, NOW)
    expect(beginner.goals.length).toBeGreaterThan(4)
    expect(beginner.goals.find((g) => g.title === "Squat 1RM")!.ladder!.target).toBe(80)
    expect(advanced.goals.find((g) => g.title === "Squat 1RM")!.ladder!.target).toBe(200)
  })

  it("only adds the targets the template switches on", () => {
    const template = TEMPLATES.find((t) => t.id === "tmpl_strength")!
    const titles = targetsForTemplate(template).map((t) => t.label)
    // The template explicitly turns this one OFF, so it must not come in.
    expect(template.targetOverrides["t_lift_form"]).toBe(false)
    expect(titles).not.toContain("Lift Form")
    expect(titles).toContain("Squat 1RM")
  })

  it("numbers template goals 1, 2, 3 in the framework's order", () => {
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_health", "tmpl_strength", 1, NOW)
    expect(plan.priorityIds).toEqual(plan.goals.map((g) => g.id))
    expect(goalRank(plan, plan.goals[0].id)).toBe(1)
  })

  it("never adds the same library goal twice, across templates too", () => {
    let plan = addGoalFromTarget(emptyNsPlan(), "lm_health", "t_squat", undefined, NOW)
    plan = addGoalFromTarget(plan, "lm_health", "t_squat", undefined, NOW)
    expect(plan.goals.filter((g) => g.title === "Squat 1RM")).toHaveLength(1)
    // Two overlapping templates share targets; the second must not duplicate.
    const before = addGoalsFromTemplate(emptyNsPlan(), "lm_health", "tmpl_strength", 1, NOW)
    const after = addGoalsFromTemplate(before, "lm_health", "tmpl_athlete", 1, NOW)
    const titles = after.goals.map((g) => g.title)
    expect(new Set(titles).size).toBe(titles.length)
    expect(after.goals.length).toBeGreaterThan(before.goals.length)
  })

  it("ignores an unknown target or template rather than throwing", () => {
    const plan = emptyNsPlan()
    expect(addGoalFromTarget(plan, "lm_health", "nope", undefined, NOW).goals).toHaveLength(0)
    expect(addGoalsFromTemplate(plan, "lm_health", "nope", 0, NOW).goals).toHaveLength(0)
  })

  it("survives a round trip after a template import", () => {
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_health", "tmpl_strength", 1, NOW)
    expect(loadNsPlan(serializeNsPlan(plan))).toEqual(plan)
  })
})

describe("the order of the flow", () => {
  it("puts rating before planning", () => {
    // Three tabs. "Where you are" and "Areas, routines & goals" were the same
    // wheel opening the same dialog, so the ratings and the goals they justify
    // were never on screen together.
    expect(TAB_ORDER).toEqual(["star", "now", "review"])
  })

  it("keeps the wheel readable at twelve areas", () => {
    const plan = emptyNsPlan()
    // Every area direct-labelled and distinctly coloured, since the wheel is
    // never allowed to carry identity by colour alone.
    expect(new Set(plan.areas.map((a) => a.color)).size).toBe(plan.areas.length)
    expect(plan.areas.every((a) => a.label.trim() && a.sublabel.trim())).toBe(true)
  })

  it("carries the 10 written on the 'now' tab through to the plan tab", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_fitness", { ten: "I train four times a week", fortnight: 4 }, NOW)
    plan = addGoal(plan, "lm_fitness", "Squat 140kg", "milestone_ladder", NOW)
    // The plan tab reads exactly these, so a change on one tab shows on the other.
    expect(areaReview(plan, "lm_fitness").ten).toBe("I train four times a week")
    expect(wheelRatings(plan, TODAY)["lm_fitness"]).toBe(4)
  })
})

describe("the gap line at twelve areas", () => {
  it("names only areas that have a 10 and no goal", () => {
    let plan = emptyNsPlan()
    // Eleven untouched areas are not eleven gaps; they are eleven areas nobody
    // has thought about yet. Only a pictured-but-unaimed-at area counts.
    const gap = (p: typeof plan) =>
      p.areas.filter((a) => goalsInArea(p, a.id).length === 0 && areaReview(p, a.id).ten.trim().length > 0)
    expect(gap(plan)).toHaveLength(0)

    plan = setAreaReview(plan, "lm_money", { ten: "A year of costs in the bank" }, NOW)
    expect(gap(plan).map((a) => a.id)).toEqual(["lm_money"])

    plan = addGoal(plan, "lm_money", "Ten thousand a month", "milestone_ladder", NOW)
    expect(gap(plan)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// The values procedure, the dates, the readings the page takes on your behalf,
// and the cross-area reach. Everything added in the pass documented in
// docs/research/life-mastery/values-and-identity.md.
// ---------------------------------------------------------------------------

describe("dates arrive on the goal", () => {
  it("dates every new goal a year out, whatever route it came in by", () => {
    // A goal with no date is a wish, and a library pick that lands dateless
    // means opening a calendar once per goal before any of them mean anything.
    let plan = addGoal(emptyNsPlan(), "lm_health", "Squat 140kg", "milestone_ladder", NOW)
    expect(plan.goals[0].targetDate).toBe("2027-08-07")

    plan = addGoalFromTarget(plan, "lm_fitness", "t_bench", undefined, NOW)
    expect(plan.goals[1].targetDate).toBe("2027-08-07")
  })

  it("dates every goal a template brings in, in one go", () => {
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_money", "tmpl_business", 1, NOW)
    expect(plan.goals.length).toBeGreaterThan(1)
    expect(plan.goals.every((g) => g.targetDate === "2027-08-07")).toBe(true)
  })

  it("adds months without rolling a short month into the next one", () => {
    expect(addMonthsISO("2026-01-31", 1)).toBe("2026-02-28")
    expect(addMonthsISO("2026-08-07", 12)).toBe("2027-08-07")
    expect(addMonthsISO("2026-11-30", 3)).toBe("2027-02-28")
  })

  it("offers the dates people pick, and knows which one a goal is sitting on", () => {
    expect(presetDate("m3", TODAY)).toBe("2026-11-07")
    expect(presetDate("eoy", TODAY)).toBe("2026-12-31")
    expect(presetDate("nope", TODAY)).toBeNull()
    expect(matchingDatePreset("2026-12-31", TODAY)).toBe("eoy")
    expect(matchingDatePreset("2026-09-19", TODAY)).toBeNull()
    expect(matchingDatePreset(null, TODAY)).toBeNull()
  })
})

describe("the cumulative unit bug", () => {
  it("stops a running total being read as a weekly rate", () => {
    // Build Hours is a cumulative 1 -> 500 carrying the unit "hours/week", so
    // it rendered as "1 -> 500 hours/week", which is 71 hours a day.
    const build = TARGETS.find((t) => t.id === "t_biz_build")!
    expect(build.unit).toBe("hours/week")
    expect(cumulativeUnit(build)).toBe("hours in total")
    expect(shapeFromTarget(build).unit).toBe("hours in total")
  })

  it("leaves a unit that is already a total exactly as it is", () => {
    const customers = TARGETS.find((t) => t.id === "t_biz_customers")!
    expect(cumulativeUnit(customers)).toBe(customers.unit)
    const bench = TARGETS.find((t) => t.id === "t_bench")!
    expect(cumulativeUnit(bench)).toBe("kg")
  })
})

describe("the values procedure", () => {
  it("keeps the two lists apart and reports the diff between them", () => {
    let plan = setCurrentValues(emptyNsPlan(), ["Success", "Security"], NOW)
    plan = setValues(plan, ["Health", "success"], NOW)
    // Case-insensitive, because nobody retypes their own capitalisation.
    expect(valuesDiff(plan)).toEqual({ added: ["Health"], dropped: ["Security"] })
  })

  it("flags a value that names a thing rather than a feeling, and only that", () => {
    expect(looksLikeMeansValue("Money")).toBe(true)
    expect(looksLikeMeansValue("Think better thoughts")).toBe(true)
    expect(looksLikeMeansValue("My business")).toBe(true)
    // Anything containing a known end word passes, including a phrase.
    expect(looksLikeMeansValue("Freedom")).toBe(false)
    expect(looksLikeMeansValue("Financial freedom")).toBe(false)
    expect(looksLikeMeansValue("Growth")).toBe(false)
    expect(looksLikeMeansValue("   ")).toBe(false)
  })

  it("raises a conflict only when both sides are on the list, in that order", () => {
    const base = emptyNsPlan()
    // Success above happiness: his own years on "the pain train".
    const bad = setValues(base, ["Success", "Health", "Happiness"], NOW)
    expect(valueConflicts(bad).map((c) => [c.above, c.below])).toEqual([["Success", "Happiness"]])

    // Reversed, it is not a conflict.
    const good = setValues(base, ["Happiness", "Success"], NOW)
    expect(valueConflicts(good)).toHaveLength(0)

    // One side missing is us guessing, not a finding.
    const half = setValues(base, ["Success", "Adventure"], NOW)
    expect(valueConflicts(half)).toHaveLength(0)
  })

  it("catches fitness above health, phrased however the user phrased it", () => {
    const plan = setValues(emptyNsPlan(), ["Fitness", "Vitality"], NOW)
    expect(valueConflicts(plan)).toHaveLength(1)
    expect(valueConflicts(plan)[0].above).toBe("Fitness")
  })

  it("reads value suggestions out of what the user has already written", () => {
    let plan = setNorthStar(
      emptyNsPlan(),
      "I wake up near the water with my partner and our two kids. I train before the house is up. Freedom to work when I want.",
      NOW,
    )
    const suggested = derivedValueSuggestions(plan)
    expect(suggested).toContain("Family")
    expect(suggested).toContain("Fitness")
    expect(suggested).toContain("Freedom")
    // Nothing is invented for a blank plan.
    expect(derivedValueSuggestions(emptyNsPlan())).toEqual([])

    // The area 10s and the goal whys count too.
    plan = setAreaReview(emptyNsPlan(), "lm_contribution", { ten: "I give money every month" }, NOW)
    expect(derivedValueSuggestions(plan)).toContain("Contribution")
  })

  it("orders the list one pair at a time, and never asks the same pair twice", () => {
    let plan = setValues(emptyNsPlan(), ["Success", "Happiness", "Health"], NOW)
    const settled: string[] = []

    const first = nextValuePair(plan, settled)!
    expect([first.a, first.b]).toEqual(["Success", "Happiness"])

    // Answering "the lower one" swaps them, which bubbles it up.
    plan = rankValueAbove(plan, first.b, first.a, NOW)
    settled.push(first.key)
    expect(plan.values).toEqual(["Happiness", "Success", "Health"])

    const second = nextValuePair(plan, settled)!
    expect([second.a, second.b]).toEqual(["Success", "Health"])
    plan = rankValueAbove(plan, second.a, second.b, NOW)
    settled.push(second.key)

    expect(nextValuePair(plan, settled)).toBeNull()
    expect(plan.values).toEqual(["Happiness", "Success", "Health"])
  })

  it("moves one value a place at a time and refuses to fall off either end", () => {
    const plan = setValues(emptyNsPlan(), ["A", "B", "C"], NOW)
    expect(moveValue(plan, "B", -1, NOW).values).toEqual(["B", "A", "C"])
    expect(moveValue(plan, "C", 1, NOW).values).toEqual(["A", "B", "C"])
    expect(moveValue(plan, "A", -1, NOW).values).toEqual(["A", "B", "C"])
    expect(moveValue(plan, "nothing", 1, NOW).values).toEqual(["A", "B", "C"])
  })

  it("names an area under the floor that no value points at", () => {
    // His client wanted to change his health and had never written health down.
    let plan = setValues(emptyNsPlan(), ["Success", "Money"], NOW)
    plan = setAreaReview(plan, "lm_health", { fortnight: 4 }, NOW)
    plan = setAreaReview(plan, "lm_money", { fortnight: 3 }, NOW)
    expect(areasWithoutValueSupport(plan, TODAY).map((a) => a.id)).toEqual(["lm_health"])

    // Adding a value that reaches it clears the finding.
    plan = setValues(plan, ["Success", "Money", "Vitality"], NOW)
    expect(areasWithoutValueSupport(plan, TODAY)).toHaveLength(0)

    // With no values written there is nothing to conclude.
    expect(areasWithoutValueSupport(setValues(plan, [], NOW), TODAY)).toHaveLength(0)
  })

  it("survives a round trip with both lists and the season focus", () => {
    let plan = setCurrentValues(emptyNsPlan(), ["Security"], NOW)
    plan = setValues(plan, ["Freedom", "Health"], NOW)
    plan = addGoal(plan, "lm_health", "Sleep eight hours", "habit_ramp", NOW)
    plan = setSeasonFocus(plan, plan.goals[0].id, NOW)
    const back = loadNsPlan(serializeNsPlan(plan))!
    expect(back.currentValues).toEqual(["Security"])
    expect(back.values).toEqual(["Freedom", "Health"])
    expect(back.seasonFocusId).toBe(plan.goals[0].id)
  })
})

describe("the one thing for the season", () => {
  it("holds a goal or an area, and clears when picked twice", () => {
    let plan = addGoal(emptyNsPlan(), "lm_mindset", "Quit weed", "achievement", NOW)
    const goalId = plan.goals[0].id

    plan = setSeasonFocus(plan, goalId, NOW)
    expect(seasonFocus(plan)).toMatchObject({ kind: "goal", label: "Quit weed" })

    plan = setSeasonFocus(plan, goalId, NOW)
    expect(seasonFocus(plan)).toBeNull()

    plan = setSeasonFocus(plan, "lm_money", NOW)
    expect(seasonFocus(plan)).toMatchObject({ kind: "area", label: "Money" })
  })

  it("refuses an id that is neither, and drops one whose goal was deleted", () => {
    let plan = addGoal(emptyNsPlan(), "lm_mindset", "Quit weed", "achievement", NOW)
    expect(setSeasonFocus(plan, "not-a-thing", NOW).seasonFocusId).toBeNull()

    plan = setSeasonFocus(plan, plan.goals[0].id, NOW)
    plan = removeGoal(plan, plan.goals[0].id, NOW)
    // Still pointing at a dead id in memory; the loader is what repairs it.
    expect(loadNsPlan(serializeNsPlan(plan))!.seasonFocusId).toBeNull()
  })

  it("reads back above everything else", () => {
    let plan = setNorthStar(emptyNsPlan(), "I wake up near the water.", NOW)
    plan = addGoal(plan, "lm_mindset", "Quit weed", "achievement", NOW)
    plan = setSeasonFocus(plan, plan.goals[0].id, NOW)
    expect(planAsText(plan, TODAY)).toContain("MY ONE THING THIS SEASON\nQuit weed")
  })
})

describe("what reaches an area", () => {
  it("counts goals filed elsewhere that say they lift it", () => {
    let plan = addGoal(emptyNsPlan(), "lm_mindset", "Quit weed", "achievement", NOW)
    const goalId = plan.goals[0].id
    plan = setGoalServes(plan, goalId, ["lm_health", "lm_money"], NOW)

    expect(areaReach(plan, "lm_health").borrowedGoals.map((g) => g.id)).toEqual([goalId])
    expect(areaReach(plan, "lm_mindset").goals.map((g) => g.id)).toEqual([goalId])
    // Its own area is never in the list, and neither is an area that is gone.
    expect(setGoalServes(plan, goalId, ["lm_mindset", "nope"], NOW).goals[0].serves).toEqual([])
  })

  it("ships the morning routine already reaching the areas it actually carries", () => {
    const plan = emptyNsPlan()
    const morning = plan.routines.find((r) => r.blueprintId === "morning")!
    expect(morning.serves).toContain("lm_emotions")
    expect(areaReach(plan, "lm_emotions").borrowedRoutines.map((r) => r.blueprintId)).toContain("morning")
  })

  it("calls an area covered when a routine runs in it and no goal does", () => {
    const plan = emptyNsPlan()
    // Nothing is aimed at Emotions, but the morning routine runs there daily,
    // and reporting "nothing here" would be wrong.
    expect(areaCoverage(plan, "lm_emotions")).toBe("covered")
    expect(areaCoverage(plan, "lm_relationship")).toBe("none")
  })

  it("calls a goal with no reason under it thin, and one with a reason covered", () => {
    let plan = addGoal(emptyNsPlan(), "lm_money", "Ten thousand a month", "milestone_ladder", NOW)
    expect(areaCoverage(plan, "lm_money")).toBe("thin")
    plan = updateGoal(plan, plan.goals[0].id, { why: "So I stop counting at the till" }, NOW)
    expect(areaCoverage(plan, "lm_money")).toBe("covered")
  })
})

describe("goals the page can score for you", () => {
  it("wires a target to its area's daily average and moves on its own", () => {
    let plan = addGoal(emptyNsPlan(), "lm_emotions", "Raise my average", "milestone_ladder", NOW)
    const id = plan.goals[0].id
    plan = setDailyRating(plan, TODAY, "lm_emotions", 5, NOW)
    plan = setGoalMetric(plan, id, "daily_area", NOW)

    expect(plan.goals[0].metric).toBe("daily_area")
    expect(plan.goals[0].unit).toBe("/10")
    // Starts where the area actually is, aims at the floor plus two.
    expect(plan.goals[0].ladder).toMatchObject({ start: 5, target: 9 })
    expect(goalMetricValue(plan, plan.goals[0], TODAY)).toBe(5)
    expect(goalMetricProgress(plan, plan.goals[0], TODAY)).toBe(0)

    plan = setDailyRating(plan, addDaysISO(TODAY, -1), "lm_emotions", 9, NOW)
    expect(goalMetricValue(plan, plan.goals[0], TODAY)).toBe(7)
    expect(goalMetricProgress(plan, plan.goals[0], TODAY)).toBeCloseTo(0.5)
  })

  it("only offers itself to a target, and leaves your numbers alone when turned off", () => {
    let plan = addGoal(emptyNsPlan(), "lm_emotions", "Journal", "habit_ramp", NOW)
    expect(goalCanUseDailyMetric(plan.goals[0])).toBe(false)
    expect(setGoalMetric(plan, plan.goals[0].id, "daily_area", NOW).goals[0].metric).toBeNull()

    plan = addGoal(plan, "lm_emotions", "Raise my average", "milestone_ladder", NOW)
    const id = plan.goals[1].id
    plan = updateGoal(plan, id, { ladder: { start: 3, target: 8, steps: 5, curveTension: 0, controlPoints: [], pins: [] } }, NOW)
    plan = setGoalMetric(plan, id, "daily_area", NOW)
    // A ladder the user shaped is respected rather than replaced.
    expect(plan.goals[1].ladder).toMatchObject({ start: 3, target: 8 })
    plan = setGoalMetric(plan, id, null, NOW)
    expect(plan.goals[1].metric).toBeNull()
    expect(plan.goals[1].ladder).toMatchObject({ start: 3, target: 8 })
  })

  it("says nothing rather than zero when there are no ratings yet", () => {
    let plan = addGoal(emptyNsPlan(), "lm_emotions", "Raise my average", "milestone_ladder", NOW)
    plan = setGoalMetric(plan, plan.goals[0].id, "daily_area", NOW)
    expect(goalMetricValue(plan, plan.goals[0], TODAY)).toBeNull()
    expect(goalMetricProgress(plan, plan.goals[0], TODAY)).toBeNull()
  })

  it("keeps the wiring through storage, and drops it from a goal that is not a target", () => {
    let plan = addGoal(emptyNsPlan(), "lm_emotions", "Raise my average", "milestone_ladder", NOW)
    plan = setGoalMetric(plan, plan.goals[0].id, "daily_area", NOW)
    expect(loadNsPlan(serializeNsPlan(plan))!.goals[0].metric).toBe("daily_area")

    const flipped = setGoalType(plan, plan.goals[0].id, "achievement", NOW)
    expect(loadNsPlan(serializeNsPlan(flipped))!.goals[0].metric).toBeNull()
  })
})

describe("goals that are really one of our own tools", () => {
  it("points the weekly review at the review tab", () => {
    const plan = addGoal(emptyNsPlan(), "lm_money", "Weekly Review", "habit_ramp", NOW)
    expect(goalToolLink(plan.goals[0])?.tab).toBe("review")
    expect(goalToolLink(addGoal(emptyNsPlan(), "lm_money", "Squat 140kg", "milestone_ladder", NOW).goals[0])).toBeNull()
  })

  it("says when a goal already exists as a step in a routine", () => {
    const plan = addGoal(emptyNsPlan(), "lm_mindset", "Meditate", "habit_ramp", NOW)
    // Not in the shipped morning stack, so nothing is claimed.
    expect(goalAlreadyInRoutine(plan, plan.goals[0])).toBeNull()

    const withMeditation = applyRoutinePreset(plan, plan.routines[0].id, "30", NOW)
    expect(goalAlreadyInRoutine(withMeditation, withMeditation.goals[0])).toMatchObject({ step: "Meditate" })
  })
})

describe("nothing is gated, so everything outstanding is listed", () => {
  it("lists what is missing, and points each item at the tab that fixes it", () => {
    const todos = planTodos(emptyNsPlan(), TODAY)
    const ids = todos.map((t) => t.id)
    expect(ids).toContain("star")
    expect(ids).toContain("values")
    expect(ids).toContain("goals")
    expect(todos.find((t) => t.id === "star")!.tab).toBe("star")
    expect(todos.find((t) => t.id === "goals")!.tab).toBe("now")
    // Every entry points at a tab that exists.
    expect(todos.every((t) => TAB_ORDER.includes(t.tab))).toBe(true)
  })

  it("stops naming a goal's date once every goal has one", () => {
    const plan = addGoal(emptyNsPlan(), "lm_health", "Run", "habit_ramp", NOW)
    expect(planTodos(plan, TODAY).map((t) => t.id)).not.toContain("goaldate")
    const dateless = { ...plan, goals: plan.goals.map((g) => ({ ...g, targetDate: null })) }
    expect(planTodos(dateless, TODAY).map((t) => t.id)).toContain("goaldate")
  })

  it("counts down the values short of seven", () => {
    expect(valuesShortBy(emptyNsPlan())).toBe(7)
    const plan = setValues(emptyNsPlan(), ["A", "B", "C", "D", "E", "F", "G", "H"], NOW)
    expect(valuesShortBy(plan)).toBe(0)
    expect(planTodos(plan, TODAY).map((t) => t.id)).not.toContain("values")
  })
})

describe("the snapshot of where you are", () => {
  it("saves, survives storage, and reads back under the 10", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_health", { ten: "Awake all day", snapshot: "Tired by 2pm most days" }, NOW)
    plan = loadNsPlan(serializeNsPlan(plan))!
    expect(areaReview(plan, "lm_health").snapshot).toBe("Tired by 2pm most days")
    expect(planAsText(plan, TODAY)).toContain("Right now: Tired by 2pm most days")
  })
})

describe("what a 10 means is spelled out", () => {
  it("ships an example for every one of the twelve areas", () => {
    for (const area of emptyNsPlan().areas) {
      expect(AREA_TEN_EXAMPLES[area.id], `no 10 example for ${area.id}`).toBeTruthy()
    }
  })

  it("never inserts the example by itself", () => {
    // It is a placeholder and a button. A plan nobody has touched must not come
    // back carrying twelve paragraphs of ours under "your 10".
    const plan = emptyNsPlan()
    expect(plan.areas.every((a) => areaReview(plan, a.id).ten === "")).toBe(true)
    expect(planIsUntouched(plan)).toBe(true)
  })
})

describe("the purpose, per area", () => {
  it("saves, survives storage, and reads back under the 10", () => {
    // His own structure: "I've got my vision here, I've got my purpose for my
    // relationship, and then I've got my goals... So I do that for each area of
    // my life" (Rw2qaMltFcY). We had the vision, the goals and the rituals.
    let plan = setAreaReview(emptyNsPlan(), "lm_relationship", {
      ten: "Close, and we can say hard things",
      purpose: "Because I do not want to end up polite and separate",
    }, NOW)
    plan = loadNsPlan(serializeNsPlan(plan))!
    expect(areaReview(plan, "lm_relationship").purpose).toBe("Because I do not want to end up polite and separate")
    expect(planAsText(plan, TODAY)).toContain("Why it matters: Because I do not want to end up polite and separate")
  })

  it("counts as work on the area, so an untouched plan is still untouched", () => {
    expect(planIsUntouched(emptyNsPlan())).toBe(true)
    const plan = setAreaReview(emptyNsPlan(), "lm_money", { purpose: "So I stop counting at the till" }, NOW)
    expect(planIsUntouched(plan)).toBe(false)
  })
})

describe("values are elicited on step 1 and ordered on step 3", () => {
  it("pools everything written per area and per goal for the ordering screen", () => {
    // The review's pool is the whole plan, which is the reason ordering waits
    // until then: on the opening screen there is one paragraph and nothing else.
    let plan = setValues(emptyNsPlan(), ["Freedom"], NOW)
    plan = setAreaReview(plan, "lm_health", { values: ["Vitality", "Freedom"] }, NOW)
    plan = addGoal(plan, "lm_money", "Ten thousand a month", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { values: ["Discipline"] }, NOW)

    const onList = new Set(plan.values.map((v) => v.toLowerCase()))
    const unlisted = collectValues(plan).filter((v) => !onList.has(v.toLowerCase()))
    // "Freedom" is already on the whole-life list and must not be offered twice.
    expect(unlisted).toEqual(["Vitality", "Discipline"])
  })

  it("keeps both lists on one record, whichever screen wrote them", () => {
    let plan = setCurrentValues(emptyNsPlan(), ["Security"], NOW)
    plan = setValues(plan, ["Freedom", "Health"], NOW)
    plan = rankValueAbove(plan, "Health", "Freedom", NOW)
    const back = loadNsPlan(serializeNsPlan(plan))!
    expect(back.currentValues).toEqual(["Security"])
    expect(back.values).toEqual(["Health", "Freedom"])
  })
})
