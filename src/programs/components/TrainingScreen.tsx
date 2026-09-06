"use client"

/**
 * The Training screen — one question, two answers, and no waiting on load.
 *
 * ONE QUESTION. This page used to stack three cards of equal weight — today's
 * session, the history, and a separate "log any workout" — and came to 2264
 * pixels on a phone for a single workout. Somebody opening it to write down what
 * they did had to choose between three things called logging, with nothing on
 * screen to help them choose.
 *
 * NO WAITING. Everything is resolved by the server component that renders this
 * (`app/programs/page.tsx`) and handed in as `initial*`, so the first paint has
 * the session on it. The client only fetches again after something changes.
 *
 * Both answers write to the same `workout_logs` / `workout_sets` rows, so either
 * way the session counts towards the gym-sessions tile on the tracking dashboard
 * and any goal linked to it.
 */

import { lazy, Suspense, useState } from "react"
import Link from "next/link"
import { ProgramsApp } from "./ProgramsApp"
import { BackLink } from "@/components/BackLink"
import { Segmented } from "./ui"
import type { EnrollmentDetail, ProgramEnrollment } from "../types"

/**
 * 800-odd lines of set rows, templates, heatmap and personal-record detection,
 * behind a tab. Somebody who never opens the other tab never downloads it.
 */
const WorkoutLogger = lazy(() =>
  import("@/src/health/components/WorkoutLogger").then((m) => ({ default: m.WorkoutLogger }))
)
const LiftHistory = lazy(() =>
  import("./LiftHistory").then((m) => ({ default: m.LiftHistory }))
)

type Tab = "session" | "anything"

interface Props {
  initialActive: ProgramEnrollment[]
  initialPast: ProgramEnrollment[]
  /** Today's session, when exactly one program is running. */
  initialDetail: EnrollmentDetail | null
}

export function TrainingScreen({ initialActive, initialPast, initialDetail }: Props) {
  /**
   * The default is DECIDED, not flickered into.
   *
   * The server already knows whether there is a program, so somebody with none
   * lands on "Anything else" on the very first paint rather than being shown an
   * empty session tab for a moment first.
   */
  const [picked, setPicked] = useState<Tab | null>(null)
  const tab: Tab = picked ?? (initialActive.length === 0 ? "anything" : "session")

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 pb-tab-bar">
        <BackLink
          fallback="/dashboard"
          fallbackLabel="Dashboard"
          className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        />
        <h1 className="mb-1 text-2xl font-bold">Training</h1>
        {/* Training and the plan that produced it were two places that never
            referred to each other. */}
        <p className="mb-3 text-sm text-muted-foreground">
          Part of your{" "}
          <Link href="/test/life-mastery" className="underline underline-offset-2 hover:text-foreground">
            Life Mastery plan
          </Link>
          .
        </p>

        <div className="mb-4">
          <Segmented
            label="What are you logging?"
            value={tab}
            onChange={(t) => setPicked(t)}
            options={[
              { value: "session" as Tab, label: "Today's session" },
              { value: "anything" as Tab, label: "Anything else" },
            ]}
          />
        </div>

        {tab === "session" ? (
          <ProgramsApp
            initialActive={initialActive}
            initialPast={initialPast}
            initialDetail={initialDetail}
          />
        ) : (
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                Anything you did that isn&apos;t today&apos;s session — a class, a run, a session you
                improvised. It counts towards your tracked sessions just the same.
              </p>
              <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
                <WorkoutLogger />
              </Suspense>
            </div>
            {/* Something you read, not something you do. */}
            <Suspense fallback={null}>
              <LiftHistory />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
