import { createAdminSupabaseClient } from "./supabase"
import type { EmbeddingInsert, EmbeddingMatch, EmbeddingRow } from "./types"

/**
 * Repository for the embeddings_test table (isolated RAG dataset for the
 * /test/test-chatbot harness). Mirrors embeddingsRepo.ts but targets
 * `embeddings_test` + the `match_embeddings_test` RPC.
 */

const BATCH_SIZE = 200

export async function storeTestEmbeddings(
  embeddings: EmbeddingInsert[]
): Promise<void> {
  const supabase = createAdminSupabaseClient()

  for (let i = 0; i < embeddings.length; i += BATCH_SIZE) {
    const batch = embeddings.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from("embeddings_test").insert(batch)

    if (error) {
      throw new Error(`Failed to store test embeddings batch: ${error.message}`)
    }
  }
}

export async function deleteTestEmbeddingsBySource(source: string): Promise<void> {
  const supabase = createAdminSupabaseClient()

  const { error } = await supabase
    .from("embeddings_test")
    .delete()
    .eq("source", source)

  if (error) {
    throw new Error(`Failed to delete test embeddings for source '${source}': ${error.message}`)
  }
}

export async function searchTestEmbeddings(
  queryEmbedding: number[],
  options: {
    limit?: number
    matchThreshold?: number
  } = {}
): Promise<EmbeddingMatch[]> {
  const { limit = 5, matchThreshold = 0.5 } = options
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase.rpc("match_embeddings_test", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: limit,
  })

  if (error) {
    throw new Error(`Failed to search test embeddings: ${error.message}`)
  }

  return data as EmbeddingMatch[]
}

/**
 * Lexical fallback search on the test table (mirror of searchEmbeddingsByKeyword).
 */
export async function searchTestEmbeddingsByKeyword(
  keyword: string,
  options: { limit?: number } = {}
): Promise<Array<Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">>> {
  const limit = options.limit ?? 50
  const trimmed = keyword.trim()
  if (!trimmed) return []

  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("embeddings_test")
    .select("id, content, source, metadata")
    .ilike("content", `%${trimmed}%`)
    .limit(limit)

  if (error) {
    throw new Error(`Failed to search test embeddings by keyword: ${error.message}`)
  }

  return (data ?? []) as Array<Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">>
}

/**
 * Fetch all chunks for a conversation within a source (mirror of
 * fetchEmbeddingsBySourceAndConversation) — used for context stitching.
 */
export async function fetchTestEmbeddingsBySourceAndConversation(
  source: string,
  conversationId: number
): Promise<Array<Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">>> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("embeddings_test")
    .select("id, content, source, metadata")
    .eq("source", source)
    .contains("metadata", { conversationId })
    .limit(80)

  if (error) {
    throw new Error(
      `Failed to fetch test embeddings for source '${source}', conversationId ${conversationId}: ${error.message}`
    )
  }

  return (data ?? []) as Array<Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">>
}

/**
 * Fetch commentary related to a conversation from the same source (mirror of
 * fetchCommentaryForConversation) — D14b cross-referencing.
 */
export async function fetchTestCommentaryForConversation(
  source: string,
  conversationId: number
): Promise<Array<Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">>> {
  const supabase = createAdminSupabaseClient()

  const { data, error } = await supabase
    .from("embeddings_test")
    .select("id, content, source, metadata")
    .eq("source", source)
    .contains("metadata", { relatedConversationId: conversationId })
    .limit(20)

  if (error) {
    throw new Error(
      `Failed to fetch test commentary for source '${source}', conversationId ${conversationId}: ${error.message}`
    )
  }

  return (data ?? []) as Array<Pick<EmbeddingRow, "id" | "content" | "source" | "metadata">>
}

export async function getTestEmbeddingsCount(): Promise<number> {
  const supabase = createAdminSupabaseClient()

  const { count, error } = await supabase
    .from("embeddings_test")
    .select("*", { count: "exact", head: true })

  if (error) {
    throw new Error(`Failed to get test embeddings count: ${error.message}`)
  }

  return count ?? 0
}
