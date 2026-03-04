"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import type { CorrelationInsight } from "../types"
import { generateCorrelationInsights } from "../healthService"

interface SessionData {
  date: string
  approachCount: number
  rating: number | null
}

export function CorrelationPanel() {
  const [insights, setInsights] = useState<CorrelationInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  const fetchCorrelations = useCallback(async () => {
    try {
      // Fetch sleep data and session data in parallel
      const [sleepRes, sessionsRes] = await Promise.all([
        fetch("/api/health/sleep?days=90"),
        fetch("/api/tracking/sessions?days=90").catch(() => null),
      ])

      if (!sleepRes.ok) {
        setIsLoading(false)
        return
      }

      const sleepLogs = await sleepRes.json()

      // Parse session data (tracking API may not exist yet — graceful fallback)
      let sessionData: SessionData[] = []
      if (sessionsRes?.ok) {
        const sessions = await sessionsRes.json()
        sessionData = Array.isArray(sessions)
          ? sessions.map((s: { started_at?: string; approach_count?: number; rating?: number }) => ({
              date: s.started_at ? new Date(s.started_at).toISOString().split("T")[0] : "",
              approachCount: s.approach_count ?? 0,
              rating: s.rating ?? null,
            }))
          : []
      }

      const sleepData = Array.isArray(sleepLogs)
        ? sleepLogs.map((s: { logged_at: string; bedtime: string; wake_time: string }) => {
            const bedMin = timeToMinutes(s.bedtime)
            const wakeMin = timeToMinutes(s.wake_time)
            let diff = wakeMin - bedMin
            if (diff <= 0) diff += 24 * 60
            return { date: new Date(s.logged_at).toISOString().split("T")[0], hours: diff / 60 }
          })
        : []

      setHasData(sleepData.length > 0 || sessionData.length > 0)

      const correlationInsights = generateCorrelationInsights(sleepData, sessionData)
      setInsights(correlationInsights)
    } catch (e) {
      console.error("Error computing correlations:", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchCorrelations() }, [fetchCorrelations])

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Health × Daygame</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Analyzing correlations...</p></CardContent>
      </Card>
    )
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Health × Daygame</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Log health data and daygame sessions to see how they correlate. Need at least 7 days of sleep data and 3 sessions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Health × Daygame
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not enough data for correlations yet. Keep logging — insights appear after 2+ weeks.
          </p>
        ) : (
          insights.map((insight, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                insight.strength === "strong"
                  ? "border-green-500/30 bg-green-500/5"
                  : insight.strength === "moderate"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border"
              }`}
            >
              <div className="text-sm font-medium">{insight.description}</div>
              <div className="text-xs text-muted-foreground mt-1 capitalize">
                {insight.strength} correlation
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function timeToMinutes(time: string): number {
  const timeStr = time.includes("T") ? time.split("T")[1].substring(0, 5) : time.substring(0, 5)
  const [h, m] = timeStr.split(":").map(Number)
  return h * 60 + m
}
