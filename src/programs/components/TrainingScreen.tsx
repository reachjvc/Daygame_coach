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

import { lazy, Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { ProgramsApp } from "./ProgramsApp"
import { BackLink } from "@/components/BackLink"
import { MobileTabBar } from "@/components/MobileTabBar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getProgram } from "../data/catalog"
import { effectiveProgram, scheduleDaysOrNone } from "../customize"
import { isWeekdayAnchored, unitForDisplay } from "../programsService"
import type {
  EnrollmentDetail,
  LiveWorkout,
  ProgramEnrollment,
  ProgramsLocation,
  TrainingCardState,
  UnitSystem,
} from "../types"
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
type Tab = ProgramsLocation["tab"]

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
  /**
   * Which screen the address bar asked for, resolved on the server.
   *
   * Named `where` rather than `location` because `location` is a global in a
   * browser — shadowing it inside a component is how a typo silently reads
   * `window.location` instead.
   */
  where: ProgramsLocation
  /** Today, decided on the server — the same answer the Tracking card gets. */
  cardState?: TrainingCardState | null
}

export function TrainingScreen({
  initialActive,
  initialPast,
  initialDetail,
  live,
  accountUnit,
  failed,
  timezone,
  where,
  cardState = null,
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
  /**
   * THE TAB IS IN THE ADDRESS BAR, and the address bar is the only copy.
   *
   * It was `useState`, so no link could name a tab, Back always landed on
   * Today whatever you had been reading, and the server could not resolve the
   * first paint. The server parses the URL and hands the answer in; this holds
   * it only so a switch repaints without waiting for a round trip.
   */
  const [picked, setPicked] = useState<Tab | null>(null)
  const tab: Tab = picked ?? where.tab

  function goToTab(next: string) {
    const t = (["today", "history", "progress"] as const).find((v) => v === next) ?? "today"
    setPicked(t)
    /**
     * `replaceState`, NOT a router push.
     *
     * Next feeds this to `useSearchParams` without re-running the server page,
     * and re-running it would repeat the five queries `ProgramsPage` makes —
     * a tab switch is not new data. It is also not worth a history entry:
     * Back should leave Training, not walk back through the tabs.
     */
    const url = new URL(window.location.href)
    if (t === "today") url.searchParams.delete("tab")
    else url.searchParams.set("tab", t)
    window.history.replaceState(null, "", url)
  }

  /**
   * ONCE OPENED, A TAB STAYS MOUNTED.
   *
   * Every switch used to unmount History and Progress, and each re-downloads a
   * year of sets when it mounts — so going Today → History → Today → History
   * fetched the same year twice. Lazily loaded still (the chunk arrives on
   * first open), but not thrown away afterwards.
   */
  const [opened, setOpened] = useState<Set<Tab>>(() => new Set<Tab>([where.tab]))
  useEffect(() => {
    setOpened((seen) => (seen.has(tab) ? seen : new Set(seen).add(tab)))
  }, [tab])

  return (
    <div className="min-h-screen bg-background">
      {/*
        THE BAR IS HERE NOW, so the space is no longer dead.
        The comment that stood here said this route never mounts a bottom bar,
        which was true and was the bug: the bar's own "Training" tab was the
        one destination in the app that arrived somewhere with no bar, so the
        way back out disappeared the moment you used it.

        `max-w-2xl` matches the live workout screen, so the column does not
        shrink again on the way from here into the session.
      */}
      <div data-testid="training-screen" className="mx-auto max-w-2xl px-4 pb-tab-bar pt-4">
        <BackLink
          fallback="/dashboard"
          fallbackLabel="Dashboard"
          className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
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
            <Link
              href={LIFE_MASTERY}
              className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-foreground"
            >
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
            <Button size="sm" variant="outline" className="shrink-0" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        )}

        {/**
          * WHAT THE UNIT AND THE WEEKLY TARGET COME FROM.
          *
          * The running program decides both: its own unit, and how many days it
          * asks for in a week. With nothing running there is no target, and
          * "0 of 0" is not a goal — the progress view says "3 so far" instead.
          */}
        <Tabs value={tab} onValueChange={goToTab}>
          {/* FULL WIDTH AND THUMB HEIGHT. The old strip was four 11px sky-blue
              options huddled at the left — the app's only sky-blue control,
              and under half a thumb tall on the screen you hold in a gym. */}
          <TabsList className="grid h-auto w-full grid-cols-3 p-1">
            <TabsTrigger value="today" className="h-11 sm:h-8">
              Today
            </TabsTrigger>
            <TabsTrigger value="history" className="h-11 sm:h-8">
              History
            </TabsTrigger>
            <TabsTrigger value="progress" className="h-11 sm:h-8">
              Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-3">
            <ProgramsApp
              initialActive={initialActive}
              initialPast={initialPast}
              initialDetail={initialDetail}
              live={live}
              cardState={cardState}
              where={where}
            />
          </TabsContent>

          {/* `forceMount` + `hidden`: rendered once opened and kept, so the
              second visit issues no request. Not mounted before the first
              visit, so the chunk and the year of sets are still only fetched
              by somebody who asks for them. */}
          {opened.has("history") && (
            <TabsContent value="history" forceMount hidden={tab !== "history"} className="mt-3">
              <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
                <HistoryTab
                  unit={unit}
                  enrollments={initialActive}
                  liveOpen={live !== null}
                  timezone={timezone}
                />
              </Suspense>
            </TabsContent>
          )}

          {opened.has("progress") && (
            <TabsContent value="progress" forceMount hidden={tab !== "progress"} className="mt-3">
              <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
                <ProgressTab plannedPerWeek={plannedPerWeek} unit={unit} />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
      <MobileTabBar />
    </div>
  )
}
