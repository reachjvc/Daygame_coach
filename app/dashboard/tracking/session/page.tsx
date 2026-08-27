"use client"

import { SessionTrackerPage } from "@/src/tracking/components/SessionTrackerPage"
import { BackLink } from "@/components/BackLink"
import { useTrackingAuth } from "../TrackingAuthContext"

export default function SessionPage() {
  const { userId } = useTrackingAuth()
  return (
    <>
      {/* A WAY OUT THAT IS NOT "END SESSION". The session lives on the server
          and keeps running — the dashboard shows it as "In progress" with a
          Continue button — so leaving is recoverable and a screen you cannot
          leave is not. */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <BackLink fallback="/dashboard/tracking" fallbackLabel="Tracking" />
      </div>
      <SessionTrackerPage userId={userId} />
    </>
  )
}
