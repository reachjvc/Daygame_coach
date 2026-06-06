import { searchSimilarEmbeddings, searchEmbeddingsByKeyword, fetchEmbeddingsBySourceAndConversation, fetchCommentaryForConversation } from "@/src/db/server"
import type { EmbeddingMetadata } from "@/src/db/types"
import { QA_CONFIG } from "./config"
import { DEFAULT_ADAPTIVE, computeNeedScore, estimateTokens, kneeCount, lerp, needTier } from "./adaptive"
import type { AdaptivePlan, AdaptiveRetrievalConfig, RetrievalBackend, RetrievalOptions, RetrievedChunk } from "./types"

/**
 * Production retrieval backend (the live `embeddings` table). Used by default
 * so existing callers are unchanged. The test chatbot injects an alternate
 * backend bound to `embeddings_test`.
 */
export const DEFAULT_RETRIEVAL_BACKEND: RetrievalBackend = {
  searchSimilarEmbeddings,
  searchEmbeddingsByKeyword,
  fetchEmbeddingsBySourceAndConversation,
  fetchCommentaryForConversation,
}

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

function asFiniteNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string") {
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function sortConversationChunks(
  rows: Array<{ id: string; content: string; source: string; metadata: EmbeddingMetadata | null }>
): Array<{ id: string; content: string; source: string; metadata: EmbeddingMetadata | null }> {
  return [...rows].sort((a, b) => {
    const am = a.metadata as any
    const bm = b.metadata as any
    const aConvIdx = asFiniteNumber(am?.conversationChunkIndex)
    const bConvIdx = asFiniteNumber(bm?.conversationChunkIndex)
    if (aConvIdx !== null && bConvIdx !== null) return aConvIdx - bConvIdx
    const aChunkIdx = asFiniteNumber(am?.chunkIndex)
    const bChunkIdx = asFiniteNumber(bm?.chunkIndex)
    if (aChunkIdx !== null && bChunkIdx !== null) return aChunkIdx - bChunkIdx
    return a.id.localeCompare(b.id)
  })
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
  options: RetrievalOptions = {},
  backend: RetrievalBackend = DEFAULT_RETRIEVAL_BACKEND,
  adaptive?: AdaptiveRetrievalConfig
): Promise<{ chunks: RetrievedChunk[]; plan: AdaptivePlan | null }> {
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

  const vectorMatches = await backend.searchSimilarEmbeddings(embedding, {
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
    ? await backend.searchEmbeddingsByKeyword(fallbackKeyword, { limit: 80 })
    : []

  const combinedCandidates = (() => {
    const byId = new Map<string, { id: string; content: string; source: string; metadata: EmbeddingMetadata | null; similarity: number }>()
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

    const qualityAdjustment = (() => {
      // Metadata-driven downranking (small on purpose). This should not "hide" rare but relevant clips.
      // Stage 09 emits chunkConfidence in [0, 1] based on transcript/speaker/phase quality signals.
      const raw = match.metadata?.chunkConfidence
      const cc = typeof raw === "number" && raw >= 0 && raw <= 1 ? raw : 1.0
      // Max penalty ~= -0.12 (only for cc=0). Keep similarity dominant.
      return -0.12 * (1.0 - cc)
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

    const combinedScore = baseScore + interactionBonus + qualityAdjustment + anchorGatingAdjustment

    return { match, combinedScore }
  })

  scored.sort((a, b) => b.combinedScore - a.combinedScore)

  // --- Adaptive planning (test bench): size retrieval to the question ---
  // Non-adaptive path keeps every default below so production is unchanged.
  let candidatePool = scored
  let selectLimit = topK
  let effectiveStitchRadius = 1
  let expand = true
  let contextBudgetTokens = Number.POSITIVE_INFINITY
  let planDraft: AdaptivePlan | null = null

  if (adaptive) {
    const minRelevance = adaptive.minRelevance ?? DEFAULT_ADAPTIVE.minRelevance
    const baseContextTokens = adaptive.baseContextTokens ?? DEFAULT_ADAPTIVE.baseContextTokens
    const maxContextTokens = adaptive.maxContextTokens ?? DEFAULT_ADAPTIVE.maxContextTokens

    const aboveFloor = scored.filter((s) => s.match.similarity >= minRelevance)

    // Nothing clears the floor → return nothing (caller refuses).
    if (aboveFloor.length === 0) {
      return {
        chunks: [],
        plan: {
          tier: "shallow",
          needScore: 0,
          chunkCount: 0,
          contextTokens: 0,
          contextBudget: 0,
          stitchRadius: 0,
          outputTokens: 0,
          reasons: [
            `no chunk cleared the relevance floor (${minRelevance}); best was ${(scored[0]?.match.similarity ?? 0).toFixed(2)}`,
          ],
        },
      }
    }

    // Need is judged on the *usable* top matches, not the whole candidate pool,
    // so a well-covered topic doesn't auto-escalate to "deep".
    const topSimsDesc = aboveFloor.slice(0, topK).map((s) => s.match.similarity)
    const hasExpandable = aboveFloor.slice(0, topK).some((s) => {
      const t = String((s.match.metadata as any)?.segmentType ?? "").toUpperCase()
      return t === "INTERACTION" || t === "EXPLANATION" || t === "COMMENTARY"
    })

    const { score: need, reasons } = computeNeedScore(question, topSimsDesc, hasExpandable)
    const tier = needTier(need)

    const maxChunks = Math.max(1, Math.min(topK, lerp(2, topK, need)))
    const knee = kneeCount(aboveFloor.map((s) => s.combinedScore))
    selectLimit = Math.max(1, Math.min(maxChunks, knee, topK))
    effectiveStitchRadius = need < 0.34 ? 0 : need < 0.67 ? 1 : 2
    expand = need >= 0.34
    contextBudgetTokens = lerp(baseContextTokens, maxContextTokens, need)
    candidatePool = aboveFloor

    reasons.unshift(`${aboveFloor.length} candidates ≥ floor ${minRelevance}; cap ${selectLimit} chunks`)
    reasons.push(`stitch radius ${effectiveStitchRadius}; cross-ref ${expand ? "on" : "off"}`)

    planDraft = {
      tier,
      needScore: Math.round(need * 100) / 100,
      chunkCount: 0, // filled after budget packing
      contextTokens: 0, // filled at assembly
      contextBudget: contextBudgetTokens,
      stitchRadius: effectiveStitchRadius,
      outputTokens: lerp(DEFAULT_ADAPTIVE.baseOutputTokens, DEFAULT_ADAPTIVE.maxOutputTokens, need),
      reasons,
    }
  }

  // Diversity caps to avoid flooding with near-duplicates from one source/coach
  const maxPerSource = 2
  const maxPerCoach = 3
  const maxPerConversation = 1
  const perSourceCount = new Map<string, number>()
  const perCoachCount = new Map<string, number>()
  const perConversationCount = new Map<string, number>()

  const selectedMatches: typeof combinedCandidates = []
  for (const { match } of candidatePool) {
    if (selectedMatches.length >= selectLimit) break
    const sourceKey = normalizeSourcePath(match.source) || "unknown-source"
    const nextSourceCount = (perSourceCount.get(sourceKey) ?? 0) + 1
    if (nextSourceCount > maxPerSource) continue

    const convId = asFiniteNumber((match.metadata as any)?.conversationId)
    const convKey = convId !== null ? `${sourceKey}|${convId}` : null
    const nextConvCount = convKey ? (perConversationCount.get(convKey) ?? 0) + 1 : null
    if (convId !== null) {
      if ((nextConvCount ?? 0) > maxPerConversation) continue
    }

    const coach = String(
      match.metadata?.coach ??
      match.metadata?.channel ??
      deriveCoachFromSource(match.source) ??
      "Unknown Coach"
    )
    const nextCoachCount = (perCoachCount.get(coach) ?? 0) + 1
    if (nextCoachCount > maxPerCoach) continue

    perSourceCount.set(sourceKey, nextSourceCount)
    perCoachCount.set(coach, nextCoachCount)
    if (convKey) perConversationCount.set(convKey, nextConvCount ?? 1)
    selectedMatches.push(match)
  }

  // Safety valve: if the query has a strong anchor token (e.g. "medicine") and we still
  // didn't select any chunk containing it, force-include the best anchor-containing match.
  if (primaryAnchors.length > 0 && !selectedMatches.some((m) => containsAnyToken(m.content, primaryAnchors))) {
    const bestAnchor = candidatePool.find(({ match }) => containsAnyToken(match.content, primaryAnchors))?.match
    if (bestAnchor) {
      // Don't duplicate an already-selected chunk.
      if (selectedMatches.some((m) => m.id === bestAnchor.id)) {
        // no-op
      } else {
      // Replace the last item (lowest-ranked) to keep size == selectLimit
      if (selectedMatches.length >= selectLimit) selectedMatches.pop()
      selectedMatches.unshift(bestAnchor)
      }
    }
  }

  // Context stitching: for interaction chunks, include adjacent chunks from the same conversation
  // so the QA model sees continuity (open -> hook -> close) instead of an isolated phase.
  const stitchedContentById = new Map<string, string>()
  const conversationCache = new Map<string, Array<{ id: string; content: string; source: string; metadata: EmbeddingMetadata | null }>>()

  async function getConversationChunks(source: string, conversationId: number) {
    const key = `${source}|${conversationId}`
    const cached = conversationCache.get(key)
    if (cached) return cached

    const rows = await backend.fetchEmbeddingsBySourceAndConversation(source, conversationId)
    const normalized = rows.map((r) => ({
      id: r.id,
      content: r.content,
      source: r.source,
      metadata: r.metadata ?? null,
    }))
    conversationCache.set(key, normalized)
    return normalized
  }

  // Radius 0 (shallow adaptive tier) skips stitching entirely.
  const stitchTasks = effectiveStitchRadius <= 0 ? [] : selectedMatches.map(async (match) => {
    const sourceKey = normalizeSourcePath(match.source) || ""
    const convId = asFiniteNumber((match.metadata as any)?.conversationId)
    if (!sourceKey || convId === null) return

    const all = await getConversationChunks(sourceKey, convId)
    if (!all.length) return

    const sorted = sortConversationChunks(all)
    if (sorted.length <= 1) return

    const focusIdx = Math.max(0, sorted.findIndex((r) => r.id === match.id))
    const convTotal = asFiniteNumber((match.metadata as any)?.conversationChunkTotal)

    const stitchedRows = (() => {
      // For short conversations (<=4 chunks), just include all phases.
      if (convTotal !== null && convTotal <= 4) return sorted

      const radius = effectiveStitchRadius
      const start = Math.max(0, focusIdx - radius)
      const endExclusive = Math.min(sorted.length, focusIdx + radius + 1)
      return sorted.slice(start, endExclusive)
    })()

    const stitchedText = stitchedRows.map((r) => r.content).join("\n\n---\n\n")
    if (stitchedText.trim().length > 0) stitchedContentById.set(match.id, stitchedText)
  })

  await Promise.all(stitchTasks)

  // D14b: Commentary co-retrieval — when a conversation chunk is retrieved,
  // also fetch related commentary from the same source (and vice versa).
  const commentaryCache = new Map<string, Array<{ id: string; content: string; source: string; metadata: EmbeddingMetadata | null }>>()

  async function getCommentaryForConversation(source: string, convId: number) {
    const key = `${source}|commentary|${convId}`
    const cached = commentaryCache.get(key)
    if (cached) return cached
    try {
      const rows = await backend.fetchCommentaryForConversation(source, convId)
      const normalized = rows.map((r) => ({
        id: r.id,
        content: r.content,
        source: r.source,
        metadata: (r.metadata ?? null) as EmbeddingMetadata | null,
      }))
      commentaryCache.set(key, normalized)
      return normalized
    } catch {
      commentaryCache.set(key, [])
      return []
    }
  }

  const crossRefContentById = new Map<string, { text: string; type: "commentary" | "conversation" }>()

  // Shallow adaptive tier skips cross-reference expansion.
  const crossRefTasks = !expand ? [] : selectedMatches.map(async (match) => {
    const sourceKey = normalizeSourcePath(match.source) || ""
    if (!sourceKey) return
    const meta = match.metadata as Record<string, unknown> | null
    if (!meta) return

    const segmentType = String(meta.segmentType ?? "").toUpperCase()
    const convId = asFiniteNumber(meta.conversationId as unknown)
    const relatedConvId = asFiniteNumber(meta.relatedConversationId as unknown)

    if (segmentType === "INTERACTION" && convId !== null) {
      // Conversation chunk → co-retrieve related commentary
      const commentary = await getCommentaryForConversation(sourceKey, convId)
      if (commentary.length > 0) {
        const sorted = [...commentary].sort((a, b) => {
          const aIdx = asFiniteNumber((a.metadata as Record<string, unknown> | null)?.blockIndex as unknown) ?? 999
          const bIdx = asFiniteNumber((b.metadata as Record<string, unknown> | null)?.blockIndex as unknown) ?? 999
          return aIdx - bIdx
        })
        const topCommentary = sorted.slice(0, 3)
        const commentaryText = topCommentary.map((c) => c.content).join("\n\n---\n\n")
        if (commentaryText.trim()) {
          crossRefContentById.set(match.id, { text: commentaryText, type: "commentary" })
        }
      }
    } else if ((segmentType === "COMMENTARY" || segmentType === "EXPLANATION") && relatedConvId !== null && relatedConvId > 0) {
      // Commentary chunk → co-retrieve the related conversation
      const convChunks = await getConversationChunks(sourceKey, relatedConvId)
      if (convChunks.length > 0) {
        const sorted = sortConversationChunks(convChunks)
        const selected = sorted.length <= 4 ? sorted : sorted.slice(0, 3)
        const convText = selected.map((r) => r.content).join("\n\n---\n\n")
        if (convText.trim()) {
          crossRefContentById.set(match.id, { text: convText, type: "conversation" })
        }
      }
    }
  })

  await Promise.all(crossRefTasks)

  // Transform to RetrievedChunk format, truncating if needed.
  // In adaptive mode, stop adding chunks once the context-token budget is hit
  // (always keep at least one).
  const chunks: RetrievedChunk[] = []
  let usedContextTokens = 0
  for (const match of selectedMatches) {
    const rawCoach = match.metadata?.coach ?? match.metadata?.channel ?? deriveCoachFromSource(match.source)
    const rawTopic = match.metadata?.topic ??
      (typeof match.metadata?.video_title === "string" ? match.metadata.video_title : undefined) ??
      deriveTopicFromSource(match.source)

    let content = stitchedContentById.get(match.id) ?? match.content

    // D14b: append cross-referenced commentary or conversation context
    const crossRef = crossRefContentById.get(match.id)
    if (crossRef) {
      const separator = crossRef.type === "commentary"
        ? "\n\n=== Coach Commentary ===\n\n"
        : "\n\n=== Related Conversation ===\n\n"
      content = content + separator + crossRef.text
    }

    const text = content.length > maxChunkChars
      ? content.substring(0, maxChunkChars) + "..."
      : content
    const tokens = estimateTokens(text)

    // Budget gate (adaptive only): keep ≥1, then stop once over budget.
    if (chunks.length >= 1 && usedContextTokens + tokens > contextBudgetTokens) break
    usedContextTokens += tokens

    chunks.push({
      chunkId: match.id,
      text,
      metadata: {
        coach: typeof rawCoach === "string" ? rawCoach : undefined,
        topic: typeof rawTopic === "string" ? rawTopic : undefined,
        source: match.source,
        timestamp: typeof match.metadata?.timestamp === "string" ? match.metadata.timestamp : undefined,
      },
      relevanceScore: match.similarity,
    })
  }

  if (planDraft) {
    planDraft.chunkCount = chunks.length
    planDraft.contextTokens = usedContextTokens
  }

  return { chunks, plan: planDraft }
}

/**
 * Check if any relevant chunks were found.
 */
export function hasRelevantChunks(chunks: RetrievedChunk[]): boolean {
  return chunks.length > 0
}
