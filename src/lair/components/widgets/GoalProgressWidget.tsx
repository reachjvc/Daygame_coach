"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, RotateCcw, CircleDot, Flame, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WidgetProps } from "../../types"
import type { GoalWithProgress, GoalPeriod } from "@/src/db/goalTypes"
import { getCategoryConfig } from "../../data/goalCategories"
import { GoalFormModal } from "../GoalFormModal"

/**
 * Calculate days remaining in the current period
 */
function getDaysRemainingInPeriod(period: GoalPeriod, periodStartDate: string): number {
  const start = new Date(periodStartDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  let periodEnd: Date
  switch (period) {
    case "daily":
      periodEnd = new Date(start)
      periodEnd.setDate(periodEnd.getDate() + 1)
      break
    case "weekly":
      periodEnd = new Date(start)
      periodEnd.setDate(periodEnd.getDate() + 7)
      break
    case "monthly":
      periodEnd = new Date(start)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
      break
    default:
      return 7 // fallback
  }

  const diff = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

/**
 * Get milestone badge for streak
 */
function getStreakBadge(streak: number): { label: string; emoji: string } | null {
  if (streak >= 60) return { label: "Legendary", emoji: "👑" }
  if (streak >= 30) return { label: "Master", emoji: "🏆" }
  if (streak >= 21) return { label: "Habit", emoji: "⭐" }
  if (streak >= 7) return { label: "Week", emoji: "🔥" }
  return null
}

/**
 * Get progress bar color based on completion status and pace
 */
function getProgressColor(
  goal: GoalWithProgress,
  categoryProgressColor: string
): string {
  if (goal.is_complete) return "bg-green-500"

  const daysRemaining = goal.days_remaining ?? getDaysRemainingInPeriod(goal.period, goal.period_start_date)
  const progress = goal.progress_percentage

  // Calculate expected progress based on time elapsed
  let totalDays: number
  switch (goal.period) {
    case "daily": totalDays = 1; break
    case "weekly": totalDays = 7; break
    case "monthly": totalDays = 30; break
    default: totalDays = 7
  }

  const daysElapsed = totalDays - daysRemaining
  const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0

  // Red: significantly behind with little time left
  if (progress < 25 && daysRemaining <= 1 && goal.period !== "daily") {
    return "bg-red-500"
  }

  // Yellow: behind expected pace
  if (progress < expectedProgress - 20) {
    return "bg-yellow-500"
  }

  return categoryProgressColor
}

export function GoalProgressWidget({ collapsed }: WidgetProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set())

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.ok) {
        const data = await res.json()
        // Show only active goals, limit to 4
        setGoals(data.filter((g: GoalWithProgress) => g.is_active).slice(0, 4))
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

  const handleIncrement = async (goalId: string) => {
    try {
      // Find current goal to check if it was incomplete before
      const currentGoal = goals.find((g) => g.id === goalId)
      const wasIncomplete = currentGoal && !currentGoal.is_complete

      const res = await fetch(`/api/goals/${goalId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1 }),
      })
      if (res.ok) {
        const updated = await res.json()

        // Check if goal just completed
        if (wasIncomplete && updated.is_complete) {
          setJustCompletedIds((prev) => new Set(prev).add(goalId))
          // Clear animation after delay
          setTimeout(() => {
            setJustCompletedIds((prev) => {
              const next = new Set(prev)
              next.delete(goalId)
              return next
            })
          }, 1500)
        }

        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? updated : g))
        )
      }
    } catch (error) {
      console.error("Failed to increment goal:", error)
    }
  }

  const handleReset = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/reset`, {
        method: "POST",
      })
      if (res.ok) {
        const updated = await res.json()
        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? updated : g))
        )
      }
    } catch (error) {
      console.error("Failed to reset goal:", error)
    }
  }

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex justify-between mb-1">
              <div className="bg-muted rounded h-4 w-32" />
              <div className="bg-muted rounded h-4 w-12" />
            </div>
            <div className="bg-muted rounded h-2 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <>
        <div className="text-center py-4">
          <CircleDot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            No goals yet. Set your first goal!
          </p>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="size-4 mr-1" />
            Add Goal
          </Button>
        </div>
        <GoalFormModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSuccess={fetchGoals}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {goals.map((goal) => {
          const config = getCategoryConfig(goal.category)
          const Icon = config.icon
          const justCompleted = justCompletedIds.has(goal.id)

          return (
            <div
              key={goal.id}
              className={`space-y-1.5 transition-all duration-300 ${
                justCompleted ? "scale-105 bg-green-500/10 rounded-lg p-1 -m-1" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1 rounded ${justCompleted ? "bg-green-500/20" : config.bgColor} relative`}>
                    {justCompleted ? (
                      <>
                        <Check className="h-3 w-3 text-green-500 animate-bounce" />
                        <Sparkles className="h-2 w-2 text-yellow-500 absolute -top-1 -right-1 animate-ping" />
                      </>
                    ) : (
                      <Icon className={`h-3 w-3 ${config.color}`} />
                    )}
                  </div>
                  <span className={`text-sm font-medium truncate ${justCompleted ? "text-green-500" : ""}`}>
                    {justCompleted ? "Complete!" : goal.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {goal.current_streak > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-orange-500" title={getStreakBadge(goal.current_streak)?.label || `${goal.current_streak} streak`}>
                      <Flame className="h-3 w-3" />
                      {goal.current_streak}
                      {getStreakBadge(goal.current_streak) && (
                        <span className="text-[10px]">{getStreakBadge(goal.current_streak)!.emoji}</span>
                      )}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {goal.current_value}/{goal.target_value}
                  </span>
                  {goal.is_complete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleReset(goal.id)}
                      title="Reset for new period"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleIncrement(goal.id)}
                      title="Add 1"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getProgressColor(goal, config.progressColor)}`}
                  style={{ width: `${goal.progress_percentage}%` }}
                />
              </div>
            </div>
          )
        })}

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="size-4 mr-1" />
          Add Goal
        </Button>
      </div>

      <GoalFormModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={fetchGoals}
      />
    </>
  )
}
