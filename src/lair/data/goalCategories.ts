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

export interface GoalCategoryConfig {
  id: string
  name: string
  icon: LucideIcon
  color: string // Tailwind text color class
  bgColor: string // Tailwind background color class
  borderColor: string // Tailwind border color class
  progressColor: string // Tailwind color for progress bar
  suggestions: string[]
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
      "Go to gym 4x per week",
      "Do 100 pushups daily",
      "Hit 10,000 steps daily",
      "Complete 3 strength sessions",
      "Stretch for 15 mins daily",
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
      "Eat 150g protein daily",
      "No alcohol 5 days/week",
      "Meal prep on Sunday",
      "Drink 3L water daily",
      "No sugar after 6pm",
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
      "Run 5km 3x per week",
      "20 mins cardio daily",
      "10,000 steps on off days",
      "Cycle to work",
      "Swimming 2x per week",
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
      "10 approaches per week",
      "3 sessions per week",
      "Get 2 numbers weekly",
      "1 instadate monthly",
      "Record 5 voice notes",
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
      "Deep work 4 hours daily",
      "No social media before noon",
      "Read 30 mins daily",
      "Write 500 words daily",
      "Complete 3 high-value tasks",
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
  suggestions: [],
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
