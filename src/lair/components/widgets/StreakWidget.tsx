"use client"

import { useEffect, useState } from "react"
import { Flame } from "lucide-react"
import type { WidgetProps } from "../../types"

interface TrackingStats {
  current_week_streak: number
  longest_week_streak: number
  current_week_sessions: number
  current_week_approaches: number
}

export function StreakWidget({ collapsed }: WidgetProps) {
  const [stats, setStats] = useState<TrackingStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/tracking/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-16">
        <div className="animate-pulse bg-muted rounded h-8 w-24" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center text-muted-foreground text-sm">
        Unable to load streak data
      </div>
    )
  }

  const isActiveWeek = stats.current_week_sessions >= 2 || stats.current_week_approaches >= 5
  const streakColor = stats.current_week_streak > 0 ? "text-orange-500" : "text-muted-foreground"

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-orange-500/10 ${streakColor}`}>
          <Flame className="h-6 w-6" />
        </div>
        <div>
          <div className="text-2xl font-bold">{stats.current_week_streak}</div>
          <div className="text-xs text-muted-foreground">week streak</div>
        </div>
      </div>
      <div className="text-right text-sm">
        <div className={isActiveWeek ? "text-green-500" : "text-muted-foreground"}>
          {isActiveWeek ? "Active this week" : "Get active!"}
        </div>
        <div className="text-xs text-muted-foreground">
          Best: {stats.longest_week_streak} weeks
        </div>
      </div>
    </div>
  )
}
