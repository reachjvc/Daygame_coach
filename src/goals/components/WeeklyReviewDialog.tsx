"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Calendar, TrendingUp, TrendingDown, Minus, Trophy, Award, X } from "lucide-react"
import type { WeeklyReviewData, BadgeTier } from "../types"

interface WeeklyReviewDialogProps {
  isOpen: boolean
  onClose: () => void
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

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e"
  if (score >= 60) return "#0d9488"
  if (score >= 40) return "#f59e0b"
  return "#ef4444"
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  const startMonth = monthNames[monday.getMonth()]
  const endMonth = monthNames[sunday.getMonth()]
  const startDay = monday.getDate()
  const endDay = sunday.getDate()
  const year = monday.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} \u2013 ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}, ${year}`
}

function isEmptyReview(data: WeeklyReviewData): boolean {
  return (
    data.overallMomentumScore === 0 &&
    data.goalsCompleted === 0 &&
    data.goalsTotal === 0 &&
    data.bestDay === null &&
    data.worstDay === null &&
    data.milestonesHit === 0 &&
    data.goalMomentum.length === 0 &&
    data.tierUpgrades.length === 0 &&
    data.phaseTransitions.length === 0
  )
}

export function WeeklyReviewDialog({ isOpen, onClose }: WeeklyReviewDialogProps) {
  const [data, setData] = useState<WeeklyReviewData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monday = useMemo(() => getMonday(new Date()), [])

  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    setError(null)
    setData(null)

    const weekStart = monday.toISOString().split("T")[0]

    fetch(`/api/goals/weekly-review-data?week_start=${weekStart}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch review data")
        return res.json()
      })
      .then((json: WeeklyReviewData) => {
        setData(json)
      })
      .catch(() => {
        setError("Couldn't load review data")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen, monday])

  if (!isOpen) return null

  // SVG ring dimensions
  const size = 80
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const scoreValue = data?.overallMomentumScore ?? 0
  const offset = circumference - (scoreValue / 100) * circumference
  const ringColor = getScoreColor(scoreValue)

  const dateRange = formatDateRange(monday)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative bg-card border border-border rounded-2xl p-6 max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Close X */}
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="text-lg font-bold mb-1">Week in Review</h3>
          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="size-3.5" />
            <span>{dateRange}</span>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {/* Empty state */}
        {data && !isLoading && !error && isEmptyReview(data) && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              Not enough data for a review yet
            </p>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {/* Data display */}
        {data && !isLoading && !error && !isEmptyReview(data) && (
          <div className="space-y-5">
            {/* Momentum score ring */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <svg width={size} height={size} className="-rotate-90">
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/30"
                  />
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{scoreValue}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Momentum Score
                <span className="text-xs text-muted-foreground/60 ml-1">(inputs weighted higher)</span>
              </p>
            </div>

            {/* Completion rate */}
            <div className="text-center text-sm text-foreground">
              <span className="font-medium">{data.goalsCompleted}</span>{" "}
              of{" "}
              <span className="font-medium">{data.goalsTotal}</span>{" "}
              goals completed
            </div>

            {/* Best / worst day */}
            {(data.bestDay || data.worstDay) && (
              <div className="flex justify-center gap-6 text-sm">
                {data.bestDay && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Best day</p>
                    <p className="font-medium text-green-500">{data.bestDay}</p>
                  </div>
                )}
                {data.worstDay && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Worst day</p>
                    <p className="font-medium text-red-400">{data.worstDay}</p>
                  </div>
                )}
              </div>
            )}

            {/* Per-goal momentum */}
            {data.goalMomentum.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Per-Goal Momentum
                </p>
                <div className="space-y-2">
                  {data.goalMomentum.map((gm) => (
                    <div
                      key={gm.goalId}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate flex-1 text-foreground flex items-center gap-1.5">
                        {gm.title}
                        {gm.goalNature === "input" && (
                          <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25 flex-shrink-0">
                            Leading
                          </span>
                        )}
                        {gm.goalNature === "outcome" && (
                          <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25 flex-shrink-0">
                            Lagging
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground font-medium tabular-nums">
                        {gm.completionRate}%
                      </span>
                      {gm.trend === "improving" && (
                        <span className="flex items-center gap-0.5 text-green-500 text-xs">
                          <TrendingUp className="size-3.5" />
                          improving
                        </span>
                      )}
                      {gm.trend === "stable" && (
                        <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
                          <Minus className="size-3.5" />
                          stable
                        </span>
                      )}
                      {gm.trend === "declining" && (
                        <span className="flex items-center gap-0.5 text-red-400 text-xs">
                          <TrendingDown className="size-3.5" />
                          declining
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones hit */}
            {data.milestonesHit > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                <Trophy className="size-4 text-yellow-500" />
                <span>
                  <span className="font-medium">{data.milestonesHit}</span>{" "}
                  {data.milestonesHit === 1 ? "milestone" : "milestones"} hit this week
                </span>
              </div>
            )}

            {/* Tier upgrades */}
            {data.tierUpgrades.length > 0 && (
              <div className="space-y-2">
                {data.tierUpgrades.map((upgrade) => (
                  <div
                    key={upgrade.badgeId}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${TIER_BG[upgrade.newTier]}`}
                  >
                    <Award className={`size-4 ${TIER_COLORS[upgrade.newTier]}`} />
                    <span className={TIER_COLORS[upgrade.newTier]}>
                      Achievement: {upgrade.badgeTitle} →{" "}
                      {upgrade.newTier.charAt(0).toUpperCase() +
                        upgrade.newTier.slice(1)}!
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Phase transitions */}
            {data.phaseTransitions.length > 0 && (
              <div className="space-y-2">
                {data.phaseTransitions.map((pt) => {
                  const prevLabel = pt.previousPhase === "consolidation" ? "Consolidating"
                    : pt.previousPhase === "graduated" ? "Graduated"
                    : "Learning"
                  const newLabel = pt.newPhase === "graduated" ? "Graduated!"
                    : pt.newPhase === "consolidation" ? "Consolidating"
                    : "Learning"
                  const isPromotion = pt.newPhase === "graduated" || (pt.newPhase === "consolidation" && pt.previousPhase !== "graduated")
                  return (
                    <div
                      key={pt.goalId}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${
                        isPromotion
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                      }`}
                    >
                      <span>{pt.goalTitle}: {prevLabel} → {newLabel}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Close button */}
            <div className="pt-1">
              <Button variant="ghost" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
