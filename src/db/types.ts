/**
 * Database types for Supabase tables.
 * These types match the existing database schema.
 */

// ============================================
// Embeddings table (training data / RAG)
// ============================================

export interface EmbeddingRow {
  id: string
  content: string
  source: string
  embedding: number[]
  metadata: EmbeddingMetadata | null
  created_at?: string
}

export interface EmbeddingMetadata {
  coach?: string
  topic?: string
  timestamp?: string
  video_title?: string
  channel?: string
  [key: string]: unknown
}

export interface EmbeddingInsert {
  content: string
  source: string
  embedding: number[]
  metadata?: EmbeddingMetadata | null
}

export interface EmbeddingMatch {
  id: string
  content: string
  source: string
  metadata: EmbeddingMetadata | null
  similarity: number
}

// ============================================
// Profiles table (user profiles)
// ============================================

export interface ProfileRow {
  id: string
  email?: string | null
  full_name?: string | null
  avatar_url?: string | null
  has_purchased: boolean
  onboarding_completed: boolean
  primary_archetype?: string | null
  secondary_archetypes?: string[] | null
  region?: string | null
  secondary_regions?: string[] | null
  experience_level?: string | null
  xp?: number
  level?: number
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  full_name?: string | null
  avatar_url?: string | null
  has_purchased?: boolean
  onboarding_completed?: boolean
  primary_archetype?: string | null
  secondary_archetypes?: string[] | null
  region?: string | null
  secondary_regions?: string[] | null
  experience_level?: string | null
  xp?: number
  level?: number
}

// ============================================
// Purchases table
// ============================================

export interface PurchaseRow {
  id: string
  user_id: string
  stripe_session_id?: string | null
  amount?: number | null
  currency?: string | null
  status: string
  created_at?: string
}

export interface PurchaseInsert {
  user_id: string
  stripe_session_id?: string | null
  amount?: number | null
  currency?: string | null
  status: string
}

// ============================================
// Scenarios table (practice history)
// ============================================

export interface ScenarioRow {
  id: string
  user_id: string
  scenario_type?: string | null
  scenario_data?: Record<string, unknown> | null
  user_response?: string | null
  evaluation?: Record<string, unknown> | null
  xp_earned?: number | null
  created_at?: string
}

export interface ScenarioInsert {
  user_id: string
  scenario_type?: string | null
  scenario_data?: Record<string, unknown> | null
  user_response?: string | null
  evaluation?: Record<string, unknown> | null
  xp_earned?: number | null
}
