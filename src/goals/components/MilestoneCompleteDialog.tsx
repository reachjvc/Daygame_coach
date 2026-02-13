"use client"

import { Button } from "@/components/ui/button"
import { Trophy, Calendar, Loader2 } from "lucide-react"
import { deriveTimeHorizon } from "../goalsService"
import { getLifeAreaConfig } from "../data/lifeAreas"
import type { GoalWithProgress } from "../types"

interface MilestoneCompleteDialogProps {
  goal: GoalWithProgress
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function MilestoneCompleteDialog({
  goal,
  isLoading,
  onConfirm,
  onCancel,
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
          <Trophy className="size-7" />
        </div>

        <h3 className="text-lg font-bold mb-1">Complete this goal?</h3>

        <p className="text-base font-medium text-foreground mb-3">{goal.title}</p>

        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mb-5">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {horizon} goal
          </span>
          {daysSinceCreation > 0 && (
            <span>{daysSinceCreation} days in progress</span>
          )}
        </div>

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
              <Trophy className="size-4 mr-1" />
            )}
            Complete
          </Button>
        </div>
      </div>
    </div>
  )
}
