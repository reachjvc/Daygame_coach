/**
 * THE CLOCK'S ADDRESS: called once a minute by the database's own clock
 * (`pg_cron` + `pg_net`, job `notifications-clock`), and later by a server
 * timer when the app leaves Vercel (Plans/thought.md, Q15).
 *
 * Refuses anything without the clock's secret (src/notifications/clockAuth.ts).
 * Each call rings the time tracker's 6 h alert for every timer that has just
 * passed it (`runTimerAlertClock`, Plans/time-tracker-like-toggl.md, Phase 7).
 */

import { NextResponse } from "next/server"
import { bearerMatches, clockSecret } from "@/src/notifications/clockAuth"
import { runTimerAlertClock } from "@/src/timetrack/runningTimerService"

export async function POST(req: Request) {
  const expected = await clockSecret()
  if (!expected) return NextResponse.json({ error: "Not set up" }, { status: 503 })
  if (!bearerMatches(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 })
  }

  const timerAlerts = await runTimerAlertClock().catch((error: unknown) => {
    console.error("[timer alert] tick failed", error instanceof Error ? error.message : "unknown")
    return { failed: true as const }
  })
  return NextResponse.json({ timerAlerts })
}
