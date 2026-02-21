"use client"

import { Trophy } from "lucide-react"
import { computeAchievementProgressFromGoals } from "../goalHierarchyService"
import { progressToTier } from "../badgeEngineService"
import type { GoalWithProgress, BadgeTier } from "../types"

const TIER_COLORS: Record<BadgeTier, { border: string; bg: string; icon: string; bar: string }> = {
  none: { border: "border-gray-500/20", bg: "bg-gray-500/5", icon: "text-gray-500", bar: "bg-gray-500" },
  bronze: { border: "border-amber-700/20", bg: "bg-amber-700/5", icon: "text-amber-700", bar: "bg-amber-700" },
  silver: { border: "border-slate-400/20", bg: "bg-slate-400/5", icon: "text-slate-400", bar: "bg-slate-400" },
  gold: { border: "border-yellow-500/20", bg: "bg-yellow-500/5", icon: "text-yellow-500", bar: "bg-yellow-500" },
  diamond: { border: "border-cyan-400/20", bg: "bg-cyan-400/5", icon: "text-cyan-400", bar: "bg-cyan-400" },
}

interface AchievementBadgeProps {
  achievement: GoalWithProgress
  siblingGoals: GoalWithProgress[]
}

export function AchievementBadge({ achievement, siblingGoals }: AchievementBadgeProps) {
  const { progressPercent } = computeAchievementProgressFromGoals(achievement, siblingGoals)
  const rounded = Math.round(progressPercent)
  const tier = progressToTier(rounded)

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border ${TIER_COLORS[tier].border} ${TIER_COLORS[tier].bg} px-4 py-3`}
      style={{
        ...(tier === "gold" ? { boxShadow: "0 0 12px rgba(234, 179, 8, 0.15)" } : {}),
        ...(tier === "diamond" ? { boxShadow: "0 0 12px rgba(34, 211, 238, 0.2)" } : {}),
      }}
    >
      <Trophy className={`size-5 ${TIER_COLORS[tier].icon} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{achievement.title}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{rounded}%</span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${TIER_COLORS[tier].bar} transition-all duration-500`}
            style={{ width: `${rounded}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {tier !== "none" ? (
            <>{rounded}% &bull; <span className={`text-[10px] font-semibold uppercase ${TIER_COLORS[tier].icon}`}>{tier}</span></>
          ) : (
            <>{rounded}% progress</>
          )}
        </p>
      </div>
    </div>
  )
}
