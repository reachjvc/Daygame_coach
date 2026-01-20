/**
 * DIFFICULTY SYSTEM
 *
 * ⚠️ YOU CAN CUSTOMIZE:
 * 1. Woman descriptions for each difficulty level
 * 2. How friendly/receptive she is at each level
 * 3. Outfit descriptions that are easier/harder to comment on
 * 4. Her vibe and body language
 */

import { Archetype } from "./archetypes";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert" | "master";

export interface DifficultyConfig {
  level: DifficultyLevel;
  name: string;
  description: string;
  receptiveness: number; // 1-10, how likely she is to be receptive
  womanDescription: {
    outfitStyle: string; // Easy to comment on at low levels
    vibe: string; // Her energy/body language
    context: string; // What she's doing (walking, on phone, etc.)
  };
}

/**
 * ⚠️ CUSTOMIZE THESE DESCRIPTIONS
 *
 * Make outfit descriptions more detailed and easier to comment on at lower levels.
 * At higher levels, make her less approachable (on phone, headphones, rushing, etc.)
 */
export const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultyConfig> = {
  beginner: {
    level: "beginner",
    name: "Beginner",
    description: "Warm, open women in ideal situations",
    receptiveness: 8,
    womanDescription: {
      outfitStyle: "wearing a colorful vintage jacket with unique pins, black jeans, and white sneakers",
      vibe: "relaxed, walking at a casual pace, occasionally glancing at shop windows",
      context: "walking through a quiet park path with her coffee in hand",
    },
  },

  intermediate: {
    level: "intermediate",
    name: "Intermediate",
    description: "Neutral women in normal situations",
    receptiveness: 6,
    womanDescription: {
      outfitStyle: "in a sleek black coat, dark jeans, and ankle boots",
      vibe: "purposeful but not rushed, neutral expression",
      context: "walking down the main street, occasionally checking her watch",
    },
  },

  advanced: {
    level: "advanced",
    name: "Advanced",
    description: "Busy women with clear time constraints",
    receptiveness: 4,
    womanDescription: {
      outfitStyle: "in business casual attire - blazer, white shirt, and dress pants",
      vibe: "focused, walking briskly, checking her phone periodically",
      context: "power-walking down the street, clearly on her way somewhere",
    },
  },

  expert: {
    level: "expert",
    name: "Expert",
    description: "Skeptical women in challenging situations",
    receptiveness: 3,
    womanDescription: {
      outfitStyle: "in a minimalist all-black outfit with designer sunglasses",
      vibe: "closed-off body language, headphones on, focused on her phone",
      context: "walking quickly through a busy street, avoiding eye contact",
    },
  },

  master: {
    level: "master",
    name: "Master",
    description: "Cold, unreceptive women in difficult scenarios",
    receptiveness: 2,
    womanDescription: {
      outfitStyle: "in gym clothes with a hoodie, headphones clearly visible",
      vibe: "intense resting face, walking fast, clearly not interested in being approached",
      context: "rushing through the street with headphones on, eyes down at her phone",
    },
  },
};

/**
 * Generate woman description based on archetype and difficulty
 *
 * ⚠️ YOU CAN EXPAND THIS to create more variety
 */
export function generateWomanDescription(
  archetype: Archetype,
  difficulty: DifficultyLevel
): string {
  const config = DIFFICULTY_LEVELS[difficulty];
  const { outfitStyle, vibe, context } = config.womanDescription;

  return `*You spot a woman ahead of you.*

**Her archetype:** ${archetype.name}
**Difficulty:** ${config.name}

She's ${outfitStyle}. Her vibe is ${vibe}. She's ${context}.

What do you say to approach her?`;
}

/**
 * Get user's difficulty level based on XP/level
 *
 * ⚠️ TODO: Connect this to actual user level from database
 */
export function getDifficultyForLevel(userLevel: number): DifficultyLevel {
  if (userLevel < 5) return "beginner";
  if (userLevel < 10) return "intermediate";
  if (userLevel < 15) return "advanced";
  if (userLevel < 20) return "expert";
  return "master";
}

/**
 * Adjust AI system prompt based on difficulty
 * Higher difficulty = more skeptical, more shittests
 */
export function getDifficultyPromptModifier(difficulty: DifficultyLevel): string {
  const config = DIFFICULTY_LEVELS[difficulty];

  return `
DIFFICULTY LEVEL: ${config.name}
Your receptiveness level is ${config.receptiveness}/10.

${
  config.receptiveness >= 7
    ? "You're in a good mood and open to conversation. If his opener is decent, be warm."
    : config.receptiveness >= 5
    ? "You're neutral. He needs to earn your attention. Be polite but not encouraging unless he's good."
    : config.receptiveness >= 3
    ? "You're busy and skeptical. He needs to be really good to break through. Give him shittests."
    : "You're not in the mood. You're busy, have headphones on, and aren't interested unless he's EXCEPTIONAL."
}`;
}
