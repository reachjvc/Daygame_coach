/**
 * Profile Slice - Public API (shared-safe)
 *
 * This entrypoint intentionally exports only shared-safe modules (types/data/helpers)
 * so it can be consumed from both server and client contexts without pulling in
 * server-only code (e.g. Supabase server clients) or UI components.
 */

// Types (shared)
export type {
  UserProfile,
  ProfileUpdates,
  Archetype,
  Region,
} from "./types"

// Data / helpers (shared)
export { getArchetypes, ethnicities } from "./data/archetypes"
export {
  REGIONS,
  getCountryRegion,
  isCountryHandled,
  isArctic,
  isLocked,
} from "./data/regions"
export { EXPERIENCE_LEVELS, EXPERIENCE_LABELS } from "./data/experience-levels"
export type { ExperienceLevelId } from "./data/experience-levels"
export { PRIMARY_GOALS, GOAL_LABELS } from "./data/primary-goals"
export type { PrimaryGoal, PrimaryGoalId } from "./data/primary-goals"

export { normalizeCountryId, getDisplayName, isNoiseId } from "./data/map-audit"
