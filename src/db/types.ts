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

import type { SandboxSettings } from "@/src/scenarios/openers/data/sandbox-settings"

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
  // Settings-related fields
  difficulty?: string | null
  sandbox_settings?: SandboxSettings | null
  scenarios_completed?: number | null
  subscription_cancelled_at?: string | null
  // Legacy preference fields (from old project)
  age_range_start?: number | null
  age_range_end?: number | null
  archetype?: string | null
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  dating_foreigners?: boolean | null
  user_is_foreign?: boolean | null
  preferred_region?: string | null
  secondary_region?: string | null
  primary_goal?: string | null
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
  // Settings-related fields
  difficulty?: string | null
  sandbox_settings?: SandboxSettings | null
  scenarios_completed?: number | null
  subscription_cancelled_at?: string | null
}

// ============================================
// Purchases table
// ============================================

export interface PurchaseRow {
  id: string
  user_id: string
  stripe_session_id?: string | null
  stripe_subscription_id?: string | null
  product_id?: string | null
  amount?: number | null
  currency?: string | null
  status: string
  subscription_status?: string | null
  created_at?: string
}

export interface PurchaseInsert {
  user_id: string
  stripe_session_id?: string | null
  stripe_subscription_id?: string | null
  product_id?: string | null
  amount?: number | null
  currency?: string | null
  status: string
  subscription_status?: string | null
}

export interface PurchaseUpdate {
  subscription_status?: string | null
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
