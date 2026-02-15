"use client"

import { useMemo } from "react"
import { CircleDot, Clock, Plus, Star, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AchievementBadge } from "./AchievementBadge"
import { GoalCategorySection } from "./GoalCategorySection"
import { GoalCard } from "./GoalCard"
import { groupGoalsByHierarchy } from "../goalHierarchyService"
import { computeProjectedDate, getNextMilestoneInfo } from "../goalsService"
import type { ProjectedDateInfo } from "../goalsService"
import type { GoalWithProgress, GoalDisplayCategory } from "../types"

const CATEGORY_ORDER: GoalDisplayCategory[] = ["field_work", "results", "dirty_dog", "texting", "dates", "relationship"]

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
  onDeleteGoal?: (goalId: string) => Promise<void>
  onDeleteAllGoals?: () => Promise<void>
  onReorder?: (goalIds: string[]) => Promise<void>
  onAddDirtyDogGoals?: () => void
  isAddingDirtyDog?: boolean
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
  onDeleteGoal,
  onDeleteAllGoals,
  onReorder,
  onAddDirtyDogGoals,
  isAddingDirtyDog = false,
}: GoalHierarchyViewProps) {
  const { sections, customGoals } = useMemo(
    () => groupGoalsByHierarchy(goals),
    [goals]
  )

  // Collect all L3 goals across all sections for achievement progress
  const allL3Goals = useMemo(() => goals.filter((g) => g.goal_level === 3), [goals])

  // Compute date projections for all goals
  const projectionMap = useMemo(() => {
    const map = new Map<string, ProjectedDateInfo>()
    for (const goal of goals) {
      const projection = computeProjectedDate(goal)
      if (projection) map.set(goal.id, projection)
    }
    return map
  }, [goals])

  // Compute next milestone info for all goals
  const milestoneMap = useMemo(() => {
    const map = new Map<string, { nextValue: number; remaining: number }>()
    for (const goal of goals) {
      const info = getNextMilestoneInfo(goal)
      if (info) map.set(goal.id, info)
    }
    return map
  }, [goals])

  return (
    <div className="space-y-8">
      {/* Delete All button — only in customize mode */}
      {isCustomizeMode && onDeleteAllGoals && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Drag to reorder. Toggle to show/hide. Trash to permanently delete.
          </p>
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
        </div>
      )}

      {/* L0 dream goal context banner */}
      {goals.filter(g => g.goal_level === 0).map(dream => (
        <div key={dream.id} className="flex items-center gap-2 text-sm text-muted-foreground italic">
          <Star className="size-4 text-amber-400" />
          {dream.title}
        </div>
      ))}

      {sections.map((section) => {
        // L3 goals that belong to this section's achievements
        const sectionL3s = allL3Goals.filter((g) => {
          const achievementIds = new Set(section.achievements.map((a) => a.id))
          return g.parent_goal_id && achievementIds.has(g.parent_goal_id)
        })

        // Filter out achievements with 0 L3 children
        const achievementsWithChildren = section.achievements.filter((ach) =>
          sectionL3s.some((g) => g.parent_goal_id === ach.id)
        )

        return (
          <div key={section.l1Goal.id} className="space-y-5">
            {/* L1 Goal Header */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <CircleDot className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">{section.l1Goal.title}</h2>
                {section.l1Goal.description && (
                  <p className="text-sm text-muted-foreground">{section.l1Goal.description}</p>
                )}
              </div>
            </div>

            {/* Achievement Badges */}
            {achievementsWithChildren.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {achievementsWithChildren.map((ach) => (
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

                // Collect projections for this category's goals
                const catProjections = catGoals
                  .map((g) => ({ goal: g, projection: projectionMap.get(g.id) }))
                  .filter((p): p is { goal: GoalWithProgress; projection: ProjectedDateInfo } => !!p.projection)

                return (
                  <div key={cat}>
                    <GoalCategorySection
                      category={cat}
                      goals={catGoals}
                      allGoals={goals}
                      defaultCollapsed={cat === "dirty_dog"}
                      isCustomizeMode={isCustomizeMode}
                      projections={projectionMap}
                      milestones={milestoneMap}
                      onIncrement={onIncrement}
                      onSetValue={onSetValue}
                      onComplete={onComplete}
                      onReset={onReset}
                      onEdit={onEdit}
                      onAddChild={onAddChild}
                      onGoalToggle={onGoalToggle}
                      onDeleteGoal={onDeleteGoal}
                      onReorder={onReorder}
                    />

                    {/* Projected timeline summary */}
                    {catProjections.length > 0 && (
                      <div className="mt-2 ml-5 rounded-md border border-border/50 bg-muted/30 p-3">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                          <Clock className="size-3" />
                          Projected Timeline
                        </p>
                        <div className="space-y-1">
                          {catProjections.map(({ goal, projection }) => (
                            <p key={goal.id} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/80">{goal.title}:</span>{" "}
                              {projection.finalLabel ?? projection.nextLabel}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Dirty Dog opt-in placeholder */}
              {(!section.categories.dirty_dog || section.categories.dirty_dog.length === 0) && onAddDirtyDogGoals && (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Dirty Dog Goals
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Track intimate outcomes like kiss closes, lays, and rotation. Opt in if relevant to your goals.
                  </p>
                  <ul className="text-xs text-muted-foreground mb-3 space-y-0.5 list-disc list-inside">
                    <li>Kiss Closes (milestone: 1 → 15)</li>
                    <li>Lays (milestone: 1 → 10)</li>
                    <li>Rotation Size (milestone: 1 → 3)</li>
                    <li>Sustained Rotation (habit ramp: 1 → 6 months)</li>
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddDirtyDogGoals}
                    disabled={isAddingDirtyDog}
                  >
                    <Plus className="size-3.5 mr-1" />
                    {isAddingDirtyDog ? "Adding..." : "Add Goals"}
                  </Button>
                </div>
              )}

              {/* Uncategorized L3 goals */}
              {section.uncategorized.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Other Goals
                  </h3>
                  {section.uncategorized.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      allGoals={goals}
                      nextMilestone={milestoneMap.get(goal.id) ?? null}
                      projectedDate={projectionMap.get(goal.id) ?? null}
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

      {sections.length === 0 && customGoals.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No goal hierarchies yet.</p>
          <p className="text-xs mt-1">Create a goal or browse the catalog to get started.</p>
        </div>
      )}

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
                nextMilestone={milestoneMap.get(goal.id) ?? null}
                projectedDate={projectionMap.get(goal.id) ?? null}
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
