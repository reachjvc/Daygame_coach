// Browser-safe exports only.
// Server-only exports live in `src/db/server.ts`.

export { createBrowserSupabaseClient } from "./supabase-client"

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
