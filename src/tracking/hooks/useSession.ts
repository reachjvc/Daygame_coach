"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type {
  SessionState,
  ApproachFormData,
  LiveStats,
  ApproachOutcome,
} from "../types"
import type { SessionRow, ApproachRow } from "@/src/db/trackingTypes"

interface UseSessionOptions {
  userId: string
  onApproachAdded?: (approach: ApproachRow) => void
  onSessionEnded?: (session: SessionRow) => void
}

interface UseSessionReturn {
  state: SessionState
  liveStats: LiveStats
  startSession: (goal?: number, location?: string) => Promise<boolean>
  endSession: () => Promise<void>
  addApproach: (data?: ApproachFormData) => Promise<void>
  updateLastApproach: (data: ApproachFormData) => Promise<void>
  setGoal: (goal: number) => Promise<void>
}

export function useSession({ userId, onApproachAdded, onSessionEnded }: UseSessionOptions): UseSessionReturn {
  const [state, setState] = useState<SessionState>({
    session: null,
    approaches: [],
    isActive: false,
    isLoading: true,
    error: null,
  })

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [, forceUpdate] = useState(0)

  // Force re-render every second for live timers
  useEffect(() => {
    if (state.isActive) {
      timerRef.current = setInterval(() => {
        forceUpdate((n) => n + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [state.isActive])

  // Load active session on mount
  useEffect(() => {
    loadActiveSession()
  }, [userId])

  const loadActiveSession = async () => {
    try {
      const response = await fetch("/api/tracking/session/active")
      if (response.ok) {
        const data = await response.json()
        if (data.session) {
          setState({
            session: data.session,
            approaches: data.approaches || [],
            isActive: true,
            isLoading: false,
            error: null,
          })
          return
        }
      }
      setState((prev) => ({ ...prev, isLoading: false }))
    } catch {
      setState((prev) => ({ ...prev, isLoading: false, error: "Failed to load session" }))
    }
  }

  const startSession = useCallback(async (goal?: number, location?: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch("/api/tracking/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, primary_location: location }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to start session")
      }

      const session = await response.json()

      setState({
        session,
        approaches: [],
        isActive: true,
        isLoading: false,
        error: null,
      })
      return true
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to start session",
      }))
      return false
    }
  }, [])

  const endSession = useCallback(async () => {
    if (!state.session) return

    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch(`/api/tracking/session/${state.session.id}/end`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to end session")
      }

      const endedSession = await response.json()

      setState({
        session: null,
        approaches: [],
        isActive: false,
        isLoading: false,
        error: null,
      })

      onSessionEnded?.(endedSession)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to end session",
      }))
    }
  }, [state.session, onSessionEnded])

  const addApproach = useCallback(async (data?: ApproachFormData) => {
    if (!state.session) return

    // Optimistic update - add approach immediately with temp ID
    const tempId = `temp-${Date.now()}`
    const optimisticApproach: ApproachRow = {
      id: tempId,
      user_id: state.session.user_id,
      session_id: state.session.id,
      timestamp: new Date().toISOString(),
      outcome: data?.outcome || null,
      set_type: data?.set_type || null,
      mood: data?.mood || null,
      tags: data?.tags || null,
      latitude: data?.latitude || null,
      longitude: data?.longitude || null,
      note: data?.note || null,
      voice_note_url: null,
      created_at: new Date().toISOString(),
    }

    setState((prev) => ({
      ...prev,
      approaches: [...prev.approaches, optimisticApproach],
    }))

    // Trigger haptic feedback immediately
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    try {
      const response = await fetch("/api/tracking/approach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: state.session.id,
          ...data,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add approach")
      }

      const approach = await response.json()

      // Replace temp approach with real one
      setState((prev) => ({
        ...prev,
        approaches: prev.approaches.map((a) =>
          a.id === tempId ? approach : a
        ),
      }))

      onApproachAdded?.(approach)
    } catch (error) {
      // Remove optimistic approach on error
      setState((prev) => ({
        ...prev,
        approaches: prev.approaches.filter((a) => a.id !== tempId),
        error: error instanceof Error ? error.message : "Failed to add approach",
      }))
    }
  }, [state.session, onApproachAdded])

  const updateLastApproach = useCallback(async (data: ApproachFormData) => {
    const lastApproach = state.approaches[state.approaches.length - 1]
    if (!lastApproach) return

    try {
      const response = await fetch(`/api/tracking/approach/${lastApproach.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update approach")
      }

      const updated = await response.json()

      setState((prev) => ({
        ...prev,
        approaches: prev.approaches.map((a) =>
          a.id === updated.id ? updated : a
        ),
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to update approach",
      }))
    }
  }, [state.approaches])

  const setGoal = useCallback(async (goal: number) => {
    if (!state.session) return

    try {
      const response = await fetch(`/api/tracking/session/${state.session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      })

      if (!response.ok) {
        throw new Error("Failed to update goal")
      }

      const updated = await response.json()

      setState((prev) => ({
        ...prev,
        session: updated,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to update goal",
      }))
    }
  }, [state.session])

  // Calculate live stats
  const liveStats = calculateLiveStats(state)

  return {
    state,
    liveStats,
    startSession,
    endSession,
    addApproach,
    updateLastApproach,
    setGoal,
  }
}

function calculateLiveStats(state: SessionState): LiveStats {
  const { session, approaches } = state

  const totalApproaches = approaches.length

  // Session duration
  const sessionDuration = session
    ? formatDuration(new Date().getTime() - new Date(session.started_at).getTime())
    : "00:00:00"

  // Approaches per hour
  const sessionMs = session
    ? new Date().getTime() - new Date(session.started_at).getTime()
    : 0
  const sessionHours = sessionMs / (1000 * 60 * 60)
  const approachesPerHour = sessionHours > 0.05 // At least 3 minutes
    ? Math.round((totalApproaches / sessionHours) * 10) / 10
    : totalApproaches

  // Time since last approach
  const lastApproach = approaches[approaches.length - 1]
  const timeSinceLastApproach = lastApproach
    ? formatDuration(new Date().getTime() - new Date(lastApproach.timestamp).getTime())
    : null

  // Outcome breakdown
  const outcomeBreakdown: Record<ApproachOutcome, number> = {
    blowout: 0,
    short: 0,
    good: 0,
    number: 0,
    instadate: 0,
  }
  for (const approach of approaches) {
    if (approach.outcome) {
      outcomeBreakdown[approach.outcome]++
    }
  }

  // Goal progress
  const goalProgress = {
    current: totalApproaches,
    target: session?.goal ?? null,
    percentage: session?.goal ? Math.min(100, (totalApproaches / session.goal) * 100) : 0,
  }

  return {
    totalApproaches,
    sessionDuration,
    approachesPerHour,
    timeSinceLastApproach,
    outcomeBreakdown,
    goalProgress,
    comparisonToAverage: null, // TODO: Fetch user average from stats
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}
