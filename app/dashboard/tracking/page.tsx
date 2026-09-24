import { requireAuth } from "@/src/db/auth"
import { getDashboardLayout } from "@/src/tracking/dashboardService"
import { ProgressDashboard } from "@/src/tracking/components/ProgressDashboard"
import { readLifePlan } from "@/src/db/lifePlanRepo"
import { readDayRows, readNodeIds } from "@/src/db/lifePlanDayRepo"
import { dayRowsToRecord } from "@/src/goals/lifePlanDayService"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { rowsToPlan } from "@/src/goals/lifePlanMapper"
import { readOneThing } from "@/src/goals/oneThingServer"
import type { DashboardLayoutResponse } from "@/src/tracking/types"
import type { NsPlan } from "@/src/goals/types"
import type { OneThing } from "@/src/goals/oneThingService"

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
  let seasonPlan: NsPlan | null = null
  let oneThing: OneThing | null = null
  let seasonReady = false
  /** The ACCOUNT's calendar day, so the band and the flow agree what today is. */
  let today: string | null = null

  if (auth.success) {
    try {
      initialDashboard = await getDashboardLayout(auth.userId)
    } catch (error) {
      console.error("Failed to pre-render dashboard tiles:", error)
    }
    try {
      const [stored, thing, timezone] = await Promise.all([
        readLifePlan(auth.userId),
        readOneThing(auth.userId),
        getUserTimezone(auth.userId),
      ])
      today = getTodayInTimezone(timezone)
      seasonPlan = stored ? rowsToPlan(stored.rows) : null

      /**
       * THE DAY HALF, WITHOUT WHICH THIS BAND COUNTS TO ZERO FOREVER.
       *
       * `rowsToPlan` returns `logged` empty by construction — the day tables are
       * not part of the whole-plan read, deliberately, because a plan is
       * replaced and a day is appended to. This page then asked that empty map
       * how much had been done today and was told nothing, every day, for
       * everyone: "0 of 5 done today" an hour after ticking all five.
       *
       * So the days are read here, by the same route's repo, and merged in.
       */
      if (stored && seasonPlan) {
        const planId = stored.rows.plan_id
        const [dayRows, ids] = await Promise.all([
          readDayRows(auth.userId, planId),
          readNodeIds(auth.userId, planId),
        ])
        const localIdFor = new Map([...ids].map(([local, id]) => [id, local]))
        seasonPlan = { ...seasonPlan, ...dayRowsToRecord(dayRows, localIdFor) }
      }

      oneThing = thing.current
      seasonReady = true
    } catch (error) {
      console.error("Failed to read the season band's plan:", error)
    }
  }

  return (
    <ProgressDashboard
      initialDashboard={initialDashboard}
      seasonPlan={seasonPlan}
      oneThing={oneThing}
      seasonReady={seasonReady}
      today={today}
    />
  )
}
