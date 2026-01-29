/**
 * Shit-Test Response Evaluator
 *
 * Evaluates user responses to shit-test scenarios.
 * Checks for playfulness, defensiveness, and frame control.
 */

import { clampScore, type EvaluationResult } from "@/src/scenarios/types"

// ─────────────────────────────────────────────────────────────────────────────
// Shit-Test Response Evaluator
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateShittestResponse(userMessage: string): EvaluationResult {
  const normalized = userMessage.trim();
  const lowerMessage = normalized.toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  const exitSignals = ["no worries", "take care", "have a good", "sorry", "my bad", "all good", "bye"];
  const defensiveSignals = ["what's your problem", "relax", "chill", "whatever", "why would", "you're rude"];
  const playfulSignals = ["haha", "lol", "fair", "just teasing", "just messing", "smile", "laugh"];
  const hasQuestion = normalized.includes("?");

  const exited = exitSignals.some((phrase) => lowerMessage.includes(phrase));
  const defensive = defensiveSignals.some((phrase) => lowerMessage.includes(phrase));
  const playful = playfulSignals.some((phrase) => lowerMessage.includes(phrase));

  let score = 6;
  if (playful) score += 2;
  if (hasQuestion) score += 1;
  if (defensive) score -= 3;
  if (exited) score -= 1;
  if (wordCount > 35) score -= 1;
  score = clampScore(score);

  let feedback = "";
  if (defensive) {
    feedback = "You got defensive. Stay light and playful instead of explaining.";
  } else if (exited) {
    feedback = "Polite exit, but you can often stay playful and reframe.";
  } else if (playful) {
    feedback = "Good playfulness. Keep it light and keep the frame.";
  } else {
    feedback = "Stay relaxed and add a playful reframe to pass the test.";
  }

  const strengths: string[] = [];
  if (playful) strengths.push("You kept it playful.");
  if (!defensive) strengths.push("You avoided over-explaining.");
  if (hasQuestion) strengths.push("You kept the interaction moving.");
  if (strengths.length === 0) strengths.push("You responded calmly.");

  const improvements: string[] = [];
  if (defensive) improvements.push("Drop the defensiveness and tease it off.");
  if (!playful) improvements.push("Add a light joke or tease to disarm the test.");
  if (!hasQuestion) improvements.push("End with a simple question or redirect.");
  if (improvements.length === 0) improvements.push("Hold the frame and keep it light.");

  const suggestedNextLine = "Fair enough. I had to see if you were as serious as you look. What are you up to?";

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
