"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { GoalIcon } from "@/components/ui/GoalIcon"
import { GoalCard } from "../GoalCard"
import { groupGoalsByTimeHorizon } from "../../goalsService"
import { TIME_HORIZONS } from "../../config"
import type { GoalWithProgress } from "../../types"

interface KanbanViewProps {
  goals: GoalWithProgress[]
  allGoals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onCreateGoal?: () => void
  filterAreaName?: string | null
}

export function KanbanView({ goals, allGoals, onIncrement, onReset, onEdit, onCreateGoal, filterAreaName }: KanbanViewProps) {
  const grouped = useMemo(() => groupGoalsByTimeHorizon(goals), [goals])

  // Column order: defined horizons first, then any "Custom" column
  const columns = useMemo(() => {
    const result: { label: string; goals: GoalWithProgress[] }[] = []
    for (const horizon of TIME_HORIZONS) {
      if (grouped[horizon]) {
        result.push({ label: horizon, goals: grouped[horizon] })
      }
    }
    if (grouped["Custom"]) {
      result.push({ label: "Custom", goals: grouped["Custom"] })
    }
    return result
  }, [grouped])

  if (goals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <GoalIcon className="size-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {filterAreaName ? `No ${filterAreaName} goals` : "No goals yet"}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {filterAreaName
            ? `Create a goal in ${filterAreaName} to see it here.`
            : "Create your first goal to start tracking progress."
          }
        </p>
        {onCreateGoal && (
          <Button onClick={onCreateGoal}>
            <Plus className="size-4 mr-1" />
            New Goal
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.label}
          className="flex-shrink-0 w-72 rounded-lg border border-border bg-card/50"
        >
          {/* Column header */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">{column.label}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {column.goals.length}
            </span>
          </div>

          {/* Column content */}
          <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
            {column.goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                allGoals={allGoals}
                variant="compact"
                onIncrement={onIncrement}
                onReset={onReset}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
