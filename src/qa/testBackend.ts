import {
  searchTestEmbeddings,
  searchTestEmbeddingsByKeyword,
  fetchTestEmbeddingsBySourceAndConversation,
  fetchTestCommentaryForConversation,
} from "@/src/db/server"
import type { RetrievalBackend } from "./types"

/**
 * Retrieval backend bound to the isolated `embeddings_test` table.
 * Used only by the dev-only /test/test-chatbot harness so the live chatbot
 * keeps reading from the production `embeddings` table.
 */
export const TEST_RETRIEVAL_BACKEND: RetrievalBackend = {
  searchSimilarEmbeddings: searchTestEmbeddings,
  searchEmbeddingsByKeyword: searchTestEmbeddingsByKeyword,
  fetchEmbeddingsBySourceAndConversation: fetchTestEmbeddingsBySourceAndConversation,
  fetchCommentaryForConversation: fetchTestCommentaryForConversation,
}
