"use client"

import { useMemo, useState, useCallback } from "react"
import { Sun, GripVertical, ChevronRight, ChevronDown, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GoalCard } from "./GoalCard"
import { GoalToggle } from "./GoalToggle"
import { TodaysPulse } from "./TodaysPulse"
import { isDailyActionable, isDailyMilestone, getNextMilestoneInfo, computeProjectedDate, getTimeOfDayBracket } from "../goalsService"
import type { GoalWithProgress, GoalViewMode } from "../types"

interface DailyActionViewProps {
  goals: GoalWithProgress[]
  isCustomizeMode?: boolean
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild: (parentGoal: GoalWithProgress) => void
  onGoalToggle?: (goalId: string, active: boolean) => Promise<void>
  onDeleteGoal?: (goalId: string) => Promise<void>
  onDeleteAllGoals?: () => Promise<void>
  onReorder?: (goalIds: string[]) => Promise<void>
  onSwitchView?: (view: GoalViewMode) => void
  onCreateGoal?: () => void
}

function SortableGoalRow({
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
}: {
  goal: GoalWithProgress
  allGoals: GoalWithProgress[]
  isCustomizeMode: boolean
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild: (parentGoal: GoalWithProgress) => void
  onGoalToggle?: (goalId: string, active: boolean) => Promise<void>
  onDeleteGoal?: (goalId: string) => Promise<void>
}) {
  const milestoneInfo = getNextMilestoneInfo(goal)
  const projection = computeProjectedDate(goal)
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
          variant="compact"
          breadcrumbMode="parent-only"
          nextMilestone={milestoneInfo}
          projectedDate={projection}
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

export function DailyActionView({
  goals,
  isCustomizeMode = false,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
  onGoalToggle,
  onDeleteGoal,
  onDeleteAllGoals,
  onReorder,
  onSwitchView,
  onCreateGoal,
}: DailyActionViewProps) {
  const [localOrder, setLocalOrder] = useState<string[] | null>(null)

  const { actionableGoals, archivedActionableGoals, milestoneGoals, sectionTitle } = useMemo(() => {
    const actionable = goals.filter((g) => !g.is_archived && isDailyActionable(g))
    const archivedActionable = goals.filter((g) => g.is_archived && isDailyActionable(g))
    const milestones = goals.filter(isDailyMilestone)

    // Dynamic section title based on goal mix
    const periods = new Set(actionable.map(g => g.period))
    const title = periods.size === 1 && periods.has("daily") ? "Today"
      : periods.size === 1 && periods.has("weekly") ? "This Week"
      : "Active Goals"

    return {
      actionableGoals: actionable,
      archivedActionableGoals: archivedActionable,
      milestoneGoals: milestones,
      sectionTitle: title,
    }
  }, [goals])

  // Apply local order if set (during drag reordering)
  const orderedGoals = useMemo(() => {
    if (!localOrder) return actionableGoals
    const goalMap = new Map(actionableGoals.map(g => [g.id, g]))
    return localOrder
      .map(id => goalMap.get(id))
      .filter((g): g is GoalWithProgress => !!g)
  }, [actionableGoals, localOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentIds = (localOrder ?? actionableGoals.map(g => g.id))
    const oldIndex = currentIds.indexOf(active.id as string)
    const newIndex = currentIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(currentIds, oldIndex, newIndex)
    setLocalOrder(newOrder)
    onReorder?.(newOrder)
  }, [localOrder, actionableGoals, onReorder])

  if (actionableGoals.length === 0 && milestoneGoals.length === 0 && archivedActionableGoals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sun className="size-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No daily or weekly goals yet.</p>
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
      {/* Today's Pulse — aggregate progress ring + time-of-day context */}
      {!isCustomizeMode && actionableGoals.length > 0 && (
        <TodaysPulse
          goals={actionableGoals}
          timeOfDay={getTimeOfDayBracket(new Date().getHours())}
        />
      )}


      {isCustomizeMode && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Drag to reorder. Toggle to show/hide. Trash to permanently delete.
          </p>
          {onDeleteAllGoals && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDeleteAllGoals()}
              data-testid="goals-delete-all-button"
            >
              <Trash2 className="size-4 mr-1" />
              Delete All
            </Button>
          )}
        </div>
      )}

      {/* Actionable goals */}
      {orderedGoals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {sectionTitle}
          </h2>
          {isCustomizeMode ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedGoals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {orderedGoals.map((goal) => (
                    <SortableGoalRow
                      key={goal.id}
                      goal={goal}
                      allGoals={goals}
                      isCustomizeMode={isCustomizeMode}
                      onIncrement={onIncrement}
                      onSetValue={onSetValue}
                      onComplete={onComplete}
                      onReset={onReset}
                      onEdit={onEdit}
                      onAddChild={onAddChild}
                      onGoalToggle={onGoalToggle}
                      onDeleteGoal={onDeleteGoal}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {orderedGoals.map((goal) => {
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
          )}
        </div>
      )}

      {/* Hidden goals — collapsible bar, always visible when archived goals exist */}
      {archivedActionableGoals.length > 0 && (
        <HiddenGoalsBar
          archivedGoals={archivedActionableGoals}
          allGoals={goals}
          isCustomizeMode={isCustomizeMode}
          onGoalToggle={onGoalToggle}
          onDeleteGoal={onDeleteGoal}
        />
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

function HiddenGoalsBar({
  archivedGoals,
  allGoals,
  isCustomizeMode,
  onGoalToggle,
  onDeleteGoal,
}: {
  archivedGoals: GoalWithProgress[]
  allGoals: GoalWithProgress[]
  isCustomizeMode: boolean
  onGoalToggle?: (goalId: string, active: boolean) => Promise<void>
  onDeleteGoal?: (goalId: string) => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState(true)

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
        <span>Hidden</span>
        <span className="text-muted-foreground/50">{archivedGoals.length}</span>
        <div className="flex-1 border-t border-border/50 ml-2" />
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {archivedGoals.map((goal) => (
            <div key={goal.id} className="flex items-start gap-1.5">
              {isCustomizeMode && (
                <div className="flex items-center gap-1 pt-3 flex-shrink-0">
                  {onGoalToggle && (
                    <GoalToggle
                      goalId={goal.id}
                      isActive={false}
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
                  variant="compact"
                  breadcrumbMode="parent-only"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
