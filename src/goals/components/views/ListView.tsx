"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Flame, Calendar, Plus } from "lucide-react"
import { GoalIcon } from "@/components/ui/GoalIcon"
import { getLifeAreaConfig } from "../../data/lifeAreas"
import { deriveTimeHorizon } from "../../goalsService"
import type { GoalWithProgress } from "../../types"

interface ListViewProps {
  goals: GoalWithProgress[]
  allGoals: GoalWithProgress[]
  onIncrement: (goalId: string, amount: number) => Promise<void>
  onReset: (goalId: string) => Promise<void>
  onEdit: (goal: GoalWithProgress) => void
  onCreateGoal?: () => void
  filterAreaName?: string | null
}

const SHORT_NAMES: Record<string, string> = {
  "Health & Fitness": "Health",
  "Career & Business": "Career",
  "Personal Growth": "Growth",
  "Dating & Relationships": "Dating",
  "Mindfulness & Spirituality": "Mindful",
  "Education & Skills": "Education",
  "Social Life": "Social",
}

type SortKey = "title" | "life_area" | "progress" | "streak" | "period"
type SortDir = "asc" | "desc"

export function ListView({ goals, allGoals, onIncrement, onReset, onEdit, onCreateGoal, filterAreaName }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("life_area")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = useMemo(() => {
    const arr = [...goals]
    const dir = sortDir === "asc" ? 1 : -1

    arr.sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title) * dir
        case "life_area":
          return a.life_area.localeCompare(b.life_area) * dir
        case "progress":
          return (a.progress_percentage - b.progress_percentage) * dir
        case "streak":
          return (a.current_streak - b.current_streak) * dir
        case "period": {
          const aPeriod = a.goal_type === "milestone" ? "zzz_milestone" : (a.period || "zzz")
          const bPeriod = b.goal_type === "milestone" ? "zzz_milestone" : (b.period || "zzz")
          return aPeriod.localeCompare(bPeriod) * dir
        }
        default:
          return 0
      }
    })

    return arr
  }, [goals, sortKey, sortDir])

  if (goals.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <GoalIcon className="size-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {filterAreaName ? `No ${filterAreaName} goals` : "No goals yet"}
        </h3>
        <p className="text-muted-foreground text-sm mb-4">
          {filterAreaName
            ? `Create a goal in ${filterAreaName} to see it here.`
            : "Create your first goal to start tracking progress."
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

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      {label}
      <ArrowUpDown className={`size-3 ${sortKey === field ? "text-primary" : ""}`} />
    </button>
  )

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_100px_80px_80px_80px_60px] gap-2 px-3 py-2 bg-muted/30 border-b text-xs">
        <SortHeader label="Goal" field="title" />
        <SortHeader label="Life Area" field="life_area" />
        <span className="text-xs font-medium text-muted-foreground">Type</span>
        <SortHeader label="Progress" field="progress" />
        <SortHeader label="Streak" field="streak" />
        <span className="text-xs font-medium text-muted-foreground">Time</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {sorted.map((goal) => {
          const config = getLifeAreaConfig(goal.life_area)
          const Icon = config.icon
          const horizon = deriveTimeHorizon(goal)
          const shortName = SHORT_NAMES[config.name] ?? config.name

          return (
            <div
              key={goal.id}
              className="group grid grid-cols-[1fr_100px_80px_80px_80px_60px] gap-2 px-3 py-2 items-center hover:bg-accent/30 transition-colors cursor-pointer"
              onClick={() => onEdit(goal)}
              title="Click to edit"
            >
              {/* Title */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.hex }}
                />
                <span className="text-sm truncate group-hover:underline">{goal.title}</span>
                {goal.is_complete && (
                  <Badge variant="outline" className="text-[10px] py-0 h-4 bg-green-500/10 text-green-600 border-green-500/30 flex-shrink-0">
                    Done
                  </Badge>
                )}
              </div>

              {/* Life Area */}
              <Badge
                variant="outline"
                className="text-[10px] gap-1 py-0 h-5 border-transparent w-fit truncate max-w-[96px]"
                style={{ backgroundColor: `${config.hex}15`, color: config.hex }}
              >
                <Icon className="size-2.5 flex-shrink-0" />
                {shortName}
              </Badge>

              {/* Type + Period */}
              <span className="text-xs text-muted-foreground capitalize">
                {goal.goal_type === "recurring" ? goal.period : "Milestone"}
              </span>

              {/* Progress */}
              <div className="flex items-center gap-1.5">
                <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${goal.progress_percentage}%`, backgroundColor: config.hex }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{goal.progress_percentage}%</span>
              </div>

              {/* Streak */}
              <span className="text-xs text-muted-foreground">
                {goal.current_streak > 0 ? (
                  <span className="flex items-center gap-1">
                    <Flame className="size-3 text-orange-500" />
                    {goal.current_streak}
                  </span>
                ) : (
                  "—"
                )}
              </span>

              {/* Time horizon */}
              <span className={`text-[10px] ${goal.days_remaining !== null && goal.days_remaining <= 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {goal.days_remaining !== null && goal.days_remaining <= 0 ? (
                  "Overdue"
                ) : goal.days_remaining !== null && goal.days_remaining > 0 ? (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="size-2.5" />
                    {goal.days_remaining}d
                  </span>
                ) : (
                  horizon.replace("This ", "")
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
