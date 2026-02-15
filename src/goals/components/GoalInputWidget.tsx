"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Check, Loader2, Trophy } from "lucide-react"
import { getInputMode, getButtonIncrements } from "../goalsService"
import type { GoalWithProgress } from "../types"

interface GoalInputWidgetProps {
  goal: GoalWithProgress
  isLoading: boolean
  onIncrement: (amount: number) => void
  onSetValue?: (value: number) => void
  onComplete?: () => void
}

export function GoalInputWidget({
  goal,
  isLoading,
  onIncrement,
  onSetValue,
  onComplete,
}: GoalInputWidgetProps) {
  const [directValue, setDirectValue] = useState<string>(String(goal.current_value))
  const inputMode = getInputMode(goal)

  // Milestone boolean goals get a special "Mark Complete" button
  const isMilestoneBoolean = goal.goal_type === "milestone" && (goal.tracking_type === "boolean" || goal.target_value === 1)

  if (goal.is_complete) return null

  // Milestone boolean: prominent completion button
  if (isMilestoneBoolean && onComplete) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onComplete}
        disabled={isLoading}
        className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
      >
        {isLoading ? (
          <Loader2 className="size-3 animate-spin mr-1" />
        ) : (
          <Trophy className="size-3 mr-1" />
        )}
        Mark Complete
      </Button>
    )
  }

  // Boolean (non-milestone): simple "Mark Done"
  if (inputMode === "boolean") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onIncrement(1)}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="size-3 animate-spin mr-1" />
        ) : (
          <Check className="size-3 mr-1" />
        )}
        Mark Done
      </Button>
    )
  }

  // Direct entry for high-target goals (>50)
  if (inputMode === "direct-entry" && onSetValue) {
    const remaining = Math.max(0, goal.target_value - goal.current_value)

    const handleSet = () => {
      const numValue = Number(directValue)
      if (!isNaN(numValue) && numValue >= 0) {
        onSetValue(numValue)
      }
    }

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={directValue}
            onChange={(e) => setDirectValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSet()}
            className="w-24 h-8 text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSet}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
            Set
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {remaining > 0 ? `${remaining} remaining` : "Target reached!"}
        </span>
      </div>
    )
  }

  // Button mode: +1, +5, +10 depending on target
  const increments = getButtonIncrements(goal.target_value)
  return (
    <div className="flex items-center gap-2">
      {increments.map((amount) => (
        <Button
          key={amount}
          variant="outline"
          size="sm"
          onClick={() => onIncrement(amount)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="size-3 animate-spin mr-1" />
          ) : (
            <Plus className="size-3 mr-1" />
          )}
          +{amount}
        </Button>
      ))}
    </div>
  )
}
