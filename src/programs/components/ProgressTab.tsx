"use client"

/**
 * What your training has actually amounted to.
 *
 * WHAT WAS MISSING. The app recorded every set and then had nowhere to show
 * you what they added up to. "Progress tracking" meant a heatmap of dots and a
 * week streak; nothing said whether you were lifting more than you were three
 * months ago, which is the only question anybody is really asking.
 *
 * Four things, in the order somebody wants them:
 *   1. This week — where you are against what you said you would do.
 *   2. Your bests — the heaviest single AND the best estimated max, which are
 *      different achievements and neither one can see the other.
 *   3. Weight moved per week — the number that goes up when training works.
 *   4. Each lift over time, which already existed and was hidden on another tab.
 *
 * NOTHING HERE INVENTS A NUMBER. Every figure comes from a pure function with
 * tests, and a figure that could not be worked out says so rather than
 * rendering a zero.
 */

import { lazy, Suspense } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLoad } from "@/src/shared/useLoad"
// `fromKg`, not the health slice's `convertWeight`: that one spells the unit
// "lbs" and this slice spells it "lb". Two spellings of one unit is how a
// number ends up converted twice or not at all.
import { describeLoggedSet, fromKg } from "../programsService"
import { dateKeyLabel } from "@/src/shared/dateUtils"
import { UNIT_CONFIG } from "../config"
import type { UnitSystem } from "../types"
import type { ProgressSnapshot } from "@/src/health/healthService"

const LiftHistory = lazy(() => import("./LiftHistory").then((m) => ({ default: m.LiftHistory })))

interface Props {
  /** Training days a week the running program asks for; 0 when none is. */
  plannedPerWeek: number
  unit: UnitSystem
  /**
   * The ACCOUNT's zone, and required.
   *
   * Every "which week was this" on this tab used to be decided by the
   * machine's clock — the browser's here, UTC on the server — so a Sunday
   * 23:30 session landed in the next week's bar and the squares disagreed
   * with the week strip on the Today tab, which reads the account's calendar.
   */
  timezone: string
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

export function ProgressTab({ plannedPerWeek, unit, timezone }: Props) {
  /**
   * ONE READ, ON THE SERVER, IN THE ACCOUNT'S CALENDAR.
   *
   * This tab used to download a year of workouts with every set attached and
   * work out the week, the eight bars and the bests in the browser — and the
   * lift panel inside it downloaded three years of the same rows again. Two
   * reads of one table for one screen, on a phone, after it had already
   * painted. It also meant the browser's clock decided which week "this week"
   * was, which is the thing every other training screen has stopped doing.
   *
   * `useLoad` rather than a hand-written fetch, because the hand-written one
   * here had the failure this app keeps fixing: a bad response became an empty
   * list, and an empty list renders as "you have trained nothing in twelve
   * months" — a statement about somebody's life with no grounds for it.
   */
  const loaded = useLoad<ProgressSnapshot>("/api/workouts/progress", (body) => {
    const snapshot = body as ProgressSnapshot | null
    if (!snapshot || !Array.isArray(snapshot.weeks)) throw new Error("unexpected shape")
    return snapshot
  })

  if (loaded.state === "failed") {
    return (
      <div
        data-testid="progress-unavailable"
        className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2"
      >
        <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Your training could not be loaded. This is not a statement about your training.
        </p>
        <Button size="sm" variant="outline" className="shrink-0" onClick={loaded.retry}>
          Try again
        </Button>
      </div>
    )
  }

  // A 92px placeholder, not a word: the tab keeps its height while it loads, so
  // the screen does not jump under a thumb that is already moving.
  if (loaded.state === "loading") {
    return <div className="h-[92px] animate-pulse rounded-md bg-muted/40" aria-hidden />
  }

  const snapshot = loaded.data
  /**
   * EMPTY IS A FACT ABOUT THE ACCOUNT, not about the chart. An account with one
   * workout of warm-ups has a chart of zeros and is not empty, and being told
   * "nothing logged yet" the day after training is how a screen loses somebody.
   */
  if (snapshot.empty) {
    return (
      <p data-testid="progress-empty" className="text-sm text-muted-foreground">
        Nothing logged yet. Finish a workout and it will be here.
      </p>
    )
  }

  const week = { ...snapshot.thisWeek, planned: Math.max(0, Math.round(plannedPerWeek)) }
  const volume = snapshot.weeks
  const bests = snapshot.bests
  const label = UNIT_CONFIG[unit].label
  /**
   * Grouped, because these run to five figures. "25293 kg" is a number you have
   * to count the digits of; "25,293 kg" is one you read.
   */
  const show = (kg: number) => Math.round(fromKg(kg, unit)).toLocaleString()
  const peak = Math.max(1, ...volume.map((v) => v.volumeKg))

  return (
    <div className="space-y-4">
      <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">This week</h3>
            <span className="text-xs text-muted-foreground">
              {week.planned > 0 ? `${week.done} of ${week.planned}` : `${week.done} so far`}
            </span>
          </div>
          <div className="flex gap-1.5" data-testid="week-dots">
            {week.days.map((d, i) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span
                  title={d.date}
                  className={`h-7 w-full rounded ${
                    d.done
                      ? "bg-primary"
                      : d.future
                        ? "border border-dashed border-border"
                        : "bg-muted"
                  }`}
                />
                <span className="text-xs text-muted-foreground">{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
          {/* A day that has not happened is not a day you missed. */}
      </section>

      {/*
        A CHART YOU CAN READ A NUMBER OFF.
        The bars were always scaled correctly — the problem was that nothing said
        what a bar was worth. No value axis, no unit, and labels that were
        `weekStart.slice(8)`: a day-of-month with no month, which is where
        "20 27 03 10 17 24 31 07" came from. A reader could see that one week was
        taller than another and nothing else.
      */}
      {/*
        SECTIONS, NOT SLABS.
        `Card` already carries its own vertical padding, and every call site then
        added `p-4` on top of it — so each of these three blocks paid about 32px
        of dead space above and below its content, in a lighter grey box on a
        dark page. Three boxes of identical weight say "three separate objects";
        these are three sections of one screen, so a rule separates them.
      */}
      <section className="space-y-2 border-t border-border/60 pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">Weight moved, per week</h3>
            <span className="text-xs text-muted-foreground">working sets only</span>
          </div>
          {volume.every((v) => v.volumeKg === 0) ? (
            <p className="text-sm text-muted-foreground">Nothing logged in the last eight weeks.</p>
          ) : (
            <div className="flex gap-2">
              {/* The value axis: the peak and the halfway mark, with the unit on
                  them. Two ticks is enough to read a bar off and does not crowd
                  a 390px screen. */}
              <div
                className="flex w-14 shrink-0 flex-col justify-between py-0 text-right text-xs tabular-nums text-muted-foreground"
                style={{ height: "72px" }}
                aria-hidden
              >
                <span>{show(peak)} {label}</span>
                <span>{show(peak / 2)}</span>
                <span>0</span>
              </div>
              {/*
                THE BARS AND THE LABELS ARE TWO ROWS, NOT EIGHT COLUMNS.
                They were one row of columns, each column being a bar above its
                own label, bottom-aligned with `items-end`. Three of the eight
                labels carry a month underneath ("Jul", "Aug", "Sep"), which made
                those three columns taller — and because the columns were aligned
                at their bottoms, those three bars were lifted about 13px off the
                baseline the other five sat on. The chart said the most recent
                week was smaller than the one before it while it was actually
                larger. A bar chart whose bars do not share a baseline is not a
                bar chart.
              */}
              <div className="min-w-0 flex-1">
                <div className="flex items-end gap-1.5" style={{ height: "72px" }} data-testid="volume-bars">
                  {volume.map((v) => (
                    <span
                      key={v.weekStart}
                      title={`Week of ${v.weekStart}: ${show(v.volumeKg)} ${label} over ${v.sets} sets`}
                      className="flex-1 rounded-t bg-primary/70"
                      style={{ height: `${Math.max(2, (v.volumeKg / peak) * 72)}px` }}
                    />
                  ))}
                </div>
                <div className="mt-1 flex gap-1.5">
                  {volume.map((v, i) => {
                    /**
                     * THE KEY IS THE DATE; the browser's zone gets no vote.
                     * `new Date("2026-06-01")` is UTC midnight, which west of
                     * UTC is the evening of 31 May — so this row read "May" in
                     * New York and "Jun" in Copenhagen for the same week, and
                     * the month was decided by `getMonth()` on that same
                     * shifted Date.
                     */
                    // The month, printed once when it changes, so the row reads
                    // as a date rather than eight loose integers.
                    const newMonth = i === 0 || volume[i - 1].weekStart.slice(0, 7) !== v.weekStart.slice(0, 7)
                    return (
                      <span
                        key={v.weekStart}
                        className="flex-1 text-center text-xs tabular-nums leading-tight text-muted-foreground"
                      >
                        {v.weekStart.slice(8)}
                        {newMonth && (
                          <span className="block">
                            {dateKeyLabel(v.weekStart, { month: "short" })}
                          </span>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
      </section>

      <section className="space-y-2 border-t border-border/60 pt-4">
          <h3 className="text-sm font-medium">Your bests</h3>
          {/*
            NO SECOND LOADING STATE. The bests had their own fetch and their own
            three states, so this block could say "could not be loaded" while
            the chart above it was fine — two answers about one screen. They
            come from the same snapshot now, and a failure is the tab's.
          */}
          {bests.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No working sets logged yet, so there is nothing to beat.
            </p>
          )}
          {bests.length > 0 && (
            <ul className="space-y-1.5" data-testid="lift-bests">
              {bests.slice(0, 8).map((b) => (
                <li key={b.exercise} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{b.exercise}</span>
                  {/* A pull-up has no weight on it, so "0 kg × 12 · est. max 0"
                      is not a fact about anything. Reps are the achievement.
                      The wording is `describeLoggedSet`'s, shared with History
                      and the receipt — this had its own copy of the rule, so
                      the three screens could disagree about one set. */}
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {b.bodyweight ? (
                      describeLoggedSet(
                        { exercise: b.exercise, weightKg: 0, reps: b.bestWeightReps },
                        unit
                      )
                    ) : (
                      <>
                        {describeLoggedSet(
                          { exercise: b.exercise, weightKg: b.bestWeightKg, reps: b.bestWeightReps },
                          unit
                        )}
                        <span className="opacity-60"> · est. max {show(b.bestEstimatedMaxKg)}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {/* Two bests because they are different achievements: 100×8 is a
              harder set than 110×1, and the heaviest single cannot see it. */}
      </section>

      <Suspense fallback={null}>
        {/* Its rows come from the same snapshot: this panel used to fetch
            three years of sets for itself, on top of the year this tab had
            already loaded. */}
        <LiftHistory lifts={snapshot.lifts} unit={unit} timezone={timezone} />
      </Suspense>
    </div>
  )
}
