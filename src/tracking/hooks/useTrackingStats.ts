"use client"

import { useState, useEffect, useCallback } from "react"
import type { UserTrackingStatsRow, SessionSummary, MilestoneRow, FieldReportRow, ReviewRow } from "@/src/db/trackingTypes"

interface TrackingStatsState {
  stats: UserTrackingStatsRow | null
  recentSessions: SessionSummary[]
  milestones: MilestoneRow[]
  recentFieldReports: FieldReportRow[]
  recentReviews: ReviewRow[]
  isLoading: boolean
  error: string | null
}

interface UseTrackingStatsReturn {
  state: TrackingStatsState
  refresh: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<boolean>
  deleteFieldReport: (reportId: string) => Promise<boolean>
}

// Module-level cache - persists across component mounts within the same session
let statsCache: TrackingStatsState | null = null
let lastFetchTime: number = 0
const CACHE_TTL_MS = 30_000 // 30 seconds - data considered fresh

export function useTrackingStats(): UseTrackingStatsReturn {
  // Initialize from cache if available (instant back navigation)
  const [state, setState] = useState<TrackingStatsState>(() => {
    if (statsCache) {
      return { ...statsCache, isLoading: false }
    }
    return {
      stats: null,
      recentSessions: [],
      milestones: [],
      recentFieldReports: [],
      recentReviews: [],
      isLoading: true,
      error: null,
    }
  })

  const fetchStats = useCallback(async (isBackgroundRefresh = false) => {
    try {
      // Only show loading spinner if no cached data exists
      if (!isBackgroundRefresh) {
        setState((prev) => ({ ...prev, isLoading: !statsCache, error: null }))
      }

      // Parallel fetch - 5 requests (stats, sessions, milestones, field reports, reviews)
      const [statsRes, sessionsRes, milestonesRes, reportsRes, reviewsRes] = await Promise.all([
        fetch("/api/tracking/stats"),
        fetch("/api/tracking/sessions?limit=5"),
        fetch("/api/tracking/milestones?limit=20"),
        fetch("/api/tracking/field-report?limit=5"),
        fetch("/api/tracking/review?limit=5"),
      ])

      const stats = statsRes.ok ? await statsRes.json() : null
      const sessions = sessionsRes.ok ? await sessionsRes.json() : []
      const milestones = milestonesRes.ok ? await milestonesRes.json() : []
      const recentFieldReports = reportsRes.ok ? await reportsRes.json() : []
      const recentReviews = reviewsRes.ok ? await reviewsRes.json() : []

      const newState: TrackingStatsState = {
        stats,
        recentSessions: sessions,
        milestones,
        recentFieldReports,
        recentReviews,
        isLoading: false,
        error: null,
      }

      // Update both local state and module cache
      statsCache = newState
      lastFetchTime = Date.now()
      setState(newState)
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load tracking stats",
      }))
    }
  }, [])

  useEffect(() => {
    const isCacheFresh = statsCache && (Date.now() - lastFetchTime < CACHE_TTL_MS)

    if (isCacheFresh) {
      // Cache is fresh - skip fetch entirely
      return
    }

    if (statsCache) {
      // Cache exists but stale - background refresh (no spinner)
      fetchStats(true)
    } else {
      // No cache - initial fetch (show spinner)
      fetchStats(false)
    }
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
      setState((prev) => {
        const newState = {
          ...prev,
          recentSessions: prev.recentSessions.filter((s) => s.id !== sessionId),
        }
        // Also update cache so back navigation shows correct data
        if (statsCache) {
          statsCache = newState
        }
        return newState
      })

      return true
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete session",
      }))
      return false
    }
  }, [])

  const deleteFieldReport = useCallback(async (reportId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tracking/field-report/${reportId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete field report")
      }

      // Remove the report from state immediately for responsive UI
      setState((prev) => {
        const newState = {
          ...prev,
          recentFieldReports: prev.recentFieldReports.filter((r) => r.id !== reportId),
        }
        // Also update cache so back navigation shows correct data
        if (statsCache) {
          statsCache = newState
        }
        return newState
      })

      return true
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to delete field report",
      }))
      return false
    }
  }, [])

  return {
    state,
    refresh: fetchStats,
    deleteSession,
    deleteFieldReport,
  }
}

// Export function to invalidate cache (call after mutations that affect stats)
export function invalidateTrackingStatsCache() {
  statsCache = null
  lastFetchTime = 0
}
