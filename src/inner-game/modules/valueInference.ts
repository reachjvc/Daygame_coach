/**
 * Value Inference Module
 * Uses Ollama to infer values from user's text responses.
 */

import { INFERENCE_CONFIG, CATEGORIES } from "../config"
import type { InferredValue, ValueItem } from "../types"

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
 * Build prompt for deathbed/legacy question.
 */
function buildDeathbedPrompt(userResponse: string, selectedValues: string[]): {
  systemPrompt: string
  userPrompt: string
} {
  const allValues = getAllValuesForPrompt()
  const selectedList = selectedValues.length > 0
    ? `\nThe user has already selected these values as resonating with them:\n${selectedValues.join(", ")}`
    : ""

  const systemPrompt = `You are a values coach helping someone discover their core values through self-reflection.

Your task is to identify 3-5 values that are most central to the legacy this person wants to leave based on their response.

Here are all available values organized by category:
${allValues}
${selectedList}

Guidelines:
- Focus on values that appear repeatedly or with strong emotional language
- Look for what they want to BE remembered as, not just what they want to DO
- Consider the relationships and qualities they mention
- Return ONLY values from the list above (use exact spelling)
- Keep reasons concise (1-2 sentences)

Respond ONLY with valid JSON in this exact format:
{
  "values": [
    { "id": "love", "reason": "You emphasized wanting your family to feel deeply loved and supported." },
    { "id": "integrity", "reason": "..." }
  ]
}`

  const userPrompt = `Based on how this person wants to be remembered by their family, friends, and loved ones:

"${userResponse}"

Identify 3-5 values that are most central to this legacy they want to leave.`

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
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in response")
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!Array.isArray(parsed.values)) {
      throw new Error("Invalid response format: missing values array")
    }

    // Validate and normalize values
    const allValueIds = new Set(
      CATEGORIES.flatMap(cat =>
        cat.values.map(v => v.toLowerCase().replace(/\s+/g, "-"))
      )
    )

    return parsed.values
      .filter((v: { id?: string; reason?: string }) => {
        if (!v.id || !v.reason) return false
        const normalizedId = v.id.toLowerCase().replace(/\s+/g, "-")
        return allValueIds.has(normalizedId)
      })
      .map((v: { id: string; reason: string }) => ({
        id: v.id.toLowerCase().replace(/\s+/g, "-"),
        reason: v.reason,
      }))
      .slice(0, 5) // Max 5 values
  } catch (error) {
    console.error("Failed to parse LLM response:", error, content)
    throw new ValueInferenceError(
      "Failed to parse values from AI response",
      "PARSE_ERROR"
    )
  }
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
 * Infer values from user's deathbed/legacy response.
 */
export async function inferValuesFromDeathbed(
  userResponse: string,
  selectedValues: string[]
): Promise<InferredValue[]> {
  const { systemPrompt, userPrompt } = buildDeathbedPrompt(userResponse, selectedValues)
  const content = await callOllama(systemPrompt, userPrompt)
  return parseValuesResponse(content)
}

/**
 * Main entry point for value inference.
 */
export async function inferValues(
  context: "hurdles" | "deathbed",
  userResponse: string,
  selectedValues: string[]
): Promise<InferredValue[]> {
  if (!userResponse.trim()) {
    throw new ValueInferenceError("Response cannot be empty", "EMPTY_RESPONSE")
  }

  if (context === "hurdles") {
    return inferValuesFromHurdles(userResponse, selectedValues)
  } else {
    return inferValuesFromDeathbed(userResponse, selectedValues)
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
