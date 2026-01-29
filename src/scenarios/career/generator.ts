/**
 * Career Scenario Generator
 *
 * Generates career revelation scenarios where the woman reveals her job
 * and the user practices push/pull responses.
 */

import type { Archetype } from "../shared/archetypes";
import { DIFFICULTY_LEVELS, type DifficultyLevel } from "../shared/difficulty";
import { ENHANCED_OUTFITS } from "../openers/data/outfits";
import {
  type CareerOption,
  getCareerOptions,
  OUTFIT_CATEGORIES_BY_ARCHETYPE,
} from "./data/careers";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CareerScenarioContext {
  jobTitle: string;
  jobLine: string;
  outfitDescription: string;
  vibeDescription: string;
  responseIdeas: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i);
  }
  return hash;
}

function pickDeterministic<T>(items: T[], seed: string): T {
  if (items.length === 0) {
    throw new Error("No items available to select from.");
  }
  const index = Math.abs(hashSeed(seed)) % items.length;
  return items[index];
}

function getOutfitTier(difficulty: DifficultyLevel): "tier1" | "tier2" | "tier3" {
  if (difficulty === "beginner") return "tier1";
  if (difficulty === "intermediate" || difficulty === "advanced") return "tier2";
  return "tier3";
}

function pickOutfitDescription(
  archetype: Archetype,
  difficulty: DifficultyLevel,
  seed: string
): string {
  const categories = OUTFIT_CATEGORIES_BY_ARCHETYPE[archetype.id];
  const outfitPool = categories
    ? ENHANCED_OUTFITS.filter((outfit) => categories.includes(outfit.category))
    : ENHANCED_OUTFITS;
  const selectedOutfit = pickDeterministic(outfitPool.length ? outfitPool : ENHANCED_OUTFITS, seed);
  const tier = getOutfitTier(difficulty);
  const description = pickDeterministic(selectedOutfit[tier], `${seed}-${selectedOutfit.id}-${tier}`);
  return description;
}

function buildResponseIdeas(job: CareerOption): string[] {
  return [
    `Push/pull: "${job.tease} ${job.pull}"`,
    'Curious: "What got you into it in the first place?"',
    'Playful: "Be honest, do you ever switch off?"',
    'Relate: "That sounds intense. I am more of a work-to-live type."',
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator Functions
// ─────────────────────────────────────────────────────────────────────────────

export function generateCareerScenario(
  archetype: Archetype,
  difficulty: DifficultyLevel,
  seed: string
): CareerScenarioContext {
  const job = pickDeterministic(getCareerOptions(archetype), `${seed}-job`);
  const outfitDescription = pickOutfitDescription(archetype, difficulty, `${seed}-outfit`);
  const vibeDescription = DIFFICULTY_LEVELS[difficulty].womanDescription.vibe;
  const responseIdeas = buildResponseIdeas(job);

  return {
    jobTitle: job.title,
    jobLine: job.line,
    outfitDescription,
    vibeDescription,
    responseIdeas,
  };
}

export function generateCareerScenarioIntro(context: CareerScenarioContext): string {
  const responseIdeas = context.responseIdeas.map((idea) => `- ${idea}`).join("\n");

  return `*You're already mid-conversation with her.*

She says: "${context.jobLine}"

Her outfit: ${context.outfitDescription} Her vibe is ${context.vibeDescription}.

Your turn to respond. Try a push/pull on her job (tease or light challenge, then show genuine interest).

Response ideas:
${responseIdeas}`;
}
