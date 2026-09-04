"use client"

/**
 * Training, in the real app — the one page where a workout is both prescribed
 * and recorded.
 *
 * The outcome half of the Templates tab: a program picked and shaped over on
 * /test/life-mastery becomes an enrollment, and this is where that enrollment
 * is actually lived with — today's session, logging it, watching the weights
 * move, and changing the program when the gym or the body says so.
 *
 * TWO WAYS TO RECORD A WORKOUT, because people train both ways:
 *
 *   - **On a program.** `ProgramsApp` prescribes today's session with the exact
 *     weights, you correct what you actually did, and logging it moves the
 *     weights for next time.
 *   - **Off a program.** `WorkoutLogger` takes any exercise, sets, reps and
 *     weight with no program behind it — the session you improvised, the class
 *     you went to, the run.
 *
 * Both write to the same `workout_logs` / `workout_sets` rows, so either way the
 * session counts towards the gym-sessions tile on the tracking dashboard and any
 * goal linked to it. Leaving the free-form logger off this page meant a workout
 * done outside the program had nowhere to go: it was only ever mounted on the
 * archived goals hub.
 *
 * Reached from Quick Actions on the tracking dashboard, and from the
 * confirmation you get when you start a program in Life Mastery.
 */

import { lazy, Suspense } from "react"
import { ProgramsApp } from "@/src/programs/components/ProgramsApp"
import { BackLink } from "@/components/BackLink"
import { LiftHistory } from "@/src/programs/components/LiftHistory"

/**
 * 800-odd lines of set rows, templates, heatmap and personal-record detection,
 * below the fold and behind a button. Loaded the way `HealthTrackingPanel`
 * loads it, so it costs the programs half of this page nothing.
 */
const WorkoutLogger = lazy(() =>
  import("@/src/health/components/WorkoutLogger").then((m) => ({ default: m.WorkoutLogger }))
)

export default function ProgramsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <BackLink fallback="/dashboard" fallbackLabel="Dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-1">Training</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Log what you did — today&apos;s prescribed session below, or any workout at all further
          down. Change a program whenever you like; your weights carry over.
        </p>
        <ProgramsApp />

        <div className="mt-10 border-t border-border pt-8">
          <h2 className="text-lg font-semibold mb-1">Log any workout</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Trained off-program? Put it here. Any exercise, sets, reps and weight — it counts towards
            your tracked sessions just the same.
          </p>
          <Suspense
            fallback={<p className="text-sm text-muted-foreground">Loading the workout log…</p>}
          >
            <WorkoutLogger />
          </Suspense>
        </div>

        {/* One lift across every program and every loose workout. Below the
            logger because it is something you read, not something you do, and
            it renders nothing until a lift has been done twice. */}
        <div className="mt-10">
          <Suspense fallback={null}>
            <LiftHistory />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
