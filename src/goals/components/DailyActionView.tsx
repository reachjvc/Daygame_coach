"use client"

import { useMemo } from "react"
import { Sun, Calendar } from "lucide-react"
import { GoalCard } from "./GoalCard"
import { isDailyActionable, getNextMilestoneInfo, formatStreakLabel, getDaysLeftInWeek, computeProjectedDate } from "../goalsService"
import type { GoalWithProgress } from "../types"

interface DailyActionViewProps {
  goals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild: (parentGoal: GoalWithProgress) => void
}

export function DailyActionView({
  goals,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
}: DailyActionViewProps) {
  const { actionableGoals, goalSummaries, streakLabel, daysLeft } = useMemo(() => {
    const actionable = goals.filter((g) => !g.is_archived && isDailyActionable(g))

    // Per-goal weekly summary lines
    const summaries = actionable
      .filter((g) => g.tracking_type === "counter" && !g.is_complete)
      .map((g) => ({
        title: g.title,
        current: g.current_value,
        target: g.target_value,
      }))

    // Streak: use highest current_streak among all goals
    const maxStreak = Math.max(0, ...goals.map((g) => g.current_streak))

    return {
      actionableGoals: actionable,
      goalSummaries: summaries,
      streakLabel: formatStreakLabel(maxStreak),
      daysLeft: getDaysLeftInWeek(),
    }
  }, [goals])

  if (actionableGoals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sun className="size-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No daily or weekly goals active.</p>
        <p className="text-xs mt-1">Switch to Strategic view to see all goals, or create a weekly goal.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="rounded-lg border border-border bg-card p-4">
        {streakLabel && (
          <p className="text-sm font-medium text-primary mb-1">{streakLabel}</p>
        )}
        {goalSummaries.length > 0 && (
          <div className="space-y-1">
            {goalSummaries.map((s) => (
              <div key={s.title} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="size-3.5" />
                <span>{s.title}: <span className="font-medium text-foreground">{s.current}/{s.target}</span> this week</span>
              </div>
            ))}
            {daysLeft > 0 && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                {daysLeft} day{daysLeft === 1 ? "" : "s"} left this week
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actionable goals */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          This Week
        </h2>
        <div className="space-y-2">
          {actionableGoals.map((goal) => {
            const milestoneInfo = getNextMilestoneInfo(goal)
            const projection = computeProjectedDate(goal)
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                allGoals={goals}
                variant="compact"
                breadcrumbMode="parent-only"
                nextMilestone={milestoneInfo}
                projectedDate={projection}
                onIncrement={onIncrement}
                onSetValue={onSetValue}
                onComplete={onComplete}
                onReset={onReset}
                onEdit={onEdit}
                onAddChild={onAddChild}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
