"use client"

import { TrendingUp, Clock } from "lucide-react"
import { getMilestoneLadderValues, computeProjectedDate, computePacing } from "../goalsService"
import type { GoalWithProgress } from "../types"

interface ProjectionTimelineProps {
  goal: GoalWithProgress
}

function PacingBadge({ status }: { status: "ahead" | "on-pace" | "behind" }) {
  const styles = {
    ahead: "bg-green-500/15 text-green-400 border-green-500/30",
    "on-pace": "bg-amber-500/15 text-amber-400 border-amber-500/30",
    behind: "bg-red-500/15 text-red-400 border-red-500/30",
  }

  const labels = {
    ahead: "Ahead",
    "on-pace": "On pace",
    behind: "Behind",
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${styles[status]}`}
    >
      <TrendingUp className="size-3" />
      {labels[status]}
    </span>
  )
}

export function ProjectionTimeline({ goal }: ProjectionTimelineProps) {
  if (!goal.milestone_config) return null

  const ladderValues = getMilestoneLadderValues(goal)
  if (!ladderValues || ladderValues.length === 0) return null

  const projectedDate = computeProjectedDate(goal)
  const pacing = computePacing(goal)

  return (
    <div className="space-y-2">
      {/* Milestone ladder visualization */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {ladderValues.map((value, index) => {
          const reached = goal.current_value >= value
          const isNext =
            !reached &&
            (index === 0 || goal.current_value >= ladderValues[index - 1])

          return (
            <div key={value} className="flex flex-col items-center gap-0.5">
              <span
                className={`rounded-full inline-block transition-all ${
                  reached
                    ? "w-2.5 h-2.5 bg-emerald-500"
                    : isNext
                      ? "w-3 h-3 border-2 border-emerald-500/50 bg-transparent"
                      : "w-2 h-2 border border-muted-foreground/30 bg-transparent"
                }`}
              />
              {/* Show value label for reached, next, and last milestone */}
              {(reached || isNext || index === ladderValues.length - 1) && (
                <span
                  className={`text-[9px] leading-none ${
                    reached
                      ? "text-emerald-400"
                      : isNext
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {value}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Projected dates and pacing */}
      <div className="flex items-center gap-3 flex-wrap">
        {projectedDate?.nextLabel && (
          <span className="flex items-center gap-1 text-xs text-sky-400">
            <Clock className="size-3" />
            Next: {projectedDate.nextLabel}
          </span>
        )}
        {projectedDate?.finalLabel && projectedDate.finalLabel !== projectedDate.nextLabel && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Final: {projectedDate.finalLabel}
          </span>
        )}
        {pacing && <PacingBadge status={pacing.status} />}
      </div>
    </div>
  )
}
