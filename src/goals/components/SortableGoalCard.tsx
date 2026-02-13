"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { GoalCard } from "./GoalCard"
import type { GoalWithProgress } from "../types"

interface SortableGoalCardProps {
  goal: GoalWithProgress
  allGoals: GoalWithProgress[]
  isEditMode: boolean
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete?: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild?: (parentGoal: GoalWithProgress) => void
}

export function SortableGoalCard({
  goal,
  allGoals,
  isEditMode,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
}: SortableGoalCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id, disabled: !isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      {isEditMode && (
        <button
          className="mt-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <GoalCard
          goal={goal}
          allGoals={allGoals}
          variant="compact"
          onIncrement={isEditMode ? undefined : onIncrement}
          onSetValue={isEditMode ? undefined : onSetValue}
          onComplete={isEditMode ? undefined : onComplete}
          onReset={isEditMode ? undefined : onReset}
          onEdit={isEditMode ? undefined : onEdit}
          onAddChild={isEditMode ? undefined : onAddChild}
        />
      </div>
    </div>
  )
}
