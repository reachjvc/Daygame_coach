"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Columns2, Loader2 } from "lucide-react"
import { GoalIcon } from "@/components/ui/GoalIcon"
import { ViewSwitcher } from "@/src/goals/components/views/ViewSwitcher"
import { DashboardView } from "@/src/goals/components/views/DashboardView"
import { TimeHorizonView } from "@/src/goals/components/views/TimeHorizonView"
import { buildGoalTree } from "@/src/goals/goalsService"
import type { GoalWithProgress, GoalTreeNode, GoalViewMode } from "@/src/goals/types"

/**
 * Generate mock goal data for testing views when user has no real goals
 */
function generateMockGoals(): GoalWithProgress[] {
  const now = new Date()
  const base = {
    user_id: "mock",
    category: "daygame",
    tracking_type: "counter" as const,
    period_start_date: now.toISOString().split("T")[0],
    custom_end_date: null,
    is_active: true,
    is_archived: false,
    linked_metric: null as null,
    position: 0,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }

  return [
    {
      ...base, id: "m1", title: "Master Daygame", life_area: "daygame", goal_type: "milestone", period: "weekly" as const,
      target_value: 1000, current_value: 250, current_streak: 0, best_streak: 0,
      parent_goal_id: null, target_date: "2030-03-19", description: "Long-term mastery goal",
      progress_percentage: 25, is_complete: false, days_remaining: 1497,
    },
    {
      ...base, id: "m2", title: "25 approaches/week", life_area: "daygame", goal_type: "recurring", period: "weekly" as const,
      target_value: 25, current_value: 18, current_streak: 3, best_streak: 5,
      parent_goal_id: "m1", target_date: null, description: null,
      progress_percentage: 72, is_complete: false, days_remaining: null,
    },
    {
      ...base, id: "m3", title: "3 sessions/week", life_area: "daygame", goal_type: "recurring", period: "weekly" as const,
      target_value: 3, current_value: 2, current_streak: 2, best_streak: 4,
      parent_goal_id: "m1", target_date: null, description: null,
      progress_percentage: 67, is_complete: false, days_remaining: null,
    },
    {
      ...base, id: "m4", title: "Gym 4x/week", life_area: "health_fitness", goal_type: "recurring", period: "weekly" as const,
      target_value: 4, current_value: 4, current_streak: 8, best_streak: 12,
      parent_goal_id: null, target_date: null, description: null,
      progress_percentage: 100, is_complete: true, days_remaining: null,
    },
    {
      ...base, id: "m5", title: "Run a marathon", life_area: "health_fitness", goal_type: "milestone", period: "weekly" as const,
      target_value: 1, current_value: 0, current_streak: 0, best_streak: 0,
      parent_goal_id: null, target_date: "2026-10-15", description: "Complete my first full marathon",
      progress_percentage: 0, is_complete: false, days_remaining: 245,
    },
    {
      ...base, id: "m6", title: "Deep work 4h daily", life_area: "career_business", goal_type: "recurring", period: "daily" as const,
      target_value: 4, current_value: 3, current_streak: 5, best_streak: 14,
      parent_goal_id: null, target_date: null, description: null,
      progress_percentage: 75, is_complete: false, days_remaining: null,
    },
    {
      ...base, id: "m7", title: "Read 1 book/month", life_area: "personal_growth", goal_type: "recurring", period: "monthly" as const,
      target_value: 1, current_value: 1, current_streak: 3, best_streak: 3,
      parent_goal_id: null, target_date: null, description: null,
      progress_percentage: 100, is_complete: true, days_remaining: null,
    },
    {
      ...base, id: "m8", title: "Save $500/month", life_area: "finances", goal_type: "recurring", period: "monthly" as const,
      target_value: 500, current_value: 320, current_streak: 1, best_streak: 2,
      parent_goal_id: null, target_date: null, description: null,
      progress_percentage: 64, is_complete: false, days_remaining: null,
    },
  ]
}

function RenderView({
  mode,
  goals,
  tree,
  onIncrement,
  onReset,
  onEdit,
}: {
  mode: GoalViewMode
  goals: GoalWithProgress[]
  tree: GoalTreeNode[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
}) {
  switch (mode) {
    case "standard":
      return <DashboardView goals={goals} allGoals={goals} tree={tree} onIncrement={onIncrement} onReset={onReset} onEdit={onEdit} />
    case "time-horizon":
      return <TimeHorizonView goals={goals} allGoals={goals} tree={tree} onIncrement={onIncrement} onReset={onReset} onEdit={onEdit} />
  }
}

export default function GoalsViewsTestPage() {
  const [viewMode, setViewMode] = useState<GoalViewMode>("standard")
  const [rightViewMode, setRightViewMode] = useState<GoalViewMode>("time-horizon")
  const [sideBySide, setSideBySide] = useState(false)
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [tree, setTree] = useState<GoalTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [useMockData, setUseMockData] = useState(false)

  const loadGoals = useCallback(async (useMock: boolean) => {
    setIsLoading(true)
    try {
      if (useMock) {
        const mock = generateMockGoals()
        setGoals(mock)
        setTree(buildGoalTree(mock))
      } else {
        const response = await fetch("/api/goals")
        if (!response.ok) throw new Error("Failed to fetch")
        const data = await response.json()
        const goalsList: GoalWithProgress[] = Array.isArray(data) ? data : data.goals || []
        if (goalsList.length === 0) {
          // Fall back to mock if no real goals
          const mock = generateMockGoals()
          setGoals(mock)
          setTree(buildGoalTree(mock))
          setUseMockData(true)
        } else {
          setGoals(goalsList)
          setTree(buildGoalTree(goalsList))
        }
      }
    } catch {
      const mock = generateMockGoals()
      setGoals(mock)
      setTree(buildGoalTree(mock))
      setUseMockData(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGoals(false)
  }, [loadGoals])

  const toggleDataSource = () => {
    const next = !useMockData
    setUseMockData(next)
    loadGoals(next)
  }

  // No-op handlers for test page (no real API calls on mock data)
  const handleIncrement = async () => {}
  const handleReset = async () => {}
  const handleEdit = () => {}

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <GoalIcon className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">Goals Views Comparison</h1>
          </div>
          <p className="text-muted-foreground">
            Compare Standard and Time Horizon views side by side.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <ViewSwitcher activeView={viewMode} onViewChange={setViewMode} />
          {sideBySide && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-muted-foreground">vs</span>
              <ViewSwitcher activeView={rightViewMode} onViewChange={setRightViewMode} />
            </div>
          )}
          <Button
            variant={sideBySide ? "default" : "outline"}
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => setSideBySide(!sideBySide)}
          >
            <Columns2 className="size-4 mr-1" />
            Side by Side
          </Button>
          <Button variant="outline" size="sm" onClick={toggleDataSource}>
            {useMockData ? "Try Real Data" : "Use Mock Data"}
          </Button>
          {useMockData && (
            <Badge variant="outline" className="text-xs">
              Mock Data ({goals.length} goals)
            </Badge>
          )}
        </div>

        {/* View */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : sideBySide ? (
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            <div className="min-w-0">
              <RenderView mode={viewMode} goals={goals} tree={tree} onIncrement={handleIncrement} onReset={handleReset} onEdit={handleEdit} />
            </div>
            <div className="min-w-0">
              <RenderView mode={rightViewMode} goals={goals} tree={tree} onIncrement={handleIncrement} onReset={handleReset} onEdit={handleEdit} />
            </div>
          </div>
        ) : (
          <RenderView mode={viewMode} goals={goals} tree={tree} onIncrement={handleIncrement} onReset={handleReset} onEdit={handleEdit} />
        )}

        {/* Footer note */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Which view works best for you? Settings will be added to save your preference.
        </div>
      </div>
    </div>
  )
}
