"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Target, Flame, CheckCircle2, TrendingUp } from "lucide-react"
import { GoalFormModal } from "@/src/lair/components/GoalFormModal"
import { getCategoryConfig, GOAL_CATEGORIES } from "@/src/lair/data/goalCategories"
import type { GoalWithProgress } from "@/src/db/goalTypes"

interface GoalsTabProps {
  isPreviewMode?: boolean
}

export function GoalsTab({ isPreviewMode = false }: GoalsTabProps) {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | undefined>(undefined)

  const fetchGoals = useCallback(async () => {
    if (isPreviewMode) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/goals")
      if (!res.ok) throw new Error("Failed to fetch goals")
      const data = await res.json()
      setGoals(data.goals || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals")
    } finally {
      setLoading(false)
    }
  }, [isPreviewMode])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleEditGoal = (goal: GoalWithProgress) => {
    setEditingGoal(goal)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingGoal(undefined)
  }

  const handleSuccess = () => {
    fetchGoals()
  }

  // Group goals by category
  const goalsByCategory = goals.reduce(
    (acc, goal) => {
      const cat = goal.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(goal)
      return acc
    },
    {} as Record<string, GoalWithProgress[]>
  )

  // Calculate stats
  const activeGoals = goals.filter((g) => g.is_active && !g.is_archived)
  const completedThisPeriod = activeGoals.filter((g) => g.is_complete).length
  const totalStreaks = activeGoals.reduce((sum, g) => sum + g.current_streak, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading goals...
        </div>
      </div>
    )
  }

  if (isPreviewMode) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Strategic Goal Setting</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Define what you want to achieve. Your goals here connect to your daily
            tracking in the Lair for seamless progress monitoring.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Your Goals</h2>
          <p className="text-sm text-muted-foreground">
            What do you want to achieve? Set strategic goals here, track daily in the Lair.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Set New Goal
        </Button>
      </div>

      {/* Quick Stats */}
      {activeGoals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-bold">{activeGoals.length}</div>
              <div className="text-xs text-muted-foreground">Active Goals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {completedThisPeriod}/{activeGoals.length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                <Flame className="h-5 w-5" />
                {totalStreaks}
              </div>
              <div className="text-xs text-muted-foreground">Total Streaks</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals by Category */}
      {activeGoals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No goals yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by setting a goal. What do you want to achieve?
            </p>
            <Button onClick={() => setShowModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(goalsByCategory).map(([category, categoryGoals]) => {
            const config = getCategoryConfig(category)
            const Icon = config.icon
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="p-1.5 rounded-md"
                    style={{ backgroundColor: `${config.hex}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: config.hex }} />
                  </div>
                  <h3 className="font-medium capitalize">{config.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {categoryGoals.length}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={() => handleEditGoal(goal)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <GoalFormModal
        open={showModal}
        onOpenChange={handleCloseModal}
        goal={editingGoal}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

function GoalCard({
  goal,
  onEdit,
}: {
  goal: GoalWithProgress
  onEdit: () => void
}) {
  const config = getCategoryConfig(goal.category)
  const progressPct = goal.progress_percentage

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onEdit}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{goal.title}</span>
              {goal.is_complete && (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>
                {goal.current_value}/{goal.target_value}
              </span>
              <span className="capitalize">{goal.period}</span>
              {goal.current_streak > 0 && (
                <span className="flex items-center gap-0.5 text-orange-500">
                  <Flame className="h-3 w-3" />
                  {goal.current_streak}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-lg font-bold"
              style={{ color: goal.is_complete ? "#22c55e" : config.hex }}
            >
              {progressPct}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: goal.is_complete ? "#22c55e" : config.hex,
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
