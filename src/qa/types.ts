/**
 * Q&A slice types following the SLICE_QA.md contract.
 */

import type { EmbeddingMatch, EmbeddingRow } from "@/src/db/types"

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
  /**
   * Internal provenance: 1-based source numbers the model reported using.
   * Not for display — pairs with hideAttribution. Present only on the
   * no-attribution path.
   */
  usedSourceIndexes?: number[]
  /** What adaptive retrieval decided (present only on the adaptive path). */
  adaptivePlan?: AdaptivePlan
  /** Composite groundedness rating (present only on the test path). */
  groundedness?: GroundednessRating
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
  channel?: string
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

type EmbeddingRowSlice = Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">

/**
 * Pluggable retrieval data source. Defaults to the production `embeddings`
 * table; the test chatbot injects a backend bound to `embeddings_test`.
 * Shapes mirror the corresponding functions in src/db/embeddingsRepo.ts.
 */
export interface RetrievalBackend {
  searchSimilarEmbeddings: (
    queryEmbedding: number[],
    options?: { limit?: number; matchThreshold?: number }
  ) => Promise<EmbeddingMatch[]>
  searchEmbeddingsByKeyword: (
    keyword: string,
    options?: { limit?: number }
  ) => Promise<EmbeddingRowSlice[]>
  fetchEmbeddingsBySourceAndConversation: (
    source: string,
    conversationId: number
  ) => Promise<EmbeddingRowSlice[]>
  fetchCommentaryForConversation: (
    source: string,
    conversationId: number
  ) => Promise<EmbeddingRowSlice[]>
}

/**
 * Options for handleQARequest. Lets the test bench swap the retrieval source
 * and/or the system prompt builder without affecting the production path.
 */
export interface HandleQAOptions {
  /** Retrieval data source. Defaults to the production embeddings table. */
  backend?: RetrievalBackend
  /** System prompt builder. Defaults to the production buildSystemPrompt. */
  buildSystemPrompt?: (chunks: RetrievedChunk[], question: string) => string
  /**
   * Remove all attribution from the user-facing answer (no coach/source names,
   * no "(source N)"). Provenance is kept internally via usedSourceIndexes + the
   * sources array. Pairs with buildGroundedSystemPrompt.
   */
  hideAttribution?: boolean
  /**
   * Enable adaptive, budget-aware retrieval (test bench). When set, retrieval
   * sizes itself to the question: floor → refuse, knee-cut count, dynamic
   * context expansion, and an escalated answer-token budget for deep questions.
   */
  adaptive?: AdaptiveRetrievalConfig
  /**
   * Default chat model for this call (e.g. the test bench pins a stronger model
   * than the production default). An explicit request.generation.model wins.
   */
  model?: string
}

/** Knobs for adaptive retrieval. Omitted fields fall back to DEFAULT_ADAPTIVE. */
export interface AdaptiveRetrievalConfig {
  /** cosine floor; nothing below this is used (controls "nothing in → nothing out") */
  minRelevance?: number
  /** default context token budget */
  baseContextTokens?: number
  /** max context token budget it may escalate to */
  maxContextTokens?: number
}

/** One claim (answer sentence) judged for support against the sources. */
export interface GroundednessClaim {
  text: string
  /** AI-judged support by meaning (not textual similarity). */
  verdict: "supported" | "partial" | "unsupported"
  /** 1-based source numbers the judge says back this claim. */
  sources: number[]
}

/**
 * Composite groundedness rating (test bench). AI support (semantic) +
 * deterministic signals (material strength, fabricated specifics). Label-only.
 */
export interface GroundednessRating {
  /** overall 0..1 composite */
  score: number
  /** fraction of claims supported by meaning (partial = 0.5) */
  aiSupport: number
  /** deterministic: how relevant the retrieved sources were (precondition) */
  materialStrength: number
  claims: GroundednessClaim[]
  /** deterministic red flags: specifics in the answer absent from all sources */
  unsupportedSpecifics: string[]
}

/** What adaptive retrieval decided, for transparency (internal/inspection). */
export interface AdaptivePlan {
  tier: "shallow" | "standard" | "deep"
  needScore: number
  chunkCount: number
  contextTokens: number
  contextBudget: number
  stitchRadius: number
  outputTokens: number
  reasons: string[]
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
