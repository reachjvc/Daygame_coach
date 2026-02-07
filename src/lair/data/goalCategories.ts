/**
 * Goal category definitions with colors, icons, and suggestions
 */

import {
  Dumbbell,
  Utensils,
  Heart,
  MessageCircle,
  Briefcase,
  type LucideIcon,
} from "lucide-react"
import type { GoalPeriod } from "@/src/db/goalTypes"

export interface GoalSuggestion {
  title: string
  defaultTarget: number
  defaultPeriod: GoalPeriod
}

export interface GoalCategoryConfig {
  id: string
  name: string
  icon: LucideIcon
  color: string // Tailwind text color class
  bgColor: string // Tailwind background color class
  borderColor: string // Tailwind border color class
  progressColor: string // Tailwind color for progress bar
  suggestions: GoalSuggestion[]
}

export const GOAL_CATEGORIES: GoalCategoryConfig[] = [
  {
    id: "fitness",
    name: "Fitness",
    icon: Dumbbell,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    progressColor: "bg-blue-500",
    suggestions: [
      { title: "Go to gym 4x per week", defaultTarget: 4, defaultPeriod: "weekly" },
      { title: "Do 100 pushups daily", defaultTarget: 100, defaultPeriod: "daily" },
      { title: "Hit 10,000 steps daily", defaultTarget: 10000, defaultPeriod: "daily" },
      { title: "Complete 3 strength sessions", defaultTarget: 3, defaultPeriod: "weekly" },
      { title: "Stretch for 15 mins daily", defaultTarget: 15, defaultPeriod: "daily" },
    ],
  },
  {
    id: "eating",
    name: "Eating",
    icon: Utensils,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    progressColor: "bg-green-500",
    suggestions: [
      { title: "Eat 150g protein daily", defaultTarget: 150, defaultPeriod: "daily" },
      { title: "No alcohol 5 days/week", defaultTarget: 5, defaultPeriod: "weekly" },
      { title: "Meal prep on Sunday", defaultTarget: 1, defaultPeriod: "weekly" },
      { title: "Drink 3L water daily", defaultTarget: 3, defaultPeriod: "daily" },
      { title: "No sugar after 6pm", defaultTarget: 1, defaultPeriod: "daily" },
    ],
  },
  {
    id: "cardio",
    name: "Cardio",
    icon: Heart,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    progressColor: "bg-red-500",
    suggestions: [
      { title: "Run 5km 3x per week", defaultTarget: 3, defaultPeriod: "weekly" },
      { title: "20 mins cardio daily", defaultTarget: 20, defaultPeriod: "daily" },
      { title: "10,000 steps on off days", defaultTarget: 10000, defaultPeriod: "daily" },
      { title: "Cycle to work", defaultTarget: 5, defaultPeriod: "weekly" },
      { title: "Swimming 2x per week", defaultTarget: 2, defaultPeriod: "weekly" },
    ],
  },
  {
    id: "daygame",
    name: "Daygame",
    icon: MessageCircle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    progressColor: "bg-orange-500",
    suggestions: [
      { title: "10 approaches per week", defaultTarget: 10, defaultPeriod: "weekly" },
      { title: "3 sessions per week", defaultTarget: 3, defaultPeriod: "weekly" },
      { title: "Get 2 numbers weekly", defaultTarget: 2, defaultPeriod: "weekly" },
      { title: "1 instadate monthly", defaultTarget: 1, defaultPeriod: "monthly" },
      { title: "Record 5 voice notes", defaultTarget: 5, defaultPeriod: "weekly" },
    ],
  },
  {
    id: "business",
    name: "Business",
    icon: Briefcase,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    progressColor: "bg-purple-500",
    suggestions: [
      { title: "Deep work 4 hours daily", defaultTarget: 4, defaultPeriod: "daily" },
      { title: "No social media before noon", defaultTarget: 1, defaultPeriod: "daily" },
      { title: "Read 30 mins daily", defaultTarget: 30, defaultPeriod: "daily" },
      { title: "Write 500 words daily", defaultTarget: 500, defaultPeriod: "daily" },
      { title: "Complete 3 high-value tasks", defaultTarget: 3, defaultPeriod: "daily" },
    ],
  },
]

/**
 * Map for O(1) category lookup
 */
export const GOAL_CATEGORY_MAP: Record<string, GoalCategoryConfig> =
  Object.fromEntries(GOAL_CATEGORIES.map((c) => [c.id, c]))

/**
 * Default category config for custom categories
 */
export const DEFAULT_CATEGORY_CONFIG: Omit<GoalCategoryConfig, "id" | "name"> = {
  icon: Briefcase,
  color: "text-gray-400",
  bgColor: "bg-gray-500/10",
  borderColor: "border-gray-500/30",
  progressColor: "bg-gray-400",
  suggestions: [] as GoalSuggestion[],
}

/**
 * Get category config, returning defaults for custom categories
 */
export function getCategoryConfig(categoryId: string): GoalCategoryConfig {
  const config = GOAL_CATEGORY_MAP[categoryId]
  if (config) return config

  // Custom category - return defaults with the custom name
  return {
    id: categoryId,
    name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    ...DEFAULT_CATEGORY_CONFIG,
  }
}
