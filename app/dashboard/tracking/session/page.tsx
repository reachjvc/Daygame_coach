"use client"

import { SessionTrackerPage } from "@/src/tracking/components/SessionTrackerPage"
import { useTrackingAuth } from "../TrackingAuthContext"

export default function SessionPage() {
  const { userId } = useTrackingAuth()
  return <SessionTrackerPage userId={userId} />
}
