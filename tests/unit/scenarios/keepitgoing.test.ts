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

    // score 5 → +1 each turn, momentum bonus on turn 3 (streak=3) → extra +1
    // Turn 1: 4+1=5 (cap 6); Turn 2: 5+1=6 (cap 6); Turn 3: 6+1+1=8 (cap 7) → 7
    expect(context.interestLevel).toBe(7)
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

describe("Momentum Bonus (neutral streak)", () => {
  it("no bonus on first 2 consecutive neutral turns", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    // Skip past pacing caps: set turnCount high and interest at 6
    context = { ...context, turnCount: 6, interestLevel: 6 }

    // Turn 1: streak 0→1, no bonus
    const r1 = updateInterestFromRubric(context, { score: 5, quality: "neutral", tags: [] })
    expect(r1.neutralStreak).toBe(1)
    expect(r1.interestLevel).toBe(7) // 6 + 1 base

    // Turn 2: streak 1→2, no bonus
    context = { ...context, ...r1, turnCount: 7 }
    const r2 = updateInterestFromRubric(context, { score: 5, quality: "neutral", tags: [] })
    expect(r2.neutralStreak).toBe(2)
    expect(r2.interestLevel).toBe(8) // 7 + 1 base
  })

  it("gives +1 bonus on 3rd consecutive neutral turn", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = { ...context, turnCount: 6, interestLevel: 6, neutralStreak: 2 }

    const result = updateInterestFromRubric(context, { score: 5, quality: "neutral", tags: [] })
    expect(result.neutralStreak).toBe(3)
    // 6 + 1 (base) + 1 (momentum) = 8
    expect(result.interestLevel).toBe(8)
  })

  it("streak resets on score ≤ 4", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = { ...context, turnCount: 6, interestLevel: 6, neutralStreak: 2 }

    const result = updateInterestFromRubric(context, { score: 4, quality: "neutral", tags: [] })
    expect(result.neutralStreak).toBe(0)
  })

  it("momentum bonus only applies to score 5-6 (not 7+)", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = { ...context, turnCount: 6, interestLevel: 6, neutralStreak: 2 }

    // Score 7 → streak continues but no momentum bonus (already good)
    const result = updateInterestFromRubric(context, { score: 7, quality: "positive", tags: [] })
    expect(result.neutralStreak).toBe(3)
    // 6 + 1 (base, score 7-8 delta) = 7, no extra momentum
    expect(result.interestLevel).toBe(7)
  })
})

describe("Phase-aware floor (invest/close)", () => {
  it("score 3-4 in invest phase gives delta 0 instead of -1", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = { ...context, turnCount: 14, conversationPhase: "invest", interestLevel: 7 }

    const result = updateInterestFromRubric(context, { score: 3, quality: "deflect", tags: [] })
    // Without phase floor: 7 + (-1) = 6. With floor: delta clamped to 0 → 7
    expect(result.interestLevel).toBe(7)
  })

  it("score 3-4 in close phase gives delta 0 instead of -1", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = { ...context, turnCount: 20, conversationPhase: "close", interestLevel: 8 }

    const result = updateInterestFromRubric(context, { score: 4, quality: "neutral", tags: [] })
    expect(result.interestLevel).toBe(8)
  })

  it("score 3-4 in hook phase still drops interest (no floor)", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = { ...context, turnCount: 2, conversationPhase: "hook", interestLevel: 5 }

    const result = updateInterestFromRubric(context, { score: 3, quality: "deflect", tags: [] })
    // No floor: 5 + (-1) = 4
    expect(result.interestLevel).toBe(4)
  })

  it("score 1-2 still drops interest even in invest phase", () => {
    let context = generateKeepItGoingScenario("test-seed", "en")
    context = { ...context, turnCount: 14, conversationPhase: "invest", interestLevel: 7 }

    const result = updateInterestFromRubric(context, { score: 2, quality: "skeptical", tags: [] })
    // score 1-2 → delta -2, floor only applies to score 3-4
    expect(result.interestLevel).toBe(5)
  })
})
