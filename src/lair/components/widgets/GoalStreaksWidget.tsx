"use client"

import { useEffect, useState, useCallback } from "react"
import { Flame, Trophy } from "lucide-react"
import type { WidgetProps } from "../../types"
import type { GoalWithProgress } from "@/src/db/goalTypes"
import { getCategoryConfig } from "../../data/goalCategories"

/**
 * Streak milestones and their labels
 */
const STREAK_MILESTONES = [
  { threshold: 60, label: "Legendary", emoji: "👑", tier: 4 },
  { threshold: 30, label: "Master", emoji: "🏆", tier: 3 },
  { threshold: 21, label: "Habit Formed", emoji: "⭐", tier: 2 },
  { threshold: 7, label: "Week Warrior", emoji: "🔥", tier: 1 },
]

/**
 * Get streak tier based on streak count
 * Returns: tier level (0-4), flame count (1-3), and whether it's a milestone
 */
function getStreakTier(streak: number): {
  tier: number
  flameCount: number
  isMilestone: boolean
  glowColor: string
  badge?: { label: string; emoji: string }
} {
  for (const milestone of STREAK_MILESTONES) {
    if (streak >= milestone.threshold) {
      return {
        tier: milestone.tier,
        flameCount: Math.min(3, milestone.tier),
        isMilestone: streak === milestone.threshold,
        glowColor: milestone.tier >= 3 ? "shadow-orange-500/50" : "shadow-yellow-500/50",
        badge: { label: milestone.label, emoji: milestone.emoji },
      }
    }
  }
  return { tier: 0, flameCount: 1, isMilestone: false, glowColor: "" }
}

/**
 * Get flame color based on tier
 */
function getFlameColor(tier: number): string {
  switch (tier) {
    case 4: return "text-purple-500" // legendary
    case 3: return "text-orange-500" // epic
    case 2: return "text-yellow-500" // rare
    case 1: return "text-orange-400" // uncommon
    default: return "text-orange-300" // common
  }
}

/**
 * Get background style for streak display
 */
function getStreakBgStyle(tier: number, isMilestone: boolean): string {
  const base = tier >= 2 ? "bg-gradient-to-r from-orange-500/20 to-yellow-500/10" : "bg-muted"
  const glow = isMilestone ? "shadow-lg animate-pulse" : ""
  return `${base} ${glow}`
}

export function GoalStreaksWidget({ collapsed }: WidgetProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.ok) {
        const data = await res.json()
        // Sort by streak and take top 3
        const sorted = data
          .filter((g: GoalWithProgress) => g.is_active && g.current_streak > 0)
          .sort(
            (a: GoalWithProgress, b: GoalWithProgress) =>
              b.current_streak - a.current_streak
          )
          .slice(0, 3)
        setGoals(sorted)
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-2">
            <div className="bg-muted rounded h-6 w-6" />
            <div className="bg-muted rounded h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-2">
        <Flame className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Complete goals consistently to build streaks
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {goals.map((goal) => {
        const config = getCategoryConfig(goal.category)
        const Icon = config.icon
        const { tier, flameCount, isMilestone, glowColor, badge } = getStreakTier(goal.current_streak)
        const flameColor = getFlameColor(tier)
        const bgStyle = getStreakBgStyle(tier, isMilestone)

        return (
          <div
            key={goal.id}
            className={`flex items-center gap-2 p-1.5 rounded-lg ${bgStyle} ${isMilestone ? glowColor : ""}`}
          >
            <div
              className={`flex items-center justify-center min-w-7 h-7 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/10`}
            >
              {/* Render multiple flames for higher tiers */}
              <div className="flex -space-x-1">
                {Array.from({ length: flameCount }).map((_, i) => (
                  <Flame
                    key={i}
                    className={`h-4 w-4 ${flameColor} ${i > 0 ? "opacity-70" : ""}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${config.color}`} />
                <span className="text-sm font-medium truncate">{goal.title}</span>
                {/* Milestone badge */}
                {tier >= 2 && (
                  <Trophy className={`h-3 w-3 ${tier >= 3 ? "text-yellow-500" : "text-orange-400"}`} />
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`font-bold text-sm ${flameColor}`}>{goal.current_streak}</div>
              {badge ? (
                <div className="text-[10px] flex items-center gap-0.5 justify-end">
                  <span>{badge.emoji}</span>
                  <span className={flameColor}>{badge.label}</span>
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground">
                  {goal.period === "daily" ? "days" : goal.period === "weekly" ? "weeks" : "periods"}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
