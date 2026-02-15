"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, Circle, Flame, Calendar, ArrowRight, ChevronDown, ChevronUp } from "lucide-react"
import { GoalIcon } from "@/components/ui/GoalIcon"
import { getCategoryConfig } from "@/src/lair/data/goalCategories"
import type { GoalWithProgress } from "@/src/db/goalTypes"

interface GoalsSummarySectionProps {
  compact?: boolean
  /** Show milestone goals approaching deadline */
  showMilestones?: boolean
  /** Show goals grouped by life area */
  groupByLifeArea?: boolean
  /** Previous week completion count for comparison */
  previousWeekCompleted?: number
}

/**
 * Get life area display config. Uses goalCategories as fallback
 * until lifeAreas.ts is available from M2.
 */
function getLifeAreaDisplay(lifeArea: string) {
  const config = getCategoryConfig(lifeArea)
  return {
    name: config.name,
    hex: config.hex,
    color: config.color,
    bgColor: config.bgColor,
    progressColor: config.progressColor,
  }
}

export function GoalsSummarySection({
  compact = false,
  showMilestones = false,
  groupByLifeArea = false,
  previousWeekCompleted,
}: GoalsSummarySectionProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await fetch("/api/goals")
        if (res.ok) {
          const data = await res.json()
          // API returns plain array — fix for previous data.goals bug
          const allGoals: GoalWithProgress[] = Array.isArray(data) ? data : []
          const activeGoals = allGoals.filter(
            (g) => g.is_active && !g.is_archived
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

  // Group goals by life area (daygame first)
  const goalsByArea = useMemo(() => {
    if (!groupByLifeArea) return null
    const groups: Record<string, GoalWithProgress[]> = {}
    for (const goal of goals) {
      const area = goal.life_area || goal.category || "other"
      if (!groups[area]) groups[area] = []
      groups[area].push(goal)
    }
    // Sort: daygame first, then alphabetical
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === "daygame") return -1
      if (b === "daygame") return 1
      return a.localeCompare(b)
    })
    return sorted
  }, [goals, groupByLifeArea])

  // Separate recurring vs milestone goals
  const { recurringGoals, milestoneGoals } = useMemo(() => {
    const recurring = goals.filter((g) => g.goal_type !== "milestone")
    const milestones = goals.filter((g) => g.goal_type === "milestone")
    return { recurringGoals: recurring, milestoneGoals: milestones }
  }, [goals])

  // Milestone goals approaching deadline (within 30 days)
  const approachingMilestones = useMemo(() => {
    return milestoneGoals
      .filter((g) => g.days_remaining !== null && g.days_remaining > 0 && g.days_remaining <= 30 && !g.is_complete)
      .sort((a, b) => (a.days_remaining ?? 0) - (b.days_remaining ?? 0))
  }, [milestoneGoals])

  const toggleArea = (area: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(area)) next.delete(area)
      else next.add(area)
      return next
    })
  }

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
            <GoalIcon className="size-4 text-primary" />
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

  // Render a single goal row
  const renderGoalRow = (goal: GoalWithProgress) => {
    const areaDisplay = getLifeAreaDisplay(goal.life_area || goal.category)
    // Find parent context
    const parent = goal.parent_goal_id
      ? goals.find((g) => g.id === goal.parent_goal_id)
      : null

    return (
      <div
        key={goal.id}
        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {goal.is_complete ? (
            <CheckCircle2 className="size-5 text-green-500 flex-shrink-0" />
          ) : (
            <Circle className="size-5 text-muted-foreground flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <span className="font-medium text-sm truncate block">
              {goal.title}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              {!groupByLifeArea && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                  style={{ borderColor: areaDisplay.hex, color: areaDisplay.hex }}
                >
                  {areaDisplay.name}
                </Badge>
              )}
              <span>{goal.current_value}/{goal.target_value}</span>
              {parent && (
                <span className="text-muted-foreground/70">
                  <ArrowRight className="size-2.5 inline" /> {parent.title} ({parent.progress_percentage}%)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {goal.current_streak > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-500">
              <Flame className="size-3" />
              {goal.current_streak}
            </span>
          )}
          {/* Progress bar (mini) */}
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${goal.progress_percentage}%`,
                backgroundColor: areaDisplay.hex,
              }}
            />
          </div>
          <Badge
            variant={goal.is_complete ? "default" : "outline"}
            className="text-xs"
            style={{
              backgroundColor: goal.is_complete ? "#22c55e" : undefined,
              borderColor: goal.is_complete ? "transparent" : areaDisplay.hex,
              color: goal.is_complete ? "white" : areaDisplay.hex,
            }}
          >
            {goal.progress_percentage}%
          </Badge>
        </div>
      </div>
    )
  }

  // Full version for template selection view
  return (
    <Card className="p-6 mb-8" data-testid="goals-summary-section">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <GoalIcon className="size-5 text-primary" />
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
          {previousWeekCompleted !== undefined && (
            <div className="text-xs mt-0.5">
              {completedCount > previousWeekCompleted ? (
                <span className="text-green-600">+{completedCount - previousWeekCompleted} vs last week</span>
              ) : completedCount < previousWeekCompleted ? (
                <span className="text-orange-500">{completedCount - previousWeekCompleted} vs last week</span>
              ) : (
                <span className="text-muted-foreground">Same as last week</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-300"
          style={{ width: `${completionRate}%` }}
        />
      </div>

      {/* Goal list - grouped or flat */}
      {goalsByArea ? (
        <div className="space-y-4">
          {goalsByArea.map(([area, areaGoals]) => {
            const display = getLifeAreaDisplay(area)
            const areaCompleted = areaGoals.filter((g) => g.is_complete).length
            const isExpanded = expandedAreas.has(area) || goalsByArea.length <= 3

            return (
              <div key={area}>
                <button
                  onClick={() => toggleArea(area)}
                  className="flex items-center justify-between w-full py-1.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: display.hex }}
                    />
                    <span className="font-medium text-sm">{display.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {areaCompleted}/{areaGoals.length}
                    </span>
                  </div>
                  {goalsByArea.length > 3 && (
                    isExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )
                  )}
                </button>
                {isExpanded && (
                  <div className="space-y-2 mt-1">
                    {areaGoals.map(renderGoalRow)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {recurringGoals.map(renderGoalRow)}
        </div>
      )}

      {/* Milestone goals section */}
      {showMilestones && approachingMilestones.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
            <Calendar className="size-4 text-primary" />
            Milestones Approaching
          </h3>
          <div className="space-y-2">
            {approachingMilestones.map((goal) => {
              const display = getLifeAreaDisplay(goal.life_area || goal.category)
              return (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-sm truncate block">
                      {goal.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {goal.progress_percentage}% complete
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs flex-shrink-0"
                    style={{ borderColor: display.hex, color: display.hex }}
                  >
                    {goal.days_remaining}d left
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
