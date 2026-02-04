"use client"

import { WeeklyReviewPage } from "@/src/tracking/components/WeeklyReviewPage"
import { useTrackingAuth } from "../TrackingAuthContext"

export default function ReviewPage() {
  const { userId } = useTrackingAuth()
  return <WeeklyReviewPage userId={userId} />
}
