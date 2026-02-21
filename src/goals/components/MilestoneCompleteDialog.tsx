"use client"

import { Button } from "@/components/ui/button"
import { Medal, Calendar, Loader2, TrendingUp, Award } from "lucide-react"
import { deriveTimeHorizon } from "../goalsService"
import { getLifeAreaConfig } from "../data/lifeAreas"
import type { GoalWithProgress, MilestoneCelebrationData, BadgeTier } from "../types"

interface MilestoneCompleteDialogProps {
  goal: GoalWithProgress
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
  celebrationData?: MilestoneCelebrationData | null
}

const TIER_COLORS: Record<BadgeTier, string> = {
  none: "text-muted-foreground",
  bronze: "text-amber-700",
  silver: "text-slate-400",
  gold: "text-yellow-500",
  diamond: "text-cyan-400",
}

const TIER_BG: Record<BadgeTier, string> = {
  none: "",
  bronze: "bg-amber-700/15 border-amber-700/30",
  silver: "bg-slate-400/15 border-slate-400/30",
  gold: "bg-yellow-500/15 border-yellow-500/30",
  diamond: "bg-cyan-400/15 border-cyan-400/30",
}

function MilestoneLadderDots({
  milestoneNumber,
  totalMilestones,
}: {
  milestoneNumber: number
  totalMilestones: number
}) {
  // If more than 12 milestones, show a window around current position
  const maxVisible = 12
  let startIndex = 0
  let endIndex = totalMilestones
  let showLeftEllipsis = false
  let showRightEllipsis = false

  if (totalMilestones > maxVisible) {
    const halfWindow = Math.floor(maxVisible / 2)
    startIndex = Math.max(0, milestoneNumber - halfWindow)
    endIndex = Math.min(totalMilestones, startIndex + maxVisible)
    // Adjust if we're near the end
    if (endIndex - startIndex < maxVisible) {
      startIndex = Math.max(0, endIndex - maxVisible)
    }
    showLeftEllipsis = startIndex > 0
    showRightEllipsis = endIndex < totalMilestones
  }

  const dots: JSX.Element[] = []

  if (showLeftEllipsis) {
    dots.push(
      <span key="left-ellipsis" className="text-muted-foreground text-xs px-0.5">
        ...
      </span>
    )
  }

  for (let i = startIndex; i < endIndex; i++) {
    const stepNumber = i + 1
    const isReached = stepNumber <= milestoneNumber
    const isCurrent = stepNumber === milestoneNumber

    dots.push(
      <span
        key={i}
        className={`rounded-full inline-block transition-all ${
          isCurrent
            ? "w-3 h-3 bg-emerald-500 ring-2 ring-emerald-500/30"
            : isReached
              ? "w-2 h-2 bg-emerald-500"
              : "w-2 h-2 border border-muted-foreground/40 bg-transparent"
        }`}
      />
    )
  }

  if (showRightEllipsis) {
    dots.push(
      <span key="right-ellipsis" className="text-muted-foreground text-xs px-0.5">
        ...
      </span>
    )
  }

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      {dots}
    </div>
  )
}

export function MilestoneCompleteDialog({
  goal,
  isLoading,
  onConfirm,
  onCancel,
  celebrationData,
}: MilestoneCompleteDialogProps) {
  const horizon = deriveTimeHorizon(goal)
  const areaConfig = getLifeAreaConfig(goal.life_area)
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-200">
      <div className="relative bg-card border border-border rounded-2xl p-6 max-w-sm mx-4 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div
          className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${areaConfig.hex}20`, color: areaConfig.hex }}
        >
          <Medal className="size-7" />
        </div>

        <h3 className="text-lg font-bold mb-1">Complete this goal?</h3>

        <p className="text-base font-medium text-foreground mb-3">{goal.title}</p>

        {/* Celebration data display */}
        {celebrationData ? (
          <div className="space-y-3 mb-5">
            {/* Milestone number */}
            <p className="text-sm text-muted-foreground">
              Milestone {celebrationData.milestoneNumber} of {celebrationData.totalMilestones}
            </p>

            {/* Value achieved */}
            <p className="text-sm font-medium text-foreground">
              Reached {celebrationData.milestoneValue}
            </p>

            {/* Milestone ladder visualization */}
            <MilestoneLadderDots
              milestoneNumber={celebrationData.milestoneNumber}
              totalMilestones={celebrationData.totalMilestones}
            />

            {/* Projected next */}
            {celebrationData.projectedNext && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-sky-400">
                <TrendingUp className="size-3" />
                <span>Next milestone: {celebrationData.projectedNext}</span>
              </div>
            )}

            {/* Tier upgrade callout */}
            {celebrationData.badgeTierUpgrade && (
              <div
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${TIER_BG[celebrationData.badgeTierUpgrade.newTier]}`}
              >
                <Award className={`size-4 ${TIER_COLORS[celebrationData.badgeTierUpgrade.newTier]}`} />
                <span className={TIER_COLORS[celebrationData.badgeTierUpgrade.newTier]}>
                  Achievement Unlocked: {celebrationData.badgeTierUpgrade.badgeTitle} →{" "}
                  {celebrationData.badgeTierUpgrade.newTier.charAt(0).toUpperCase() +
                    celebrationData.badgeTierUpgrade.newTier.slice(1)}!
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Fallback: original simple display */
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mb-5">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {horizon} goal
            </span>
            {daysSinceCreation > 0 && (
              <span>{daysSinceCreation} days in progress</span>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
            disabled={isLoading}
            style={{ backgroundColor: areaConfig.hex }}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <Medal className="size-4 mr-1" />
            )}
            Complete
          </Button>
        </div>
      </div>
    </div>
  )
}
