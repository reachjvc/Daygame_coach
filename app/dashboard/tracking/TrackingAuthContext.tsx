"use client"

import { createContext, useContext, useEffect } from "react"

interface TrackingAuthContextValue {
  userId: string
}

const TrackingAuthContext = createContext<TrackingAuthContextValue | null>(null)

// Module-level cache for instant back navigation
// This persists across component mounts within the same browser session
let cachedUserId: string | null = null

export function TrackingAuthProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  // Update cache when server provides userId
  useEffect(() => {
    cachedUserId = userId
  }, [userId])

  return (
    <TrackingAuthContext.Provider value={{ userId }}>
      {children}
    </TrackingAuthContext.Provider>
  )
}

export function useTrackingAuth() {
  const context = useContext(TrackingAuthContext)
  if (!context) {
    throw new Error("useTrackingAuth must be used within TrackingAuthProvider")
  }
  return context
}

// Export cached userId for components that need instant access
// without waiting for context to be available
export function getCachedUserId(): string | null {
  return cachedUserId
}
