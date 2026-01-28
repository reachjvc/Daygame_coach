"use client"

import { useState, useEffect, useCallback } from "react"
import type { UserTrackingStatsRow, SessionSummary, MilestoneRow, DailyStats } from "@/src/db/trackingTypes"

interface TrackingStatsState {
  stats: UserTrackingStatsRow | null
  recentSessions: SessionSummary[]
  milestones: MilestoneRow[]
  dailyStats: DailyStats[]
  isLoading: boolean
  error: string | null
}

interface UseTrackingStatsReturn {
  state: TrackingStatsState
  refresh: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<boolean>
}

export function useTrackingStats(): UseTrackingStatsReturn {
  const [state, setState] = useState<TrackingStatsState>({
    stats: null,
    recentSessions: [],
    milestones: [],
    dailyStats: [],
    isLoading: true,
    error: null,
  })

  const fetchStats = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      const [statsRes, sessionsRes, milestonesRes, dailyRes] = await Promise.all([
        fetch("/api/tracking/stats"),
        fetch("/api/tracking/sessions?limit=5"),
        fetch("/api/tracking/milestones"),
        fetch("/api/tracking/stats/daily?days=30"),
      ])

      const stats = statsRes.ok ? await statsRes.json() : null
      const sessions = sessionsRes.ok ? await sessionsRes.json() : []
      const milestones = milestonesRes.ok ? await milestonesRes.json() : []
      const dailyStats = dailyRes.ok ? await dailyRes.json() : []

      setState({
        stats,
        recentSessions: sessions,
        milestones,
        dailyStats,
        isLoading: false,
        error: null,
      })
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load tracking stats",
      }))
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tracking/session/${sessionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete session")
      }

      // Remove the session from state immediately for responsive UI
      setState((prev) => ({
        ...prev,
        recentSessions: prev.recentSessions.filter((s) => s.id !== sessionId),
      }))

      return true
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete session",
      }))
      return false
    }
  }, [])

  return {
    state,
    refresh: fetchStats,
    deleteSession,
  }
}
