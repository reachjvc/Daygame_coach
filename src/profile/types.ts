export interface UserProfile {
  id: string
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
  onboarding_completed: boolean
  has_purchased: boolean
  level: number
  xp: number
  scenarios_completed: number
}

export interface ProfileUpdates {
  age_range_start?: number
  age_range_end?: number
  archetype?: string
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  dating_foreigners?: boolean
  user_is_foreign?: boolean
  preferred_region?: string
  secondary_region?: string | null
  experience_level?: string
  primary_goal?: string
  onboarding_completed?: boolean
  level?: number
}

export interface Archetype {
  name: string
  vibe: string
  barrier: string
  image: string | null
}

export interface Region {
  id: string
  name: string
  description: string
}
