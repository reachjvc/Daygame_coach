/**
 * Career Response Evaluator
 *
 * Evaluates user responses to career revelation scenarios.
 * Checks for push/pull technique, questions, and warmth.
 */

import { clampScore, type EvaluationResult } from "@/src/scenarios/types"

// ─────────────────────────────────────────────────────────────────────────────
// Career Response Evaluator
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateCareerResponse(
  userMessage: string,
  jobTitle: string
): EvaluationResult {
  const normalized = userMessage.trim();
  const lowerMessage = normalized.toLowerCase();

  const hasTease = /(so you|so you're|so you are|bet you|do you ever|never|always)/.test(lowerMessage);
  const hasPull = /(cool|impressive|respect|like|love|interesting|attractive)/.test(lowerMessage);
  const hasQuestion = /\?/.test(userMessage) || /(what|why|how|got you into)/.test(lowerMessage);

  let score = 6;
  if (hasTease) score += 2;
  if (hasPull) score += 1;
  if (hasQuestion) score += 1;
  if (!hasTease && !hasPull) score -= 1;
  score = clampScore(score);

  let feedback = "";
  if (hasTease && hasPull) {
    feedback = "Good push/pull. Keep teasing but add warmth so it doesn't feel arrogant.";
  } else if (hasTease) {
    feedback = "Nice tease. Add a bit of warmth or curiosity after to keep rapport.";
  } else if (hasPull) {
    feedback = "Good warmth, but add a playful tease to create tension.";
  } else if (hasQuestion) {
    feedback = "Fine, but don't interview. Add a playful frame before the question.";
  } else {
    feedback = "Add a playful tease or a curious hook — don't just acknowledge her job.";
  }

  const strengths: string[] = [];
  if (hasTease) strengths.push("You teased instead of interviewing.");
  if (hasPull) strengths.push("You added warmth/validation.");
  if (hasQuestion) strengths.push("You kept the conversation moving.");
  if (strengths.length === 0) strengths.push("You responded rather than freezing.");

  const improvements: string[] = [];
  if (!hasTease) improvements.push("Add a playful tease (push) to create tension.");
  if (!hasPull) improvements.push("Add a touch of warmth (pull) after the tease.");
  if (!hasQuestion) improvements.push("End with a simple question to keep momentum.");
  if (improvements.length === 0) improvements.push("Tighten the tease and make it more specific.");

  const suggestedNextLine = `So you're a ${jobTitle}... do you ever turn that off, or are you always in work mode?`;

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
