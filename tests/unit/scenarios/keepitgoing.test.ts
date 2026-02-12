/**
 * Keep It Going - Unit Tests
 *
 * Tests for context accumulation and helper functions.
 * All evaluation is now done by LLM - no regex-based fallbacks.
 */

import { describe, it, expect } from "vitest"
import {
  getCloseOutcome,
  generateKeepItGoingScenario,
  updateContext,
  updateInterestFromRubric,
} from "@/src/scenarios/keepitgoing"
import {
  RUBRIC,
  getScoreDelta,
  getTagEffect,
  checkEndRules,
} from "@/src/scenarios/keepitgoing/realisticProfiles"

describe("Close Outcome", () => {
  it("average >= 6 returns 'success'", () => {
    expect(getCloseOutcome(6)).toBe("success")
    expect(getCloseOutcome(8)).toBe("success")
  })

  it("average 4-5 returns 'hesitant'", () => {
    expect(getCloseOutcome(4)).toBe("hesitant")
    expect(getCloseOutcome(5)).toBe("hesitant")
  })

  it("average < 4 returns 'decline'", () => {
    expect(getCloseOutcome(3)).toBe("decline")
    expect(getCloseOutcome(1)).toBe("decline")
  })
})

describe("Context Accumulation", () => {
  it("initializes with correct defaults", () => {
    const context = generateKeepItGoingScenario("test-seed", "en")
    expect(context.turnCount).toBe(0)
    expect(context.averageScore).toBe(0)
    expect(context.totalScore).toBe(0)
    expect(context.consecutiveHighScores).toBe(0)
    expect(context.conversationPhase).toBe("hook")
    expect(context.usedResponses).toEqual({
      positive: [],
      neutral: [],
      deflect: [],
      skeptical: [],
    })
  })

  it("accumulates scores correctly after one turn", () => {
    const context = generateKeepItGoingScenario("test-seed", "en")
    const updated = updateContext(context, "Hello", 7)
    expect(updated.turnCount).toBe(1)
    expect(updated.totalScore).toBe(7)
    expect(updated.averageScore).toBe(7)
    expect(updated.consecutiveHighScores).toBe(1)
  })

  it("accumulates scores correctly after multiple turns", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = updateContext(context, "Test 1", 8)
    context = updateContext(context, "Test 2", 6)
    context = updateContext(context, "Test 3", 4)

    expect(context.turnCount).toBe(3)
    expect(context.totalScore).toBe(18)
    expect(context.averageScore).toBe(6)
  })

  it("tracks consecutive high scores", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = updateContext(context, "Test 1", 7)
    expect(context.consecutiveHighScores).toBe(1)

    context = updateContext(context, "Test 2", 8)
    expect(context.consecutiveHighScores).toBe(2)

    context = updateContext(context, "Test 3", 5) // Below 7, resets
    expect(context.consecutiveHighScores).toBe(0)
  })

  it("tracks used responses for deduplication", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = updateContext(context, "Test 1", 7, { quality: "positive", index: 0 })
    expect(context.usedResponses.positive).toEqual([0])

    context = updateContext(context, "Test 2", 7, { quality: "positive", index: 3 })
    expect(context.usedResponses.positive).toEqual([0, 3])
  })

  it("transitions phases based on turn count", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")

    // Hook phase (turns 1-4)
    for (let i = 0; i < 4; i++) {
      context = updateContext(context, "Test", 5)
    }
    expect(context.conversationPhase).toBe("hook")

    // Vibe phase (turns 5-12)
    context = updateContext(context, "Test", 5)
    expect(context.conversationPhase).toBe("vibe")

    // Skip to invest phase
    for (let i = 0; i < 8; i++) {
      context = updateContext(context, "Test", 5)
    }
    expect(context.conversationPhase).toBe("invest")

    // Close phase (turn 19+)
    for (let i = 0; i < 6; i++) {
      context = updateContext(context, "Test", 5)
    }
    expect(context.conversationPhase).toBe("close")
  })
})

describe("Situation Selection", () => {
  it("selects situation by ID when provided", () => {
    const context = generateKeepItGoingScenario("test-seed", "en", "cafe")
    expect(context.situation.id).toBe("cafe")
  })

  it("falls back to seed-based random when situationId not found", () => {
    const context = generateKeepItGoingScenario("test-seed", "en", "nonexistent")
    expect(context.situation.id).toBeDefined()
  })

  it("uses seed-based random when no situationId provided", () => {
    const context1 = generateKeepItGoingScenario("seed-a", "en")
    const context2 = generateKeepItGoingScenario("seed-a", "en")
    expect(context1.situation.id).toBe(context2.situation.id)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Rubric v2 Tests (Step 5 changes)
// ─────────────────────────────────────────────────────────────────────────────

describe("Rubric Tag Effects", () => {
  it("question tag has zero interestDelta and exitRiskDelta", () => {
    const effect = getTagEffect("question")
    expect(effect).not.toBeNull()
    expect(effect!.interestDelta).toBe(0)
    expect(effect!.exitRiskDelta).toBe(0)
  })

  it("interview_question tag no longer exists", () => {
    expect(getTagEffect("interview_question")).toBeNull()
  })

  it("too_long tag has zero interestDelta but +1 exitRiskDelta", () => {
    const effect = getTagEffect("too_long")
    expect(effect).not.toBeNull()
    expect(effect!.interestDelta).toBe(0)
    expect(effect!.exitRiskDelta).toBe(1)
  })

  it("cold_read tag has zero interestDelta and exitRiskDelta", () => {
    const effect = getTagEffect("cold_read")
    expect(effect).not.toBeNull()
    expect(effect!.interestDelta).toBe(0)
    expect(effect!.exitRiskDelta).toBe(0)
  })
})

describe("Score-to-Interest Delta", () => {
  it("score 5-6 gives +1 interest delta (momentum-driven rise)", () => {
    expect(getScoreDelta(5)).toBe(1)
    expect(getScoreDelta(6)).toBe(1)
  })

  it("score 7-8 still gives +1", () => {
    expect(getScoreDelta(7)).toBe(1)
    expect(getScoreDelta(8)).toBe(1)
  })

  it("score 9-10 gives +2", () => {
    expect(getScoreDelta(9)).toBe(2)
    expect(getScoreDelta(10)).toBe(2)
  })

  it("score 3-4 gives -1", () => {
    expect(getScoreDelta(3)).toBe(-1)
    expect(getScoreDelta(4)).toBe(-1)
  })
})

describe("Exit Risk Decay", () => {
  it("positive quality decays exitRisk (quality -1 + decay -1 = -2 total)", () => {
    const context = generateKeepItGoingScenario("test-seed", "en")
    // Set exitRisk to 2 so we can observe decay
    const ctx = { ...context, exitRisk: 2 }
    const result = updateInterestFromRubric(ctx, {
      score: 7,
      quality: "positive",
      tags: [],
    })
    // quality positive = -1 exitRisk, decay = -1, total delta = -2
    // 2 + (-2) = 0, clamped to min 0
    expect(result.exitRisk).toBe(0)
  })

  it("neutral quality decays exitRisk (quality 0 + decay -1 = -1 total)", () => {
    const context = generateKeepItGoingScenario("test-seed", "en")
    const ctx = { ...context, exitRisk: 2 }
    const result = updateInterestFromRubric(ctx, {
      score: 5,
      quality: "neutral",
      tags: [],
    })
    // quality neutral = 0 exitRisk, decay = -1, total delta = -1
    // 2 + (-1) = 1
    expect(result.exitRisk).toBe(1)
  })

  it("deflect quality does NOT get exitRisk decay", () => {
    const context = generateKeepItGoingScenario("test-seed", "en")
    const ctx = { ...context, exitRisk: 2 }
    const result = updateInterestFromRubric(ctx, {
      score: 3,
      quality: "deflect",
      tags: [],
    })
    // quality deflect = +1 exitRisk, NO decay, total delta = +1
    // 2 + 1 = 3
    expect(result.exitRisk).toBe(3)
  })

  it("skeptical quality does NOT get exitRisk decay", () => {
    const context = generateKeepItGoingScenario("test-seed", "en")
    const ctx = { ...context, exitRisk: 2 }
    const result = updateInterestFromRubric(ctx, {
      score: 2,
      quality: "skeptical",
      tags: [],
    })
    // quality skeptical = +1 exitRisk, NO decay, total delta = +1
    // 2 + 1 = 3
    expect(result.exitRisk).toBe(3)
  })
})

describe("End Rules (raised thresholds)", () => {
  it("exitRisk max is 4", () => {
    expect(RUBRIC.exitRisk.max).toBe(4)
  })

  it("conversation does NOT end at exitRisk 3", () => {
    const result = checkEndRules(5, 3, 5, "neutral")
    expect(result.isEnded).toBe(false)
  })

  it("conversation ends at exitRisk 4", () => {
    const result = checkEndRules(5, 4, 5, "neutral")
    expect(result.isEnded).toBe(true)
    expect(result.endReason).toBe("she is done / uncomfortable")
  })

  it("cold+deflect does NOT end at interest 3, turn 3", () => {
    const result = checkEndRules(3, 0, 3, "deflect")
    expect(result.isEnded).toBe(false)
  })

  it("cold+deflect does NOT end at interest 3, turn 5", () => {
    // New threshold is interest <= 2, not <= 3
    const result = checkEndRules(3, 0, 5, "deflect")
    expect(result.isEnded).toBe(false)
  })

  it("cold+deflect DOES end at interest 2, turn 5", () => {
    const result = checkEndRules(2, 0, 5, "deflect")
    expect(result.isEnded).toBe(true)
    expect(result.endReason).toBe("cold and not warming up")
  })

  it("low interest + annoyance still ends (rule 2 unchanged)", () => {
    const result = checkEndRules(2, 2, 2, "neutral")
    expect(result.isEnded).toBe(true)
    expect(result.endReason).toBe("low interest + annoyance")
  })
})

describe("Rubric Integration: no death spiral on neutral scores", () => {
  it("3 consecutive score-5 turns with no tags should increase interest", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    // Start: interest 4, exitRisk 0

    for (let i = 0; i < 3; i++) {
      const result = updateInterestFromRubric(context, {
        score: 5,
        quality: "neutral",
        tags: [],
      })
      context = { ...context, ...result, turnCount: context.turnCount + 1 }
    }

    // score 5 → delta +1 each turn, so 4 + 3 = 7 (capped at 6 for turn ≤2, 7 for turn ≤4)
    // Turn 1: 4+1=5, capped at 6 → 5; Turn 2: 5+1=6, capped at 6 → 6; Turn 3: 6+1=7, capped at 7 → 7
    expect(context.interestLevel).toBeGreaterThanOrEqual(6)
    expect(context.isEnded).toBe(false)
    expect(context.exitRisk).toBe(0) // exitRisk should stay at 0 (decay keeps it floored)
  })

  it("question tag on score 5 does not punish interest or exit risk", () => {
    const context = generateKeepItGoingScenario("test-seed", "en")
    const result = updateInterestFromRubric(context, {
      score: 5,
      quality: "neutral",
      tags: ["question"],
    })
    // score 5 → +1 interest, question tag → 0/0, neutral quality → 0 exitRisk, decay → -1 exitRisk
    expect(result.interestLevel).toBe(5) // 4 + 1 = 5
    expect(result.exitRisk).toBe(0) // 0 + 0 + (-1) = -1, clamped to 0
  })
})
