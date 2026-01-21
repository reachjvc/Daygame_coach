/**
 * Settings slice types
 * Follows the vertical slice architecture pattern from SLICE_QA.md
 */

import type { SandboxSettings } from "@/src/scenarios/openers/data/sandbox-settings"

// ============================================
// Props types (for components)
// ============================================

export interface SettingsPageProps {
  user: UserInfo
  profile: ProfileInfo
  subscription: SubscriptionInfo | null
  stats: UserStats
}

export interface UserInfo {
  id: string
  email: string
}

export interface ProfileInfo {
  id: string
  email: string | null
  full_name: string | null
  has_purchased: boolean | null
  created_at: string
  difficulty: string | null
  level: number | null
  xp: number | null
  scenarios_completed: number | null
  age_range_start: number | null
  age_range_end: number | null
  archetype: string | null
  secondary_archetype: string | null
  tertiary_archetype: string | null
  dating_foreigners: boolean | null
  user_is_foreign: boolean | null
  preferred_region: string | null
  secondary_region: string | null
  experience_level: string | null
  primary_goal: string | null
  sandbox_settings: SandboxSettings
}

export interface SubscriptionInfo {
  id: string
  status: string
  currentPeriodEnd: Date
  currentPeriodStart: Date
  cancelAtPeriodEnd: boolean
  cancelAt: Date | null
  productId: string
  createdAt: Date
}

export interface UserStats {
  totalScenarios: number
  averageScore: number
  level: number
  xp: number
  scenariosCompleted: number
}

// ============================================
// Service types
// ============================================

export interface UpdateSandboxSettingsRequest {
  userId: string
  settings: Partial<SandboxSettings>
}

export interface UpdateDifficultyRequest {
  userId: string
  difficulty: DifficultyLevel
}

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert" | "master"

export const VALID_DIFFICULTIES: DifficultyLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "master",
]

// ============================================
// Config types
// ============================================

export interface DifficultyOption {
  id: DifficultyLevel
  label: string
  description: string
}

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { id: "beginner", label: "Beginner", description: "Friendly, receptive encounters" },
  { id: "intermediate", label: "Intermediate", description: "Mixed energy levels" },
  { id: "advanced", label: "Advanced", description: "More challenging scenarios" },
  { id: "expert", label: "Expert", description: "Difficult, realistic situations" },
  { id: "master", label: "Master", description: "Maximum challenge" },
]

export const LEVEL_TITLES: Record<number, string> = {
  1: "Newcomer",
  2: "Apprentice",
  3: "Beginner",
  4: "Student",
  5: "Learner",
  6: "Practitioner",
  7: "Developing",
  8: "Progressing",
  9: "Competent",
  10: "Skilled",
  11: "Experienced",
  12: "Advanced",
  13: "Proficient",
  14: "Expert",
  15: "Master",
  16: "Veteran",
  17: "Elite",
  18: "Champion",
  19: "Legend",
  20: "Grandmaster",
}
