"use client"

import { cn } from "@/lib/utils"
import type { SessionAchievement } from "@/src/db/trackingTypes"
import { getTierColor } from "@/src/tracking/data/milestones"

interface SessionAchievementStackProps {
  achievements: SessionAchievement[]
  maxVisible?: number
}

export function SessionAchievementStack({
  achievements,
  maxVisible = 3,
}: SessionAchievementStackProps) {
  if (achievements.length === 0) return null

  const visible = achievements.slice(0, maxVisible)
  const remaining = achievements.length - maxVisible

  return (
    <div className="flex items-center -space-x-2" title={achievements.map(a => a.label).join(", ")}>
      {visible.map((achievement, index) => (
        <div
          key={achievement.milestone_type}
          className={cn(
            "relative size-6 rounded-full flex items-center justify-center",
            "bg-gradient-to-br shadow-sm border-2 border-background",
            getTierColor(achievement.tier),
            // Fade effect: decreasing opacity for stacked items
            index === 1 && "opacity-80",
            index >= 2 && "opacity-60"
          )}
          style={{ zIndex: maxVisible - index }}
          title={achievement.label}
        >
          <span className="text-xs">{achievement.emoji}</span>
        </div>
      ))}
      {remaining > 0 && (
        <div
          className="relative size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-background"
          style={{ zIndex: 0 }}
          title={`${remaining} more achievements`}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
