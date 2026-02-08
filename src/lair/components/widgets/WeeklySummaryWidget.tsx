"use client"

import { useEffect, useState, useCallback } from "react"
import { TrendingUp, Target, Flame, Trophy, Calendar } from "lucide-react"
import type { WidgetProps } from "../../types"
import type { GoalWithProgress } from "@/src/db/goalTypes"
import { getCategoryConfig } from "../../data/goalCategories"

interface WeeklySummary {
  totalGoals: number
  completedThisWeek: number
  completionRate: number
  totalStreakDays: number
  bestStreak: { goal: GoalWithProgress; streak: number } | null
  topPerformer: { goal: GoalWithProgress; rate: number } | null
}

function calculateWeeklySummary(goals: GoalWithProgress[]): WeeklySummary {
  const weeklyGoals = goals.filter((g) => g.period === "weekly" && g.is_active)
  const completedThisWeek = weeklyGoals.filter((g) => g.is_complete).length
  const completionRate = weeklyGoals.length > 0 ? Math.round((completedThisWeek / weeklyGoals.length) * 100) : 0

  const totalStreakDays = goals.reduce((sum, g) => sum + g.current_streak, 0)

  let bestStreak: { goal: GoalWithProgress; streak: number } | null = null
  let topPerformer: { goal: GoalWithProgress; rate: number } | null = null

  for (const goal of goals) {
    if (!bestStreak || goal.current_streak > bestStreak.streak) {
      bestStreak = { goal, streak: goal.current_streak }
    }
    if (!topPerformer || goal.progress_percentage > topPerformer.rate) {
      topPerformer = { goal, rate: goal.progress_percentage }
    }
  }

  return {
    totalGoals: goals.filter((g) => g.is_active).length,
    completedThisWeek,
    completionRate,
    totalStreakDays,
    bestStreak: bestStreak && bestStreak.streak > 0 ? bestStreak : null,
    topPerformer: topPerformer && topPerformer.rate > 0 ? topPerformer : null,
  }
}

export function WeeklySummaryWidget({ collapsed }: WidgetProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.ok) {
        const data = await res.json()
        setGoals(data.filter((g: GoalWithProgress) => g.is_active))
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
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-16" />
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-4">
        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Add goals to see your weekly summary
        </p>
      </div>
    )
  }

  const summary = calculateWeeklySummary(goals)

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Completion Rate */}
      <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-green-500" />
          <span className="text-xs text-muted-foreground">Weekly Goals</span>
        </div>
        <div className="text-2xl font-bold text-green-500">{summary.completionRate}%</div>
        <div className="text-xs text-muted-foreground">
          {summary.completedThisWeek} of {summary.totalGoals} complete
        </div>
      </div>

      {/* Total Streaks */}
      <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-xs text-muted-foreground">Total Streaks</span>
        </div>
        <div className="text-2xl font-bold text-orange-500">{summary.totalStreakDays}</div>
        <div className="text-xs text-muted-foreground">combined periods</div>
      </div>

      {/* Best Streak */}
      {summary.bestStreak && (
        <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">Best Streak</span>
          </div>
          <div className="text-lg font-bold text-yellow-500">
            {summary.bestStreak.streak} {summary.bestStreak.goal.period === "daily" ? "days" : "weeks"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {summary.bestStreak.goal.title}
          </div>
        </div>
      )}

      {/* Top Performer */}
      {summary.topPerformer && (
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Top Progress</span>
          </div>
          <div className="text-lg font-bold text-purple-500">{summary.topPerformer.rate}%</div>
          <div className="text-xs text-muted-foreground truncate">
            {summary.topPerformer.goal.title}
          </div>
        </div>
      )}
    </div>
  )
}
