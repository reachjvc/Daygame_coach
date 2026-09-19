/**
 * Training — resolved on the server, so the page arrives with its data.
 *
 * IT USED TO ASSEMBLE ITSELF IN STAGES. Everything was fetched after hydration,
 * and each request depended on the one before it: ask for the enrollments, wait,
 * pick one, ask for its session, wait, ask for the past programs. On a phone in
 * a gym that is three round trips of spinner before the first weight appears,
 * and the user called it exactly what it was — "too many loads between".
 *
 * Resolving here costs the page the same queries it was making anyway and the
 * numbers arrive already on screen. The same pattern the tracking dashboard
 * already uses (`getDashboardLayout` in `app/dashboard/tracking/page.tsx`), for
 * the same reason.
 *
 * A failure to resolve is not a failure to render: the client falls back to
 * fetching, which is the behaviour it had before.
 */

import { requireAuth } from "@/src/db/auth"
import {
  listActiveEnrollments,
  listPastEnrollments,
  getEnrollmentDetail,
} from "@/src/db/programRepo"
import { getLiveWorkout, unitFor } from "@/src/db/workoutRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { TrainingScreen } from "@/src/programs/components/TrainingScreen"
import { parseProgramsLocation } from "@/src/programs/programsService"
import type { EnrollmentDetail, LiveWorkout, ProgramEnrollment, UnitSystem } from "@/src/programs/types"

export default async function ProgramsPage({
  searchParams,
}: {
  // Next 16: a Promise, awaited before it is read.
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const auth = await requireAuth()
  const params = await searchParams

  let active: ProgramEnrollment[] = []
  let past: ProgramEnrollment[] = []
  let detail: EnrollmentDetail | null = null
  let live: LiveWorkout | null = null
  let accountUnit: UnitSystem | null = null
  let timezone: string | undefined
  let failed = false

  if (auth.success) {
    try {
      ;[active, past, live] = await Promise.all([
        listActiveEnrollments(auth.userId),
        listPastEnrollments(auth.userId),
        // So "Resume · 23 min" is on the first paint. A workout left open is
        // the one thing this page could never say before, because an
        // unfinished workout was not a thing that existed.
        getLiveWorkout(auth.userId),
      ])
      // With exactly one program the screen opens straight onto its session, so
      // that session is resolved here too rather than in a second round trip.
      if (active.length === 1) {
        detail = await getEnrollmentDetail(auth.userId, active[0].id)
      }
      accountUnit = await unitFor(auth.userId, null)
      // For "Log a past workout": the day a session is filed under is the
      // account's day, never the server's or the browser's.
      timezone = await getUserTimezone(auth.userId)
    } catch (error) {
      /**
       * A FAILED READ IS NOT AN EMPTY ACCOUNT.
       *
       * This swallowed the error and fell through with `active = []`, which the
       * screen renders identically to "you have no training program" — to
       * somebody three weeks into StrongLifts, during a database hiccup. It then
       * opened on the "Anything else" tab, because that is what no-program looks
       * like. `failed` is passed down so the screen can say it does not know.
       */
      console.error("Failed to pre-render training:", error)
      failed = true
    }
  }

  /**
   * THE FIRST PAINT IS ALREADY THE RIGHT SCREEN.
   *
   * The tab and the view were client state, so every arrival rendered Today
   * and then jumped to whatever the URL asked for. Parsed here, against the
   * programs this page has already read, so a link to History opens History.
   */
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") query.set(k, v)
    else if (Array.isArray(v) && v[0] !== undefined) query.set(k, v[0])
  }

  return (
    <TrainingScreen
      where={parseProgramsLocation(query, active)}
      initialActive={active}
      initialPast={past}
      initialDetail={detail}
      live={live}
      accountUnit={accountUnit}
      timezone={timezone}
      failed={failed}
    />
  )
}
