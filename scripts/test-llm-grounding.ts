#!/usr/bin/env npx tsx
/**
 * Test harness for LLM grounding - Phase 6.3
 *
 * Tests that the LLM's evaluation scores match the real data from extractions.
 * Uses Claude Code (local CLI) to run tests without API costs.
 *
 * Usage:
 *   USE_CLAUDE_CODE=true npx tsx scripts/test-llm-grounding.ts
 */

import * as fs from "fs"
import * as path from "path"

// Set Claude Code mode for testing
process.env.USE_CLAUDE_CODE = "true"

interface EvalExample {
  him: string
  her: string
  her_interest: number
  his_move: string[]
  her_move: string[]
  context?: string
  video_id: string
  turn: number
}

interface Examples {
  evaluation_examples: {
    cold: EvalExample[]
    guarded: EvalExample[]
    curious: EvalExample[]
    interested: EvalExample[]
  }
  tag_examples: Record<string, Array<{ him: string; her: string; result: string; video_id: string }>>
  response_examples: Record<string, string[]>
  analysis: {
    total_turns: number
    by_bucket: Record<string, number>
  }
}

interface TestCase {
  input: {
    him: string
    her_last: string
    context: string
    expected_interest: number
    expected_bucket: string
    his_move: string[]
  }
  expected: {
    score_min: number
    score_max: number
    tags_should_include?: string[]
    tags_should_not_include?: string[]
  }
  source: string
}

interface TestResult {
  passed: boolean
  case: TestCase
  actual_score?: number
  actual_tags?: string[]
  error?: string
}

function getBucket(interest: number): string {
  if (interest <= 3) return "cold"
  if (interest <= 5) return "guarded"
  if (interest <= 7) return "curious"
  return "interested"
}

function getExpectedScoreRange(bucket: string): [number, number] {
  switch (bucket) {
    case "cold": return [1, 4]
    case "guarded": return [3, 6]
    case "curious": return [5, 8]
    case "interested": return [7, 10]
    default: return [1, 10]
  }
}

function buildTestCases(examples: Examples): TestCase[] {
  const testCases: TestCase[] = []

  for (const [bucket, bucketExamples] of Object.entries(examples.evaluation_examples)) {
    // Take first 5 from each bucket for testing
    for (const ex of bucketExamples.slice(0, 5)) {
      const [scoreMin, scoreMax] = getExpectedScoreRange(bucket)

      // Determine expected tags based on his_move
      const tagsToInclude: string[] = []
      const tagsToExclude: string[] = []

      if (ex.his_move.includes("question_interview")) {
        tagsToInclude.push("interview_question")
      }
      if (ex.his_move.includes("cold_read")) {
        tagsToInclude.push("cold_read")
      }
      if (ex.his_move.includes("tease")) {
        tagsToInclude.push("tease")
      }

      testCases.push({
        input: {
          him: ex.him,
          her_last: ex.her,
          context: ex.context || `Turn ${ex.turn}`,
          expected_interest: ex.her_interest,
          expected_bucket: bucket,
          his_move: ex.his_move,
        },
        expected: {
          score_min: scoreMin,
          score_max: scoreMax,
          tags_should_include: tagsToInclude.length > 0 ? tagsToInclude : undefined,
          tags_should_not_include: tagsToExclude.length > 0 ? tagsToExclude : undefined,
        },
        source: `${ex.video_id}:${ex.turn}`,
      })
    }
  }

  return testCases
}

async function runEvalTest(testCase: TestCase): Promise<TestResult> {
  // Import the evaluator dynamically to ensure env vars are set
  const { evaluateWithAI } = await import("../src/scenarios/keepitgoing/chat")

  const mockContext = {
    situation: {
      id: "test",
      location: { en: "Street", da: "Gade" },
      setup: { en: "Testing", da: "Tester" },
      yourOpener: { en: "Hey", da: "Hey" },
      herFirstResponse: { en: testCase.input.her_last, da: testCase.input.her_last },
    },
    language: "en" as const,
    interestLevel: testCase.input.expected_interest,
    exitRisk: 0,
    realismNotch: 0 as const,
    isEnded: false,
    turnCount: 1,
    conversationHistory: [],
    conversationPhase: "hook" as const,
    consecutiveHighScores: 0,
    averageScore: 0,
    totalScore: 0,
    usedResponses: { positive: [], neutral: [], deflect: [], skeptical: [] },
    scores: [],
    messageLimit: 20,
    xpEarned: 0,
  }

  try {
    const result = await evaluateWithAI(
      testCase.input.him,
      [{ role: "assistant", content: testCase.input.her_last }],
      "en",
      mockContext,
      "test-user"
    )

    const scoreInRange = result.score >= testCase.expected.score_min &&
                          result.score <= testCase.expected.score_max

    let tagsMatch = true
    if (testCase.expected.tags_should_include) {
      for (const tag of testCase.expected.tags_should_include) {
        if (!result.tags.includes(tag)) {
          tagsMatch = false
          break
        }
      }
    }

    return {
      passed: scoreInRange, // Focus on score accuracy for now
      case: testCase,
      actual_score: result.score,
      actual_tags: result.tags,
    }
  } catch (error) {
    return {
      passed: false,
      case: testCase,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  console.log("=== LLM Grounding Test Harness ===\n")

  // Load examples
  const examplesPath = path.join(process.cwd(), "data/woman-responses/final/examples.json")
  if (!fs.existsSync(examplesPath)) {
    console.error("ERROR: examples.json not found. Run build-llm-examples.ts first.")
    process.exit(1)
  }

  const examples: Examples = JSON.parse(fs.readFileSync(examplesPath, "utf-8"))
  console.log(`Loaded ${examples.analysis.total_turns} turns from examples.json\n`)

  // Build test cases
  const testCases = buildTestCases(examples)
  console.log(`Built ${testCases.length} test cases\n`)

  // Check if Claude Code is available
  if (process.env.USE_CLAUDE_CODE !== "true") {
    console.log("Note: Running without USE_CLAUDE_CODE=true will use API (costs money)")
    console.log("Set USE_CLAUDE_CODE=true to use local Claude Code CLI\n")
  }

  // Run tests
  console.log("Running evaluation tests...\n")

  const results: TestResult[] = []
  let passed = 0
  let failed = 0

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    console.log(`[${i + 1}/${testCases.length}] Testing ${testCase.source} (${testCase.input.expected_bucket})...`)

    const result = await runEvalTest(testCase)
    results.push(result)

    if (result.passed) {
      passed++
      console.log(`  ✓ Score ${result.actual_score} in range [${testCase.expected.score_min}-${testCase.expected.score_max}]`)
    } else if (result.error) {
      failed++
      console.log(`  ✗ Error: ${result.error}`)
    } else {
      failed++
      console.log(`  ✗ Score ${result.actual_score} NOT in range [${testCase.expected.score_min}-${testCase.expected.score_max}]`)
      console.log(`    Him: "${testCase.input.him.slice(0, 60)}..."`)
      console.log(`    Expected bucket: ${testCase.input.expected_bucket}, Data interest: ${testCase.input.expected_interest}`)
    }
  }

  // Summary
  console.log("\n=== RESULTS ===")
  console.log(`Passed: ${passed}/${testCases.length} (${Math.round(passed/testCases.length*100)}%)`)
  console.log(`Failed: ${failed}/${testCases.length}`)

  // Breakdown by bucket
  const byBucket: Record<string, { passed: number; total: number }> = {}
  for (const result of results) {
    const bucket = result.case.input.expected_bucket
    if (!byBucket[bucket]) byBucket[bucket] = { passed: 0, total: 0 }
    byBucket[bucket].total++
    if (result.passed) byBucket[bucket].passed++
  }

  console.log("\nBy bucket:")
  for (const [bucket, stats] of Object.entries(byBucket)) {
    const pct = Math.round(stats.passed / stats.total * 100)
    console.log(`  ${bucket}: ${stats.passed}/${stats.total} (${pct}%)`)
  }

  // Save results
  const resultsPath = path.join(process.cwd(), "data/woman-responses/final/test-results.json")
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { passed, failed, total: testCases.length },
    by_bucket: byBucket,
    results: results.map(r => ({
      source: r.case.source,
      passed: r.passed,
      expected_bucket: r.case.input.expected_bucket,
      expected_range: [r.case.expected.score_min, r.case.expected.score_max],
      actual_score: r.actual_score,
      actual_tags: r.actual_tags,
      error: r.error,
    })),
  }, null, 2))
  console.log(`\nResults saved to ${resultsPath}`)

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(console.error)
