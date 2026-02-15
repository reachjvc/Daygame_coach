"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Plus, Pencil, Archive, RotateCcw, Flame, CircleDot, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { WidgetProps } from "../../types"
import type { GoalWithProgress } from "@/src/db/goalTypes"
import { GOAL_CATEGORIES, getCategoryConfig } from "../../data/goalCategories"
import { GoalFormModal } from "../GoalFormModal"

type FilterCategory = "all" | string
type SortOption = "newest" | "progress" | "streak" | "category"

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "progress", label: "Progress" },
  { value: "streak", label: "Streak" },
  { value: "category", label: "Category" },
]

export function GoalsListWidget({ collapsed }: WidgetProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterCategory>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | undefined>()

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
      const res = await fetch(`/api/goals/${goalId}/reset`, {
        method: "POST",
      })
      if (res.ok) {
        const updated = await res.json()
        setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)))
      }
    } catch (error) {
      console.error("Failed to reset goal:", error)
    }
  }

  const handleArchive = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId))
      }
    } catch (error) {
      console.error("Failed to archive goal:", error)
    }
  }

  // Filter and sort goals
  const sortedGoals = useMemo(() => {
    const filtered = filter === "all" ? goals : goals.filter((g) => g.category === filter)

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "progress":
          return b.progress_percentage - a.progress_percentage
        case "streak":
          return b.current_streak - a.current_streak
        case "category":
          return a.category.localeCompare(b.category)
        case "newest":
        default:
          return 0 // Already sorted by created_at desc from API
      }
    })
  }, [goals, filter, sortBy])

  // Get unique categories from goals for filter
  const activeCategories = [...new Set(goals.map((g) => g.category))]

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-muted rounded h-6 w-16" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-16" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Category Filter + Sort */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={filter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("all")}
            >
              All ({goals.length})
            </Badge>
            {GOAL_CATEGORIES.filter((c) => activeCategories.includes(c.id)).map(
              (cat) => {
                const count = goals.filter((g) => g.category === cat.id).length
                return (
                  <Badge
                    key={cat.id}
                    variant={filter === cat.id ? "default" : "outline"}
                    className={`cursor-pointer gap-1 ${
                      filter === cat.id ? cat.bgColor : ""
                    }`}
                    onClick={() => setFilter(cat.id)}
                  >
                    {cat.name} ({count})
                  </Badge>
                )
              }
            )}
          </div>

          {goals.length > 1 && (
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Goals List */}
        {sortedGoals.length === 0 ? (
          <div className="text-center py-6">
            <CircleDot className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              {filter === "all"
                ? "No goals yet. Start tracking your progress!"
                : `No ${filter} goals`}
            </p>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="size-4 mr-1" />
              Add Goal
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedGoals.map((goal) => {
              const config = getCategoryConfig(goal.category)
              const Icon = config.icon

              return (
                <div
                  key={goal.id}
                  className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className={`p-1.5 rounded ${config.bgColor}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">
                          {goal.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {goal.period} · {goal.current_value}/{goal.target_value}
                          </span>
                          {goal.current_streak > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-orange-500">
                              <Flame className="h-3 w-3" />
                              {goal.current_streak}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {goal.is_complete ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleReset(goal.id)}
                          title="Reset"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleIncrement(goal.id)}
                          title="+1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingGoal(goal)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleArchive(goal.id)}
                        title="Archive"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-background/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        goal.is_complete ? "bg-green-500" : config.progressColor
                      }`}
                      style={{ width: `${goal.progress_percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="size-4 mr-1" />
              Add Goal
            </Button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <GoalFormModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={fetchGoals}
      />

      {/* Edit Modal */}
      <GoalFormModal
        open={!!editingGoal}
        onOpenChange={(open) => !open && setEditingGoal(undefined)}
        goal={editingGoal}
        onSuccess={fetchGoals}
      />
    </>
  )
}
