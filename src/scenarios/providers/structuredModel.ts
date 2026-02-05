import { anthropic } from "@ai-sdk/anthropic"

export function getStructuredOutputModel() {
  const provider = (process.env.AI_PROVIDER || "claude").toLowerCase()

  if (provider === "claude" || provider === "anthropic") {
    return anthropic(process.env.AI_MODEL || "claude-3-5-haiku-20241022")
  }

  // Ollama doesn't support structured output via AI SDK in this project yet.
  // Let callers handle failure and fall back.
  return anthropic(process.env.AI_MODEL || "claude-3-5-haiku-20241022")
}
