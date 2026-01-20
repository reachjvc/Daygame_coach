export interface DashboardProfileData {
  has_purchased: boolean
  onboarding_completed: boolean
  level: number
  xp: number
  scenarios_completed: number
  age_range_start: number
  age_range_end: number
  archetype: string
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  dating_foreigners: boolean
  user_is_foreign?: boolean
  preferred_region?: string
  secondary_region?: string
  experience_level?: string
  primary_goal?: string
}
