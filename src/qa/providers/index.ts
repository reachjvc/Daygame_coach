import type { ProviderRequest, ProviderResponse } from "../types"
import * as ollama from "./ollama"

export type ProviderName = "ollama"

/**
 * Get the appropriate provider based on name.
 * This factory pattern keeps the service layer decoupled from specific providers.
 *
 * NOTE: Claude provider has been disabled to avoid API costs.
 * Only local Ollama is supported.
 */
export function getProvider(
  name: ProviderName
): (request: ProviderRequest) => Promise<ProviderResponse> {
  switch (name) {
    case "ollama":
      return ollama.generate
    default:
      throw new Error(`Unknown provider: ${name}. Only "ollama" is supported (Claude disabled to save API costs).`)
  }
}

/**
 * Check if a provider name is valid.
 */
export function isValidProvider(name: string): name is ProviderName {
  return name === "ollama"
}

// Re-export provider-specific errors
export { OllamaError } from "./ollama"
