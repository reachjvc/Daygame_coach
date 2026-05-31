"use client"

import { useMemo, useState, useCallback } from "react"
import { Sun, GripVertical, ChevronRight, ChevronDown, Trash2, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GoalCard } from "./GoalCard"
import { GoalToggle } from "./GoalToggle"
import { TodaysPulse } from "./TodaysPulse"
import { PeriodRollupRow } from "./PeriodRollupRow"
import { usePeriodStats } from "../hooks/usePeriodStats"
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

  // Period hierarchy: shorter periods roll up into longer ones
  const PERIOD_HIERARCHY: { period: string; label: string; statsKey: "week" | "month" | "year"; shorterPeriods: string[] }[] = [
    { period: "daily", label: "Today", statsKey: "week", shorterPeriods: [] },
    { period: "weekly", label: "This Week", statsKey: "week", shorterPeriods: ["daily"] },
    { period: "monthly", label: "This Month", statsKey: "month", shorterPeriods: ["daily", "weekly"] },
    { period: "yearly", label: "This Year", statsKey: "year", shorterPeriods: ["daily", "weekly", "monthly"] },
  ]

  const { statsMap } = usePeriodStats(goals)

  const { periodSections, allActionableGoals, dailyGoals, archivedActionableGoals, milestoneGoals, topLevelGoals } = useMemo(() => {
    const actionable = goals.filter((g) => !g.is_archived && isDailyActionable(g))
    const archivedActionable = goals.filter((g) => g.is_archived && isDailyActionable(g))
    const milestones = goals.filter(isDailyMilestone)
    const topLevel = goals.filter((g) => g.goal_level === 1 && !g.is_archived)

    const now = new Date()

    // Compute period date boundaries for milestone placement
    const dayOfWeek = now.getDay() || 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const mondayStr = monday.toISOString().split("T")[0]
    const sundayStr = sunday.toISOString().split("T")[0]
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    function isInPeriod(targetDate: string, period: string): boolean {
      const d = new Date(targetDate)
      switch (period) {
        case "weekly": return targetDate >= mondayStr && targetDate <= sundayStr
        case "monthly": return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        case "yearly": return d.getFullYear() === currentYear
        default: return false
      }
    }

    // Build sections with native goals, rollups, and milestone placements
    const sections: {
      label: string
      period: string
      statsKey: "week" | "month" | "year"
      nativeGoals: GoalWithProgress[]
      rollupGoals: GoalWithProgress[]
      deltaGoals: GoalWithProgress[]
      deadlineGoals: GoalWithProgress[]
    }[] = []

    const coveredPeriods = new Set(PERIOD_HIERARCHY.map((p) => p.period))

    for (const { period, label, statsKey, shorterPeriods } of PERIOD_HIERARCHY) {
      const nativeGoals = actionable.filter((g) => g.period === period)

      // Rollup: actionable goals from shorter periods
      const rollupGoals = shorterPeriods.length > 0
        ? actionable.filter((g) => shorterPeriods.includes(g.period))
        : []

      // Delta: cumulative milestones (show progress gained in this period)
      const deltaGoals = period !== "daily"
        ? milestones.filter((g) => g.goal_type === "milestone")
        : []

      // Deadline: milestones with target_date falling in this period
      const deadlineGoals = period !== "daily"
        ? [...milestones, ...topLevel].filter((g) =>
            g.target_date && isInPeriod(g.target_date, period)
          )
        : []

      const hasContent = nativeGoals.length > 0 || rollupGoals.length > 0
        || deltaGoals.length > 0 || deadlineGoals.length > 0

      if (hasContent) {
        sections.push({ label, period, statsKey, nativeGoals, rollupGoals, deltaGoals, deadlineGoals })
      }
    }

    // Catch-all for quarterly/custom
    const other = actionable.filter((g) => !coveredPeriods.has(g.period))
    if (other.length > 0) {
      sections.push({
        label: "Active Goals",
        period: "other",
        statsKey: "year",
        nativeGoals: other,
        rollupGoals: [],
        deltaGoals: [],
        deadlineGoals: [],
      })
    }

    return {
      periodSections: sections,
      allActionableGoals: actionable,
      dailyGoals: actionable.filter((g) => g.period === "daily"),
      archivedActionableGoals: archivedActionable,
      milestoneGoals: milestones,
      topLevelGoals: topLevel,
    }
  }, [goals, statsMap])

  // Apply local order for drag reordering (daily goals only)
  const orderedDailyGoals = useMemo(() => {
    if (!localOrder) return dailyGoals
    const goalMap = new Map(dailyGoals.map(g => [g.id, g]))
    return localOrder
      .map(id => goalMap.get(id))
      .filter((g): g is GoalWithProgress => !!g)
  }, [dailyGoals, localOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentIds = (localOrder ?? dailyGoals.map(g => g.id))
    const oldIndex = currentIds.indexOf(active.id as string)
    const newIndex = currentIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(currentIds, oldIndex, newIndex)
    setLocalOrder(newOrder)
    onReorder?.(newOrder)
  }, [localOrder, dailyGoals, onReorder])

  if (allActionableGoals.length === 0 && milestoneGoals.length === 0 && archivedActionableGoals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sun className="size-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No active goals yet.</p>
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
      {/* Today's Pulse — aggregate progress ring + time-of-day context (daily goals only) */}
      {!isCustomizeMode && dailyGoals.length > 0 && (
        <TodaysPulse
          goals={dailyGoals}
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

      {/* Multi-period goal sections */}
      {periodSections.map(({ label, period, statsKey, nativeGoals, rollupGoals, deltaGoals, deadlineGoals }) => {
        const isDailySection = period === "daily"
        const displayNative = isDailySection ? orderedDailyGoals : nativeGoals
        const hasRollups = rollupGoals.length > 0 || deltaGoals.length > 0 || deadlineGoals.length > 0

        return (
          <div key={label} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </h2>

            {/* Native goals — full interactive cards */}
            {displayNative.length > 0 && (
              isCustomizeMode && isDailySection ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={displayNative.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {displayNative.map((goal) => (
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
                  {displayNative.map((goal) => {
                    const milestoneInfo = getNextMilestoneInfo(goal)
                    const projection = computeProjectedDate(goal)
                    return isCustomizeMode ? (
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
                    ) : (
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
              )
            )}

            {/* Rollup rows — completion rates, deltas, deadlines */}
            {!isCustomizeMode && hasRollups && (
              <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                {rollupGoals.map((g) => (
                  <PeriodRollupRow key={`rollup-${g.id}`} goal={g} stats={statsMap.get(g.id)} period={statsKey} mode="completion" />
                ))}
                {deltaGoals.map((g) => (
                  <PeriodRollupRow key={`delta-${g.id}`} goal={g} stats={statsMap.get(g.id)} period={statsKey} mode="delta" />
                ))}
                {deadlineGoals.map((g) => (
                  <PeriodRollupRow key={`deadline-${g.id}`} goal={g} stats={statsMap.get(g.id)} period={statsKey} mode="deadline" />
                ))}
              </div>
            )}
          </div>
        )
      })}

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

      {/* Top-level goals with target dates */}
      {topLevelGoals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Destinations
          </h2>
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            {topLevelGoals.map((g) => {
              const targetDate = g.target_date ? new Date(g.target_date) : null
              const now = new Date()
              let countdown: string | null = null
              if (targetDate) {
                const diffMs = targetDate.getTime() - now.getTime()
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                if (diffDays > 365) {
                  const years = Math.floor(diffDays / 365)
                  const months = Math.floor((diffDays % 365) / 30)
                  countdown = months > 0 ? `${years}y ${months}mo` : `${years}y`
                } else if (diffDays > 30) {
                  const months = Math.floor(diffDays / 30)
                  const days = diffDays % 30
                  countdown = days > 0 ? `${months}mo ${days}d` : `${months}mo`
                } else if (diffDays > 0) {
                  countdown = `${diffDays}d`
                } else if (diffDays === 0) {
                  countdown = "today"
                } else {
                  countdown = `${Math.abs(diffDays)}d overdue`
                }
              }
              return (
                <div key={g.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <Target className="size-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{g.title}</span>
                  </div>
                  {targetDate ? (
                    <span className="font-medium whitespace-nowrap flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {targetDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className={`text-xs ${countdown?.includes("overdue") ? "text-destructive" : "text-emerald-400"}`}>
                        {countdown}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">no date</span>
                  )}
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
