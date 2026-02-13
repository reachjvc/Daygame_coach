#!/usr/bin/env npx tsx
/**
 * Run Diagnostic - Phase 7.5
 *
 * Evaluates every coach turn in an extraction file using the production evaluator.
 * Outputs diagnostic JSON for the calibration viewer at /test/calibration.
 *
 * Usage:
 *   USE_CLAUDE_CODE=true npx tsx scripts/run-diagnostic.ts <video_id> <prompt_version> [output_suffix] [--ground-truth]
 *
 * Example:
 *   USE_CLAUDE_CODE=true npx tsx scripts/run-diagnostic.ts e2dLEB-AwmA prompt_0
 *   USE_CLAUDE_CODE=true npx tsx scripts/run-diagnostic.ts DPieYj7nji0.clean prompt_1 v1 --ground-truth
 */

import * as fs from "fs"
import * as path from "path"

// Force Claude Code mode
process.env.USE_CLAUDE_CODE = "true"

// ─────────────────────────────────────────────────────────────────────────────
// Types (matching extraction format)
// ─────────────────────────────────────────────────────────────────────────────

interface ExtractionTurn {
  turn: number
  phase: "hook" | "vibe" | "invest" | "close"
  him: string
  her: string
  his_move: string[]
  her_move: string[]
  her_interest: number
  notes: string
}

interface Extraction {
  video_id: string
  source_path: string
  video_type: string
  speaker_roles: Record<string, string>
  turns: ExtractionTurn[]
  extraction_notes: string
  confidence: string
}

// Diagnostic output types (matching app/test/calibration/_components/types.ts)
interface TurnEvaluation {
  score: number
  tags: string[]
  quality: "positive" | "neutral" | "deflect" | "skeptical"
  feedback: string
  trajectory_score?: number
  trajectory_signals?: string
}

interface TurnState {
  interest: number
  exitRisk: number
}

interface DiagnosticTurn {
  turn: number
  history: Array<{ role: "him" | "her"; content: string }>
  him: string
  her: string
  evaluation: TurnEvaluation
  state_before: TurnState
  state_after: TurnState
  is_blind_spot: boolean
  is_false_positive: boolean
  expected_score: number
  ground_truth_interest?: number
}

interface DiagnosticSummary {
  total_coach_turns: number
  turns_scored_7_plus: number
  blind_spot_count: number
  false_positive_count: number
  mean_absolute_error: number
  pass_rate: number
  /** Mean absolute error of trajectory_score vs ground truth interest (prompt_3+) */
  trajectory_mae?: number
  /** How many turns had trajectory_score (prompt_3+) */
  trajectory_turns?: number
}

interface DiagnosticData {
  video_id: string
  prompt_version: string
  total_turns: number
  mode?: "simulated" | "ground-truth"
  summary: DiagnosticSummary
  turns: DiagnosticTurn[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const groundTruth = args.includes("--ground-truth")
  const limitIdx = args.indexOf("--limit")
  const turnLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : Infinity
  const positionalArgs = args.filter((a) => !a.startsWith("--") && (limitIdx === -1 || args.indexOf(a) !== limitIdx + 1))
  const [videoId, promptVersion, outputSuffix] = positionalArgs

  if (!videoId || !promptVersion) {
    console.error(
      "Usage: npx tsx scripts/run-diagnostic.ts <video_id> <prompt_version> [output_suffix] [--ground-truth]"
    )
    console.error("Example: USE_CLAUDE_CODE=true npx tsx scripts/run-diagnostic.ts e2dLEB-AwmA prompt_0")
    console.error(
      "Example: USE_CLAUDE_CODE=true npx tsx scripts/run-diagnostic.ts DPieYj7nji0.clean prompt_1 v1 --ground-truth"
    )
    process.exit(1)
  }

  // Load extraction
  const extractionPath = path.join(process.cwd(), `data/woman-responses/extractions/${videoId}.json`)
  if (!fs.existsSync(extractionPath)) {
    console.error(`ERROR: Extraction not found: ${extractionPath}`)
    process.exit(1)
  }

  const extraction: Extraction = JSON.parse(fs.readFileSync(extractionPath, "utf-8"))
  if (extraction.turns.length === 0) {
    console.error(`ERROR: Extraction has 0 turns: ${videoId}`)
    process.exit(1)
  }

  // Verify prompt version folder exists
  const promptDir = path.join(process.cwd(), `data/woman-responses/prompts/${promptVersion}`)
  if (!fs.existsSync(promptDir)) {
    console.error(`ERROR: Prompt version not found: ${promptDir}`)
    process.exit(1)
  }

  console.log(`=== Diagnostic Runner ===`)
  console.log(`Video: ${videoId} (${extraction.turns.length} turns)`)
  console.log(`Prompt: ${promptVersion}`)
  console.log(`Mode: ${groundTruth ? "ground-truth" : "simulated"} (Claude Code CLI)`)
  console.log()

  // Dynamic imports after env vars are set
  const { evaluateWithAI } = await import("../src/scenarios/keepitgoing/chat")
  const { updateInterestFromRubric } = await import("../src/scenarios/keepitgoing/generator")
  const { RUBRIC } = await import("../src/scenarios/keepitgoing/realisticProfiles")

  // Build a situation object from the extraction (used as context backdrop)
  const situation = {
    id: `diagnostic-${videoId}`,
    location: { en: "Street", da: "Gade" },
    setup: { en: extraction.extraction_notes.slice(0, 80), da: extraction.extraction_notes.slice(0, 80) },
    yourOpener: { en: extraction.turns[0].him, da: extraction.turns[0].him },
    herFirstResponse: { en: extraction.turns[0].her, da: extraction.turns[0].her },
  }

  // Initialize state (matches production defaults)
  let interestLevel = RUBRIC.interest.start // 4
  let exitRisk = RUBRIC.exitRisk.start // 0
  let neutralStreak = 0
  let isEnded = false
  let endReason: string | undefined

  const diagnosticTurns: DiagnosticTurn[] = []

  const maxTurns = Math.min(extraction.turns.length, turnLimit)
  for (let i = 0; i < maxTurns; i++) {
    const turn = extraction.turns[i]

    // Build conversation history: all previous turns as context (scene-setting)
    const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
    for (let j = 0; j < i; j++) {
      conversationHistory.push({ role: "user", content: extraction.turns[j].him })
      conversationHistory.push({ role: "assistant", content: extraction.turns[j].her })
    }

    // Also build history in the viewer format (him/her labels)
    const viewerHistory: Array<{ role: "him" | "her"; content: string }> = []
    for (let j = 0; j < i; j++) {
      viewerHistory.push({ role: "him", content: extraction.turns[j].him })
      viewerHistory.push({ role: "her", content: extraction.turns[j].her })
    }

    // In ground-truth mode, use real interest from extraction data
    const contextInterestLevel = groundTruth ? turn.her_interest : interestLevel
    const contextExitRisk = groundTruth ? 0 : exitRisk

    const stateBefore: TurnState = { interest: contextInterestLevel, exitRisk: contextExitRisk }

    // FIX: For turn 0 (the opener), there's no prior "her" message.
    // evaluateWithAI falls back to herFirstResponse when history is empty,
    // which makes the evaluator think her response came BEFORE his opener.
    // Override herFirstResponse to a neutral marker for turn 0.
    const situationForTurn =
      i === 0
        ? {
            ...situation,
            herFirstResponse: {
              en: "(No prior message — this is his opening line)",
              da: "(Ingen tidligere besked — dette er hans åbner)",
            },
          }
        : situation

    // Build context object matching KeepItGoingContext
    const context = {
      situation: situationForTurn,
      language: "en" as const,
      turnCount: i,
      conversationPhase: turn.phase,
      consecutiveHighScores: 0,
      averageScore: 0,
      totalScore: 0,
      usedResponses: {
        positive: [] as number[],
        neutral: [] as number[],
        deflect: [] as number[],
        skeptical: [] as number[],
      },
      interestLevel: contextInterestLevel,
      exitRisk: contextExitRisk,
      realismNotch: 0 as const,
      neutralStreak,
      isEnded,
      endReason,
    }

    console.log(
      `[${i + 1}/${extraction.turns.length}] Turn ${turn.turn} (${turn.phase}) - interest=${contextInterestLevel}, exitRisk=${contextExitRisk}${groundTruth ? ` [GT: ${turn.her_interest}]` : ""}`
    )
    console.log(`  Him: "${turn.him.slice(0, 70)}${turn.him.length > 70 ? "..." : ""}"`)

    try {
      // Evaluate coach's line (only turn.him is scored; history is context)
      const evalResult = await evaluateWithAI(turn.him, conversationHistory, "en", context, "diagnostic")

      console.log(`  Score: ${evalResult.score} (${evalResult.quality}) tags=[${evalResult.tags.join(",")}]`)
      if (evalResult.trajectoryScore !== undefined) {
        console.log(`  Trajectory: ${evalResult.trajectoryScore} — ${evalResult.trajectorySignals || "no signals"}`)
      }
      console.log(`  Feedback: ${evalResult.feedback}`)

      // Update state using production rubric logic
      const update = updateInterestFromRubric(context, evalResult)

      // Always carry neutralStreak forward (needed for momentum bonus)
      neutralStreak = update.neutralStreak

      // In ground-truth mode, still run rubric for comparison but use real interest for next turn
      if (!groundTruth) {
        interestLevel = update.interestLevel
        exitRisk = update.exitRisk
        isEnded = update.isEnded
        endReason = update.endReason
      } else {
        // Store simulated values for comparison but don't use them
        interestLevel = update.interestLevel
        exitRisk = update.exitRisk
      }

      const stateAfter: TurnState = { interest: update.interestLevel, exitRisk: update.exitRisk }

      // Compute expected score from ground truth interest delta
      const prevRealInterest = i === 0 ? 4 : extraction.turns[i - 1].her_interest
      const realDelta = turn.her_interest - prevRealInterest
      const expectedScore =
        realDelta >= 2 ? 9 :
        realDelta === 1 ? 7 :
        realDelta === 0 ? (turn.her_interest >= 6 ? 6 : turn.her_interest >= 4 ? 5 : 4) :
        realDelta === -1 ? 3 : 1

      // Blind spot: interest actually rose but evaluator scored too low
      const isBlindSpot = realDelta > 0 && evalResult.score < expectedScore
      // False positive: interest dropped but evaluator scored too high
      const isFalsePositive = realDelta < 0 && evalResult.score > expectedScore

      if (isBlindSpot) {
        console.log(
          `  ⚠ BLIND SPOT: scored ${evalResult.score} but interest rose ${prevRealInterest}→${turn.her_interest} (expected ${expectedScore})`
        )
      }
      if (isFalsePositive) {
        console.log(
          `  ⚠ FALSE POS: scored ${evalResult.score} but interest dropped ${prevRealInterest}→${turn.her_interest} (expected ${expectedScore})`
        )
      }

      console.log(
        `  State: interest ${stateBefore.interest} → ${stateAfter.interest}, exitRisk ${stateBefore.exitRisk} → ${stateAfter.exitRisk}`
      )
      if (!groundTruth && isEnded) {
        console.log(`  🛑 System would end conversation: ${endReason}`)
      }
      console.log()

      diagnosticTurns.push({
        turn: turn.turn,
        history: viewerHistory,
        him: turn.him,
        her: turn.her,
        evaluation: {
          score: evalResult.score,
          tags: evalResult.tags,
          quality: evalResult.quality,
          feedback: evalResult.feedback,
          trajectory_score: evalResult.trajectoryScore,
          trajectory_signals: evalResult.trajectorySignals,
        },
        state_before: stateBefore,
        state_after: stateAfter,
        is_blind_spot: isBlindSpot,
        is_false_positive: isFalsePositive,
        expected_score: expectedScore,
        ground_truth_interest: turn.her_interest,
      })
    } catch (error) {
      console.error(`  ERROR: ${error instanceof Error ? error.message : String(error)}`)
      // Record the turn with error info
      diagnosticTurns.push({
        turn: turn.turn,
        history: viewerHistory,
        him: turn.him,
        her: turn.her,
        evaluation: {
          score: 0,
          tags: [],
          quality: "skeptical",
          feedback: `ERROR: ${error instanceof Error ? error.message : String(error)}`,
        },
        state_before: stateBefore,
        state_after: stateBefore, // no change on error
        is_blind_spot: false,
        is_false_positive: false,
        expected_score: 0,
        ground_truth_interest: turn.her_interest,
      })
    }
  }

  // Build summary
  const turnsScored7Plus = diagnosticTurns.filter((t) => t.evaluation.score >= 7).length
  const blindSpotCount = diagnosticTurns.filter((t) => t.is_blind_spot).length
  const falsePositiveCount = diagnosticTurns.filter((t) => t.is_false_positive).length
  const totalCoachTurns = diagnosticTurns.length
  const totalAbsError = diagnosticTurns.reduce(
    (sum, t) => sum + Math.abs(t.evaluation.score - t.expected_score),
    0
  )
  const meanAbsError = totalCoachTurns > 0 ? totalAbsError / totalCoachTurns : 0

  // Trajectory accuracy (prompt_3+): how close is trajectory_score to ground truth interest?
  const trajectoryTurns = diagnosticTurns.filter((t) => typeof t.evaluation.trajectory_score === "number")
  const trajectoryAbsError = trajectoryTurns.reduce(
    (sum, t) => sum + Math.abs(t.evaluation.trajectory_score! - (t.ground_truth_interest ?? 0)),
    0
  )
  const trajectoryMae = trajectoryTurns.length > 0 ? trajectoryAbsError / trajectoryTurns.length : undefined

  const diagnosticData: DiagnosticData = {
    video_id: videoId,
    prompt_version: promptVersion,
    total_turns: totalCoachTurns,
    mode: groundTruth ? "ground-truth" : "simulated",
    summary: {
      total_coach_turns: totalCoachTurns,
      turns_scored_7_plus: turnsScored7Plus,
      blind_spot_count: blindSpotCount,
      false_positive_count: falsePositiveCount,
      mean_absolute_error: Math.round(meanAbsError * 100) / 100,
      pass_rate: totalCoachTurns > 0 ? turnsScored7Plus / totalCoachTurns : 0,
      trajectory_mae: trajectoryMae !== undefined ? Math.round(trajectoryMae * 100) / 100 : undefined,
      trajectory_turns: trajectoryTurns.length > 0 ? trajectoryTurns.length : undefined,
    },
    turns: diagnosticTurns,
  }

  // Write output
  const outputDir = path.join(process.cwd(), "data/woman-responses/diagnostics")
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // Build output filename: videoId[_suffix]_promptVersion.json
  const nameParts = [videoId]
  if (outputSuffix) nameParts.push(outputSuffix)
  nameParts.push(promptVersion)
  const outputFilename = nameParts.join("_") + ".json"

  const outputPath = path.join(outputDir, outputFilename)
  fs.writeFileSync(outputPath, JSON.stringify(diagnosticData, null, 2))

  // Print summary
  console.log(`=== SUMMARY ===`)
  console.log(`Mode: ${groundTruth ? "ground-truth" : "simulated"}`)
  console.log(`Total turns: ${totalCoachTurns}`)
  console.log(
    `Scored 7+: ${turnsScored7Plus}/${totalCoachTurns} (${Math.round(diagnosticData.summary.pass_rate * 100)}%)`
  )
  console.log(`Blind spots (missed rise): ${blindSpotCount}`)
  console.log(`False positives (missed drop): ${falsePositiveCount}`)
  console.log(`Mean absolute error (line_score): ${meanAbsError.toFixed(2)}`)
  if (trajectoryMae !== undefined) {
    console.log(`Trajectory MAE (vs ground truth): ${trajectoryMae.toFixed(2)} (${trajectoryTurns.length} turns with trajectory)`)
  }
  console.log(`\nOutput: ${outputPath}`)
  console.log(`View at: /test/calibration`)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
