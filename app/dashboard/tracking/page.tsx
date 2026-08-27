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
 */
export default async function TrackingPage() {
  const auth = await requireAuth()

  let initialDashboard: DashboardLayoutResponse | undefined
  if (auth.success) {
    try {
      initialDashboard = await getDashboardLayout(auth.userId)
    } catch (error) {
      console.error("Failed to pre-render dashboard tiles:", error)
    }
  }

  return <ProgressDashboard initialDashboard={initialDashboard} />
}
