"use client"

import { useEffect, useState, useCallback } from "react"
import { Flame } from "lucide-react"
import type { WidgetProps } from "../../types"
import type { GoalWithProgress } from "@/src/db/goalTypes"
import { getCategoryConfig } from "../../data/goalCategories"

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
      {goals.map((goal, index) => {
        const config = getCategoryConfig(goal.category)
        const Icon = config.icon

        return (
          <div
            key={goal.id}
            className="flex items-center gap-2 p-1.5 rounded-lg"
          >
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full ${
                index === 0
                  ? "bg-orange-500/20 text-orange-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Flame className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${config.color}`} />
                <span className="text-sm font-medium truncate">{goal.title}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold text-sm">{goal.current_streak}</div>
              <div className="text-[10px] text-muted-foreground">
                {goal.period === "daily" ? "days" : goal.period === "weekly" ? "weeks" : "periods"}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
