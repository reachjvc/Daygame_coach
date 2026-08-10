import { describe, test, expect } from "vitest"

import {
  CYL_CRISIS_THRESHOLD,
  CYL_SCHEMA_VERSION,
  answerDifferential,
  candidateLines,
  checkFit,
  chooseOne,
  completedStages,
  constraintsComplete,
  defaultEndDate,
  describeMultiplier,
  differentialComplete,
  emptyPlan,
  filterCorpus,
  formatCount,
  loadPlan,
  layerCeilings,
  scoreDifferential,
  serializePlan,
  setCandidate,
  setConstraint,
  setRep,
  sortCorpus,
  stoppingOptions,
  tierCounts,
  toggleShortlist,
  visibilityAllowed,
} from "@/src/goals/changeYourLifeService"
import {
  CYL_CANDIDATE_PROMPTS,
  CYL_CONSTRAINTS,
  CYL_DIFFERENTIAL,
  CYL_STAGES,
} from "@/src/goals/data/changeYourLife"
import { CYL_CORPUS, type CylVideo } from "@/src/goals/data/changeYourLifeCorpus"

const NOW = "2026-08-09T00:00:00.000Z"

/** Answer one question by the label of the option, so tests read as behaviour. */
function pick(plan: ReturnType<typeof emptyPlan>, questionId: string, label: string) {
  const q = CYL_DIFFERENTIAL.find((x) => x.id === questionId)
  if (!q) throw new Error(`no such question: ${questionId}`)
  const idx = q.options.findIndex((o) => o.label === label)
  if (idx < 0) throw new Error(`no such option on ${questionId}: ${label}`)
  return answerDifferential(plan, questionId, idx, NOW)
}

describe("differential routing", () => {
  test("returns no primary constraint until something has been answered", () => {
    const result = scoreDifferential(emptyPlan(NOW))

    expect(result.primary).toBeNull()
    expect(result.answered).toBe(0)
    expect(result.total).toBe(CYL_DIFFERENTIAL.length)
  })

  test("routes a skill-shaped answer set to the skill layer", () => {
    let plan = emptyPlan(NOW)
    plan = pick(plan, "stops-first", "I don’t know how")
    plan = pick(plan, "real-chance", "Yes, and I froze")

    const result = scoreDifferential(plan)

    expect(result.primary?.id).toBe("skill")
    expect(result.stops).toBe(false)
  })

  test("routes an access-shaped answer set to the access layer", () => {
    let plan = emptyPlan(NOW)
    plan = pick(plan, "stops-first", "There’s nowhere and no-one to do it with")
    plan = pick(plan, "real-chance", "No — no chance came up")

    expect(scoreDifferential(plan).primary?.id).toBe("access")
  })

  test("self-harm disclosure outranks every other signal and stops the flow", () => {
    let plan = emptyPlan(NOW)
    // Stack the deck for a regulation verdict, then disclose.
    plan = pick(plan, "stops-first", "I can’t make myself")
    plan = pick(plan, "perfect-plan", "Yes, but I’d stop within a few days")
    plan = pick(plan, "already-know", "Yes, and I can name it right now")
    expect(scoreDifferential(plan).primary?.id).toBe("regulation")

    plan = pick(plan, "floor", "I’ve been having thoughts of hurting myself")

    const result = scoreDifferential(plan)
    expect(result.primary?.id).toBe("crisis")
    expect(result.stops).toBe(true)
  })

  test("exactly one answer in the whole differential halts the flow", () => {
    // Guards against someone later adding a second route to a stop by giving
    // an unrelated answer a large crisis weight.
    const stoppers = stoppingOptions()

    expect(stoppers).toHaveLength(1)
    expect(stoppers[0].questionId).toBe("floor")
    expect(stoppers[0].label).toContain("hurting myself")
  })

  test("crisis cannot be reached by accumulating ordinary answers", () => {
    // Layer scores are independent and crisis is an override, not a ranked
    // comparison — so the invariant is about the crisis total specifically:
    // every crisis weight *except* the disclosure itself must sum below the
    // threshold, or a run of unlucky ordinary answers would halt the flow.
    let accumulated = 0
    for (const q of CYL_DIFFERENTIAL) {
      const best = Math.max(
        0,
        ...q.options
          .map((o) => o.weights.crisis ?? 0)
          .filter((w) => w < CYL_CRISIS_THRESHOLD),
      )
      accumulated += best
    }

    expect(accumulated).toBeLessThan(CYL_CRISIS_THRESHOLD)
  })

  test("the ceiling helper takes the best option per question, not every option", () => {
    // Guards the helper the invariant above relies on. "real-chance" carries two
    // options that both score access (3 and 2); they are mutually exclusive, so
    // the question may contribute 3 to the ceiling and never 5.
    const realChance = CYL_DIFFERENTIAL.find((q) => q.id === "real-chance")!
    const accessOptions = realChance.options.map((o) => o.weights.access ?? 0).filter((w) => w > 0)
    expect(accessOptions.length, "fixture assumption").toBeGreaterThan(1)

    const naive = accessOptions.reduce((a, b) => a + b, 0)
    const perQuestionBest = Math.max(...accessOptions)

    const ceilingWithout = CYL_DIFFERENTIAL.filter((q) => q.id !== "real-chance").reduce(
      (sum, q) => sum + Math.max(0, ...q.options.map((o) => o.weights.access ?? 0)),
      0,
    )

    expect(layerCeilings().get("access")).toBe(ceilingWithout + perQuestionBest)
    expect(layerCeilings().get("access")).toBeLessThan(ceilingWithout + naive)
  })

  test("answering every question the worst possible way still never stops the flow", () => {
    // The strongest form of the invariant: pick the highest-scoring non-stopping
    // option for each question and confirm the flow still prescribes.
    let plan = emptyPlan(NOW)
    for (const q of CYL_DIFFERENTIAL) {
      let bestIdx = 0
      let bestWeight = -1
      q.options.forEach((o, i) => {
        if ((o.weights.crisis ?? 0) >= CYL_CRISIS_THRESHOLD) return
        const total = Object.values(o.weights).reduce((a: number, b) => a + (b ?? 0), 0)
        if (total > bestWeight) {
          bestWeight = total
          bestIdx = i
        }
      })
      plan = answerDifferential(plan, q.id, bestIdx, NOW)
    }

    const result = scoreDifferential(plan)
    expect(result.primary?.id).not.toBe("crisis")
    expect(result.crisis).not.toBe("stop")
  })

  test("a sub-threshold crisis score never becomes the primary constraint", () => {
    // Regression: the crisis layer was being picked from the unfiltered ranking,
    // so answering only the anhedonia option made "crisis" the top score on
    // points and rendered the stop copy under a normal heading.
    let plan = emptyPlan(NOW)
    plan = pick(plan, "floor", "I’ve stopped doing things I used to enjoy")

    const result = scoreDifferential(plan)

    expect(result.crisis).toBe("soft")
    expect(result.stops).toBe(false)
    expect(result.primary?.id).not.toBe("crisis")
    expect(result.ranked.every((r) => r.layer.id !== "crisis")).toBe(true)
  })

  test("a sub-threshold crisis signal is surfaced rather than discarded", () => {
    let plan = emptyPlan(NOW)
    plan = pick(plan, "stops-first", "I can’t make myself")
    expect(scoreDifferential(plan).crisis).toBe("none")

    plan = pick(plan, "floor", "I’ve stopped doing things I used to enjoy")

    const result = scoreDifferential(plan)
    expect(result.crisis).toBe("soft")
    expect(result.stops).toBe(false)
    expect(result.primary?.id).not.toBe("crisis")
  })

  test("routes a circumstances verdict to a stop rather than a protocol", () => {
    let plan = emptyPlan(NOW)
    plan = pick(plan, "stops-first", "There isn’t time or money for it")
    plan = pick(plan, "perfect-plan", "No — my week isn’t mine to spend")
    plan = pick(plan, "control", "No — I don’t control the place I live")

    const result = scoreDifferential(plan)
    expect(result.primary?.id).toBe("material")
    expect(result.stops).toBe(true)
  })

  test("ties break deterministically, so the same answers always give the same verdict", () => {
    let plan = emptyPlan(NOW)
    plan = pick(plan, "stops-first", "I don’t know how")

    const first = scoreDifferential(plan).primary?.id
    const second = scoreDifferential(plan).primary?.id
    const third = scoreDifferential(loadPlan(serializePlan(plan))!).primary?.id

    expect(first).toBe(second)
    expect(third).toBe(first)
  })

  test("crisis is not offered as a ranked alternative in the normal case", () => {
    let plan = emptyPlan(NOW)
    plan = pick(plan, "stops-first", "I don’t know how")

    const result = scoreDifferential(plan)
    expect(result.ranked.some((r) => r.layer.id === "crisis")).toBe(false)
  })

  test("differentialComplete only once every question is answered", () => {
    let plan = emptyPlan(NOW)
    for (const q of CYL_DIFFERENTIAL.slice(0, -1)) {
      plan = answerDifferential(plan, q.id, 0, NOW)
    }
    expect(differentialComplete(plan)).toBe(false)

    plan = answerDifferential(plan, CYL_DIFFERENTIAL[CYL_DIFFERENTIAL.length - 1].id, 0, NOW)
    expect(differentialComplete(plan)).toBe(true)
  })
})

describe("the fit test", () => {
  test("refuses a rep that costs more hours than the user said they have", () => {
    let plan = emptyPlan(NOW)
    plan = setConstraint(plan, "hours", "2", NOW)
    plan = setRep(plan, { minutesPerDay: 60, daysPerWeek: 5 }, NOW)

    const verdict = checkFit(plan)

    expect(verdict.ok).toBe(false)
    expect(verdict.needed).toBe(5)
    expect(verdict.available).toBe(2)
    expect(verdict.message).toContain("Make the rep smaller")
  })

  test("accepts a rep that fits inside the stated week", () => {
    let plan = emptyPlan(NOW)
    plan = setConstraint(plan, "hours", "4", NOW)
    plan = setRep(plan, { minutesPerDay: 10, daysPerWeek: 5 }, NOW)

    const verdict = checkFit(plan)

    expect(verdict.ok).toBe(true)
    expect(verdict.needed).toBeCloseTo(0.8, 5)
  })

  test("refuses before hours are known rather than assuming a default", () => {
    const verdict = checkFit(emptyPlan(NOW))

    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain("haven’t said how many hours")
  })

  test("declines to treat under an hour a week as a habit problem", () => {
    let plan = emptyPlan(NOW)
    plan = setConstraint(plan, "hours", "0.5", NOW)
    plan = setRep(plan, { minutesPerDay: 2, daysPerWeek: 5 }, NOW)

    const verdict = checkFit(plan)

    expect(verdict.ok).toBe(false)
    expect(verdict.message).toContain("Sort the week first")
  })
})

describe("selection turns a cut into an explicit deferral", () => {
  test("everything not chosen becomes a deferral, not a silent drop", () => {
    let plan = emptyPlan(NOW)
    plan = toggleShortlist(plan, "learn to cook", NOW)
    plan = toggleShortlist(plan, "run a 10k", NOW)
    plan = toggleShortlist(plan, "start writing", NOW)

    plan = chooseOne(plan, "run a 10k", NOW)

    expect(plan.chosen).toBe("run a 10k")
    expect(plan.deferred.map((d) => d.text)).toEqual(["learn to cook", "start writing"])
    expect(plan.deferred.every((d) => d.until === "")).toBe(true)
  })

  test("removing the chosen item from the shortlist clears the choice", () => {
    let plan = emptyPlan(NOW)
    plan = toggleShortlist(plan, "run a 10k", NOW)
    plan = chooseOne(plan, "run a 10k", NOW)

    plan = toggleShortlist(plan, "run a 10k", NOW)

    expect(plan.chosen).toBe("")
    expect(plan.shortlist).toEqual([])
  })
})

describe("the disclosure floor", () => {
  test("a crisis route may not choose to keep it private", () => {
    let plan = emptyPlan(NOW)
    plan = pick(plan, "floor", "I’ve been having thoughts of hurting myself")

    expect(visibilityAllowed(plan, "private")).toBe(false)
    expect(visibilityAllowed(plan, "partner")).toBe(true)
  })

  test("everyone else may keep it private", () => {
    let plan = emptyPlan(NOW)
    plan = pick(plan, "stops-first", "I don’t know how")

    expect(visibilityAllowed(plan, "private")).toBe(true)
  })
})

describe("persistence", () => {
  test("round-trips a plan", () => {
    let plan = emptyPlan(NOW)
    plan = setConstraint(plan, "hours", "6", NOW)
    plan = setCandidate(plan, CYL_CANDIDATE_PROMPTS[0].id, "photography", NOW)
    plan = toggleShortlist(plan, "photography", NOW)
    plan = chooseOne(plan, "photography", NOW)

    const restored = loadPlan(serializePlan(plan))

    expect(restored).toEqual(plan)
  })

  test("rejects a payload from a different schema version rather than repairing it", () => {
    const plan = emptyPlan(NOW)
    const stale = JSON.stringify({ ...plan, v: CYL_SCHEMA_VERSION + 1 })

    expect(loadPlan(stale)).toBeNull()
  })

  test("returns null for junk instead of throwing", () => {
    expect(loadPlan(null)).toBeNull()
    expect(loadPlan("")).toBeNull()
    expect(loadPlan("{not json")).toBeNull()
    expect(loadPlan('"a string"')).toBeNull()
  })

  test("a plan written before a field existed comes back with that field, not undefined", () => {
    const plan = emptyPlan(NOW)
    const older = JSON.stringify({ v: CYL_SCHEMA_VERSION, updatedAt: NOW })

    const restored = loadPlan(older)

    expect(restored?.rep).toEqual(plan.rep)
    expect(restored?.deferred).toEqual([])
    expect(restored?.ladder.length).toBeGreaterThan(0)
  })
})

describe("progress", () => {
  test("counts nothing complete on an empty plan", () => {
    expect(completedStages(emptyPlan(NOW))).toBe(0)
  })

  test("every declared stage has a completion rule", () => {
    // A stage with no case in stageComplete would silently never complete.
    let plan = emptyPlan(NOW)
    for (const q of CYL_DIFFERENTIAL) plan = answerDifferential(plan, q.id, 0, NOW)
    for (const f of CYL_CONSTRAINTS) plan = setConstraint(plan, f.id, "1", NOW)
    for (const p of CYL_CANDIDATE_PROMPTS) plan = setCandidate(plan, p.id, "x", NOW)
    plan = toggleShortlist(plan, "x", NOW)
    plan = chooseOne(plan, "x", NOW)
    plan = setRep(plan, { action: "a", counts: "b" }, NOW)
    plan = { ...plan, ladder: ["one", "two"], horizon: "a year" }
    plan = { ...plan, relapse: { ...plan.relapse, letter: "dear you" } }
    plan = { ...plan, commitment: { ...plan.commitment, startDate: "2026-08-09", endDate: "2026-11-07" } }

    expect(completedStages(plan)).toBe(CYL_STAGES.length)
  })

  test("constraints are not complete while a field is blank", () => {
    let plan = emptyPlan(NOW)
    for (const f of CYL_CONSTRAINTS.slice(0, -1)) plan = setConstraint(plan, f.id, "1", NOW)

    expect(constraintsComplete(plan)).toBe(false)
  })

  test("candidateLines drops blanks and keeps prompt order", () => {
    let plan = emptyPlan(NOW)
    plan = setCandidate(plan, CYL_CANDIDATE_PROMPTS[2].id, "  chess  ", NOW)
    plan = setCandidate(plan, CYL_CANDIDATE_PROMPTS[0].id, "reading", NOW)
    plan = setCandidate(plan, CYL_CANDIDATE_PROMPTS[1].id, "   ", NOW)

    expect(candidateLines(plan)).toEqual(["reading", "chess"])
  })
})

describe("dates", () => {
  test("defaults the end date to 90 days out", () => {
    expect(defaultEndDate("2026-08-09")).toBe("2026-11-07")
  })

  test("returns empty for an unparseable start", () => {
    expect(defaultEndDate("not a date")).toBe("")
  })
})

describe("corpus presentation", () => {
  test("never prints a multiplier the corpus could not compute", () => {
    const noBaseline = CYL_CORPUS.filter((v) => v.multiplier == null)

    expect(noBaseline.length).toBeGreaterThan(0)
    for (const v of noBaseline) {
      expect(describeMultiplier(v)).toBe("no comparable peers")
    }
  })

  test("prints a multiplier where one exists", () => {
    const withBaseline = CYL_CORPUS.find((v) => v.multiplier != null)!

    expect(describeMultiplier(withBaseline)).toMatch(/×$/)
  })

  test("sorting keeps missing multipliers at the bottom instead of scoring them zero", () => {
    const sorted = sortCorpus(CYL_CORPUS, "multiplier")
    const firstMissing = sorted.findIndex((v) => v.multiplier == null)

    expect(firstMissing).toBeGreaterThan(0)
    expect(sorted.slice(firstMissing).every((v) => v.multiplier == null)).toBe(true)
  })

  test("filters by category and by free text over title and channel", () => {
    const dating = filterCorpus(CYL_CORPUS, "DATE", "")
    expect(dating.length).toBeGreaterThan(0)
    expect(dating.every((v) => v.cat === "DATE")).toBe(true)

    const byChannel = filterCorpus(CYL_CORPUS, "ALL", "healthygamer")
    expect(byChannel.length).toBeGreaterThan(0)
    expect(byChannel.every((v) => v.channel.toLowerCase().includes("healthygamer"))).toBe(true)
  })

  test("tier counts cover every row exactly once", () => {
    const counts = tierCounts()
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    expect(total).toBe(CYL_CORPUS.length)
  })

  test("formatCount abbreviates without lying about the magnitude", () => {
    expect(formatCount(null)).toBe("—")
    expect(formatCount(940)).toBe("940")
    expect(formatCount(22_200)).toBe("22k")
    expect(formatCount(1_500_000)).toBe("1.5M")
    expect(formatCount(44_600_000)).toBe("45M")
  })
})

describe("corpus data integrity", () => {
  test("carries the 93 harvested rows", () => {
    expect(CYL_CORPUS.length).toBe(93)
  })

  test("every row has the fields the views depend on", () => {
    for (const v of CYL_CORPUS as readonly CylVideo[]) {
      expect(v.id, v.title).toBeTruthy()
      expect(v.channel, v.title).toBeTruthy()
      expect(v.views, v.title).toBeGreaterThan(0)
      expect(["DATE", "GEN", "MEN", "SCI", "ANTI"]).toContain(v.cat)
    }
  })

  test("no row claims a multiplier of zero, which would mean a baseline of infinity", () => {
    expect(CYL_CORPUS.every((v) => v.multiplier == null || v.multiplier > 0)).toBe(true)
  })
})
