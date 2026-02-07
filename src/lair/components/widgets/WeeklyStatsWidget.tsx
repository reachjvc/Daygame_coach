"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Users, MessageSquare, Calendar } from "lucide-react"
import type { WidgetProps } from "../../types"

interface TrackingStats {
  current_week_sessions: number
  current_week_approaches: number
  total_sessions: number
  total_approaches: number
  total_numbers: number
}

export function WeeklyStatsWidget({ collapsed }: WidgetProps) {
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
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-16" />
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center text-muted-foreground text-sm">
        Unable to load stats
      </div>
    )
  }

  const statItems = [
    {
      label: "Sessions",
      value: stats.current_week_sessions,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Approaches",
      value: stats.current_week_approaches,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Total Sessions",
      value: stats.total_sessions,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Numbers",
      value: stats.total_numbers,
      icon: MessageSquare,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
        >
          <div className={`p-2 rounded-lg ${item.bgColor} ${item.color}`}>
            <item.icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold">{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
