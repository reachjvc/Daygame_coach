/**
 * Keep It Going - AI Chat Integration
 *
 * Uses Claude to generate woman's responses based on conversation context.
 * Supports both Claude Code (headless) and Anthropic API.
 */

import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import type { Language, KeepItGoingContext, ResponseQuality, CloseOutcome, EvalResult, InterestBucket } from "./types"
import { useClaudeCode, queryClaudeCodeJSON, queryClaudeCode } from "./claudeCode"
import { logAIUsage, checkUserBudget } from "@/src/api_ai/apiAiService"
import type { ModelName } from "@/src/api_ai/types"
import { getInterestBucket, getBucketProfile, PROFILES, RUBRIC } from "./realisticProfiles"
import { getPhase } from "./generator"

type ConversationMessage = {
  role: "user" | "assistant"
  content: string
}

// ─────────────────────────────────────────────────────────────────────────────
// System Prompts
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<Language, string> = {
  da: `Du er en kvinde i 20'erne der lige er blevet approachet af en fyr på gaden. Du svarer naturligt og realistisk baseret på kvaliteten af hans svar.

REGLER:
- Svar KORT (max 1-2 sætninger)
- Brug *handlinger* i stjerner som *smiler* eller *kigger væk*
- Vær realistisk - ikke for nem, ikke for svær
- Beløn ikke middelmådige replikker med varme
- Aldrig break character
- Svar på dansk`,

  en: `You are a woman in her 20s who was just approached by a guy on the street. You respond naturally and realistically based on the quality of his responses.

RULES:
- Keep responses SHORT (max 1-2 sentences)
- Use *actions* in asterisks like *smiles* or *looks away*
- Be realistic - not too easy, not too difficult
- Do not reward mediocre lines with warmth
- Never break character
- Respond in English`,
}

const QUALITY_INSTRUCTIONS: Record<Language, Record<ResponseQuality, string>> = {
  da: {
    positive:
      "Han sagde noget godt. Indenfor din nuværende interesse: vær en anelse varmere/mere engageret (men følg stadig bucket-reglerne).",
    neutral:
      "Det var okay. Hold dig omkring din nuværende baseline og giv ham en chance mere (følg bucket-reglerne).",
    deflect:
      "Det var kedeligt/interview-agtigt. Svar kort og distanceret, evt. med en deflect (følg bucket-reglerne).",
    skeptical:
      "Det var try-hard eller weird. Vis skepsis, træk dig lidt tilbage og gør det nemt at afslutte (følg bucket-reglerne).",
  },
  en: {
    positive:
      "He said something good. Within your current interest: be slightly warmer/more engaged (but still obey your bucket rules).",
    neutral:
      "It was okay. Stay around your current baseline and give him another chance (obey your bucket rules).",
    deflect:
      "It was boring/interview-like. Respond briefly and distantly, maybe with a deflect (obey your bucket rules).",
    skeptical:
      "It was too try-hard or weird. Show skepticism, step back, and make it easy to end (obey your bucket rules).",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Evaluation
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from "fs"
import * as path from "path"

// Load the newest eval prompt (highest prompt_N directory)
const PROMPTS_DIR = path.join(process.cwd(), "data/woman-responses/prompts")
const latestPrompt = fs.readdirSync(PROMPTS_DIR)
  .filter(d => /^prompt_\d+$/.test(d))
  .sort((a, b) => parseInt(b.split("_")[1]) - parseInt(a.split("_")[1]))[0]
const EVAL_PROMPT_PATH = path.join(PROMPTS_DIR, latestPrompt, "EVAL_SYSTEM_PROMPT.md")
const EVAL_SYSTEM_PROMPT = fs.existsSync(EVAL_PROMPT_PATH)
  ? fs.readFileSync(EVAL_PROMPT_PATH, "utf-8")
  : (() => { throw new Error(`Eval prompt not found: ${EVAL_PROMPT_PATH}. Run: npx tsx scripts/build-eval-prompt.ts`) })()

export async function evaluateWithAI(
  userMessage: string,
  recentConversation: ConversationMessage[],
  language: Language,
  context: KeepItGoingContext,
  userId: string
): Promise<EvalResult> {
  console.log("[evaluateWithAI] Called, useClaudeCode() =", useClaudeCode())
  console.log("[evaluateWithAI] USE_CLAUDE_CODE env =", process.env.USE_CLAUDE_CODE)

  // Skip budget check for Claude Code mode (no API cost, no Supabase context)
  if (!useClaudeCode()) {
    const budget = await checkUserBudget(userId)
    if (!budget.withinBudget) {
      throw new Error("Budget exceeded - cannot evaluate response")
    }
  }

  const situationContext =
    language === "da"
      ? `Sted: ${context.situation.location[language]}. ${context.situation.setup[language]}`
      : `Location: ${context.situation.location[language]}. ${context.situation.setup[language]}`

  // Include recent conversation for threading + "ignored soft exit" detection.
  const conversationWindow =
    recentConversation.length > 0
      ? recentConversation
          .map((m) => `${m.role === "user" ? "Him" : "Her"}: ${m.content}`)
          .join("\n")
      : `Her: "${context.situation.herFirstResponse[language]}"`

  const lastHerMessage =
    [...recentConversation].reverse().find((m) => m.role === "assistant")?.content ||
    context.situation.herFirstResponse[language]

  const herContext =
    language === "da"
      ? `Hendes sidste besked: "${lastHerMessage}"`
      : `Her last message: "${lastHerMessage}"`

  const conversationLabel =
    language === "da" ? "Seneste samtale (nyeste nederst):" : "Recent conversation (most recent last):"

  const temperatureLabel =
    context.interestLevel <= 3 ? "cold" :
    context.interestLevel <= 5 ? "guarded" :
    context.interestLevel <= 7 ? "curious" : "interested"

  const temperatureContext =
    language === "da"
      ? `Samtaletemperatur: ~${context.interestLevel}/10 (${temperatureLabel}), tur ${context.turnCount + 1}`
      : `Conversation temperature: ~${context.interestLevel}/10 (${temperatureLabel}), turn ${context.turnCount + 1}`

  const userPrompt = `${situationContext}

${temperatureContext}

${conversationLabel}
${conversationWindow}

${herContext}

His response: "${userMessage}"

Evaluate in ${language === "da" ? "Danish" : "English"}. Score based on likely effect at this temperature, not technique.`

  // Use Claude Code if enabled (no tracking for local CLI)
  if (useClaudeCode()) {
    const fullPrompt = `${EVAL_SYSTEM_PROMPT}\n\n${userPrompt}`
    const parsed = queryClaudeCodeJSON<EvalResult>(fullPrompt)
    return {
      score: Math.max(1, Math.min(10, parsed.score)),
      feedback: parsed.feedback,
      quality: parsed.quality,
      tags: parsed.tags || [],
    }
  }

  // Use Anthropic API with tracking
  const startTime = Date.now()
  const model = (process.env.AI_MODEL || "claude-3-5-haiku-20241022") as ModelName

  // DEBUG: Log EXACTLY what we're sending
  console.log("[evaluateWithAI] PROMPT DEBUG:", {
    model,
    envModel: process.env.AI_MODEL,
    systemPromptLength: EVAL_SYSTEM_PROMPT.length,
    userPromptLength: userPrompt.length,
    systemPromptPreview: EVAL_SYSTEM_PROMPT.substring(0, 100) + "...",
    userPromptFull: userPrompt,
    estimatedTokens: Math.ceil((EVAL_SYSTEM_PROMPT.length + userPrompt.length) / 4),
  })

  const result = await generateText({
    model: anthropic(model),
    system: EVAL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxOutputTokens: 150,
    temperature: 0.3,
  })

  // DEBUG: Log response metadata including actual model
  const actualModel = (result.response as { modelId?: string })?.modelId || "unknown"
  console.log("[evaluateWithAI] Response:", {
    requestedModel: model,
    actualModel,
    usage: result.usage,
    providerMetadata: result.providerMetadata,
  })

  // Log AI usage (with error handling to prevent crashes)
  try {
    console.log(`[evaluateWithAI] Logging AI usage for user ${userId}`)
    await logAIUsage({
      userId,
      feature: "keep-it-going",
      scenarioId: context.situation.id,
      model,
      operation: "evaluate",
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        cacheCreationTokens: result.providerMetadata?.anthropic?.cacheCreationInputTokens as number | undefined,
        cacheReadTokens: result.providerMetadata?.anthropic?.cacheReadInputTokens as number | undefined,
      },
      responseTimeMs: Date.now() - startTime,
      systemPrompt: EVAL_SYSTEM_PROMPT,
      userPrompt,
      aiResponse: result.text,
    })
    console.log(`[evaluateWithAI] Successfully logged AI usage`)
  } catch (logError) {
    console.error(`[evaluateWithAI] FAILED to log AI usage:`, logError)
    // Don't throw - continue execution even if logging fails
  }

  // Check budget again and log warning if threshold crossed
  const updatedBudget = await checkUserBudget(userId)
  if (updatedBudget.warningLevel !== "none") {
    console.warn(
      `[evaluateWithAI] User ${userId} budget warning: ${updatedBudget.warningLevel} (${Math.round(updatedBudget.usagePercentage * 100)}%)`
    )
  }

  const parsed = JSON.parse(result.text.trim())
  return {
    score: Math.max(1, Math.min(10, parsed.score)),
    feedback: parsed.feedback,
    quality: parsed.quality as ResponseQuality,
    tags: parsed.tags || [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Response Generation
// ─────────────────────────────────────────────────────────────────────────────

/** Max message pairs to include in AI context (user + assistant = 1 pair) */
const MAX_HISTORY_PAIRS = 4

/**
 * Apply sliding window to conversation history.
 * Keeps only the last N message pairs to reduce token usage.
 */
function applyHistoryWindow(history: ConversationMessage[]): ConversationMessage[] {
  const maxMessages = MAX_HISTORY_PAIRS * 2
  return history.length <= maxMessages ? history : history.slice(-maxMessages)
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

function countSentences(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  const parts = trimmed.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
  return parts.length || 1
}

function countActions(text: string): number {
  const matches = text.match(/\*[^*]+\*/g)
  return matches ? matches.length : 0
}

function validateWomanResponse(
  text: string,
  bucket: InterestBucket,
  profile: ReturnType<typeof getBucketProfile>
): string[] {
  const violations: string[] = []
  const trimmed = text.trim()
  if (!trimmed) violations.push("empty response")

  const wordCount = countWords(trimmed)
  if (wordCount > profile.wordCount.max) {
    violations.push(`too many words (${wordCount} > ${profile.wordCount.max})`)
  }

  const sentenceCount = countSentences(trimmed)
  if (sentenceCount > PROFILES.global.maxSentences) {
    violations.push(`too many sentences (${sentenceCount} > ${PROFILES.global.maxSentences})`)
  }

  const actions = countActions(trimmed)
  if (actions > PROFILES.global.actions.maxPerMessage) {
    violations.push(`too many *actions* (${actions} > ${PROFILES.global.actions.maxPerMessage})`)
  }

  if (bucket === "cold" && trimmed.includes("?")) {
    violations.push("asked a question in cold bucket")
  }

  return violations
}

function clampWomanResponse(
  text: string,
  bucket: InterestBucket,
  profile: ReturnType<typeof getBucketProfile>
): string {
  let out = text.trim()

  // Keep at most one *action*
  let keptFirstAction = false
  out = out.replace(/\*[^*]+\*/g, (m) => {
    if (!keptFirstAction) {
      keptFirstAction = true
      return m
    }
    return ""
  })

  // Max N sentences (best-effort)
  const sentences = out.match(/[^.!?]+[.!?]?/g)
  if (sentences && sentences.length > PROFILES.global.maxSentences) {
    out = sentences.slice(0, PROFILES.global.maxSentences).join(" ").trim()
  }

  // Cold bucket: never ask questions back
  if (bucket === "cold") {
    out = out.replace(/\?/g, "")
  }

  // Max words
  const words = out.split(/\s+/).filter(Boolean)
  if (words.length > profile.wordCount.max) {
    out = words.slice(0, profile.wordCount.max).join(" ").trim()
  }

  // Normalize whitespace after deletions
  out = out.replace(/\s{2,}/g, " ").trim()
  return out
}

interface GenerateResponseOptions {
  context: KeepItGoingContext
  userMessage: string
  quality: ResponseQuality
  conversationHistory: ConversationMessage[]
  userId: string
}

export async function generateAIResponse(options: GenerateResponseOptions): Promise<string> {
  const { context, userMessage, quality, conversationHistory, userId } = options
  const { language, situation } = context

  // Check budget before making API call
  const budget = await checkUserBudget(userId)
  if (!budget.withinBudget) {
    throw new Error("Budget exceeded - cannot generate response")
  }

  const systemPrompt = buildSystemPrompt(context, quality)
  const bucket = getInterestBucket(context.interestLevel)
  const profile = getBucketProfile(bucket)

  // Build messages array with windowed conversation history (reduces token usage)
  const windowedHistory = applyHistoryWindow(conversationHistory)
  const messages: ConversationMessage[] = [
    { role: "assistant", content: situation.herFirstResponse[language] },
    ...windowedHistory,
    { role: "user", content: userMessage },
  ]

  // Use Claude Code if enabled (no tracking for local CLI)
  if (useClaudeCode()) {
    const conversationText = messages
      .map((m) => `${m.role === "user" ? "Him" : "Her"}: ${m.content}`)
      .join("\n")
    const fullPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nRespond as her (1-2 sentences max, no quotes around response):`
    const response = queryClaudeCode(fullPrompt).trim()
    const violations = validateWomanResponse(response, bucket, profile)
    if (violations.length === 0) return response

    const retryPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nYour previous response violated constraints:\n- ${violations.join(
      "\n- "
    )}\n\nRewrite as her (obey ALL rules, no quotes):`
    const retry = queryClaudeCode(retryPrompt).trim()
    const retryViolations = validateWomanResponse(retry, bucket, profile)
    return retryViolations.length ? clampWomanResponse(retry, bucket, profile) : retry
  }

  // Use Anthropic API with tracking
  const startTime = Date.now()
  const model = (process.env.AI_MODEL || "claude-3-5-haiku-20241022") as ModelName

  const result = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    maxOutputTokens: 100,
    temperature: 0.8,
  })

  // Log AI usage (with error handling to prevent crashes)
  try {
    console.log(`[generateAIResponse] Logging AI usage for user ${userId}`)
    // Format conversation for logging
    const conversationForLog = messages.map((m) => `${m.role}: ${m.content}`).join("\n")
    await logAIUsage({
      userId,
      feature: "keep-it-going",
      scenarioId: context.situation.id,
      model,
      operation: "generate_response",
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        cacheCreationTokens: result.providerMetadata?.anthropic?.cacheCreationInputTokens as number | undefined,
        cacheReadTokens: result.providerMetadata?.anthropic?.cacheReadInputTokens as number | undefined,
      },
      responseTimeMs: Date.now() - startTime,
      systemPrompt,
      userPrompt: conversationForLog,
      aiResponse: result.text,
    })
    console.log(`[generateAIResponse] Successfully logged AI usage`)
  } catch (logError) {
    console.error(`[generateAIResponse] FAILED to log AI usage:`, logError)
    // Don't throw - continue execution even if logging fails
  }

  // Check budget again and log warning if threshold crossed
  const updatedBudget = await checkUserBudget(userId)
  if (updatedBudget.warningLevel !== "none") {
    console.warn(
      `[generateAIResponse] User ${userId} budget warning: ${updatedBudget.warningLevel} (${Math.round(updatedBudget.usagePercentage * 100)}%)`
    )
  }

  let text = result.text.trim()
  const violations = validateWomanResponse(text, bucket, profile)
  if (violations.length === 0) return text

  // One retry with lower temperature and explicit constraint reminder.
  const retryStartTime = Date.now()
  const retrySystemPrompt = `${systemPrompt}

IMPORTANT: Your previous response violated constraints:
- ${violations.join("\n- ")}

Rewrite your response to comply. Output only the corrected response (no quotes).`

  const retryResult = await generateText({
    model: anthropic(model),
    system: retrySystemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    maxOutputTokens: 100,
    temperature: 0.3,
  })

  try {
    const conversationForLog = messages.map((m) => `${m.role}: ${m.content}`).join("\n")
    await logAIUsage({
      userId,
      feature: "keep-it-going",
      scenarioId: context.situation.id,
      model,
      operation: "generate_response_retry",
      usage: {
        inputTokens: retryResult.usage.inputTokens ?? 0,
        outputTokens: retryResult.usage.outputTokens ?? 0,
        cacheCreationTokens: retryResult.providerMetadata?.anthropic?.cacheCreationInputTokens as number | undefined,
        cacheReadTokens: retryResult.providerMetadata?.anthropic?.cacheReadInputTokens as number | undefined,
      },
      responseTimeMs: Date.now() - retryStartTime,
      systemPrompt: retrySystemPrompt,
      userPrompt: conversationForLog,
      aiResponse: retryResult.text,
    })
  } catch (logError) {
    console.error(`[generateAIResponse] FAILED to log retry AI usage:`, logError)
  }

  text = retryResult.text.trim()
  const retryViolations = validateWomanResponse(text, bucket, profile)
  return retryViolations.length ? clampWomanResponse(text, bucket, profile) : text
}

function buildSystemPrompt(context: KeepItGoingContext, quality: ResponseQuality): string {
  const { language, situation, interestLevel } = context
  const lang = language

  const basePrompt = SYSTEM_PROMPTS[lang]
  const qualityInstruction = QUALITY_INSTRUCTIONS[lang][quality]

  // This response is to his current line (the next processed turn)
  const nextTurnCount = context.turnCount + 1
  const phase = getPhase(nextTurnCount)

  // Get bucket-specific constraints
  const bucket = getInterestBucket(interestLevel)
  const profile = getBucketProfile(bucket)
  const bucketConstraints = getBucketConstraints(bucket, profile, lang)

  const contextInfo =
    lang === "da"
      ? `KONTEKST:
- Sted: ${situation.location[lang]}
- Situation: ${situation.setup[lang]}
- Hans åbner: "${situation.yourOpener[lang]}"
- Tur: ${nextTurnCount} (fase: ${phase})
- Din interesse: ${interestLevel}/10 (${getBucketLabel(bucket, lang)})

${bucketConstraints}

DENNE REPLIK: ${qualityInstruction}`
      : `CONTEXT:
- Location: ${situation.location[lang]}
- Situation: ${situation.setup[lang]}
- His opener: "${situation.yourOpener[lang]}"
- Turn: ${nextTurnCount} (phase: ${phase})
- Your interest: ${interestLevel}/10 (${getBucketLabel(bucket, lang)})

${bucketConstraints}

THIS LINE: ${qualityInstruction}`

  return `${basePrompt}

${contextInfo}`
}

function getBucketLabel(bucket: InterestBucket, lang: Language): string {
  const labels: Record<InterestBucket, Record<Language, string>> = {
    cold: { da: "kold", en: "cold" },
    guarded: { da: "afventende", en: "guarded" },
    curious: { da: "nysgerrig", en: "curious" },
    interested: { da: "interesseret", en: "interested" },
  }
  return labels[bucket][lang]
}

function getBucketConstraints(bucket: InterestBucket, profile: ReturnType<typeof getBucketProfile>, lang: Language): string {
  if (lang === "da") {
    switch (bucket) {
      case "cold":
        return `VIGTIGE REGLER FOR DIN NUVÆRENDE INTERESSE:
- Max ${profile.wordCount.max} ord
- Stil ALDRIG spørgsmål tilbage
- Du kan ignorere, afvise, eller forlade
- Vær kort og uimponeret
- Du er IKKE her for at være sød

EKSEMPLER FRA VIRKELIGE INTERAKTIONER:
- "Nej."
- "Jeg har en kæreste."
- "Jeg skal videre." *går*
- "Jeg taler ikke engelsk."
- "Det var hyggeligt at møde dig." *går*`
      case "guarded":
        return `VIGTIGE REGLER FOR DIN NUVÆRENDE INTERESSE:
- Hold det kort (${profile.wordCount.min}-${profile.wordCount.max} ord)
- Stil sjældent spørgsmål tilbage
- Vær høflig men distanceret
- Giv ham en chance, men invester ikke endnu

EKSEMPLER FRA VIRKELIGE INTERAKTIONER:
- "Ja."
- "Okay, fedt."
- "Nej, jeg er fra Windsor."
- "Det ved jeg ikke."
- "Ja, men jeg skal gå nu, så det var hyggeligt at møde dig."`
      case "curious":
        return `VIGTIGE REGLER FOR DIN NUVÆRENDE INTERESSE:
- Du må gerne svare lidt længere (${profile.wordCount.min}-${profile.wordCount.max} ord)
- Du kan stille et spørgsmål tilbage sommetider
- Vær engageret og måske lidt legesyg
- Men du er IKKE forelsket endnu

EKSEMPLER FRA VIRKELIGE INTERAKTIONER:
- "Hvor studerer du? Ah, du går på Ryerson."
- "Det var så sjovt, det var hysterisk."
- "Ja, okay, kom med."
- "Ej, jeg kan godt lide dig, jeg synes du er sød, jeg nyder at snakke..."`
      case "interested":
        return `VIGTIGE REGLER FOR DIN NUVÆRENDE INTERESSE:
- Du kan svare lidt længere (${profile.wordCount.min}-${profile.wordCount.max} ord)
- Du må gerne stille spørgsmål og investere
- Vær varm og legesyg, måske flirtende
- Stadig realistisk - ikke overkompenserende

EKSEMPLER FRA VIRKELIGE INTERAKTIONER:
- "Ja, jeg er klar!"
- "Du kunne tage mit nummer, hvis det var det du spurgte om..."
- "Jeg har daddy issues så det er ikke et problem."
- "Ja, nej, du er virkelig sød."
- "Hundrede procent."`
    }
  } else {
    switch (bucket) {
      case "cold":
        return `IMPORTANT RULES FOR YOUR CURRENT INTEREST:
- Max ${profile.wordCount.max} words
- NEVER ask questions back
- You can ignore, dismiss, or leave
- Be short and unimpressed
- You are NOT here to be nice

REAL EXAMPLES FROM DATA:
- "No."
- "I have a boyfriend."
- "I have to go." *walks away*
- "I don't speak English."
- "It was nice to meet you." *leaves*
- "I don't want to give out my number."`
      case "guarded":
        return `IMPORTANT RULES FOR YOUR CURRENT INTEREST:
- Keep it short (${profile.wordCount.min}-${profile.wordCount.max} words)
- Rarely ask questions back
- Be polite but distant
- Give him a chance, but don't invest yet

REAL EXAMPLES FROM DATA:
- "Yeah."
- "Okay, cool."
- "No, I'm from Windsor."
- "I don't know."
- "Yeah, but I'm going to go now, so it was nice to meet you."
- "I'm glad you liked it."`
      case "curious":
        return `IMPORTANT RULES FOR YOUR CURRENT INTEREST:
- You can respond a bit longer (${profile.wordCount.min}-${profile.wordCount.max} words)
- You can ask a question back sometimes
- Be engaged and maybe a bit playful
- But you're NOT in love yet

REAL EXAMPLES FROM DATA:
- "Where are you studying? Oh, you're from Ryerson."
- "And it was so funny, it was hilarious."
- "Yes. Okay, come on."
- "No, I mean, I like you, I think you're cute, I enjoy talking..."
- "I know you're so warm and welcoming."
- "I'm just gonna settle for subpar food and then..."`
      case "interested":
        return `IMPORTANT RULES FOR YOUR CURRENT INTEREST:
- You can respond longer (${profile.wordCount.min}-${profile.wordCount.max} words)
- You can ask questions and invest
- Be warm and playful, maybe flirty
- Still realistic - not overcompensating

REAL EXAMPLES FROM DATA:
- "Yeah, I'm done." [agrees to instant date]
- "You could take my number, if that's what you were asking..."
- "I have daddy issues so it's not a problem." [qualifies herself]
- "Yeah, no, you're really sweet."
- "A hundred percent." [agrees to come back with him]
- "Did you give off fuckboy vibes though?" [playful testing]`
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Close Outcome & Response Generation
// ─────────────────────────────────────────────────────────────────────────────

export function getCloseOutcome(averageScore: number): CloseOutcome {
  if (averageScore >= 6) return "success"
  if (averageScore >= 4) return "hesitant"
  return "decline"
}

export async function generateCloseResponse(
  context: KeepItGoingContext,
  outcome: CloseOutcome,
  userCloseMessage: string,
  userId: string
): Promise<string> {
  const { language, situation } = context

  // Check budget before making API call
  const budget = await checkUserBudget(userId)
  if (!budget.withinBudget) {
    throw new Error("Budget exceeded - cannot generate close response")
  }

  const outcomeInstructions: Record<Language, Record<CloseOutcome, string>> = {
    da: {
      success: "Du giver ham dit nummer. Du er interesseret og glad for samtalen.",
      hesitant: "Du er lidt usikker. Måske tilbyder Instagram i stedet, eller beder om mere tid.",
      decline: "Du afslår høfligt men bestemt. Samtalen var ikke god nok.",
    },
    en: {
      success: "You give him your number. You're interested and enjoyed the conversation.",
      hesitant: "You're a bit unsure. Maybe offer Instagram instead, or ask for more time.",
      decline: "You decline politely but firmly. The conversation wasn't good enough.",
    },
  }

  const systemPrompt = `${SYSTEM_PROMPTS[language]}

KONTEKST / CONTEXT:
- ${language === "da" ? "Sted" : "Location"}: ${situation.location[language]}
- ${language === "da" ? "Han prøver at lukke samtalen" : "He's trying to close"}

${outcomeInstructions[language][outcome]}`

  // Use Claude Code if enabled (no tracking for local CLI)
  if (useClaudeCode()) {
    const fullPrompt = `${systemPrompt}\n\nHim: ${userCloseMessage}\n\nRespond as her (1-2 sentences max, no quotes around response):`
    const response = queryClaudeCode(fullPrompt)
    return response
  }

  // Use Anthropic API with tracking
  const startTime = Date.now()
  const model = (process.env.AI_MODEL || "claude-3-5-haiku-20241022") as ModelName

  const result = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    messages: [{ role: "user", content: userCloseMessage }],
    maxOutputTokens: 100,
    temperature: 0.8,
  })

  // Log AI usage (with error handling to prevent crashes)
  try {
    console.log(`[generateCloseResponse] Logging AI usage for user ${userId}`)
    await logAIUsage({
      userId,
      feature: "keep-it-going",
      scenarioId: context.situation.id,
      model,
      operation: "generate_close",
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        cacheCreationTokens: result.providerMetadata?.anthropic?.cacheCreationInputTokens as number | undefined,
        cacheReadTokens: result.providerMetadata?.anthropic?.cacheReadInputTokens as number | undefined,
      },
      responseTimeMs: Date.now() - startTime,
      systemPrompt,
      userPrompt: userCloseMessage,
      aiResponse: result.text,
    })
    console.log(`[generateCloseResponse] Successfully logged AI usage`)

    // Check budget again and log warning if threshold crossed
    const updatedBudget = await checkUserBudget(userId)
    if (updatedBudget.warningLevel !== "none") {
      console.warn(
        `[generateCloseResponse] User ${userId} budget warning: ${updatedBudget.warningLevel} (${Math.round(updatedBudget.usagePercentage * 100)}%)`
      )
    }
  } catch (logError) {
    console.error(`[generateCloseResponse] FAILED to log AI usage:`, logError)
    // Don't throw - continue execution even if logging fails
  }

  return result.text.trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// Early Exit Response Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a response when the woman ends the conversation early.
 * This is triggered by the rubric end rules (exitRisk >= 3, cold + deflect, etc.)
 */
export async function generateExitResponse(
  context: KeepItGoingContext,
  endReason: string | undefined,
  userId: string
): Promise<string> {
  const { language, situation } = context

  // Check budget before making API call
  const budget = await checkUserBudget(userId)
  if (!budget.withinBudget) {
    throw new Error("Budget exceeded - cannot generate exit response")
  }

  const exitInstructions: Record<Language, string> = {
    da: `Du forlader samtalen. Årsag: ${endReason || "du har mistet interessen"}.
Giv en kort, realistisk afsluttende replik (1 sætning max).
Eksempler:
- "Jeg skal videre." *vender sig væk*
- "Det var hyggeligt." *begynder at gå*
- "Okay, hej." *går*`,
    en: `You're ending the conversation. Reason: ${endReason || "you've lost interest"}.
Give a short, realistic exit line (1 sentence max).
Examples:
- "I have to go." *turns away*
- "Nice meeting you." *starts walking*
- "Okay, bye." *leaves*`,
  }

  const systemPrompt = `${SYSTEM_PROMPTS[language]}

KONTEKST / CONTEXT:
- ${language === "da" ? "Sted" : "Location"}: ${situation.location[language]}

${exitInstructions[language]}`

  // Use Claude Code if enabled (no tracking for local CLI)
  if (useClaudeCode()) {
    const fullPrompt = `${systemPrompt}\n\nRespond as her leaving (1 sentence max, no quotes around response):`
    const response = queryClaudeCode(fullPrompt)
    return response
  }

  // Use Anthropic API with tracking
  const startTime = Date.now()
  const model = (process.env.AI_MODEL || "claude-3-5-haiku-20241022") as ModelName

  const result = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    messages: [{ role: "user", content: "Generate exit response" }],
    maxOutputTokens: 50,
    temperature: 0.8,
  })

  // Log AI usage (with error handling to prevent crashes)
  try {
    await logAIUsage({
      userId,
      feature: "keep-it-going",
      scenarioId: context.situation.id,
      model,
      operation: "generate_exit",
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
        cacheCreationTokens: result.providerMetadata?.anthropic?.cacheCreationInputTokens as number | undefined,
        cacheReadTokens: result.providerMetadata?.anthropic?.cacheReadInputTokens as number | undefined,
      },
      responseTimeMs: Date.now() - startTime,
      systemPrompt,
      userPrompt: "exit",
      aiResponse: result.text,
    })
  } catch (logError) {
    console.error(`[generateExitResponse] FAILED to log AI usage:`, logError)
  }

  return result.text.trim()
}
