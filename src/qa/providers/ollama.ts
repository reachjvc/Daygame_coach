import { QA_CONFIG } from "../config"
import type { ProviderRequest, ProviderResponse } from "../types"

/**
 * Ollama provider for local LLM inference.
 * Providers only handle communication with the model - no business logic.
 */
export async function generate(request: ProviderRequest): Promise<ProviderResponse> {
  const startTime = Date.now()

  const response = await fetch(`${QA_CONFIG.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: request.model || QA_CONFIG.ollama.chatModel,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      stream: false,
      options: {
        temperature: request.temperature,
        top_p: QA_CONFIG.ollama.topP,
        num_predict: request.maxTokens,
      },
    }),
  })

  const latencyMs = Date.now() - startTime

  if (!response.ok) {
    if (response.status === 404) {
      throw new OllamaError(
        `Model '${request.model || QA_CONFIG.ollama.chatModel}' not found. Run 'ollama pull ${request.model || QA_CONFIG.ollama.chatModel}'`,
        "MODEL_NOT_FOUND"
      )
    }
    const errorText = await response.text()
    throw new OllamaError(
      `Ollama request failed (${response.status}): ${errorText}`,
      "REQUEST_FAILED"
    )
  }

  const data = await response.json()

  return {
    content: data.message?.content || "",
    tokensUsed: data.eval_count || 0,
    latencyMs,
  }
}

/**
 * Custom error class for Ollama-specific errors.
 */
export class OllamaError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "OllamaError"
    this.code = code
  }
}
