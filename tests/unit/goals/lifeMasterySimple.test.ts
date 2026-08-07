import { describe, it, expect } from "vitest"
import {
  addCustomArea,
  addGoal,
  answerOf,
  emptyLifeMasteryPlan,
  formatTargetDate,
  goalIsQualified,
  goalsForArea,
  loadLifeMasteryPlan,
  planProgress,
  qualifyWarnings,
  removeCustomArea,
  removeGoal,
  renameArea,
  resolveAreas,
  assembleVision,
  rungSentences,
  setHorizon,
  visionFrame,
  serializeLifeMasteryPlan,
  splitGoalLines,
  setAnswer,
  suggestSentence,
  toggleAreaHidden,
  updateGoal,
  CUSTOM_AREA_COLOR,
} from "@/src/goals/lifeMasteryService"
import { LIFE_MASTERY_AREAS } from "@/src/goals/data/lifeMasteryAreas"
import {
  ANSWER_IDS, DEFAULT_HORIZON, GOAL_WHY_ANGLES, HORIZON_CHOICES, HORIZON_SCREEN, HORIZON_WORDS,
  IDENTITY_PROMPTS, VISION_DRAFT_SCREEN, VISION_RUNGS, WHY_PROMPTS,
} from "@/src/goals/data/lifeMasteryWhy"

const NOW = "2026-08-03T10:00:00.000Z"

describe("lifeMasteryService — step 1, the why", () => {
  it("stores an answer and stamps the change", () => {
    const plan = setAnswer(emptyLifeMasteryPlan(), "vision", "A house near the water.", NOW)
    expect(answerOf(plan, "vision")).toBe("A house near the water.")
    expect(plan.updatedAt).toBe(NOW)
  })

  it("counts whitespace as unanswered", () => {
    const plan = setAnswer(emptyLifeMasteryPlan(), "vision", "   \n  ", NOW)
    expect(planProgress(plan).visionAnswered).toBe(false)
  })

  it("marks step 1 done only when both vision and why are written", () => {
    let plan = setAnswer(emptyLifeMasteryPlan(), "vision", "The picture.", NOW)
    expect(planProgress(plan).done.why).toBe(false)
    plan = setAnswer(plan, "why", "Because of my kids.", NOW)
    expect(planProgress(plan).done.why).toBe(true)
  })

  it("counts the ladder rungs separately from the vision and the why", () => {
    let plan = setAnswer(emptyLifeMasteryPlan(), "vision", "The picture.", NOW)
    plan = setAnswer(plan, "why", "The reason.", NOW)
    plan = setAnswer(plan, "place", "a small house near the water", NOW)
    plan = setAnswer(plan, "people", "my partner and our two kids", NOW)
    const p = planProgress(plan)
    expect(p.rungsAnswered).toBe(2)
    expect(p.done.why).toBe(true)
  })
})

describe("lifeMasteryService — how far out the vision sits", () => {
  it("starts at ten years, the horizon he names most", () => {
    expect(emptyLifeMasteryPlan().horizonYears).toBe(10)
    expect(DEFAULT_HORIZON).toBe(10)
    expect(HORIZON_CHOICES).toContain(DEFAULT_HORIZON)
  })

  it("offers exactly the horizons the opening screen shows, in the same order", () => {
    expect(HORIZON_SCREEN.options.map((o) => o.years)).toEqual([...HORIZON_CHOICES])
    expect(HORIZON_SCREEN.options.filter((o) => !o.label.trim() || !o.note.trim())).toEqual([])
  })

  it("writes the frame in words for every horizon offered", () => {
    expect(visionFrame(5)).toBe("Five years from now, on an ordinary Tuesday.")
    expect(visionFrame(10)).toBe("Ten years from now, on an ordinary Tuesday.")
    expect(visionFrame(20)).toBe("Twenty years from now, on an ordinary Tuesday.")
    expect(HORIZON_CHOICES.filter((y) => !HORIZON_WORDS[y])).toEqual([])
  })

  it("takes a horizon he offers and refuses one he does not", () => {
    expect(setHorizon(emptyLifeMasteryPlan(), 20, NOW).horizonYears).toBe(20)
    // Three years is his GOAL horizon. Offering it as a vision frame is what
    // turned the vision into a plan in v2.
    const refused = setHorizon(emptyLifeMasteryPlan(), 3, NOW)
    expect(refused.horizonYears).toBe(10)
    expect(refused.updatedAt).toBeNull()
  })

  it("keeps a saved horizon and repairs one that is not on offer", () => {
    const saved = (years: unknown) => JSON.stringify({ ...emptyLifeMasteryPlan(), horizonYears: years })
    expect(loadLifeMasteryPlan(saved(20))!.horizonYears).toBe(20)
    expect(loadLifeMasteryPlan(saved(3))!.horizonYears).toBe(10)
    expect(loadLifeMasteryPlan(saved("ten"))!.horizonYears).toBe(10)
    expect(loadLifeMasteryPlan(JSON.stringify({ answers: {} }))!.horizonYears).toBe(10)
  })

  it("does not put the horizon in the vision paragraph", () => {
    let plan = setHorizon(emptyLifeMasteryPlan(), 20, NOW)
    plan = setAnswer(plan, "place", "a house near the water", NOW)
    expect(assembleVision(plan)).toBe("I wake up in a house near the water.")
  })
})

describe("lifeMasteryService — step 2, the areas", () => {
  it("resolves the twelve Blueprint areas in Blueprint order", () => {
    const areas = resolveAreas(emptyLifeMasteryPlan())
    expect(areas).toHaveLength(LIFE_MASTERY_AREAS.length)
    expect(areas.map((a) => a.id)).toEqual(LIFE_MASTERY_AREAS.map((a) => a.id))
    expect(areas.every((a) => !a.hidden && !a.custom && !a.renamed)).toBe(true)
  })

  it("renames an area and flags it as renamed", () => {
    const plan = renameArea(emptyLifeMasteryPlan(), "lm_money", "Freedom fund", NOW)
    const area = resolveAreas(plan).find((a) => a.id === "lm_money")!
    expect(area.label).toBe("Freedom fund")
    expect(area.renamed).toBe(true)
  })

  it("clears the rename when the Blueprint name is typed back in", () => {
    let plan = renameArea(emptyLifeMasteryPlan(), "lm_money", "Freedom fund", NOW)
    plan = renameArea(plan, "lm_money", "Money", NOW)
    const area = resolveAreas(plan).find((a) => a.id === "lm_money")!
    expect(area.renamed).toBe(false)
    expect(plan.areaEdits.lm_money.label).toBeUndefined()
  })

  it("clears the rename when the field is emptied", () => {
    let plan = renameArea(emptyLifeMasteryPlan(), "lm_fun", "Play", NOW)
    plan = renameArea(plan, "lm_fun", "   ", NOW)
    expect(resolveAreas(plan).find((a) => a.id === "lm_fun")!.label).toBe("Fun")
  })

  it("hides and unhides an area", () => {
    let plan = toggleAreaHidden(emptyLifeMasteryPlan(), "lm_spirituality", NOW)
    expect(resolveAreas(plan).find((a) => a.id === "lm_spirituality")!.hidden).toBe(true)
    plan = toggleAreaHidden(plan, "lm_spirituality", NOW)
    expect(resolveAreas(plan).find((a) => a.id === "lm_spirituality")!.hidden).toBe(false)
  })

  it("adds a custom area after the twelve, with the neutral colour", () => {
    const plan = addCustomArea(emptyLifeMasteryPlan(), "Music", NOW)
    const areas = resolveAreas(plan)
    expect(areas).toHaveLength(LIFE_MASTERY_AREAS.length + 1)
    expect(areas[areas.length - 1]).toMatchObject({ label: "Music", custom: true, color: CUSTOM_AREA_COLOR })
  })

  it("ignores an empty custom area name", () => {
    const plan = addCustomArea(emptyLifeMasteryPlan(), "  ", NOW)
    expect(plan.customAreas).toHaveLength(0)
  })

  it("takes the goals with it when a custom area is removed", () => {
    let plan = addCustomArea(emptyLifeMasteryPlan(), "Music", NOW)
    const areaId = plan.customAreas[0].id
    plan = addGoal(plan, areaId, "Play a gig", NOW)
    plan = addGoal(plan, "lm_money", "Pay off the card", NOW)
    plan = removeCustomArea(plan, areaId, NOW)
    expect(plan.customAreas).toHaveLength(0)
    expect(plan.goals.map((g) => g.title)).toEqual(["Pay off the card"])
  })

  it("adds goals with running ids and keeps them in their area", () => {
    let plan = addGoal(emptyLifeMasteryPlan(), "lm_fitness", "Bench 80 kg", NOW)
    plan = addGoal(plan, "lm_fitness", "10 pull-ups", NOW)
    plan = addGoal(plan, "lm_money", "Pay off the card", NOW)
    expect(plan.goals.map((g) => g.id)).toEqual(["g1", "g2", "g3"])
    expect(goalsForArea(plan, "lm_fitness").map((g) => g.title)).toEqual(["Bench 80 kg", "10 pull-ups"])
  })

  it("never reuses an id after a delete", () => {
    let plan = addGoal(emptyLifeMasteryPlan(), "lm_fitness", "Bench 80 kg", NOW)
    plan = addGoal(plan, "lm_fitness", "10 pull-ups", NOW)
    plan = removeGoal(plan, "g2", NOW)
    plan = addGoal(plan, "lm_fitness", "Run 10k", NOW)
    expect(plan.goals.map((g) => g.id)).toEqual(["g1", "g3"])
  })

  it("ignores an empty goal title", () => {
    const plan = addGoal(emptyLifeMasteryPlan(), "lm_fitness", "   ", NOW)
    expect(plan.goals).toHaveLength(0)
    expect(plan.updatedAt).toBeNull()
  })

  it("splits a pasted list into one goal per line", () => {
    expect(splitGoalLines("Bench 80 kg\n10 pull-ups\n\nRun 10k")).toEqual(["Bench 80 kg", "10 pull-ups", "Run 10k"])
  })

  it("takes the bullets and numbering off a pasted list", () => {
    expect(splitGoalLines("- Bench 80 kg\n  * 10 pull-ups\n1. Run 10k\n2) Swim\n• Stretch\n– Sleep"))
      .toEqual(["Bench 80 kg", "10 pull-ups", "Run 10k", "Swim", "Stretch", "Sleep"])
  })

  it("keeps a hyphen that is part of the goal itself", () => {
    expect(splitGoalLines("10 strict pull-ups")).toEqual(["10 strict pull-ups"])
    expect(splitGoalLines("Read 30-40 pages a day")).toEqual(["Read 30-40 pages a day"])
  })

  it("handles windows line endings and a list that is all bullets", () => {
    expect(splitGoalLines("Bench 80 kg\r\n- 10 pull-ups")).toEqual(["Bench 80 kg", "10 pull-ups"])
    expect(splitGoalLines("-\n-\n")).toEqual(["-", "-"])
  })

  it("marks step 2 done as soon as one goal exists", () => {
    const plan = addGoal(emptyLifeMasteryPlan(), "lm_fitness", "Bench 80 kg", NOW)
    const p = planProgress(plan)
    expect(p.done.areas).toBe(true)
    expect(p.goals).toBe(1)
    expect(p.areasWithGoals).toBe(1)
  })
})

describe("lifeMasteryService — step 3, a why per goal", () => {
  const withGoals = () => {
    let plan = addGoal(emptyLifeMasteryPlan(), "lm_fitness", "Bench 80 kg", NOW)
    plan = addGoal(plan, "lm_money", "Pay off the card", NOW)
    return plan
  }

  it("is not done until every goal carries a why", () => {
    let plan = withGoals()
    plan = updateGoal(plan, "g1", { why: "Because I want to feel strong." }, NOW)
    expect(planProgress(plan).done.goals).toBe(false)
    plan = updateGoal(plan, "g2", { why: "Because the interest is eating me." }, NOW)
    const p = planProgress(plan)
    expect(p.done.goals).toBe(true)
    expect(p.goalsWithWhy).toBe(2)
  })

  it("does not count a blank why", () => {
    let plan = withGoals()
    plan = updateGoal(plan, "g1", { why: "   " }, NOW)
    expect(planProgress(plan).goalsWithWhy).toBe(0)
  })

  it("writes the sentence with the date when there is one", () => {
    expect(suggestSentence({ title: "Bench 80 kg", targetDate: "2026-12-31" }))
      .toBe("I will easily bench 80 kg by 31 December 2026.")
  })

  it("writes the sentence without a date when there is none", () => {
    expect(suggestSentence({ title: "Pay off the card", targetDate: null }))
      .toBe("I will easily pay off the card.")
  })

  it("returns nothing to suggest for an empty title", () => {
    expect(suggestSentence({ title: "  ", targetDate: "2026-12-31" })).toBe("")
  })

  it("formats and rejects dates without a locale", () => {
    expect(formatTargetDate("2026-01-05")).toBe("5 January 2026")
    expect(formatTargetDate("not-a-date")).toBe("")
    expect(formatTargetDate("2026-13-01")).toBe("")
    expect(formatTargetDate(null)).toBe("")
  })

  it("warns below 7 on belief and on desire, and stays quiet at 7", () => {
    expect(qualifyWarnings({ beliefLevel: 6, desireLevel: 9 })).toHaveLength(1)
    expect(qualifyWarnings({ beliefLevel: 9, desireLevel: 3 })).toHaveLength(1)
    expect(qualifyWarnings({ beliefLevel: 4, desireLevel: 4 })).toHaveLength(2)
    expect(qualifyWarnings({ beliefLevel: 7, desireLevel: 7 })).toHaveLength(0)
  })

  it("says nothing about a rating that has not been set", () => {
    expect(qualifyWarnings({ beliefLevel: null, desireLevel: null })).toHaveLength(0)
  })

  it("calls a goal qualified only when every field is filled", () => {
    let plan = withGoals()
    plan = updateGoal(plan, "g1", {
      why: "To feel strong.", painWhy: "I stay weak.", targetDate: "2026-12-31",
      beliefLevel: 8, desireLevel: 9, sentence: "I will easily bench 80 kg by 31 December 2026.",
    }, NOW)
    expect(goalIsQualified(plan.goals[0])).toBe(true)
    expect(goalIsQualified(plan.goals[1])).toBe(false)
  })
})

describe("lifeMasteryService — storage", () => {
  const full = () => {
    let plan = setAnswer(emptyLifeMasteryPlan(), "vision", "A house near the water.", NOW)
    plan = renameArea(plan, "lm_money", "Freedom fund", NOW)
    plan = toggleAreaHidden(plan, "lm_spirituality", NOW)
    plan = addCustomArea(plan, "Music", NOW)
    plan = addGoal(plan, "lm_money", "Pay off the card", NOW)
    return updateGoal(plan, "g1", { why: "The interest is eating me.", beliefLevel: 8 }, NOW)
  }

  it("round-trips a plan without losing anything", () => {
    const plan = full()
    expect(loadLifeMasteryPlan(serializeLifeMasteryPlan(plan))).toEqual(plan)
  })

  it("returns null for nothing saved and for broken json", () => {
    expect(loadLifeMasteryPlan(null)).toBeNull()
    expect(loadLifeMasteryPlan("{ not json")).toBeNull()
    expect(loadLifeMasteryPlan("42")).toBeNull()
  })

  it("drops answers for questions that no longer exist", () => {
    const raw = JSON.stringify({ ...emptyLifeMasteryPlan(), answers: { vision: "kept", ancient_question: "dropped" } })
    expect(loadLifeMasteryPlan(raw)!.answers).toEqual({ vision: "kept" })
  })

  it("drops goals whose area no longer exists", () => {
    const raw = JSON.stringify({
      ...emptyLifeMasteryPlan(),
      goals: [
        { id: "g1", areaId: "lm_money", title: "Kept" },
        { id: "g2", areaId: "area99", title: "Orphan" },
      ],
    })
    const loaded = loadLifeMasteryPlan(raw)!
    expect(loaded.goals.map((g) => g.title)).toEqual(["Kept"])
    expect(loaded.goals[0]).toMatchObject({ why: "", painWhy: "", targetDate: null, beliefLevel: null, sentence: "" })
  })

  it("keeps goals belonging to a saved custom area", () => {
    const raw = JSON.stringify({
      ...emptyLifeMasteryPlan(),
      customAreas: [{ id: "area1", label: "Music", color: CUSTOM_AREA_COLOR }],
      goals: [{ id: "g1", areaId: "area1", title: "Play a gig" }],
    })
    expect(loadLifeMasteryPlan(raw)!.goals).toHaveLength(1)
  })

  it("derives the id counters from a save that has none", () => {
    const raw = JSON.stringify({
      version: 1, answers: {}, areaEdits: {},
      customAreas: [{ id: "area4", label: "Music", color: CUSTOM_AREA_COLOR }],
      goals: [{ id: "g7", areaId: "lm_money", title: "Pay off the card" }],
    })
    let plan = loadLifeMasteryPlan(raw)!
    plan = addGoal(plan, "lm_money", "Build the buffer", NOW)
    plan = addCustomArea(plan, "Garden", NOW)
    expect(plan.goals.map((g) => g.id)).toEqual(["g7", "g8"])
    expect(plan.customAreas.map((a) => a.id)).toEqual(["area4", "area5"])
  })

  it("survives a plan whose fields are the wrong shape", () => {
    const raw = JSON.stringify({ version: 1, answers: "nope", areaEdits: 7, customAreas: "nope", goals: { g1: {} } })
    expect(loadLifeMasteryPlan(raw)).toEqual(emptyLifeMasteryPlan())
  })
})

describe("lifeMasteryService — assembling the vision from the ladder", () => {
  const withRungs = (answers: Record<string, string>) => {
    let plan = emptyLifeMasteryPlan()
    for (const [id, text] of Object.entries(answers)) plan = setAnswer(plan, id, text, NOW)
    return plan
  }

  it("puts the lead in front of an answer that continues it", () => {
    expect(rungSentences("I wake up in", "a small house near the water"))
      .toEqual(["I wake up in a small house near the water."])
  })

  it("leaves out the lead when the answer is already a sentence about you", () => {
    expect(rungSentences("My body feels", "I train at six every morning"))
      .toEqual(["I train at six every morning."])
  })

  it("keeps the lead in front of a noun phrase that only looks like a sentence", () => {
    expect(rungSentences("The people around me are", "my partner and our two kids"))
      .toEqual(["The people around me are my partner and our two kids."])
    expect(rungSentences("The people around me are", "our neighbours, who we actually know"))
      .toEqual(["The people around me are our neighbours, who we actually know."])
  })

  it("does not print the lead twice when the answer repeats it", () => {
    expect(rungSentences("My body feels", "My body feels strong"))
      .toEqual(["My body feels strong."])
  })

  it("keeps a lead that the sentence needs, even before an I", () => {
    expect(rungSentences("If nothing was in the way,", "I would own the building"))
      .toEqual(["If nothing was in the way, I would own the building."])
  })

  it("turns each extra line into its own sentence", () => {
    expect(rungSentences("I wake up in", "a small house\nThe window is open\n\n  "))
      .toEqual(["I wake up in a small house.", "The window is open."])
  })

  it("keeps punctuation the writer already made", () => {
    expect(rungSentences("My days go into", "the business. I finish by four!"))
      .toEqual(["My days go into the business. I finish by four!"])
  })

  it("returns nothing for a rung that was skipped", () => {
    expect(rungSentences("I wake up in", "   ")).toEqual([])
  })

  it("joins the answered rungs into one paragraph, in ladder order", () => {
    const plan = withRungs({
      money: "stop counting at the till",
      place: "a small house near the water",
      body: "strong. I train before the house is up",
    })
    expect(assembleVision(plan)).toBe(
      "I wake up in a small house near the water. My body feels strong. I train before the house is up. Money means I can stop counting at the till.",
    )
  })

  it("assembles nothing when no rung is answered", () => {
    expect(assembleVision(emptyLifeMasteryPlan())).toBe("")
  })

  it("does not touch the vision paragraph itself", () => {
    const plan = setAnswer(withRungs({ place: "a flat in town" }), "vision", "My own words.", NOW)
    expect(answerOf(plan, "vision")).toBe("My own words.")
    expect(assembleVision(plan)).toBe("I wake up in a flat in town.")
  })
})

describe("lifeMasteryWhy — the questions", () => {
  it("has unique ids across every screen the flow can store", () => {
    expect(new Set(ANSWER_IDS).size).toBe(ANSWER_IDS.length)
  })

  it("keeps the abstract question last on the ladder", () => {
    expect(VISION_RUNGS[VISION_RUNGS.length - 1].id).toBe("limits")
  })

  it("gives every rung a lead, a placeholder, help and an example", () => {
    expect(VISION_RUNGS.filter((r) => !r.lead.trim() || !r.placeholder.trim() || !r.help.trim() || !r.example.trim())).toEqual([])
  })

  it("stores the vision under the id the rest of the flow reads", () => {
    expect(VISION_DRAFT_SCREEN.id).toBe("vision")
    expect(ANSWER_IDS).toContain("vision")
    expect(ANSWER_IDS).toContain("why")
  })

  it("asks for the reasons and for the cost of standing still", () => {
    expect(WHY_PROMPTS.map((p) => p.id)).toEqual(["why", "cost"])
  })

  it("keeps the identity questions off the ladder", () => {
    const rungIds = new Set(VISION_RUNGS.map((r) => r.id))
    expect(IDENTITY_PROMPTS.filter((p) => rungIds.has(p.id))).toEqual([])
    expect(IDENTITY_PROMPTS).toHaveLength(3)
  })

  it("attributes every quote to a video", () => {
    const all = [...VISION_RUNGS, ...WHY_PROMPTS, ...IDENTITY_PROMPTS]
    expect(all.filter((q) => q.quote && !q.quoteVideoId)).toEqual([])
  })

  it("keeps the goal angles unique so rotation never repeats early", () => {
    const ids = GOAL_WHY_ANGLES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
