import fs from "node:fs"
import path from "node:path"
import { describe, it, expect } from "vitest"
import {
  addArea,
  addExperiences,
  addIdealDay,
  areaKeywordIndex,
  guessAreaId,
  idealDayMinutes,
  moveBlock,
  parseIdealDay,
  readsAsActionable,
  resetGoalsAndFocus,
  placeStep,
  promoteExperience,
  tenCandidates,
  toggleExperienceDone,
  unplaceStep,
  unplacedSteps,
  weekBlocks,
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
  applyProgramToWorkoutRoutine,
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
  areaValueSuggestions,
  looksLikeMeansValue,
  milestoneCheckpoints,
  isLiftClimb,
  liftProgression,
  addOneThingRequirement,
  goalsLikeOneThing,
  markServesOneThing,
  updateStep,
  addAction,
  linkStepToGoal,
  milestoneGoals,
  milestonesWithoutSystems,
  systemGoals,
  systemsForGoal,
  systemsWithoutMilestones,
  addSystemMilestone,
  areaSystemMilestones,
  systemMilestones,
  datedRungs,
  milestoneHasSystem,
  milestoneValues,
  stepState,
  oneThingRequirements,
  parseProgression,
  setProgression,
  weeksUntil,
  parseGoalTarget,
  setMilestones,
  updateCheckpoint,
  matchingDatePreset,
  moveValueTo,
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
  valueEvidence,
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
import {
  AREA_TEN_EXAMPLES,
  AREA_VALUE_SUGGESTIONS,
  NS_VALUE_GROUPS,
  NS_VALUE_LIBRARY,
  NS_VALUE_SUGGESTIONS,
  SCORED_TABS,
  TAB_ORDER,
  VALUES_PAST_MENU,
  WORKSHOP_TABS,
} from "@/src/goals/data/northStar"
import { TARGETS, TEMPLATES } from "@/src/goals/data/newGoalFramework"
import type { NsPlan } from "@/src/goals/types"

import { BUILDER_COPY, COMMIT_DATE_KEY, COMMIT_KEY, IDEAL_DAY_KEY, ONE_ANSWERS, ONE_THING_KEY, STARTER_KEY } from "@/src/goals/data/northStarStart"

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

  it("arrives with every routine EMPTY, and its stack one preset away", () => {
    // It used to arrive with fifteen steps ticked across four routines, before
    // anybody had written a word, and the first person through it said the page
    // felt preselected and overwhelming. The recommendation still exists; it is
    // now something you accept rather than something you prune.
    const plan = emptyNsPlan()
    for (const routine of plan.routines) {
      expect(routine.steps).toEqual([])
      expect(routineSummary(routine)).toBe("Nothing in it yet")
    }
    expect(weeklyLoad(plan).minutes).toBe(0)
    for (const bp of ROUTINE_BLUEPRINTS) {
      expect(bp.presets.length, `${bp.id} has no preset, so an empty routine would be a dead end`).toBeGreaterThan(0)
    }
  })

  it("fills the morning to mind, body and spirit on one click", () => {
    const fresh = emptyNsPlan()
    expect(fresh.routines[0].blueprintId).toBe("morning")
    const morning = applyRoutinePreset(fresh, fresh.routines[0].id, "60", NOW).routines[0]
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

    // A weekly routine counts sessions rather than minutes, once it has steps.
    const work = plan.routines.find((r) => r.blueprintId === "work")!
    plan = applyRoutinePreset(plan, work.id, "standard", NOW)
    expect(routineSummary(plan.routines.find((r) => r.id === work.id)!)).toContain("sessions a week")

    // A named training week with no exercises in it is its split, not "nothing
    // yet" — that was true when routines arrived full and is the only summary
    // an empty workout routine has now.
    plan = addRoutine(plan, "workout", NOW)
    expect(routineSummary(plan.routines[plan.routines.length - 1])).toContain("days a week")
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
    // `pick` is the fork after the one thing: it holds nothing, so it is never
    // done however finished the rest of the plan is.
    expect(nsProgress(plan).done).toEqual({ star: false, now: false, one: false, pick: false, templates: false, systems: false, milestones: false, focus: false, values: false, commit: false, track: false, today: false, journal: false, recap: false })

    plan = setNorthStar(plan, "I wake up near the water.", NOW)
    // Routines arrive empty, so adding a step is the edit.
    plan = toggleRoutineStep(plan, plan.routines[0].id, "water", NOW)
    plan = addGoal(plan, "lm_health", "Run", "habit_ramp", NOW)
    // A goal with no reason under it is not a plan, and editing a routine is
    // real work but it is not an assessment.
    expect(nsProgress(plan).done).toMatchObject({ star: false, now: false, milestones: false })

    // The assessment step wants the picture AND the number, in every area:
    // eleven rated and one blank is a picture with a hole in it. One area is
    // "started", which is what the middle ring state is for.
    plan = setAreaReview(plan, "lm_health", { ten: "Strong and light", fortnight: 6 }, NOW)
    expect(stepState(plan, "now")).toBe("started")
    expect(nsProgress(plan).done.now).toBe(false)
    for (const area of plan.areas) plan = setAreaReview(plan, area.id, { ten: "A ten here", fortnight: 6 }, NOW)
    expect(nsProgress(plan).done.now).toBe(true)
    expect(nsProgress(plan).done.milestones).toBe(false)

    // The last step is an act, not a form: it ticks when somebody has actually
    // written what they are saying yes to.
    plan = setAnswer(plan, COMMIT_KEY, "I am committing to the gym three times a week until June", NOW)
    // Saying it is "started"; the step is done when it has been signed and
    // dated, which is the difference between a document and a decision.
    expect(stepState(plan, "commit")).toBe("started")
    plan = setAnswer(plan, COMMIT_DATE_KEY, "2026-08-17", NOW)
    expect(nsProgress(plan).done.commit).toBe(true)
    // And the values step ticks on the ranking, which is its whole job.
    expect(nsProgress(plan).done.values).toBe(false)
    // Two is a pair, not a ranking. Three is the shortest list whose order
    // says something about the person.
    plan = setValues(plan, ["Freedom", "Health"], NOW)
    expect(stepState(plan, "values")).toBe("started")
    plan = setValues(plan, ["Freedom", "Health", "Mastery"], NOW)
    expect(nsProgress(plan).done.values).toBe(true)

    // Focus needs BOTH halves. Picking the areas is the half anybody can do
    // cold; pointing at the one that leads is the half that decides what the
    // season is, and a step that fills its ring on the easy half is lying.
    // The one thing itself is written at step 3 now, so what this step owns is
    // the areas and which of them leads.
    plan = toggleSeasonArea(plan, "lm_health", NOW)
    expect(stepState(plan, "focus")).toBe("started")
    expect(nsProgress(plan).done.focus).toBe(false)
    plan = setSeasonFocus(plan, "lm_health", NOW)
    expect(nsProgress(plan).done.focus).toBe(true)
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

  it("shows his own answer on the two prompts that read as one question", () => {
    // The identity and the standards are both lists of good qualities in the
    // present tense, and he blurs them himself ("this is who I'm committed to
    // being, this is the standards"). Neither question says "committed to" any
    // more, and each carries a few words of his own list, because "an amazing
    // friend, son, brother" beside "to be disciplined" settles it faster than
    // an explanation does.
    const identity = STAR_PROMPTS.find((p) => p.id === "identity_total")!
    const conduct = STAR_PROMPTS.find((p) => p.id === "conduct")!
    expect(identity.example).toBeTruthy()
    expect(conduct.example).toBeTruthy()
    for (const p of [identity, conduct]) expect(p.question.toLowerCase()).not.toContain("committed to")
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

    // Editing only a routine counts, and the stack then reads back. Clearing an
    // already-empty routine changes nothing, so this puts something IN one.
    const edited = applyRoutinePreset(fresh, fresh.routines[0].id, "15", NOW)
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
    /**
     * Seven steps, and the order is the argument.
     *
     * THE ONE THING COMES BEFORE THE GOALS. Asked afterwards it is an audit of
     * a list somebody has already written; asked before, it decides what goes
     * on the list — the areas get filled with what the one thing needs rather
     * than with everything that came to mind.
     *
     * THE GOALS COME BEFORE THE FOCUS. They were the other way round, which
     * asked somebody to choose the two or three areas of their season before
     * they had written down what they wanted in any of them — choosing between
     * things they had not named yet. You write everything, then choose. The
     * values ranking moved late for the same reason, and the last step is an
     * act rather than a form.
     */
    /**
     * MILESTONES AND SYSTEMS ARE TWO STEPS, not one called "All goals".
     *
     * What you want and what you do about it are different work and produce
     * different writing: the first wants to be loose and greedy — the car, the
     * trip, the number nobody would say out loud — and the second wants to be
     * small and specific. Mixed in one list they blunt each other, and the
     * question that matters ("what is actually moving this?") cannot be asked
     * at all, because the answer is somewhere in the same column.
     */
    /**
     * AND THE ONE THING IS FOLLOWED BY A FORK, not by the goals page.
     *
     * The order above is an argument up to that point and stops being one
     * after it: whether you start from what you want, from what you will do,
     * or from a single routine is a fact about the person, not a stage. The
     * fork is a step in the rail so it can be come back to, and it holds
     * nothing of its own.
     */
    /**
     * AND THE CATALOGUE IS A STEP OF ITS OWN, before both build steps.
     *
     * It was a tab riding on them, which put "here is what other people set"
     * on the same surface as "write what you want". As a step it is a place
     * you walk through and leave, and it comes first of the three because a
     * browse is the cheapest of them to do.
     */
    /**
     * AND THE BENCH SITS BESIDE THE CATALOGUE.
     *
     * Customize is the other answer to the same question. Templates is for
     * somebody who wants to be handed a program; Customize is for somebody who
     * already knows what their week is and wants it tracked rather than
     * proposed. Adjacent because they are alternatives to each other, and after
     * Templates because taking a proven thing and changing it is the smaller
     * ask of the two.
     */
    /**
     * AND THE DOING COMES LAST, after the deciding.
     *
     * Track and Today are not more of the plan; they are what happens to it.
     * Track is the crossing — the goals become rows the app counts — and Today
     * is the one screen that asks what you actually did. They sit after Commit
     * because until you have said yes to the plan there is nothing to run, and
     * Today sits after Track because a driver you have not pushed is a driver
     * nothing can count.
     */
    /**
     * AND THE WHOLE THING, READ BACK, IS LAST.
     *
     * The recap is a mirror of the twelve steps in front of it, so it cannot
     * sit among them: it is where somebody lands when they come BACK to the
     * plan, rather than a place they pass through while writing it.
     */
    /**
     * AND THE JOURNAL SITS BESIDE TODAY, not among the steps that write the plan.
     *
     * It is the third practice screen — Track pushes the goals, Today ticks
     * them off, Journal holds what you wrote while doing it — so it belongs
     * with those two and not in the run of steps that decide what the plan is.
     */
    expect(TAB_ORDER).toEqual(["star", "now", "one", "pick", "templates", "systems", "milestones", "focus", "values", "commit", "track", "today", "journal", "recap"])
    expect(TAB_ORDER.indexOf("journal")).toBe(TAB_ORDER.indexOf("today") + 1)
    expect(TAB_ORDER[TAB_ORDER.length - 1]).toBe("recap")
    expect(TAB_ORDER.indexOf("today")).toBe(TAB_ORDER.indexOf("track") + 1)
    expect(TAB_ORDER.indexOf("track")).toBe(TAB_ORDER.indexOf("commit") + 1)
    expect(TAB_ORDER).not.toContain("customize")
    // And the two halves the fork names are two steps, next to each other.
    expect(TAB_ORDER.indexOf("milestones")).toBe(TAB_ORDER.indexOf("systems") + 1)
    expect(TAB_ORDER.indexOf("pick")).toBe(TAB_ORDER.indexOf("one") + 1)
  })

  it("marks the catalogue step a workshop, and never scores it", () => {
    /**
     * A ring on Templates would score somebody on having browsed, and on having
     * designed a training program — neither is part of writing a life plan, and
     * most people will do neither.
     */
    expect(SCORED_TABS).not.toContain("templates")
    expect(WORKSHOP_TABS).toEqual(["templates"])
    const plan = emptyNsPlan()
    // And it never blocks: nothing on it can appear in the outstanding list.
    expect(planTodos(plan, TODAY).some((t) => t.tab === "templates")).toBe(false)
  })

  it("scores nothing on the catalogue step either", () => {
    // Same rule as the fork: what you take from the catalogue is scored on the
    // steps it lands in, and a ring on "have you had a look" scores browsing.
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_health", "tmpl_strength", 1, NOW)
    expect(stepState(plan, "templates")).toBe("empty")
    expect(tabHasContent(plan, "templates")).toBe(false)
    expect(planTodos(plan, NOW).some((t) => t.tab === "templates")).toBe(false)
  })

  it("scores nothing on the recap, however full the plan is", () => {
    /**
     * THE ONE RULE THE RECAP HAS TO KEEP.
     *
     * Every word on it was written on another step and is scored there. A ring
     * would fill itself off that work a second time, and "you have not finished
     * reading your own plan" is not a thing to tell anybody about a page whose
     * whole job is being somewhere worth coming back to.
     */
    expect(SCORED_TABS).not.toContain("recap")
    expect(WORKSHOP_TABS).not.toContain("recap")
    const plan = setNorthStar(emptyNsPlan(), "I wake up near the water.", NOW)
    expect(stepState(plan, "recap")).toBe("empty")
    expect(tabHasContent(plan, "recap")).toBe(false)
    expect(planTodos(plan, TODAY).some((t) => t.tab === "recap")).toBe(false)
  })

  it("scores nothing on the fork and reads nothing back from it", () => {
    // A dot on a crossroads scores somebody on having chosen, and the three
    // doors are not a checklist. Whatever they write lands on the steps the
    // doors open, so this one stays empty however full the plan is.
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_health", "tmpl_strength", 1, NOW)
    expect(stepState(plan, "pick")).toBe("empty")
    expect(tabHasContent(plan, "pick")).toBe(false)
    expect(planTodos(plan, NOW).some((t) => t.tab === "pick")).toBe(false)
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

  it("moves one value to a place and slides the rest along", () => {
    const plan = setValues(emptyNsPlan(), ["A", "B", "C", "D"], NOW)
    // A neighbour move reads as a swap...
    expect(moveValueTo(plan, "B", 0, NOW).values).toEqual(["B", "A", "C", "D"])
    // ...but a long drag must not swap the ends: everything between shifts.
    expect(moveValueTo(plan, "D", 1, NOW).values).toEqual(["A", "D", "B", "C"])
    expect(moveValueTo(plan, "A", 3, NOW).values).toEqual(["B", "C", "D", "A"])
    // Off either end clamps, because a drop past the last row means "last".
    expect(moveValueTo(plan, "A", -2, NOW).values).toEqual(["A", "B", "C", "D"])
    expect(moveValueTo(plan, "B", 9, NOW).values).toEqual(["A", "C", "D", "B"])
    // A no-op destination and an unknown value both leave the plan alone.
    expect(moveValueTo(plan, "C", 2, NOW)).toBe(plan)
    expect(moveValueTo(plan, "nothing", 1, NOW)).toBe(plan)
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
    const fresh = emptyNsPlan()
    // An empty routine reaches nothing: it is a name and no steps.
    expect(areaCoverage(fresh, "lm_emotions")).toBe("none")
    // Filled, nothing is aimed at Emotions but the morning routine runs there
    // daily, and reporting "nothing here" would be wrong.
    const plan = applyRoutinePreset(fresh, fresh.routines[0].id, "30", NOW)
    expect(areaCoverage(plan, "lm_emotions")).toBe("covered")
    // A routine improves every area by default now — the blueprint's guess at
    // which four it lifts was wrong in the same direction every time — so
    // Relationship is covered too until somebody narrows it.
    expect(areaCoverage(plan, "lm_relationship")).toBe("covered")
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
  it("points the weekly review at the step that does it", () => {
    // The review tab became the last step: read it back, name what could go
    // wrong, commit. A goal called "Weekly Review" still points at the place
    // that work happens.
    const plan = addGoal(emptyNsPlan(), "lm_money", "Weekly Review", "habit_ramp", NOW)
    expect(goalToolLink(plan.goals[0])?.tab).toBe("commit")
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
    expect(todos.find((t) => t.id === "goals")!.tab).toBe("milestones")
    expect(todos.find((t) => t.id === "rate")!.tab).toBe("now")
    // Every entry points at a tab that exists.
    expect(todos.every((t) => TAB_ORDER.includes(t.tab))).toBe(true)
  })

  it("stops naming a goal's date once every goal has one", () => {
    const plan = addGoal(emptyNsPlan(), "lm_health", "Flat bench 100 kg", "milestone_ladder", NOW)
    expect(planTodos(plan, TODAY).map((t) => t.id)).not.toContain("goaldate")
    const dateless = { ...plan, goals: plan.goals.map((g) => ({ ...g, targetDate: null })) }
    expect(planTodos(dateless, TODAY).map((t) => t.id)).toContain("goaldate")
  })

  it("reads a line about something you are not doing as a system", () => {
    /**
     * "No weed" is not something you have achieved by March. It is a line you
     * hold every day, which is a rate, which is a system — and read as an
     * achievement it sat on the list of things you want to have done, being
     * asked when it would be finished.
     */
    for (const title of ["No weed", "No porn", "Quit smoking", "Stop drinking", "Cut out sugar", "No scrolling"]) {
      expect(shapeFromTitle(title).type, title).toBe("habit_ramp")
    }
    // A rate the person wrote themselves wins over the blanket every-day read.
    expect(shapeFromTitle("No drinking 5x a week").daysPerWeek).toBe(5)
    // NOT a state you cannot simply decide to do. Filing this as a daily rate
    // would be the page telling somebody their back pain is a habit.
    expect(shapeFromTitle("No pain in my back").type).toBe("achievement")
    expect(shapeFromTitle("One muscle-up").type).toBe("achievement")
  })

  it("repairs an abstinence line that was filed as an achievement", () => {
    // Written before the rule existed, so it is stored as an achievement. It
    // comes back off the wire as a driver, keeping everything else about it.
    let plan = addGoal(emptyNsPlan(), "lm_health", "No weed", "achievement", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { why: "It costs me my mornings" }, NOW)
    const raw = serializeNsPlan({ ...plan, goals: plan.goals.map((g) => ({ ...g, type: "achievement" as const })) })
    const loaded = loadNsPlan(raw)!
    expect(loaded.goals[0].type).toBe("habit_ramp")
    expect(loaded.goals[0].why).toBe("It costs me my mornings")
    expect(milestoneGoals(loaded)).toEqual([])
  })

  it("asks a practice for neither a why nor a date", () => {
    /**
     * NOT EVERY RUN NEEDS A WHY.
     *
     * A milestone is a thing you want, and the why is most of whether you still
     * want it in February. A practice is a rate you hold — four runs a week —
     * and asking what each one is in service of, plus when it will be finished,
     * is paperwork. A panel that says "5 goals need a why" when four of them
     * are runs is a panel the person stops reading.
     */
    let plan = addGoal(emptyNsPlan(), "lm_health", "Run four times a week", "habit_ramp", NOW)
    plan = { ...plan, goals: plan.goals.map((g) => ({ ...g, why: "", targetDate: null })) }
    const ids = planTodos(plan, TODAY).map((t) => t.id)
    expect(ids).not.toContain("goalwhy")
    expect(ids).not.toContain("goaldate")
    // And nothing else either: a rate is the whole of a practice. It was being
    // asked for a why, a date, two ratings and a sentence — five boxes for a
    // run — and the row said "needs work" beside something already complete.
    expect(goalGaps(plan.goals[0])).toEqual([])
    expect(goalIsQualified(plan.goals[0])).toBe(true)
    // A practice with no rate is the one thing missing that matters.
    expect(goalGaps({ ...plan.goals[0], daysPerWeek: 0 })).toEqual(["a rate"])

    // A milestone in the same plan is still asked for both.
    plan = addGoal(plan, "lm_health", "Flat bench 100 kg", "milestone_ladder", NOW)
    plan = { ...plan, goals: plan.goals.map((g) => ({ ...g, why: "", targetDate: null })) }
    const both = planTodos(plan, TODAY).map((t) => t.id)
    expect(both).toContain("goalwhy")
    expect(both).toContain("goaldate")
    // One goal, not two: the practice is not counted into either.
    expect(planTodos(plan, TODAY).find((t) => t.id === "goalwhy")!.text).toContain("1 goal")
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

  it("gathers every place a value was already named, and counts them", () => {
    // The reason this exists: by the ordering screen the same question has been
    // answered in five boxes and every answer used to be thrown away.
    let plan = setCurrentValues(emptyNsPlan(), ["Security"], NOW)
    plan = setValues(plan, ["Freedom"], NOW)
    plan = setAreaReview(plan, "lm_health", { values: ["Vitality"] }, NOW)
    plan = setAreaReview(plan, "lm_relationship", { values: ["Vitality"] }, NOW)
    plan = addGoal(plan, "lm_money", "Ten thousand a month", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { values: ["Vitality"] }, NOW)

    const rows = valueEvidence(plan)
    const vitality = rows.find((r) => r.value === "Vitality")!
    // Three boxes, three places, and the boxes are named in the user's nouns
    // rather than as ids, because a row you cannot recognise is not evidence.
    expect(vitality.places).toBe(3)
    expect(vitality.hits).toBe(3)
    expect(vitality.mentions.map((m) => m.where)).toEqual(["Health", "Relationship", "Ten thousand a month"])
    expect(vitality.mentions.map((m) => m.kind)).toEqual(["area", "area", "goal"])
    // Named three times and still deciding nothing: that is the finding.
    expect(vitality.rank).toBeNull()
    // The two whole-life lists carry their own flags.
    expect(rows.find((r) => r.value === "Security")).toMatchObject({ past: true, rank: null })
    expect(rows.find((r) => r.value === "Freedom")).toMatchObject({ past: false, rank: 1 })
  })

  it("ranks by how much of a life a value runs through, not by how loud it was", () => {
    // Breadth is the prioritising signal and volume is not: three areas is a
    // value running through three parts of somebody's life, three mentions
    // inside one area is the same part said loudly. Both used to read as
    // "3 places", and only the first is load-bearing.
    let plan = setAreaReview(emptyNsPlan(), "lm_health", { values: ["Wide", "Loud"] }, NOW)
    plan = setAreaReview(plan, "lm_relationship", { values: ["Wide"] }, NOW)
    plan = setAreaReview(plan, "lm_money", { values: ["Wide"] }, NOW)
    plan = addGoal(plan, "lm_health", "Squat 140", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { values: ["Loud", "Loud"] }, NOW)
    plan = addGoal(plan, "lm_health", "Sleep by eleven", "habit_ramp", NOW)
    plan = updateGoal(plan, plan.goals[1].id, { values: ["Loud"] }, NOW)

    const rows = valueEvidence(plan)
    const wide = rows.find((r) => r.value === "Wide")!
    const loud = rows.find((r) => r.value === "Loud")!
    // Same number of boxes each. The difference is how far they reach.
    expect(loud.places).toBe(wide.places)
    expect(wide.areas).toEqual(["lm_health", "lm_relationship", "lm_money"])
    expect(loud.areas).toEqual(["lm_health"])
    expect(rows.indexOf(wide)).toBeLessThan(rows.indexOf(loud))
  })

  it("names the areas in wheel order, so two rows can be compared by eye", () => {
    // Mention order would print the same two areas as different runs of colour
    // depending on which box was filled in first.
    let plan = setAreaReview(emptyNsPlan(), "lm_money", { values: ["Freedom"] }, NOW)
    plan = setAreaReview(plan, "lm_health", { values: ["Freedom", "Vitality"] }, NOW)
    plan = setAreaReview(plan, "lm_money", { values: ["Freedom", "Vitality"] }, NOW)
    const rows = valueEvidence(plan)
    const order = plan.areas.map((a) => a.id)
    for (const row of rows) {
      expect(row.areas).toEqual(order.filter((id) => row.areas.includes(id)))
    }
  })

  it("gives no areas to a value that only ever lived on the whole-life lists", () => {
    // The count line says "named twice" rather than claiming nought areas, and
    // the row draws no dots at all.
    const plan = setCurrentValues(emptyNsPlan(), ["Security"], NOW)
    expect(valueEvidence(plan).find((r) => r.value === "Security")!.areas).toEqual([])
  })

  it("carries the ids a mention needs to reopen the box it came from", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_health", { values: ["Vitality"] }, NOW)
    plan = addGoal(plan, "lm_money", "Ten thousand a month", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { values: ["Discipline"] }, NOW)

    const rows = valueEvidence(plan)
    expect(rows.find((r) => r.value === "Vitality")!.mentions[0]).toMatchObject({ tab: "now", areaId: "lm_health" })
    expect(rows.find((r) => r.value === "Discipline")!.mentions[0]).toMatchObject({
      tab: "milestones", areaId: "lm_money", goalId: plan.goals[0].id,
    })
  })

  it("counts a value cued twice in one paragraph as one place and two hits", () => {
    // "You keep coming back to this" and "you said it in three rooms" are
    // different facts. Collapsing them loses the first one.
    const plan = setNorthStar(emptyNsPlan(), "I wake up near the water with my kids and my wife", NOW)
    const family = valueEvidence(plan).find((r) => r.value === "Family")!
    expect(family.places).toBe(1)
    expect(family.hits).toBe(2)
    expect(family.mentions[0].where).toBe("Your north star")
  })

  it("never lets a word read out of prose pass as a word somebody chose", () => {
    let plan = setNorthStar(emptyNsPlan(), "I train every morning and my body is strong", NOW)
    plan = setValues(plan, ["Freedom"], NOW)
    const rows = valueEvidence(plan)
    // Fitness was never clicked. It is a guess off cue words, and the flag that
    // says so is what the surface draws it differently by.
    expect(rows.find((r) => r.value === "Fitness")).toMatchObject({ chosen: false })
    expect(rows.find((r) => r.value === "Freedom")).toMatchObject({ chosen: true })
    // And a guess never outranks an answer, however loudly it was cued.
    expect(rows.findIndex((r) => r.value === "Freedom")).toBeLessThan(rows.findIndex((r) => r.value === "Fitness"))
  })

  it("has nothing to show on an untouched plan", () => {
    expect(valueEvidence(emptyNsPlan())).toEqual([])
  })

  it("keeps both lists on one record, whichever screen wrote them", () => {
    let plan = setCurrentValues(emptyNsPlan(), ["Security"], NOW)
    plan = setValues(plan, ["Freedom", "Health"], NOW)
    plan = rankValueAbove(plan, "Health", "Freedom", NOW)
    const back = loadNsPlan(serializeNsPlan(plan))!
    expect(back.currentValues).toEqual(["Security"])
    expect(back.values).toEqual(["Health", "Freedom"])
  })

  it("offers each area the values that area actually asks for", () => {
    // A generic row put Adventure and Faith under Money and left out Security,
    // which is the one nearly everybody writes there.
    expect(areaValueSuggestions(emptyNsPlan(), "lm_money")).toContain("Security")
    expect(areaValueSuggestions(emptyNsPlan(), "lm_fun")).toContain("Play")
    // Every fallback word has to exist in the library, or the picker offers a
    // word the browser underneath cannot find.
    const library = new Set(NS_VALUE_LIBRARY.map((v) => v.toLowerCase()))
    for (const [areaId, values] of Object.entries(AREA_VALUE_SUGGESTIONS)) {
      expect(values.length, areaId).toBeGreaterThan(0)
      expect(values.filter((v) => !library.has(v.toLowerCase()))).toEqual([])
    }
  })

  it("reads the area's own 10 before falling back to what the area usually asks", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_money", { ten: "A year of costs in the bank and I stop counting at the till" }, NOW)
    plan = setNorthStar(plan, "I surf on Tuesdays and travel with my oldest friends", NOW)
    const suggestions = areaValueSuggestions(plan, "lm_money")
    // "stop counting" and "in the bank" are their words about THIS area, so
    // those come first, ahead of anything read off the north star and ahead of
    // our own list for Money.
    expect(suggestions.slice(0, 2)).toEqual(["Abundance", "Security"])
    // The fallback still fills the rest of the row rather than leaving it short.
    expect(suggestions).toContain("Wealth")
    expect(suggestions).toHaveLength(8)
    // Already written here, so not offered again.
    plan = setAreaReview(plan, "lm_money", { values: ["Security"] }, NOW)
    expect(areaValueSuggestions(plan, "lm_money")).not.toContain("Security")
  })

  it("offers a library big enough to recognise something in", () => {
    // Twelve chips was the entire pool, and naming a value is a recall problem:
    // you know it when you see it and cannot produce it cold.
    expect(NS_VALUE_LIBRARY.length).toBeGreaterThanOrEqual(100)
    // Groups are for scanning. A word filed twice reads as two different words.
    expect(new Set(NS_VALUE_LIBRARY.map((v) => v.toLowerCase())).size).toBe(NS_VALUE_LIBRARY.length)
    expect(NS_VALUE_GROUPS.every((g) => g.label.trim() && g.values.length > 0)).toBe(true)
  })

  it("keeps the inline row inside the library, so nothing is offered in one place only", () => {
    const library = new Set(NS_VALUE_LIBRARY.map((v) => v.toLowerCase()))
    expect(NS_VALUE_SUGGESTIONS.filter((s) => !library.has(s.toLowerCase()))).toEqual([])
    // His spoken menu too. Two words for one value means somebody adds both and
    // then has to rank them against each other.
    expect(VALUES_PAST_MENU.filter((s) => !library.has(s.toLowerCase()))).toEqual([])
  })

  it("prompts pass 1 with his menu rather than the user's own paragraph", () => {
    // "security, has it been being safe, has it been happiness, has it been
    // success, has it been money, has it been family, has it been love, has it
    // been passion, has it been friends, has it been travel" (Lp_GOrM16Xc), in
    // his order. Cueing this list off the vision they just wrote would produce
    // the same list twice and lose the diff the exercise exists for.
    expect(VALUES_PAST_MENU.slice(0, 5)).toEqual(["Security", "Safety", "Happiness", "Success", "Money"])
  })

  it("still carries the means values people actually say", () => {
    // Family, money and fitness are not emotions. Leaving them off the list is
    // how the exercise ends; they earn the "worth a second look" question
    // instead, which is a question and not a rejection.
    const library = new Set(NS_VALUE_LIBRARY.map((v) => v.toLowerCase()))
    for (const word of ["family", "money", "fitness", "status"]) expect(library.has(word)).toBe(true)
    expect(looksLikeMeansValue("Family")).toBe(true)
  })
})

describe("a finish line with a number in it is a climb", () => {
  it("reads the target out of the title, and ignores the shape of the rep", () => {
    // "Bench 36 kg dumbbells for 6 reps": 36 is the thing that grows, 6 is not.
    const parsed = parseGoalTarget("Bench 36 kg dumbbells for 6 reps")!
    expect(parsed).toMatchObject({ value: 36, unit: "kg", prefix: "Bench" })
    // A number with a word after it that is not a unit keeps the number only.
    expect(parseGoalTarget("Read 24 books this year")!.unit).toBe("books")
    expect(parseGoalTarget("Run a marathon")).toBeNull()
  })

  it("does not scale a number that is the name of a thing", () => {
    // Reported from the page: "buy a ferarri 458", written in Money as
    // something to experience, came back as a climb from 0 to 458 — of what?
    // There is no unit and there was never going to be one. 458 is the car.
    expect(parseGoalTarget("buy a ferarri 458")).toBeNull()
    expect(parseGoalTarget("buy a Ferrari 458")).toBeNull()
    expect(parseGoalTarget("buy an iPhone 15")).toBeNull()
    // The article has to be next to the number, or every sentence with an "a"
    // anywhere in it loses its target.
    expect(parseGoalTarget("buy a house and save 500000")).toMatchObject({ value: 500000 })
    // A number carrying a unit is an amount whatever stands in front of it.
    expect(parseGoalTarget("do a 5k")).toMatchObject({ value: 5, unit: "k" })
    expect(parseGoalTarget("Udgiv en artikel som 10 læser")).toMatchObject({ value: 10, unit: "læser" })
  })

  it("labels the rungs with the noun when the noun stands behind the number", () => {
    // "get 28 kg bench 3 sets 8 reps by april" put "get" in front of every rung
    // and dropped "bench", so the climb read "get 22.5 kg". Same blindness as
    // the Ferrari: the first number is taken and the sentence around it is not.
    expect(parseGoalTarget("get 28 kg bench 3 sets 8 reps by april")).toMatchObject({
      value: 28,
      unit: "kg",
      prefix: "bench",
    })
    expect(parseGoalTarget("hit 100 kg squat")!.prefix).toBe("squat")
    // Only the word immediately behind the unit. Reading past the preposition
    // labels the climb "december".
    expect(parseGoalTarget("reach 80 kg by december")!.prefix).toBe("reach")
    // A verb that says something keeps its place in front.
    expect(parseGoalTarget("Bench 36 kg dumbbells for 6 reps")!.prefix).toBe("Bench")
    expect(parseGoalTarget("Få 10 downloads")!.prefix).toBe("Få")
  })

  it("spaces the rungs evenly and always finishes on the target", () => {
    expect(milestoneValues(24, 36, 4)).toEqual([27, 30, 33, 36])
    // Downhill is the same climb in reverse.
    expect(milestoneValues(90, 80, 5)).toEqual([88, 86, 84, 82, 80])
    // A span smaller than the rung count would collapse two rungs into one.
    expect(new Set(milestoneValues(10, 12, 8)).size).toBe(milestoneValues(10, 12, 8).length)
  })

  it("replaces its own rungs and leaves hand-written checkpoints alone", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Bench 36 kg dumbbells for 6 reps", "achievement", NOW)
    const id = plan.goals[0].id
    plan = addCheckpoint(plan, id, "Book the platform", NOW)
    plan = setMilestones(plan, id, { from: 24, to: 36, count: 4, unit: "kg", prefix: "Bench" }, NOW)
    expect(milestoneCheckpoints(plan.goals[0]).map((c) => c.title)).toEqual([
      // Not 27, 30, 33: a 33 kg bench is not a weight that exists. Rungs land
      // on the 2.5 kg grid the plates actually move on; the 36 is untouched
      // because it is the number the person wrote.
      "Bench 27.5 kg", "Bench 30 kg", "Bench 32.5 kg", "Bench 36 kg",
    ])
    // Regenerating at a different count must not leave the old rungs behind.
    plan = setMilestones(plan, id, { from: 24, to: 36, count: 2, unit: "kg", prefix: "Bench" }, NOW)
    expect(milestoneCheckpoints(plan.goals[0])).toHaveLength(2)
    expect(plan.goals[0].checkpoints.some((c) => c.title === "Book the platform")).toBe(true)
  })

  it("carries a celebration per rung, through a save", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Bench 36 kg for 6 reps", "achievement", NOW)
    const id = plan.goals[0].id
    plan = setMilestones(plan, id, { from: 30, to: 36, count: 2, unit: "kg" }, NOW)
    const first = milestoneCheckpoints(plan.goals[0])[0]
    plan = updateCheckpoint(plan, id, first.id, { celebration: "Steak" }, NOW)
    const back = loadNsPlan(serializeNsPlan(plan))!
    expect(milestoneCheckpoints(back.goals[0])[0].celebration).toBe("Steak")
  })
})

// ---------------------------------------------------------------------------
// The board, the cascade and the timeline.
// ---------------------------------------------------------------------------

import {
  addPractice,
  applyRoutineNeed,
  templatesInArea,
  removeTemplateGoals,
  goalRateLabel,
  routineWeeklySessions,
  areaObjectives,
  areaOffer,
  areaOfferNote,
  areaPractices,
  areaTemplates,
  daysBetween,
  defaultActionForTarget,
  goalMilestones,
  planCascade,
  planTimeline,
  practiceIsOn,
  removePractice,
  routineNeedState,
  routineNeedsForObjectives,
  routineNeedsForTarget,
  routineNeedsForTemplate,
  unmetRoutineNeeds,
  weeklyLoad,
} from "@/src/goals/northStarService"
import { AREA_OFFERS, LOAD_CEILING, OBJECTIVE_ACTION, OBJECTIVE_ROUTINE_NEEDS } from "@/src/goals/data/northStarBuild"
import { OBJECTIVES } from "@/src/goals/data/newGoalFramework"

const areaOf = (id: string) => emptyNsPlan().areas.find((a) => a.id === id)!

describe("what an area actually offers", () => {
  it("does not hand Family the girlfriend catalogue", () => {
    // Three areas share the relations pillar and five share meaning, so the
    // pillar map alone offered Family and Friends "Get a Girlfriend". On a
    // board, where every area is on screen at once, that reads as one catalogue
    // pasted four times.
    const family = areaObjectives(areaOf("lm_family")).map((g) => g.objective.id)
    const friends = areaObjectives(areaOf("lm_friends")).map((g) => g.objective.id)
    const relationship = areaObjectives(areaOf("lm_relationship")).map((g) => g.objective.id)
    expect(family).toEqual([])
    expect(friends).toEqual([])
    expect(relationship).toContain("obj_girlfriend")
  })

  it("gives every area either goals or practices, and says so when it has no goals", () => {
    for (const area of emptyNsPlan().areas) {
      const offer = areaOffer(area)!
      expect(offer, area.id).toBeTruthy()
      expect(offer.objectiveIds.length + offer.practices.length, `${area.id} offers nothing`).toBeGreaterThan(0)
      // An area the catalogue cannot cover has to say that out loud rather than
      // quietly showing the neighbouring pillar's goals.
      if (offer.objectiveIds.length === 0) expect(areaOfferNote(area), `${area.id} has no note`).toBeTruthy()
    }
  })

  it("resolves every practice against a real step in a real blueprint", () => {
    for (const area of emptyNsPlan().areas) {
      const declared = AREA_OFFERS[area.id]?.practices ?? []
      expect(areaPractices(area), `${area.id} has an unresolvable practice`).toHaveLength(declared.length)
    }
  })

  it("only offers templates that reach the area's own objectives", () => {
    const fitness = areaTemplates(areaOf("lm_fitness"))
    expect(fitness.length).toBeGreaterThan(0)
    const wanted = new Set(areaOffer(areaOf("lm_fitness"))!.objectiveIds)
    expect(fitness.every((t) => t.objectiveIds.some((id) => wanted.has(id)))).toBe(true)
    // Money must not be offered the training templates.
    expect(areaTemplates(areaOf("lm_money")).some((t) => t.id === "tmpl_strength")).toBe(false)
  })

  it("names an objective the board knows for every objective in the catalogue", () => {
    // A new objective landing in the framework with no routine and no action is
    // a goal that arrives with nothing behind it, which is the exact failure
    // this whole thing exists to close.
    for (const objective of OBJECTIVES) {
      expect(OBJECTIVE_ROUTINE_NEEDS[objective.id], `${objective.id} has no routine`).toBeTruthy()
      expect(OBJECTIVE_ACTION[objective.id], `${objective.id} has no action`).toBeTruthy()
    }
  })
})

describe("a goal drags its routine in behind it", () => {
  it("merges two objectives that want the same routine into one need", () => {
    const needs = routineNeedsForObjectives(["obj_strong", "obj_muscle"])
    expect(needs).toHaveLength(1)
    expect(needs[0].blueprintId).toBe("workout")
    // The union of both, not the second one's list.
    expect(needs[0].stepIds).toContain("strength")
    expect(needs[0].stepIds).toContain("protein")
  })

  it("adds the routine with its split and ONLY the steps the goal asked for", () => {
    const plan = emptyNsPlan()
    expect(plan.routines.some((r) => r.blueprintId === "workout")).toBe(false)
    const need = routineNeedsForTemplate(TEMPLATES.find((t) => t.id === "tmpl_strength")!)[0]
    expect(routineNeedState(plan, need)).toBe("missing")
    const next = applyRoutineNeed(plan, need, NOW)
    const routine = next.routines.find((r) => r.blueprintId === "workout")!
    expect(routine).toBeTruthy()
    // The split is the shape of the week, not work added to it, so it comes.
    expect(routine.splitDays.length).toBeGreaterThan(0)
    expect(need.stepIds.every((id) => routine.steps.some((s) => s.id === id))).toBe(true)
    expect(routineNeedState(next, need)).toBe("met")
    /**
     * AND NOTHING ELSE. The preset used to come with it, so one goal in Friends
     * created a Connection routine holding four steps — and the catalogue then
     * showed "Give one genuine compliment" already ticked, chosen by nobody.
     * Reported from the page. The presets stay one click away on the card.
     */
    expect(routine.steps.map((s) => s.id).sort()).toEqual([...need.stepIds].sort())
  })

  it("only adds the missing steps to a routine that is already there, and never twice", () => {
    // The morning routine ships in the default stack. Applying a need to it must
    // not replace the stack somebody has already built.
    const plan = emptyNsPlan()
    const morning = plan.routines.find((r) => r.blueprintId === "morning")!
    const before = morning.steps.map((s) => s.id)
    const need = routineNeedsForObjectives(["obj_practice"])[0]
    expect(need.blueprintId).toBe("morning")
    expect(routineNeedState(plan, need)).toBe("partial")

    const once = applyRoutineNeed(plan, need, NOW)
    const after = once.routines.find((r) => r.blueprintId === "morning")!
    expect(before.every((id) => after.steps.some((s) => s.id === id))).toBe(true)
    expect(routineNeedState(once, need)).toBe("met")
    expect(once.routines).toHaveLength(plan.routines.length)

    const twice = applyRoutineNeed(once, need, NOW)
    expect(twice.routines.find((r) => r.blueprintId === "morning")!.steps).toHaveLength(after.steps.length)
  })

  it("puts a whole set back in one call, and leaves everything else alone", () => {
    /**
     * Taking a set is one click and writes five goals. Not wanting it was five
     * confirms on five rows — "i might have clicked mind routine, but dont want
     * it… dont want to declick 8 manually", reported from the page.
     */
    let plan = addGoalsFromTemplate(emptyNsPlan(), "lm_fitness", "tmpl_strength", 1, NOW)
    plan = addGoal(plan, "lm_fitness", "A thing I wrote myself", "achievement", NOW)
    const taken = templatesInArea(plan, "lm_fitness").find((t) => t.template.id === "tmpl_strength")!
    expect(taken.goalIds.length).toBeGreaterThan(1)

    const after = removeTemplateGoals(plan, "lm_fitness", "tmpl_strength", NOW)
    expect(after.goals.map((g) => g.title)).toEqual(["A thing I wrote myself"])
    // And it is idempotent: nothing of that set is left to remove.
    expect(templatesInArea(after, "lm_fitness").some((t) => t.template.id === "tmpl_strength")).toBe(false)
    expect(removeTemplateGoals(after, "lm_fitness", "tmpl_strength", NOW).goals).toHaveLength(1)
  })

  it("takes back the steps the set put in a routine, and a routine only it needed", () => {
    /**
     * The half-undo that made no sense from the page: the goals went and the
     * training week it brought kept running every Tuesday.
     */
    let plan = emptyNsPlan()
    const template = TEMPLATES.find((t) => t.id === "tmpl_strength")!
    plan = addGoalsFromTemplate(plan, "lm_fitness", "tmpl_strength", 1, NOW)
    for (const need of routineNeedsForTemplate(template)) plan = applyRoutineNeed(plan, need, NOW)
    const workout = plan.routines.find((r) => r.blueprintId === "workout")!
    expect(workout.steps.length).toBeGreaterThan(0)

    const after = removeTemplateGoals(plan, "lm_fitness", "tmpl_strength", NOW)
    // The routine was only ever there for this set, so it goes with it.
    expect(after.routines.some((r) => r.blueprintId === "workout")).toBe(false)
    expect(after.goals).toHaveLength(0)
  })

  it("keeps a step another set still needs, and anything the person added", () => {
    const template = TEMPLATES.find((t) => t.id === "tmpl_strength")!
    const need = routineNeedsForTemplate(template)[0]
    // A second set on the same routine, plus a step of the person's own.
    const sharing = TEMPLATES.find(
      (t) => t.id !== template.id && routineNeedsForTemplate(t).some((n) => n.blueprintId === need.blueprintId && n.stepIds.some((id) => need.stepIds.includes(id))),
    )
    let plan = addGoalsFromTemplate(emptyNsPlan(), "lm_fitness", template.id, 1, NOW)
    if (sharing) plan = addGoalsFromTemplate(plan, "lm_fitness", sharing.id, 1, NOW)
    plan = applyRoutineNeed(plan, need, NOW)
    const routineId = plan.routines.find((r) => r.blueprintId === need.blueprintId)!.id
    plan = addCustomStep(plan, routineId, "My own thing", 10, 2, NOW)

    const after = removeTemplateGoals(plan, "lm_fitness", template.id, NOW)
    const routine = after.routines.find((r) => r.id === routineId)
    // Their own step is never collateral, so the routine survives holding it.
    expect(routine).toBeTruthy()
    expect(routine!.steps.some((st) => st.title === "My own thing")).toBe(true)
    if (sharing) {
      // And the other set's goals are untouched.
      expect(templatesInArea(after, "lm_fitness").some((t) => t.template.id === sharing.id)).toBe(true)
    }
  })

  it("keeps a volume driver's number, and does not call it days", () => {
    /**
     * "what does 'approaches x/week' mean? is it times you went out or total
     * approaches a week? those need to be different things." They are: the
     * catalogue offers twenty approaches a week, `daysPerWeek` is days, and the
     * number was being clamped into it — so a driver the person accepted at
     * twenty arrived reading "7× a week".
     */
    const plan = addGoalFromTarget(emptyNsPlan(), "lm_relationship", "t_approaches_gf", undefined, NOW)
    const goal = plan.goals.find((g) => g.title === "Approaches")!
    expect(goal.perWeek).toBe(20)
    expect(goal.unit).toBe("approaches")
    // Days are a separate question, and twenty is not an answer to it.
    expect(goal.daysPerWeek).toBeLessThanOrEqual(7)
    expect(goal.daysPerWeek).not.toBe(goal.perWeek)

    // A driver that really is a frequency keeps the old behaviour: four gym
    // sessions a week IS four days, and there is nothing else to count.
    const gym = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_gym_strong", undefined, NOW).goals[0]
    expect(gym.title).toBe("Gym Sessions")
    expect(gym.perWeek).toBeNull()
    expect(gym.daysPerWeek).toBeGreaterThan(0)
  })

  it("says the same rate everywhere, however it was written", () => {
    /**
     * The sweep after the approaches report: the catalogue path was fixed and
     * the TYPED path was not, so writing "20 approaches a week" still ran
     * through clamp(20, 1, 7) and came back as seven days. And six surfaces
     * printed `${daysPerWeek}× a week` by hand, including the text you sign.
     */
    const typed = addGoalsFromDump(emptyNsPlan(), "lm_relationship", "20 approaches a week", NOW)
    const goal = typed.goals[0]
    expect(goal.type).toBe("habit_ramp")
    expect(goal.perWeek).toBe(20)
    expect(goal.daysPerWeek).toBeLessThanOrEqual(7)
    // One label, and it never calls twenty approaches "20 days".
    expect(goalRateLabel(goal)).toContain("20")
    expect(goalRateLabel(goal)).not.toBe("20× a week")
    // …and the plan you sign says the same thing the row does.
    expect(planAsText(typed, NOW)).toContain(goalRateLabel(goal))

    // A line that really is a frequency is untouched: four times a week is days.
    const gym = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Gym 4 times a week", NOW).goals[0]
    expect(gym.perWeek).toBeNull()
    expect(gym.daysPerWeek).toBe(4)
    expect(goalRateLabel(gym)).toBe("4× a week")
  })

  it("gives one answer for what a routine costs a week", () => {
    /**
     * Three definitions of "sessions" for one routine: the card summed its
     * steps' days, the milestone generator took the max, the preset labels
     * summed again. A number that disagrees with the number beside it is the
     * shape of every bug reported on this page.
     */
    let plan = emptyNsPlan()
    const work = plan.routines.find((r) => r.blueprintId === "work")!
    plan = toggleRoutineStep(plan, work.id, "deep", NOW)
    plan = toggleRoutineStep(plan, work.id, "shutdown", NOW)
    const routine = plan.routines.find((r) => r.id === work.id)!
    const sessions = routineWeeklySessions(routine)
    expect(sessions).toBe(routine.steps.reduce((sum, s) => sum + s.daysPerWeek, 0))
    expect(routineSummary(routine)).toContain(`${sessions} sessions a week`)
  })

  it("counts a routine step as something running, not only a goal", () => {
    /**
     * "where has deep work gone? i dont see it as a driver, even tho ive chosen
     * the business routine" — reported from the focus page, whose driver list
     * was built from `plan.goals`. Ninety minutes of deep work is a step inside
     * a routine, so the list that called itself "what you do on an ordinary
     * week" was showing a fraction of what runs.
     */
    let plan = emptyNsPlan()
    const work = plan.routines.find((r) => r.blueprintId === "work")!
    plan = toggleRoutineStep(plan, work.id, "deep", NOW)
    expect(systemGoals(plan)).toHaveLength(0)
    // The step is what runs, and the weekly bill agrees it costs something.
    const steps = plan.routines.flatMap((r) => r.steps)
    expect(steps.map((s) => s.title)).toContain("Ninety minutes of deep work")
    expect(weeklyLoad(plan).minutes).toBeGreaterThan(0)
  })

  it("only offers to put back what is in that area", () => {
    // A set half-deleted by hand is still a set you can put back, and a set in
    // another area is not this area's to remove.
    let plan = addGoalsFromTemplate(emptyNsPlan(), "lm_fitness", "tmpl_strength", 1, NOW)
    plan = removeGoal(plan, plan.goals[0].id, NOW)
    expect(templatesInArea(plan, "lm_fitness")[0].goalIds).toHaveLength(plan.goals.length)
    expect(templatesInArea(plan, "lm_money")).toEqual([])
  })

  it("finds the need behind a single target, not only behind a whole set", () => {
    expect(routineNeedsForTarget("t_bench")[0].blueprintId).toBe("workout")
    expect(routineNeedsForTarget("nope")).toEqual([])
  })
})

describe("a practice goes straight into a routine", () => {
  it("adds the routine it belongs to when the stack has not got one", () => {
    const plan = emptyNsPlan()
    expect(plan.routines.some((r) => r.blueprintId === "social")).toBe(false)
    const next = addPractice(plan, "social", "family-call", NOW)
    expect(next.routines.some((r) => r.blueprintId === "social")).toBe(true)
    expect(practiceIsOn(next, "social", "family-call")).toBe(true)
  })

  it("leaves the routine behind when the practice is turned off", () => {
    let plan = addPractice(emptyNsPlan(), "social", "family-call", NOW)
    plan = removePractice(plan, "social", "family-call", NOW)
    expect(practiceIsOn(plan, "social", "family-call")).toBe(false)
    // Emptying somebody's stack because they unticked one chip is not our call.
    expect(plan.routines.some((r) => r.blueprintId === "social")).toBe(true)
  })

  it("ignores a step that is not in the blueprint rather than inventing one", () => {
    const plan = emptyNsPlan()
    expect(addPractice(plan, "social", "nope", NOW)).toEqual(plan)
    expect(addPractice(plan, "nope", "family-call", NOW)).toEqual(plan)
  })

  it("does not add the same step twice", () => {
    let plan = addPractice(emptyNsPlan(), "social", "host", NOW)
    const count = plan.routines.find((r) => r.blueprintId === "social")!.steps.length
    plan = addPractice(plan, "social", "host", NOW)
    expect(plan.routines.find((r) => r.blueprintId === "social")!.steps).toHaveLength(count)
  })
})

describe("a library goal arrives with its Tuesday", () => {
  it("gives a bare number goal the action its objective is kept by", () => {
    const plan = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_bench", undefined, NOW)
    const goal = plan.goals[0]
    expect(goal.type).toBe("milestone_ladder")
    expect(goal.habits).toHaveLength(1)
    expect(goal.habits[0].title).toBe(OBJECTIVE_ACTION["obj_strong"].title)
    // Which is the whole point: it no longer reports the gap it created.
    expect(goalNeedsAction(goal)).toBe(false)
  })

  it("leaves a practice and a staged finish line alone", () => {
    // A practice IS its own action, and a staged target already carries steps.
    const ramp = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_gym_strong", undefined, NOW)
    expect(ramp.goals[0].habits).toEqual([])
    const staged = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_lift_form", undefined, NOW)
    expect(staged.goals[0].habits).toEqual([])
  })

  it("brings a whole template in with nothing left flagged for an action", () => {
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_fitness", "tmpl_strength", 1, NOW)
    expect(plan.goals.length).toBeGreaterThan(4)
    expect(nsProgress(plan).goalsNeedingAction).toBe(0)
  })

  it("returns null for an objective with no action written rather than a placeholder", () => {
    // A generic "work on <title>" would silence the amber panel while giving the
    // user nothing to do, which is worse than the gap it hides.
    expect(defaultActionForTarget({ ...TARGETS[0], objectiveId: "obj_nonexistent" })).toBeNull()
  })
})

describe("what the plan costs a week", () => {
  it("counts one shared action once, however many goals name it", () => {
    // One training week moves the bench, the squat and the deadlift. Counting it
    // three times invents a load nobody is carrying.
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_fitness", "tmpl_strength", 1, NOW)
    const titles = new Set(plan.goals.flatMap((g) => g.habits.map((h) => h.title)))
    expect(titles.size).toBe(1)
    expect(weeklyLoad(plan).actions).toBe(OBJECTIVE_ACTION["obj_strong"].daysPerWeek)
  })

  it("counts the routines in minutes, every step at its own frequency", () => {
    // Nothing is preselected any more, so the bill starts at zero and the user
    // is the only reason it ever goes up.
    expect(weeklyLoad(emptyNsPlan()).minutes).toBe(0)

    /**
     * NOT THE WHOLE STACK ONCE PER DAY THE BLOCK RUNS.
     *
     * That was the bug: a morning routine running seven days charged every step
     * seven times, including the ones set to three. A step cannot run on a day
     * the block does not, so the number is the smaller of the two — which is
     * `min(step, routine)` and never `routineMinutes × days`.
     */
    const fresh = emptyNsPlan()
    const plan = applyRoutinePreset(fresh, fresh.routines[0].id, "15", NOW)
    const routine = plan.routines[0]
    const load = weeklyLoad(plan)
    expect(load.minutes).toBe(
      routine.steps.reduce((sum, s) => sum + s.minutes * Math.min(s.daysPerWeek, routine.daysPerWeek), 0),
    )
    // And that is genuinely less than the old arithmetic whenever any step runs
    // less often than the block around it.
    const anyRarer = routine.steps.some((s) => s.daysPerWeek < routine.daysPerWeek)
    if (anyRarer) expect(load.minutes).toBeLessThan(routineMinutes(routine) * routine.daysPerWeek)
    // Accepting one preset must not arrive already over the line, or the
    // warning is noise from the first click and nobody reads it again.
    expect(load.over).toBe(false)
    // Emptying every routine empties the bill.
    const cleared = plan.routines.reduce((p, r) => clearRoutineSteps(p, r.id, NOW), plan)
    expect(weeklyLoad(cleared).minutes).toBe(0)
  })

  it("goes over once the week stops fitting in a week", () => {
    let plan = emptyNsPlan()
    for (let i = 0; i < 40; i += 1) {
      plan = addGoal(plan, "lm_fitness", `Thing ${i}`, "achievement", NOW)
      plan = addAction(plan, plan.goals[plan.goals.length - 1].id, `Action ${i}`, 1, NOW)
    }
    const load = weeklyLoad(plan)
    expect(load.actions).toBeGreaterThan(LOAD_CEILING.actionsPerWeek)
    expect(load.over).toBe(true)
  })
})

describe("the year, as things to hit", () => {
  it("spreads a target's rungs between today and its date, finishing on the date", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Squat", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, {
      unit: "kg",
      ladder: { start: 100, target: 140, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
      targetDate: "2027-08-07",
    }, NOW)
    const rungs = goalMilestones(plan.goals[0], TODAY)
    expect(rungs.map((r) => r.label)).toEqual([
      // The weight, and only the weight. "Squat 140 kg" says nothing about
      // sets or reps, and a page that fills those in has decided something
      // about somebody's training that they did not.
      "Squat: 110 kg", "Squat: 120 kg", "Squat: 130 kg", "Squat: 140 kg",
    ])
    expect(rungs[rungs.length - 1].kind).toBe("finish")
    expect(rungs[rungs.length - 1].date).toBe("2027-08-07")
    expect(rungs.every((r, i) => i === 0 || r.date > rungs[i - 1].date)).toBe(true)
  })

  it("dates a practice's ramp phases by the weeks each one runs for", () => {
    const plan = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_gym_strong", undefined, NOW)
    const phases = goalMilestones(plan.goals[0], TODAY)
    expect(phases.length).toBeGreaterThan(1)
    expect(phases[0].kind).toBe("phase")
    // Eight weeks at the first frequency, so the first phase lands 56 days out.
    expect(daysBetween(TODAY, phases[0].date)).toBe(plan.goals[0].rampSteps![0].durationWeeks * 7)
  })

  it("turns a finish line's checkpoints into rungs and keeps the finish last", () => {
    const plan = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_lift_form", undefined, NOW)
    const rungs = goalMilestones(plan.goals[0], TODAY)
    expect(rungs).toHaveLength(plan.goals[0].checkpoints.length + 1)
    expect(rungs[rungs.length - 1].kind).toBe("finish")
    expect(rungs[rungs.length - 1].date).toBe(plan.goals[0].targetDate)
  })

  it("produces nothing for a goal whose date has been cleared or is in the past", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Squat 140kg", "milestone_ladder", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: null }, NOW)
    expect(goalMilestones(plan.goals[0], TODAY)).toEqual([])
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: "2020-01-01" }, NOW)
    expect(goalMilestones(plan.goals[0], TODAY)).toEqual([])
  })

  it("buckets the milestones into months and keeps every one of them", () => {
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_fitness", "tmpl_strength", 1, NOW)
    const months = planTimeline(plan, TODAY, 12)
    expect(months).toHaveLength(12)
    expect(months[0].key).toBe("2026-08")
    const inBuckets = months.reduce((n, m) => n + m.milestones.length, 0)
    const total = plan.goals.reduce((n, g) => n + goalMilestones(g, TODAY).length, 0)
    // Nothing is silently dropped off the end of the window.
    expect(inBuckets).toBe(total)
    expect(total).toBeGreaterThan(0)
  })

  it("sorts each month by date", () => {
    const plan = addGoalsFromTemplate(emptyNsPlan(), "lm_fitness", "tmpl_strength", 1, NOW)
    for (const month of planTimeline(plan, TODAY, 12)) {
      const dates = month.milestones.map((m) => m.date)
      expect(dates).toEqual([...dates].sort())
    }
  })
})

describe("the cascade, counted", () => {
  it("counts every level of the chain", () => {
    let plan = setNorthStar(emptyNsPlan(), "The life", NOW)
    plan = setAreaReview(plan, "lm_fitness", { ten: "Strong" }, NOW)
    plan = addGoalsFromTemplate(plan, "lm_fitness", "tmpl_strength", 1, NOW)
    const cascade = planCascade(plan, TODAY)
    expect(cascade.starWritten).toBe(true)
    expect(cascade.areas).toBe(plan.areas.length)
    expect(cascade.areasWithTen).toBe(1)
    expect(cascade.goals).toBe(plan.goals.length)
    expect(cascade.milestones).toBeGreaterThan(cascade.goals)
    expect(cascade.actions).toBe(weeklyLoad(plan).actions)
    expect(cascade.routines).toBe(plan.routines.length)
  })

  it("reads as empty on an untouched plan", () => {
    const cascade = planCascade(emptyNsPlan(), TODAY)
    expect(cascade.starWritten).toBe(false)
    expect(cascade.goals).toBe(0)
    expect(cascade.milestones).toBe(0)
    expect(cascade.actions).toBe(0)
  })

  it("survives a round trip after a board build", () => {
    let plan = addGoalsFromTemplate(emptyNsPlan(), "lm_fitness", "tmpl_strength", 1, NOW)
    plan = applyRoutineNeed(plan, routineNeedsForObjectives(["obj_strong"])[0], NOW)
    plan = addPractice(plan, "social", "family-call", NOW)
    expect(loadNsPlan(serializeNsPlan(plan))).toEqual(plan)
  })
})

describe("a goal picked on its own still asks for its routine", () => {
  it("names the routine the goals in an area are missing", () => {
    // A goal set offers its routine on the card. A chip never passed a card, so
    // the goal lands carrying "Strength session, 4×/wk" and nowhere to do it.
    const plan = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_bench", undefined, NOW)
    const unmet = unmetRoutineNeeds(plan, "lm_fitness")
    expect(unmet.map((n) => n.blueprintId)).toEqual(["workout"])
    expect(unmetRoutineNeeds(plan, "lm_money")).toEqual([])
  })

  it("goes quiet once the routine is in the stack", () => {
    let plan = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_bench", undefined, NOW)
    plan = applyRoutineNeed(plan, unmetRoutineNeeds(plan, "lm_fitness")[0], NOW)
    expect(unmetRoutineNeeds(plan, "lm_fitness")).toEqual([])
  })

  it("asks for nothing on a goal the user wrote themselves", () => {
    // Matched back to the catalogue by title, the same way the forward check
    // matches. Guessing a routine for "Learn to sail" would be worse than none.
    const plan = addGoal(emptyNsPlan(), "lm_fitness", "Learn to sail", "achievement", NOW)
    expect(unmetRoutineNeeds(plan, "lm_fitness")).toEqual([])
  })
})

describe("no area is offered another area's catalogue", () => {
  it("matches a goal set on the objective it is named after, not on any it touches", () => {
    // "Find The One" also switches on Build Inner Game, which lives in Mind &
    // Beliefs, so matching on any overlap put the dating sets inside Mind.
    const mind = areaTemplates(areaOf("lm_mindset")).map((t) => t.id)
    expect(mind).not.toContain("tmpl_girlfriend")
    expect(mind).not.toContain("tmpl_abundance")
    expect(mind).toContain("tmpl_inner_only")
    expect(areaTemplates(areaOf("lm_relationship")).map((t) => t.id)).toContain("tmpl_girlfriend")
  })

  it("never offers one goal set in more areas than it belongs to", () => {
    // Some overlap is honest — income sits in both Money and Mission — but a
    // set turning up in four areas means the assignment has gone wrong again.
    const areas = emptyNsPlan().areas
    for (const template of TEMPLATES) {
      const homes = areas.filter((a) => areaTemplates(a).some((t) => t.id === template.id))
      expect(homes.length, `${template.id} is offered in ${homes.map((a) => a.id).join(", ")}`).toBeLessThanOrEqual(2)
    }
  })
})

// ---------------------------------------------------------------------------
// The guide. Fixtures are a real list, in the shape people actually write in:
// numbered, mixed languages, some with numbers, some not, some out of their
// hands entirely.
// ---------------------------------------------------------------------------

import {
  addControllableGoal,
  addGoalsFromDump,
  guideProgress,
  guideQueue,
  guideQuestionApplies,
  markAsked,
  nextGuideQuestion,
  climbPace,
  parseGoalDump,
  risingNumbers,
  seasonAreas,
  shapeFromTitle,
  setLadderStart,
  suggestedActions,
  toggleSeasonArea,
} from "@/src/goals/northStarService"

const REAL_LIST = `	1. Ingen smerte i ryggen, hoften, skulderen
	2. Bænk 28 kg, 3x6-8
	3. 10 pullups, fra 7
	4. 1 Muscle Up
- Stræk ud hver dag
• Træn 5x om ugen`

describe("goals arrive in the user's own words", () => {
  it("strips the furniture off a list pasted out of a notes app", () => {
    expect(parseGoalDump(REAL_LIST)).toEqual([
      "Ingen smerte i ryggen, hoften, skulderen",
      "Bænk 28 kg, 3x6-8",
      "10 pullups, fra 7",
      "1 Muscle Up",
      "Stræk ud hver dag",
      "Træn 5x om ugen",
    ])
    // Sub-numbering ("12a.") is furniture too, and blank lines are not goals.
    expect(parseGoalDump("12a. Lav goals færdig\n\n\n  \n12b. Lav xx")).toEqual(["Lav goals færdig", "Lav xx"])
    expect(parseGoalDump("   ")).toEqual([])
  })

  it("drops a line repeated in the same paste", () => {
    expect(parseGoalDump("Publish my book\npublish my book")).toEqual(["Publish my book"])
  })

  it("reads the shape out of the sentence", () => {
    const plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", REAL_LIST, NOW)
    const byTitle = (t: string) => plan.goals.find((g) => g.title === t)!
    // "Bænk 28 kg, 3x6-8" is a target of 28, not a target of 3.
    expect(byTitle("Bænk 28 kg, 3x6-8")).toMatchObject({ type: "milestone_ladder", unit: "kg" })
    expect(byTitle("Bænk 28 kg, 3x6-8").ladder).toMatchObject({ target: 28 })
    // A state rather than a number. A finish line is the honest default.
    expect(byTitle("Ingen smerte i ryggen, hoften, skulderen").type).toBe("achievement")
    // A climb to one is not a climb.
    expect(byTitle("1 Muscle Up").type).toBe("achievement")
    // Frequencies are practices, in either language.
    expect(byTitle("Træn 5x om ugen")).toMatchObject({ type: "habit_ramp", daysPerWeek: 5 })
    expect(byTitle("Stræk ud hver dag")).toMatchObject({ type: "habit_ramp", daysPerWeek: 7 })
    expect(plan.goals).toHaveLength(6)
  })

  it("takes the starting point when the line already said it", () => {
    // "10 pullups, fra 7" answers "where are you today" in its own text, so
    // asking it again is the app not having read what it was given.
    const plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "10 pullups, fra 7", NOW)
    expect(plan.goals[0].ladder).toMatchObject({ start: 7, target: 10 })
    // Whole pull-ups, because nobody has done eight tenths of one: a climb
    // shorter than its rung count gets one rung per whole number.
    expect(milestoneCheckpoints(plan.goals[0]).map((c) => c.title)).toEqual([
      "8 pullups", "9 pullups", "10 pullups",
    ])
    expect(nextGuideQuestion(plan.goals[0])).toBe("actions")
    // English too.
    expect(addGoalsFromDump(emptyNsPlan(), "lm_fitness", "20 pull-ups, up from 12", NOW).goals[0].ladder)
      .toMatchObject({ start: 12, target: 20 })
    // A "from" bigger than the target is something else in the sentence.
    expect(addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Squat 100 kg from 120 kg", NOW).goals[0].ladder)
      .toMatchObject({ start: 0 })
  })

  it("builds a ramp when one line names several frequencies", () => {
    // "Udgiv 1 youtube video om ugen, 2 om ugen, 3 om ugen" is somebody writing
    // a habit ramp by hand.
    const plan = addGoalsFromDump(emptyNsPlan(), "lm_mission", "Udgiv 1 youtube video om ugen, 2 om ugen, 3 om ugen", NOW)
    expect(plan.goals[0].type).toBe("habit_ramp")
    expect(plan.goals[0].rampSteps?.map((r) => r.frequencyPerWeek)).toEqual([1, 2, 3])
    expect(plan.goals[0].daysPerWeek).toBe(3)
  })

  it("does not read a set-and-rep count as a frequency", () => {
    // "3x6-8" is three sets of six to eight, and it is on almost every lifting
    // goal ever written.
    expect(shapeFromTitle("Bænk 28 kg, 3x6-8").type).toBe("milestone_ladder")
    expect(shapeFromTitle("Skullcrushers, 30 kg, 2x8-10").type).toBe("milestone_ladder")
  })

  it("leaves the rungs ungenerated until it knows where you are", () => {
    // Spacing a climb from a start nobody confirmed produces a ladder that
    // reads as authoritative and is made up.
    const plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg", NOW)
    expect(plan.goals[0].ladder).toMatchObject({ start: 0, target: 28 })
    expect(plan.goals[0].checkpoints).toEqual([])
    expect(nextGuideQuestion(plan.goals[0])).toBe("start")
  })

  it("files a thing you buy as a finish line, not a climb to its model number", () => {
    // The whole trip through the page, because parsing it right and then
    // building a ladder out of it anyway is the bug the user actually saw.
    // "buy a Ferrari 458" is one of WANT_EXAMPLES, so it is the offer somebody
    // is most likely to click.
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_money", "buy a ferarri 458", NOW)
    expect(plan.goals[0].type).toBe("achievement")
    expect(plan.goals[0].ladder).toBeNull()
    // And the rungs under a real climb say what is being lifted.
    plan = addGoalsFromDump(plan, "lm_fitness", "get 28 kg bench 3 sets 8 reps by april", NOW)
    const bench = plan.goals[1]
    expect(bench.ladder).toMatchObject({ start: 0, target: 28 })
    plan = setLadderStart(plan, bench.id, 22, NOW)
    expect(milestoneCheckpoints(plan.goals[1]).map((c) => c.title)).toEqual([
      "bench 22.5 kg",
      "bench 25 kg",
      "bench 27.5 kg",
      "bench 28 kg",
    ])
  })
})

describe("the guide asks one thing at a time", () => {
  it("asks in order and never asks what the goal already has", () => {
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg", NOW)
    const id = plan.goals[0].id
    // A climb: where you are, then what you will do, then when, then the whys.
    expect(nextGuideQuestion(plan.goals[0])).toBe("start")
    plan = setLadderStart(plan, id, 22, NOW)
    expect(nextGuideQuestion(plan.goals[0])).toBe("actions")
    plan = markAsked(addAction(plan, id, "Strength session", 4, NOW), id, "actions", NOW)
    expect(nextGuideQuestion(plan.goals[0])).toBe("date")
    plan = markAsked(plan, id, "date", NOW)
    expect(nextGuideQuestion(plan.goals[0])).toBe("why")
    plan = updateGoal(plan, id, { why: "Because I want to be strong" }, NOW)
    expect(nextGuideQuestion(plan.goals[0])).toBe("cost")
    plan = updateGoal(plan, id, { painWhy: "I stay weak" }, NOW)
    expect(nextGuideQuestion(plan.goals[0])).toBeNull()
  })

  it("remembers a skip, so the queue moves on instead of coming back round", () => {
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg", NOW)
    const id = plan.goals[0].id
    plan = markAsked(plan, id, "start", NOW)
    expect(nextGuideQuestion(plan.goals[0])).not.toBe("start")
    // Twice is still once.
    expect(markAsked(plan, id, "start", NOW).goals[0].asked).toEqual(["start"])
  })

  it("never asks a practice what it will do about itself", () => {
    // The same rule the amber panel uses: a practice IS the action.
    let plan = addGoalFromTarget(emptyNsPlan(), "lm_fitness", "t_gym_strong", undefined, NOW)
    expect(guideQuestionApplies(plan.goals[0], "actions")).toBe(false)
    // And only a finish line gets asked whether it is in the user's hands: a
    // number you climb to is already something you do.
    expect(guideQuestionApplies(plan.goals[0], "control")).toBe(false)
    plan = addGoal(plan, "lm_mission", "Internationally bestselling author", "achievement", NOW)
    expect(guideQuestionApplies(plan.goals[1], "control")).toBe(true)
  })

  it("puts the season's areas at the front of the queue", () => {
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_money", "Save 10000", NOW)
    plan = addGoalsFromDump(plan, "lm_fitness", "Bænk 28 kg", NOW)
    plan = toggleSeasonArea(plan, "lm_fitness", NOW)
    expect(guideQueue(plan, plan.seasonAreaIds)[0].goal.areaId).toBe("lm_fitness")
  })

  it("counts a goal ready only when nothing is left to ask", () => {
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg\nStræk ud hver dag", NOW)
    expect(guideProgress(plan)).toMatchObject({ ready: 0, total: 2 })
    for (const goal of plan.goals) {
      for (const q of ["control", "start", "actions", "date", "why", "cost"] as const) {
        plan = markAsked(plan, goal.id, q, NOW)
      }
    }
    expect(guideProgress(plan)).toMatchObject({ ready: 2, total: 2 })
    expect(guideQueue(plan)).toEqual([])
  })
})

describe("where you are today", () => {
  it("sets the bottom of the climb and spaces the rungs in one move", () => {
    // A start with no rungs is a number nobody asked for.
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg", NOW)
    plan = setLadderStart(plan, plan.goals[0].id, 22, NOW)
    const goal = plan.goals[0]
    expect(goal.ladder).toMatchObject({ start: 22, target: 28 })
    // Whole numbers, because a 1.5 kg rung is not a plate anybody owns.
    // `milestoneValues` only goes to one decimal when rounding would collapse
    // two rungs into one.
    expect(milestoneCheckpoints(goal).map((c) => c.title)).toEqual([
      "Bænk 22.5 kg", "Bænk 25 kg", "Bænk 27.5 kg", "Bænk 28 kg",
    ])
    expect(goal.asked).toContain("start")
  })

  it("works downhill, because losing weight is the same climb in reverse", () => {
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_health", "Ned til 80 kg", NOW)
    plan = setLadderStart(plan, plan.goals[0].id, 90, NOW)
    expect(milestoneCheckpoints(plan.goals[0]).map((c) => c.title)).toEqual([
      "Ned til 87.5 kg", "Ned til 85 kg", "Ned til 82.5 kg", "Ned til 80 kg",
    ])
  })
})

describe("a goal other people decide", () => {
  it("keeps the big one and puts what you control underneath it", () => {
    // "Internationally bestselling author" is not wrong to want and is not
    // something you can schedule. It stays, as the thing the real goal feeds.
    let plan = addGoal(emptyNsPlan(), "lm_mission", "Internationalt bedstsælgende forfatter", "achievement", NOW)
    const big = plan.goals[0].id
    plan = addControllableGoal(plan, big, "Udgiv en artikel om ugen", NOW)
    expect(plan.goals).toHaveLength(2)
    const made = plan.goals[1]
    expect(made.title).toBe("Udgiv en artikel om ugen")
    expect(made.areaId).toBe("lm_mission")
    expect(made.feedsGoalIds).toEqual([big])
    expect(subGoalsOf(plan, big).map((g) => g.id)).toEqual([made.id])
  })

  it("shapes the controllable goal from its own words too", () => {
    let plan = addGoal(emptyNsPlan(), "lm_mission", "Bestselling author", "achievement", NOW)
    plan = addControllableGoal(plan, plan.goals[0].id, "Få 100 subscribers", NOW)
    expect(plan.goals[1].type).toBe("milestone_ladder")
    expect(plan.goals[1].ladder).toMatchObject({ target: 100 })
  })

  it("ignores an empty answer or an unknown goal rather than making a stray goal", () => {
    const plan = addGoal(emptyNsPlan(), "lm_mission", "Bestselling author", "achievement", NOW)
    expect(addControllableGoal(plan, plan.goals[0].id, "   ", NOW)).toEqual(plan)
    expect(addControllableGoal(plan, "nope", "Something", NOW)).toEqual(plan)
  })
})

describe("what will you actually do about it", () => {
  it("offers what already runs in that area, when it has anything to do with the goal", () => {
    // Lexical, so it matches the language the step library is written in.
    const plan = addGoalsFromDump(emptyNsPlan(), "lm_health", "Stretch every day", NOW)
    const suggestions = suggestedActions(plan, plan.goals[0]).map((s) => s.title)
    expect(suggestions.some((s) => /stræk|stretch|mobility/i.test(s))).toBe(true)
    expect(new Set(suggestions).size).toBe(suggestions.length)
  })

  it("offers nothing rather than something unrelated", () => {
    // "Big glass of water" came up under a bench press goal, because both live
    // in the same area and that used to be the whole test. Sharing an area is
    // not a reason to believe one gets you the other, and a suggestion that
    // obviously does not fit reads as a system that did not read the goal.
    // An empty row is fine here: the write-your-own box is right underneath it.
    const plan = addGoal(emptyNsPlan(), "lm_health", "Flat bench 100 kg", "milestone_ladder", NOW)
    const suggestions = suggestedActions(plan, plan.goals[0]).map((s) => s.title)
    expect(suggestions.some((s) => /vand|water|glas/i.test(s))).toBe(false)
  })

  it("leads with the catalogue's own action when the goal came from there", () => {
    const plan = addGoal(emptyNsPlan(), "lm_fitness", "Bench Press 1RM", "milestone_ladder", NOW)
    expect(suggestedActions(plan, plan.goals[0])[0].title).toBe(OBJECTIVE_ACTION["obj_strong"].title)
  })
})

describe("the season is a few areas, in order", () => {
  it("keeps the order they were picked in and lets one go", () => {
    let plan = toggleSeasonArea(emptyNsPlan(), "lm_money", NOW)
    plan = toggleSeasonArea(plan, "lm_fitness", NOW)
    expect(seasonAreas(plan).map((a) => a.label)).toEqual(["Money", "Fitness"])
    plan = toggleSeasonArea(plan, "lm_money", NOW)
    expect(seasonAreas(plan).map((a) => a.label)).toEqual(["Fitness"])
    expect(toggleSeasonArea(plan, "nope", NOW)).toEqual(plan)
  })

  it("drops the one thing when its area is dropped", () => {
    // A focus pointing at an area the user has just said they are not doing
    // this season is a banner arguing with the page under it.
    let plan = toggleSeasonArea(emptyNsPlan(), "lm_fitness", NOW)
    plan = setSeasonFocus(plan, "lm_fitness", NOW)
    plan = toggleSeasonArea(plan, "lm_fitness", NOW)
    expect(plan.seasonFocusId).toBeNull()
  })

  it("survives a round trip with the guide's state on it", () => {
    let plan = toggleSeasonArea(emptyNsPlan(), "lm_fitness", NOW)
    plan = addGoalsFromDump(plan, "lm_fitness", REAL_LIST, NOW)
    plan = setLadderStart(plan, plan.goals[1].id, 22, NOW)
    plan = markAsked(plan, plan.goals[0].id, "control", NOW)
    expect(loadNsPlan(serializeNsPlan(plan))).toEqual(plan)
  })
})

describe("a generated rung is not an action", () => {
  it("still asks what you will do after the climb has been spaced", () => {
    // Answering "where are you today" writes four checkpoints. Counting those
    // as tasks meant the goal came out of the guide with a full ladder and
    // nothing to do on a Tuesday.
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg", NOW)
    plan = setLadderStart(plan, plan.goals[0].id, 22, NOW)
    expect(milestoneCheckpoints(plan.goals[0])).toHaveLength(4)
    expect(goalNeedsAction(plan.goals[0])).toBe(true)
    expect(nextGuideQuestion(plan.goals[0])).toBe("actions")
  })

  it("still counts a hand-written checkpoint as the doing", () => {
    // "Nail the movement pattern" is a thing you go and do. The distinction is
    // who wrote it, which is exactly what the id prefix records.
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "First muscle-up", "achievement", NOW)
    plan = addCheckpoint(plan, plan.goals[0].id, "Nail the movement pattern", NOW)
    expect(goalNeedsAction(plan.goals[0])).toBe(false)
  })
})

describe("the guide leads with the useful question", () => {
  it("asks a state goal what you will do, not whether it is yours", () => {
    // "No pain in my back" is obviously theirs to decide. Opening on "is this
    // one yours?" makes the guide look stupid at the moment it has to look
    // useful, and the actionability question is the whole reason it exists.
    const plan = addGoalsFromDump(emptyNsPlan(), "lm_health", "Ingen smerte i ryggen", NOW)
    expect(nextGuideQuestion(plan.goals[0])).toBe("actions")
  })

  it("still gets to control once there is nothing to do about it", () => {
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_mission", "Internationalt bedstsælgende forfatter", NOW)
    plan = markAsked(plan, plan.goals[0].id, "actions", NOW)
    expect(nextGuideQuestion(plan.goals[0])).toBe("control")
  })

  it("keeps a unit written in any alphabet", () => {
    // "10 læser" was read as ten l, because the unit pattern was a-z only.
    expect(parseGoalTarget("Udgiv en artikel som 10 læser")).toMatchObject({ value: 10, unit: "læser" })
    expect(parseGoalTarget("Squat 140 kg")).toMatchObject({ value: 140, unit: "kg" })
    expect(parseGoalTarget("Lose 12% body fat")).toMatchObject({ value: 12, unit: "%" })
  })
})

describe("the queue goes round the list, not down one goal", () => {
  it("moves to the next goal after an answer instead of asking the same one five times", () => {
    // Taking one goal all the way through means the first thing on the list is
    // asked five questions before the second is looked at once — and the first
    // question about your fourth goal matters more than the fifth about your
    // first.
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Ingen smerte i ryggen\nUdgiv min bog\n1 Muscle Up", NOW)
    const first = guideQueue(plan)[0].goal.id
    plan = markAsked(plan, first, "actions", NOW)
    expect(guideQueue(plan)[0].goal.id).not.toBe(first)
    // And it comes back round once everything else has had its turn.
    plan = markAsked(plan, guideQueue(plan)[0].goal.id, "actions", NOW)
    plan = markAsked(plan, guideQueue(plan)[0].goal.id, "actions", NOW)
    expect(guideQueue(plan)[0].goal.id).toBe(first)
  })

  it("counts progress in questions, so the bar moves on every answer", () => {
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Ingen smerte i ryggen\nUdgiv min bog", NOW)
    const before = guideProgress(plan)
    expect(before.answered).toBe(0)
    expect(before.questions).toBeGreaterThan(4)
    plan = markAsked(plan, plan.goals[0].id, "actions", NOW)
    const after = guideProgress(plan)
    expect(after.answered).toBe(1)
    // No goal is finished yet, which is exactly why the bar cannot count those.
    expect(after.ready).toBe(0)
  })
})

describe("is that realistic", () => {
  it("says what the climb works out at per month", () => {
    // The user asked whether 28 kg is realistic and the page had the start, the
    // target and the date sitting there saying nothing.
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: "2027-08-07" }, NOW)
    plan = setLadderStart(plan, plan.goals[0].id, 22, NOW)
    const pace = climbPace(plan.goals[0], TODAY)!
    expect(Math.round(pace.months)).toBe(12)
    expect(Math.round(pace.perMonth * 100) / 100).toBe(0.5)
    expect(pace.verdict).toBe("steady")
  })

  it("names the three cases it can actually judge", () => {
    const dated = (title: string, start: number, date: string) => {
      let p = addGoalsFromDump(emptyNsPlan(), "lm_fitness", title, NOW)
      p = updateGoal(p, p.goals[0].id, { targetDate: date }, NOW)
      p = setLadderStart(p, p.goals[0].id, start, NOW)
      return climbPace(p.goals[0], TODAY)!
    }
    // "Already past it" is deliberately NOT judged: a start of 30 against a
    // target of 28 is either somebody who can already bench it or somebody
    // getting down to it, and the numbers do not say which. Only the case with
    // no distance in it at all gets a verdict.
    expect(dated("Bænk 28 kg", 28, "2027-08-07").verdict).toBe("done")
    // A year to move 1 kg off 100: the date is doing no work.
    expect(dated("Squat 101 kg", 100, "2027-08-07").verdict).toBe("slow")
    // A quarter of where you are, every month.
    expect(dated("Squat 200 kg", 50, "2027-08-07").verdict).toBe("steep")
  })

  it("has no opinion when there is nothing to have one about", () => {
    // No date, no practice, no finish line — no arithmetic, and no invented view.
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: null }, NOW)
    expect(climbPace(plan.goals[0], TODAY)).toBeNull()
    const practice = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Træn 5x om ugen", NOW)
    expect(climbPace(practice.goals[0], TODAY)).toBeNull()
  })
})

describe("a milestone that keeps going up", () => {
  it("reads the whole run of numbers as one climb", () => {
    // "Få 10 downloads på en onepager, få 100 downloads etc" is a ladder, and
    // reading the first number finishes the whole thing at ten.
    const plan = addGoalsFromDump(emptyNsPlan(), "lm_mission", "Få 10 downloads, 100 downloads, 1000 downloads", NOW)
    expect(plan.goals[0].ladder).toMatchObject({ start: 10, target: 1000 })
    expect(risingNumbers("Få 100 subscribers, 1000, 10000")).toEqual([100, 1000, 10000])
  })

  it("does not mistake sets and reps, or a date, for a rising run", () => {
    // Each number has to be a real step up, so "3x6-8" and "28 kg, 3x6-8" stay
    // exactly what they were.
    expect(risingNumbers("Bænk 28 kg, 3x6-8")).toEqual([])
    expect(risingNumbers("10 pullups, fra 7")).toEqual([])
    expect(risingNumbers("Squat 100 kg by 2027")).toEqual([])
  })
})

describe("skipped is not finished", () => {
  it("does not call a goal ready when every question was skipped", () => {
    // The guide can be done with a goal and the goal still have no action, no
    // why and no date anybody chose. `ready` counts goals the guide has nothing
    // left to ask about — the copy says "been through" for exactly that reason,
    // and `planTodos` is what still reports the holes.
    let plan = addGoalsFromDump(emptyNsPlan(), "lm_fitness", "Bænk 28 kg", NOW)
    for (const q of ["start", "actions", "control", "date", "why", "cost"] as const) {
      plan = markAsked(plan, plan.goals[0].id, q, NOW)
    }
    expect(guideProgress(plan).ready).toBe(1)
    expect(guideQueue(plan)).toEqual([])
    // And the page still says what is missing.
    const todos = planTodos(plan, TODAY).map((t) => t.id)
    expect(todos).toContain("goalwhy")
    expect(todos).toContain("goalaction")
  })
})

// --------------------------------------------------------- where a plan starts

describe("starting from the 10 you already wrote", () => {
  it("cuts the paragraph into pieces and drops what is already a goal", () => {
    let plan = setAreaReview(emptyNsPlan(), "lm_fitness", {
      ten: "I bench 28 kg for reps. No pain in my back.\nI train four times a week; I look forward to it.",
    }, NOW)
    /**
     * Only the clauses that name something you could go and do.
     *
     * This offered every clause, so a Relationship 10 came back as "I have
     * crazy confidence in myself because I genuinely know and appreciate how
     * awesome I am" with a tickbox beside it. A 10 is a picture — the question
     * asks for one — and cutting a picture up gives you smaller pictures.
     * "I look forward to it" is how it feels when it is working, not a goal.
     */
    expect(tenCandidates(plan, "lm_fitness")).toEqual([
      "I bench 28 kg for reps",
      "No pain in my back",
      "I train four times a week",
    ])
    // A door walked through twice should not hand you the same thing again.
    plan = addGoalsFromDump(plan, "lm_fitness", "No pain in my back", NOW)
    expect(tenCandidates(plan, "lm_fitness")).not.toContain("No pain in my back")
  })

  it("keeps the fragments and the states out", () => {
    // "Yes." and "and calm" are never goals. Neither is "I wake up rested" —
    // it is the picture, which is what the 10 was asked for. An emotions 10 of
    // pure feeling correctly yields nothing, and the door says so and offers
    // the button that turns a picture into things to do instead.
    const plan = setAreaReview(emptyNsPlan(), "lm_emotions", { ten: "Yes. Calm. I wake up rested and unhurried." }, NOW)
    expect(tenCandidates(plan, "lm_emotions")).toEqual([])
  })

  it("says nothing when nothing was pictured", () => {
    expect(tenCandidates(emptyNsPlan(), "lm_health")).toEqual([])
  })
})

describe("a day, written out", () => {
  it("reads the times and leaves the numbers alone", () => {
    const lines = parseIdealDay([
      "06:30 Up, no phone",
      "7am Gym",
      "kl. 8.30 - 09:00 Morgenmad",
      "12.00: Walk outside",
      "10 pull-ups",
      "- Read ten pages",
    ].join("\n"))
    expect(lines).toEqual([
      { startMin: 390, title: "Up, no phone" },
      { startMin: 420, title: "Gym" },
      { startMin: 510, title: "Morgenmad" },
      { startMin: 720, title: "Walk outside" },
      // THE ONE THAT MATTERS: a bare number is not a clock face. Reading the 10
      // as ten o'clock turns the best line on the page into "pull-ups".
      { startMin: null, title: "10 pull-ups" },
      { startMin: null, title: "Read ten pages" },
    ])
  })

  it("takes the length from the gap to the next timed line, within reason", () => {
    const lines = parseIdealDay("07:00 Gym\n08:30 Breakfast\n09:00 Deep work\n17:00 Dinner")
    expect(idealDayMinutes(lines, 0)).toBe(90)
    expect(idealDayMinutes(lines, 1)).toBe(30)
    // 09:00 to 17:00 is not an eight-hour block of anything anybody meant.
    expect(idealDayMinutes(lines, 2)).toBe(90)
    // The last line has nothing after it, and an untimed line has no gap at all.
    expect(idealDayMinutes(lines, 3)).toBe(30)
    expect(idealDayMinutes(parseIdealDay("Stretch"), 0)).toBe(15)
  })

  it("guesses an area from the words, and says nothing rather than guessing wrong", () => {
    const index = areaKeywordIndex(emptyNsPlan().areas)
    expect(guessAreaId(index, "Gym")).toBe("lm_fitness")
    expect(guessAreaId(index, "Træn ben")).toBe("lm_fitness")
    expect(guessAreaId(index, "Two hours of deep work, no notifications")).toBe("lm_mission")
    expect(guessAreaId(index, "Ring til mor")).toBe("lm_family")
    // Nothing in the table and nothing in any area's name: the row asks.
    expect(guessAreaId(index, "Potter about")).toBeNull()
  })

  it("puts the tracked lines in the routine that owns that hour, all seven days", () => {
    const plan = addIdealDay(emptyNsPlan(), [
      { title: "Big glass of water", startMin: 6 * 60 + 30, minutes: 5, areaId: "lm_health", destination: "track" },
      { title: "Deep work", startMin: 9 * 60, minutes: 90, areaId: "lm_mission", destination: "track" },
      { title: "Read ten pages", startMin: 21 * 60, minutes: 20, areaId: "lm_mindset", destination: "track" },
      { title: "Bench 28 kg", startMin: null, minutes: 30, areaId: "lm_fitness", destination: "goal" },
    ], NOW)

    const placed = (blueprintId: string) =>
      plan.routines.find((r) => r.blueprintId === blueprintId)!.steps.filter((s) => s.startMin != null)
    expect(placed("morning").map((s) => s.title)).toEqual(["Big glass of water"])
    expect(placed("work").map((s) => s.title)).toEqual(["Deep work"])
    expect(placed("night").map((s) => s.title)).toEqual(["Read ten pages"])
    expect(placed("morning")[0].days).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(placed("morning")[0].daysPerWeek).toBe(7)

    // The goal line went through the same shaping as anything typed into the box.
    expect(plan.goals).toHaveLength(1)
    expect(plan.goals[0]).toMatchObject({ areaId: "lm_fitness", type: "milestone_ladder" })
  })

  it("refuses a line with no area rather than filing it somewhere", () => {
    const plan = addIdealDay(emptyNsPlan(), [
      { title: "Potter about", startMin: 600, minutes: 30, areaId: "", destination: "track" },
    ], NOW)
    expect(weekBlocks(plan)).toEqual([])
    expect(plan.goals).toEqual([])
  })
})

/**
 * NOTHING IS OFFERED FOR THE ONE THING, AND THAT IS THE TEST.
 *
 * Two describes lived here: one pinning that a state ("I wake up happy and
 * excited to start the day") is never offered as somebody's most important
 * thing, and one pinning the deleted `recurringBlockers`, which counted words
 * across the "what is in the way" notes and offered "dont".
 *
 * Both were guards on a list of suggestions under the question. The list is
 * gone — a row of plausible answers is a nudge to pick instead of to think —
 * and so is `oneThingCandidates`. What remains is the box, which cannot offer
 * anybody anything.
 *
 * `readsAsActionable` survives with a different job: keeping the clauses of a
 * 10 from being offered as goals, which is a real list somebody still meets.
 * Its cases moved into the describe below.
 */
describe("a state is not something you can do", () => {
  it("knows the difference, wherever the sentence is used", () => {
    expect(readsAsActionable("I wake up happy and excited to start the day")).toBe(false)
    expect(readsAsActionable("I feel calm most days")).toBe(false)
    expect(readsAsActionable("Jeg vågner uden alarm")).toBe(false)
    expect(readsAsActionable("Life feels light again")).toBe(false)
    expect(readsAsActionable("Be happier")).toBe(false)
    // A number is a target, whoever wrote it and however they phrased it.
    expect(readsAsActionable("I bench 28 kg for reps")).toBe(true)
    expect(readsAsActionable("Train four times a week")).toBe(true)
    expect(readsAsActionable("Publish the book")).toBe(true)
  })
})

describe("clearing the goals without clearing the thinking", () => {
  it("keeps everything upstream of the goals", () => {
    // "Start over" is the right tool exactly once. This is the common case: the
    // goals are wrong, or a set was accepted that should not have been, and the
    // 10s and the values took an hour and are still true.
    let plan = setNorthStar(emptyNsPlan(), "I wake up near the water", NOW)
    plan = setValues(plan, ["Freedom", "Health"], NOW)
    plan = setAreaReview(plan, "lm_fitness", { ten: "Strong and light", fortnight: 4 }, NOW)
    plan = toggleSeasonArea(plan, "lm_fitness", NOW)
    plan = addGoalsFromDump(plan, "lm_fitness", "Bænk 28 kg", NOW)
    plan = setSeasonFocus(plan, plan.goals[0].id, NOW)
    plan = setAnswer(plan, ONE_THING_KEY, "Get my back right", NOW)
    plan = addExperiences(plan, "Learn to surf", null, NOW)
    plan = promoteExperience(plan, plan.experiences[0].id, "lm_fun", NOW)
    plan = applyRoutinePreset(plan, plan.routines[0].id, "15", NOW)

    const after = resetGoalsAndFocus(plan, NOW)

    // Gone: everything downstream of a decision.
    expect(after.goals).toEqual([])
    expect(after.priorityIds).toEqual([])
    expect(after.seasonAreaIds).toEqual([])
    expect(after.seasonFocusId).toBeNull()
    expect(answerOf(after, ONE_THING_KEY)).toBe("")

    // Kept: everything that took an hour to write.
    expect(after.northStar).toBe("I wake up near the water")
    expect(after.values).toEqual(["Freedom", "Health"])
    expect(areaReview(after, "lm_fitness")).toMatchObject({ ten: "Strong and light", fortnight: 4 })
    expect(after.routines[0].steps.length).toBeGreaterThan(0)
    // The bucket list survives, minus a pointer at a goal that no longer exists.
    expect(after.experiences).toHaveLength(1)
    expect(after.experiences[0].goalId).toBeNull()
  })
})

describe("things to experience", () => {
  it("takes a brain dump without shaping any of it", () => {
    // The goal box would read "3 countries" as a climb with rungs. Here it is a
    // line on a list, and that is the whole difference between the two.
    const plan = addExperiences(emptyNsPlan(), "See the northern lights\n- Learn to surf\n1. 3 countries this year", null, NOW)
    expect(plan.experiences.map((e) => e.title)).toEqual([
      "See the northern lights",
      "Learn to surf",
      "3 countries this year",
    ])
    expect(plan.experiences.every((e) => !e.done && e.doneOn === null && e.goalId === null)).toBe(true)
    expect(plan.goals).toEqual([])
  })

  it("does not add the same thing twice", () => {
    let plan = addExperiences(emptyNsPlan(), "Learn to surf", null, NOW)
    plan = addExperiences(plan, "learn to surf\nSee the aurora", null, NOW)
    expect(plan.experiences.map((e) => e.title)).toEqual(["Learn to surf", "See the aurora"])
  })

  it("ticks off with the day it happened, and untick clears it", () => {
    let plan = addExperiences(emptyNsPlan(), "Learn to surf", null, NOW)
    const id = plan.experiences[0].id
    plan = toggleExperienceDone(plan, id, TODAY, NOW)
    expect(plan.experiences[0]).toMatchObject({ done: true, doneOn: TODAY })
    plan = toggleExperienceDone(plan, id, TODAY, NOW)
    expect(plan.experiences[0]).toMatchObject({ done: false, doneOn: null })
  })

  it("promotes one into a finish line, and keeps the line on the list", () => {
    let plan = addExperiences(emptyNsPlan(), "3 countries this year", null, NOW)
    plan = promoteExperience(plan, plan.experiences[0].id, "lm_fun", NOW)
    // A finish line, NOT a climb to three — the numbers in a bucket-list line
    // are not rungs, and spacing four of them is the goal machinery arriving
    // somewhere it was not invited.
    expect(plan.goals).toHaveLength(1)
    expect(plan.goals[0]).toMatchObject({ title: "3 countries this year", areaId: "lm_fun", type: "achievement" })
    expect(plan.goals[0].ladder).toBeNull()
    // Still on the list, marked, rather than disappearing the moment it counts.
    expect(plan.experiences[0]).toMatchObject({ goalId: plan.goals[0].id, areaId: "lm_fun" })
    // And it cannot be promoted twice into two identical goals.
    expect(promoteExperience(plan, plan.experiences[0].id, "lm_fun", NOW).goals).toHaveLength(1)
  })

  it("survives a save and a load, and drops a pointer at a deleted goal", () => {
    let plan = addExperiences(emptyNsPlan(), "Learn to surf", null, NOW)
    plan = promoteExperience(plan, plan.experiences[0].id, "lm_fun", NOW)
    plan = toggleExperienceDone(plan, plan.experiences[0].id, TODAY, NOW)
    const loaded = loadNsPlan(serializeNsPlan(plan))!
    expect(loaded.experiences[0]).toMatchObject({ title: "Learn to surf", done: true, doneOn: TODAY, areaId: "lm_fun" })
    expect(loaded.experiences[0].goalId).toBe(plan.goals[0].id)

    const orphaned = removeGoal(plan, plan.goals[0].id, NOW)
    expect(loadNsPlan(serializeNsPlan(orphaned))!.experiences[0].goalId).toBeNull()
  })

  it("counts as the user having touched the plan", () => {
    // Otherwise a browser holding nothing but a bucket list reads back empty and
    // is treated as a page nobody used.
    const plan = addExperiences(emptyNsPlan(), "Learn to surf", null, NOW)
    expect(planIsUntouched(plan)).toBe(false)
    expect(planAsText(plan, TODAY)).toContain("THINGS TO EXPERIENCE")
  })
})

describe("what the start doors wrote", () => {
  it("survives a save and a load", () => {
    // The loader drops answers to prompts that no longer exist, which is right,
    // and it dropped these too — so somebody's written-out Tuesday lasted until
    // they refreshed the page and not one second longer.
    let plan = setAnswer(emptyNsPlan(), IDEAL_DAY_KEY, "07:00 Gym\n21:00 Read ten pages", NOW)
    plan = setAnswer(plan, STARTER_KEY("meaning"), "Finish the book", NOW)
    plan = setAnswer(plan, "made-up-prompt-that-never-existed", "junk", NOW)
    const loaded = loadNsPlan(serializeNsPlan(plan))!
    expect(loaded.answers[IDEAL_DAY_KEY]).toBe("07:00 Gym\n21:00 Read ten pages")
    expect(loaded.answers[STARTER_KEY("meaning")]).toBe("Finish the book")
    expect(loaded.answers["made-up-prompt-that-never-existed"]).toBeUndefined()
  })
})

describe("the week, drawn", () => {
  it("gives one block per day a step runs, and leaves unplaced steps in the tray", () => {
    let plan = emptyNsPlan()
    const routineId = plan.routines[0].id
    plan = addCustomStep(plan, routineId, "Gym", 60, 3, NOW, { days: [1, 3, 5], startMin: 7 * 60 })
    const blocks = weekBlocks(plan).filter((b) => b.step.title === "Gym")
    expect(blocks.map((b) => b.day)).toEqual([1, 3, 5])
    expect(blocks[0]).toMatchObject({ startMin: 420, minutes: 60 })
    // Frequency and the days it is on cannot disagree the moment it is drawn.
    expect(blocks[0].step.daysPerWeek).toBe(3)
    // A drawn block is not in the tray, and anything accepted from a preset has
    // never been given a time, so it is.
    expect(unplacedSteps(plan).some((s) => s.step.title === "Gym")).toBe(false)
    const withPreset = applyRoutinePreset(plan, plan.routines[0].id, "15", NOW)
    expect(unplacedSteps(withPreset).length).toBeGreaterThan(0)
  })

  it("takes a block off the grid without deleting the step", () => {
    let plan = emptyNsPlan()
    const routineId = plan.routines[0].id
    plan = addCustomStep(plan, routineId, "Gym", 60, 3, NOW, { days: [1], startMin: 420 })
    const stepId = plan.routines.find((r) => r.id === routineId)!.steps.at(-1)!.id
    plan = unplaceStep(plan, routineId, stepId, NOW)
    expect(weekBlocks(plan).some((b) => b.step.id === stepId)).toBe(false)
    expect(unplacedSteps(plan).some((s) => s.step.id === stepId)).toBe(true)
  })

  it("moves one day of a repeat without disturbing the others", () => {
    let plan = emptyNsPlan()
    const routineId = plan.routines[0].id
    plan = addCustomStep(plan, routineId, "Gym", 60, 3, NOW, { days: [1, 3, 5], startMin: 420 })
    const stepId = plan.routines.find((r) => r.id === routineId)!.steps.at(-1)!.id
    plan = moveBlock(plan, routineId, stepId, 3, 4, 18 * 60, NOW)
    const step = plan.routines.find((r) => r.id === routineId)!.steps.find((s) => s.id === stepId)!
    expect(step.days).toEqual([1, 4, 5])
    expect(step.startMin).toBe(18 * 60)
    // Dropped onto a day it already runs, it merges rather than doubling up.
    plan = moveBlock(plan, routineId, stepId, 1, 4, 18 * 60, NOW)
    const merged = plan.routines.find((r) => r.id === routineId)!.steps.find((s) => s.id === stepId)!
    expect(merged.days).toEqual([4, 5])
    expect(merged.daysPerWeek).toBe(2)
  })

  it("keeps a placed step's slot when the routine's preset changes", () => {
    let plan = emptyNsPlan()
    const fresh = plan.routines.find((r) => r.blueprintId === "morning")!
    plan = applyRoutinePreset(plan, fresh.id, "15", NOW)
    const routine = plan.routines.find((r) => r.id === fresh.id)!
    const stepId = routine.steps[0].id
    plan = placeStep(plan, routine.id, stepId, [0, 1, 2], 6 * 60, NOW)
    plan = applyRoutinePreset(plan, routine.id, "60", NOW)
    const after = plan.routines.find((r) => r.id === routine.id)!.steps.find((s) => s.id === stepId)
    expect(after).toMatchObject({ days: [0, 1, 2], startMin: 360 })
  })

  it("carries placements through a save and a load", () => {
    let plan = emptyNsPlan()
    const routineId = plan.routines[0].id
    plan = addCustomStep(plan, routineId, "Gym", 60, 3, NOW, { days: [1, 3], startMin: 420 })
    const loaded = loadNsPlan(serializeNsPlan(plan))!
    expect(weekBlocks(loaded).filter((b) => b.step.title === "Gym").map((b) => b.day)).toEqual([1, 3])
    // A plan saved before the grid existed loads with everything unplaced
    // rather than dropping the steps.
    const old = JSON.parse(serializeNsPlan(plan))
    for (const r of old.routines) for (const s of r.steps) { delete s.days; delete s.startMin }
    const legacy = loadNsPlan(JSON.stringify(old))!
    expect(legacy.routines[0].steps.every((s) => s.days.length === 0 && s.startMin === null)).toBe(true)
  })
})

/**
 * The class of bug, not the instance.
 *
 * "Go to 36 kg bench" met a box labelled "where are you today? e.g. 72 kg" —
 * an example number written months earlier by somebody looking at a different
 * goal. A hardcoded example cannot know what is on the screen with it, so it
 * contradicts the person whenever their number is smaller, and every one of
 * these is the same mistake. This fails the build rather than waiting for
 * somebody to notice it in production.
 */
describe("the builder never shows a number the user did not give", () => {
  const DIR = path.join(process.cwd(), "src/goals")
  const FILES = [
    ...fs.readdirSync(path.join(DIR, "components/north-star")).map((f) => `components/north-star/${f}`),
    "data/northStar.ts", "data/northStarStart.ts", "data/northStarGuide.ts", "data/northStarBuild.ts",
  ].filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))

  it.each(FILES)("%s has no invented example number", (rel) => {
    const src = fs.readFileSync(path.join(DIR, rel), "utf8")
    const offenders = src
      .split("\n")
      .map((line, i) => ({ line, n: i + 1 }))
      // Only strings a person reads in an input: "e.g. 72", "fx 22", "eg 100".
      .filter(({ line }) => /(?:e\.?g\.?|f\.?ex\.?|fx)\s+[0-9]/i.test(line))
      .filter(({ line }) => !line.trimStart().startsWith("*") && !line.trimStart().startsWith("//"))
      .map(({ line, n }) => `${rel}:${n} ${line.trim()}`)
    expect(offenders).toEqual([])
  })

  it("labels the start box without guessing a value", () => {
    expect(BUILDER_COPY.startPlaceholder).not.toMatch(/[0-9]/)
    expect(BUILDER_COPY.targetPlaceholder).not.toMatch(/[0-9]/)
  })
})

/**
 * A rung has to be a thing you can actually load.
 */
describe("rungs land on numbers that exist", () => {
  it("spaces a bench climb on the plate grid", () => {
    // 24 → 36 in four is 27, 30, 33, 36, and 33 kg is not loadable.
    expect(milestoneValues(24, 36, 4, "kg")).toEqual([27.5, 30, 32.5, 36])
  })

  it("leaves the target exactly where the person put it", () => {
    for (const target of [36, 37, 101, 82.5]) {
      const values = milestoneValues(20, target, 4, "kg")
      expect(values[values.length - 1]).toBe(target)
    }
  })

  it("never repeats a rung or overshoots, at any size of climb", () => {
    for (const unit of ["kg", "lbs", "km", "reps", ""]) {
      for (let target = 3; target <= 120; target += 1) {
        const values = milestoneValues(2, target, 4, unit)
        expect(new Set(values).size, `${unit} to ${target}`).toBe(values.length)
        for (const v of values) expect(v, `${unit} to ${target}`).toBeLessThanOrEqual(target)
        const sorted = [...values].sort((a, b) => a - b)
        expect(values, `${unit} to ${target}`).toEqual(sorted)
      }
    }
  })

  it("keeps whole reps whole", () => {
    // Nobody has done eight tenths of a pull-up.
    expect(milestoneValues(7, 10, 4, "reps").every((v) => Number.isInteger(v))).toBe(true)
  })

  it("does not snap a climb finer than the grid", () => {
    // 20 → 22 kg in four steps is half-kilos, and rounding those to 2.5 would
    // leave one rung: the target.
    expect(milestoneValues(20, 22, 4, "kg").length).toBeGreaterThan(1)
  })
})

/**
 * "22 → 26" is not a training plan.
 */
describe("a climb in weight is a climb in reps too", () => {
  it("jumps by the same loadable amount every time", () => {
    // 22 → 22.5 → 25 is half a plate and then a full one. The jump is constant
    // and on the grid; what is uneven is the last step to the person's number.
    const weights = liftProgression(22, 26, "kg", { count: 2 })
      .map((r) => Number(r.split(" ")[0]))
      .filter((w, i, all) => all.indexOf(w) === i)
    expect(weights).toEqual([22, 24.5, 26])
  })

  it("holds the weight, builds the reps, then takes the jump", () => {
    const rungs = liftProgression(22, 26, "kg", { count: 2 })
    // Starts where they already are, and every jump lands back on low reps.
    expect(rungs[0]).toBe("22 kg 3×8")
    expect(rungs).toContain("26 kg 3×6")
    expect(rungs[rungs.length - 1]).toBe("26 kg 3×8")
    expect(rungs.length).toBeGreaterThan(3)
  })

  it("paces the rungs across the weeks to the date", () => {
    const rungs = liftProgression(22, 26, "kg", { count: 2, weeks: 8 })
    expect(rungs[0]).toMatch(/— now$/)
    expect(rungs[rungs.length - 1]).toMatch(/— week 8$/)
  })

  it("knows which climbs are lifts", () => {
    expect(isLiftClimb("kg")).toBe(true)
    expect(isLiftClimb("lbs")).toBe(true)
    expect(isLiftClimb("km")).toBe(false)
    expect(isLiftClimb("")).toBe(false)
  })

  it("counts the weeks to a date", () => {
    expect(weeksUntil("2026-10-12", "2026-08-17")).toBe(8)
    expect(weeksUntil(null, "2026-08-17")).toBe(0)
    // A date in the past paces nothing.
    expect(weeksUntil("2026-01-01", "2026-08-17")).toBe(0)
  })
})

/**
 * The rungs nobody can compute.
 */
describe("a progression in your own words", () => {
  it("takes arrows and lines", () => {
    expect(parseProgression("5 pull-ups → 10 pull-ups → muscle-up")).toEqual(["5 pull-ups", "10 pull-ups", "muscle-up"])
    expect(parseProgression("5 pull-ups\n10 pull-ups\nmuscle-up")).toEqual(["5 pull-ups", "10 pull-ups", "muscle-up"])
    expect(parseProgression("- 5 pull-ups\n- muscle-up")).toEqual(["5 pull-ups", "muscle-up"])
  })

  it("leaves a comma inside a rung alone, because that is where commas live", () => {
    // "10 pull-ups, strict" is one rung. Splitting on commas made it two, and
    // the second one — "strict" — is not a rung at all.
    expect(parseProgression("5 pull-ups, dead hang → 10 pull-ups, strict")).toEqual([
      "5 pull-ups, dead hang",
      "10 pull-ups, strict",
    ])
    // Same for the dashes a generated rung carries: "100 kg — week 3" is one.
    expect(parseProgression("22 kg 3×8 — now\n24.5 kg 3×6 — week 3")).toEqual([
      "22 kg 3×8 — now",
      "24.5 kg 3×6 — week 3",
    ])
  })

  it("keeps a number that is the whole rung", () => {
    // The bullet strip must not eat "10" when the rung is only a number.
    expect(parseProgression("5\n10\n15")).toEqual(["5", "10", "15"])
  })

  it("writes them as the rungs, leaving hand-written checkpoints alone", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Muscle-up", "milestone_ladder", NOW)
    const id = plan.goals[0].id
    plan = addCheckpoint(plan, id, "Film it", NOW)
    plan = setProgression(plan, id, parseProgression("5 pull-ups → 10 pull-ups → muscle-up"), NOW)
    expect(milestoneCheckpoints(plan.goals[0]).map((c) => c.title)).toEqual(["5 pull-ups", "10 pull-ups", "muscle-up"])
    expect(plan.goals[0].checkpoints.map((c) => c.title)).toContain("Film it")
  })

  it("replaces the rungs rather than piling a second set on top", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Muscle-up", "milestone_ladder", NOW)
    const id = plan.goals[0].id
    plan = setProgression(plan, id, ["a", "b"], NOW)
    plan = setProgression(plan, id, ["c"], NOW)
    expect(milestoneCheckpoints(plan.goals[0]).map((c) => c.title)).toEqual(["c"])
  })
})

/**
 * Step 3: the sentence, and what it needs.
 *
 * The requirements are goals rather than notes, which is the whole point of
 * the step — "what has to happen for this to work" written as a list nobody
 * ever looks at again is a reflection exercise, and written as goals it is the
 * plan. What follows pins the parts of that which are easy to get wrong.
 */
describe("what needs to happen for the one thing to work", () => {
  it("writes a requirement as a real goal, filed where it belongs", () => {
    const plan = addOneThingRequirement(emptyNsPlan(), "Train four times a week", undefined, NOW)
    expect(plan.goals).toHaveLength(1)
    const [goal] = plan.goals
    expect(goal.title).toBe("Train four times a week")
    expect(goal.servesOneThing).toBe(true)
    // Guessed from the words, not dumped into the first area on the list.
    expect(goal.areaId).toBe("lm_fitness")
  })

  it("guesses the area from the words people actually use", () => {
    // "Ring my mother once a week" landed in Health: the keyword list had
    // "mom" and "mor" and not "mother".
    const plan = addOneThingRequirement(emptyNsPlan(), "Ring my mother once a week", undefined, NOW)
    expect(plan.goals[0].areaId).toBe("lm_family")
    // And it is a driver at one a week, not a finish line with a made-up rate.
    expect(plan.goals[0].type).toBe("habit_ramp")
    expect(plan.goals[0].daysPerWeek).toBe(1)
  })

  it("files it where the person says, over the guess", () => {
    const plan = addOneThingRequirement(emptyNsPlan(), "Stop buying it", "lm_money", NOW)
    expect(plan.goals[0].areaId).toBe("lm_money")
  })

  it("shapes it like anything else typed into an area", () => {
    // A number makes a climb. The requirement list is not a second, weaker
    // kind of goal — it is the same machinery, entered somewhere else.
    const plan = addOneThingRequirement(emptyNsPlan(), "Flat bench 100 kg", "lm_fitness", NOW)
    expect(plan.goals[0].type).toBe("milestone_ladder")
    expect(plan.goals[0].ladder?.target).toBe(100)
  })

  it("shows up on the goals page like any other goal", () => {
    const plan = addOneThingRequirement(emptyNsPlan(), "Sleep by eleven", "lm_health", NOW)
    expect(goalsInArea(plan, "lm_health").map((g) => g.title)).toEqual(["Sleep by eleven"])
  })

  it("keeps them in one list, whichever way they were linked", () => {
    let plan = addOneThingRequirement(emptyNsPlan(), "Sleep by eleven", "lm_health", NOW)
    plan = addGoal(plan, "lm_fitness", "Train four times a week", "habit_ramp", NOW)
    const existing = plan.goals[1]
    expect(oneThingRequirements(plan)).toHaveLength(1)
    plan = markServesOneThing(plan, existing.id, true, NOW)
    expect(oneThingRequirements(plan).map((g) => g.title)).toEqual(["Sleep by eleven", "Train four times a week"])
    // And unlinking leaves the goal alone. It is somebody's goal either way.
    plan = markServesOneThing(plan, existing.id, false, NOW)
    expect(oneThingRequirements(plan)).toHaveLength(1)
    expect(plan.goals).toHaveLength(2)
  })

  it("offers what was already written and reads like it is about this", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Train four times a week", "habit_ramp", NOW)
    plan = addGoal(plan, "lm_money", "Save 20000", "milestone_ladder", NOW)
    const like = goalsLikeOneThing(plan, "Get my training consistent again").map((g) => g.title)
    expect(like).toContain("Train four times a week")
    expect(like).not.toContain("Save 20000")
  })

  it("does not offer what is already linked", () => {
    const plan = addOneThingRequirement(emptyNsPlan(), "Train four times a week", "lm_fitness", NOW)
    expect(goalsLikeOneThing(plan, "training")).toEqual([])
  })

  it("survives being written down and read back", () => {
    // The flag is what the whole step hangs on, so a reload that dropped it
    // would leave somebody's requirements as loose goals with no origin.
    const plan = addOneThingRequirement(emptyNsPlan(), "Sleep by eleven", "lm_health", NOW)
    const reloaded = loadNsPlan(JSON.stringify(plan))!
    expect(oneThingRequirements(reloaded).map((g) => g.title)).toEqual(["Sleep by eleven"])
  })

  it("refuses an empty line rather than filing a blank goal", () => {
    expect(addOneThingRequirement(emptyNsPlan(), "   ", "lm_health", NOW).goals).toEqual([])
  })
})

describe("the step is not done on a sentence alone", () => {
  it("wants the sentence, its supports, and something that has to happen", () => {
    let plan = setAnswer(emptyNsPlan(), ONE_THING_KEY, "Quit weed", NOW)
    expect(stepState(plan, "one")).toBe("started")
    plan = addOneThingRequirement(plan, "Delete the dealer's number", "lm_health", NOW)
    // Still not done: a sentence with no why is the one that dies in February.
    expect(stepState(plan, "one")).toBe("started")
    for (const key of [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values]) {
      plan = setAnswer(plan, key, "written", NOW)
    }
    expect(stepState(plan, "one")).toBe("done")
    expect(nsProgress(plan).done.one).toBe(true)
  })
})

describe("a rate written in words is still a rate", () => {
  it("reads twice a week as a driver at two", () => {
    // "Train chest twice a week" arrived as a finish line with an invented
    // rate of three, and was then asked for a date — the page asking when the
    // person planned to stop training.
    const shape = shapeFromTitle("Train chest twice a week")
    expect(shape.type).toBe("habit_ramp")
    expect(shape.daysPerWeek).toBe(2)
  })

  it("reads the rest of the words, in both languages", () => {
    expect(shapeFromTitle("Ring my mother once a week").daysPerWeek).toBe(1)
    expect(shapeFromTitle("Gym three times a week").daysPerWeek).toBe(3)
    expect(shapeFromTitle("Løb tre gange om ugen").daysPerWeek).toBe(3)
    expect(shapeFromTitle("Træn to gange om ugen").type).toBe("habit_ramp")
  })

  it("leaves a digit rate alone, and a sentence with neither", () => {
    expect(shapeFromTitle("Train 4x a week").daysPerWeek).toBe(4)
    expect(shapeFromTitle("One muscle-up").type).toBe("achievement")
    // "two" inside a sentence that is not about a rate must not make one.
    expect(shapeFromTitle("Visit two countries").type).toBe("achievement")
  })
})

/**
 * How long a step takes is the person's estimate, not the library's.
 */
describe("setting your own minutes on a routine step", () => {
  const routineId = "r1"
  const seed = () => addCustomStep(emptyNsPlan(), routineId, "Stretch", 2, 7, NOW)

  it("changes the step, and everything counted from it", () => {
    // The number was printed as text, so a step arrived with the blueprint's
    // guess and stayed — and the routine total, the presets and the weekly
    // load were all adding up somebody else's minutes.
    let plan = seed()
    const stepId = plan.routines.find((r) => r.id === routineId)!.steps[0].id
    const before = routineMinutes(plan.routines.find((r) => r.id === routineId)!)
    plan = updateStep(plan, routineId, stepId, { minutes: 12 }, NOW)
    const after = routineMinutes(plan.routines.find((r) => r.id === routineId)!)
    expect(before).toBe(2)
    expect(after).toBe(12)
  })

  it("bounds it, so the totals stay sentences somebody can read", () => {
    let plan = seed()
    const stepId = plan.routines.find((r) => r.id === routineId)!.steps[0].id
    plan = updateStep(plan, routineId, stepId, { minutes: 900 }, NOW)
    expect(plan.routines.find((r) => r.id === routineId)!.steps[0].minutes).toBe(180)
    plan = updateStep(plan, routineId, stepId, { minutes: -5 }, NOW)
    expect(plan.routines.find((r) => r.id === routineId)!.steps[0].minutes).toBe(0)
    plan = updateStep(plan, routineId, stepId, { minutes: Number.NaN }, NOW)
    // "about NaN min" was the alternative.
    expect(plan.routines.find((r) => r.id === routineId)!.steps[0].minutes).toBe(0)
  })

  it("counts a weekly step's minutes against the week, times the days", () => {
    // Weekly routines show days rather than a running total, which is why the
    // minutes box was missing there — but the load has always used them.
    let plan = addCustomStep(emptyNsPlan(), "r4", "Cold shower", 3, 7, NOW)
    const stepId = plan.routines.find((r) => r.id === "r4")!.steps[0].id
    const before = weeklyLoad(plan).minutes
    plan = updateStep(plan, "r4", stepId, { minutes: 10 }, NOW)
    expect(weeklyLoad(plan).minutes - before).toBe((10 - 3) * 7)
  })

  it("leaves the rest of the step alone", () => {
    let plan = seed()
    const stepId = plan.routines.find((r) => r.id === routineId)!.steps[0].id
    plan = updateStep(plan, routineId, stepId, { minutes: 6 }, NOW)
    const step = plan.routines.find((r) => r.id === routineId)!.steps[0]
    expect(step.title).toBe("Stretch")
    expect(step.daysPerWeek).toBe(7)
  })
})

/**
 * Milestones and systems, and the joining between them.
 */
describe("what you want, and what moves it", () => {
  const build = () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Flat bench 100 kg", "milestone_ladder", NOW)
    plan = addGoal(plan, "lm_fitness", "Train four times a week", "habit_ramp", NOW)
    plan = addCustomStep(plan, "r1", "Stretch", 2, 7, NOW)
    return plan
  }

  it("sorts a plan into the half you want and the half you do", () => {
    const plan = build()
    expect(milestoneGoals(plan).map((g) => g.title)).toEqual(["Flat bench 100 kg"])
    expect(systemGoals(plan).map((g) => g.title)).toEqual(["Train four times a week"])
  })

  it("counts a bucket-list experience as something you want, not something you do", () => {
    // "A Ferrari" is not SMART and is not a system either. It belongs with the
    // milestones because its whole job is to pull.
    const plan = addExperiences(emptyNsPlan(), "A Ferrari\nA threesome", NOW)
    expect(plan.experiences).toHaveLength(2)
    expect(systemGoals(plan)).toEqual([])
  })

  it("links a routine step to the milestone it moves, and only when asked", () => {
    let plan = build()
    const goal = milestoneGoals(plan)[0]
    const step = plan.routines.find((r) => r.id === "r1")!.steps[0]
    // Nothing is inferred: sharing an area is not a link.
    expect(systemsForGoal(plan, goal.id)).toEqual([])
    plan = linkStepToGoal(plan, "r1", step.id, goal.id, true, NOW)
    expect(systemsForGoal(plan, goal.id).map((s) => s.title)).toEqual(["Stretch"])
    plan = linkStepToGoal(plan, "r1", step.id, goal.id, false, NOW)
    expect(systemsForGoal(plan, goal.id)).toEqual([])
  })

  it("gathers the three shapes that reach a milestone into one list", () => {
    let plan = build()
    const goal = milestoneGoals(plan)[0]
    const driver = systemGoals(plan)[0]
    const step = plan.routines.find((r) => r.id === "r1")!.steps[0]
    plan = linkStepToGoal(plan, "r1", step.id, goal.id, true, NOW)
    plan = linkGoal(plan, driver.id, goal.id, NOW)
    plan = addAction(plan, goal.id, "Eat 180g protein", 7, NOW)
    expect(systemsForGoal(plan, goal.id).map((s) => s.kind).sort()).toEqual(["action", "driver", "step"])
  })

  it("names the two failure modes", () => {
    let plan = build()
    const goal = milestoneGoals(plan)[0]
    // A milestone with nothing running at it is a wish...
    expect(milestonesWithoutSystems(plan).map((g) => g.title)).toEqual(["Flat bench 100 kg"])
    // ...and a system pointed at nothing is a chore.
    // Routine steps are not listed: a routine is background, and calling
    // "Stretch" an outstanding task because nothing points at it is the page
    // asking somebody to justify making their bed.
    expect(systemsWithoutMilestones(plan).map((s) => s.title)).toEqual(["Train four times a week"])
    const step = plan.routines.find((r) => r.id === "r1")!.steps[0]
    plan = linkStepToGoal(plan, "r1", step.id, goal.id, true, NOW)
    expect(milestonesWithoutSystems(plan)).toEqual([])
    expect(systemsWithoutMilestones(plan).map((s) => s.title)).toEqual(["Train four times a week"])
  })

  it("refuses a link to a goal that does not exist", () => {
    const plan = build()
    const step = plan.routines.find((r) => r.id === "r1")!.steps[0]
    expect(linkStepToGoal(plan, "r1", step.id, "nope", true, NOW)).toBe(plan)
  })

  it("keeps the link across a save and a load", () => {
    let plan = build()
    const goal = milestoneGoals(plan)[0]
    const step = plan.routines.find((r) => r.id === "r1")!.steps[0]
    plan = linkStepToGoal(plan, "r1", step.id, goal.id, true, NOW)
    const reloaded = loadNsPlan(JSON.stringify(plan))!
    expect(systemsForGoal(reloaded, goal.id).map((s) => s.title)).toEqual(["Stretch"])
  })
})

describe("what a routine adds up to", () => {
  /** The user's own example: ninety minutes of deep work, five days a week. */
  const business = () => {
    let plan = emptyNsPlan()
    plan = addCustomStep(plan, "r3", "Deep work", 90, 5, NOW)
    return plan
  }

  it("counts the hours off the routine somebody actually built", () => {
    const routine = business().routines.find((r) => r.id === "r3")!
    const hours = systemMilestones(routine).find((m) => m.id === "hours")!
    // 90 min × 5 = 7.5 h a week; a year of that is 390, written as 400.
    expect(hours.target).toBe(400)
    expect(hours.unit).toBe("hours")
    // Named after the work rather than the container: nobody is proud of
    // hours of "business routine".
    expect(hours.title).toBe("400 hours of deep work")
    expect(hours.note).toContain("7.5 hours a week")
  })

  it("counts sessions, and offers a streak only where it runs most days", () => {
    const routine = business().routines.find((r) => r.id === "r3")!
    const ids = systemMilestones(routine).map((m) => m.id)
    expect(ids).toContain("sessions")
    expect(ids).toContain("streak")

    // Twice a week is not a streak-in-days routine, whatever the total.
    const plan = addCustomStep(emptyNsPlan(), "r4", "Cold plunge", 10, 2, NOW)
    const rare = plan.routines.find((r) => r.id === "r4")!
    expect(systemMilestones(rare).map((m) => m.id)).not.toContain("streak")
  })

  it("says nothing about a routine with nothing in it", () => {
    const empty = emptyNsPlan().routines[0]
    expect(systemMilestones(empty)).toEqual([])
  })

  it("creates the milestone already joined to the routine that produces it", () => {
    let plan = business()
    plan = addSystemMilestone(plan, "r3", "hours", undefined, NOW)
    const made = milestoneGoals(plan)[0]
    expect(made.title).toMatch(/400 hours/)
    expect(made.ladder?.target).toBe(400)
    // Derived from a system, so it is not a wish for one second.
    expect(systemsForGoal(plan, made.id).map((s) => s.title)).toEqual(["Deep work"])
    expect(milestonesWithoutSystems(plan)).toEqual([])
  })

  it("offers an area at most three, one per routine", () => {
    // Opening Mind & Beliefs produced fifteen: every shape of every routine
    // that reaches the area, each with a line of explanation under it. Fifteen
    // milestones at once is not fifteen times the motivation.
    let plan = emptyNsPlan()
    plan = addCustomStep(plan, "r1", "Meditate", 20, 7, NOW)
    plan = addCustomStep(plan, "r2", "Journal", 15, 7, NOW)
    plan = addCustomStep(plan, "r4", "No scrolling", 5, 7, NOW)
    const offers = areaSystemMilestones(plan, "lm_mindset")
    expect(offers.length).toBeLessThanOrEqual(3)
    // One per routine, so no routine is represented twice.
    expect(new Set(offers.map((o) => o.routineId)).size).toBe(offers.length)
  })

  it("offers an area what its own routines add up to", () => {
    // "If I click an area, the milestones should fit the systems there."
    let plan = addCustomStep(emptyNsPlan(), "r1", "Stretch", 10, 7, NOW)
    const offers = areaSystemMilestones(plan, "lm_health")
    expect(offers.length).toBeGreaterThan(0)
    expect(offers.every((o) => o.routineLabel === "Morning routine")).toBe(true)
    // And stops offering one that has already been made.
    plan = addSystemMilestone(plan, "r1", offers[0].id, "lm_health", NOW)
    expect(areaSystemMilestones(plan, "lm_health").map((o) => o.title)).not.toContain(offers[0].title)
  })

  it("offers an area nothing when nothing runs there", () => {
    expect(areaSystemMilestones(emptyNsPlan(), "lm_money")).toEqual([])
  })
})

/**
 * Systems are shared on purpose.
 */
describe("a milestone is served, not actioned", () => {
  it("counts one gym habit as the answer for every lift it moves", () => {
    // Bench, squat and a muscle-up are three milestones and one system: you go
    // to the gym four times a week. Asking each of them what it will do about
    // itself gets the same sentence written three times.
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Flat bench 100 kg", "milestone_ladder", NOW)
    plan = addGoal(plan, "lm_fitness", "Squat 140 kg", "milestone_ladder", NOW)
    plan = addGoal(plan, "lm_fitness", "One muscle-up", "achievement", NOW)
    plan = addCustomStep(plan, "r1", "Strength session", 45, 4, NOW)
    const step = plan.routines.find((r) => r.id === "r1")!.steps[0]
    for (const goal of milestoneGoals(plan)) {
      expect(milestoneHasSystem(plan, goal)).toBe(false)
      plan = linkStepToGoal(plan, "r1", step.id, goal.id, true, NOW)
    }
    // One system, linked three times, and every milestone is answered.
    for (const goal of milestoneGoals(plan)) expect(milestoneHasSystem(plan, goal)).toBe(true)
    expect(milestonesWithoutSystems(plan)).toEqual([])
  })

  it("still counts an action written under the milestone itself", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Flat bench 100 kg", "milestone_ladder", NOW)
    plan = addAction(plan, plan.goals[0].id, "Bench twice a week", 2, NOW)
    expect(milestoneHasSystem(plan, plan.goals[0])).toBe(true)
  })
})

/**
 * A rung with no date is a rung you are never behind on.
 */
describe("written rungs carry dates too", () => {
  it("spreads them between today and the goal's date, ending on it", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "One muscle-up", "achievement", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: "2027-01-01" }, NOW)
    plan = setProgression(plan, plan.goals[0].id, ["5 pull-ups", "10 pull-ups", "muscle-up"], NOW)
    const dated = datedRungs(plan.goals[0], TODAY)
    expect(dated.map((r) => r.title)).toEqual(["5 pull-ups", "10 pull-ups", "muscle-up"])
    expect(dated[dated.length - 1].date).toBe("2027-01-01")
    // In order, and none of them today.
    const dates = dated.map((r) => r.date!)
    expect([...dates].sort()).toEqual(dates)
    expect(dates.every((d) => d > TODAY)).toBe(true)
  })

  it("says nothing rather than guessing when there is no date", () => {
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "One muscle-up", "achievement", NOW)
    plan = updateGoal(plan, plan.goals[0].id, { targetDate: null }, NOW)
    plan = setProgression(plan, plan.goals[0].id, ["5 pull-ups", "muscle-up"], NOW)
    expect(datedRungs(plan.goals[0], TODAY).every((r) => r.date === null)).toBe(true)
  })
})

// ============================================================================
// A started training program, reflected in the plan's workout routine.
//
// The failure this guards against is the plan and the enrollment disagreeing:
// the page saying "Push / Pull / Legs" beside a StrongLifts enrollment that
// runs Workout A / Workout B. Whatever was actually started wins.
// ============================================================================

describe("applyProgramToWorkoutRoutine", () => {
  it("writes the program's days into an existing workout routine", () => {
    const withRoutine = addRoutine(emptyNsPlan(), "workout", NOW)
    const plan = applyProgramToWorkoutRoutine(withRoutine, ["Upper A", "Lower A", "Upper B", "Lower B"], NOW)

    const routine = plan.routines.find((r) => r.blueprintId === "workout")!
    expect(routine.splitDays.map((d) => d.name)).toEqual(["Upper A", "Lower A", "Upper B", "Lower B"])
    expect(routine.daysPerWeek).toBe(4)
  })

  it("adds the workout routine when the plan has not got one", () => {
    const plan = applyProgramToWorkoutRoutine(emptyNsPlan(), ["Workout A", "Workout B"], NOW)
    const routine = plan.routines.find((r) => r.blueprintId === "workout")
    expect(routine).toBeDefined()
    expect(routine!.splitDays.map((d) => d.name)).toEqual(["Workout A", "Workout B"])
    expect(routine!.daysPerWeek).toBe(2)
  })

  it("finds the routine by blueprint, so a renamed one is still the one", () => {
    let plan = addRoutine(emptyNsPlan(), "workout", NOW)
    const id = plan.routines.find((r) => r.blueprintId === "workout")!.id
    plan = updateRoutine(plan, id, { label: "Gym" }, NOW)
    plan = applyProgramToWorkoutRoutine(plan, ["Push", "Pull", "Legs"], NOW)

    expect(plan.routines.filter((r) => r.blueprintId === "workout")).toHaveLength(1)
    const routine = plan.routines.find((r) => r.id === id)!
    expect(routine.label).toBe("Gym")
    expect(routine.splitDays.map((d) => d.name)).toEqual(["Push", "Pull", "Legs"])
  })

  it("replaces a previous split rather than appending to it", () => {
    let plan = addRoutine(emptyNsPlan(), "workout", NOW)
    plan = applyProgramToWorkoutRoutine(plan, ["Push", "Pull", "Legs"], NOW)
    plan = applyProgramToWorkoutRoutine(plan, ["Full Body A", "Full Body B"], NOW)

    const routine = plan.routines.find((r) => r.blueprintId === "workout")!
    expect(routine.splitDays.map((d) => d.name)).toEqual(["Full Body A", "Full Body B"])
    expect(routine.daysPerWeek).toBe(2)
  })

  it("keeps the routine's steps — a program says when you train, not what else the routine carries", () => {
    let plan = addRoutine(emptyNsPlan(), "workout", NOW)
    const routineId = plan.routines.find((r) => r.blueprintId === "workout")!.id
    const stepsBefore = plan.routines.find((r) => r.id === routineId)!.steps.map((s) => s.id)

    plan = applyProgramToWorkoutRoutine(plan, ["Upper", "Lower"], NOW)
    expect(plan.routines.find((r) => r.id === routineId)!.steps.map((s) => s.id)).toEqual(stepsBefore)
  })

  it("an empty day list is a no-op rather than a wiped split", () => {
    let plan = addRoutine(emptyNsPlan(), "workout", NOW)
    plan = applyProgramToWorkoutRoutine(plan, ["Push", "Pull"], NOW)
    expect(applyProgramToWorkoutRoutine(plan, [], NOW)).toBe(plan)
  })

  it("gives every day a distinct id, so renaming one does not rename another", () => {
    const plan = applyProgramToWorkoutRoutine(emptyNsPlan(), ["Upper", "Upper", "Lower"], NOW)
    const ids = plan.routines.find((r) => r.blueprintId === "workout")!.splitDays.map((d) => d.id)
    expect(new Set(ids).size).toBe(3)
  })
})
