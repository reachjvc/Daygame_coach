/**
 * Openers Types - Types specific to the opener scenario generator
 *
 * These types are used by:
 * - generator.ts (main scenario generation)
 * - data/energy.ts (energy states)
 * - data/outfits.ts (outfit descriptions)
 * - data/weather.ts (weather system)
 * - data/base-texts.ts (activity texts)
 */

import type { DifficultyLevel, SandboxSettings } from "../types"

// ─────────────────────────────────────────────────────────────────────────────
// Position & Activity Types (from base-texts.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type Position =
  | "standing"
  | "walking_slow"
  | "walking_moderate"
  | "walking_brisk"
  | "walking_fast"
  | "seated"

export type ActivityId =
  // 1.1 High Street - Shopping District
  | "1.1.1" | "1.1.2" | "1.1.3" | "1.1.4" | "1.1.5" | "1.1.6" | "1.1.7" | "1.1.8"
  // 1.2 High Street - Commute/Work
  | "1.2.1" | "1.2.2" | "1.2.3" | "1.2.4" | "1.2.5" | "1.2.6" | "1.2.7" | "1.2.8" | "1.2.9" | "1.2.10" | "1.2.11"
  // 1.3 High Street - Transit/Movement
  | "1.3.1" | "1.3.2" | "1.3.3" | "1.3.4" | "1.3.5"
  // 1.4 High Street - Leisure/Exploring
  | "1.4.1" | "1.4.2" | "1.4.3" | "1.4.4" | "1.4.5" | "1.4.6" | "1.4.7" | "1.4.8" | "1.4.9" | "1.4.10" | "1.4.11"
  // 1.5 High Street - Waiting/Paused
  | "1.5.1" | "1.5.2" | "1.5.3" | "1.5.4" | "1.5.5"
  // 1.6 High Street - Food/Drink
  | "1.6.1" | "1.6.2" | "1.6.3"
  // 1.7 High Street - Digital/Media
  | "1.7.1" | "1.7.2" | "1.7.3" | "1.7.4" | "1.7.5"
  // 1.8 High Street - Pet Activities
  | "1.8.1" | "1.8.2" | "1.8.3"
  // 1.9 High Street - Utility/Tasks
  | "1.9.1" | "1.9.2" | "1.9.3" | "1.9.4" | "1.9.5"
  // 2.x Mall activities
  | "2.1.1" | "2.1.2" | "2.1.3" | "2.1.4" | "2.1.5" | "2.1.6" | "2.1.7" | "2.1.8" | "2.1.9" | "2.1.10"
  | "2.2.1" | "2.2.2" | "2.2.3"
  | "2.3.1" | "2.3.2" | "2.3.3" | "2.3.4" | "2.3.5"
  | "2.4.1" | "2.4.2" | "2.4.3" | "2.4.4"
  | "2.5.1" | "2.5.2" | "2.5.3"
  | "2.6.1" | "2.6.2" | "2.6.3"
  // 3.x Coffee Shop activities
  | "3.1.1" | "3.1.2" | "3.1.3" | "3.1.4"
  | "3.2.1" | "3.2.2" | "3.2.3" | "3.2.4"
  | "3.3.1" | "3.3.2" | "3.3.3" | "3.3.4"
  | "3.4.1" | "3.4.2" | "3.4.3"
  | "3.5.1" | "3.5.2" | "3.5.3" | "3.5.4"
  | "3.6.1" | "3.6.2" | "3.6.3"
  // 4.x Transit activities
  | "4.1.1" | "4.1.2" | "4.1.3" | "4.1.4"
  | "4.2.1" | "4.2.2" | "4.2.3" | "4.2.4"
  | "4.3.1" | "4.3.2" | "4.3.3"
  | "4.4.1" | "4.4.2" | "4.4.3"
  | "4.5.1" | "4.5.2" | "4.5.3"
  // 5.x Park activities
  | "5.1.1" | "5.1.2" | "5.1.3" | "5.1.4"
  | "5.2.1" | "5.2.2" | "5.2.3"
  | "5.3.1" | "5.3.2" | "5.3.3" | "5.3.4"
  | "5.4.1" | "5.4.2" | "5.4.3"
  | "5.5.1" | "5.5.2" | "5.5.3"
  | "5.6.1" | "5.6.2" | "5.6.3"
  // 6.x Gym activities
  | "6.1.1" | "6.1.2" | "6.1.3"
  | "6.2.1" | "6.2.2" | "6.2.3"
  | "6.3.1" | "6.3.2" | "6.3.3"
  // 7.x Campus activities
  | "7.1.1" | "7.1.2" | "7.1.3" | "7.1.4"
  | "7.2.1" | "7.2.2" | "7.2.3" | "7.2.4"
  | "7.3.1" | "7.3.2" | "7.3.3" | "7.3.4"
  | "7.4.1" | "7.4.2" | "7.4.3"
  | "7.5.1" | "7.5.2" | "7.5.3"
  | "7.6.1" | "7.6.2" | "7.6.3"

// ─────────────────────────────────────────────────────────────────────────────
// Energy Types (from energy.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type EnergyState =
  // Positive/Open energies
  | "bubbly"
  | "cheerful"
  | "relaxed"
  | "curious"
  | "playful"
  | "flirty"
  | "excited"
  | "amused"
  | "content"
  // Neutral energies
  | "neutral"
  | "daydreaming"
  | "shy"
  | "bored"
  // Negative/Closed energies
  | "preoccupied"
  | "focused"
  | "rushed"
  | "closed"
  | "icy"
  | "tired"
  | "stressed"
  | "distracted"
  | "confident"
  | "irritated"
  | "impatient"
  | "skeptical"
  | "melancholic"

// ─────────────────────────────────────────────────────────────────────────────
// Weather Types (from weather.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type WeatherType =
  | "sunny"
  | "partly_cloudy"
  | "overcast"
  | "light_rain"
  | "rain"
  | "windy"
  | "cold"
  | "hot"
  | "mild"

export type Season = "spring" | "summer" | "autumn" | "winter"

// ─────────────────────────────────────────────────────────────────────────────
// Outfit Types (from outfits.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type OutfitCategory =
  | "business"
  | "smart_casual"
  | "casual"
  | "athleisure"
  | "bohemian"
  | "minimalist"
  | "trendy"
  | "edgy"
  | "preppy"
  | "relaxed"
  | "glamorous"
  | "vintage"
  | "sporty"
  | "streetwear"

export type EnvironmentType =
  | "high_street"
  | "mall"
  | "coffee_shop"
  | "transit"
  | "park"
  | "gym"
  | "campus"
  | "nightlife"
  | "beach"
  | "upscale_area"

export interface EnhancedOutfit {
  id: string
  category: OutfitCategory
  /** Environments where this outfit makes sense */
  suitableEnvironments: EnvironmentType[]
  /** Detailed descriptions with accessories, colors, brand hints */
  tier1: string[]
  /** Moderate detail descriptions */
  tier2: string[]
  /** Generic/vague descriptions */
  tier3: string[]
  /** Optional conversation hooks based on this outfit */
  hooks?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment Types (from generator.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironmentCode =
  | "1.1" | "1.2" | "1.3" | "1.4" | "1.5" | "1.6" | "1.7" | "1.8" | "1.9"
  | "2.1" | "2.2" | "2.3" | "2.4" | "2.5" | "2.6"
  | "3.1" | "3.2" | "3.3" | "3.4" | "3.5" | "3.6"
  | "4.1" | "4.2" | "4.3" | "4.4" | "4.5"
  | "5.1" | "5.2" | "5.3" | "5.4" | "5.5" | "5.6"
  | "6.1" | "6.2" | "6.3"
  | "7.1" | "7.2" | "7.3" | "7.4" | "7.5" | "7.6"

export interface EnvironmentWeights {
  "1.1"?: number
  "1.2"?: number
  "1.3"?: number
  "1.4"?: number
  "1.5"?: number
  "1.6"?: number
  "1.7"?: number
  "1.8"?: number
  "1.9"?: number
  "2.1"?: number
  "2.2"?: number
  "2.3"?: number
  "2.4"?: number
  "2.5"?: number
  "2.6"?: number
  "3.1"?: number
  "3.2"?: number
  "3.3"?: number
  "3.4"?: number
  "3.5"?: number
  "3.6"?: number
  "4.1"?: number
  "4.2"?: number
  "4.3"?: number
  "4.4"?: number
  "4.5"?: number
  "5.1"?: number
  "5.2"?: number
  "5.3"?: number
  "5.4"?: number
  "5.5"?: number
  "5.6"?: number
  "6.1"?: number
  "6.2"?: number
  "6.3"?: number
  "7.1"?: number
  "7.2"?: number
  "7.3"?: number
  "7.4"?: number
  "7.5"?: number
  "7.6"?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Region Types (from generator.ts)
// ─────────────────────────────────────────────────────────────────────────────

export const REGION_IDS = [
  "north-america",
  "latin-america",
  "western-europe",
  "slavic-europe",
  "eastern-europe",
  "scandinavia",
  "southern-europe",
  "africa",
  "middle-east",
  "south-asia",
  "southeast-asia",
  "east-asia",
  "australia",
] as const

export type RegionId = (typeof REGION_IDS)[number]
export type CountryId = string

// ─────────────────────────────────────────────────────────────────────────────
// Visible Item Types (from generator.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type VisibleItemType = "eating" | "drinking" | "post_eating"

export interface VisibleItemSelection {
  type: VisibleItemType
  item: string
  text: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Generated Scenario Types (from generator.ts)
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedScenarioV2 {
  /** What the user sees */
  userFacing: {
    description: string
    environment: string
    activity: string
    hook?: string
    weatherDescription?: string
  }
  /** Compact data for AI handoff */
  aiHandoff: {
    env: string
    activity: string
    position: Position
    energy: EnergyState
    energyDescription: string
    approachability: number
    crowd: string
    hasHeadphones: boolean
    listeningTo?: string
    visibleItem?: VisibleItemSelection
    outfit: {
      id: string
      category: OutfitCategory
      description: string
    }
    outfitHooks?: string[]
    weather?: {
      type: WeatherType
      moodModifier: number
      aiDescription: string
    }
  }
  /** Metadata */
  meta: {
    activityId: ActivityId
    difficulty: DifficultyLevel
    calculatedDifficulty: number
  }
}

export interface GeneratorOptionsV2 {
  /** Activity ID. Random if not provided. */
  activityId?: ActivityId
  /** Difficulty level. Defaults to intermediate. */
  difficulty?: DifficultyLevel
  /** Environment weights for activity selection */
  environmentWeights?: EnvironmentWeights
  /** Archetype ID for outfit selection */
  archetypeId?: string
  /** Preferred region id for regional item flavoring */
  regionId?: RegionId
  /** Preferred country id for country-level item flavoring */
  countryId?: CountryId
  /** Secondary region id for foreign flavoring */
  secondaryRegionId?: RegionId
  /** Secondary country id for foreign flavoring */
  secondaryCountryId?: CountryId
  /** Override probability for regional items (0-1) */
  regionalItemProbability?: number
  /** Override probability for country items (0-1) */
  countryItemProbability?: number
  /** Override probability for foreign/secondary items (0-1) */
  foreignItemProbability?: number
  /** Whether the user is primarily dating foreigners */
  datingForeigners?: boolean
  /** Whether the user is a foreigner in the current location */
  userIsForeign?: boolean
  /** Whether to include hooks/opener hints. Defaults to true. */
  includeHooks?: boolean
  /** Whether to include weather. Defaults to false. */
  includeWeather?: boolean
  /** Season for weather sampling */
  season?: Season
  /** Whether to use the enhanced outfit system */
  useEnhancedOutfits?: boolean
  /** Sandbox settings for customizing scenario generation */
  sandboxSettings?: SandboxSettings
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export DifficultyLevel from core types for convenience
// ─────────────────────────────────────────────────────────────────────────────

export type { DifficultyLevel, SandboxSettings } from "../types"
