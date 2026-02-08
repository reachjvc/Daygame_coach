/**
 * Q&A slice types following the SLICE_QA.md contract.
 */

// ============================================
// Request types
// ============================================

export interface QARequest {
  question: string
  retrieval?: RetrievalOptions
  generation?: GenerationOptions
}

export interface RetrievalOptions {
  topK?: number
  minScore?: number
  maxChunkChars?: number
}

export interface GenerationOptions {
  provider?: "ollama" // Claude disabled to save API costs
  model?: string
  maxOutputTokens?: number
  temperature?: number
}

// ============================================
// Response types
// ============================================

export interface QAResponse {
  answer: string
  confidence: ConfidenceResult
  sources: Source[]
  metaCognition: MetaCognition
  meta: ResponseMeta
}

export interface ConfidenceResult {
  score: number
  factors: ConfidenceFactors
}

export interface ConfidenceFactors {
  retrievalStrength: number
  sourceConsistency: number
  policyCompliance: number
}

export interface Source {
  chunkId: string
  text: string
  metadata: SourceMetadata
  relevanceScore: number
}

export interface SourceMetadata {
  coach?: string
  topic?: string
  source?: string
  timestamp?: string
}

export interface MetaCognition {
  reasoning: string
  limitations: string
  suggestedFollowUps: string[]
}

export interface ResponseMeta {
  provider: string
  model: string
  latencyMs: number
  tokensUsed: number
}

// ============================================
// Internal types (used within slice)
// ============================================

export interface RetrievedChunk {
  chunkId: string
  text: string
  metadata: SourceMetadata
  relevanceScore: number
}

export interface ProviderRequest {
  systemPrompt: string
  userPrompt: string
  model: string
  maxTokens: number
  temperature: number
}

export interface ProviderResponse {
  content: string
  tokensUsed: number
  latencyMs: number
}

// ============================================
// Config types
// ============================================

export interface QAConfig {
  ollama: OllamaConfig
  claude: ClaudeConfig
  rag: RAGConfig
  defaults: DefaultsConfig
}

export interface OllamaConfig {
  baseUrl: string
  chatModel: string
  embeddingModel: string
  temperature: number
  topP: number
}

export interface ClaudeConfig {
  model: string
  temperature: number
}

export interface RAGConfig {
  chunkSize: number
  chunkOverlap: number
  maxContextChunks: number
  similarityThreshold: number
}

export interface DefaultsConfig {
  provider: "ollama" // Claude disabled to save API costs
  topK: number
  minScore: number
  maxChunkChars: number
  maxOutputTokens: number
  temperature: number
}
