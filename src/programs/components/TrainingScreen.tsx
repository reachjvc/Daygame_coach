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
import { getProgram } from "../data/catalog"
import { effectiveProgram, scheduleDaysOrNone } from "../customize"
import { isWeekdayAnchored, unitForDisplay } from "../programsService"
import type { EnrollmentDetail, LiveWorkout, ProgramEnrollment, UnitSystem } from "../types"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

/* Two more tabs, each a year of workouts and a pile of charts. Nobody who stays
   on today's session downloads either. */
const HistoryTab = lazy(() => import("./HistoryTab").then((m) => ({ default: m.HistoryTab })))
const ProgressTab = lazy(() => import("./ProgressTab").then((m) => ({ default: m.ProgressTab })))

/**
 * THREE TABS, not four.
 *
 * "Anything else" existed to hold two things: an improvised workout, and a
 * form for writing up one you had already done. The form is gone — there is
 * one way to record a workout now — and starting an empty one belongs beside
 * today's session, not on a tab of its own that nobody opened.
 */
type Tab = "session" | "history" | "progress"

interface Props {
  initialActive: ProgramEnrollment[]
  initialPast: ProgramEnrollment[]
  /** Today's session, when exactly one program is running. */
  initialDetail: EnrollmentDetail | null
  /** A workout already open, so "Resume" is on the first paint. */
  live: LiveWorkout | null
  /** What the account says it trains in, when no program is running. */
  accountUnit: UnitSystem | null
  /** The server read failed — this is NOT the same as having no programs. */
  failed?: boolean
  /** The account's zone, for dating a workout written up afterwards. */
  timezone?: string
}

export function TrainingScreen({
  initialActive,
  initialPast,
  initialDetail,
  live,
  accountUnit,
  failed,
  timezone,
}: Props) {
  const running = initialActive[0]
  /**
   * WHOSE UNIT. This was `running?.unitSystem === "lb" ? "lb" : "kg"`, so the
   * moment no program was running — you ended one, or you only ever use "Start
   * a workout now" — every number on History and Progress silently converted to
   * kilograms. Same sets, different numbers, no warning. `unitForDisplay` asks
   * the enrollment first, then the account, and says `null` when neither knows
   * rather than answering kilograms on their behalf.
   */
  const unit: UnitSystem = unitForDisplay(running?.unitSystem, accountUnit) ?? "kg"
  /**
   * Training days a week the running program asks for — ONLY when it says so.
   *
   * Counting the day templates is wrong and was the first thing I did: a
   * rotation like StrongLifts has two of them (A and B) and is trained three
   * times a week, so the screen read "2 of 2" to somebody who had two sessions
   * still to do. No program in the catalogue declares a weekly frequency, so
   * there is nothing to read.
   *
   * A schedule that PINS WEEKDAYS does state it — "Monday, Wednesday, Friday"
   * is a target — and that is the only case with a real answer. Everything else
   * gets no target, and the view says "3 so far" instead of inventing one.
   */
  const plannedPerWeek = (() => {
    if (!running) return 0
    const catalog = getProgram(running.program_id)
    if (!catalog) return 0
    /**
     * NO try/catch ANY MORE. This swallowed whatever `scheduleDays` threw and
     * answered 0 — which reads on screen as "your program asks for nothing".
     * The one thing it actually threw for was a running plan, which is not
     * weekday-anchored anyway, so the honest version needs no catch at all.
     */
    const schedule = effectiveProgram(catalog, running.customSchedule).schedule
    if (!isWeekdayAnchored(schedule)) return 0
    return scheduleDaysOrNone(schedule).length
  })()

  /**
   * TODAY, ALWAYS — the tab is not a guess about what you want.
   *
   * It used to send anybody with no program to "Anything else", a form for
   * writing up a session after the fact. So a new user's first sight of the
   * training feature was a page about workouts they had already done, with no
   * mention anywhere that programs exist; and the tab called "Today" was the one
   * place they were never shown. The Today tab now carries both doors — pick a
   * program, or start one now — so there is nothing left to route around.
   *
   * The default is still DECIDED rather than flickered into: the server already
   * knows whether there is a program, so the first paint is the right tab.
   */
  const [picked, setPicked] = useState<Tab | null>(null)
  const tab: Tab = picked ?? "session"

  return (
    <div className="min-h-screen bg-background">
      {/* `pb-tab-bar` reserved 64px for a bottom bar this route never mounts, so
          every Training screen ended in a strip of dead space; and `max-w-4xl`
          was wider than the dashboard people arrive from, so the page jumped
          width on the way in. */}
      <div className="mx-auto max-w-3xl px-4 pb-6 pt-4">
        <BackLink
          fallback="/dashboard"
          fallbackLabel="Dashboard"
          className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        />
        {/*
          THE MASTHEAD WAS 22% OF THE PHONE.
          A back link, then "Training" at 24px, then a sentence about the Life
          Mastery plan, then the tabs: 184px before anything about training
          appeared, on every one of the four tabs. The tabs directly below
          already say which screen you are on, so the word "Training" does not
          need to be the largest thing on it. One line now, with the plan link
          as an aside inside it.
        */}
        <h1 className="mb-3 text-base font-semibold">
          Training{" "}
          {/* THE LIVE ADDRESS, not the bench one. This pointed at
              `/test/life-mastery`, and every page under `/test` answers 404 in
              production by design (`app/test/layout.tsx`) — so on the deployed
              site the one link joining training to the plan it belongs to was a
              dead end. `/dashboard/goals/plan` is the same flow with the
              account behind it, and is where the rest of the app already sends
              people. */}
          <span className="text-xs font-normal text-muted-foreground">
            · part of your{" "}
            <Link href={LIFE_MASTERY} className="underline underline-offset-2 hover:text-foreground">
              Life Mastery plan
            </Link>
          </span>
        </h1>

        {/*
          THE SERVER READ FAILED, AND THAT IS NOT "YOU HAVE NO PROGRAMS".
          `app/programs/page.tsx` used to swallow the error and fall through with
          an empty list, which this screen renders identically to a brand-new
          account: a dumbbell, "No active program", and the catalogue — to
          somebody three weeks into StrongLifts. It also opened on the wrong tab,
          because that is what having no program looks like.
        */}
        {failed && (
          <div
            role="alert"
            data-testid="training-load-failed"
            className="mb-4 flex items-center justify-between gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400"
          >
            <span>Your training could not be loaded, so this page may be incomplete.</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 rounded-md border border-amber-500/40 px-2 py-1 text-xs transition-colors hover:bg-amber-500/15"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mb-3">
          <Segmented
            label="What are you logging?"
            value={tab}
            onChange={(t) => setPicked(t)}
            options={[
              { value: "session" as Tab, label: "Today" },
              { value: "history" as Tab, label: "History" },
              { value: "progress" as Tab, label: "Progress" },
            ]}
          />
        </div>

        {/**
          * WHAT THE UNIT AND THE WEEKLY TARGET COME FROM.
          *
          * The running program decides both: its own unit, and how many days it
          * asks for in a week. With nothing running there is no target, and
          * "0 of 0" is not a goal — the progress view says "3 so far" instead.
          */}
        {tab === "history" ? (
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <HistoryTab
              unit={unit}
              enrollments={initialActive}
              liveOpen={live !== null}
              timezone={timezone}
            />
          </Suspense>
        ) : tab === "progress" ? (
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
            <ProgressTab plannedPerWeek={plannedPerWeek} unit={unit} />
          </Suspense>
        ) : (
          <ProgramsApp
            initialActive={initialActive}
            initialPast={initialPast}
            initialDetail={initialDetail}
            live={live}
          />
        )}
      </div>
    </div>
  )
}
