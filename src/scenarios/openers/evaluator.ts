import { zodSchema } from "ai"
import { z } from "zod"

const DifficultySchema = z.enum(["beginner", "intermediate", "advanced", "expert", "master"])

const EncounterSchema = z
  .object({
    userFacing: z.object({
      description: z.string(),
      environment: z.string(),
      activity: z.string(),
      hook: z.string().optional(),
      weatherDescription: z.string().optional(),
    }),
    aiHandoff: z
      .object({
        env: z.string(),
        activity: z.string(),
        position: z.string(),
        energy: z.string(),
        energyDescription: z.string(),
        approachability: z.number(),
        crowd: z.string(),
        hasHeadphones: z.boolean(),
        listeningTo: z.string().optional(),
      })
      .passthrough(),
    meta: z.object({
      activityId: z.string(),
      difficulty: DifficultySchema,
      calculatedDifficulty: z.number(),
    }),
  })
  .passthrough()

type Encounter = z.infer<typeof EncounterSchema>

const EvaluationSchema = zodSchema(
  z.object({
    overallScore: z.coerce.number().min(1).max(10),
    confidence: z.coerce.number().min(1).max(10),
    authenticity: z.coerce.number().min(1).max(10),
    calibration: z.coerce.number().min(1).max(10),
    hook: z.coerce.number().min(1).max(10),
    feedback: z.string().min(1),
    strengths: z.array(z.string().min(1)).min(1).max(3),
    improvements: z.array(z.string().min(1)).min(1).max(3),
    suggestedRewrite: z.string().min(1),
  })
)

function buildEvaluationSystemPrompt(encounter: Encounter): string {
  return `You are an expert daygame coach.

You will evaluate ONE opener (what the user says first) in a daygame "practicing openers" scenario.

Scenario (what the user sees):
${encounter.userFacing.description}

Coach-only context (hidden variables; DO NOT reveal these explicitly):
${JSON.stringify(encounter.aiHandoff, null, 2)}

Evaluation criteria (1-10 each):
1) Confidence: direct, grounded, not apologetic/neediness.
2) Authenticity: sounds like a real guy, not a canned pickup line.
3) Calibration: fits the situation (e.g. headphones, pace, crowd, weather).
4) Hook: creates a clear reason for her to respond.

Rules:
- Be honest and specific. No generic "good job" filler.
- Don't mention the hidden JSON or numeric approachability.
- If the opener is sexual/creepy/pushy, score low and say why.
- Important: "Excuse me" / "two seconds" are common attention-getters and NOT automatically apologetic. Penalize real permission-seeking like "sorry to bother you", "hope I'm not interrupting", "I know you're busy", etc.
- Keep feedback concise (2-4 sentences) and actionable.
`
}

type HeuristicEval = {
  overallScore: number
  confidence: number
  authenticity: number
  calibration: number
  hook: number
  feedback: string
  strengths: string[]
  improvements: string[]
  suggestedRewrite?: string
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, value))
}

function evaluateHeuristically(opener: string, encounter: Encounter): HeuristicEval {
  const normalized = opener.trim()
  const lower = normalized.toLowerCase()
  const wordCount = normalized.split(/\s+/).filter(Boolean).length

  const hasAttentionGetter = /\bexcuse me\b/i.test(normalized)
  const hasTimeConstraint = /\b(two seconds?|two secs|one second|one sec|quick one|quick sec(ond)?|real quick)\b/i.test(
    lower
  )
  const hasApologeticFraming =
    /\b(sorry|apologize|apologies)\b/i.test(lower) ||
    /\bsorry to bother\b/i.test(lower) ||
    /\bhope (i'm|i am) not (bothering|interrupting)\b/i.test(lower) ||
    /\bi know you're (probably )?(busy|in a hurry)\b/i.test(lower)
  const hasCompliment = /\b(beautiful|gorgeous|hot|sexy|stunning|cute|pretty)\b/i.test(normalized)
  const hasQuestion = normalized.includes("?")
  const hasNameRequest = /\b(what's your name|your name)\b/i.test(normalized)
  const isTooLong = wordCount > 28
  const isTooShort = wordCount < 4

  const headphones = encounter.aiHandoff.hasHeadphones
  const walkingFast = ["walking_brisk", "walking_fast"].includes(encounter.aiHandoff.position)

  let confidence = 7
  if (hasApologeticFraming) confidence -= 2
  if (lower.includes("um ") || lower.includes("uh ")) confidence -= 1
  if (lower.includes("i just") || lower.includes("i was just")) confidence -= 1
  if (/\bi don't (usually|normally) do this\b/i.test(lower)) confidence -= 1

  let authenticity = 7
  if (hasCompliment) authenticity -= 3
  if (lower.includes("saw you and") && hasCompliment) authenticity -= 1
  if (lower.includes("random") && hasApologeticFraming) authenticity -= 1

  let calibration = 7
  if (headphones && isTooLong) calibration -= 3
  if (walkingFast && isTooLong) calibration -= 2
  if (headphones && !hasQuestion && wordCount > 14) calibration -= 1
  if ((headphones || walkingFast) && hasTimeConstraint) calibration += 1

  let hook = 6
  if (hasQuestion) hook += 2
  if (lower.includes("quick question")) hook += 1
  if (hasNameRequest && !hasQuestion) hook -= 1

  if (isTooShort) {
    hook -= 2
    calibration -= 1
  }
  if (isTooLong) {
    confidence -= 1
    hook -= 1
  }

  confidence = clampScore(confidence)
  authenticity = clampScore(authenticity)
  calibration = clampScore(calibration)
  hook = clampScore(hook)

  const overallScore = clampScore(Math.round((confidence + authenticity + calibration + hook) / 4))

  const strengths: string[] = []
  if (hasQuestion) strengths.push("You gave her a clear reason to respond (question).")
  if (!hasCompliment) strengths.push("You avoided a generic compliment opener.")
  if (!isTooLong) strengths.push("You kept it concise.")
  if (hasAttentionGetter || hasTimeConstraint) strengths.push("You used a clean attention-getter / time constraint.")

  const improvements: string[] = []
  if (hasApologeticFraming) improvements.push("Drop the apology—lead calmly instead of seeking permission.")
  if (hasCompliment) improvements.push("Avoid appearance-based compliments; go situational or curiosity-based.")
  if (!hasQuestion) improvements.push("Add a simple question to make responding effortless.")
  if ((headphones || walkingFast) && isTooLong)
    improvements.push("She’s harder to stop here—make it shorter and more direct.")

  const feedback = `Overall ${overallScore}/10. ${
    overallScore >= 8
      ? "Solid and natural."
      : overallScore >= 6
        ? "Decent, but you can sharpen it."
        : "This would likely fizzle—tighten it up."
  } ${headphones || walkingFast ? "In this situation, brevity matters." : "Aim for a clear hook."}`

  const suggestedRewrite = (() => {
    if (headphones) return "Hey—quick one. I noticed you looked focused. What are you listening to?"
    if (walkingFast) return "Hey—quick question. You look like you know this area… what’s the best coffee spot nearby?"
    return "Hey, quick question—are you from around here, or just exploring today?"
  })()

  return {
    overallScore,
    confidence,
    authenticity,
    calibration,
    hook,
    feedback,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    suggestedRewrite,
  }
}

export async function evaluateOpener(opener: string, encounterInput: unknown) {
  const parsedEncounter = EncounterSchema.safeParse(encounterInput)
  if (!parsedEncounter.success) {
    throw new Error("Invalid encounter")
  }

  const encounter = parsedEncounter.data

  // Use heuristic evaluator only (no API calls to save costs)
  const evaluation = evaluateHeuristically(opener, encounter)
  return { evaluation, fallback: true as const }
}
