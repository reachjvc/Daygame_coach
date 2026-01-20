import { searchSimilarEmbeddings, searchEmbeddingsByKeyword } from "@/src/db/server"
import { QA_CONFIG } from "./config"
import type { RetrievalOptions, RetrievedChunk } from "./types"

function normalizeSourcePath(source?: string): string {
  return (source ?? "").replace(/\\/g, "/")
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "say",
  "she",
  "should",
  "so",
  "that",
  "the",
  "their",
  "then",
  "they",
  "this",
  "to",
  "what",
  "when",
  "where",
  "why",
  "with",
  "you",
  "your",
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

function containsAnyToken(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false
  const lower = text.toLowerCase()
  return tokens.some((t) => t.length > 0 && lower.includes(t))
}

function computeTokenOverlapScore(queryTokens: string[], docText: string): number {
  if (queryTokens.length === 0) return 0
  const doc = docText.toLowerCase()
  let hits = 0
  for (const token of queryTokens) {
    if (doc.includes(token)) hits++
  }
  return hits / queryTokens.length
}

function computeCombinedScore(similarity: number, overlap: number, phraseHit: boolean, anchorHits: number): number {
  // Keep similarity dominant, but allow lexical overlap/phrase hits to rescue obvious keyword matches.
  const phraseBoost = phraseHit ? 0.1 : 0
  const anchorBoost = Math.min(0.15, 0.05 * anchorHits)
  return 0.85 * similarity + 0.15 * overlap + phraseBoost + anchorBoost
}

function deriveCoachFromSource(source?: string): string | undefined {
  const normalized = normalizeSourcePath(source)
  const parts = normalized.split("/").filter(Boolean)
  // Expect sources like "CoachName/Some Video Title.txt"
  if (parts.length < 2) return undefined
  if (parts[0].toLowerCase() === "unknown") return undefined
  return parts[0]
}

function deriveTopicFromSource(source?: string): string | undefined {
  const normalized = normalizeSourcePath(source)
  if (!normalized) return undefined
  const filename = normalized.split("/").filter(Boolean).pop()
  if (!filename) return undefined
  return filename.replace(/\.txt$/i, "").trim() || undefined
}

/**
 * Generate an embedding for the given text using Ollama.
 * This is the only place in the slice that generates embeddings.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const MAX_LENGTH = 8000
  const inputText = text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text

  const response = await fetch(`${QA_CONFIG.ollama.baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: QA_CONFIG.ollama.embeddingModel,
      prompt: inputText,
    }),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Ollama model '${QA_CONFIG.ollama.embeddingModel}' not found. Run 'ollama pull ${QA_CONFIG.ollama.embeddingModel}'`
      )
    }
    const errorText = await response.text()
    throw new Error(`Embedding generation failed (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  if (!data.embedding) {
    throw new Error(`Invalid embedding response: ${JSON.stringify(data)}`)
  }

  return data.embedding
}

/**
 * Retrieve relevant chunks for a question using vector similarity search.
 * This is the only function in the slice that performs retrieval.
 */
export async function retrieveRelevantChunks(
  question: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const {
    topK = QA_CONFIG.defaults.topK,
    minScore = QA_CONFIG.defaults.minScore,
    maxChunkChars = QA_CONFIG.defaults.maxChunkChars,
  } = options

  // Generate embedding for the question
  const embedding = await generateEmbedding(question)

  // Two-stage retrieval (Phase 0 "stop the bleeding"):
  // 1) High-recall candidate set (larger K, lower threshold)
  // 2) Lightweight rerank (vector similarity + lexical overlap + diversity caps)
  const candidateCount = Math.min(400, Math.max(topK * 20, 100))
  const candidateThreshold = Math.max(0, Math.min(minScore, 0.2))

  const vectorMatches = await searchSimilarEmbeddings(embedding, {
    limit: candidateCount,
    matchThreshold: candidateThreshold,
  })

  const queryTokens = Array.from(new Set(tokenize(question)))
  const anchorTokens = [...queryTokens].sort((a, b) => b.length - a.length).slice(0, 2)
  const normalizedQuestionPhrase = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

  const needsLexicalFallback = (() => {
    if (anchorTokens.length === 0) return false
    const anchor = anchorTokens[0]
    if (anchor.length < 6) return false
    return !vectorMatches.some((m) => m.content.toLowerCase().includes(anchor))
  })()

  const keywordMatches = needsLexicalFallback && anchorTokens.length > 0
    ? await searchEmbeddingsByKeyword(anchorTokens[0], { limit: 80 })
    : []

  const combinedCandidates = (() => {
    const byId = new Map<string, { id: string; content: string; source: string; metadata: any; similarity: number }>()
    for (const m of vectorMatches) {
      byId.set(m.id, m)
    }
    for (const km of keywordMatches) {
      if (!byId.has(km.id)) {
        byId.set(km.id, {
          id: km.id,
          content: km.content,
          source: km.source,
          metadata: km.metadata,
          // keyword-only results get a low baseline similarity so they can compete when overlap is high
          similarity: 0.25,
        })
      }
    }
    return Array.from(byId.values())
  })()

  const scored = combinedCandidates.map((match) => {
    const contentForScoring = match.content.length > 6000 ? match.content.slice(0, 6000) : match.content
    const overlap = computeTokenOverlapScore(queryTokens, contentForScoring)
    const phraseHit =
      normalizedQuestionPhrase.length >= 8 &&
      contentForScoring.toLowerCase().includes(normalizedQuestionPhrase)
    const anchorHits = anchorTokens.reduce((count, t) => (contentForScoring.toLowerCase().includes(t) ? count + 1 : count), 0)
    const combinedScore = computeCombinedScore(match.similarity, overlap, phraseHit, anchorHits)
    return { match, combinedScore }
  })

  scored.sort((a, b) => b.combinedScore - a.combinedScore)

  // Diversity caps to avoid flooding with near-duplicates from one source/coach
  const maxPerSource = 2
  const maxPerCoach = 3
  const perSourceCount = new Map<string, number>()
  const perCoachCount = new Map<string, number>()

  const selectedMatches: typeof combinedCandidates = []
  for (const { match } of scored) {
    if (selectedMatches.length >= topK) break
    const sourceKey = normalizeSourcePath(match.source) || "unknown-source"
    const nextSourceCount = (perSourceCount.get(sourceKey) ?? 0) + 1
    if (nextSourceCount > maxPerSource) continue

    const coach =
      match.metadata?.coach ??
      match.metadata?.channel ??
      deriveCoachFromSource(match.source) ??
      "Unknown Coach"
    const nextCoachCount = (perCoachCount.get(coach) ?? 0) + 1
    if (nextCoachCount > maxPerCoach) continue

    perSourceCount.set(sourceKey, nextSourceCount)
    perCoachCount.set(coach, nextCoachCount)
    selectedMatches.push(match)
  }

  // Safety valve: if the query has a strong anchor token (e.g. "medicine") and we still
  // didn't select any chunk containing it, force-include the best anchor-containing match.
  if (anchorTokens.length > 0 && !selectedMatches.some((m) => containsAnyToken(m.content, anchorTokens))) {
    const bestAnchor = scored.find(({ match }) => containsAnyToken(match.content, anchorTokens))?.match
    if (bestAnchor) {
      // Replace the last item (lowest-ranked) to keep size == topK
      if (selectedMatches.length >= topK) selectedMatches.pop()
      selectedMatches.unshift(bestAnchor)
    }
  }

  // Transform to RetrievedChunk format, truncating if needed
  const chunks: RetrievedChunk[] = selectedMatches.map((match) => ({
    chunkId: match.id,
    text: match.content.length > maxChunkChars
      ? match.content.substring(0, maxChunkChars) + "..."
      : match.content,
    metadata: {
      coach:
        match.metadata?.coach ??
        match.metadata?.channel ??
        deriveCoachFromSource(match.source),
      topic:
        match.metadata?.topic ??
        (typeof match.metadata?.video_title === "string" ? match.metadata.video_title : undefined) ??
        deriveTopicFromSource(match.source),
      source: match.source,
      timestamp: match.metadata?.timestamp,
    },
    relevanceScore: match.similarity,
  }))

  return chunks
}

/**
 * Check if any relevant chunks were found.
 */
export function hasRelevantChunks(chunks: RetrievedChunk[]): boolean {
  return chunks.length > 0
}
