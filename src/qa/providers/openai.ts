import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { QA_CONFIG } from "../config"
import type { ProviderRequest, ProviderResponse } from "../types"

/**
 * OpenAI provider using the Vercel AI SDK.
 * Providers only handle communication with the model - no business logic.
 */
export async function generate(request: ProviderRequest): Promise<ProviderResponse> {
  const startTime = Date.now()

  const model = request.model || QA_CONFIG.openai.model

  const result = await generateText({
    model: openai(model),
    system: request.systemPrompt,
    messages: [{ role: "user", content: request.userPrompt }],
    maxOutputTokens: request.maxTokens,
    temperature: request.temperature,
  })

  const latencyMs = Date.now() - startTime

  return {
    content: result.text,
    tokensUsed: result.usage?.totalTokens || 0,
    latencyMs,
  }
}

/**
 * Custom error class for OpenAI-specific errors.
 */
export class OpenAIError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "OpenAIError"
    this.code = code
  }
}
