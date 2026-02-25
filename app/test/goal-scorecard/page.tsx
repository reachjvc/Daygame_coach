"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, ListChecks, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScorecardView } from "@/src/goals/components/views/ScorecardView"
import type { GoalWithProgress } from "@/src/goals/types"

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

function createMockGoal(overrides: Partial<GoalWithProgress>): GoalWithProgress {
  return {
    id: crypto.randomUUID(),
    user_id: "mock-user",
    title: "Mock Goal",
    category: "",
    tracking_type: "counter",
    period: "weekly",
    target_value: 10,
    current_value: 0,
    period_start_date: "2026-02-17",
    custom_end_date: null,
    current_streak: 0,
    best_streak: 0,
    is_active: true,
    is_archived: false,
    linked_metric: null,
    position: 0,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-20T00:00:00Z",
    life_area: "daygame",
    parent_goal_id: null,
    target_date: null,
    description: null,
    goal_type: "recurring",
    goal_nature: null,
    display_category: null,
    goal_level: 3,
    template_id: null,
    milestone_config: null,
    ramp_steps: null,
    motivation_note: null,
    streak_freezes_available: 0,
    streak_freezes_used: 0,
    last_freeze_date: null,
    progress_percentage: 0,
    is_complete: false,
    days_remaining: null,
    goal_phase: null,
    ...overrides,
  }
}

function generateMockGoals(): GoalWithProgress[] {
  return [
    // --- Daygame (3 visible + 1 graduated excluded) ---
    createMockGoal({
      title: "10 approaches/week",
      life_area: "daygame",
      goal_type: "recurring",
      target_value: 10,
      current_value: 7,
      current_streak: 3,
      linked_metric: "approaches_weekly",
      progress_percentage: 70,
      display_category: "field_work",
    }),
    createMockGoal({
      title: "3 sessions/week",
      life_area: "daygame",
      goal_type: "recurring",
      target_value: 3,
      current_value: 2,
      current_streak: 2,
      linked_metric: "sessions_weekly",
      progress_percentage: 67,
      display_category: "field_work",
    }),
    createMockGoal({
      title: "Get 2 numbers weekly",
      life_area: "daygame",
      goal_type: "recurring",
      target_value: 2,
      current_value: 1,
      progress_percentage: 50,
      display_category: "results",
    }),
    createMockGoal({
      title: "First kiss close",
      life_area: "daygame",
      goal_type: "milestone",
      target_value: 1,
      current_value: 0,
      progress_percentage: 0,
      display_category: "dirty_dog",
    }),
    // EXCLUDED: graduated
    createMockGoal({
      title: "Graduated habit (excluded)",
      life_area: "daygame",
      goal_type: "habit_ramp",
      target_value: 10,
      current_value: 10,
      current_streak: 12,
      goal_phase: "graduated",
      progress_percentage: 100,
    }),

    // --- Health & Fitness (2 visible) ---
    createMockGoal({
      title: "Gym 4x/week",
      life_area: "health_fitness",
      goal_type: "recurring",
      target_value: 4,
      current_value: 3,
      current_streak: 8,
      progress_percentage: 75,
      display_category: "training",
    }),
    createMockGoal({
      title: "Run a 5K",
      life_area: "health_fitness",
      goal_type: "milestone",
      target_value: 1,
      current_value: 0,
      progress_percentage: 0,
      display_category: "endurance",
    }),

    // --- Career (1 visible + 1 completed excluded) ---
    // EXCLUDED: completed
    createMockGoal({
      title: "Deep work 4h daily (excluded)",
      life_area: "career_business",
      goal_type: "recurring",
      period: "daily",
      target_value: 4,
      current_value: 4,
      current_streak: 5,
      is_complete: true,
      goal_level: null,
      progress_percentage: 100,
    }),
    createMockGoal({
      title: "Save $500/month",
      life_area: "career_business",
      goal_type: "recurring",
      period: "monthly",
      target_value: 500,
      current_value: 320,
      current_streak: 1,
      goal_level: null,
      progress_percentage: 64,
      display_category: "saving",
    }),

    // --- Personal Growth (2 visible) ---
    createMockGoal({
      title: "Meditate daily",
      life_area: "personal_growth",
      goal_type: "recurring",
      tracking_type: "boolean",
      period: "daily",
      target_value: 1,
      current_value: 0,
      progress_percentage: 0,
      display_category: "mindfulness",
    }),
    createMockGoal({
      title: "Read 20 pages daily",
      life_area: "personal_growth",
      goal_type: "recurring",
      period: "daily",
      target_value: 20,
      current_value: 12,
      current_streak: 4,
      goal_level: null,
      progress_percentage: 60,
      display_category: "learning",
    }),

    // EXCLUDED: archived
    createMockGoal({
      title: "Old archived goal (excluded)",
      life_area: "lifestyle",
      is_archived: true,
    }),

    // EXCLUDED: L0 structural
    createMockGoal({
      title: "Master Daygame (excluded)",
      life_area: "daygame",
      goal_type: "milestone",
      goal_level: 0,
      target_value: 1000,
      current_value: 250,
      progress_percentage: 25,
    }),

    // --- Vices (1 visible) ---
    createMockGoal({
      title: "Porn-free streak",
      life_area: "vices_elimination",
      goal_type: "recurring",
      target_value: 7,
      current_value: 5,
      current_streak: 5,
      progress_percentage: 71,
      display_category: "porn_freedom",
    }),
  ]
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GoalScorecardTestPage() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [useMockData, setUseMockData] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const fetchRealGoals = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/goals")
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      const goalsList: GoalWithProgress[] = Array.isArray(data) ? data : data.goals || []
      setGoals(goalsList)
    } catch {
      // Fallback to mock on error
      setGoals(generateMockGoals())
      setUseMockData(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (useMockData) {
      setGoals(generateMockGoals())
    } else {
      fetchRealGoals()
    }
  }, [useMockData, fetchRealGoals])

  const handleIncrement = async (goalId: string, amount: number) => {
    if (useMockData) {
      // Optimistic mock update
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? {
                ...g,
                current_value: g.current_value + amount,
                progress_percentage: Math.min(
                  ((g.current_value + amount) / g.target_value) * 100,
                  100
                ),
              }
            : g
        )
      )
      return
    }
    // Real API
    const res = await fetch(`/api/goals/${goalId}/increment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
    if (res.ok) {
      await fetchRealGoals()
    }
  }

  const handleSetValue = async (goalId: string, value: number) => {
    if (useMockData) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? {
                ...g,
                current_value: value,
                progress_percentage: Math.min((value / g.target_value) * 100, 100),
              }
            : g
        )
      )
      return
    }
    const res = await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_value: value }),
    })
    if (res.ok) {
      await fetchRealGoals()
    }
  }

  const toggleDataSource = () => setUseMockData((prev) => !prev)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-8 py-12">
        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ListChecks className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">Goal Scorecard</h1>
          </div>
          <p className="text-muted-foreground">
            Flat daily execution view — grouped by life area, minimal rows, quick actions.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={toggleDataSource}>
            {useMockData ? "Try Real Data" : "Use Mock Data"}
          </Button>
          {useMockData && (
            <Badge variant="outline" className="text-xs">
              Mock Data ({goals.length} goals, {generateMockGoals().length - goals.length === 0 ? "4 excluded by filter" : `${goals.length} total`})
            </Badge>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScorecardView
            goals={goals}
            onIncrement={handleIncrement}
            onSetValue={handleSetValue}
          />
        )}
      </div>
    </div>
  )
}
