export {
  createServerSupabaseClient,
  createAdminSupabaseClient,
} from "./supabase"

export type {
  EmbeddingRow,
  EmbeddingMetadata,
  EmbeddingInsert,
  EmbeddingMatch,
  ProfileRow,
  ProfileUpdate,
  PurchaseRow,
  PurchaseInsert,
  ScenarioRow,
  ScenarioInsert,
} from "./types"

export {
  storeEmbeddings,
  deleteEmbeddingsBySource,
  searchSimilarEmbeddings,
  searchEmbeddingsByKeyword,
  fetchEmbeddingsBySourceAndConversation,
  fetchCommentaryForConversation,
  getEmbeddingsCount,
  getEmbeddingSources,
} from "./embeddingsRepo"

export {
  searchTestEmbeddings,
  searchTestEmbeddingsByKeyword,
  fetchTestEmbeddingsBySourceAndConversation,
  fetchTestCommentaryForConversation,
  getTestEmbeddingsCount,
} from "./embeddingsTestRepo"

export {
  getProfile,
  updateProfile,
  hasPurchased,
  updateUserProgress,
  getCurrentUserProfile,
} from "./profilesRepo"

export {
  createScenarioAttempt,
  getScenarioStats,
  type ScenarioStats,
} from "./scenarioRepo"

export {
  requireAuth,
  requirePremium,
  type AuthResult,
  type AuthSuccess,
  type AuthFailure,
} from "./auth"
