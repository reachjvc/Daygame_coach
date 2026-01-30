/**
 * Openers Sub-Module - Public API
 *
 * Scenario generation and evaluation for the openers practice mode.
 */

// Types
export * from "./types"

// Generator
export {
  generateScenarioV2,
  getAvailableActivities,
  DIFFICULTY_LEVELS,
  ARCHETYPE_ENVIRONMENT_WEIGHTS,
  VISIBLE_ITEM_TEMPLATES,
  REGION_IDS,
  DEFAULT_REGIONAL_ITEM_PROBABILITY,
  DEFAULT_COUNTRY_ITEM_PROBABILITY,
  DEFAULT_FOREIGN_ITEM_PROBABILITY,
  type GeneratedScenarioV2,
  type GeneratorOptionsV2,
  type EnvironmentCode,
  type EnvironmentWeights,
  type VisibleItemType,
  type RegionId,
  type CountryId,
} from "./generator"

// Evaluator
export { evaluateOpener } from "./evaluator"

// Data (re-export from data/index.ts)
export * from "./data"
