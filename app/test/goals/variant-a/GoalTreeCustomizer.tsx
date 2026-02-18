"use client"

import { useState, useMemo } from "react"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Milestone,
  Repeat,
  Sparkles,
  Trophy,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { generateGoalTreeInserts } from "@/src/goals/treeGenerationService"
import type { BatchGoalInsert } from "@/src/goals/treeGenerationService"
import type { GoalTemplate, GoalDisplayCategory } from "@/src/goals/types"

interface GoalTreeCustomizerProps {
  selectedTemplate: GoalTemplate
  onConfirm: (inserts: BatchGoalInsert[]) => void
  onBack: () => void
  isCreating: boolean
}

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

const CATEGORY_DESCRIPTIONS: Record<GoalDisplayCategory, string> = {
  field_work: "Practice and exposure goals",
  results: "Outcome-based milestones",
  dirty_dog: "Intimate outcome tracking",
  texting: "Text game metrics",
  dates: "Date planning and execution",
  relationship: "Relationship building",
}

const CATEGORY_ICONS: Record<GoalDisplayCategory, string> = {
  field_work: "🏃",
  results: "🎯",
  dirty_dog: "🔥",
  texting: "💬",
  dates: "🗓️",
  relationship: "💑",
}

export function GoalTreeCustomizer({
  selectedTemplate,
  onConfirm,
  onBack,
  isCreating,
}: GoalTreeCustomizerProps) {
  const inserts = useMemo(
    () => generateGoalTreeInserts(selectedTemplate.id),
    [selectedTemplate.id]
  )

  const [enabledIds, setEnabledIds] = useState<Set<string>>(() => {
    return new Set(inserts.map((i) => i._tempId))
  })

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => new Set(["dirty_dog"])
  )

  // Group inserts by level and category
  const rootGoal = inserts.find((i) => !i._tempParentId)
  const l2Goals = inserts.filter((i) => (i.goal_level ?? 0) === 2)
  const l3Goals = inserts.filter((i) => (i.goal_level ?? 0) === 3)

  const l3ByCategory = useMemo(() => {
    const grouped: Partial<Record<GoalDisplayCategory, BatchGoalInsert[]>> = {}
    for (const insert of l3Goals) {
      const cat = (insert.display_category as GoalDisplayCategory) ?? "field_work"
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat]!.push(insert)
    }
    return grouped
  }, [l3Goals])

  const categoryOrder: GoalDisplayCategory[] = [
    "field_work", "results", "dirty_dog", "texting", "dates", "relationship",
  ]

  const enabledCount = enabledIds.size

  const toggleGoal = (tempId: string) => {
    setEnabledIds((prev) => {
      const next = new Set(prev)
      if (next.has(tempId)) {
        next.delete(tempId)
      } else {
        next.add(tempId)
      }
      return next
    })
  }

  const toggleCategory = (category: GoalDisplayCategory) => {
    const goals = l3ByCategory[category] ?? []
    const allEnabled = goals.every((g) => enabledIds.has(g._tempId))
    setEnabledIds((prev) => {
      const next = new Set(prev)
      for (const g of goals) {
        if (allEnabled) {
          next.delete(g._tempId)
        } else {
          next.add(g._tempId)
        }
      }
      return next
    })
  }

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleConfirm = () => {
    const filtered = inserts.filter((i) => enabledIds.has(i._tempId))
    onConfirm(filtered)
  }

  if (isCreating) {
    return (
      <div className="text-center py-20">
        <Loader2 className="size-10 animate-spin text-primary mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-1">Building your goal tree...</h3>
        <p className="text-sm text-muted-foreground">
          Creating {enabledCount} goals with milestones and tracking
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 transition-colors hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          Change goal
        </button>

        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Customize Your Goal Tree</h2>
            <p className="text-sm text-muted-foreground">
              Toggle goals on or off. Your tree, your rules.
            </p>
          </div>
        </div>
      </div>

      {/* Root goal banner */}
      {rootGoal && (
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Your Goal</p>
              <h3 className="text-lg font-bold">{rootGoal.title}</h3>
            </div>
            <Badge variant="outline" className="text-primary border-primary/30">
              {enabledCount} goals selected
            </Badge>
          </div>
        </div>
      )}

      {/* Achievements (L2) */}
      {l2Goals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="size-4 text-amber-500" />
            <h3 className="font-semibold text-sm">Achievements to Unlock</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {l2Goals.map((g) => {
              const isEnabled = enabledIds.has(g._tempId)
              return (
                <button
                  key={g._tempId}
                  onClick={() => toggleGoal(g._tempId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border"
                  style={
                    isEnabled
                      ? {
                          backgroundColor: "rgba(245, 158, 11, 0.1)",
                          borderColor: "rgba(245, 158, 11, 0.3)",
                          color: "rgb(245, 158, 11)",
                        }
                      : {
                          backgroundColor: "transparent",
                          borderColor: "var(--border)",
                          color: "var(--muted-foreground)",
                          opacity: 0.6,
                          textDecoration: "line-through",
                        }
                  }
                  data-testid={`l2-toggle-${g._tempId}`}
                >
                  {isEnabled ? (
                    <Check className="size-3" />
                  ) : (
                    <span className="size-3 rounded-full border border-current" />
                  )}
                  {g.title}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* L3 Goals by Category */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Trackable Goals</h3>

        {categoryOrder.map((cat) => {
          const goals = l3ByCategory[cat]
          if (!goals || goals.length === 0) return null

          const isCollapsed = collapsedCategories.has(cat)
          const enabledInCat = goals.filter((g) => enabledIds.has(g._tempId)).length
          const allEnabled = enabledInCat === goals.length

          return (
            <div
              key={cat}
              className="rounded-xl border border-border overflow-hidden"
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategoryCollapse(cat)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                <div className="flex-1 text-left">
                  <span className="text-sm font-semibold">{CATEGORY_LABELS[cat]}</span>
                  <span className="text-xs text-muted-foreground ml-2">{CATEGORY_DESCRIPTIONS[cat]}</span>
                </div>
                <span className="text-xs text-muted-foreground mr-2">
                  {enabledInCat}/{goals.length}
                </span>
                {isCollapsed ? (
                  <ChevronRight className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
              </button>

              {/* Goals list */}
              {!isCollapsed && (
                <div className="p-2 space-y-1">
                  {goals.map((goal) => {
                    const isEnabled = enabledIds.has(goal._tempId)
                    const isRamp = goal.goal_type === "habit_ramp"

                    return (
                      <button
                        key={goal._tempId}
                        onClick={() => toggleGoal(goal._tempId)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer"
                        style={{
                          backgroundColor: isEnabled ? "rgba(var(--primary-rgb, 59, 130, 246), 0.04)" : "transparent",
                          opacity: isEnabled ? 1 : 0.5,
                        }}
                        data-testid={`l3-toggle-${goal._tempId}`}
                      >
                        {/* Custom checkbox */}
                        <div
                          className="flex-shrink-0 size-5 rounded-md border-2 flex items-center justify-center transition-colors"
                          style={{
                            borderColor: isEnabled ? "var(--primary)" : "var(--border)",
                            backgroundColor: isEnabled ? "var(--primary)" : "transparent",
                          }}
                        >
                          {isEnabled && <Check className="size-3 text-white" />}
                        </div>

                        {/* Goal info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${!isEnabled ? "line-through text-muted-foreground" : ""}`}>
                            {goal.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {isRamp ? (
                              <span className="flex items-center gap-1">
                                <Repeat className="size-3" />
                                Habit Ramp
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Milestone className="size-3" />
                                Milestone
                              </span>
                            )}
                            {goal.linked_metric && (
                              <span className="text-blue-400">Auto-synced</span>
                            )}
                          </div>
                        </div>

                        {/* Target value */}
                        {isEnabled && (
                          <span className="text-xs text-muted-foreground">
                            Target: {goal.target_value}{isRamp ? "/wk" : ""}
                          </span>
                        )}
                      </button>
                    )
                  })}

                  {/* Select all / deselect all */}
                  <div className="flex justify-end px-3 pt-1 pb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCategory(cat)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {allEnabled ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border -mx-6 px-6 py-4 flex items-center gap-3">
        <Button
          onClick={handleConfirm}
          className="flex-1"
          disabled={enabledCount === 0}
          data-testid="confirm-create-goals"
        >
          <Sparkles className="size-4 mr-2" />
          Create {enabledCount} {enabledCount === 1 ? "Goal" : "Goals"}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  )
}
