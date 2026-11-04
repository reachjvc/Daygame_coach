/**
 * THE CLOCK'S ADDRESS: called once a minute by the database's own clock
 * (`pg_cron` + `pg_net`, migration 20261030130000_thoughts_clock.sql), and
 * later by a server timer when the app leaves Vercel (Plans/thought.md, Q15).
 *
 * Refuses anything without the clock's secret (src/notifications/clockAuth.ts).
 * Each call sends every reminder due now, once (`runPromptClock`), and rings
 * the time tracker's 6 h alert for every timer that has just passed it
 * (`runTimerAlertClock`, Plans/time-tracker-like-toggl.md, Phase 7). The two
 * are independent: one failing never stops the other.
 */

import { NextResponse } from "next/server"
import { bearerMatches, clockSecret } from "@/src/notifications/clockAuth"
import { runPromptClock } from "@/src/thoughts/promptService"
import { runTimerAlertClock } from "@/src/timetrack/runningTimerService"

export async function POST(req: Request) {
  const expected = await clockSecret()
  if (!expected) return NextResponse.json({ error: "Not set up" }, { status: 503 })
  if (!bearerMatches(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 })
  }

  const timerAlerts = runTimerAlertClock().catch((error: unknown) => {
    console.error("[timer alert] tick failed", error instanceof Error ? error.message : "unknown")
    return { failed: true as const }
  })
  try {
    const reminders = await runPromptClock()
    return NextResponse.json({ ...reminders, timerAlerts: await timerAlerts })
  } catch (error) {
    await timerAlerts
    console.error("[thoughts clock] tick failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Tick failed" }, { status: 500 })
  }
}
