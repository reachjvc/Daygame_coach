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
  "girl",
  "girls",
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
  "said",
  "say",
  "says",
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
  "woman",
  "women",
  "you",
  "your",
])

function stemToken(token: string): string {
  // Ultra-light stemming to reduce common morphological mismatches ("studies" vs "studying", plurals, etc.)
  // This is intentionally conservative to avoid harming proper nouns too much.
  if (token.length <= 4) return token
  if (token.endsWith("ies") && token.length > 5) return token.slice(0, -3) + "y"
  if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3)
  if (token.endsWith("ed") && token.length > 5) return token.slice(0, -2)
  if (token.endsWith("s") && token.length > 4 && !token.endsWith("ss")) return token.slice(0, -1)
  return token
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((t) => stemToken(t.trim()))
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

type IntentAnchors = {
  // Primary domain tokens (e.g. ["medicine"] or ["computer", "science"])
  anchorTokens: string[]
  // Secondary tokens we expect in relevant chunks (e.g. "doctor", "medical", "school", "university")
  companionTokens: string[]
  // Short phrases to boost (e.g. "studying medicine", "medical school")
  boostPhrases: string[]
}

function extractStudyAnchors(question: string): IntentAnchors | null {
  const normalized = question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  // Capture 1–3 words after "study/studies/studying"
  const match = normalized.match(/\bstud(?:y|ies|ying)\s+([a-z][a-z0-9]*(?:\s+[a-z][a-z0-9]*){0,2})\b/)
  if (!match) return null

  const rawPhrase = match[1].trim()
  const anchorTokens = rawPhrase
    .split(" ")
    .map((t) => stemToken(t))
    .filter((t) => t.length >= 3)

  if (anchorTokens.length === 0) return null

  const anchorText = anchorTokens.join(" ")

  // Domain-specific companions only where it clearly helps disambiguate.
  const companionTokens = (() => {
    // For medicine, we strongly want educational/career context rather than idioms or plant-medicine talk.
    if (anchorTokens.includes("medicine") || anchorTokens.includes("medicin") || anchorTokens.includes("medical")) {
      return [
        "doctor",
        "medical",
        "med",
        "school",
        "university",
        "college",
        "student",
        "psychiatr",
        "hospital",
        "clinic",
        "resident",
        "specialt",
        "degree",
        "study",
      ]
    }
    // Generic study companions (lightweight; avoids overfitting).
    return ["study", "student", "university", "school", "degree"]
  })()

  const boostPhrases = (() => {
    const phrases = new Set<string>()
    phrases.add(`study ${anchorText}`)
    phrases.add(`studying ${anchorText}`)
    if (anchorTokens.includes("medicine") || anchorTokens.includes("medicin") || anchorTokens.includes("medical")) {
      phrases.add("medical school")
      phrases.add("be a doctor")
      phrases.add("become a doctor")
    }
    return Array.from(phrases)
  })()

  return { anchorTokens, companionTokens, boostPhrases }
}

function buildEmbeddingQueryText(question: string): string {
  // For "what should I say..." style questions, the full question can dilute embeddings.
  // Use a compact, intent-heavy rewrite for retrieval only.
  const q = question.trim()
  const anchors = extractStudyAnchors(q)

  const lower = q.toLowerCase()
  const isScript =
    lower.includes("what should i say") ||
    lower.includes("what do i say") ||
    lower.includes("how do i respond") ||
    lower.includes("what do i respond") ||
    lower.includes("what should i reply") ||
    lower.includes("what do i reply")

  if (!isScript || !anchors) return q

  const anchorText = anchors.anchorTokens.join(" ")
  const companion = anchors.companionTokens.slice(0, 6).join(" ")
  return `studying ${anchorText} ${companion}`.trim()
}

function countTokenHits(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 0
  const lower = text.toLowerCase()
  let hits = 0
  for (const t of tokens) {
    if (t && lower.includes(t)) hits++
  }
  return hits
}

function hasAnyPhrase(text: string, phrases: string[]): boolean {
  if (phrases.length === 0) return false
  const lower = text.toLowerCase()
  return phrases.some((p) => p.length > 0 && lower.includes(p))
}

function isMedicineIdiom(text: string): boolean {
  const lower = text.toLowerCase()
  return /\btaste of (?:my|your|his|her|their|our|one'?s) own medicine\b/i.test(lower) ||
    /\bgive (?:him|her|them|you) a taste of (?:my|your|his|her|their|our|one'?s) own medicine\b/i.test(lower)
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
  const embeddingQueryText = buildEmbeddingQueryText(question)
  const embedding = await generateEmbedding(embeddingQueryText)

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
  const studyAnchors = extractStudyAnchors(question)
  const primaryAnchors = (() => {
    if (studyAnchors?.anchorTokens?.length) return studyAnchors.anchorTokens.slice(0, 2)
    return [...queryTokens].sort((a, b) => b.length - a.length).slice(0, 2)
  })()

  // For lexical fallback, prefer a *disambiguating* token over a generic domain token.
  const fallbackKeyword = (() => {
    const candidate = studyAnchors?.companionTokens?.find((t) => t.length >= 6)
    return candidate ?? primaryAnchors[0] ?? ""
  })()

  const normalizedQuestionPhrase = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

  const needsLexicalFallback = (() => {
    if (!fallbackKeyword) return false
    if (fallbackKeyword.length < 6) return false
    return !vectorMatches.some((m) => m.content.toLowerCase().includes(fallbackKeyword))
  })()

  const keywordMatches = needsLexicalFallback && fallbackKeyword
    ? await searchEmbeddingsByKeyword(fallbackKeyword, { limit: 80 })
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

    const anchorHits = primaryAnchors.reduce(
      (count, t) => (t && contentForScoring.toLowerCase().includes(t) ? count + 1 : count),
      0
    )

    const baseScore = computeCombinedScore(match.similarity, overlap, phraseHit, anchorHits)

    const interactionBonus = (() => {
      const segmentType = String(match.metadata?.segmentType ?? "").toUpperCase()
      const isRealExample = Boolean(match.metadata?.isRealExample)
      const typeBonus = segmentType === "INTERACTION" ? 0.06 : 0
      const exampleBonus = isRealExample ? 0.06 : 0
      return typeBonus + exampleBonus
    })()

    const anchorGatingAdjustment = (() => {
      // If the user asks about "studying medicine", avoid matching idioms/plant-medicine talk that lack education/career context.
      if (!studyAnchors) return 0

      const lower = contentForScoring.toLowerCase()
      const hasAnchor = studyAnchors.anchorTokens.some((t) => t && lower.includes(t))
      if (!hasAnchor) return 0

      const companionHits = countTokenHits(contentForScoring, studyAnchors.companionTokens)
      const phraseBoost = hasAnyPhrase(contentForScoring, studyAnchors.boostPhrases) ? 0.06 : 0

      // Penalize generic/idiomatic uses where the anchor appears but none of the expected context tokens appear.
      const missingContextPenalty = companionHits === 0 ? -0.22 : 0

      // Strong penalty for the common idiom "taste of her own medicine".
      const idiomPenalty =
        studyAnchors.anchorTokens.includes("medicine") && isMedicineIdiom(contentForScoring) ? -0.35 : 0

      return phraseBoost + missingContextPenalty + idiomPenalty
    })()

    const combinedScore = baseScore + interactionBonus + anchorGatingAdjustment

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
  if (primaryAnchors.length > 0 && !selectedMatches.some((m) => containsAnyToken(m.content, primaryAnchors))) {
    const bestAnchor = scored.find(({ match }) => containsAnyToken(match.content, primaryAnchors))?.match
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
