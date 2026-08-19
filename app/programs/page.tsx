"use client"

/**
 * Training programs, in the real app.
 *
 * The outcome half of the Templates tab: a program picked and shaped over on
 * /test/life-mastery becomes an enrollment, and this is where that enrollment
 * is actually lived with — today's session, logging it, watching the weights
 * move, and changing the program when the gym or the body says so.
 *
 * Not in the main nav yet. Enrolling already writes through to workout_logs, so
 * the sessions reach the dashboard's metrics either way; where this belongs in
 * the app's navigation is a product decision rather than a technical one.
 */

import { ProgramsApp } from "@/src/programs/components/ProgramsApp"

export default function ProgramsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Training</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Your programs, today&apos;s session, and everything you have logged. Change any program at
          any time — your weights carry over.
        </p>
        <ProgramsApp />
      </div>
    </div>
  )
}
