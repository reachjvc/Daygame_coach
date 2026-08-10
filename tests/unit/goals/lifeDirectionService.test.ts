import { describe, it, expect } from "vitest"
import {
  LDI_AREAS,
  LDI_EULOGY_STEMS,
  LDI_GOAL_FIELDS,
  LDI_INTAKE_ITEMS,
  LDI_LEGACY_PROMPTS,
  LDI_NORTH_STAR_PROMPTS,
  LDI_ODYSSEY_SCORES,
  LDI_REALISM_FLOOR,
  LDI_REFLECT_PROMPTS,
  LDI_SESSIONS,
} from "@/src/goals/data/lifeDirection"
import {
  LDI_DREAM_MIN,
  LDI_ENERGY_MIN_ENTRIES,
  LDI_EULOGY_MIN,
  addDream,
  addEnergyEntry,
  addGoal,
  addPrototype,
  addWeekBlock,
  answerValueQuestion,
  budgetOverAllocated,
  budgetRemaining,
  celebrationsComplete,
  coherenceWarnings,
  currentValueQuestion,
  emptyLdiPlan,
  fitTestFailures,
  fitTestPasses,
  goalGaps,
  goalReady,
  intakeScores,
  ldiProgress,
  loadLdiPlan,
  markEnergyEntry,
  planAsText,
  planIsUntouched,
  lockReason,
  overrideSessionLock,
  realismBlocked,
  realismMessage,
  removeGoal,
  seedPortfolioFromFocus,
  serializeLdiPlan,
  sessionChecks,
  setBudget,
  stepGaps,
  setCelebration,
  setConstraints,
  setEulogyStem,
  setFear,
  setGoalField,
  setIntakeAnswer,
  setLegacy,
  setNorthStar,
  setOdyssey,
  setOdysseyScore,
  setReflect,
  setValueCandidates,
  setWheelRating,
  startValueRanking,
  toggleCadence,
  toggleFocusArea,
  togglePortfolioArea,
  updateDream,
  updateGoal,
  updatePrototype,
  weakestDimension,
} from "@/src/goals/lifeDirectionService"
import type { LdiPlan } from "@/src/goals/types"

const NOW = "2026-08-09T10:00:00.000Z"

// ---------------------------------------------------------------- builders

function withIntake(plan: LdiPlan, value = 2): LdiPlan {
  return LDI_INTAKE_ITEMS.reduce((p, item) => setIntakeAnswer(p, item.id, value, NOW), plan)
}

function withWheel(plan: LdiPlan, score = 5): LdiPlan {
  return LDI_AREAS.reduce((p, a) => setWheelRating(p, a.id, score, NOW), plan)
}

function withEnergy(plan: LdiPlan): LdiPlan {
  let p = plan
  for (let i = 0; i < LDI_ENERGY_MIN_ENTRIES; i++) p = addEnergyEntry(p, `Commitment ${i}`, NOW)
  return p.energy.reduce((acc, e) => markEnergyEntry(acc, e.id, "drains", NOW), p)
}

function completeBaseline(plan: LdiPlan): LdiPlan {
  let p = withEnergy(withWheel(withIntake(plan)))
  return setConstraints(p, { weeklyHours: 10, nonNegotiables: "Evenings with my family." }, NOW)
}

function completeReflect(plan: LdiPlan): LdiPlan {
  let p = LDI_REFLECT_PROMPTS.reduce((acc, pr) => setReflect(acc, pr.id, "Something real.", NOW), plan)
  p = toggleFocusArea(p, "body", NOW)
  p = toggleFocusArea(p, "family", NOW)
  return toggleFocusArea(p, "mission", NOW)
}

function completeDirection(plan: LdiPlan): LdiPlan {
  let p = LDI_NORTH_STAR_PROMPTS.reduce((acc, pr) => setNorthStar(acc, pr.id, "An answer.", NOW), plan)
  p = LDI_LEGACY_PROMPTS.reduce((acc, pr) => setLegacy(acc, pr.id, "An answer.", NOW), p)
  for (let i = 0; i < LDI_EULOGY_MIN; i++) p = setEulogyStem(p, i, "Something true.", NOW)
  p.odyssey.forEach((_, i) => {
    p = setOdyssey(p, i, { body: "A described life.", processAppeals: true }, NOW)
    LDI_ODYSSEY_SCORES.forEach((s) => {
      p = setOdysseyScore(p, i, s.id, 3, NOW)
    })
  })
  p = setValueCandidates(p, ["Freedom", "Love", "Growth", "Health", "Contribution"], NOW)
  p = startValueRanking(p, NOW)
  while (currentValueQuestion(p)) p = answerValueQuestion(p, true, NOW)
  return setFear(
    p,
    {
      option: "The other path.",
      worst: "It fails publicly.",
      prevent: "Keep the runway long.",
      repair: "Go back to contracting.",
      benefits: "I would learn the trade.",
      costInaction: "Three more years of the same.",
    },
    NOW,
  )
}

function completeConverge(plan: LdiPlan): LdiPlan {
  let p = plan
  for (let i = 0; i < LDI_DREAM_MIN; i++) p = addDream(p, `Dream ${i}`, NOW)
  p = p.dreams.reduce((acc, d) => updateDream(acc, d.id, { horizonYears: 5 }, NOW), p)
  // Portfolio before celebrations, matching the screen order.
  p = seedPortfolioFromFocus(p, NOW)
  p = p.portfolioAreaIds.reduce((acc, id) => setCelebration(acc, id, "A thing worth celebrating.", NOW), p)
  return p.portfolioAreaIds.reduce((acc, id) => setBudget(acc, id, 3, NOW), p)
}

function fillGoal(plan: LdiPlan, goalId: string): LdiPlan {
  let p = LDI_GOAL_FIELDS.reduce((acc, f) => setGoalField(acc, goalId, f.id, "An answer.", NOW), plan)
  return updateGoal(p, goalId, { realismTheory: 90, realismPractice: 85, leadIndicator: "Sessions per week." }, NOW)
}

function completeGoals(plan: LdiPlan): LdiPlan {
  let p = plan
  for (const areaId of ["body", "family", "mission"]) {
    p = addGoal(p, areaId, `Goal for ${areaId}`, null, NOW)
    p = fillGoal(p, p.goals[p.goals.length - 1].id)
  }
  return p
}

function completeInstall(plan: LdiPlan): LdiPlan {
  let p = plan
  for (const g of p.goals) p = addWeekBlock(p, "mon", "morning", g.title, g.id, 3, NOW)
  p = toggleCadence(p, "daily", NOW)
  p = toggleCadence(p, "weekly", NOW)
  p = { ...p, accountability: { who: "Sam", when: "Sunday evenings.", what: "Sessions completed." } }
  p = addPrototype(p, NOW)
  return updatePrototype(
    p,
    p.prototypes[0].id,
    { assumption: "People want this.", test: "Talk to ten of them.", signal: "Fewer than three care.", date: "2026-09-01" },
    NOW,
  )
}

// ---------------------------------------------------------------- tests

describe("empty plan", () => {
  it("starts untouched with every authored field empty", () => {
    const plan = emptyLdiPlan(NOW)
    expect(planIsUntouched(plan)).toBe(true)
    expect(plan.goals).toEqual([])
    expect(plan.dreams).toEqual([])
    expect(plan.values.candidates).toEqual([])
    expect(plan.values.ranked).toEqual([])
    expect(plan.constraints.weeklyHours).toBeNull()
    expect(Object.keys(plan.intake)).toHaveLength(0)
    expect(Object.keys(plan.wheel)).toHaveLength(0)
  })

  it("ships the three futures as empty shells rather than examples", () => {
    const plan = emptyLdiPlan(NOW)
    expect(plan.odyssey).toHaveLength(3)
    for (const o of plan.odyssey) {
      expect(o.body).toBe("")
      expect(o.processAppeals).toBeNull()
      expect(Object.keys(o.scores)).toHaveLength(0)
    }
  })
})

describe("progress is evidence, not visits", () => {
  it("reports nothing complete on a fresh plan", () => {
    const progress = ldiProgress(emptyLdiPlan(NOW))
    expect(progress.done).toBe(0)
    expect(progress.total).toBe(LDI_SESSIONS.length)
    expect(progress.nextSessionId).toBe("baseline")
  })

  it("locks later sessions until the previous one is complete", () => {
    const progress = ldiProgress(emptyLdiPlan(NOW))
    expect(progress.sessions[0].unlocked).toBe(true)
    expect(progress.sessions[1].unlocked).toBe(false)
    expect(progress.sessions[5].unlocked).toBe(false)
  })

  it("unlocks the next session only once every check passes", () => {
    const plan = completeBaseline(emptyLdiPlan(NOW))
    const progress = ldiProgress(plan)
    expect(progress.sessions[0].complete).toBe(true)
    expect(progress.sessions[1].unlocked).toBe(true)
    expect(progress.nextSessionId).toBe("reflect")
  })

  it("does not count a session complete when one check is missing", () => {
    // Everything but the constraints, which is the check that matters most.
    const plan = withEnergy(withWheel(withIntake(emptyLdiPlan(NOW))))
    const checks = sessionChecks(plan, "baseline")
    expect(checks.filter((c) => c.ok)).toHaveLength(3)
    expect(ldiProgress(plan).sessions[0].complete).toBe(false)
  })

  it("walks all six sessions to complete", () => {
    let p = completeBaseline(emptyLdiPlan(NOW))
    p = completeReflect(p)
    p = completeDirection(p)
    p = completeConverge(p)
    p = completeGoals(p)
    p = completeInstall(p)
    const progress = ldiProgress(p)
    expect(progress.done).toBe(LDI_SESSIONS.length)
    expect(progress.nextSessionId).toBeNull()
  })
})

describe("session 0 — baseline", () => {
  it("withholds a dimension score until that dimension is fully answered", () => {
    let p = emptyLdiPlan(NOW)
    p = setIntakeAnswer(p, "v1", 4, NOW)
    expect(intakeScores(p).vision).toBeNull()
    expect(weakestDimension(p)).toBeNull()
  })

  it("scores a dimension as a percentage once complete", () => {
    const p = withIntake(emptyLdiPlan(NOW), 4)
    expect(intakeScores(p).vision).toBe(100)
    const zeroed = withIntake(emptyLdiPlan(NOW), 0)
    expect(intakeScores(zeroed).vision).toBe(0)
  })

  it("names the weakest dimension", () => {
    let p = withIntake(emptyLdiPlan(NOW), 4)
    p = LDI_INTAKE_ITEMS.filter((i) => i.dimension === "systems").reduce(
      (acc, i) => setIntakeAnswer(acc, i.id, 0, NOW),
      p,
    )
    expect(weakestDimension(p)).toBe("systems")
  })

  it("clamps ratings to the scale", () => {
    let p = setWheelRating(emptyLdiPlan(NOW), "body", 99, NOW)
    expect(p.wheel.body).toBe(10)
    p = setWheelRating(p, "body", -4, NOW)
    expect(p.wheel.body).toBe(0)
  })

  it("requires the energy audit to be marked, not merely listed", () => {
    let p = emptyLdiPlan(NOW)
    for (let i = 0; i < LDI_ENERGY_MIN_ENTRIES; i++) p = addEnergyEntry(p, `Thing ${i}`, NOW)
    expect(sessionChecks(p, "baseline").find((c) => c.id === "energy")!.ok).toBe(false)
  })

  it("ignores a blank energy entry", () => {
    const p = addEnergyEntry(emptyLdiPlan(NOW), "   ", NOW)
    expect(p.energy).toHaveLength(0)
  })
})

describe("session 1 — focus areas", () => {
  it("replaces rather than adds when a second area in the same domain is picked", () => {
    let p = toggleFocusArea(emptyLdiPlan(NOW), "body", NOW)
    p = toggleFocusArea(p, "mind", NOW)
    expect(p.focusAreaIds).toEqual(["mind"])
  })

  it("needs one from each domain", () => {
    let p = toggleFocusArea(emptyLdiPlan(NOW), "body", NOW)
    p = toggleFocusArea(p, "family", NOW)
    expect(sessionChecks(p, "reflect").find((c) => c.id === "focus")!.ok).toBe(false)
    p = toggleFocusArea(p, "mission", NOW)
    expect(sessionChecks(p, "reflect").find((c) => c.id === "focus")!.ok).toBe(true)
  })

  it("refuses the off-wheel area as a focus", () => {
    const p = toggleFocusArea(emptyLdiPlan(NOW), "joy", NOW)
    expect(p.focusAreaIds).toEqual([])
  })
})

describe("session 2 — values ranking", () => {
  it("produces a full ranking through forced comparisons", () => {
    let p = setValueCandidates(emptyLdiPlan(NOW), ["Freedom", "Love", "Growth", "Health", "Peace"], NOW)
    p = startValueRanking(p, NOW)
    let guard = 0
    while (currentValueQuestion(p) && guard++ < 100) p = answerValueQuestion(p, true, NOW)
    expect(p.values.ranked).toHaveLength(5)
    expect(new Set(p.values.ranked).size).toBe(5)
  })

  it("puts the consistently-preferred value first", () => {
    let p = setValueCandidates(emptyLdiPlan(NOW), ["Freedom", "Love", "Growth"], NOW)
    p = startValueRanking(p, NOW)
    let guard = 0
    // The pending item always wins, so the last one placed ends up on top.
    while (currentValueQuestion(p) && guard++ < 50) p = answerValueQuestion(p, true, NOW)
    expect(p.values.ranked[0]).toBe("Growth")
  })

  it("discards a stale ranking when the candidate list changes", () => {
    let p = setValueCandidates(emptyLdiPlan(NOW), ["Freedom", "Love", "Growth"], NOW)
    p = startValueRanking(p, NOW)
    let guard = 0
    while (currentValueQuestion(p) && guard++ < 50) p = answerValueQuestion(p, true, NOW)
    expect(p.values.ranked).toHaveLength(3)
    p = setValueCandidates(p, ["Freedom", "Love", "Security"], NOW)
    expect(p.values.ranked).toEqual([])
    expect(p.values.pairwise).toBeNull()
  })
})

describe("session 3 — the hour budget refuses to overspend", () => {
  it("reports remaining hours against what was declared", () => {
    let p = setConstraints(emptyLdiPlan(NOW), { weeklyHours: 10 }, NOW)
    p = togglePortfolioArea(p, "body", NOW)
    p = setBudget(p, "body", 4, NOW)
    expect(budgetRemaining(p)).toBe(6)
    expect(budgetOverAllocated(p)).toBe(false)
  })

  it("flags an over-allocated week", () => {
    let p = setConstraints(emptyLdiPlan(NOW), { weeklyHours: 5 }, NOW)
    p = togglePortfolioArea(p, "body", NOW)
    p = togglePortfolioArea(p, "mission", NOW)
    p = setBudget(p, "body", 4, NOW)
    p = setBudget(p, "mission", 4, NOW)
    expect(budgetOverAllocated(p)).toBe(true)
    expect(coherenceWarnings(p).some((w) => w.id === "budget-over")).toBe(true)
  })

  it("caps the active portfolio", () => {
    let p = emptyLdiPlan(NOW)
    for (const id of ["body", "mind", "soul", "romance", "family", "friends"]) {
      p = togglePortfolioArea(p, id, NOW)
    }
    expect(p.portfolioAreaIds).toHaveLength(5)
  })

  it("drops the hours when an area leaves the portfolio", () => {
    let p = togglePortfolioArea(emptyLdiPlan(NOW), "body", NOW)
    p = setBudget(p, "body", 4, NOW)
    p = togglePortfolioArea(p, "body", NOW)
    expect(p.budget.body).toBeUndefined()
  })
})

describe("focus and portfolio stay one decision", () => {
  it("seeds the portfolio from the focus areas", () => {
    let p = completeReflect(emptyLdiPlan(NOW))
    expect(p.portfolioAreaIds).toEqual([])
    p = seedPortfolioFromFocus(p, NOW)
    expect(p.portfolioAreaIds).toEqual(p.focusAreaIds)
  })

  it("does not re-seed a portfolio the user has deliberately changed", () => {
    let p = seedPortfolioFromFocus(completeReflect(emptyLdiPlan(NOW)), NOW)
    p = togglePortfolioArea(p, "body", NOW)
    const trimmed = [...p.portfolioAreaIds]
    p = seedPortfolioFromFocus(p, NOW)
    expect(p.portfolioAreaIds).toEqual(trimmed)
  })

  it("leaves an untouched plan alone when there are no focus areas", () => {
    const p = seedPortfolioFromFocus(emptyLdiPlan(NOW), NOW)
    expect(p.portfolioAreaIds).toEqual([])
    expect(p.seq).toBe(0)
  })

  it("keys celebrations to the portfolio, not the focus list", () => {
    let p = completeReflect(emptyLdiPlan(NOW))
    p = seedPortfolioFromFocus(p, NOW)
    // Swap one area out: the celebration requirement must follow the swap.
    p = togglePortfolioArea(p, "body", NOW)
    p = togglePortfolioArea(p, "money", NOW)
    p = p.portfolioAreaIds.reduce((acc, id) => setCelebration(acc, id, "Worth celebrating.", NOW), p)
    expect(celebrationsComplete(p)).toBe(true)
    expect(p.celebrations.body).toBeUndefined()
  })

  it("drops the celebration when an area leaves the portfolio", () => {
    let p = togglePortfolioArea(emptyLdiPlan(NOW), "body", NOW)
    p = setCelebration(p, "body", "Something.", NOW)
    p = togglePortfolioArea(p, "body", NOW)
    expect(p.celebrations.body).toBeUndefined()
  })
})

describe("step-level gaps", () => {
  it("names what is blank on the current screen", () => {
    const p = emptyLdiPlan(NOW)
    expect(stepGaps(p, "baseline", "intake-vision")).toHaveLength(1)
    expect(stepGaps(p, "baseline", "wheel")[0]).toMatch(/Every area rated/)
  })

  it("clears once the screen is answered", () => {
    const p = withWheel(emptyLdiPlan(NOW))
    expect(stepGaps(p, "baseline", "wheel")).toHaveLength(0)
  })

  it("asks nothing of an intro screen", () => {
    expect(stepGaps(emptyLdiPlan(NOW), "baseline", "intro")).toHaveLength(0)
    expect(stepGaps(emptyLdiPlan(NOW), "direction", "odyssey-compare")).toHaveLength(0)
  })

  it("scopes each odyssey screen to its own future", () => {
    let p = emptyLdiPlan(NOW)
    p = setOdyssey(p, 0, { body: "A life.", processAppeals: true }, NOW)
    LDI_ODYSSEY_SCORES.forEach((s) => {
      p = setOdysseyScore(p, 0, s.id, 3, NOW)
    })
    expect(stepGaps(p, "direction", "odyssey-current")).toHaveLength(0)
    expect(stepGaps(p, "direction", "odyssey-alternative").length).toBeGreaterThan(0)
  })
})

describe("locks explain themselves and can be overridden", () => {
  it("says which session is blocking and what it needs", () => {
    const reason = lockReason(emptyLdiPlan(NOW), "reflect")
    expect(reason).toMatch(/Finish baseline first/)
    expect(reason).toMatch(/assessment answered/i)
  })

  it("returns nothing for the first session or an unlocked one", () => {
    expect(lockReason(emptyLdiPlan(NOW), "baseline")).toBeNull()
    expect(lockReason(completeBaseline(emptyLdiPlan(NOW)), "reflect")).toBeNull()
  })

  it("opens a locked session without marking it done", () => {
    let p = emptyLdiPlan(NOW)
    expect(ldiProgress(p).sessions[1].unlocked).toBe(false)
    p = overrideSessionLock(p, "reflect", NOW)
    const progress = ldiProgress(p)
    expect(progress.sessions[1].unlocked).toBe(true)
    expect(progress.sessions[1].overridden).toBe(true)
    // The override must not inflate what is actually finished.
    expect(progress.sessions[1].complete).toBe(false)
    expect(progress.done).toBe(0)
  })

  it("lets the chain continue past an overridden session", () => {
    let p = overrideSessionLock(emptyLdiPlan(NOW), "reflect", NOW)
    expect(ldiProgress(p).sessions[2].unlocked).toBe(true)
  })
})

describe("session 4 — the realism floor", () => {
  it("names every missing field", () => {
    const p = addGoal(emptyLdiPlan(NOW), "body", "Run a half marathon", null, NOW)
    const gaps = goalGaps(p.goals[0])
    expect(gaps).toContain("Facts")
    expect(gaps).toContain("Anti-goals")
    expect(gaps).toContain("Lead indicator")
    expect(gaps.length).toBe(LDI_GOAL_FIELDS.length + 3)
  })

  it("does not block before the percentages are answered", () => {
    const p = addGoal(emptyLdiPlan(NOW), "body", "Run", null, NOW)
    expect(realismBlocked(p.goals[0])).toBe(false)
    expect(realismMessage(p.goals[0])).toBeNull()
  })

  it("blocks below the floor on either percentage", () => {
    let p = addGoal(emptyLdiPlan(NOW), "body", "Run", null, NOW)
    const id = p.goals[0].id
    p = fillGoal(p, id)
    expect(goalReady(p.goals[0])).toBe(true)

    p = updateGoal(p, id, { realismPractice: LDI_REALISM_FLOOR - 1 }, NOW)
    expect(realismBlocked(p.goals[0])).toBe(true)
    expect(goalReady(p.goals[0])).toBe(false)
    expect(realismMessage(p.goals[0])).toMatch(/would follow/)

    p = updateGoal(p, id, { realismPractice: 90, realismTheory: LDI_REALISM_FLOOR - 1 }, NOW)
    expect(realismMessage(p.goals[0])).toMatch(/steps need to change/)
  })

  it("accepts exactly the floor", () => {
    let p = addGoal(emptyLdiPlan(NOW), "body", "Run", null, NOW)
    p = fillGoal(p, p.goals[0].id)
    p = updateGoal(p, p.goals[0].id, { realismTheory: LDI_REALISM_FLOOR, realismPractice: LDI_REALISM_FLOOR }, NOW)
    expect(realismBlocked(p.goals[0])).toBe(false)
  })

  it("says both numbers are wrong when both are", () => {
    let p = addGoal(emptyLdiPlan(NOW), "body", "Run", null, NOW)
    p = fillGoal(p, p.goals[0].id)
    p = updateGoal(p, p.goals[0].id, { realismTheory: 10, realismPractice: 10 }, NOW)
    expect(realismMessage(p.goals[0])).toMatch(/Change the plan, not the numbers/)
  })
})

describe("session 5 — the fit test", () => {
  it("fails a finished goal with no block in the week", () => {
    let p = addGoal(emptyLdiPlan(NOW), "body", "Run", null, NOW)
    p = fillGoal(p, p.goals[0].id)
    expect(fitTestFailures(p)).toHaveLength(1)
    expect(fitTestPasses(p)).toBe(false)
  })

  it("passes once the goal is blocked in", () => {
    let p = addGoal(emptyLdiPlan(NOW), "body", "Run", null, NOW)
    p = fillGoal(p, p.goals[0].id)
    p = addWeekBlock(p, "mon", "early", "Long run", p.goals[0].id, 2, NOW)
    expect(fitTestPasses(p)).toBe(true)
  })

  it("ignores unfinished goals, which are not yet the week's problem", () => {
    const p = addGoal(emptyLdiPlan(NOW), "body", "Run", null, NOW)
    expect(fitTestFailures(p)).toHaveLength(0)
  })

  it("removes a goal's blocks with the goal", () => {
    let p = addGoal(emptyLdiPlan(NOW), "body", "Run", null, NOW)
    const id = p.goals[0].id
    p = addWeekBlock(p, "mon", "early", "Long run", id, 2, NOW)
    p = removeGoal(p, id, NOW)
    expect(p.week).toHaveLength(0)
  })
})

describe("coherence warnings", () => {
  it("flags a top value that no goal mentions", () => {
    let p = setValueCandidates(emptyLdiPlan(NOW), ["Freedom", "Love", "Growth"], NOW)
    p = startValueRanking(p, NOW)
    let guard = 0
    while (currentValueQuestion(p) && guard++ < 50) p = answerValueQuestion(p, true, NOW)
    p = addGoal(p, "body", "Run a half marathon", null, NOW)
    expect(coherenceWarnings(p).some((w) => w.id === "values-orphaned")).toBe(true)
  })

  it("stays quiet when the goal speaks to the value", () => {
    let p = setValueCandidates(emptyLdiPlan(NOW), ["Freedom"], NOW)
    p = { ...p, values: { ...p.values, ranked: ["Freedom"] } }
    p = addGoal(p, "money", "Build enough freedom to choose my work", null, NOW)
    expect(coherenceWarnings(p).some((w) => w.id === "values-orphaned")).toBe(false)
  })

  it("flags a focus area dropped from the portfolio", () => {
    let p = toggleFocusArea(emptyLdiPlan(NOW), "body", NOW)
    p = togglePortfolioArea(p, "mission", NOW)
    expect(coherenceWarnings(p).some((w) => w.id === "focus-dropped")).toBe(true)
  })

  it("flags a non-negotiable that no anti-goal protects", () => {
    let p = setConstraints(emptyLdiPlan(NOW), { nonNegotiables: "Evenings with my daughter." }, NOW)
    p = addGoal(p, "mission", "Launch the business", null, NOW)
    p = setGoalField(p, p.goals[0].id, "antiGoals", "I do not want to lose weekends.", NOW)
    expect(coherenceWarnings(p).some((w) => w.id === "nonneg-unprotected")).toBe(true)
  })

  it("stays quiet once the anti-goal names it", () => {
    let p = setConstraints(emptyLdiPlan(NOW), { nonNegotiables: "Evenings with my daughter." }, NOW)
    p = addGoal(p, "mission", "Launch the business", null, NOW)
    p = setGoalField(p, p.goals[0].id, "antiGoals", "Nothing that touches evenings with my daughter.", NOW)
    expect(coherenceWarnings(p).some((w) => w.id === "nonneg-unprotected")).toBe(false)
  })
})

describe("storage", () => {
  it("round-trips a completed plan", () => {
    let p = completeBaseline(emptyLdiPlan(NOW))
    p = completeReflect(p)
    p = completeDirection(p)
    const restored = loadLdiPlan(serializeLdiPlan(p))
    expect(restored).not.toBeNull()
    expect(restored!.values.ranked).toEqual(p.values.ranked)
    expect(restored!.constraints.weeklyHours).toBe(10)
    expect(ldiProgress(restored!).done).toBe(3)
    expect(ldiProgress(restored!).nextSessionId).toBe("converge")
  })

  it("returns null rather than guessing at unusable input", () => {
    expect(loadLdiPlan(null)).toBeNull()
    expect(loadLdiPlan("not json")).toBeNull()
    expect(loadLdiPlan(JSON.stringify({ v: 999 }))).toBeNull()
  })

  it("fills in sub-fields an older plan never had", () => {
    const partial = JSON.stringify({ ...emptyLdiPlan(NOW), constraints: { weeklyHours: 6 } })
    const restored = loadLdiPlan(partial)
    expect(restored!.constraints.money).toBe("")
    expect(restored!.constraints.weeklyHours).toBe(6)
  })
})

describe("mutations", () => {
  it("advances seq and updatedAt on every change", () => {
    const p0 = emptyLdiPlan(NOW)
    const p1 = setWheelRating(p0, "body", 5, "2026-08-10T00:00:00.000Z")
    expect(p1.seq).toBe(p0.seq + 1)
    expect(p1.updatedAt).toBe("2026-08-10T00:00:00.000Z")
  })

  it("does not mutate the plan it was given", () => {
    const p0 = emptyLdiPlan(NOW)
    setWheelRating(p0, "body", 5, NOW)
    addGoal(p0, "body", "Run", null, NOW)
    expect(p0.wheel.body).toBeUndefined()
    expect(p0.goals).toHaveLength(0)
  })
})

describe("plan as text", () => {
  it("prints only what has been answered", () => {
    const text = planAsText(emptyLdiPlan(NOW))
    expect(text).toContain("LIFE DIRECTION")
    expect(text).not.toContain("GOALS")
    expect(text).not.toContain("VALUES")
  })

  it("prints the ranked values and the goals once they exist", () => {
    let p = completeBaseline(emptyLdiPlan(NOW))
    p = completeReflect(p)
    p = completeDirection(p)
    p = completeConverge(p)
    p = completeGoals(p)
    const text = planAsText(p)
    expect(text).toContain("VALUES, IN ORDER")
    expect(text).toContain("GOALS")
    expect(text).toContain("Lead indicator")
  })
})

describe("content integrity", () => {
  it("has the ten areas across three domains plus one off the wheel", () => {
    expect(LDI_AREAS).toHaveLength(10)
    expect(LDI_AREAS.filter((a) => a.domain === null)).toHaveLength(1)
    expect(LDI_AREAS.filter((a) => a.domain === "health")).toHaveLength(3)
  })

  it("has twenty assessment items evenly split", () => {
    expect(LDI_INTAKE_ITEMS).toHaveLength(20)
    for (const dim of ["vision", "prioritisation", "systems", "presence"]) {
      expect(LDI_INTAKE_ITEMS.filter((i) => i.dimension === dim)).toHaveLength(5)
    }
  })

  it("has ten eulogy stems and eight reflection prompts", () => {
    expect(LDI_EULOGY_STEMS).toHaveLength(10)
    expect(LDI_REFLECT_PROMPTS).toHaveLength(8)
  })

  it("gives every session at least one check", () => {
    const plan = emptyLdiPlan(NOW)
    for (const s of LDI_SESSIONS) expect(sessionChecks(plan, s.id).length).toBeGreaterThan(0)
  })

  it("uses unique ids throughout", () => {
    const ids = [
      LDI_AREAS.map((a) => a.id),
      LDI_INTAKE_ITEMS.map((i) => i.id),
      LDI_GOAL_FIELDS.map((f) => f.id),
      LDI_SESSIONS.map((s) => s.id),
    ]
    for (const list of ids) expect(new Set(list).size).toBe(list.length)
  })
})
