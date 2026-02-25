/**
 * Life area definitions with icons, colors, and goal suggestions
 *
 * 5 areas: daygame, health_fitness, career_business, personal_growth, vices_elimination
 */

import {
  MessageCircle,
  Dumbbell,
  Briefcase,
  Sprout,
  Puzzle,
  Ban,
} from "lucide-react"
import type { LifeAreaConfig } from "../types"

export const LIFE_AREAS: LifeAreaConfig[] = [
  {
    id: "daygame",
    name: "Dating & Daygame",
    icon: MessageCircle,
    hex: "#f97316",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    progressColor: "bg-orange-500",
    sortOrder: 0,
    suggestions: [
      { title: "10 approaches per week", defaultTarget: 10, defaultPeriod: "weekly", linkedMetric: "approaches_weekly", featured: true },
      { title: "3 sessions per week", defaultTarget: 3, defaultPeriod: "weekly", linkedMetric: "sessions_weekly", featured: true },
      { title: "Get 2 numbers weekly", defaultTarget: 2, defaultPeriod: "weekly", linkedMetric: "numbers_weekly" },
      { title: "1 instadate monthly", defaultTarget: 1, defaultPeriod: "monthly", linkedMetric: "instadates_weekly" },
      { title: "Record 5 voice notes", defaultTarget: 5, defaultPeriod: "weekly" },
      { title: "Rate 3 approaches per week", defaultTarget: 3, defaultPeriod: "weekly" },
      { title: "Open in <3 seconds 5x per week", defaultTarget: 5, defaultPeriod: "weekly" },
      { title: "1 solo session per week", defaultTarget: 1, defaultPeriod: "weekly" },
      { title: "Go on 2 dates per month", defaultTarget: 2, defaultPeriod: "monthly" },
      { title: "Initiate 3 texting convos per week", defaultTarget: 3, defaultPeriod: "weekly" },
      { title: "Plan 1 creative date per month", defaultTarget: 1, defaultPeriod: "monthly" },
      { title: "Physically escalate on every date", defaultTarget: 1, defaultPeriod: "weekly" },
    ],
  },
  {
    id: "health_fitness",
    name: "Health & Appearance",
    icon: Dumbbell,
    hex: "#22c55e",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    progressColor: "bg-green-500",
    sortOrder: 1,
    suggestions: [
      { title: "Go to gym 4x per week", defaultTarget: 4, defaultPeriod: "weekly", featured: true },
      { title: "Eat 150g protein daily", defaultTarget: 150, defaultPeriod: "daily" },
      { title: "Hit 10,000 steps daily", defaultTarget: 10000, defaultPeriod: "daily" },
      { title: "Drink 3L water daily", defaultTarget: 3, defaultPeriod: "daily" },
      { title: "Sleep 8 hours nightly", defaultTarget: 8, defaultPeriod: "daily" },
      { title: "Run 5km 3x per week", defaultTarget: 3, defaultPeriod: "weekly" },
      { title: "Skincare routine daily", defaultTarget: 1, defaultPeriod: "daily" },
      { title: "Haircut every 4 weeks", defaultTarget: 1, defaultPeriod: "monthly" },
    ],
  },
  {
    id: "career_business",
    name: "Career & Finances",
    icon: Briefcase,
    hex: "#a855f7",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    progressColor: "bg-purple-500",
    sortOrder: 2,
    suggestions: [
      { title: "Deep work 4 hours daily", defaultTarget: 4, defaultPeriod: "daily", featured: true },
      { title: "Complete 3 high-value tasks daily", defaultTarget: 3, defaultPeriod: "daily" },
      { title: "Side project 5 hours per week", defaultTarget: 5, defaultPeriod: "weekly" },
      { title: "1 networking meeting per month", defaultTarget: 1, defaultPeriod: "monthly" },
      { title: "Save $500 per month", defaultTarget: 500, defaultPeriod: "monthly" },
      { title: "Review budget weekly", defaultTarget: 1, defaultPeriod: "weekly" },
      { title: "Track expenses daily", defaultTarget: 1, defaultPeriod: "daily" },
      { title: "No impulse purchases for 30 days", defaultTarget: 30, defaultPeriod: "monthly" },
    ],
  },
  {
    id: "personal_growth",
    name: "Personal Growth",
    icon: Sprout,
    hex: "#eab308",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    progressColor: "bg-yellow-500",
    sortOrder: 3,
    suggestions: [
      { title: "Meditate 10 mins daily", defaultTarget: 10, defaultPeriod: "daily", featured: true },
      { title: "Journal every morning", defaultTarget: 1, defaultPeriod: "daily" },
      { title: "Read 1 book per month", defaultTarget: 1, defaultPeriod: "monthly" },
      { title: "Practice gratitude daily", defaultTarget: 1, defaultPeriod: "daily" },
      { title: "1 comfort zone challenge per week", defaultTarget: 1, defaultPeriod: "weekly" },
      { title: "Read 20 pages daily", defaultTarget: 20, defaultPeriod: "daily" },
      { title: "1 therapy/coaching session per month", defaultTarget: 1, defaultPeriod: "monthly" },
      { title: "Digital detox 1 hour before bed", defaultTarget: 1, defaultPeriod: "daily" },
      { title: "Practice breathwork 3x weekly", defaultTarget: 3, defaultPeriod: "weekly" },
      { title: "Study 1 hour daily", defaultTarget: 1, defaultPeriod: "daily" },
      { title: "Complete 1 online course per month", defaultTarget: 1, defaultPeriod: "monthly" },
      { title: "Practice new skill 30 mins daily", defaultTarget: 30, defaultPeriod: "daily" },
    ],
  },
  {
    id: "vices_elimination",
    name: "Vices & Elimination",
    icon: Ban,
    hex: "#f43f5e",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    progressColor: "bg-rose-500",
    sortOrder: 4,
    suggestions: [
      { title: "Porn-free every day", defaultTarget: 7, defaultPeriod: "weekly", featured: true },
      { title: "Screen time under limit 6 days/week", defaultTarget: 6, defaultPeriod: "weekly", featured: true },
      { title: "5 alcohol-free days per week", defaultTarget: 5, defaultPeriod: "weekly" },
      { title: "No social media 3 days/week", defaultTarget: 3, defaultPeriod: "weekly" },
      { title: "No junk food 5 days/week", defaultTarget: 5, defaultPeriod: "weekly" },
      { title: "No late-night scrolling 6 days/week", defaultTarget: 6, defaultPeriod: "weekly" },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    icon: Puzzle,
    hex: "#9ca3af",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    progressColor: "bg-gray-400",
    sortOrder: 99,
    suggestions: [],
  },
]

/**
 * Map for O(1) life area lookup
 */
export const LIFE_AREA_MAP: Record<string, LifeAreaConfig> =
  Object.fromEntries(LIFE_AREAS.map((a) => [a.id, a]))

/**
 * Get life area config, returning custom defaults for unknown areas
 */
export function getLifeAreaConfig(id: string): LifeAreaConfig {
  const config = LIFE_AREA_MAP[id]
  if (config) return config

  // Unknown area — return custom defaults with the given id
  const customConfig = LIFE_AREA_MAP["custom"]
  return {
    ...customConfig,
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " "),
  }
}
