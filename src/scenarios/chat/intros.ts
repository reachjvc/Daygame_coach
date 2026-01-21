/**
 * Scenario Introduction Generators
 *
 * Generates the introductory text for each chat scenario type.
 */

import type { Archetype } from "@/src/scenarios/shared/archetypes"
import { DIFFICULTY_LEVELS, type DifficultyLevel } from "@/src/scenarios/shared/difficulty"
import { getRandomShittest } from "@/src/scenarios/shittests/data/shit-tests"

// ─────────────────────────────────────────────────────────────────────────────
// Shit-Test Scenario Intro
// ─────────────────────────────────────────────────────────────────────────────

export function generateShittestScenarioIntro(
  archetype: Archetype,
  difficulty: DifficultyLevel,
  location: string
): string {
  const config = DIFFICULTY_LEVELS[difficulty]
  const shittest = getRandomShittest(difficulty, archetype.commonShittests)
  const locationPhrase = location === "street" ? "on the street" : `at the ${location}`

  return `*You're mid-approach ${locationPhrase}.*

**Her archetype:** ${archetype.name}
**Difficulty:** ${config.name}

She's ${config.womanDescription.outfitStyle}. Her vibe is ${config.womanDescription.vibe}. She's ${config.womanDescription.context}.

She looks at you and says: "${shittest}"

How do you respond?`
}
