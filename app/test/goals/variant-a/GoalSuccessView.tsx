"use client"

import { Check, ChevronRight, Milestone, Repeat, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BatchGoalInsert } from "@/src/goals/treeGenerationService"
import type { GoalDisplayCategory } from "@/src/goals/types"

interface GoalSuccessViewProps {
  createdGoals: BatchGoalInsert[]
  onStartOver: () => void
}

const CATEGORY_LABELS: Record<GoalDisplayCategory, string> = {
  field_work: "Field Work",
  results: "Results",
  dirty_dog: "Dirty Dog",
  texting: "Texting Game",
  dates: "Dating",
  relationship: "Relationship",
}

export function GoalSuccessView({ createdGoals, onStartOver }: GoalSuccessViewProps) {
  const rootGoal = createdGoals.find((g) => !g._tempParentId)
  const l2Goals = createdGoals.filter((g) => (g.goal_level ?? 0) === 2)
  const l3Goals = createdGoals.filter((g) => (g.goal_level ?? 0) === 3)

  const categories = new Set(l3Goals.map((g) => g.display_category as GoalDisplayCategory).filter(Boolean))

  return (
    <div className="space-y-6 text-center">
      {/* Success animation */}
      <div className="py-6">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-500/10 mb-4 animate-in fade-in zoom-in duration-500">
          <Check className="size-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Goal Tree Created!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your goals are set up and ready to track. Here is what was created:
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
        <div className="rounded-xl border border-border p-3">
          <p className="text-2xl font-bold text-primary">{createdGoals.length}</p>
          <p className="text-xs text-muted-foreground">Total Goals</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-2xl font-bold text-amber-500">{l2Goals.length}</p>
          <p className="text-xs text-muted-foreground">Achievements</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-2xl font-bold text-green-500">{l3Goals.length}</p>
          <p className="text-xs text-muted-foreground">Trackable Goals</p>
        </div>
      </div>

      {/* Created tree */}
      <div className="text-left max-w-lg mx-auto">
        {rootGoal && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-3">
            <p className="font-bold">{rootGoal.title}</p>
            <p className="text-xs text-muted-foreground mt-1">Your main goal</p>
          </div>
        )}

        {l2Goals.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Trophy className="size-3 text-amber-500" />
              Achievements
            </p>
            <div className="flex flex-wrap gap-1.5">
              {l2Goals.map((g) => (
                <span
                  key={g._tempId}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"
                >
                  <Trophy className="size-3" />
                  {g.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {Array.from(categories).map((cat) => {
          const goals = l3Goals.filter((g) => g.display_category === cat)
          if (goals.length === 0) return null
          return (
            <div key={cat} className="mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="space-y-1">
                {goals.map((g) => (
                  <div
                    key={g._tempId}
                    className="flex items-center gap-2 text-sm rounded-lg border border-border px-3 py-2"
                  >
                    {g.goal_type === "habit_ramp" ? (
                      <Repeat className="size-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Milestone className="size-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="flex-1">{g.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {g.target_value}{g.goal_type === "habit_ramp" ? "/wk" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button onClick={onStartOver} variant="outline">
          <ChevronRight className="size-4 mr-1 rotate-180" />
          Add More Goals
        </Button>
      </div>
    </div>
  )
}
