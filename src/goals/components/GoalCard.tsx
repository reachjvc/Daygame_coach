"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, ChevronDown, ChevronUp, Flame, Calendar, Loader2, GitBranch, Link, Plus, TrendingUp, Clock } from "lucide-react"
import { getLifeAreaConfig } from "../data/lifeAreas"
import { getGoalAccentColor } from "../goalHierarchyService"
import { GoalHierarchyBreadcrumb } from "./GoalHierarchyBreadcrumb"
import { GoalInputWidget } from "./GoalInputWidget"
import type { GoalWithProgress } from "../types"
import { getMilestoneLadderValues } from "../goalsService"
import type { ProjectedDateInfo } from "../goalsService"

function formatDaysRemaining(days: number): string {
  if (days <= 0) return "Overdue"
  const formatted = days.toLocaleString()
  return `${formatted} ${days === 1 ? "day" : "days"} left`
}

function getDaysRemainingStyle(days: number): string {
  if (days <= 0) return "bg-red-500/15 text-red-400 border-red-500/30"
  if (days <= 7) return "bg-red-500/10 text-red-400 border-red-500/25"
  if (days <= 30) return "bg-amber-500/10 text-amber-400 border-amber-500/25"
  if (days <= 90) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
  return "bg-blue-500/10 text-blue-400 border-blue-500/20"
}

interface GoalCardProps {
  goal: GoalWithProgress
  allGoals?: GoalWithProgress[]
  variant?: "compact" | "expanded"
  breadcrumbMode?: "full" | "parent-only" | "none"
  nextMilestone?: { nextValue: number; remaining: number } | null
  projectedDate?: ProjectedDateInfo | null
  onIncrement?: (goalId: string, amount: number) => Promise<void>
  onSetValue?: (goalId: string, value: number) => Promise<void>
  onComplete?: (goal: GoalWithProgress) => void
  onReset?: (goalId: string) => Promise<void>
  onEdit?: (goal: GoalWithProgress) => void
  onAddChild?: (parentGoal: GoalWithProgress) => void
}

export function GoalCard({
  goal,
  allGoals = [],
  variant = "compact",
  breadcrumbMode = "full",
  nextMilestone,
  projectedDate,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
}: GoalCardProps) {
  const [isExpanded, setIsExpanded] = useState(variant === "expanded")
  const [isIncrementing, setIsIncrementing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const areaConfig = getLifeAreaConfig(goal.life_area)
  const Icon = areaConfig.icon
  const natureColor = getGoalAccentColor(goal)
  const accentColor = natureColor ?? areaConfig.hex
  const isBoolean = goal.tracking_type === "boolean"
  const childCount = allGoals.filter(g => g.parent_goal_id === goal.id).length
  const isOverdue = goal.goal_type === "milestone" && goal.days_remaining !== null && goal.days_remaining <= 0

  const handleIncrement = async (amount: number) => {
    if (!onIncrement || isIncrementing) return
    setIsIncrementing(true)
    try {
      await onIncrement(goal.id, amount)
    } finally {
      setIsIncrementing(false)
    }
  }

  const handleSetValue = async (value: number) => {
    if (!onSetValue || isIncrementing) return
    setIsIncrementing(true)
    try {
      await onSetValue(goal.id, value)
    } finally {
      setIsIncrementing(false)
    }
  }

  const handleReset = async () => {
    if (!onReset || isResetting) return
    setIsResetting(true)
    try {
      await onReset(goal.id)
    } finally {
      setIsResetting(false)
      setShowResetConfirm(false)
    }
  }

  const showAddChild = onAddChild && (goal.goal_type === "milestone" || childCount > 0) && (goal.goal_level === null || goal.goal_level < 3)

  return (
    <div>
    <div
      className={`rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/80${goal.is_archived ? " opacity-50" : ""}`}
      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
      data-testid={`goal-card-${goal.id}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Life area icon */}
        <div
          className="mt-0.5 rounded-md p-1.5 flex-shrink-0"
          style={{ backgroundColor: `${areaConfig.hex}15`, color: areaConfig.hex }}
        >
          <Icon className="size-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          {breadcrumbMode !== "none" && goal.parent_goal_id && allGoals.length > 0 && (
            breadcrumbMode === "parent-only" ? (
              <div className="text-xs text-muted-foreground mb-1">
                {allGoals.find(g => g.id === goal.parent_goal_id)?.title}
              </div>
            ) : (
              <GoalHierarchyBreadcrumb goal={goal} allGoals={allGoals} />
            )
          )}

          <div className="flex items-center gap-2">
            <h3
              className="font-medium text-sm truncate"
              data-testid={`goal-title-${goal.id}`}
            >
              {goal.title}
            </h3>
            {goal.is_complete && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                Done
              </Badge>
            )}
            {childCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1 py-0 h-5">
                <GitBranch className="size-2.5" />
                {childCount}
              </Badge>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${goal.progress_percentage}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap" data-testid={`goal-progress-${goal.id}`}>
              {isBoolean
                ? (goal.is_complete ? "Done" : "Not done")
                : `${goal.current_value}/${goal.target_value}${goal.linked_metric && !goal.is_complete ? " · auto-tracked" : ""}`
              }
            </span>
          </div>

          {/* Meta row */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {goal.current_streak > 0 && (
              <span className="flex items-center gap-1">
                <Flame className="size-3 text-orange-500" />
                {goal.current_streak} streak
              </span>
            )}
            {goal.goal_type === "milestone" && goal.days_remaining !== null && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${getDaysRemainingStyle(goal.days_remaining)}`}>
                <Calendar className="size-3" />
                {formatDaysRemaining(goal.days_remaining)}
              </span>
            )}
            {goal.goal_type === "recurring" && (
              <span className="capitalize">{goal.period}</span>
            )}
            {nextMilestone && (
              <span className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="size-3" />
                {nextMilestone.remaining} from next milestone
              </span>
            )}
            {projectedDate?.nextLabel && (
              <span className="flex items-center gap-1 text-sky-400">
                <Clock className="size-3" />
                Next: {projectedDate.nextLabel}
              </span>
            )}
            {goal.linked_metric && !goal.is_complete && (
              <span className="flex items-center gap-1 text-blue-400">
                <Link className="size-3" />
                Auto-synced
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Collapse goal" : "Expand goal"}
        >
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {/* Expanded section */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          {goal.goal_type === "habit_ramp" && goal.ramp_steps && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium">Ramp schedule:</p>
              {(goal.ramp_steps as { frequencyPerWeek: number; durationWeeks: number }[]).map((step, i) => (
                <p key={i}>{step.frequencyPerWeek}/week for {step.durationWeeks} weeks</p>
              ))}
            </div>
          )}

          {goal.goal_type === "milestone" && goal.milestone_config && (() => {
            const ladderValues = getMilestoneLadderValues(goal)
            if (!ladderValues || ladderValues.length === 0) return null
            return (
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Milestone ladder:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ladderValues.map((m) => {
                    const reached = goal.current_value >= m
                    return (
                      <span key={m} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] ${reached ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-muted text-muted-foreground border-border"}`}>
                        {reached ? "✓" : "○"} {m}
                      </span>
                    )
                  })}
                </div>
                {nextMilestone && (
                  <p className="text-emerald-400 mt-1">Next: {nextMilestone.nextValue} ({nextMilestone.remaining} more)</p>
                )}
              </div>
            )
          })()}

          {/* Actions */}
          <div className="space-y-2">
            {onIncrement && !goal.is_complete && (
              goal.linked_metric ? (
                <p className="text-xs text-muted-foreground">
                  Progress synced automatically from your session data
                </p>
              ) : (
                <GoalInputWidget
                  goal={goal}
                  isLoading={isIncrementing}
                  onIncrement={handleIncrement}
                  onSetValue={onSetValue ? handleSetValue : undefined}
                  onComplete={onComplete ? () => onComplete(goal) : undefined}
                />
              )
            )}
            <div className="flex items-center gap-1">
              {onReset && goal.goal_type === "recurring" && (
                showResetConfirm ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-destructive">Reset progress?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleReset}
                      disabled={isResetting}
                    >
                      {isResetting ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowResetConfirm(false)}
                      disabled={isResetting}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                  >
                    <RotateCcw className="size-3 mr-1" />
                    Reset
                  </Button>
                )
              )}
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(goal)}
                  className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                  data-testid={`goal-edit-${goal.id}`}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    {showAddChild && (
      <div className="flex justify-end -mt-1.5 mr-4 mb-1">
        <button
          onClick={() => onAddChild!(goal)}
          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-300 rounded-full bg-orange-950/80 border border-orange-500/40 shadow-[0_1px_4px_rgba(249,115,22,0.2)] hover:bg-orange-900/80 hover:border-orange-500/60 transition-all cursor-pointer"
        >
          <Plus className="size-3" />
          Sub-goal
        </button>
      </div>
    )}
    </div>
  )
}
