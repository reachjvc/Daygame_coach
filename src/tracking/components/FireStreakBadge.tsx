"use client"

import { Flame } from "lucide-react"
import type { FireStreakBadgeProps } from "../types"

const STREAK_TIERS = [
  { min: 52, label: "One Year" },
  { min: 26, label: "Legend" },
  { min: 12, label: "Unstoppable" },
  { min: 8, label: "On Fire" },
  { min: 4, label: "Consistent" },
] as const

export function getStreakTierLabel(streak: number): string | null {
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.min) return tier.label
  }
  return null
}

/**
 * Strava-style fire streak badge. Only renders when streak >= 2.
 */
export function FireStreakBadge({ streak, bestStreak, variant = "pill" }: FireStreakBadgeProps) {
  if (streak < 2) return null

  const tierLabel = getStreakTierLabel(streak)
  const shouldPulse = streak >= 8

  if (variant === "pill") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-orange-500">
        <Flame className={`size-4 ${shouldPulse ? "animate-pulse-ring" : ""}`} />
        <span className="text-sm font-semibold">{streak} week streak</span>
      </div>
    )
  }

  // Card variant — milestone-style
  return (
    <div className="flex items-center gap-3 rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3">
      <div className={`relative size-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shrink-0 ${shouldPulse ? "animate-pulse-ring" : ""}`}>
        <Flame className="size-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-orange-500">
          {streak} week streak
        </div>
        {tierLabel && (
          <div className="text-xs text-orange-400/80">{tierLabel}</div>
        )}
      </div>
      {bestStreak != null && bestStreak > streak && (
        <div className="text-right text-xs text-muted-foreground">
          Best: {bestStreak} wks
        </div>
      )}
    </div>
  )
}
