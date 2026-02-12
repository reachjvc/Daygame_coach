#!/usr/bin/env npx tsx
/**
 * Build Eval Calibration Set
 *
 * Reads all extraction files, scores every turn using ground truth interest deltas,
 * selects 75 representative examples, and outputs a calibration set JSON.
 *
 * Usage:
 *   npx tsx scripts/build-eval-calibration-set.ts
 */

import * as fs from "fs"
import * as path from "path"

// ─────────────────────────────────────────────────────────────────────────────
// Types
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

interface ScoredTurn {
  turn: ExtractionTurn
  prevTurn: ExtractionTurn | null
  videoId: string
  delta: number
  groundTruthScore: number
  isCounterintuitive: boolean
  scoreBucket: "9" | "7" | "5-6" | "3-4" | "1"
  prevInterest: number
}

interface CalibrationExample {
  phase: string
  context: string
  him: string
  her: string
  score: number
  why: string
  his_move: string[]
  counterintuitive: boolean
  video_id: string
  turn: number
  interest_before: number
}

interface CalibrationSet {
  version: string
  generated_at: string
  total_turns_analyzed: number
  selected_count: number
  counterintuitive_count: number
  examples: CalibrationExample[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

function deltaToScore(delta: number, absoluteInterest: number): number {
  if (delta >= 2) return 9
  if (delta === 1) return 7
  if (delta === 0) {
    if (absoluteInterest >= 6) return 6 // maintaining good rapport
    if (absoluteInterest >= 4) return 5 // neutral, not moving
    return 4 // stalled at cold
  }
  if (delta === -1) return 3
  return 1 // delta <= -2
}

function getScoreBucket(score: number): "9" | "7" | "5-6" | "3-4" | "1" {
  if (score >= 9) return "9"
  if (score >= 7) return "7"
  if (score >= 5) return "5-6"
  if (score >= 3) return "3-4"
  return "1"
}

function isCounterintuitive(turn: ExtractionTurn, groundTruthScore: number): boolean {
  return (
    // Interview question that worked
    (turn.his_move.includes("question_interview") && groundTruthScore >= 7) ||
    // Tease that flopped
    (turn.his_move.includes("tease") && groundTruthScore <= 4) ||
    // Plain statement that worked
    (turn.his_move.includes("statement") && groundTruthScore >= 7) ||
    // Long opener that worked
    (turn.phase === "hook" && turn.turn <= 2 && turn.him.length > 100 && groundTruthScore >= 6) ||
    // Logistics that failed
    (turn.his_move.includes("logistics") && groundTruthScore <= 3)
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Context & Why builders
// ─────────────────────────────────────────────────────────────────────────────

function buildContext(turn: ExtractionTurn, prevTurn: ExtractionTurn | null): string {
  if (!prevTurn) return "He just stopped her on the street."
  const herPrev = prevTurn.her.length > 80 ? prevTurn.her.slice(0, 77) + "..." : prevTurn.her
  return `She just said: "${herPrev}"`
}

function buildWhy(turn: ExtractionTurn, score: number): string {
  const herMoves = turn.her_move
  const parts: string[] = []

  if (herMoves.includes("answer_detail")) parts.push("she gave detail")
  if (herMoves.includes("question_back")) parts.push("she asked back")
  if (herMoves.includes("flirt")) parts.push("she flirted")
  if (herMoves.includes("answer_short")) parts.push("brief answer")
  if (herMoves.includes("short_ack")) parts.push("minimal response")
  if (herMoves.includes("deflect")) parts.push("she deflected")
  if (herMoves.includes("exit")) parts.push("she exited")
  if (herMoves.includes("test")) parts.push("she tested him")
  if (herMoves.includes("laugh")) parts.push("she laughed")
  if (herMoves.includes("busy")) parts.push("she mentioned being busy")

  if (parts.length === 0) {
    if (score >= 7) parts.push("she engaged")
    else if (score >= 5) parts.push("she responded")
    else parts.push("she pulled back")
  }

  return parts.join(", ")
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const extractionsDir = path.join(process.cwd(), "data/woman-responses/extractions")
  const files = fs.readdirSync(extractionsDir).filter((f) => f.endsWith(".json"))

  // Skip list
  const skipFiles = new Set(["DPieYj7nji0.json", "e2dLEB-AwmA.json", "rMNSFU7TyIg.json"])

  const allScoredTurns: ScoredTurn[] = []
  let loadedCount = 0

  for (const file of files) {
    if (skipFiles.has(file)) continue

    const extraction: Extraction = JSON.parse(
      fs.readFileSync(path.join(extractionsDir, file), "utf-8")
    )

    // Skip low confidence and empty
    if (extraction.confidence === "low") continue
    if (!extraction.turns || extraction.turns.length === 0) continue

    loadedCount++

    for (let i = 0; i < extraction.turns.length; i++) {
      const turn = extraction.turns[i]
      const prevInterest = i === 0 ? 4 : extraction.turns[i - 1].her_interest
      const delta = turn.her_interest - prevInterest
      const groundTruthScore = deltaToScore(delta, turn.her_interest)
      const prevTurn = i > 0 ? extraction.turns[i - 1] : null

      allScoredTurns.push({
        turn,
        prevTurn,
        videoId: extraction.video_id,
        delta,
        groundTruthScore,
        isCounterintuitive: isCounterintuitive(turn, groundTruthScore),
        scoreBucket: getScoreBucket(groundTruthScore),
        prevInterest,
      })
    }
  }

  // Score distribution
  const bucketCounts: Record<string, number> = { "9": 0, "7": 0, "5-6": 0, "3-4": 0, "1": 0 }
  for (const st of allScoredTurns) {
    bucketCounts[st.scoreBucket]++
  }

  const counterintuitiveCount = allScoredTurns.filter((st) => st.isCounterintuitive).length

  // ─── Selection ───

  const targets: Record<string, number> = {
    "9": 8,
    "7": 20,
    "5-6": 25,
    "3-4": 15,
    "1": 7,
  }

  const selected: ScoredTurn[] = []
  const videoCountMap = new Map<string, number>()
  const maxPerVideo = 4

  function canAddFromVideo(videoId: string): boolean {
    return (videoCountMap.get(videoId) || 0) < maxPerVideo
  }

  function addTurn(st: ScoredTurn) {
    selected.push(st)
    videoCountMap.set(st.videoId, (videoCountMap.get(st.videoId) || 0) + 1)
  }

  let overflow = 0

  for (const bucket of ["9", "7", "5-6", "3-4", "1"] as const) {
    const target = targets[bucket] + (bucket === "5-6" ? overflow : 0)
    const pool = allScoredTurns.filter((st) => st.scoreBucket === bucket)

    // Sort: counterintuitive first, then diverse his_move types
    pool.sort((a, b) => {
      if (a.isCounterintuitive !== b.isCounterintuitive) {
        return a.isCounterintuitive ? -1 : 1
      }
      // Prefer diversity of his_move type (use first move as key)
      return 0
    })

    let added = 0
    for (const st of pool) {
      if (added >= target) break
      if (!canAddFromVideo(st.videoId)) continue
      addTurn(st)
      added++
    }

    if (added < targets[bucket]) {
      overflow += targets[bucket] - added
    }
  }

  // Ensure at least 2 examples per phase
  const phaseCounts: Record<string, number> = { hook: 0, vibe: 0, invest: 0, close: 0 }
  for (const st of selected) {
    phaseCounts[st.turn.phase]++
  }

  for (const phase of ["hook", "vibe", "invest", "close"]) {
    if (phaseCounts[phase] < 2) {
      const needed = 2 - phaseCounts[phase]
      const candidates = allScoredTurns.filter(
        (st) =>
          st.turn.phase === phase &&
          !selected.includes(st) &&
          canAddFromVideo(st.videoId)
      )
      for (let i = 0; i < Math.min(needed, candidates.length); i++) {
        addTurn(candidates[i])
      }
    }
  }

  // Build output
  const examples: CalibrationExample[] = selected.map((st) => ({
    phase: st.turn.phase,
    context: buildContext(st.turn, st.prevTurn),
    him: st.turn.him,
    her: st.turn.her,
    score: st.groundTruthScore,
    why: buildWhy(st.turn, st.groundTruthScore),
    his_move: st.turn.his_move,
    counterintuitive: st.isCounterintuitive,
    video_id: st.videoId,
    turn: st.turn.turn,
    interest_before: st.prevInterest,
  }))

  const calibrationSet: CalibrationSet = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    total_turns_analyzed: allScoredTurns.length,
    selected_count: examples.length,
    counterintuitive_count: examples.filter((e) => e.counterintuitive).length,
    examples,
  }

  // Write output
  const outputDir = path.join(process.cwd(), "data/woman-responses/prompts/prompt_1")
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, "calibration_set.json")
  fs.writeFileSync(outputPath, JSON.stringify(calibrationSet, null, 2))

  // Console output
  console.log(`=== Calibration Set Builder ===`)
  console.log(`Extractions loaded: ${loadedCount} (high/medium confidence)`)
  console.log(`Total turns analyzed: ${allScoredTurns.length}`)
  console.log(
    `Score distribution: 9→${bucketCounts["9"]}, 7→${bucketCounts["7"]}, 5-6→${bucketCounts["5-6"]}, 3-4→${bucketCounts["3-4"]}, 1→${bucketCounts["1"]}`
  )
  console.log(`Counterintuitive turns found: ${counterintuitiveCount}`)
  console.log(
    `Selected: ${examples.length} examples (${calibrationSet.counterintuitive_count} counterintuitive)`
  )
  console.log(`Output: ${outputPath}`)
}

main()
