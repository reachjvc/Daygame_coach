/**
 * Quest-themed data layer for Variant B.
 * Maps real goal graph data into RPG quest terminology.
 */

import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import {
  GOAL_TEMPLATES,
  getCatalogTiers,
  getChildren,
  getAchievementWeights,
} from "@/src/goals/data/goalGraph"
import type { GoalTemplate, GoalDisplayCategory, LifeAreaConfig } from "@/src/goals/types"

// ============================================================================
// Types
// ============================================================================

export interface Realm {
  id: string
  name: string
  tagline: string
  hex: string
  icon: LifeAreaConfig["icon"]
  tier: "main" | "side"
  questCount: number
  config: LifeAreaConfig
}

export interface Quest {
  id: string
  title: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced" | "legendary"
  xpReward: number
  template: GoalTemplate
  objectives: QuestObjective[]
  realm: string
  pathType?: "find_the_one" | "abundance"
}

export interface QuestObjective {
  id: string
  title: string
  category: GoalDisplayCategory | null
  template: GoalTemplate
  weight: number
  isMilestone: boolean
  targetValue: number
  unit: string
}

// ============================================================================
// Realm Builder
// ============================================================================

export function getRealms(): Realm[] {
  return LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
    const questCount =
      area.id === "daygame"
        ? GOAL_TEMPLATES.filter((t) => t.level === 1).length
        : area.suggestions.length

    return {
      id: area.id,
      name: realmName(area.id),
      tagline: realmTagline(area.id),
      hex: area.hex,
      icon: area.icon,
      tier: area.id === "daygame" ? "main" : "side",
      questCount,
      config: area,
    }
  })
}

function realmName(id: string): string {
  const names: Record<string, string> = {
    daygame: "The Arena",
    health_fitness: "Iron Temple",
    career_business: "The Forge",
    social: "The Circle",
    personal_growth: "Inner Sanctum",
    lifestyle: "The Frontier",
  }
  return names[id] ?? id
}

function realmTagline(id: string): string {
  const tags: Record<string, string> = {
    daygame: "Master the art of cold approach and dating",
    health_fitness: "Forge your body into a weapon",
    career_business: "Build wealth and professional power",
    social: "Expand your tribe and influence",
    personal_growth: "Level up your mind and spirit",
    lifestyle: "Design your ideal life",
  }
  return tags[id] ?? ""
}

// ============================================================================
// Quest Builder (Daygame-specific)
// ============================================================================

const DIFFICULTY_MAP: Record<string, Quest["difficulty"]> = {
  l1_girlfriend: "intermediate",
  l1_dream_girl: "advanced",
  l1_engaged: "legendary",
  l1_relationship: "advanced",
  l1_the_one: "legendary",
  l1_family: "legendary",
  l1_rotation: "intermediate",
  l1_abundant: "advanced",
  l1_sleep_x: "advanced",
  l1_attractive_women: "legendary",
  l1_casual: "intermediate",
  l1_variety: "advanced",
}

const XP_MAP: Record<Quest["difficulty"], number> = {
  beginner: 100,
  intermediate: 250,
  advanced: 500,
  legendary: 1000,
}

const QUEST_DESCRIPTIONS: Record<string, string> = {
  l1_girlfriend: "Find a quality woman through cold approach and build a real connection.",
  l1_dream_girl: "Push your standards to the max. Only the best will do.",
  l1_engaged: "Take your relationship to the ultimate commitment level.",
  l1_relationship: "Build deep emotional and physical intimacy with your partner.",
  l1_the_one: "The endgame. Find and marry the love of your life.",
  l1_family: "Create the family you always wanted.",
  l1_rotation: "Build a roster of women you see regularly.",
  l1_abundant: "Never go a week without options. Always have dates lined up.",
  l1_sleep_x: "Hit your target body count through consistent game.",
  l1_attractive_women: "Level up to consistently date 8s, 9s, and 10s.",
  l1_casual: "Freedom to choose. No commitment, just options.",
  l1_variety: "Experience different types of women before settling down.",
}

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const UNIT_MAP: Record<string, string> = {
  l3_approach_volume: "approaches",
  l3_approach_frequency: "/week",
  l3_session_frequency: "/week",
  l3_consecutive_days: "days",
  l3_hours_in_field: "hours",
  l3_voice_notes: "/week",
  l3_approach_quality: "/week",
  l3_open_in_3_seconds: "/week",
  l3_solo_sessions: "/week",
  l3_phone_numbers: "numbers",
  l3_instadates: "dates",
  l3_dates: "dates",
  l3_second_dates: "dates",
  l3_kiss_closes: "closes",
  l3_lays: "lays",
  l3_rotation_size: "women",
  l3_sustained_rotation: "/week",
  l3_texting_initiated: "/week",
  l3_number_to_date_conversion: "conversions",
  l3_response_rate: "replies",
  l3_dates_planned: "/week",
  l3_date_to_second_date: "dates",
  l3_creative_dates: "dates",
  l3_physical_escalation: "dates",
  l3_women_dating: "women",
}

export function getDaygameQuests(): Quest[] {
  const tiers = getCatalogTiers()
  const allL1 = [...tiers.tier1.onePerson, ...tiers.tier1.abundance]

  return allL1.map((l1) => {
    const pathType = tiers.tier1.onePerson.includes(l1) ? "find_the_one" : "abundance"
    const l2Children = getChildren(l1.id).filter((c) => c.level === 2)

    // Collect all unique L3 objectives across all L2 achievements
    const seenL3 = new Set<string>()
    const objectives: QuestObjective[] = []

    for (const l2 of l2Children) {
      const weights = getAchievementWeights(l2.id)
      const l3Children = getChildren(l2.id).filter((c) => c.level === 3)

      for (const l3 of l3Children) {
        if (seenL3.has(l3.id)) continue
        seenL3.add(l3.id)

        const w = weights.find((w) => w.goalId === l3.id)
        objectives.push({
          id: l3.id,
          title: l3.title,
          category: l3.displayCategory,
          template: l3,
          weight: w?.weight ?? 0,
          isMilestone: l3.templateType === "milestone_ladder",
          targetValue: l3.defaultMilestoneConfig?.target ?? l3.defaultRampSteps?.[0]?.frequencyPerWeek ?? 1,
          unit: UNIT_MAP[l3.id] ?? "",
        })
      }
    }

    // Sort by weight descending (most important first)
    objectives.sort((a, b) => b.weight - a.weight)

    const difficulty = DIFFICULTY_MAP[l1.id] ?? "intermediate"

    return {
      id: l1.id,
      title: l1.title,
      description: QUEST_DESCRIPTIONS[l1.id] ?? "",
      difficulty,
      xpReward: XP_MAP[difficulty],
      template: l1,
      objectives,
      realm: "daygame",
      pathType: pathType as "find_the_one" | "abundance",
    }
  })
}

export function getAchievementQuests(): Quest[] {
  const tiers = getCatalogTiers()

  return tiers.tier2.map((l2) => {
    const l3Children = getChildren(l2.id).filter((c) => c.level === 3)
    const weights = getAchievementWeights(l2.id)

    const objectives: QuestObjective[] = l3Children.map((l3) => {
      const w = weights.find((w) => w.goalId === l3.id)
      return {
        id: l3.id,
        title: l3.title,
        category: l3.displayCategory,
        template: l3,
        weight: w?.weight ?? 0,
        isMilestone: l3.templateType === "milestone_ladder",
        targetValue: l3.defaultMilestoneConfig?.target ?? l3.defaultRampSteps?.[0]?.frequencyPerWeek ?? 1,
        unit: UNIT_MAP[l3.id] ?? "",
      }
    })

    objectives.sort((a, b) => b.weight - a.weight)

    return {
      id: l2.id,
      title: l2.title,
      description: `Master this skill tree to earn the ${l2.title} achievement.`,
      difficulty: l3Children.length > 10 ? "advanced" : "intermediate",
      xpReward: l3Children.length > 10 ? 500 : 250,
      template: l2,
      objectives,
      realm: "daygame",
    }
  })
}

export function getCategoryLabel(cat: GoalDisplayCategory): string {
  return CATEGORY_LABELS[cat] ?? cat
}
