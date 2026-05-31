"use client"

import { X, Plus, Minus, Pencil, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import type { GoalWithProgress, CoreValueRoot } from "../../types"

interface NodeDetailPanelProps {
  goal: GoalWithProgress
  roots: CoreValueRoot[] | null
  alignedValues: string[]
  onClose: () => void
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
}

export function NodeDetailPanel({
  goal,
  roots,
  alignedValues,
  onClose,
  onIncrement,
  onEdit,
}: NodeDetailPanelProps) {
  const areaConfig = getLifeAreaConfig(goal.life_area || "custom")
  const progressPct = goal.progress_percentage

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: areaConfig.hex }}
          />
          <span className="text-sm font-medium truncate">{goal.title}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Progress</span>
            <span className="text-sm font-mono tabular-nums">
              {goal.current_value}/{goal.target_value}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: areaConfig.hex,
              }}
            />
          </div>
          <div className="text-right mt-1">
            <span className="text-xs text-muted-foreground">{progressPct}%</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          {goal.tracking_type === "counter" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={() => onIncrement(goal.id, -1)}
                disabled={goal.current_value <= 0}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1"
                style={{ backgroundColor: areaConfig.hex }}
                onClick={() => onIncrement(goal.id, 1)}
                disabled={goal.is_complete}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Increment</span>
              </Button>
            </>
          )}
          {goal.tracking_type === "boolean" && (
            <Button
              size="sm"
              className="flex-1"
              style={{ backgroundColor: goal.is_complete ? undefined : areaConfig.hex }}
              variant={goal.is_complete ? "outline" : "default"}
              onClick={() => onIncrement(goal.id, goal.is_complete ? -1 : 1)}
            >
              {goal.is_complete ? "Undo" : "Complete"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            onClick={() => onEdit(goal)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Streak */}
        {goal.current_streak > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-400">
              {goal.current_streak} day streak
            </span>
            {goal.best_streak > goal.current_streak && (
              <span className="text-xs text-muted-foreground ml-auto">
                Best: {goal.best_streak}
              </span>
            )}
          </div>
        )}

        {/* Period & Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Period</span>
            <span className="text-sm font-medium capitalize">{goal.period}</span>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Type</span>
            <span className="text-sm font-medium capitalize">{goal.goal_type.replace(/_/g, " ")}</span>
          </div>
        </div>

        {/* Phase */}
        {goal.goal_phase && (
          <div className="p-3 rounded-lg bg-muted/30">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Phase</span>
            <span className="text-sm font-medium capitalize">
              {goal.goal_phase === "acquisition" ? "Learning" : goal.goal_phase === "consolidation" ? "Consolidating" : "Graduated"}
            </span>
          </div>
        )}

        {/* Root connections (values alignment) */}
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
            Rooted in
          </span>
          {alignedValues.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {alignedValues.map((valueId) => {
                const root = roots?.find((r) => r.id === valueId)
                return (
                  <span
                    key={valueId}
                    className="px-2 py-1 rounded-md text-xs font-medium bg-amber-900/30 border border-amber-700/30 text-amber-300"
                  >
                    {valueId.replace(/-/g, " ")}
                    {root && <span className="ml-1 opacity-50">#{root.rank}</span>}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Not connected to any values yet. Edit this goal to add root connections.
            </p>
          )}
        </div>

        {/* Motivation note */}
        {goal.motivation_note && (
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Why this matters
            </span>
            <p className="text-sm text-foreground/80 italic">
              &ldquo;{goal.motivation_note}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
