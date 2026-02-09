"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Target, CheckCircle2, Circle, Flame } from "lucide-react"
import { getCategoryConfig } from "@/src/lair/data/goalCategories"
import type { GoalWithProgress } from "@/src/db/goalTypes"

interface GoalsSummarySectionProps {
  compact?: boolean
}

export function GoalsSummarySection({ compact = false }: GoalsSummarySectionProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await fetch("/api/goals")
        if (res.ok) {
          const data = await res.json()
          // Filter to active, non-archived goals
          const activeGoals = (data.goals || []).filter(
            (g: GoalWithProgress) => g.is_active && !g.is_archived
          )
          setGoals(activeGoals)
        }
      } catch (err) {
        console.error("Failed to fetch goals:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchGoals()
  }, [])

  if (loading) {
    return (
      <Card className="p-4 mb-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Loading goals...</span>
        </div>
      </Card>
    )
  }

  if (goals.length === 0) {
    return null // Don't show section if no goals
  }

  const completedCount = goals.filter((g) => g.is_complete).length
  const totalCount = goals.length
  const completionRate = Math.round((completedCount / totalCount) * 100)

  // Compact version for form view
  if (compact) {
    return (
      <Card className="p-4 mb-6 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="size-4 text-primary" />
            <span className="text-sm font-medium">Goals Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={completedCount === totalCount ? "default" : "secondary"}
              className="text-xs"
            >
              {completedCount}/{totalCount} complete
            </Badge>
            <span className="text-xs text-muted-foreground">({completionRate}%)</span>
          </div>
        </div>
      </Card>
    )
  }

  // Full version for template selection view
  return (
    <Card className="p-6 mb-8" data-testid="goals-summary-section">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Target className="size-5 text-primary" />
            Your Goals This Week
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            How did you do on your goals?
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {completedCount}/{totalCount}
          </div>
          <div className="text-xs text-muted-foreground">completed</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      {/* Goal list */}
      <div className="space-y-2">
        {goals.map((goal) => {
          const config = getCategoryConfig(goal.category)
          return (
            <div
              key={goal.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                {goal.is_complete ? (
                  <CheckCircle2 className="size-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="size-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="font-medium text-sm truncate block">
                    {goal.title}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {config.name} • {goal.current_value}/{goal.target_value}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {goal.current_streak > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-orange-500">
                    <Flame className="size-3" />
                    {goal.current_streak}
                  </span>
                )}
                <Badge
                  variant={goal.is_complete ? "default" : "outline"}
                  className="text-xs"
                  style={{
                    backgroundColor: goal.is_complete ? "#22c55e" : undefined,
                    borderColor: goal.is_complete ? "transparent" : config.hex,
                    color: goal.is_complete ? "white" : config.hex,
                  }}
                >
                  {goal.progress_percentage}%
                </Badge>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary message */}
      <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
        {completedCount === totalCount ? (
          <span className="text-green-600 font-medium">
            Amazing! You hit all your goals this week.
          </span>
        ) : completedCount >= totalCount / 2 ? (
          <span>
            Good progress! You completed {completedCount} of {totalCount} goals.
          </span>
        ) : completedCount > 0 ? (
          <span>
            You completed {completedCount} goal{completedCount > 1 ? "s" : ""}. Keep pushing!
          </span>
        ) : (
          <span>
            No goals completed yet. Reflect on what held you back.
          </span>
        )}
      </div>
    </Card>
  )
}
