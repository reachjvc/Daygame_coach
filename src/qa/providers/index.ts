import type { ProviderRequest, ProviderResponse } from "../types"
import * as ollama from "./ollama"
import * as claude from "./claude"

export type ProviderName = "ollama" | "claude"

/**
 * Get the appropriate provider based on name.
 * This factory pattern keeps the service layer decoupled from specific providers.
 */
export function getProvider(
  name: ProviderName
): (request: ProviderRequest) => Promise<ProviderResponse> {
  switch (name) {
    case "ollama":
      return ollama.generate
    case "claude":
      return claude.generate
    default:
      throw new Error(`Unknown provider: ${name}`)
  }
}

/**
 * Check if a provider name is valid.
 */
export function isValidProvider(name: string): name is ProviderName {
  return ["ollama", "claude"].includes(name)
}

// Re-export provider-specific errors
export { OllamaError } from "./ollama"
export { ClaudeError } from "./claude"
