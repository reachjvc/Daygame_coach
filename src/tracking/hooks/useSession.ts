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

interface StartSessionOptions {
  goal?: number
  location?: string
  sessionFocus?: string
  techniqueFocus?: string
  ifThenPlan?: string
  customIntention?: string
  preMood?: number
}

interface EndedSessionInfo {
  id: string
  approachCount: number
  duration: string
  endedAt: string
}

interface UseSessionReturn {
  state: SessionState
  liveStats: LiveStats
  endedSession: EndedSessionInfo | null
  startSession: (options?: StartSessionOptions) => Promise<boolean>
  endSession: () => Promise<void>
  addApproach: (data?: ApproachFormData) => Promise<void>
  updateLastApproach: (data: ApproachFormData) => Promise<void>
  setGoal: (goal: number) => Promise<void>
  revalidateSession: () => Promise<void>
  reactivateSession: () => Promise<boolean>
  clearEndedSession: () => void
}

const ENDED_SESSION_STORAGE_KEY = "daygame_ended_session"

export function useSession({ userId, onApproachAdded, onSessionEnded }: UseSessionOptions): UseSessionReturn {
  const [state, setState] = useState<SessionState>({
    session: null,
    approaches: [],
    isActive: false,
    isLoading: true,
    error: null,
  })

  const [endedSession, setEndedSession] = useState<EndedSessionInfo | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [, forceUpdate] = useState(0)

  // Load ended session from sessionStorage (used on mount and pageshow)
  const loadEndedSessionFromStorage = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(ENDED_SESSION_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as EndedSessionInfo
        // Only show if ended within the last hour
        const endedAt = new Date(parsed.endedAt)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
        if (endedAt > hourAgo) {
          setEndedSession(parsed)
        } else {
          sessionStorage.removeItem(ENDED_SESSION_STORAGE_KEY)
          setEndedSession(null)
        }
      } else {
        setEndedSession(null)
      }
    } catch {
      sessionStorage.removeItem(ENDED_SESSION_STORAGE_KEY)
      setEndedSession(null)
    }
  }, [])

  // Load ended session from sessionStorage on mount
  useEffect(() => {
    loadEndedSessionFromStorage()
  }, [loadEndedSessionFromStorage])

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

  // Revalidate session when page is restored from bfcache (back/forward navigation)
  // This prevents "zombie sessions" where old React state shows an ended session as active
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache - revalidate session status and ended session
        loadActiveSession()
        loadEndedSessionFromStorage()
      }
    }

    window.addEventListener("pageshow", handlePageShow)
    return () => window.removeEventListener("pageshow", handlePageShow)
  }, [userId, loadEndedSessionFromStorage])

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

  const startSession = useCallback(async (options?: StartSessionOptions): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch("/api/tracking/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: options?.goal,
          primary_location: options?.location,
          session_focus: options?.sessionFocus,
          technique_focus: options?.techniqueFocus,
          if_then_plan: options?.ifThenPlan,
          custom_intention: options?.customIntention,
          pre_session_mood: options?.preMood,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to start session")
      }

      const session = await response.json()

      // Clear any ended session info when starting a new session
      sessionStorage.removeItem(ENDED_SESSION_STORAGE_KEY)
      setEndedSession(null)

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

    // Capture session info before clearing state
    const sessionId = state.session.id
    const approachCount = state.approaches.length
    const startedAt = new Date(state.session.started_at)
    const duration = formatDuration(Date.now() - startedAt.getTime())

    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch(`/api/tracking/session/${sessionId}/end`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to end session")
      }

      const endedSessionData = await response.json()

      // Store ended session info for "Session Ended" UI
      const endedInfo: EndedSessionInfo = {
        id: sessionId,
        approachCount,
        duration,
        endedAt: new Date().toISOString(),
      }
      sessionStorage.setItem(ENDED_SESSION_STORAGE_KEY, JSON.stringify(endedInfo))
      setEndedSession(endedInfo)

      setState({
        session: null,
        approaches: [],
        isActive: false,
        isLoading: false,
        error: null,
      })

      onSessionEnded?.(endedSessionData)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to end session",
      }))
    }
  }, [state.session, state.approaches.length, onSessionEnded])

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

  // Allow manual revalidation of session status
  const revalidateSession = useCallback(async () => {
    await loadActiveSession()
  }, [])

  // Re-activate an ended session (for editing)
  const reactivateSession = useCallback(async (): Promise<boolean> => {
    if (!endedSession) return false

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await fetch(`/api/tracking/session/${endedSession.id}/reactivate`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to reactivate session")
      }

      const { session, approaches } = await response.json()

      // Clear ended session info
      sessionStorage.removeItem(ENDED_SESSION_STORAGE_KEY)
      setEndedSession(null)

      setState({
        session,
        approaches: approaches || [],
        isActive: true,
        isLoading: false,
        error: null,
      })

      return true
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to reactivate session",
      }))
      return false
    }
  }, [endedSession])

  // Clear ended session info (dismiss the banner)
  const clearEndedSession = useCallback(() => {
    sessionStorage.removeItem(ENDED_SESSION_STORAGE_KEY)
    setEndedSession(null)
  }, [])

  // Calculate live stats
  const liveStats = calculateLiveStats(state)

  return {
    state,
    liveStats,
    endedSession,
    startSession,
    endSession,
    addApproach,
    updateLastApproach,
    setGoal,
    revalidateSession,
    reactivateSession,
    clearEndedSession,
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
