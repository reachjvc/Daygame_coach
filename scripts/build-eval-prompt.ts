#!/usr/bin/env npx tsx
/**
 * Build Eval Prompt
 *
 * Reads the calibration set JSON and assembles the full few-shot eval prompt.
 *
 * Usage:
 *   npx tsx scripts/build-eval-prompt.ts <prompt_version>
 *
 * Example:
 *   npx tsx scripts/build-eval-prompt.ts prompt_2
 */

import * as fs from "fs"
import * as path from "path"

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

function main() {
  const promptVersion = process.argv[2]
  if (!promptVersion) {
    console.error("Usage: npx tsx scripts/build-eval-prompt.ts <prompt_version>")
    console.error("Example: npx tsx scripts/build-eval-prompt.ts prompt_2")
    process.exit(1)
  }

  const calibrationPath = path.join(
    process.cwd(),
    `data/woman-responses/prompts/${promptVersion}/calibration_set.json`
  )

  if (!fs.existsSync(calibrationPath)) {
    console.error(`ERROR: Calibration set not found: ${calibrationPath}`)
    console.error("Run scripts/build-eval-calibration-set.ts first.")
    process.exit(1)
  }

  const calibrationSet: CalibrationSet = JSON.parse(fs.readFileSync(calibrationPath, "utf-8"))

  // Helper: interest to label
  function interestLabel(interest: number): string {
    if (interest <= 3) return "cold"
    if (interest <= 5) return "guarded"
    if (interest <= 7) return "curious"
    return "interested"
  }

  // Section 1 — Framing
  const framing = `You score men's lines in real street approach conversations.

Scores are calibrated from 450 real interactions — not theory about what "should" work. A simple question that keeps her talking is good. A clever tease that gets a flat "okay" is bad.

Each example below shows the conversation temperature (~interest/10). The temperature tells you her current engagement level. Use it to calibrate your scoring.`

  // Section 2 — Scoring scale
  const scoringScale = `SCORING (1-10):
9 = she noticeably warms up (asks back, shares personal detail, flirts)
7 = she engages more than before (longer answer, curiosity, elaboration)
6 = maintaining warm rapport (conversation continues smoothly at ~6+ temp)
5 = maintaining cool rapport (conversation continues at ~4-5 temp)
3-4 = she cools down (shorter answers, less invested, pulling back)
1-2 = she shuts down, deflects hard, or exits

TEMPERATURE-BASED DEFAULTS — what a "just okay" line scores at each level:
- At ~1-3 (cold): default 4. Only humor or strong hooks reach 7.
- At ~4-5 (guarded): default 5. Good threading or cold reads reach 7.
- At ~6-7 (curious): default 6. She's engaged — keeping it going = 6. Building energy = 7. Only momentum killers drop to 3-4.
- At ~8+ (interested): default 6. She's invested — almost anything reasonable = 6.

Score ABOVE default when his line creates energy, threads well, or opens something interesting.
Score BELOW default when his line kills momentum, is awkward, ignores her, or is pushy.`

  // Section 3 — Calibration examples
  const exampleLines = calibrationSet.examples.map((ex) => {
    const label = interestLabel(ex.interest_before)
    return `[${ex.phase}, ~${ex.interest_before}/${label}] ${ex.context}
Him: "${ex.him}"
Her: "${ex.her}"
→ ${ex.score} — ${ex.why}`
  })

  const calibrationSection = `CALIBRATION — ${calibrationSet.examples.length} real scored turns from street approaches:

${exampleLines.join("\n\n")}`

  // Section 4 — Response format
  const responseFormat = `RESPONSE FORMAT (JSON only, no markdown):
{"score":7,"feedback":"Short feedback in same language as input","quality":"positive","tags":["cold_read"]}

quality mapping:
- positive: score >= 7
- neutral: score 5-6
- deflect: score 3-4
- skeptical: score <= 2

tags (pick 0-2 most relevant):
- threading: he references or builds on what she just said
- cold_read: he makes an assumption about her personality/vibe
- tease: playful push-pull that creates tension
- question: he asks her something (neutral — can be good or bad depending on context)
- logistics: he proposes plans, asks for number, suggests meeting
- storytelling: he shares a personal story or anecdote
- too_long: more than 3 sentences, monologuing
- try_hard: needy, validation-seeking, over-complimenting
- sexual_too_soon: sexual when she's clearly not warm
- creepy: uncomfortable, invasive, boundary-violating
- ignored_soft_exit: she signaled wanting to leave but he kept pressing`

  // Assemble full prompt
  const fullPrompt = `${framing}

${scoringScale}

${calibrationSection}

${responseFormat}`

  // Write output
  const outputPath = path.join(
    process.cwd(),
    `data/woman-responses/prompts/${promptVersion}/EVAL_SYSTEM_PROMPT.md`
  )
  fs.writeFileSync(outputPath, fullPrompt)

  const charCount = fullPrompt.length
  const estimatedTokens = Math.ceil(charCount / 4)

  console.log(`=== Eval Prompt Builder ===`)
  console.log(`Calibration set: ${calibrationSet.selected_count} examples`)
  console.log(`Output: ${outputPath}`)
  console.log(`Characters: ${charCount.toLocaleString()}`)
  console.log(`Estimated tokens: ~${estimatedTokens.toLocaleString()}`)
}

main()
