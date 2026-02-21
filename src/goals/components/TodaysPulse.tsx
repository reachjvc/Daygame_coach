"use client"

import { useMemo } from "react"
import { Sparkles } from "lucide-react"
import { formatStreakLabel } from "../goalsService"
import type { GoalWithProgress, TimeOfDayBracket } from "../types"

interface TodaysPulseProps {
  goals: GoalWithProgress[]
  timeOfDay: TimeOfDayBracket
}

const TIME_MESSAGES: Record<TimeOfDayBracket, (done: number, total: number, remaining: number) => string> = {
  morning: (_, total) => `Good morning — ${total} ${total === 1 ? "goal" : "goals"} for today`,
  afternoon: (done, _, remaining) =>
    remaining === 0 ? "All done for today!" : `${done} done, ${remaining} remaining`,
  evening: (done, total) => `Today's results — ${done} of ${total} complete`,
  night: (_, __, remaining) =>
    remaining === 0 ? "All done — rest well!" : `Wrap up — ${remaining} ${remaining === 1 ? "goal" : "goals"} remaining`,
}

export function TodaysPulse({ goals, timeOfDay }: TodaysPulseProps) {
  const { completed, total, percentage, maxStreak } = useMemo(() => {
    const completedGoals = goals.filter((g) => g.current_value >= g.target_value)
    const streak = goals.reduce((max, g) => Math.max(max, g.current_streak), 0)
    const pct = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0
    return { completed: completedGoals.length, total: goals.length, percentage: pct, maxStreak: streak }
  }, [goals])

  if (total === 0) return null

  const remaining = total - completed
  const allDone = remaining === 0
  const message = TIME_MESSAGES[timeOfDay](completed, total, remaining)
  const streakLabel = formatStreakLabel(maxStreak)

  // SVG ring dimensions
  const size = 72
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const ringColor = allDone ? "#22c55e" : "#0d9488"

  return (
    <div className="flex items-center gap-5 rounded-xl border border-border bg-card/50 px-5 py-4 mb-4">
      {/* Progress ring */}
      <div className="relative flex-shrink-0">
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
          {allDone ? (
            <Sparkles className="size-5 text-green-500" />
          ) : (
            <span className="text-sm font-bold">
              {completed}/{total}
            </span>
          )}
        </div>
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${allDone ? "text-green-500" : "text-foreground"}`}>
          {message}
        </p>
        {streakLabel && (
          <p className="text-xs text-muted-foreground mt-0.5">{streakLabel}</p>
        )}
      </div>
    </div>
  )
}
