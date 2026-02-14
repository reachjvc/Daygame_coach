"use client"

import { useMemo } from "react"
import { Target } from "lucide-react"
import { AchievementBadge } from "./AchievementBadge"
import { GoalCategorySection } from "./GoalCategorySection"
import { GoalCard } from "./GoalCard"
import { groupGoalsByHierarchy } from "../goalHierarchyService"
import type { GoalWithProgress, GoalDisplayCategory } from "../types"

const CATEGORY_ORDER: GoalDisplayCategory[] = ["field_work", "results", "dirty_dog"]

interface GoalHierarchyViewProps {
  goals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue: (goalId: string, value: number) => Promise<void>
  onComplete?: (goal: GoalWithProgress) => void
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onAddChild?: (parentGoal: GoalWithProgress) => void
  isCustomizeMode?: boolean
  onGoalToggle?: (goalId: string, active: boolean) => Promise<void>
}

export function GoalHierarchyView({
  goals,
  onIncrement,
  onSetValue,
  onComplete,
  onReset,
  onEdit,
  onAddChild,
  isCustomizeMode = false,
  onGoalToggle,
}: GoalHierarchyViewProps) {
  const { sections, customGoals } = useMemo(
    () => groupGoalsByHierarchy(goals),
    [goals]
  )

  // Collect all L3 goals across all sections for achievement progress
  const allL3Goals = useMemo(() => goals.filter((g) => g.goal_level === 3), [goals])

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        // L3 goals that belong to this section's achievements
        const sectionL3s = allL3Goals.filter((g) => {
          const achievementIds = new Set(section.achievements.map((a) => a.id))
          return g.parent_goal_id && achievementIds.has(g.parent_goal_id)
        })

        return (
          <div key={section.l1Goal.id} className="space-y-5">
            {/* L1 Goal Header */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Target className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{section.l1Goal.title}</h2>
                {section.l1Goal.description && (
                  <p className="text-sm text-muted-foreground">{section.l1Goal.description}</p>
                )}
              </div>
            </div>

            {/* Achievement Badges */}
            {section.achievements.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {section.achievements.map((ach) => (
                  <AchievementBadge
                    key={ach.id}
                    achievement={ach}
                    siblingGoals={sectionL3s}
                  />
                ))}
              </div>
            )}

            {/* Goal Categories */}
            <div className="space-y-4">
              {CATEGORY_ORDER.map((cat) => {
                const catGoals = section.categories[cat]
                if (!catGoals || catGoals.length === 0) return null
                return (
                  <GoalCategorySection
                    key={cat}
                    category={cat}
                    goals={catGoals}
                    allGoals={goals}
                    defaultCollapsed={cat === "dirty_dog"}
                    isCustomizeMode={isCustomizeMode}
                    onIncrement={onIncrement}
                    onSetValue={onSetValue}
                    onComplete={onComplete}
                    onReset={onReset}
                    onEdit={onEdit}
                    onAddChild={onAddChild}
                    onGoalToggle={onGoalToggle}
                  />
                )
              })}

              {/* Uncategorized L3 goals */}
              {section.uncategorized.length > 0 && (
                <div className="space-y-2">
                  {section.uncategorized.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      allGoals={goals}
                      onIncrement={onIncrement}
                      onSetValue={onSetValue}
                      onComplete={onComplete}
                      onReset={onReset}
                      onEdit={onEdit}
                      onAddChild={onAddChild}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Custom / Legacy Goals */}
      {customGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Custom Goals</h3>
          <div className="space-y-2">
            {customGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                allGoals={goals}
                onIncrement={onIncrement}
                onSetValue={onSetValue}
                onComplete={onComplete}
                onReset={onReset}
                onEdit={onEdit}
                onAddChild={onAddChild}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
