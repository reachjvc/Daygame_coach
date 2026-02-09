#!/usr/bin/env npx ts-node
/**
 * Phase 5 Verification Script - Realistic Woman Responses
 *
 * Tests the keep-it-going logic to verify:
 * 1. Pacing - no warm/flirty jumps in first 3 turns
 * 2. Cold bucket - short, no questions back
 * 3. Boring/interview patterns increase exitRisk
 * 4. Sexual-too-soon gets deflected
 * 5. Early exit sticky behavior
 * 6. Reset clears state
 */

import {
  generateKeepItGoingScenario,
  updateContext,
  updateInterestFromRubric,
} from "../src/scenarios/keepitgoing"
import {
  RUBRIC,
  PROFILES,
  getInterestBucket,
  getBucketProfile,
  getScoreDelta,
  getTagEffect,
  applyPacingCap,
  checkEndRules,
} from "../src/scenarios/keepitgoing/realisticProfiles"
import type { EvalResult } from "../src/scenarios/keepitgoing/types"

// ─────────────────────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface TestSession {
  name: string
  turns: Array<{
    message: string
    evalResult: EvalResult
  }>
}

function runSession(session: TestSession): {
  transcript: string[]
  finalInterest: number
  finalExitRisk: number
  isEnded: boolean
  endReason?: string
  interestHistory: number[]
  exitRiskHistory: number[]
} {
  let context = generateKeepItGoingScenario("test-seed", "en")
  const transcript: string[] = []
  const interestHistory: number[] = [context.interestLevel]
  const exitRiskHistory: number[] = [context.exitRisk]

  for (const turn of session.turns) {
    if (context.isEnded) {
      // Simulate service behavior: each message after exit gets blocked
      transcript.push(`[BLOCKED - She already left: ${context.endReason}]`)
      continue // Don't break - count all blocked attempts
    }

    // Apply rubric update
    const update = updateInterestFromRubric(context, turn.evalResult)

    // Update context
    context = {
      ...updateContext(context, turn.message, turn.evalResult.score),
      interestLevel: update.interestLevel,
      exitRisk: update.exitRisk,
      isEnded: update.isEnded,
      endReason: update.endReason,
    }

    transcript.push(
      `T${context.turnCount}: "${turn.message}" → score=${turn.evalResult.score}, ` +
        `quality=${turn.evalResult.quality}, tags=[${turn.evalResult.tags.join(",")}] → ` +
        `interest=${context.interestLevel}, exitRisk=${context.exitRisk}${context.isEnded ? ` [ENDED: ${context.endReason}]` : ""}`
    )
    interestHistory.push(context.interestLevel)
    exitRiskHistory.push(context.exitRisk)
  }

  return {
    transcript,
    finalInterest: context.interestLevel,
    finalExitRisk: context.exitRisk,
    isEnded: context.isEnded,
    endReason: context.endReason,
    interestHistory,
    exitRiskHistory,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Cases
// ─────────────────────────────────────────────────────────────────────────────

const tests: { name: string; test: () => { passed: boolean; details: string } }[] = []

// Test 1: Pacing - No warm/flirty jumps in first 3 turns
tests.push({
  name: "Pacing: Interest capped in early turns",
  test: () => {
    // Even with perfect scores, interest should be capped
    const session: TestSession = {
      name: "early-perfect",
      turns: [
        { message: "Great cold read", evalResult: { score: 10, feedback: "", quality: "positive", tags: ["cold_read"] } },
        { message: "Threading well", evalResult: { score: 10, feedback: "", quality: "positive", tags: ["threading"] } },
        { message: "Another tease", evalResult: { score: 9, feedback: "", quality: "positive", tags: ["tease"] } },
      ],
    }

    const result = runSession(session)

    // Turn 1-2: max interest = 6
    // Turn 3-4: max interest = 7
    const turn1Interest = result.interestHistory[1]
    const turn2Interest = result.interestHistory[2]
    const turn3Interest = result.interestHistory[3]

    const passed =
      turn1Interest <= 6 &&
      turn2Interest <= 6 &&
      turn3Interest <= 7

    return {
      passed,
      details: `T1=${turn1Interest}(max 6), T2=${turn2Interest}(max 6), T3=${turn3Interest}(max 7)\n${result.transcript.join("\n")}`,
    }
  },
})

// Test 2: Cold bucket - no questions back, short responses
tests.push({
  name: "Cold bucket: Profile constraints are correct",
  test: () => {
    const coldProfile = getBucketProfile("cold")

    const passed =
      coldProfile.shouldAskBack === false &&
      coldProfile.questionBackRate === 0 &&
      coldProfile.wordCount.max <= 8

    return {
      passed,
      details: `shouldAskBack=${coldProfile.shouldAskBack}, questionBackRate=${coldProfile.questionBackRate}, wordCount.max=${coldProfile.wordCount.max}`,
    }
  },
})

// Test 3: Interview questions increase exit risk
tests.push({
  name: "Interview patterns: Increase exitRisk and decrease interest",
  test: () => {
    const session: TestSession = {
      name: "interview-mode",
      turns: [
        { message: "Where are you from?", evalResult: { score: 4, feedback: "", quality: "deflect", tags: ["interview_question"] } },
        { message: "What do you do?", evalResult: { score: 3, feedback: "", quality: "deflect", tags: ["interview_question"] } },
        { message: "How old are you?", evalResult: { score: 3, feedback: "", quality: "deflect", tags: ["interview_question"] } },
      ],
    }

    const result = runSession(session)

    // Interest should decrease, exitRisk should increase
    // Starting at interest=4, exitRisk=0
    // Each interview_question: interest -1, exitRisk +1 (from tag) + deflect quality adds +1 exitRisk
    const passed = result.finalInterest < 4 && result.finalExitRisk >= 2

    return {
      passed,
      details: `Final interest=${result.finalInterest}, exitRisk=${result.finalExitRisk}\n${result.transcript.join("\n")}`,
    }
  },
})

// Test 4: Interview leads to early exit
tests.push({
  name: "Interview patterns: Can trigger early exit",
  test: () => {
    const session: TestSession = {
      name: "interview-exit",
      turns: [
        { message: "Where are you from?", evalResult: { score: 3, feedback: "", quality: "deflect", tags: ["interview_question"] } },
        { message: "What do you do for work?", evalResult: { score: 3, feedback: "", quality: "deflect", tags: ["interview_question"] } },
        { message: "Where do you live?", evalResult: { score: 3, feedback: "", quality: "deflect", tags: ["interview_question"] } },
        { message: "Do you have siblings?", evalResult: { score: 3, feedback: "", quality: "deflect", tags: ["interview_question"] } },
      ],
    }

    const result = runSession(session)

    // Should trigger early exit (cold and not warming up after turn 3 with deflect quality)
    // Or exitRisk >= 3
    const passed = result.isEnded === true

    return {
      passed,
      details: `isEnded=${result.isEnded}, reason=${result.endReason}\n${result.transcript.join("\n")}`,
    }
  },
})

// Test 5: Sexual too soon gets deflected
tests.push({
  name: "Sexual too soon: Major interest drop and exitRisk increase",
  test: () => {
    const session: TestSession = {
      name: "sexual-too-soon",
      turns: [
        { message: "You look really hot", evalResult: { score: 2, feedback: "", quality: "skeptical", tags: ["sexual_too_soon"] } },
      ],
    }

    const result = runSession(session)

    // sexual_too_soon tag: interest -2, exitRisk +2
    // Plus score 2 gives interest delta of -2
    // Starting at 4, should drop significantly
    const tagEffect = getTagEffect("sexual_too_soon")

    const passed =
      result.finalInterest <= 2 &&
      result.finalExitRisk >= 2 &&
      tagEffect?.interestDelta === -2 &&
      tagEffect?.exitRiskDelta === 2

    return {
      passed,
      details: `Final interest=${result.finalInterest}, exitRisk=${result.finalExitRisk}, tagEffect=${JSON.stringify(tagEffect)}\n${result.transcript.join("\n")}`,
    }
  },
})

// Test 6: Creepy behavior causes immediate exit
tests.push({
  name: "Creepy: Triggers immediate exit",
  test: () => {
    const session: TestSession = {
      name: "creepy",
      turns: [
        { message: "Something creepy", evalResult: { score: 1, feedback: "", quality: "skeptical", tags: ["creepy"] } },
      ],
    }

    const result = runSession(session)

    // creepy tag: interest -3, exitRisk +3
    // Plus score 1 gives interest delta of -2
    // exitRisk should hit 3 immediately → end
    const passed = result.isEnded === true && result.finalExitRisk >= 3

    return {
      passed,
      details: `isEnded=${result.isEnded}, exitRisk=${result.finalExitRisk}, reason=${result.endReason}\n${result.transcript.join("\n")}`,
    }
  },
})

// Test 7: Sticky end - further messages blocked
tests.push({
  name: "Sticky end: Further messages are blocked after exit",
  test: () => {
    const session: TestSession = {
      name: "sticky-end",
      turns: [
        { message: "Creepy", evalResult: { score: 1, feedback: "", quality: "skeptical", tags: ["creepy"] } },
        { message: "Wait come back", evalResult: { score: 5, feedback: "", quality: "neutral", tags: [] } },
        { message: "Please", evalResult: { score: 5, feedback: "", quality: "neutral", tags: [] } },
      ],
    }

    const result = runSession(session)

    // After first message, she should leave. Further messages blocked.
    const blockedMessages = result.transcript.filter((t) => t.includes("[BLOCKED"))

    const passed = blockedMessages.length >= 2

    return {
      passed,
      details: `Blocked messages: ${blockedMessages.length}\n${result.transcript.join("\n")}`,
    }
  },
})

// Test 8: Reset - new scenario clears old state
tests.push({
  name: "Reset: New scenario has fresh state",
  test: () => {
    // Run first scenario to ended state
    let ctx1 = generateKeepItGoingScenario("seed1", "en", "coffee-shop")
    const update1 = updateInterestFromRubric(ctx1, { score: 1, quality: "skeptical", tags: ["creepy"] })
    ctx1 = { ...ctx1, ...update1 }

    // Start fresh scenario with different situation
    const ctx2 = generateKeepItGoingScenario("seed2", "en", "park")

    // Should have fresh state
    const passed =
      ctx2.isEnded === false &&
      ctx2.interestLevel === RUBRIC.interest.start &&
      ctx2.exitRisk === RUBRIC.exitRisk.start &&
      ctx2.turnCount === 0

    return {
      passed,
      details: `ctx1.isEnded=${ctx1.isEnded}, ctx2.isEnded=${ctx2.isEnded}, ctx2.interest=${ctx2.interestLevel}, ctx2.exitRisk=${ctx2.exitRisk}, ctx2.turnCount=${ctx2.turnCount}`,
    }
  },
})

// Test 9: Good lines warm her gradually
tests.push({
  name: "Good lines: Gradual warming (not instant)",
  test: () => {
    const session: TestSession = {
      name: "good-lines",
      turns: [
        { message: "Cold read", evalResult: { score: 8, feedback: "", quality: "positive", tags: ["cold_read"] } },
        { message: "Threading", evalResult: { score: 8, feedback: "", quality: "positive", tags: ["threading"] } },
        { message: "Tease", evalResult: { score: 8, feedback: "", quality: "positive", tags: ["tease"] } },
        { message: "More threading", evalResult: { score: 8, feedback: "", quality: "positive", tags: ["threading"] } },
        { message: "Good banter", evalResult: { score: 8, feedback: "", quality: "positive", tags: [] } },
      ],
    }

    const result = runSession(session)

    // Interest should grow gradually, respecting pacing caps
    // T1-2 capped at 6, T3-4 capped at 7, T5+ uncapped
    const t1 = result.interestHistory[1]
    const t2 = result.interestHistory[2]
    const t3 = result.interestHistory[3]
    const t4 = result.interestHistory[4]
    const t5 = result.interestHistory[5]

    const passed =
      t1 <= 6 &&
      t2 <= 6 &&
      t3 <= 7 &&
      t4 <= 7 &&
      t5 >= 7 &&
      t5 <= 10

    return {
      passed,
      details: `Interest progression: ${result.interestHistory.join(" → ")}\n${result.transcript.join("\n")}`,
    }
  },
})

// Test 10: Mixed session - realistic flow
tests.push({
  name: "Mixed session: Realistic interest/exitRisk flow",
  test: () => {
    const session: TestSession = {
      name: "mixed",
      turns: [
        { message: "Cold read", evalResult: { score: 7, feedback: "", quality: "positive", tags: ["cold_read"] } },
        { message: "Interview q", evalResult: { score: 4, feedback: "", quality: "deflect", tags: ["interview_question"] } },
        { message: "Good tease", evalResult: { score: 8, feedback: "", quality: "positive", tags: ["tease"] } },
        { message: "Threading", evalResult: { score: 7, feedback: "", quality: "positive", tags: ["threading"] } },
      ],
    }

    const result = runSession(session)

    // Should show realistic ups and downs
    // Not ended (mixed good/bad but mostly good)
    const passed =
      !result.isEnded &&
      result.finalInterest >= 5 &&
      result.finalExitRisk <= 2

    return {
      passed,
      details: `Interest: ${result.interestHistory.join(" → ")}, ExitRisk: ${result.exitRiskHistory.join(" → ")}\n${result.transcript.join("\n")}`,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Run All Tests
// ─────────────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════════════")
console.log("Phase 5 Verification: Realistic Woman Responses")
console.log("═══════════════════════════════════════════════════════════════════\n")

console.log("RUBRIC Config:")
console.log(`  Interest: start=${RUBRIC.interest.start}, range=[${RUBRIC.interest.min}, ${RUBRIC.interest.max}]`)
console.log(`  ExitRisk: start=${RUBRIC.exitRisk.start}, range=[${RUBRIC.exitRisk.min}, ${RUBRIC.exitRisk.max}]`)
console.log(`  Pacing caps: ${JSON.stringify(RUBRIC.pacing.maxInterestBeforeTurn)}`)
console.log(`  End rules: ${RUBRIC.endRules.length} rules defined`)
console.log()

let passed = 0
let failed = 0

for (const t of tests) {
  const result = t.test()
  const status = result.passed ? "✅ PASS" : "❌ FAIL"
  console.log(`${status}: ${t.name}`)
  console.log(`  ${result.details.split("\n").join("\n  ")}\n`)

  if (result.passed) {
    passed++
  } else {
    failed++
  }
}

console.log("═══════════════════════════════════════════════════════════════════")
console.log(`Results: ${passed}/${tests.length} passed, ${failed} failed`)
console.log("═══════════════════════════════════════════════════════════════════")

process.exit(failed > 0 ? 1 : 0)
