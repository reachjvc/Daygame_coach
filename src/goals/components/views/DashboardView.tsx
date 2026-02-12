"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Target } from "lucide-react"
import { GoalCard } from "../GoalCard"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import { groupGoalsByLifeArea, computeLifeAreaProgress } from "../../goalsService"
import { LIFE_AREAS } from "../../data/lifeAreas"
import type { GoalWithProgress, GoalTreeNode } from "../../types"

interface DashboardViewProps {
  goals: GoalWithProgress[]
  allGoals: GoalWithProgress[]
  tree: GoalTreeNode[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onCreateGoal?: () => void
  filterAreaName?: string | null
}

const CIRCUMFERENCE = 2 * Math.PI * 15 // ~94.25

export function DashboardView({
  goals,
  allGoals,
  tree,
  onIncrement,
  onReset,
  onEdit,
  onCreateGoal,
  filterAreaName,
}: DashboardViewProps) {
  const areaProgress = useMemo(() => computeLifeAreaProgress(goals), [goals])
  const grouped = useMemo(() => groupGoalsByLifeArea(goals), [goals])

  // Sort areas: daygame first, then by LIFE_AREAS sortOrder
  const sortedAreas = useMemo(() => {
    const areaOrder = new Map(LIFE_AREAS.map((a) => [a.id, a.sortOrder]))
    return areaProgress.sort(
      (a, b) => (areaOrder.get(a.lifeArea) ?? 99) - (areaOrder.get(b.lifeArea) ?? 99)
    )
  }, [areaProgress])

  if (goals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Target className="size-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {filterAreaName ? `No ${filterAreaName} goals` : "No goals yet"}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {filterAreaName
            ? `Create a goal in ${filterAreaName} to see it here.`
            : "Create your first goal to start tracking progress across all areas of your life."
          }
        </p>
        {onCreateGoal && (
          <Button onClick={onCreateGoal}>
            <Plus className="size-4 mr-1" />
            New Goal
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Life Area Summary Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {sortedAreas.map((area) => {
          const config = getLifeAreaConfig(area.lifeArea)
          const Icon = config.icon
          const isDaygame = area.lifeArea === "daygame"

          return (
            <div
              key={area.lifeArea}
              className={`rounded-xl border p-4 transition-colors hover:border-border/80 ${
                isDaygame ? "col-span-2 sm:col-span-1" : ""
              }`}
              style={{ borderColor: `${config.hex}30` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="rounded-lg p-1.5"
                  style={{ backgroundColor: `${config.hex}15`, color: config.hex }}
                >
                  <Icon className="size-4" />
                </div>
                <span className="text-sm font-medium truncate">{config.name}</span>
              </div>

              {/* Progress ring */}
              <div className="flex items-center gap-3">
                <div className="relative size-12">
                  <svg className="size-12 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-muted/30"
                    />
                    <circle
                      cx="18" cy="18" r="15"
                      fill="none"
                      stroke={config.hex}
                      strokeWidth="3"
                      strokeDasharray={`${(area.avgProgress / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    {area.avgProgress}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>{area.completed}/{area.total} done</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Goal List Grouped by Life Area */}
      {sortedAreas.map((area) => {
        const config = getLifeAreaConfig(area.lifeArea)
        const areaGoals = grouped[area.lifeArea] || []

        return (
          <div key={area.lifeArea}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: config.hex }}
              />
              <h2 className="text-sm font-semibold">{config.name}</h2>
              <span className="text-xs text-muted-foreground">
                {area.completed}/{area.total}
              </span>
            </div>
            <div className="space-y-2">
              {areaGoals.map((goal) => (
                <div key={goal.id} className={goal.parent_goal_id ? "ml-6" : ""}>
                  <GoalCard
                    goal={goal}
                    allGoals={allGoals}
                    variant="compact"
                    onIncrement={onIncrement}
                    onReset={onReset}
                    onEdit={onEdit}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
