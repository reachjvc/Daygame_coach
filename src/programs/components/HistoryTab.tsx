"use client"

/**
 * EVERY WORKOUT YOU HAVE EVER LOGGED, a month at a time.
 *
 * WHAT THIS REPLACES. The list asked the server for `days=365` and paged that
 * array in the browser. A workout from two years ago was not further down the
 * list — it had never been read, and nothing on the screen knew the
 * difference. "Show more" then ran out of rows and disappeared, which is the
 * same gesture as "that is everything" and was not.
 *
 * Worse, every row carried every set of every workout, because the row
 * expanded into an editor. That is the read which outgrew the database's
 * 1,000-row response limit: each workout came back missing its later sets, and
 * saving the list you were shown would have deleted them for real. The editor
 * lives on the workout's own page now (`/programs/workout/[id]`), which asks
 * for one workout.
 *
 * THE MONTH IS THE UNIT because the month is what this draws: a header, and
 * under it what the month came to. A page that ended mid-month would make that
 * total a lie — "September: 4 sessions" with the fifth on the next page.
 */

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLoad } from "@/src/shared/useLoad"
import { describeSessionRow, isWorkingSet, workingVolumeKg } from "@/src/health/healthService"
import { describeLoggedSet, fromKg } from "../programsService"
import { dateKeyLabel } from "@/src/shared/dateUtils"
import { DEFAULT_SESSION_TYPE, UNIT_CONFIG } from "../config"
import { workoutReceipt } from "@/src/shared/trainingRoutes"
import { LogPastWorkoutDialog } from "./LogPastWorkoutDialog"
import type { ProgramEnrollment, UnitSystem } from "../types"
import type { WorkoutLogRow, WorkoutSetRow } from "@/src/health/types"

const DAY = { weekday: "short", day: "numeric", month: "short" } as const

/** One month of the list, as the server hands it over. */
interface HistoryMonth {
  monthKey: string
  monthStart: string
  logs: (WorkoutLogRow & { sets: WorkoutSetRow[] })[]
}

interface HistoryPage {
  timezone: string
  /** The filter these months were read under, so the screen can tell. */
  lift: string | null
  months: HistoryMonth[]
  /** The instant to ask below for the next page, or null at the beginning. */
  nextBefore: string | null
}

/** Every lift named anywhere in what has been loaded, for the filter. */
const liftsIn = (months: HistoryMonth[]): string[] =>
  [...new Set(months.flatMap((m) => m.logs.flatMap((l) => (l.sets ?? []).map((s) => s.exercise))))].sort()

export function HistoryTab({
  unit,
  enrollments = [],
  liveOpen = false,
  timezone,
}: {
  unit: UnitSystem
  enrollments?: readonly ProgramEnrollment[]
  liveOpen?: boolean
  /** The account's zone. Without it a past session lands on the wrong day. */
  timezone?: string
}) {
  const [lift, setLift] = useState<string>("")
  /** Pages fetched after the first, appended in order. */
  const [older, setOlder] = useState<HistoryMonth[]>([])
  const [olderBefore, setOlderBefore] = useState<string | null | undefined>(undefined)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)

  /**
   * Page one, from the server. Changing the lift refetches it, because the
   * filter has to cover ALL of the history rather than the part that happens
   * to be loaded.
   */
  const loaded = useLoad<HistoryPage>(
    `/api/workouts/history${lift ? `?lift=${encodeURIComponent(lift)}` : ""}`,
    (body) => {
      const page = body as HistoryPage | null
      if (!page || !Array.isArray(page.months)) throw new Error("unexpected shape")
      return page
    }
  )

  const label = UNIT_CONFIG[unit].label
  const showTotal = (kg: number) => Math.round(fromKg(kg, unit)).toLocaleString()

  if (loaded.state === "failed") {
    return (
      <div
        data-testid="history-unavailable"
        className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2"
      >
        <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Your workouts could not be loaded. This does not mean there are none.
        </p>
        <Button size="sm" variant="outline" className="shrink-0" onClick={loaded.retry}>
          Try again
        </Button>
      </div>
    )
  }

  // A placeholder the height of the list's first rows, so the tab does not
  // jump under a thumb that is already moving.
  if (loaded.state === "loading") {
    return <div className="h-[92px] animate-pulse rounded-md bg-muted/40" aria-hidden />
  }

  /**
   * THE ROWS AND THE HEADER ARE NEVER FROM DIFFERENT FILTERS.
   *
   * `useLoad` keeps the previous answer on screen while a new URL is in
   * flight, which is right for a flicker and wrong here: the filter is client
   * state and flips the moment it is tapped, so for that moment the header
   * read "8,000 kg of Squat" over a month of every lift. Found by a browser
   * test, which is the only place it could be found.
   */
  if ((loaded.data.lift ?? "") !== lift) {
    return <div className="h-[92px] animate-pulse rounded-md bg-muted/40" aria-hidden />
  }

  const months = [...loaded.data.months, ...older]
  const zone = timezone ?? loaded.data.timezone
  // `undefined` means nothing has been paged yet, so the first page's answer
  // stands; `null` means the server has looked and there is nothing older.
  const nextBefore = olderBefore === undefined ? loaded.data.nextBefore : olderBefore
  const lifts = liftsIn(months)

  async function loadOlder() {
    if (!nextBefore) return
    setLoadingMore(true)
    setMoreFailed(false)
    try {
      const url = `/api/workouts/history?before=${encodeURIComponent(nextBefore)}${
        lift ? `&lift=${encodeURIComponent(lift)}` : ""
      }`
      const res = await fetch(url)
      if (!res.ok) throw new Error(String(res.status))
      const page = (await res.json()) as HistoryPage
      if (!Array.isArray(page.months)) throw new Error("unexpected shape")
      setOlder((current) => [...current, ...page.months])
      setOlderBefore(page.nextBefore)
    } catch {
      // NOT the end of the list. A failed second page that quietly stopped
      // offering "older" would read as "that is everything".
      setMoreFailed(true)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div data-testid="workout-history" className="space-y-2">
      {/* THE ONE WAY IN FOR A SESSION YOU ALREADY DID. History is where you
          notice one is missing, so it is where the way to add it belongs.
          Absent without a time zone rather than guessing the browser's: a
          workout filed a day out is worse than one not filed yet. */}
      {timezone && (
        <div className="flex justify-end">
          <LogPastWorkoutDialog
            enrollments={enrollments}
            liveOpen={liveOpen}
            timezone={timezone}
          />
        </div>
      )}

      {(lifts.length > 1 || lift) && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Lift</span>
          <Select
            value={lift || "all"}
            onValueChange={(value) => {
              // Page one again, from the server: the filter covers all of the
              // history, not the months this browser happens to hold.
              setLift(value === "all" ? "" : value)
              setOlder([])
              setOlderBefore(undefined)
              setMoreFailed(false)
            }}
          >
            <SelectTrigger className="h-11 flex-1" data-testid="history-lift-filter">
              <SelectValue placeholder="All lifts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lifts</SelectItem>
              {/* The current filter stays selectable even when the loaded
                  pages no longer mention it. */}
              {[...new Set(lift ? [lift, ...lifts] : lifts)].map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {months.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="history-empty">
          {lift
            ? `Nothing logged for ${lift} yet.`
            : "Nothing logged yet. Finish a workout and it will be here."}
        </p>
      )}

      {months.map((month) => {
        /**
         * The month's own total, from the month's own sets — which the server
         * has already narrowed to the filtered lift, so "of Squat" means it.
         */
        const volume = month.logs.reduce((total, log) => total + workingVolumeKg(log.sets ?? []), 0)
        return (
          <div key={month.monthKey}>
            {/* THE MONTH, once, with what it came to. Sticky, which is what
                makes a long scroll navigable instead of endless. */}
            <div className="sticky top-0 z-10 -mx-1 flex items-baseline justify-between gap-2 bg-background/95 px-1 py-1.5 backdrop-blur">
              <h3 className="text-sm font-medium">
                {dateKeyLabel(month.monthKey, { month: "long", year: "numeric" })}
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {month.logs.length} {month.logs.length === 1 ? "session" : "sessions"} ·{" "}
                {showTotal(volume)} {label}
                {lift ? ` of ${lift}` : ""}
              </span>
            </div>

            <ul className="divide-y divide-border/60">
              {month.logs.map((log) => {
                /** The top working set of each lift, in the LIFTER'S unit. */
                const tops = Object.values(
                  (log.sets ?? [])
                    .filter(isWorkingSet)
                    .reduce<Record<string, { exercise: string; weightKg: number; reps: number }>>(
                      (top, set) => {
                        const cur = top[set.exercise]
                        if (
                          !cur ||
                          set.weight_kg > cur.weightKg ||
                          (set.weight_kg === cur.weightKg && set.reps > cur.reps)
                        ) {
                          top[set.exercise] = {
                            exercise: set.exercise,
                            weightKg: set.weight_kg,
                            reps: set.reps,
                          }
                        }
                        return top
                      },
                      {}
                    )
                )
                const working = (log.sets ?? []).filter(isWorkingSet)

                return (
                  <li key={log.id}>
                    {/*
                      A ROW IS A LINK TO THE WORKOUT, not an expander.
                      Tapping it used to unfold the session in place, which is
                      why the list had to carry every set of every workout. The
                      page it goes to asks for one.
                    */}
                    <Link
                      href={workoutReceipt(log.id)}
                      data-testid={`history-row-${log.id}`}
                      className="flex min-h-14 items-start justify-between gap-3 py-2 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">
                          {new Date(log.logged_at).toLocaleDateString([], {
                            ...DAY,
                            timeZone: zone,
                          })}
                        </span>
                        {/*
                          A RUN HAS NO SETS, AND THAT IS NOT A FAILURE.
                          "No sets recorded" was printed over every run, class
                          and mobility session — which reads as something having
                          gone wrong with a session that went fine. The sentence
                          is `describeSessionRow`'s, shared with the receipt, and
                          it leaves the minutes to the column on the right.
                        */}
                        <span className="block truncate text-xs text-muted-foreground">
                          {tops.length > 0
                            ? tops
                                .map((top) => `${top.exercise} ${describeLoggedSet(top, unit)}`)
                                .join(" · ")
                            : log.session_type === DEFAULT_SESSION_TYPE
                              ? "No sets recorded"
                              : describeSessionRow(log, { minutes: false })}
                        </span>
                      </span>
                      {/*
                        A DURATION THAT IS NOT THERE IS NOT ZERO MINUTES.
                        This was `{log.duration_min} min`, and the column is
                        nullable — a workout whose instants the server could not
                        subtract printed a bare " min". Built as parts so the
                        separator cannot end up leading either.
                      */}
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {[
                          log.duration_min === null || log.duration_min === undefined
                            ? null
                            : `${log.duration_min} min`,
                          working.length > 0
                            ? `${working.length} ${working.length === 1 ? "set" : "sets"}`
                            : null,
                        ]
                          .filter((part): part is string => part !== null)
                          .join(" · ")}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}

      {moreFailed && (
        <div
          data-testid="history-more-unavailable"
          className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2"
        >
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Could not load older workouts. There are more — this is not the beginning.
          </p>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => void loadOlder()}>
            Try again
          </Button>
        </div>
      )}

      {nextBefore && !moreFailed && (
        <Button
          variant="outline"
          className="min-h-11 w-full"
          disabled={loadingMore}
          onClick={() => void loadOlder()}
          data-testid="history-load-more"
        >
          {loadingMore ? "Loading…" : "Show more — older"}
        </Button>
      )}

      {!nextBefore && months.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="history-end">
          {/* A FACT THE SERVER CHECKED. The old list simply stopped offering
              "more" when its array ran out, which is the same gesture for
              "that is everything" and "I only fetched a year". */}
          That is everything.
        </p>
      )}
    </div>
  )
}
