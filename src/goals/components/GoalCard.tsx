"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, RotateCcw, ChevronDown, ChevronUp, Flame, Calendar, Loader2, Check, GitBranch } from "lucide-react"
import { getLifeAreaConfig } from "../data/lifeAreas"
import { GoalHierarchyBreadcrumb } from "./GoalHierarchyBreadcrumb"
import type { GoalWithProgress } from "../types"

interface GoalCardProps {
  goal: GoalWithProgress
  allGoals?: GoalWithProgress[]
  variant?: "compact" | "expanded"
  onIncrement?: (goalId: string, amount: number) => Promise<void>
  onReset?: (goalId: string) => Promise<void>
  onEdit?: (goal: GoalWithProgress) => void
}

export function GoalCard({
  goal,
  allGoals = [],
  variant = "compact",
  onIncrement,
  onReset,
  onEdit,
}: GoalCardProps) {
  const [isExpanded, setIsExpanded] = useState(variant === "expanded")
  const [isIncrementing, setIsIncrementing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const areaConfig = getLifeAreaConfig(goal.life_area)
  const Icon = areaConfig.icon
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

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/80"
      style={{ borderLeftColor: areaConfig.hex, borderLeftWidth: 3 }}
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
          {goal.parent_goal_id && allGoals.length > 0 && (
            <GoalHierarchyBreadcrumb goal={goal} allGoals={allGoals} />
          )}

          <div className="flex items-center gap-2">
            <h3
              className="font-medium text-sm truncate cursor-pointer"
              onClick={() => onEdit?.(goal)}
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
                  backgroundColor: areaConfig.hex,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {isBoolean
                ? (goal.is_complete ? "Done" : "Not done")
                : `${goal.current_value}/${goal.target_value}`
              }
            </span>
          </div>

          {/* Meta row */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            {goal.current_streak > 0 && (
              <span className="flex items-center gap-1">
                <Flame className="size-3 text-orange-500" />
                {goal.current_streak} streak
              </span>
            )}
            {goal.goal_type === "milestone" && goal.days_remaining !== null && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                <Calendar className="size-3" />
                {goal.days_remaining > 0 ? `${goal.days_remaining}d left` : "Overdue"}
              </span>
            )}
            {goal.goal_type === "recurring" && (
              <span className="capitalize">{goal.period}</span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={() => setIsExpanded(!isExpanded)}
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

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onIncrement && !goal.is_complete && (
              isBoolean ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleIncrement(1)}
                  disabled={isIncrementing}
                >
                  {isIncrementing ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    <Check className="size-3 mr-1" />
                  )}
                  Mark Done
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleIncrement(1)}
                    disabled={isIncrementing}
                  >
                    {isIncrementing ? (
                      <Loader2 className="size-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="size-3 mr-1" />
                    )}
                    +1
                  </Button>
                  {goal.target_value > 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIncrement(5)}
                      disabled={isIncrementing}
                    >
                      <Plus className="size-3 mr-1" />
                      +5
                    </Button>
                  )}
                </>
              )
            )}
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
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetConfirm(true)}
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
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
