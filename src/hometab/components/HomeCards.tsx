import Link from "next/link"
import type { ReactNode } from "react"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SeasonBand } from "@/src/goals/components/north-star/SeasonBand"
import { loadSeasonBand } from "@/src/goals/seasonBandData"
import { getActiveSession, getTrackingStatsForDisplay } from "@/src/tracking/trackingService"
import { clockIn, timerName, watchTimer } from "@/src/timetrack/runningTimerService"
import { ROUTES } from "@/src/shared/routes"
import { withReturn } from "@/src/shared/returnTo"

/**
 * HOME'S CARDS: today's plan, field sessions and time. (Training is the
 * Tracking page's own `TrainingCard`, which fetches for itself.)
 *
 * Each is an async server component rendered inside its own <Suspense>, so
 * the tiles above draw at once and each card arrives when its read does
 * (Plans/site-navigation-build.md, risk 9). Each one reuses the loader its
 * page already had; none has a query of its own.
 *
 * A card whose read fails says so in one line and links to the tool, rather
 * than drawing a zero it does not know to be true.
 */

function HomeCard({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5" data-testid={testId}>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function CardPlaceholder({ testId }: { testId: string }) {
  return <div className="h-[118px] animate-pulse rounded-xl border border-border bg-card" data-testid={`${testId}-loading`} aria-hidden />
}

/** Today's plan: the same band Tracking shows, from the same loader. */
export async function PlanCard({ userId }: { userId: string }) {
  const band = await loadSeasonBand(userId)
  if (!band.seasonReady) {
    return (
      <HomeCard title="Today's plan" testId="home-plan-card">
        <p className="text-sm text-muted-foreground">
          Your plan could not be read just now. <Link className="text-primary underline" href={ROUTES.plan}>Open your plan</Link>
        </p>
      </HomeCard>
    )
  }
  return (
    <div data-testid="home-plan-card">
      <SeasonBand plan={band.seasonPlan} oneThing={band.oneThing} ready={band.seasonReady} today={band.today} ticks={band.seasonTicks} />
    </div>
  )
}

/**
 * Field sessions: this week's count and the way to start one. The Start
 * Session button is the one Tracking has, same address and same autostart.
 * A session already running is offered first, because starting a second one
 * is never what somebody standing in the street meant.
 */
export async function FieldCard({ userId }: { userId: string }) {
  const [stats, active] = await Promise.all([
    getTrackingStatsForDisplay(userId).catch(() => null),
    getActiveSession(userId).catch(() => null),
  ])
  const line = stats
    ? `${stats.current_week_approaches} approach${stats.current_week_approaches === 1 ? "" : "es"} in ${stats.current_week_sessions} session${stats.current_week_sessions === 1 ? "" : "s"} this week`
    : "Your numbers could not be read just now."
  return (
    <HomeCard title="Field" testId="home-field-card">
      <p className="mb-3 text-base font-medium text-foreground">{active ? "A session is running" : line}</p>
      <div className="flex flex-wrap gap-2">
        {active ? (
          <Button asChild size="sm">
            <Link href={withReturn(ROUTES.trackingSession, ROUTES.dashboard)} data-testid="home-resume-session">Back to the session</Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="gap-1.5">
            <Link href={withReturn(`${ROUTES.trackingSession}?autostart=true`, ROUTES.dashboard)} data-testid="home-start-session">
              <Play className="size-4" aria-hidden />
              Start Session
            </Link>
          </Button>
        )}
        <Button asChild size="sm" variant="ghost">
          <Link href={ROUTES.tracking}>See your stats</Link>
        </Button>
      </div>
    </HomeCard>
  )
}

/**
 * Time: what is running on the account, if anything. Read through the same
 * function the timer's push notification reads, so this card and the lock
 * screen say the same thing.
 */
export async function TimeCard({ userId, timezone }: { userId: string; timezone: string }) {
  const running = await watchTimer(userId)
  const now = running?.find((r) => !r.stoppedAt && !r.deletedAt) ?? null
  return (
    <HomeCard title="Time Log" testId="home-time-card">
      <p className="mb-3 text-base font-medium text-foreground">
        {running === null
          ? "Your timer could not be read just now."
          : now
            ? `${timerName(now)} · since ${clockIn(now.startedAt, timezone)}`
            : "No timer running"}
      </p>
      <Button asChild size="sm" variant={now ? "default" : "secondary"}>
        <Link href={ROUTES.time}>{now ? "Open the timer" : "Open Time Log"}</Link>
      </Button>
    </HomeCard>
  )
}
