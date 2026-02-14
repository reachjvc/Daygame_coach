"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { GoalCard } from "./GoalCard"
import { GoalToggle } from "./GoalToggle"
import type { GoalWithProgress, GoalDisplayCategory } from "../types"
import type { ProjectedDateInfo } from "../goalsService"

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog Goals",
}

interface GoalCategorySectionProps {
  category: GoalDisplayCategory
  goals: GoalWithProgress[]
  allGoals: GoalWithProgress[]
  defaultCollapsed?: boolean
  isCustomizeMode?: boolean
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete?: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild?: (parentGoal: GoalWithProgress) => void
  onGoalToggle?: (goalId: string, active: boolean) => Promise<void>
  projections?: Map<string, ProjectedDateInfo>
}

export function GoalCategorySection({
  category,
  goals,
  allGoals,
  defaultCollapsed = false,
  isCustomizeMode = false,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
  onGoalToggle,
  projections,
}: GoalCategorySectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const label = CATEGORY_LABELS[category]

  if (goals.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer w-full"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
        <span>{label}</span>
        <span className="text-muted-foreground/50">{goals.length}</span>
        <div className="flex-1 border-t border-border/50 ml-2" />
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {goals.map((goal) => (
            <div key={goal.id} className="flex items-start gap-2">
              {isCustomizeMode && onGoalToggle && (
                <div className="pt-3.5">
                  <GoalToggle
                    goalId={goal.id}
                    isActive={!goal.is_archived}
                    onToggle={onGoalToggle}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <GoalCard
                  goal={goal}
                  allGoals={allGoals}
                  breadcrumbMode="none"
                  projectedDate={projections?.get(goal.id) ?? null}
                  onIncrement={onIncrement}
                  onSetValue={onSetValue}
                  onComplete={onComplete}
                  onReset={onReset}
                  onEdit={onEdit}
                  onAddChild={onAddChild}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
