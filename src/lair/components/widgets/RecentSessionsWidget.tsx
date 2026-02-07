"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calendar, Users, ChevronRight } from "lucide-react"
import type { WidgetProps } from "../../types"

interface SessionSummary {
  id: string
  started_at: string
  total_approaches: number
  duration_minutes: number | null
  primary_location: string | null
}

export function RecentSessionsWidget({ collapsed }: WidgetProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/tracking/sessions?limit=5")
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSessions()
  }, [])

  if (collapsed) return null

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-12" />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm mb-2">No sessions yet</p>
        <Link
          href="/dashboard/tracking/session"
          className="text-primary text-sm hover:underline"
        >
          Start your first session
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.slice(0, 5).map((session) => {
        const date = new Date(session.started_at)
        const formattedDate = date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })

        return (
          <Link
            key={session.id}
            href={`/dashboard/tracking/session/${session.id}`}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">{formattedDate}</div>
                <div className="text-xs text-muted-foreground">
                  {session.primary_location || "No location"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-3 w-3" />
                  {session.total_approaches}
                </div>
                {session.duration_minutes && (
                  <div className="text-xs text-muted-foreground">
                    {session.duration_minutes}m
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        )
      })}
      <Link
        href="/dashboard/tracking/history"
        className="block text-center text-sm text-primary hover:underline pt-2"
      >
        View all sessions
      </Link>
    </div>
  )
}
