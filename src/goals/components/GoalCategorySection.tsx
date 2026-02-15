"use client"

import { useState, useCallback } from "react"
import { ChevronDown, ChevronRight, GripVertical, Trash2 } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GoalCard } from "./GoalCard"
import { GoalToggle } from "./GoalToggle"
import type { GoalWithProgress, GoalDisplayCategory } from "../types"
import type { ProjectedDateInfo } from "../goalsService"

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog Goals",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

function SortableCategoryGoal({
  goal,
  allGoals,
  isCustomizeMode,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
  onGoalToggle,
  onDeleteGoal,
  projections,
  milestones,
}: {
  goal: GoalWithProgress
  allGoals: GoalWithProgress[]
  isCustomizeMode: boolean
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete?: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild?: (parentGoal: GoalWithProgress) => void
  onGoalToggle?: (goalId: string, active: boolean) => Promise<void>
  onDeleteGoal?: (goalId: string) => Promise<void>
  projections?: Map<string, ProjectedDateInfo>
  milestones?: Map<string, { nextValue: number; remaining: number }>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
    disabled: !isCustomizeMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1.5">
      {isCustomizeMode && (
        <div className="flex items-center gap-1 pt-3 flex-shrink-0">
          <button
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          {onGoalToggle && (
            <GoalToggle
              goalId={goal.id}
              isActive={!goal.is_archived}
              onToggle={onGoalToggle}
            />
          )}
          {onDeleteGoal && (
            <button
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => {
                if (window.confirm(`Permanently delete "${goal.title}"? This cannot be undone.`)) {
                  onDeleteGoal(goal.id)
                }
              }}
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <GoalCard
          goal={goal}
          allGoals={allGoals}
          breadcrumbMode="none"
          projectedDate={projections?.get(goal.id) ?? null}
          nextMilestone={milestones?.get(goal.id) ?? null}
          onIncrement={isCustomizeMode ? undefined : onIncrement}
          onSetValue={isCustomizeMode ? undefined : onSetValue}
          onComplete={isCustomizeMode ? undefined : onComplete}
          onReset={isCustomizeMode ? undefined : onReset}
          onEdit={isCustomizeMode ? undefined : onEdit}
          onAddChild={isCustomizeMode ? undefined : onAddChild}
        />
      </div>
    </div>
  )
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
  onDeleteGoal?: (goalId: string) => Promise<void>
  onReorder?: (goalIds: string[]) => Promise<void>
  projections?: Map<string, ProjectedDateInfo>
  milestones?: Map<string, { nextValue: number; remaining: number }>
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
  onDeleteGoal,
  onReorder,
  projections,
  milestones,
}: GoalCategorySectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)
  const label = CATEGORY_LABELS[category]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const orderedGoals = (() => {
    if (!localOrder) return goals
    const goalMap = new Map(goals.map(g => [g.id, g]))
    return localOrder
      .map(id => goalMap.get(id))
      .filter((g): g is GoalWithProgress => !!g)
  })()

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentIds = (localOrder ?? goals.map(g => g.id))
    const oldIndex = currentIds.indexOf(active.id as string)
    const newIndex = currentIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(currentIds, oldIndex, newIndex)
    setLocalOrder(newOrder)
    onReorder?.(newOrder)
  }, [localOrder, goals, onReorder])

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
        isCustomizeMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedGoals.map(g => g.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedGoals.map((goal) => (
                  <SortableCategoryGoal
                    key={goal.id}
                    goal={goal}
                    allGoals={allGoals}
                    isCustomizeMode={isCustomizeMode}
                    onIncrement={onIncrement}
                    onSetValue={onSetValue}
                    onComplete={onComplete}
                    onReset={onReset}
                    onEdit={onEdit}
                    onAddChild={onAddChild}
                    onGoalToggle={onGoalToggle}
                    onDeleteGoal={onDeleteGoal}
                    projections={projections}
                    milestones={milestones}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-2">
            {orderedGoals.map((goal) => (
              <div key={goal.id} className="flex-1 min-w-0">
                <GoalCard
                  goal={goal}
                  allGoals={allGoals}
                  breadcrumbMode="none"
                  projectedDate={projections?.get(goal.id) ?? null}
                  nextMilestone={milestones?.get(goal.id) ?? null}
                  onIncrement={onIncrement}
                  onSetValue={onSetValue}
                  onComplete={onComplete}
                  onReset={onReset}
                  onEdit={onEdit}
                  onAddChild={onAddChild}
                />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
