"use client"

import { useMemo } from "react"
import { Sun, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoalCard } from "./GoalCard"
import { isDailyActionable, isDailyMilestone, getNextMilestoneInfo, formatStreakLabel, getDaysLeftInWeek, computeProjectedDate } from "../goalsService"
import type { GoalWithProgress, GoalViewMode } from "../types"

interface DailyActionViewProps {
  goals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild: (parentGoal: GoalWithProgress) => void
  onSwitchView?: (view: GoalViewMode) => void
  onCreateGoal?: () => void
}

export function DailyActionView({
  goals,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
  onSwitchView,
  onCreateGoal,
}: DailyActionViewProps) {
  const { actionableGoals, milestoneGoals, goalSummaries, streakLabel, daysLeft, hasWeeklyGoals, sectionTitle } = useMemo(() => {
    const actionable = goals.filter((g) => !g.is_archived && isDailyActionable(g))
    const milestones = goals.filter(isDailyMilestone)

    // Per-goal summary lines with period-aware labels
    const summaries = actionable
      .filter((g) => g.tracking_type === "counter" && !g.is_complete)
      .map((g) => {
        const isCumulative = g.goal_type === "milestone"
        const periodLabel = isCumulative
          ? (g.target_date ? `by ${new Date(g.target_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : "all-time")
          : g.period === "daily" ? "today"
          : g.period === "weekly" ? "this week"
          : g.period === "monthly" ? "this month"
          : ""
        return {
          title: g.title,
          current: g.current_value,
          target: g.target_value,
          periodLabel,
        }
      })

    // Dynamic section title based on goal mix
    const periods = new Set(actionable.map(g => g.period))
    const title = periods.size === 1 && periods.has("daily") ? "Today"
      : periods.size === 1 && periods.has("weekly") ? "This Week"
      : "Active Goals"

    // Streak: use highest current_streak among all goals
    const maxStreak = Math.max(0, ...goals.map((g) => g.current_streak))

    return {
      actionableGoals: actionable,
      milestoneGoals: milestones,
      goalSummaries: summaries,
      streakLabel: formatStreakLabel(maxStreak),
      daysLeft: getDaysLeftInWeek(),
      hasWeeklyGoals: actionable.some(g => g.period === "weekly"),
      sectionTitle: title,
    }
  }, [goals])

  if (actionableGoals.length === 0 && milestoneGoals.length === 0) {
    const archivedCount = goals.filter(g => g.is_archived && isDailyActionable(g)).length
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sun className="size-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No daily or weekly goals active.</p>
        {archivedCount > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {archivedCount} archived goal{archivedCount > 1 ? "s" : ""} hidden — use Strategic view to manage
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => onSwitchView?.("strategic")}>
            Strategic view
          </Button>
          <Button variant="outline" size="sm" onClick={() => onCreateGoal?.()}>
            Create a goal
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary header — hidden when no streak and no counter summaries */}
      {(streakLabel || goalSummaries.length > 0) && (
        <div className="rounded-lg border border-border bg-card p-4">
          {streakLabel && (
            <p className="text-sm font-medium text-primary mb-1">{streakLabel}</p>
          )}
          {goalSummaries.length > 0 && (
            <div className="space-y-1">
              {goalSummaries.map((s) => (
                <div key={s.title} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>{s.title}: <span className="font-medium text-foreground">{s.current}/{s.target}</span> {s.periodLabel}</span>
                </div>
              ))}
              {hasWeeklyGoals && daysLeft > 0 && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {daysLeft} day{daysLeft === 1 ? "" : "s"} left this week
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actionable goals */}
      {actionableGoals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {sectionTitle}
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
      )}

      {/* Milestones summary */}
      {milestoneGoals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Milestones
          </h2>
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            {milestoneGoals.map((g) => {
              const info = getNextMilestoneInfo(g)
              return (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate mr-2">{g.title}</span>
                  <span className="font-medium whitespace-nowrap">
                    {g.current_value}/{g.target_value}
                    {info && <span className="text-xs text-emerald-400 ml-2">next: {info.nextValue}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
