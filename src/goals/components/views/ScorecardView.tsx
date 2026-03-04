"use client"

import { useState } from "react"
import { Check, Flame, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { filterScorecardGoals, groupGoalsByLifeArea, getInputMode } from "@/src/goals/goalsService"
import { getPeriodAbbrev } from "@/src/goals/goalDisplayService"
import { LIFE_AREAS, getLifeAreaConfig } from "@/src/goals/data/lifeAreas"
import type { GoalWithProgress } from "@/src/goals/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScorecardViewProps {
  goals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue?: (goalId: string, value: number) => Promise<void>
}

// ---------------------------------------------------------------------------
// ScorecardRow
// ---------------------------------------------------------------------------

function ScorecardRow({
  goal,
  hex,
  onIncrement,
  onSetValue,
}: {
  goal: GoalWithProgress
  hex: string
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onSetValue?: (goalId: string, value: number) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  const isMilestone = goal.goal_type === "milestone"
  const isAutoSynced = !!goal.linked_metric
  const inputMode = getInputMode(goal)

  const handleIncrement = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (inputMode === "boolean" && onSetValue) {
        await onSetValue(goal.id, goal.current_value >= goal.target_value ? 0 : goal.target_value)
      } else {
        await onIncrement(goal.id, 1)
      }
    } finally {
      setBusy(false)
    }
  }

  const progress = Math.min(goal.progress_percentage, 100)

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
      {/* Color dot */}
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: hex }}
      />

      {/* Title */}
      <span className="text-sm truncate min-w-0 flex-1">
        {goal.title}
      </span>

      {/* Streak */}
      {goal.current_streak > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-orange-400 shrink-0">
          <Flame className="size-3" />
          {goal.current_streak}
        </span>
      )}

      {/* Value + period */}
      <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16 text-right">
        {isMilestone ? (
          <>{goal.current_value}&thinsp;&rarr;&thinsp;{goal.target_value}</>
        ) : (
          <>
            {goal.current_value}/{goal.target_value}
            <span className="ml-1 opacity-60">{getPeriodAbbrev(goal.period)}</span>
          </>
        )}
      </span>

      {/* Progress bar */}
      <div className="w-16 shrink-0">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: hex }}
          />
        </div>
      </div>

      {/* Action */}
      <div className="w-16 shrink-0 flex justify-end">
        {isAutoSynced ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground">
            <LinkIcon className="size-2.5 mr-1" />
            Synced
          </Badge>
        ) : inputMode === "boolean" ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 sm:size-7"
            disabled={busy}
            onClick={handleIncrement}
          >
            <Check className="size-3.5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={busy}
            onClick={handleIncrement}
          >
            +1
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScorecardView
// ---------------------------------------------------------------------------

export function ScorecardView({ goals, onIncrement, onSetValue }: ScorecardViewProps) {
  const filtered = filterScorecardGoals(goals)
  const grouped = groupGoalsByLifeArea(filtered)

  // Sort areas by LIFE_AREAS sortOrder, unknown areas at end
  const sortedAreas = Object.keys(grouped).sort((a, b) => {
    const configA = getLifeAreaConfig(a)
    const configB = getLifeAreaConfig(b)
    const orderA = LIFE_AREAS.find((la) => la.id === a)?.sortOrder ?? 999
    const orderB = LIFE_AREAS.find((la) => la.id === b)?.sortOrder ?? 999
    return orderA - orderB
  })

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">No actionable goals.</p>
        <p className="text-xs mt-1">All goals are completed or graduated.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedAreas.map((areaId) => {
        const config = getLifeAreaConfig(areaId)
        const areaGoals = grouped[areaId]
        const completed = areaGoals.filter((g) => g.progress_percentage >= 100).length
        const AreaIcon = config.icon

        return (
          <section key={areaId}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-1 px-3">
              <AreaIcon className="size-4" style={{ color: config.hex }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: config.hex }}>
                {config.name}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {completed}/{areaGoals.length}
              </span>
            </div>

            {/* Goal rows */}
            <div className="divide-y divide-border/50">
              {areaGoals.map((goal) => (
                <ScorecardRow
                  key={goal.id}
                  goal={goal}
                  hex={config.hex}
                  onIncrement={onIncrement}
                  onSetValue={onSetValue}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
