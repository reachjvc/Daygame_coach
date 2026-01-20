import type { DifficultyLevel } from "../../shared/difficulty";

export const SHITTESTS_BY_DIFFICULTY: Record<DifficultyLevel, string[]> = {
  beginner: [
    "Do I know you?",
    "What's this about?",
    "Are you lost?",
    "Is everything okay?",
    "How old are you?",
    "Are you new around here?",
  ],
  intermediate: [
    "Is this a pickup line?",
    "Do you do this often?",
    "You probably say that to everyone.",
    "Why me?",
    "Are you trying to get my number?",
    "Are you selling something?",
  ],
  advanced: [
    "I'm kind of in a hurry.",
    "You're not my type.",
    "Give me a reason to stop.",
    "You sound rehearsed.",
    "What makes you think I'd say yes?",
    "How many numbers did you get today?",
  ],
  expert: [
    "Ugh, another guy.",
    "I don't give my number to strangers.",
    "You're making me uncomfortable.",
    "Is this some pickup artist thing?",
    "My boyfriend is right over there.",
    "You're wasting my time.",
  ],
  master: [
    "Back off.",
    "Please leave me alone.",
    "This is creepy.",
    "I said no.",
    "Stop following me.",
    "I don't feel safe talking to you.",
  ],
};

export function getRandomShittest(difficulty: DifficultyLevel, extras: string[] = []): string {
  const pool = [...SHITTESTS_BY_DIFFICULTY[difficulty], ...extras].filter(Boolean);
  if (pool.length === 0) {
    return "Do I know you?";
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
