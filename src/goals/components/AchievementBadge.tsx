"use client"

import { Trophy } from "lucide-react"
import { computeAchievementProgressFromGoals } from "../goalHierarchyService"
import type { GoalWithProgress } from "../types"

interface AchievementBadgeProps {
  achievement: GoalWithProgress
  siblingGoals: GoalWithProgress[]
}

export function AchievementBadge({ achievement, siblingGoals }: AchievementBadgeProps) {
  const { progressPercent } = computeAchievementProgressFromGoals(achievement, siblingGoals)
  const rounded = Math.round(progressPercent)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <Trophy className="size-5 text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{achievement.title}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{rounded}%</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${rounded}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {rounded}% progress
        </p>
      </div>
    </div>
  )
}
