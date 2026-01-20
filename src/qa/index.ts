// Main service export
export { handleQARequest, QAServiceError } from "./qaService"

// Types
export type {
  QARequest,
  QAResponse,
  RetrievalOptions,
  GenerationOptions,
  ConfidenceResult,
  ConfidenceFactors,
  Source,
  SourceMetadata,
  MetaCognition,
  ResponseMeta,
  RetrievedChunk,
  ProviderRequest,
  ProviderResponse,
} from "./types"

// Config
export { QA_CONFIG, RATE_LIMITS, VALIDATION_LIMITS } from "./config"

// Retrieval (for testing/debugging)
export { retrieveRelevantChunks, generateEmbedding, hasRelevantChunks } from "./retrieval"

// Confidence (for testing)
export {
  computeConfidence,
  detectPolicyViolations,
  getConfidenceLabel,
} from "./confidence"

// Providers
export { getProvider, isValidProvider } from "./providers"
export type { ProviderName } from "./providers"

// Components
export { QAPage } from "./components/QAPage"
