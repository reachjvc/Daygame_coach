import { createAdminSupabaseClient } from "./supabase"
import type { EmbeddingInsert, EmbeddingMatch, EmbeddingRow } from "./types"

/**
 * Repository for embeddings table (training data / RAG).
 * All vector search and training data operations go through here.
 */

const BATCH_SIZE = 200

/**
 * Store chunks to the embeddings table.
 * Batches inserts to avoid payload size limits.
 */
export async function storeEmbeddings(
  embeddings: EmbeddingInsert[]
): Promise<void> {
  const supabase = createAdminSupabaseClient()

  for (let i = 0; i < embeddings.length; i += BATCH_SIZE) {
    const batch = embeddings.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from("embeddings").insert(batch)

    if (error) {
      throw new Error(`Failed to store embeddings batch: ${error.message}`)
    }
  }
}

/**
 * Delete all embeddings from a specific source.
 */
export async function deleteEmbeddingsBySource(source: string): Promise<void> {
  const supabase = createAdminSupabaseClient()

  const { error } = await supabase
    .from("embeddings")
    .delete()
    .eq("source", source)

  if (error) {
    throw new Error(`Failed to delete embeddings for source '${source}': ${error.message}`)
  }
}

/**
 * Search for similar embeddings using vector similarity.
 * Uses the match_embeddings RPC function defined in Supabase.
 */
export async function searchSimilarEmbeddings(
  queryEmbedding: number[],
  options: {
    limit?: number
    matchThreshold?: number
  } = {}
): Promise<EmbeddingMatch[]> {
  const { limit = 5, matchThreshold = 0.5 } = options
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: limit,
  })

  if (error) {
    throw new Error(`Failed to search embeddings: ${error.message}`)
  }

  return data as EmbeddingMatch[]
}

/**
 * Basic lexical fallback search (Phase 0 hybrid-ish retrieval).
 * Note: this is not full-text search; it uses ILIKE for a single keyword.
 */
export async function searchEmbeddingsByKeyword(
  keyword: string,
  options: { limit?: number } = {}
): Promise<Array<Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">>> {
  const limit = options.limit ?? 50
  const trimmed = keyword.trim()
  if (!trimmed) return []

  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("embeddings")
    .select("id, content, source, metadata")
    .ilike("content", `%${trimmed}%`)
    .limit(limit)

  if (error) {
    throw new Error(`Failed to search embeddings by keyword: ${error.message}`)
  }

  return (data ?? []) as Array<Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">>
}

/**
 * Get total count of embeddings (for stats/diagnostics).
 */
export async function getEmbeddingsCount(): Promise<number> {
  const supabase = createAdminSupabaseClient()

  const { count, error } = await supabase
    .from("embeddings")
    .select("*", { count: "exact", head: true })

  if (error) {
    throw new Error(`Failed to get embeddings count: ${error.message}`)
  }

  return count ?? 0
}

/**
 * Get unique sources in the embeddings table.
 */
export async function getEmbeddingSources(): Promise<string[]> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("embeddings")
    .select("source")

  if (error) {
    throw new Error(`Failed to get embedding sources: ${error.message}`)
  }

  const sources = new Set(data?.map((row) => row.source) ?? [])
  return Array.from(sources)
}
