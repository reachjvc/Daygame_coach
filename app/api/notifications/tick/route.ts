/**
 * THE CLOCK'S ADDRESS: called once a minute by the database's own clock
 * (`pg_cron` + `pg_net`, job `notifications-clock`), and later by a server
 * timer when the app leaves Vercel (Plans/thought.md, Q15).
 *
 * Refuses anything without the clock's secret (src/notifications/clockAuth.ts).
 * Each call rings the time tracker's 6 h alert for every timer that has just
 * passed it (`runTimerAlertClock`, Plans/time-tracker-like-toggl.md, Phase 7), and
 * sends the plan's weekly review reminder (`runPlanReviewClock`,
 * Plans/life-plan-after-setup.md, Phase 5), and the role model council's daily
 * reminder (`runCouncilReminderClock`, Plans/role-models.md, Phase 12).
 */

import { NextResponse } from "next/server"
import { bearerMatches, clockSecret } from "@/src/notifications/clockAuth"
import { runAuditPingClock } from "@/src/audit/pingService"
import { runTimerAlertClock } from "@/src/timetrack/runningTimerService"
import { runPlanReviewClock } from "@/src/goals/reviewReminderService"
import { runCouncilReminderClock } from "@/src/role-models/councilReminderService"

export async function POST(req: Request) {
  const expected = await clockSecret()
  if (!expected) return NextResponse.json({ error: "Not set up" }, { status: 503 })
  if (!bearerMatches(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 })
  }

  const [timerAlerts, auditPings, planReviews, councilReminders] = await Promise.all([
    runTimerAlertClock().catch((error: unknown) => {
      console.error("[timer alert] tick failed", error instanceof Error ? error.message : "unknown")
      return { failed: true as const }
    }),
    runAuditPingClock().catch((error: unknown) => {
      console.error("[audit ping] tick failed", error instanceof Error ? error.message : "unknown")
      return { failed: true as const }
    }),
    runPlanReviewClock().catch((error: unknown) => {
      console.error("[plan review] tick failed", error instanceof Error ? error.message : "unknown")
      return { failed: true as const }
    }),
    runCouncilReminderClock().catch((error: unknown) => {
      console.error("[council reminder] tick failed", error instanceof Error ? error.message : "unknown")
      return { failed: true as const }
    }),
  ])
  return NextResponse.json({ timerAlerts, auditPings, planReviews, councilReminders })
}
