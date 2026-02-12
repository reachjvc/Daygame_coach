"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, RotateCcw, Flame, ChevronDown, ChevronUp, Target, TrendingUp, Zap, GripVertical, Star, Layers, ArrowRight } from "lucide-react"
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { WidgetProps } from "../../types"
import type { GoalWithProgress } from "@/src/db/goalTypes"
import { getCategoryConfig } from "../../data/goalCategories"
import { GoalFormModal } from "../GoalFormModal"

/**
 * Get streak tier info for visual treatment
 */
function getStreakTier(streak: number): { tier: number; label: string; emoji: string } | null {
  if (streak >= 60) return { tier: 4, label: "Legendary", emoji: "👑" }
  if (streak >= 30) return { tier: 3, label: "Master", emoji: "🏆" }
  if (streak >= 21) return { tier: 2, label: "Habit", emoji: "⭐" }
  if (streak >= 7) return { tier: 1, label: "Week", emoji: "🔥" }
  return null
}

/**
 * Circular progress ring SVG component
 */
function CircularProgress({
  progress,
  color,
  size = 80
}: {
  progress: number
  color: string
  size?: number
}) {
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

/**
 * Featured Mission - Hero section for primary goal
 */
function FeaturedMission({
  goal,
  onIncrement,
  onReset,
}: {
  goal: GoalWithProgress
  onIncrement: () => void
  onReset: () => void
}) {
  const config = getCategoryConfig(goal.life_area || goal.category)
  const Icon = config.icon
  const streakInfo = getStreakTier(goal.current_streak)

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4 h-full">
      {/* Ambient glow */}
      <div
        className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl animate-breathe"
        style={{ backgroundColor: `${config.hex}20` }}
      />

      <div className="relative flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            Primary Mission
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: `${config.hex}20`,
              color: config.hex
            }}
          >
            {config.name}
          </span>
          {streakInfo && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${config.hex}20`,
                color: config.hex
              }}
            >
              <Flame className="w-3 h-3" />
              {goal.current_streak}
              <span className="text-[10px]">{streakInfo.emoji}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 flex-1">
          {/* Circular progress */}
          <div className="relative shrink-0">
            <CircularProgress
              progress={goal.progress_percentage}
              color={goal.is_complete ? "#22c55e" : config.hex}
              size={80}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-6 h-6" style={{ color: goal.is_complete ? "#22c55e" : config.hex }} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{goal.title}</h3>
            <p className="text-sm text-muted-foreground">
              {goal.current_value}/{goal.target_value} · {goal.period}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {goal.is_complete ? (
                <Button variant="outline" size="sm" onClick={onReset} className="text-xs h-7">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onIncrement}
                  className="text-xs h-7"
                  style={{ backgroundColor: config.hex, color: "#121212" }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Goal Row - Compact row for the goals list
 */
function GoalRow({
  goal,
  onIncrement,
  onReset,
}: {
  goal: GoalWithProgress
  onIncrement: () => void
  onReset: () => void
}) {
  const config = getCategoryConfig(goal.life_area || goal.category)
  const Icon = config.icon

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded-lg transition-all hover:bg-muted/30"
      style={{
        borderLeft: `3px solid ${config.hex}`
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: config.hex }} />

      <span className="text-sm font-medium truncate flex-1 min-w-0">
        {goal.title}
      </span>

      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${goal.progress_percentage}%`,
            backgroundColor: goal.is_complete ? "#22c55e" : config.hex
          }}
        />
      </div>

      <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
        {goal.current_value}/{goal.target_value}
      </span>

      {goal.current_streak > 0 && (
        <div className="flex items-center gap-0.5 text-orange-400 shrink-0">
          <Flame className="w-3 h-3" />
          <span className="text-xs">{goal.current_streak}</span>
        </div>
      )}

      {goal.is_complete ? (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onReset}>
          <RotateCcw className="h-3 w-3" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onIncrement}>
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

/**
 * Sortable Goal Row - Draggable wrapper for GoalRow
 */
function SortableGoalRow({
  goal,
  onIncrement,
  onReset,
  onSetPrimary,
  isPrimary,
  childCount,
}: {
  goal: GoalWithProgress
  onIncrement: () => void
  onReset: () => void
  onSetPrimary: () => void
  isPrimary?: boolean
  childCount?: number
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const config = getCategoryConfig(goal.life_area || goal.category)
  const Icon = config.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-all hover:bg-muted/30 ${
        isDragging ? "opacity-50 z-50" : ""
      } ${isPrimary ? "bg-primary/5 border border-primary/20" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>

      <div
        className="w-1 h-6 rounded-full shrink-0"
        style={{ backgroundColor: config.hex }}
      />

      <Icon className="w-4 h-4 shrink-0" style={{ color: config.hex }} />

      <span className="text-sm font-medium truncate flex-1 min-w-0">
        {goal.title}
      </span>

      {/* Child count badge */}
      {childCount !== undefined && childCount > 0 && (
        <span
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
          style={{ backgroundColor: `${config.hex}15`, color: config.hex }}
        >
          <Layers className="w-2.5 h-2.5" />
          {childCount}
        </span>
      )}

      {!isPrimary && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onSetPrimary}
          title="Set as primary mission"
        >
          <Star className="h-3 w-3" />
        </Button>
      )}

      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${goal.progress_percentage}%`,
            backgroundColor: goal.is_complete ? "#22c55e" : config.hex
          }}
        />
      </div>

      <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
        {goal.current_value}/{goal.target_value}
      </span>

      {goal.current_streak > 0 && (
        <div className="flex items-center gap-0.5 text-orange-400 shrink-0">
          <Flame className="w-3 h-3" />
          <span className="text-xs">{goal.current_streak}</span>
        </div>
      )}

      {goal.is_complete ? (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onReset}>
          <RotateCcw className="h-3 w-3" />
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onIncrement}>
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

/**
 * Stats Panel - Quick stats overview
 */
function StatsPanel({ goals }: { goals: GoalWithProgress[] }) {
  const totalGoals = goals.length
  const completedToday = goals.filter(g => g.is_complete).length
  const totalStreaks = goals.reduce((sum, g) => sum + g.current_streak, 0)
  const avgProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress_percentage, 0) / totalGoals)
    : 0
  const lifeAreasActive = new Set(goals.map(g => g.life_area || g.category)).size

  const stats = [
    { label: "Complete", value: `${completedToday}/${totalGoals}`, icon: Target, color: "#22c55e" },
    { label: "Avg Progress", value: `${avgProgress}%`, icon: TrendingUp, color: "#3b82f6" },
    { label: "Total Streaks", value: totalStreaks, icon: Flame, color: "#f97316" },
    { label: "Life Areas", value: lifeAreasActive, icon: Layers, color: "#8b5cf6" },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 h-full content-center">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-2 p-2 rounded-lg"
          style={{ backgroundColor: `${stat.color}10` }}
        >
          <stat.icon className="w-4 h-4 shrink-0" style={{ color: stat.color }} />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground truncate">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Mission Control Widget - Full-width command center with horizontal subslots
 *
 * Layout (3 columns):
 * [Featured Mission] [Goals List] [Stats Panel]
 */
export function MissionControlWidget({ collapsed }: WidgetProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAllGoals, setShowAllGoals] = useState(false)
  const [filterDaygame, setFilterDaygame] = useState(false)

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.ok) {
        const data = await res.json()
        setGoals(data.filter((g: GoalWithProgress) => g.is_active))
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleIncrement = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/increment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1 }),
      })
      if (res.ok) {
        const updated = await res.json()
        setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)))
      }
    } catch (error) {
      console.error("Failed to increment goal:", error)
    }
  }

  const handleReset = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/reset`, { method: "POST" })
      if (res.ok) {
        const updated = await res.json()
        setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)))
      }
    } catch (error) {
      console.error("Failed to reset goal:", error)
    }
  }

  // Drag-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Handle goal reorder
  const handleReorder = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = goals.findIndex(g => g.id === active.id)
    const newIndex = goals.findIndex(g => g.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // Optimistic update
    const newGoals = arrayMove(goals, oldIndex, newIndex)
    setGoals(newGoals)

    // Persist to backend
    try {
      await fetch("/api/goals/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalIds: newGoals.map(g => g.id) }),
      })
    } catch (error) {
      console.error("Failed to reorder:", error)
      fetchGoals() // Revert on error
    }
  }, [goals, fetchGoals])

  // Set a goal as primary (move to position 0)
  const handleSetPrimary = useCallback(async (goalId: string) => {
    const goalIndex = goals.findIndex(g => g.id === goalId)
    if (goalIndex === -1 || goalIndex === 0) return // Already primary or not found

    // Move goal to position 0
    const newGoals = arrayMove(goals, goalIndex, 0)
    setGoals(newGoals)

    // Persist to backend
    try {
      await fetch("/api/goals/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalIds: newGoals.map(g => g.id) }),
      })
    } catch (error) {
      console.error("Failed to set primary:", error)
      fetchGoals() // Revert on error
    }
  }, [goals, fetchGoals])

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="animate-pulse rounded-xl bg-muted h-40" />
        <div className="animate-pulse rounded-xl bg-muted h-40" />
        <div className="animate-pulse rounded-xl bg-muted h-40" />
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <>
        <div className="text-center py-12 border border-dashed border-muted rounded-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">No missions active</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Set your first goal to take control of your life
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="size-4 mr-2" />
            Create Mission
          </Button>
        </div>
        <GoalFormModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={fetchGoals} />
      </>
    )
  }

  // Compute child counts for each goal
  const childCounts = new Map<string, number>()
  for (const goal of goals) {
    if (goal.parent_goal_id) {
      childCounts.set(goal.parent_goal_id, (childCounts.get(goal.parent_goal_id) || 0) + 1)
    }
  }

  // Apply filter
  const displayGoals = filterDaygame
    ? goals.filter((g) => (g.life_area || g.category) === "daygame")
    : goals

  const [featuredGoal, ...otherGoals] = displayGoals
  const visibleGoals = showAllGoals ? displayGoals : displayGoals.slice(0, 5)
  const hiddenCount = displayGoals.length - 5

  if (displayGoals.length === 0 && filterDaygame) {
    // No daygame goals but filter active — show hint
    return (
      <>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setFilterDaygame(false)}
            className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            All Areas
          </button>
          <button
            className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-500"
          >
            Daygame
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No daygame goals yet.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3 h-3 mr-1" />
            Create Daygame Goal
          </Button>
        </div>
        <GoalFormModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={fetchGoals} />
      </>
    )
  }

  if (!featuredGoal) return null

  return (
    <>
      {/* Quick filter + View All link */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterDaygame(false)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              !filterDaygame ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All Areas
          </button>
          <button
            onClick={() => setFilterDaygame(true)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              filterDaygame ? "bg-orange-500/20 text-orange-500" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Daygame
          </button>
        </div>
        <Link
          href="/dashboard/goals"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          View All Goals
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Subslot 1: Featured Mission */}
        <FeaturedMission
          goal={featuredGoal}
          onIncrement={() => handleIncrement(featuredGoal.id)}
          onReset={() => handleReset(featuredGoal.id)}
        />

        {/* Subslot 2: Goals List (Sortable) */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              All Goals
              <span className="ml-1 text-[10px] opacity-60">(drag to reorder)</span>
            </h4>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowAddModal(true)}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragEnd={handleReorder}
          >
            <SortableContext
              items={displayGoals.map(g => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {visibleGoals.map((goal, index) => (
                  <SortableGoalRow
                    key={goal.id}
                    goal={goal}
                    onIncrement={() => handleIncrement(goal.id)}
                    onReset={() => handleReset(goal.id)}
                    onSetPrimary={() => handleSetPrimary(goal.id)}
                    isPrimary={index === 0}
                    childCount={childCounts.get(goal.id)}
                  />
                ))}

                {hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllGoals(!showAllGoals)}
                    className="flex items-center gap-1 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAllGoals ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        {hiddenCount} more goal{hiddenCount > 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Subslot 3: Stats Panel */}
        <div className="rounded-xl border border-border bg-card p-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Overview
          </h4>
          <StatsPanel goals={goals} />
        </div>
      </div>

      <GoalFormModal open={showAddModal} onOpenChange={setShowAddModal} onSuccess={fetchGoals} />
    </>
  )
}
