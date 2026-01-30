/**
 * Chat Response Evaluators
 *
 * Heuristic-based evaluation for multi-turn chat scenarios.
 * Note: Career and shittest evaluators have been moved to their
 * respective sub-modules (career/evaluator.ts, shittests/evaluator.ts).
 */

import { clampScore, type EvaluationResult } from "@/src/scenarios/types"

// Re-export types for backwards compatibility
export type { SmallEvaluation, MilestoneEvaluation, EvaluationResult } from "@/src/scenarios/types"

// ─────────────────────────────────────────────────────────────────────────────
// Opener Response Evaluator (for chat scenarios)
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateOpenerResponse(userMessage: string): EvaluationResult {
  const normalized = userMessage.trim();
  const lowerMessage = normalized.toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  const hasAttentionGetter = /\bexcuse me\b/.test(lowerMessage);
  const hasApologeticFraming =
    /\b(sorry|apologize|apologies)\b/.test(lowerMessage) ||
    /\bsorry to bother\b/.test(lowerMessage) ||
    /\bhope (i'm|i am) not (bothering|interrupting)\b/.test(lowerMessage) ||
    /\bi know you're (probably )?(busy|in a hurry)\b/.test(lowerMessage);
  const hasCompliment = /\b(beautiful|gorgeous|hot|sexy|stunning|cute|pretty)\b/.test(lowerMessage);
  const hasQuestion = normalized.includes("?");
  const isTooShort = wordCount < 4;
  const isTooLong = wordCount > 28;

  let score = 6;
  if (!hasApologeticFraming) score += 1;
  if (!hasCompliment) score += 1;
  if (hasQuestion) score += 1;
  if (isTooShort) score -= 1;
  if (isTooLong) score -= 1;
  if (hasCompliment) score -= 1;
  score = clampScore(score);

  const parts: string[] = [];
  if (hasApologeticFraming) parts.push("Drop the apology and lead calmly.");
  if (hasCompliment) parts.push("Avoid generic compliments; go situational instead.");
  if (!hasQuestion) parts.push("Add a simple question to create a hook.");
  if (parts.length === 0) parts.push("Solid opener. Keep it simple and grounded.");
  const feedback = parts.slice(0, 2).join(" ");

  const strengths: string[] = [];
  if (hasQuestion) strengths.push("You gave her a clear reason to respond.");
  if (!hasCompliment) strengths.push("You avoided appearance-based flattery.");
  if (!isTooLong) strengths.push("You kept it concise.");
  if (hasAttentionGetter) strengths.push("You used a clean attention-getter.");
  if (strengths.length === 0) strengths.push("You took the initiative to open.");

  const improvements: string[] = [];
  if (hasApologeticFraming) improvements.push("Lead without asking permission.");
  if (hasCompliment) improvements.push("Swap the compliment for a situational hook.");
  if (!hasQuestion) improvements.push("End with a question to make replying easy.");
  if (isTooLong) improvements.push("Shorten it to one clean sentence.");
  if (improvements.length === 0) improvements.push("Add a sharper hook to spark curiosity.");

  const suggestedNextLine =
    "Hey, quick question — you look like you know this area. What's the best coffee spot nearby?";

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
      suggestedNextLine,
    },
  };
}
