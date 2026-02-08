/**
 * Keep It Going - AI Chat Integration
 *
 * Uses Claude to generate woman's responses based on conversation context.
 * Supports both Claude Code (headless) and Anthropic API.
 */

import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import type { Language, KeepItGoingContext, ResponseQuality, CloseOutcome } from "./types"
import { useClaudeCode, queryClaudeCodeJSON, queryClaudeCode } from "./claudeCode"
import { logAIUsage, checkUserBudget } from "@/src/api_ai/apiAiService"
import type { ModelName } from "@/src/api_ai/types"

// ─────────────────────────────────────────────────────────────────────────────
// System Prompts
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<Language, string> = {
  da: `Du er en kvinde i 20'erne der lige er blevet approachet af en fyr på gaden. Du svarer naturligt og realistisk baseret på kvaliteten af hans svar.

REGLER:
- Svar KORT (max 1-2 sætninger)
- Brug *handlinger* i stjerner som *smiler* eller *kigger væk*
- Vær realistisk - ikke for nem, ikke for svær
- Match hans energi: god replik = varm respons, dårlig = kort/kølig
- Aldrig break character
- Svar på dansk`,

  en: `You are a woman in her 20s who was just approached by a guy on the street. You respond naturally and realistically based on the quality of his responses.

RULES:
- Keep responses SHORT (max 1-2 sentences)
- Use *actions* in asterisks like *smiles* or *looks away*
- Be realistic - not too easy, not too difficult
- Match his energy: good line = warm response, bad = short/cold
- Never break character
- Respond in English`,
}

const QUALITY_INSTRUCTIONS: Record<Language, Record<ResponseQuality, string>> = {
  da: {
    positive: "Han sagde noget godt. Du er interesseret, varm, måske flirtende. Giv lidt tilbage.",
    neutral: "Det var okay. Du er nysgerrig men afventende. Giv ham en chance mere.",
    deflect: "Det var kedeligt/interview-agtigt. Svar kort og distanceret. Han skal arbejde hårdere.",
    skeptical: "Det var for try-hard eller weird. Vis skepsis, træk dig lidt tilbage.",
  },
  en: {
    positive: "He said something good. You're interested, warm, maybe flirty. Give something back.",
    neutral: "It was okay. You're curious but waiting. Give him another chance.",
    deflect: "It was boring/interview-like. Respond briefly and distantly. He needs to work harder.",
    skeptical: "It was too try-hard or weird. Show skepticism, step back a bit.",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Evaluation
// ─────────────────────────────────────────────────────────────────────────────

const EVAL_SYSTEM_PROMPT = `You are an expert dating coach evaluating a man's conversational response during a street approach.

SCORING CRITERIA (1-10):
- Statements/observations > questions (7-8 points)
- Cold reads ("you seem like...", "I bet you...") = excellent (8-9 points)
- Digging deeper after her response = good (7 points)
- Interview questions ("what do you do?", "where are you from?") = bad (3-4 points)
- Try-hard/overly smooth lines = bad (2-3 points)
- Too long/rambling = penalty (-1)
- Short, punchy, playful = bonus (+1)

RESPONSE FORMAT (JSON only, no markdown):
{"score":7,"feedback":"Short feedback in same language as input","quality":"positive"}

quality must be one of: "positive", "neutral", "deflect", "skeptical"
- positive: score >= 7
- neutral: score 5-6
- deflect: score 3-4
- skeptical: score <= 2`

interface EvalResult {
  score: number
  feedback: string
  quality: ResponseQuality
}

export async function evaluateWithAI(
  userMessage: string,
  language: Language,
  context: KeepItGoingContext,
  userId: string
): Promise<EvalResult> {
  console.log("[evaluateWithAI] Called, useClaudeCode() =", useClaudeCode())
  console.log("[evaluateWithAI] USE_CLAUDE_CODE env =", process.env.USE_CLAUDE_CODE)

  // Check budget before making API call
  const budget = await checkUserBudget(userId)
  if (!budget.withinBudget) {
    throw new Error("Budget exceeded - cannot evaluate response")
  }

  const situationContext =
    language === "da"
      ? `Sted: ${context.situation.location[language]}. ${context.situation.setup[language]}`
      : `Location: ${context.situation.location[language]}. ${context.situation.setup[language]}`

  const userPrompt = `${situationContext}\n\nHis response: "${userMessage}"\n\nEvaluate in ${language === "da" ? "Danish" : "English"}.`

  // Use Claude Code if enabled (no tracking for local CLI)
  if (useClaudeCode()) {
    const fullPrompt = `${EVAL_SYSTEM_PROMPT}\n\n${userPrompt}`
    const parsed = queryClaudeCodeJSON<EvalResult>(fullPrompt)
    return {
      score: Math.max(1, Math.min(10, parsed.score)),
      feedback: parsed.feedback,
      quality: parsed.quality,
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
    maxTokens: 150,
    temperature: 0.3,
  })

  // DEBUG: Log response metadata including actual model
  const actualModel = result.response?.modelId || result.modelId || "unknown"
  console.log("[evaluateWithAI] Response:", {
    requestedModel: model,
    actualModel,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
    cacheCreation: result.providerMetadata?.anthropic?.cacheCreationInputTokens,
    cacheRead: result.providerMetadata?.anthropic?.cacheReadInputTokens,
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
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        cacheCreationTokens: result.providerMetadata?.anthropic?.cacheCreationInputTokens,
        cacheReadTokens: result.providerMetadata?.anthropic?.cacheReadInputTokens,
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
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Response Generation
// ─────────────────────────────────────────────────────────────────────────────

/** Max message pairs to include in AI context (user + assistant = 1 pair) */
const MAX_HISTORY_PAIRS = 4

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

/**
 * Apply sliding window to conversation history.
 * Keeps only the last N message pairs to reduce token usage.
 */
function applyHistoryWindow(history: ChatMessage[]): ChatMessage[] {
  const maxMessages = MAX_HISTORY_PAIRS * 2
  return history.length <= maxMessages ? history : history.slice(-maxMessages)
}

interface GenerateResponseOptions {
  context: KeepItGoingContext
  userMessage: string
  quality: ResponseQuality
  conversationHistory: ChatMessage[]
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

  // Build messages array with windowed conversation history (reduces token usage)
  const windowedHistory = applyHistoryWindow(conversationHistory)
  const messages: ChatMessage[] = [
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
    const response = queryClaudeCode(fullPrompt)
    return response
  }

  // Use Anthropic API with tracking
  const startTime = Date.now()
  const model = (process.env.AI_MODEL || "claude-3-5-haiku-20241022") as ModelName

  const result = await generateText({
    model: anthropic(model),
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    maxTokens: 100,
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
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        cacheCreationTokens: result.providerMetadata?.anthropic?.cacheCreationInputTokens,
        cacheReadTokens: result.providerMetadata?.anthropic?.cacheReadInputTokens,
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

  return result.text.trim()
}

function buildSystemPrompt(context: KeepItGoingContext, quality: ResponseQuality): string {
  const { language, situation } = context
  const lang = language

  const basePrompt = SYSTEM_PROMPTS[lang]
  const qualityInstruction = QUALITY_INSTRUCTIONS[lang][quality]

  const contextInfo =
    lang === "da"
      ? `KONTEKST:
- Sted: ${situation.location[lang]}
- Situation: ${situation.setup[lang]}
- Hans åbner: "${situation.yourOpener[lang]}"

DENNE REPLIK: ${qualityInstruction}`
      : `CONTEXT:
- Location: ${situation.location[lang]}
- Situation: ${situation.setup[lang]}
- His opener: "${situation.yourOpener[lang]}"

THIS LINE: ${qualityInstruction}`

  return `${basePrompt}

${contextInfo}`
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
    maxTokens: 100,
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
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        cacheCreationTokens: result.providerMetadata?.anthropic?.cacheCreationInputTokens,
        cacheReadTokens: result.providerMetadata?.anthropic?.cacheReadInputTokens,
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
