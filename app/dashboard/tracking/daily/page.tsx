"use client"

import { DailyReviewPage } from "@/src/tracking/components/DailyReviewPage"
import { useTrackingAuth } from "../TrackingAuthContext"

export default function DailyPage() {
  const { userId } = useTrackingAuth()
  return <DailyReviewPage userId={userId} />
}
