#!/usr/bin/env npx ts-node
/**
 * Build examples.json from extracted infield turns
 * Phase 6.1.1: Extract scored examples per bucket for LLM grounding
 */

import * as fs from "fs"
import * as path from "path"

interface Turn {
  turn: number
  phase: string
  him: string
  her: string
  his_move: string[]
  her_move: string[]
  her_interest: number
  notes?: string
}

interface Extraction {
  video_id: string
  source_path: string
  video_type: string
  turns: Turn[]
  confidence: string
}

interface Example {
  him: string
  her: string
  her_interest: number
  his_move: string[]
  her_move: string[]
  context?: string
  video_id: string
  turn: number
}

interface TagExample {
  him: string
  her: string
  result: string
  video_id: string
}

interface Examples {
  evaluation_examples: {
    cold: Example[]
    guarded: Example[]
    curious: Example[]
    interested: Example[]
  }
  tag_examples: {
    interview_question: TagExample[]
    threading: TagExample[]
    cold_read: TagExample[]
    tease: TagExample[]
    sexual: TagExample[]
    deflect: TagExample[]
    exit: TagExample[]
  }
  response_examples: {
    cold: string[]
    guarded: string[]
    curious: string[]
    interested: string[]
  }
  analysis: {
    total_turns: number
    by_bucket: Record<string, number>
    move_correlations: {
      good_moves: Array<{ move: string; avg_interest: number; count: number }>
      bad_moves: Array<{ move: string; avg_interest: number; count: number }>
    }
  }
}

function getBucket(interest: number): "cold" | "guarded" | "curious" | "interested" {
  if (interest <= 3) return "cold"
  if (interest <= 5) return "guarded"
  if (interest <= 7) return "curious"
  return "interested"
}

function getInterestResult(interest: number, her_move: string[]): string {
  if (her_move.includes("exit")) return "she left"
  if (her_move.includes("deflect")) return "deflect, interest dropped"
  if (interest <= 3) return "cold response, minimal"
  if (interest <= 5) return "guarded, polite but distant"
  if (interest <= 7) return "engaged, asked back"
  return "interested, invested"
}

function main() {
  const extractionsDir = path.join(process.cwd(), "data/woman-responses/extractions")
  const outputPath = path.join(process.cwd(), "data/woman-responses/final/examples.json")

  const files = fs.readdirSync(extractionsDir).filter((f) => f.endsWith(".json"))

  console.log(`Processing ${files.length} extraction files...`)

  const examples: Examples = {
    evaluation_examples: {
      cold: [],
      guarded: [],
      curious: [],
      interested: [],
    },
    tag_examples: {
      interview_question: [],
      threading: [],
      cold_read: [],
      tease: [],
      sexual: [],
      deflect: [],
      exit: [],
    },
    response_examples: {
      cold: [],
      guarded: [],
      curious: [],
      interested: [],
    },
    analysis: {
      total_turns: 0,
      by_bucket: { cold: 0, guarded: 0, curious: 0, interested: 0 },
      move_correlations: {
        good_moves: [],
        bad_moves: [],
      },
    },
  }

  // Track move stats
  const moveStats: Record<string, { total_interest: number; count: number }> = {}

  for (const file of files) {
    const filePath = path.join(extractionsDir, file)
    const data: Extraction = JSON.parse(fs.readFileSync(filePath, "utf-8"))

    // Skip low-confidence extractions for grounding
    if (data.confidence === "low") {
      console.log(`Skipping ${data.video_id} (low confidence)`)
      continue
    }

    for (const turn of data.turns) {
      // Skip turns with action-only responses (like "[stops walking]")
      if (turn.her.startsWith("[") && turn.her.endsWith("]")) continue
      if (!turn.her.trim() || turn.her.length < 3) continue

      examples.analysis.total_turns++
      const bucket = getBucket(turn.her_interest)
      examples.analysis.by_bucket[bucket]++

      // Track move correlations
      for (const move of turn.his_move) {
        if (!moveStats[move]) moveStats[move] = { total_interest: 0, count: 0 }
        moveStats[move].total_interest += turn.her_interest
        moveStats[move].count++
      }

      const example: Example = {
        him: turn.him,
        her: turn.her,
        her_interest: turn.her_interest,
        his_move: turn.his_move,
        her_move: turn.her_move,
        context: turn.notes,
        video_id: data.video_id,
        turn: turn.turn,
      }

      // Add to bucket examples (limit per bucket for prompt length)
      if (examples.evaluation_examples[bucket].length < 15) {
        examples.evaluation_examples[bucket].push(example)
      }

      // Add verbatim her response
      const cleanResponse = turn.her
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100)
      if (cleanResponse.length >= 3 && !cleanResponse.startsWith("[")) {
        if (examples.response_examples[bucket].length < 15) {
          if (!examples.response_examples[bucket].includes(cleanResponse)) {
            examples.response_examples[bucket].push(cleanResponse)
          }
        }
      }

      // Add to tag examples
      if (turn.his_move.includes("question_interview") && examples.tag_examples.interview_question.length < 10) {
        examples.tag_examples.interview_question.push({
          him: turn.him,
          her: turn.her,
          result: getInterestResult(turn.her_interest, turn.her_move),
          video_id: data.video_id,
        })
      }

      if (turn.his_move.includes("cold_read") && examples.tag_examples.cold_read.length < 10) {
        examples.tag_examples.cold_read.push({
          him: turn.him,
          her: turn.her,
          result: getInterestResult(turn.her_interest, turn.her_move),
          video_id: data.video_id,
        })
      }

      if (turn.his_move.includes("tease") && examples.tag_examples.tease.length < 10) {
        examples.tag_examples.tease.push({
          him: turn.him,
          her: turn.her,
          result: getInterestResult(turn.her_interest, turn.her_move),
          video_id: data.video_id,
        })
      }

      if (turn.his_move.includes("sexual") && examples.tag_examples.sexual.length < 5) {
        examples.tag_examples.sexual.push({
          him: turn.him,
          her: turn.her,
          result: getInterestResult(turn.her_interest, turn.her_move),
          video_id: data.video_id,
        })
      }

      if (turn.her_move.includes("deflect") && examples.tag_examples.deflect.length < 10) {
        examples.tag_examples.deflect.push({
          him: turn.him,
          her: turn.her,
          result: getInterestResult(turn.her_interest, turn.her_move),
          video_id: data.video_id,
        })
      }

      if (turn.her_move.includes("exit") && examples.tag_examples.exit.length < 10) {
        examples.tag_examples.exit.push({
          him: turn.him,
          her: turn.her,
          result: "exit",
          video_id: data.video_id,
        })
      }
    }
  }

  // Calculate move correlations
  const moveAvg = Object.entries(moveStats)
    .map(([move, stats]) => ({
      move,
      avg_interest: stats.count > 0 ? Math.round((stats.total_interest / stats.count) * 10) / 10 : 0,
      count: stats.count,
    }))
    .filter((m) => m.count >= 3) // Only moves with enough data

  examples.analysis.move_correlations.good_moves = moveAvg
    .filter((m) => m.avg_interest >= 5.5)
    .sort((a, b) => b.avg_interest - a.avg_interest)

  examples.analysis.move_correlations.bad_moves = moveAvg
    .filter((m) => m.avg_interest < 5.5)
    .sort((a, b) => a.avg_interest - b.avg_interest)

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(examples, null, 2))
  console.log(`\nWrote ${outputPath}`)

  // Print summary
  console.log("\n=== SUMMARY ===")
  console.log(`Total turns: ${examples.analysis.total_turns}`)
  console.log(`By bucket:`)
  for (const [bucket, count] of Object.entries(examples.analysis.by_bucket)) {
    console.log(`  ${bucket}: ${count} (${Math.round((count / examples.analysis.total_turns) * 100)}%)`)
  }

  console.log("\nGood moves (avg interest >= 5.5):")
  for (const m of examples.analysis.move_correlations.good_moves) {
    console.log(`  ${m.move}: ${m.avg_interest} avg (n=${m.count})`)
  }

  console.log("\nBad moves (avg interest < 5.5):")
  for (const m of examples.analysis.move_correlations.bad_moves) {
    console.log(`  ${m.move}: ${m.avg_interest} avg (n=${m.count})`)
  }

  console.log("\nExamples collected:")
  console.log(`  Cold examples: ${examples.evaluation_examples.cold.length}`)
  console.log(`  Guarded examples: ${examples.evaluation_examples.guarded.length}`)
  console.log(`  Curious examples: ${examples.evaluation_examples.curious.length}`)
  console.log(`  Interested examples: ${examples.evaluation_examples.interested.length}`)
  console.log(`  Interview question tags: ${examples.tag_examples.interview_question.length}`)
  console.log(`  Cold read tags: ${examples.tag_examples.cold_read.length}`)
  console.log(`  Tease tags: ${examples.tag_examples.tease.length}`)
  console.log(`  Deflect tags: ${examples.tag_examples.deflect.length}`)
  console.log(`  Exit tags: ${examples.tag_examples.exit.length}`)
}

main()
