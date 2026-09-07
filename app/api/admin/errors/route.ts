import { NextResponse } from "next/server"

import { listErrorReports } from "@/src/db/errorReportRepo"

/** Read crash reports. Gated by the same admin key as the other admin routes. */
export async function GET(request: Request) {
  const key = request.headers.get("X-Admin-Key")
  if (!key || key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const hours = Number(params.get("hours") ?? 168)
  const since = Number.isFinite(hours) && hours > 0
    ? new Date(Date.now() - hours * 3600_000).toISOString()
    : null

  try {
    return NextResponse.json({ reports: await listErrorReports(since, 200) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the reports"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
