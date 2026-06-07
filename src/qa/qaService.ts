import { retrieveRelevantChunks, hasRelevantChunks } from "./retrieval"
import { buildSystemPrompt, buildUserPrompt, parseResponse, stripInternalAttribution } from "./prompt"
import { computeGroundedness } from "./grounding"
import { computeConfidence, detectPolicyViolations } from "./confidence"
import { getProvider, isValidProvider } from "./providers"
import { QA_CONFIG } from "./config"
import type {
  QARequest,
  QAResponse,
  HandleQAOptions,
  RetrievedChunk,
  Source,
  MetaCognition,
} from "./types"

/**
 * Handle a Q&A request end-to-end.
 * This is the main orchestration function for the Q&A slice.
 *
 * Flow:
 * 1. Retrieve relevant chunks
 * 2. Build prompts
 * 3. Call LLM provider
 * 4. Parse response
 * 5. Compute confidence
 * 6. Assemble response
 */
export async function handleQARequest(
  request: QARequest,
  userId: string,
  options: HandleQAOptions = {}
): Promise<QAResponse> {
  const startTime = Date.now()
  void userId

  const {
    backend,
    buildSystemPrompt: systemPromptBuilder = buildSystemPrompt,
    hideAttribution = false,
    adaptive,
    model: modelOverride,
  } = options

  // Merge request options with defaults
  const retrievalOptions = {
    topK: request.retrieval?.topK ?? QA_CONFIG.defaults.topK,
    minScore: request.retrieval?.minScore ?? QA_CONFIG.defaults.minScore,
    maxChunkChars: request.retrieval?.maxChunkChars ?? QA_CONFIG.defaults.maxChunkChars,
  }

  const generationOptions = {
    provider: request.generation?.provider ?? QA_CONFIG.defaults.provider,
    // Explicit request model wins; else the caller's default override; else config default.
    model: request.generation?.model ?? modelOverride,
    maxOutputTokens: request.generation?.maxOutputTokens ?? QA_CONFIG.defaults.maxOutputTokens,
    temperature: request.generation?.temperature ?? QA_CONFIG.defaults.temperature,
  }

  // Validate provider
  if (!isValidProvider(generationOptions.provider)) {
    throw new QAServiceError(
      `Invalid provider: ${generationOptions.provider}`,
      "INVALID_PROVIDER"
    )
  }

  // Step 1: Retrieve relevant chunks (backend defaults to production embeddings)
  const { chunks, plan: adaptivePlan } = await retrieveRelevantChunks(
    request.question,
    retrievalOptions,
    backend,
    adaptive
  )

  // If no relevant chunks found, return a "don't know" response (carry the plan
  // so the bench can show *why* nothing was used).
  if (!hasRelevantChunks(chunks)) {
    const base = createNoContextResponse(generationOptions.provider, startTime)
    return adaptivePlan ? { ...base, adaptivePlan } : base
  }

  // Adaptive answer-token budget: escalate above the default only when needed,
  // unless the caller explicitly pinned maxOutputTokens.
  const effectiveMaxTokens =
    request.generation?.maxOutputTokens != null
      ? generationOptions.maxOutputTokens
      : adaptivePlan?.outputTokens ?? generationOptions.maxOutputTokens

  // Step 2: Build prompts (builder defaults to production buildSystemPrompt)
  const systemPrompt = systemPromptBuilder(chunks, request.question)
  const userPrompt = buildUserPrompt(request.question)

  // Step 3: Call LLM provider
  const provider = getProvider(generationOptions.provider)
  const providerResponse = await provider({
    systemPrompt,
    userPrompt,
    model: generationOptions.model || getDefaultModel(generationOptions.provider),
    maxTokens: effectiveMaxTokens,
    temperature: generationOptions.temperature,
  })

  // Step 4: Parse response
  const { reasoning, answer, suggestedFollowUps } = parseResponse(providerResponse.content)

  // No-attribution path strips all source/coach references from the displayed
  // answer and keeps provenance internally; default path adds coach citations.
  const stripped = hideAttribution ? stripInternalAttribution(answer) : null
  const finalAnswer = stripped
    ? stripped.answer
    : addCoachNamesToSourceCitations(answer, chunks)

  // Step 5: Compute confidence
  const policyViolations = detectPolicyViolations(finalAnswer)
  const confidence = computeConfidence(chunks, finalAnswer, policyViolations)

  // Step 6: Assemble response
  const sources = chunksToSources(chunks)
  const metaCognition = createMetaCognition(reasoning, chunks, suggestedFollowUps)

  // Test path: composite groundedness rating (AI support + deterministic flags).
  const groundedness = hideAttribution
    ? await computeGroundedness(finalAnswer, sources, (systemPrompt, userPrompt) =>
        provider({
          systemPrompt,
          userPrompt,
          model: generationOptions.model || getDefaultModel(generationOptions.provider),
          maxTokens: 500,
          temperature: 0,
        }).then((r) => r.content)
      )
    : undefined

  return {
    answer: finalAnswer,
    ...(stripped ? { usedSourceIndexes: stripped.usedSourceIndexes } : {}),
    ...(adaptivePlan ? { adaptivePlan } : {}),
    ...(groundedness ? { groundedness } : {}),
    confidence,
    sources,
    metaCognition,
    meta: {
      provider: generationOptions.provider,
      model: generationOptions.model || getDefaultModel(generationOptions.provider),
      latencyMs: Date.now() - startTime,
      tokensUsed: providerResponse.tokensUsed,
    },
  }
}

/**
 * Create a response when no relevant context is found.
 */
export function createNoContextResponse(provider: string, startTime: number): QAResponse {
  return {
    answer:
      "I couldn't find any relevant training transcript chunks to answer this. My knowledge is grounded in the indexed daygame coaching transcripts, and I can only answer confidently when I can retrieve matching sources.",
    confidence: {
      score: 0,
      factors: {
        retrievalStrength: 0,
        sourceConsistency: 0,
        policyCompliance: 1,
      },
    },
    sources: [],
    metaCognition: {
      reasoning: "No sufficiently relevant chunks were retrieved from the training transcripts for this question.",
      limitations:
        "This can happen if the topic is out of scope, the phrasing doesn't match the indexed wording, or the embeddings index hasn't been ingested/updated.",
      suggestedFollowUps: [
        "Try rephrasing your question",
        "Try asking about a specific approach scenario",
        "Ask about a specific daygame scenario or technique",
      ],
    },
    meta: {
      provider,
      model: getDefaultModel(provider as "ollama"),
      latencyMs: Date.now() - startTime,
      tokensUsed: 0,
    },
  }
}

/**
 * Convert retrieved chunks to source format for response.
 */
export function chunksToSources(chunks: RetrievedChunk[]): Source[] {
  return chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    text: chunk.text,
    metadata: chunk.metadata,
    relevanceScore: chunk.relevanceScore,
  }))
}

export function addCoachNamesToSourceCitations(answer: string, chunks: RetrievedChunk[]): string {
  const coachByIndex = new Map<number, string>()
  chunks.forEach((chunk, idx) => {
    coachByIndex.set(idx + 1, chunk.metadata.coach ?? chunk.metadata.channel ?? "Unknown Coach")
  })

  // (source 3) -> (Coach — source 3)
  return answer.replace(/\(\s*source\s*(\d+)\s*\)/gi, (match, n) => {
    const index = Number.parseInt(String(n), 10)
    const coach = coachByIndex.get(index)
    if (!coach) return match
    return `(${coach} — source ${index})`
  })
}

/**
 * Create meta-cognition section from reasoning and chunks.
 */
export function createMetaCognition(
  reasoning: string,
  chunks: RetrievedChunk[],
  suggestedFollowUps: string[]
): MetaCognition {
  // Compute limitations based on chunk metadata
  const coaches = [...new Set(chunks.map((c) => c.metadata.coach ?? c.metadata.channel).filter(Boolean))]
  const limitations = coaches.length === 1
    ? `This answer is based primarily on ${coaches[0]}'s approach. Other coaches may have different perspectives.`
    : coaches.length > 0
    ? `This answer synthesizes advice from ${coaches.join(", ")}.`
    : "Limited metadata available for the source content."

  const fallbackReasoning = (() => {
    const top = chunks.slice(0, 3).map((c, idx) => {
      const coach = c.metadata.coach ?? c.metadata.channel ?? "Unknown Coach"
      const topic = c.metadata.topic ? ` — ${c.metadata.topic}` : ""
      const score = typeof c.relevanceScore === "number" ? ` (${Math.round(c.relevanceScore * 100)}% match)` : ""
      return `source ${idx + 1}: ${coach}${topic}${score}`
    })
    return top.length > 0
      ? `Built this answer from the top retrieved transcript chunks: ${top.join("; ")}.`
      : "Built this answer from the retrieved training data."
  })()

  return {
    reasoning: reasoning || fallbackReasoning,
    limitations,
    suggestedFollowUps:
      suggestedFollowUps.length > 0
        ? suggestedFollowUps
        : [
            "How do I transition after the opener?",
            "What body language should I use?",
          ],
  }
}

/**
 * Get the default model for a provider.
 */
export function getDefaultModel(provider: "ollama"): string {
  return QA_CONFIG.ollama.chatModel
}

/**
 * Custom error class for Q&A service errors.
 */
export class QAServiceError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = "QAServiceError"
    this.code = code
  }
}
