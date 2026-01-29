/**
 * Shit-Test Scenario Generator
 *
 * Generates shit-test scenarios where the woman challenges the user
 * and the user practices playful, non-reactive responses.
 */

import type { Archetype } from "../shared/archetypes";
import { DIFFICULTY_LEVELS, type DifficultyLevel } from "../shared/difficulty";
import { getRandomShittest } from "./data/shit-tests";

// ─────────────────────────────────────────────────────────────────────────────
// Generator Functions
// ─────────────────────────────────────────────────────────────────────────────

export function generateShittestScenarioIntro(
  archetype: Archetype,
  difficulty: DifficultyLevel,
  location: string
): string {
  const config = DIFFICULTY_LEVELS[difficulty];
  const shittest = getRandomShittest(difficulty, archetype.commonShittests);
  const locationPhrase = location === "street" ? "on the street" : `at the ${location}`;

  return `*You're mid-approach ${locationPhrase}.*

**Her archetype:** ${archetype.name}
**Difficulty:** ${config.name}

She's ${config.womanDescription.outfitStyle}. Her vibe is ${config.womanDescription.vibe}. She's ${config.womanDescription.context}.

She looks at you and says: "${shittest}"

How do you respond?`;
}
