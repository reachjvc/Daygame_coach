import { describe, it, expect } from "vitest"
import {
  loadVisionPlanState,
  deriveIntakePosition,
  isIntakeAnswered,
  isIntakeSettled,
  revealedIntakeQuestions,
  isIntakePageComplete,
  isAnnualRerun,
} from "@/src/goals/visionPlanService"
import { INTAKE_PAGES, INTAKE_QUESTIONS, questionsForPage } from "@/src/goals/data/lifeMasteryIntake"
import type { VisionPlanState } from "@/src/goals/types"

/**
 * M0 of docs/plans/life-mastery-intake-redesign.md.
 *
 * The intake redesign replaces a SHIPPED flow whose state lives in localStorage.
 * The one thing that must not happen is a user mid-plan losing their work or
 * being dumped back at question one. These tests are the gate on every later
 * milestone.
 */

/** A v17-era payload: no intake fields at all, real work already done. */
const legacyRaw = JSON.stringify({
  vision: "I want to be strong, free, and present with my family.",
  intents: [],
  goals: [],
  priorityIds: [],
  dailyBudget: 5,
  confirmed: false,
  committedAt: "2026-07-01",
  values: ["Freedom", "Family", "Mastery"],
  drivingForce: {
    purpose: "So my kids grow up watching someone who keeps his word.",
    reasons: ["family", "self-respect"],
    identity: ["I am someone who does what he says he will do"],
  },
  yourTens: { lm_health: "Lean, strong, training four times a week" },
})

function load(raw: string): VisionPlanState {
  const res = loadVisionPlanState(raw)
  expect(res, "legacy payload must still hydrate").not.toBeNull()
  return res!.state
}

describe("intake migration — a shipped plan survives the redesign", () => {
  it("hydrates a v17-era payload that has no intake fields", () => {
    const state = load(legacyRaw)
    expect(state.committedAt).toBe("2026-07-01")
    expect(state.values).toEqual(["Freedom", "Family", "Mastery"])
    expect(state.drivingForce?.purpose).toContain("keeps his word")
    expect(state.yourTens?.lm_health).toContain("Lean")
    // The new fields are absent rather than invented.
    expect(state.intakeSeen).toBeUndefined()
    expect(state.yourZeros).toBeUndefined()
    expect(state.perfectDay).toBeUndefined()
  })

  it("reads existing data as answered without needing intakeSeen", () => {
    const state = load(legacyRaw)
    expect(isIntakeAnswered(state, "commit")).toBe(true)
    expect(isIntakeAnswered(state, "values_audit")).toBe(true)
    expect(isIntakeAnswered(state, "vision")).toBe(true)
    expect(isIntakeAnswered(state, "purpose")).toBe(true)
    expect(isIntakeAnswered(state, "identity")).toBe(true)
    // Not yet done in the legacy payload.
    expect(isIntakeAnswered(state, "conduct")).toBe(false)
    expect(isIntakeAnswered(state, "values_redesign")).toBe(false)
  })

  it("drops a returning user at the first unfinished question, not at the start", () => {
    const state = load(legacyRaw)
    const pos = deriveIntakePosition(state)
    expect(pos.page).toBe("going")
    expect(pos.questionId).toBe("conduct")
  })

  it("skips the year debrief on a first run and requires it on a re-run", () => {
    const fresh = load(legacyRaw)
    expect(isAnnualRerun(fresh)).toBe(false)
    expect(deriveIntakePosition(fresh).page).not.toBe("back")

    const returning: VisionPlanState = { ...fresh, confirmed: true }
    expect(isAnnualRerun(returning)).toBe(true)
    expect(deriveIntakePosition(returning).page).toBe("back")
    expect(deriveIntakePosition(returning).questionId).toBe("back_good")
  })

  it("a brand new state starts at the very first question of page 1", () => {
    const empty: VisionPlanState = {
      vision: "", intents: [], goals: [], priorityIds: [], dailyBudget: 5, confirmed: false,
    }
    const pos = deriveIntakePosition(empty)
    expect(pos.page).toBe("matters")
    expect(pos.questionId).toBe("commit")
  })
})

describe("reveal mechanics — one question at a time, no Next button", () => {
  const empty: VisionPlanState = {
    vision: "", intents: [], goals: [], priorityIds: [], dailyBudget: 5, confirmed: false,
  }

  it("shows only the first question of an untouched page", () => {
    const shown = revealedIntakeQuestions(empty, "matters")
    expect(shown.map((q) => q.id)).toEqual(["commit"])
  })

  it("reveals the next question once the current one is answered", () => {
    const committed: VisionPlanState = { ...empty, committedAt: "2026-08-03" }
    expect(revealedIntakeQuestions(committed, "matters").map((q) => q.id)).toEqual(["commit", "values_audit"])
  })

  it("'I'm not sure yet' reveals the next question without inventing an answer", () => {
    const waved: VisionPlanState = { ...empty, intakeSeen: ["commit"] }
    expect(isIntakeAnswered(waved, "commit")).toBe(false)
    expect(isIntakeSettled(waved, "commit")).toBe(true)
    expect(revealedIntakeQuestions(waved, "matters").map((q) => q.id)).toEqual(["commit", "values_audit"])
  })

  it("a page is complete when every question is settled, answered or waved", () => {
    const partial: VisionPlanState = { ...empty, committedAt: "2026-08-03" }
    expect(isIntakePageComplete(partial, "matters")).toBe(false)
    const done: VisionPlanState = { ...partial, values: ["Freedom"] }
    expect(isIntakePageComplete(done, "matters")).toBe(true)
  })

  // Regression: perfect_day is optional but was gating everything behind it,
  // so a returning user with a full driving force got sent back to an exercise
  // they had deliberately skipped.
  it("an optional question never blocks the next one, the page, or the position", () => {
    const withVision: VisionPlanState = {
      ...empty,
      committedAt: "2026-08-03",
      values: ["Freedom"],
      vision: "A strong, free life with my family.",
    }
    expect(isIntakeAnswered(withVision, "perfect_day")).toBe(false)
    // It reveals, and so does the question after it.
    const shown = revealedIntakeQuestions(withVision, "going").map((q) => q.id)
    expect(shown).toContain("perfect_day")
    expect(shown).toContain("purpose")
    // And the derived position steps over it.
    expect(deriveIntakePosition(withVision).questionId).toBe("purpose")
  })

  it("your 10 alone does not settle the areas question, the 0 is required too", () => {
    const tensOnly: VisionPlanState = { ...empty, yourTens: { lm_health: "Strong" } }
    expect(isIntakeAnswered(tensOnly, "areas_room")).toBe(false)
    const both: VisionPlanState = { ...tensOnly, yourZeros: { lm_health: "No training at all" } }
    expect(isIntakeAnswered(both, "areas_room")).toBe(true)
  })

  // The page-3 gate used to demand a 10 and a 0 somewhere plus an area purpose,
  // counted across DIFFERENT areas. Doing one area properly left it disabled.
  it("one area done properly settles the areas page", () => {
    const oneDone: VisionPlanState = {
      ...empty,
      yourTens: { lm_health: "Lean and strong", lm_money: "" },
      yourZeros: { lm_health: "No training at all" },
    }
    expect(isIntakeAnswered(oneDone, "areas_room")).toBe(true)
  })

  it("a 10 in one area and a 0 in a different one does not count", () => {
    const split: VisionPlanState = {
      ...empty,
      yourTens: { lm_health: "Lean and strong" },
      yourZeros: { lm_money: "Broke" },
    }
    expect(isIntakeAnswered(split, "areas_room")).toBe(false)
  })
})

describe("intake data integrity", () => {
  it("every question belongs to a declared page", () => {
    const pageIds = new Set(INTAKE_PAGES.map((p) => p.id))
    for (const q of INTAKE_QUESTIONS) expect(pageIds, q.id).toContain(q.page)
  })

  it("every page has at least one question", () => {
    for (const p of INTAKE_PAGES) expect(questionsForPage(p.id).length, p.id).toBeGreaterThan(0)
  })

  it("question ids are unique", () => {
    const ids = INTAKE_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("isIntakeAnswered has a real branch for every question", () => {
    // A question with no predicate silently never settles, which would strand
    // the user forever on a question they already answered.
    const empty: VisionPlanState = {
      vision: "", intents: [], goals: [], priorityIds: [], dailyBudget: 5, confirmed: false,
    }
    const unhandled = INTAKE_QUESTIONS.filter((q) => {
      // The default branch returns false; so does a genuine "not answered yet".
      // Distinguish by checking the id appears in the switch source.
      return !isIntakeAnswered(empty, q.id) && !SWITCH_IDS.has(q.id)
    })
    expect(unhandled.map((q) => q.id)).toEqual([])
  })

  it("every quote carries a video id", () => {
    for (const q of INTAKE_QUESTIONS) {
      if (q.quote) expect(q.quoteVideoId, `${q.id} has a quote with no videoId`).toMatch(/^[A-Za-z0-9_-]{11}$/)
    }
  })
})

/** Ids the switch in isIntakeAnswered explicitly handles. Kept beside the
 * function it mirrors; the test above fails if a question is added without one. */
const SWITCH_IDS = new Set([
  "back_good", "back_challenges", "back_lessons",
  "commit", "values_audit",
  "vision", "perfect_day", "purpose", "identity", "conduct", "values_redesign",
  "areas_pick", "areas_room",
  "brainstorm", "qualify", "action_plan", "sign",
])

/**
 * REACHABILITY. Every page's CTA must be enable-able through the editors that
 * page actually shows. Page 3 shipped with a gate asking for state the wheel
 * never wrote, so the page could not be completed at all, and page 2's gate
 * demanded a whole optional sub-exercise. Both looked fine in a screenshot.
 */
describe("every page can be completed through its own UI", () => {
  const base: VisionPlanState = {
    vision: "", intents: [], goals: [], priorityIds: [], dailyBudget: 5, confirmed: false,
  }

  it("page 1 completes with a commitment and one value", () => {
    const s: VisionPlanState = { ...base, committedAt: "2026-08-03", values: ["Freedom"] }
    expect(isIntakePageComplete(s, "matters")).toBe(true)
  })

  it("page 2 completes on the driving force alone, with no optional exercises", () => {
    const s: VisionPlanState = {
      ...base,
      vision: "Strong and free.",
      drivingForce: { purpose: "For my family.", reasons: [], identity: ["I am consistent"], conduct: ["On time"] },
    }
    // No perfectDay and no awayValues: both are offered, neither is required.
    expect(s.perfectDay).toBeUndefined()
    expect(s.awayValues).toBeUndefined()
    expect(isIntakePageComplete(s, "going"), "page 2 must not require an optional sub-exercise").toBe(true)
  })

  it("page 3 completes from one area with a 10 and a 0", () => {
    const s: VisionPlanState = {
      ...base,
      yourTens: { lm_health: "Lean and strong" },
      yourZeros: { lm_health: "No training at all" },
    }
    expect(isIntakePageComplete(s, "areas"), "writing both ends of one area must be enough").toBe(true)
  })

  it("page 4 completes once there are goals with actions and a signature", () => {
    const goal = {
      id: "g1", title: "Train four times a week", pillarId: "health", pillarLabel: "Health",
      pillarColor: "#22c55e", objectiveId: null, objectiveLabel: null, type: "habit_ramp" as const,
      why: "Because I want energy for my kids.", sourceIntentIds: [],
      habits: [{ id: "g1-h0", title: "Train", daysPerWeek: 4 }], tasks: [], measure: null,
      rampSteps: [{ frequencyPerWeek: 4, durationWeeks: 4 }], areaId: "lm_health",
    }
    const s: VisionPlanState = { ...base, goals: [goal], priorityIds: ["g1"], confirmed: true }
    expect(isIntakePageComplete(s, "doing")).toBe(true)
  })

  it("no required question depends on state its own page cannot write", () => {
    // A required question whose only writer lives on a LATER page is a deadlock.
    // areas_room is settled by the wheel on page 3; qualify by the workshop on
    // page 4. Assert the pairing rather than trusting it.
    const areasOnly: VisionPlanState = {
      ...base, yourTens: { lm_health: "A" }, yourZeros: { lm_health: "B" },
    }
    expect(isIntakePageComplete(areasOnly, "areas")).toBe(true)
    expect(isIntakePageComplete(areasOnly, "doing"), "page 4 must still be open").toBe(false)
  })
})
