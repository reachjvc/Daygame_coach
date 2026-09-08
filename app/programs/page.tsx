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
  getTodaySession,
  getSessionLogs,
} from "@/src/db/programRepo"
import { getLiveWorkout } from "@/src/db/workoutRepo"
import { TrainingScreen } from "@/src/programs/components/TrainingScreen"
import type { EnrollmentDetail, LiveWorkout, ProgramEnrollment } from "@/src/programs/types"

export default async function ProgramsPage() {
  const auth = await requireAuth()

  let active: ProgramEnrollment[] = []
  let past: ProgramEnrollment[] = []
  let detail: EnrollmentDetail | null = null
  let live: LiveWorkout | null = null

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
        const [prescription, logs] = await Promise.all([
          getTodaySession(auth.userId, active[0].id),
          getSessionLogs(auth.userId, active[0].id),
        ])
        detail = { enrollment: active[0], prescription, logs }
      }
    } catch (error) {
      console.error("Failed to pre-render training:", error)
    }
  }

  return <TrainingScreen initialActive={active} initialPast={past} initialDetail={detail} live={live} />
}
