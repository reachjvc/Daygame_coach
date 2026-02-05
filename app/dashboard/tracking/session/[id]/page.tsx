"use client"

import { use } from "react"
import { SessionDetailPage } from "@/src/tracking/components/SessionDetailPage"
import { useTrackingAuth } from "../../TrackingAuthContext"

export default function SessionDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = useTrackingAuth()
  const { id } = use(params)
  return <SessionDetailPage userId={userId} sessionId={id} />
}
