"use client"

import { useEffect, useState, useCallback } from "react"
import { Check, Circle, Calendar, RotateCcw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WidgetProps } from "../../types"
import type { GoalWithProgress } from "@/src/db/goalTypes"
import { getCategoryConfig } from "../../data/goalCategories"

export function TodayGoalsWidget({ collapsed }: WidgetProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isResetting, setIsResetting] = useState(false)

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.ok) {
        const data = await res.json()
        // Filter to daily goals only
        const dailyGoals = data.filter(
          (g: GoalWithProgress) => g.is_active && g.period === "daily"
        )
        setGoals(dailyGoals)
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

  const handleResetAll = async () => {
    if (isResetting) return

    setIsResetting(true)
    try {
      const res = await fetch("/api/goals/reset-daily", {
        method: "POST",
      })
      if (res.ok) {
        await fetchGoals()
      }
    } catch (error) {
      console.error("Failed to reset daily goals:", error)
    } finally {
      setIsResetting(false)
    }
  }

  const handleToggle = async (goal: GoalWithProgress) => {
    try {
      if (goal.is_complete) {
        // Reset goal
        const res = await fetch(`/api/goals/${goal.id}/reset`, {
          method: "POST",
        })
        if (res.ok) {
          const updated = await res.json()
          setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)))
        }
      } else {
        // Complete goal (set current_value to target)
        const res = await fetch(`/api/goals/${goal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_value: goal.target_value }),
        })
        if (res.ok) {
          const updated = await res.json()
          setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)))
        }
      }
    } catch (error) {
      console.error("Failed to toggle goal:", error)
    }
  }

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-2">
            <div className="bg-muted rounded-full h-5 w-5" />
            <div className="bg-muted rounded h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-4">
        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No daily goals set. Add a daily goal to track here.
        </p>
      </div>
    )
  }

  const completedCount = goals.filter((g) => g.is_complete).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {completedCount} of {goals.length} complete
        </div>
        {goals.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground"
            onClick={handleResetAll}
            disabled={isResetting}
          >
            {isResetting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset All
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {goals.map((goal) => {
          const config = getCategoryConfig(goal.category)

          return (
            <Button
              key={goal.id}
              variant="ghost"
              className={`w-full justify-start h-auto py-2 px-2 ${
                goal.is_complete ? "opacity-60" : ""
              }`}
              onClick={() => handleToggle(goal)}
            >
              <div className="flex items-center gap-2 w-full">
                {goal.is_complete ? (
                  <div className="p-0.5 rounded-full bg-green-500/20">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ) : (
                  <Circle className={`h-5 w-5 ${config.color}`} />
                )}
                <span
                  className={`text-sm ${
                    goal.is_complete ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {goal.title}
                </span>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
