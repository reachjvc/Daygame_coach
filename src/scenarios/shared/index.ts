/**
 * Shared Sub-Module - Public API
 *
 * Common utilities, constants, and prompts used across scenario sub-modules.
 */

// Difficulty
export {
  DIFFICULTY_LEVELS,
  generateWomanDescription,
  getDifficultyForLevel,
  getDifficultyPromptModifier,
  type DifficultyLevel,
  type DifficultyConfig,
} from "./difficulty"

// Archetypes
export {
  ARCHETYPES,
  getRandomArchetype,
  type Archetype,
} from "./archetypes"

// AI Prompts
export {
  getPracticeOpenersPrompt,
  getPracticeCareerResponsePrompt,
  getPracticePushPullPrompt,
  getPracticeShittestsPrompt,
} from "./prompts"
