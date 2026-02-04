/**
 * Role Models Data
 *
 * Gamified "character select" screen with 30 figures across 6 categories.
 * Each role model maps to specific values from the inner game value system.
 *
 * Data is stored in JSON files and typed here.
 */

import roleModelsData from './role-models.json'
import categoriesData from './role-model-categories.json'

// ============================================================================
// Types
// ============================================================================

export type RoleModelCategory =
  | "charisma"      // Charisma & Romance Archetypes
  | "warriors"      // Warriors & Leaders
  | "philosophers"  // Philosophers & Visionaries
  | "icons"         // Icons of Cool
  | "titans"        // Titans of Business
  | "mindset"       // Masters of Mindset

export type ImageStyle =
  | "classical"     // Historical paintings, busts, formal portraits
  | "stylized"      // Modern illustrations, artistic interpretations
  | "minimalist"    // Silhouettes, simple line art, iconic shapes

export type ImageVariation = {
  style: ImageStyle
  url: string
  description: string
  attribution?: string // For Creative Commons/public domain
}

export type RoleModel = {
  id: string
  name: string
  tagline: string                // 1-sentence hook (shown on card)
  category: RoleModelCategory
  values: string[]               // Maps to value IDs from config.ts

  // Primary quote (shown on collapsed card)
  quote: string
  quoteSource?: string           // Where the quote comes from
  quoteVerified: boolean         // true = verified, false = attributed

  // Expanded content (shown when card is opened)
  whyThisPerson: string          // 3-5 sentences - what makes them compelling
  corePhilosophy: string[]       // 3-5 bullet points - their guiding principles
  definingMoment?: string        // 1-2 paragraph story that illustrates their character
  howThisHelpsYou: string        // 2-3 sentences - connection to the user's journey
  additionalQuotes?: {           // 2-3 more quotes for depth
    text: string
    source?: string
  }[]

  // Images
  imageVariations: ImageVariation[]
  selectedImage?: string         // URL of the chosen style (set after style decision)
  animationFrames?: string[]     // For subtle motion effect (12 frames)
}

export type RoleModelCategoryInfo = {
  id: RoleModelCategory
  label: string
  description: string
  color: string
}

// ============================================================================
// Data (imported from JSON)
// ============================================================================

export const ROLE_MODEL_CATEGORIES: RoleModelCategoryInfo[] = categoriesData as RoleModelCategoryInfo[]

export const ROLE_MODELS: RoleModel[] = roleModelsData as RoleModel[]

// For backwards compatibility
export const ROLE_MODELS_EXAMPLES: RoleModel[] = ROLE_MODELS.filter(rm =>
  rm.id === 'marcus-aurelius' || rm.id === 'david-bowie'
)

// ============================================================================
// Helper Functions
// ============================================================================

export function getRoleModelById(id: string): RoleModel | undefined {
  return ROLE_MODELS.find(rm => rm.id === id)
}

export function getRoleModelsByCategory(category: RoleModelCategory): RoleModel[] {
  return ROLE_MODELS.filter(rm => rm.category === category)
}

export function getCategoryInfo(category: RoleModelCategory): RoleModelCategoryInfo | undefined {
  return ROLE_MODEL_CATEGORIES.find(c => c.id === category)
}

/**
 * Get all unique values from selected role models.
 * Used for value inference - maps role model selections to inferred values.
 */
export function getValuesFromRoleModels(roleModelIds: string[]): string[] {
  const values = new Set<string>()
  for (const id of roleModelIds) {
    const roleModel = getRoleModelById(id)
    if (roleModel) {
      for (const value of roleModel.values) {
        values.add(value)
      }
    }
  }
  return Array.from(values)
}
