import { requireAuth } from "@/src/db/auth"
import { getDashboardLayout } from "@/src/tracking/dashboardService"
import { ProgressDashboard } from "@/src/tracking/components/ProgressDashboard"
import type { DashboardLayoutResponse } from "@/src/tracking/types"

/**
 * The stat tiles are resolved here, on the server, and handed to the client
 * component as its opening state.
 *
 * They used to be fetched after hydration, which put a skeleton on screen for
 * ~2.5s on every visit: the browser had to parse the page's JS, mount, fire
 * /api/tracking/dashboard, and only then had numbers to draw. Rendering them
 * here costs the page the same query it was making anyway, and the tiles arrive
 * already filled in.
 *
 * A failure to resolve them is not a failure to render the page — the rest of
 * the dashboard is independent, so the client falls back to fetching.
 *
 * THE SEASON BAND'S TWO HALVES ARE READ HERE TOO, and that is the point of
 * Phase 1 arriving on this page. The band used to read the plan out of the
 * browser it happened to be open in, so on a second device it greeted somebody
 * who had written a whole plan with "build your plan". The plan is on the
 * account now, so it is read from there.
 *
 * `seasonReady` is false when either read failed. The band then draws NOTHING
 * rather than the invitation — an invitation shown because a query broke is the
 * same lie in a different costume.
 */
export default async function TrackingPage() {
  const auth = await requireAuth()

  let initialDashboard: DashboardLayoutResponse | undefined
  if (auth.success) {
    initialDashboard = await getDashboardLayout(auth.userId).catch((error) => {
      console.error("Failed to pre-render dashboard tiles:", error)
      return undefined
    })
  }

  return (
    <ProgressDashboard initialDashboard={initialDashboard} />
  )
}
