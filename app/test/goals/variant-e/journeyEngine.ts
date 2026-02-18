/**
 * Journey Engine — maps user answers to recommended goal templates.
 *
 * This is the "brain" of the Journey Architect. Given the user's answers
 * about their identity, situation, and vision, it produces a ranked list
 * of recommended goal templates from the real goal graph.
 */

import { GOAL_TEMPLATES } from "@/src/goals/data/goalGraph"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import type { GoalTemplate } from "@/src/goals/types"
import type { IdentityAnswer, SituationAnswer, VisionAnswer } from "./types"

interface RecommendedGoal {
  template: GoalTemplate
  relevance: number // 0-1
  reason: string
}

/**
 * Given all three answer sets, produce ranked goal recommendations.
 */
export function computeRecommendations(
  identity: IdentityAnswer,
  situation: SituationAnswer,
  vision: VisionAnswer
): RecommendedGoal[] {
  const scores = new Map<string, { score: number; reasons: string[] }>()

  function addScore(templateId: string, amount: number, reason: string) {
    const existing = scores.get(templateId) || { score: 0, reasons: [] }
    existing.score += amount
    existing.reasons.push(reason)
    scores.set(templateId, existing)
  }

  // --- L1 recommendations based on vision ---
  if (vision.successVision === "one-person" || vision.successVision === "both") {
    addScore("l1_girlfriend", 0.8, "You want to find the one")
    addScore("l1_dream_girl", 0.7, "Find your dream girl")
    addScore("l1_relationship", 0.6, "Build a fulfilling relationship")
  }
  if (vision.successVision === "abundance" || vision.successVision === "both") {
    addScore("l1_rotation", 0.8, "Build abundance and options")
    addScore("l1_abundant", 0.7, "Create an abundant dating life")
    addScore("l1_variety", 0.6, "Experience variety")
  }

  // --- L2 recommendations based on situation/challenge ---
  if (situation.challenge === "approach-anxiety") {
    addScore("l2_overcome_aa", 1.0, "Directly tackles your #1 challenge")
    addScore("l2_confident", 0.8, "Builds confidence through exposure")
    addScore("l2_master_cold_approach", 0.5, "Develops cold approach mastery")
  }
  if (situation.challenge === "conversation") {
    addScore("l2_great_talker", 1.0, "Improves your conversation skills")
    addScore("l2_confident", 0.6, "Builds overall confidence")
  }
  if (situation.challenge === "getting-numbers") {
    addScore("l2_master_cold_approach", 0.9, "Improves approach-to-number conversion")
    addScore("l2_master_daygame", 0.7, "Master the full daygame skillset")
  }
  if (situation.challenge === "dates") {
    addScore("l2_master_dating", 1.0, "Focus on date execution")
    addScore("l2_master_seduction", 0.7, "Escalation and seduction skills")
  }
  if (situation.challenge === "escalation") {
    addScore("l2_master_seduction", 1.0, "Master physical escalation")
    addScore("l2_master_dating", 0.6, "Improve your dating game")
  }
  if (situation.challenge === "texting") {
    addScore("l2_master_texting", 1.0, "Improve your text game")
    addScore("l2_great_talker", 0.4, "Better communication overall")
  }
  if (situation.challenge === "consistency") {
    addScore("l2_master_daygame", 0.9, "Building consistent habits")
    addScore("l2_confident", 0.7, "Confidence through consistency")
    addScore("l2_overcome_aa", 0.5, "Breaking through resistance")
  }

  // --- L3 recommendations based on experience level ---
  if (identity.experience === "newcomer" || identity.experience === "beginner") {
    addScore("l3_approach_volume", 0.9, "Start building approach volume")
    addScore("l3_session_frequency", 0.8, "Establish a consistent schedule")
    addScore("l3_consecutive_days", 0.7, "Build momentum with streaks")
    addScore("l3_phone_numbers", 0.5, "Track your first results")
  }
  if (identity.experience === "intermediate") {
    addScore("l3_approach_quality", 0.8, "Focus on quality over quantity")
    addScore("l3_instadates", 0.7, "Level up to instadates")
    addScore("l3_dates", 0.7, "Convert to dates")
    addScore("l3_approach_frequency", 0.6, "Increase approach frequency")
    addScore("l3_voice_notes", 0.5, "Self-review with voice notes")
  }
  if (identity.experience === "advanced") {
    addScore("l3_approach_quality", 0.9, "Refine approach quality")
    addScore("l3_dates", 0.8, "Maximize date conversion")
    addScore("l3_kiss_closes", 0.7, "Track escalation results")
    addScore("l3_lays", 0.7, "Track intimate outcomes")
    addScore("l3_creative_dates", 0.6, "Creative date experiences")
  }

  // --- Frequency modifiers ---
  if (situation.currentFrequency === "never" || situation.currentFrequency === "rarely") {
    addScore("l3_session_frequency", 0.5, "Start going out regularly")
    addScore("l3_solo_sessions", 0.4, "Build independence")
  }
  if (situation.currentFrequency === "multiple-weekly") {
    addScore("l3_hours_in_field", 0.5, "Track your field time")
    addScore("l3_approach_volume", 0.4, "You have the frequency, now volume")
  }

  // --- Timeframe urgency adjustments ---
  if (vision.timeframe === "3-months") {
    // Short timeframe: emphasize actionable, input-focused goals
    for (const [id, entry] of scores) {
      const tmpl = GOAL_TEMPLATES.find(t => t.id === id)
      if (tmpl?.nature === "input") {
        entry.score *= 1.2
      }
    }
  }

  // Build sorted results, filtering to templates that actually exist
  const results: RecommendedGoal[] = []
  for (const [templateId, entry] of scores) {
    const template = GOAL_TEMPLATES.find(t => t.id === templateId)
    if (!template) continue
    results.push({
      template,
      relevance: Math.min(1, entry.score),
      reason: entry.reasons[0], // Use the most impactful reason
    })
  }

  results.sort((a, b) => b.relevance - a.relevance)
  return results
}

/**
 * Get the top L1 recommendation based on vision.
 */
export function getTopL1(vision: VisionAnswer): GoalTemplate | null {
  if (vision.successVision === "one-person") {
    return GOAL_TEMPLATES.find(t => t.id === "l1_girlfriend") || null
  }
  if (vision.successVision === "abundance") {
    return GOAL_TEMPLATES.find(t => t.id === "l1_rotation") || null
  }
  if (vision.successVision === "both") {
    return GOAL_TEMPLATES.find(t => t.id === "l1_abundant") || null
  }
  return null
}

/**
 * Get recommended L2 achievements filtered by relevance threshold.
 */
export function getRecommendedL2s(
  identity: IdentityAnswer,
  situation: SituationAnswer,
  vision: VisionAnswer,
  threshold = 0.5
): RecommendedGoal[] {
  return computeRecommendations(identity, situation, vision)
    .filter(r => r.template.level === 2 && r.relevance >= threshold)
}

/**
 * Get recommended L3 specifics filtered by relevance threshold.
 */
export function getRecommendedL3s(
  identity: IdentityAnswer,
  situation: SituationAnswer,
  vision: VisionAnswer,
  threshold = 0.4
): RecommendedGoal[] {
  return computeRecommendations(identity, situation, vision)
    .filter(r => r.template.level === 3 && r.relevance >= threshold)
}

/**
 * Get life area suggestions for the vision phase.
 */
export function getLifeAreaSuggestions() {
  return LIFE_AREAS
    .filter(a => a.id !== "custom" && a.id !== "daygame")
    .map(a => ({ id: a.id, name: a.name, hex: a.hex, icon: a.icon }))
}
