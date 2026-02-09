/**
 * Value Inference Module
 * Uses Ollama to infer values from user's text responses.
 */

import { INFERENCE_CONFIG, CATEGORIES } from "../config"
import type { InferredValue } from "../types"

/**
 * Build the list of all available values for the prompt.
 */
function getAllValuesForPrompt(): string {
  return CATEGORIES.map(cat =>
    `${cat.label}:\n${cat.values.join(", ")}`
  ).join("\n\n")
}

/**
 * Build prompt for hurdles question.
 */
function buildHurdlesPrompt(userResponse: string, selectedValues: string[]): {
  systemPrompt: string
  userPrompt: string
} {
  const allValues = getAllValuesForPrompt()
  const selectedList = selectedValues.length > 0
    ? `\nThe user has already selected these values as resonating with them:\n${selectedValues.join(", ")}`
    : ""

  const systemPrompt = `You are a values coach helping someone discover their core values through self-reflection.

Your task is to identify 3-5 values that would most help this person overcome their daygame challenges based on their response.

Here are all available values organized by category:
${allValues}
${selectedList}

Guidelines:
- Prioritize values that directly address the fears or challenges mentioned
- Consider both values they've selected AND values they haven't (growth edges)
- Be specific about WHY each value would help
- Return ONLY values from the list above (use exact spelling)
- Keep reasons concise (1-2 sentences)

Respond ONLY with valid JSON in this exact format:
{
  "values": [
    { "id": "courage", "reason": "Directly addresses your fear of approaching by building the muscle of taking action despite fear." },
    { "id": "confidence", "reason": "..." }
  ]
}`

  const userPrompt = `Based on this person's description of their biggest hurdles in daygame:

"${userResponse}"

Identify 3-5 values that would most help them overcome these challenges.`

  return { systemPrompt, userPrompt }
}

/**
 * Build prompt for shadow question (opposite mapping).
 * What you criticize in others reveals what you value.
 */
function buildShadowPrompt(userResponse: string, selectedValues: string[]): {
  systemPrompt: string
  userPrompt: string
} {
  const allValues = getAllValuesForPrompt()
  const selectedList = selectedValues.length > 0
    ? `\nThe user has already selected these values as resonating with them:\n${selectedValues.join(", ")}`
    : ""

  const systemPrompt = `You are a values coach helping someone discover their core values through Carl Jung's shadow work.

Your task is to identify 3-5 values that are HIDDEN in this person's frustrations. When someone criticizes a behavior, they're often revealing a value they hold dear. Use OPPOSITE MAPPING:
- If they hate dishonesty → they value Honesty/Authenticity
- If they hate weakness → they value Courage/Strength
- If they hate neediness → they value Independence/Self-Sufficiency
- If they hate arrogance → they value Humility/Respect

Here are all available values organized by category:
${allValues}
${selectedList}

Guidelines:
- Look at what behaviors BOTHER them and infer the OPPOSITE value they're protecting
- Focus on the emotional intensity—stronger reactions = deeper values
- Connect the frustration to the underlying principle being violated
- Return ONLY values from the list above (use exact spelling)
- Keep reasons concise and show the opposite mapping (1-2 sentences)

Respond ONLY with valid JSON in this exact format:
{
  "values": [
    { "id": "authenticity", "reason": "Your frustration with men who pretend to be someone they're not reveals how much you value being genuine." },
    { "id": "courage", "reason": "..." }
  ]
}`

  const userPrompt = `Based on what this person criticizes about other men in the dating world:

"${userResponse}"

Identify 3-5 values that are hidden in their frustrations (use opposite mapping—what they reject reveals what they value).`

  return { systemPrompt, userPrompt }
}

/**
 * Build prompt for peak experience question.
 * Values present when someone is at their best.
 */
function buildPeakExperiencePrompt(userResponse: string, selectedValues: string[]): {
  systemPrompt: string
  userPrompt: string
} {
  const allValues = getAllValuesForPrompt()
  const selectedList = selectedValues.length > 0
    ? `\nThe user has already selected these values as resonating with them:\n${selectedValues.join(", ")}`
    : ""

  const systemPrompt = `You are a values coach helping someone discover their core values through their peak experiences.

Your task is to identify 3-5 values that were ACTIVE and ALIVE in this person's moment of flow and aliveness. These are values they already embody when at their best.

Here are all available values organized by category:
${allValues}
${selectedList}

Guidelines:
- Look for what made them feel alive—those are values being expressed
- Focus on the qualities they were embodying, not just what they were doing
- Consider the emotions described (confidence, freedom, connection, etc.) and map to values
- These are CORE values—ones they already have, not aspirational
- Return ONLY values from the list above (use exact spelling)
- Keep reasons concise and connected to their specific experience (1-2 sentences)

Respond ONLY with valid JSON in this exact format:
{
  "values": [
    { "id": "freedom", "reason": "In that moment, you described feeling unconstrained and fully self-directed." },
    { "id": "excellence", "reason": "..." }
  ]
}`

  const userPrompt = `Based on this person's description of a moment when they felt most alive, confident, and fully themselves:

"${userResponse}"

Identify 3-5 values that were present and active in this peak experience.`

  return { systemPrompt, userPrompt }
}

/**
 * Call Ollama to generate response.
 */
async function callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${INFERENCE_CONFIG.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: INFERENCE_CONFIG.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      options: {
        temperature: INFERENCE_CONFIG.temperature,
        num_predict: INFERENCE_CONFIG.maxTokens,
      },
    }),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new ValueInferenceError(
        `Model '${INFERENCE_CONFIG.model}' not found. Run 'ollama pull ${INFERENCE_CONFIG.model}'`,
        "MODEL_NOT_FOUND"
      )
    }
    const errorText = await response.text()
    throw new ValueInferenceError(
      `Ollama request failed (${response.status}): ${errorText}`,
      "REQUEST_FAILED"
    )
  }

  const data = await response.json()
  return data.message?.content || ""
}

/**
 * Parse LLM response to extract values.
 */
function parseValuesResponse(content: string): InferredValue[] {
  try {
    // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
    let cleanContent = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim()

    // Try to extract JSON object from the response
    // Use non-greedy matching to get the first complete JSON object
    const jsonMatch = cleanContent.match(/\{[^{}]*"values"\s*:\s*\[[\s\S]*?\]\s*\}/)
    if (!jsonMatch) {
      // Fallback: try to find any JSON object
      const fallbackMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (!fallbackMatch) {
        console.error("No JSON found in LLM response:", content)
        throw new Error("No JSON found in response")
      }
      cleanContent = fallbackMatch[0]
    } else {
      cleanContent = jsonMatch[0]
    }

    const parsed = JSON.parse(cleanContent)

    if (!Array.isArray(parsed.values)) {
      console.error("Missing values array in response:", parsed)
      throw new Error("Invalid response format: missing values array")
    }

    // Validate and normalize values
    const allValueIds = new Set(
      CATEGORIES.flatMap(cat =>
        cat.values.map(v => v.toLowerCase().replace(/\s+/g, "-"))
      )
    )

    const validValues = parsed.values
      .filter((v: { id?: string; reason?: string }) => {
        if (!v.id || !v.reason) {
          console.warn("Skipping value without id or reason:", v)
          return false
        }
        const normalizedId = v.id.toLowerCase().replace(/\s+/g, "-")
        if (!allValueIds.has(normalizedId)) {
          console.warn(`Value "${v.id}" not found in master list, skipping`)
          return false
        }
        return true
      })
      .map((v: { id: string; reason: string }) => ({
        id: v.id.toLowerCase().replace(/\s+/g, "-"),
        reason: v.reason,
      }))
      .slice(0, 5) // Max 5 values

    if (validValues.length === 0) {
      console.error("No valid values found after filtering. Raw values:", parsed.values)
      throw new Error("No valid values found in AI response")
    }

    return validValues
  } catch (error) {
    console.error("Failed to parse LLM response:", error, "Raw content:", content)
    throw new ValueInferenceError(
      "Failed to parse values from AI response",
      "PARSE_ERROR"
    )
  }
}

/**
 * Infer values from user's shadow response (opposite mapping).
 */
export async function inferValuesFromShadow(
  userResponse: string,
  selectedValues: string[]
): Promise<InferredValue[]> {
  const { systemPrompt, userPrompt } = buildShadowPrompt(userResponse, selectedValues)
  const content = await callOllama(systemPrompt, userPrompt)
  return parseValuesResponse(content)
}

/**
 * Infer values from user's peak experience response.
 */
export async function inferValuesFromPeakExperience(
  userResponse: string,
  selectedValues: string[]
): Promise<InferredValue[]> {
  const { systemPrompt, userPrompt } = buildPeakExperiencePrompt(userResponse, selectedValues)
  const content = await callOllama(systemPrompt, userPrompt)
  return parseValuesResponse(content)
}

/**
 * Infer values from user's hurdles response.
 */
export async function inferValuesFromHurdles(
  userResponse: string,
  selectedValues: string[]
): Promise<InferredValue[]> {
  const { systemPrompt, userPrompt } = buildHurdlesPrompt(userResponse, selectedValues)
  const content = await callOllama(systemPrompt, userPrompt)
  return parseValuesResponse(content)
}

/**
 * Main entry point for value inference.
 */
export async function inferValues(
  context: "shadow" | "peak_experience" | "hurdles",
  userResponse: string,
  selectedValues: string[]
): Promise<InferredValue[]> {
  if (!userResponse.trim()) {
    throw new ValueInferenceError("Response cannot be empty", "EMPTY_RESPONSE")
  }

  switch (context) {
    case "shadow":
      return inferValuesFromShadow(userResponse, selectedValues)
    case "peak_experience":
      return inferValuesFromPeakExperience(userResponse, selectedValues)
    case "hurdles":
      return inferValuesFromHurdles(userResponse, selectedValues)
    default:
      throw new ValueInferenceError(`Unknown context: ${context}`, "INVALID_CONTEXT")
  }
}

/**
 * Custom error class for value inference errors.
 */
export class ValueInferenceError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "ValueInferenceError"
    this.code = code
  }
}
