import type { QAConfig } from "./types"

/**
 * Q&A slice configuration.
 * Defaults can be overridden by environment variables.
 */
export const QA_CONFIG: QAConfig = {
  ollama: {
    baseUrl: process.env.OLLAMA_API_URL || "http://localhost:11434",
    chatModel: process.env.OLLAMA_MODEL || "llama3.1",
    embeddingModel: "nomic-embed-text",
    temperature: 0.5,
    topP: 0.95,
  },

  openai: {
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    temperature: 0.7,
  },

  claude: {
    model: process.env.AI_MODEL || "claude-3-5-haiku-20241022",
    temperature: 0.7,
  },

  rag: {
    chunkSize: 1500,
    chunkOverlap: 150,
    maxContextChunks: 5,
    similarityThreshold: 0.5,
  },

  defaults: {
    provider: (process.env.AI_PROVIDER as "ollama" | "openai" | "claude") || "claude",
    topK: 5,
    minScore: 0.5,
    maxChunkChars: 8000,
    maxOutputTokens: 1024,
    temperature: 0.7,
  },
}

/**
 * Rate limiting configuration.
 */
export const RATE_LIMITS = {
  perMinute: 10,
  perHour: 50,
  perDay: 200,
}

/**
 * Validation limits.
 */
export const VALIDATION_LIMITS = {
  maxQuestionChars: 2000,
  maxTopK: 20,
  maxOutputTokens: 4096,
}
