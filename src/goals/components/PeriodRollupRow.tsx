"use client"

import { CheckCircle2, TrendingUp, Calendar } from "lucide-react"
import type { GoalWithProgress, GoalPeriodStats } from "../types"

type RollupMode = "completion" | "delta" | "deadline"

interface PeriodRollupRowProps {
  goal: GoalWithProgress
  stats: GoalPeriodStats | undefined
  period: "week" | "month" | "year"
  mode: RollupMode
}

function getPeriodLabel(goalPeriod: string): string {
  switch (goalPeriod) {
    case "daily": return "days"
    case "weekly": return "weeks"
    case "monthly": return "months"
    default: return "periods"
  }
}

export function PeriodRollupRow({ goal, stats, period, mode }: PeriodRollupRowProps) {
  if (mode === "completion" && stats) {
    const completed = period === "week" ? stats.weekCompleted
      : period === "month" ? stats.monthCompleted
      : stats.yearCompleted
    const total = period === "week" ? stats.weekTotal
      : period === "month" ? stats.monthTotal
      : stats.yearTotal

    if (total === 0) return null

    const pct = Math.round((completed / total) * 100)
    const label = getPeriodLabel(goal.period)

    return (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 truncate min-w-0 mr-2">
          <CheckCircle2 className={`size-3.5 flex-shrink-0 ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-muted-foreground"}`} />
          <span className="truncate">{goal.title}</span>
        </div>
        <span className="font-medium whitespace-nowrap">
          <span className={pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-muted-foreground"}>
            {completed}/{total}
          </span>
          <span className="text-muted-foreground text-xs ml-1">{label}</span>
        </span>
      </div>
    )
  }

  if (mode === "delta" && stats) {
    const delta = period === "month" ? stats.monthDelta : stats.yearDelta
    if (delta === null) return null

    return (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 truncate min-w-0 mr-2">
          <TrendingUp className={`size-3.5 flex-shrink-0 ${delta > 0 ? "text-emerald-400" : "text-muted-foreground"}`} />
          <span className="truncate">{goal.title}</span>
        </div>
        <span className="font-medium whitespace-nowrap">
          <span className={delta > 0 ? "text-emerald-400" : "text-muted-foreground"}>
            {delta > 0 ? "+" : ""}{delta}
          </span>
          <span className="text-muted-foreground text-xs ml-1">
            ({goal.current_value} total)
          </span>
        </span>
      </div>
    )
  }

  if (mode === "deadline" && goal.target_date) {
    const targetDate = new Date(goal.target_date)
    const now = new Date()
    const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const urgencyClass = diffDays <= 0 ? "text-destructive"
      : diffDays <= 7 ? "text-red-400"
      : diffDays <= 30 ? "text-amber-400"
      : "text-emerald-400"

    const countdownText = diffDays <= 0 ? `${Math.abs(diffDays)}d overdue`
      : diffDays === 1 ? "tomorrow"
      : `${diffDays}d`

    return (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 truncate min-w-0 mr-2">
          <Calendar className={`size-3.5 flex-shrink-0 ${urgencyClass}`} />
          <span className="truncate">{goal.title}</span>
        </div>
        <span className="font-medium whitespace-nowrap">
          <span className="text-muted-foreground text-xs">
            {targetDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
          <span className={`text-xs ml-2 ${urgencyClass}`}>
            {countdownText}
          </span>
        </span>
      </div>
    )
  }

  return null
}
