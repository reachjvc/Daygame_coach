"use client"

import { useSearchParams } from "next/navigation"
import { FieldReportPage } from "@/src/tracking/components/FieldReportPage"
import { useTrackingAuth } from "../TrackingAuthContext"

export default function ReportPage() {
  const { userId } = useTrackingAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session") || undefined
  const editReportId = searchParams.get("edit") || undefined

  return <FieldReportPage userId={userId} sessionId={sessionId} reportId={editReportId} />
}
