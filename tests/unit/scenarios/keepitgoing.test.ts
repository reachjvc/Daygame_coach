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
} from "@/src/scenarios/keepitgoing"

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
