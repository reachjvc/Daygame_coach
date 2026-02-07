"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, RotateCcw, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WidgetProps } from "../../types"
import type { GoalWithProgress } from "@/src/db/goalTypes"
import { getCategoryConfig } from "../../data/goalCategories"
import { GoalFormModal } from "../GoalFormModal"

export function GoalProgressWidget({ collapsed }: WidgetProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals")
      if (res.ok) {
        const data = await res.json()
        // Show only active goals, limit to 4
        setGoals(data.filter((g: GoalWithProgress) => g.is_active).slice(0, 4))
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
        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? updated : g))
        )
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
        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? updated : g))
        )
      }
    } catch (error) {
      console.error("Failed to reset goal:", error)
    }
  }

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex justify-between mb-1">
              <div className="bg-muted rounded h-4 w-32" />
              <div className="bg-muted rounded h-4 w-12" />
            </div>
            <div className="bg-muted rounded h-2 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <>
        <div className="text-center py-4">
          <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            No goals yet. Set your first goal!
          </p>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="size-4 mr-1" />
            Add Goal
          </Button>
        </div>
        <GoalFormModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          onSuccess={fetchGoals}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {goals.map((goal) => {
          const config = getCategoryConfig(goal.category)
          const Icon = config.icon

          return (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-1 rounded ${config.bgColor}`}>
                    <Icon className={`h-3 w-3 ${config.color}`} />
                  </div>
                  <span className="text-sm font-medium truncate">{goal.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {goal.current_value}/{goal.target_value}
                  </span>
                  {goal.is_complete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleReset(goal.id)}
                      title="Reset for new period"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleIncrement(goal.id)}
                      title="Add 1"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="size-4 mr-1" />
          Add Goal
        </Button>
      </div>

      <GoalFormModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={fetchGoals}
      />
    </>
  )
}
