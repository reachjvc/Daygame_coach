"use client"

/**
 * Training, on the dashboard, in one card.
 *
 * WHAT IT REPLACES. The dashboard embedded the whole session form — every lift,
 * every set, two number boxes each — inside a panel meant to be glanced at.
 * Somebody checking their day was shown an eight-lift data-entry form they had
 * not asked for, and the one thing they might actually want (the way back into
 * a workout they were already in the middle of) was not on it at all.
 *
 * A card answers one question: what about training, right now? Four answers,
 * decided by `trainingCardState`, which is pure and tested:
 *
 *   - a workout is running     → how long, and Resume
 *   - one was left open        → say so, and offer to finish or throw it away
 *   - today has a session      → its name, how many lifts, and Start
 *   - today is a rest day      → what is next, so the card is not just "no"
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Dumbbell, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useActiveEnrollments, useEnrollment } from "../hooks/useEnrollment"
import { enrollmentName } from "../data/catalog"
import { trainingCardState } from "../programsService"
import { startKeyFor } from "../hooks/useLiveWorkout"
import { WEEKDAY_SHORT } from "../config"
import type { LiveWorkout } from "../types"

export function TrainingCard({ live: given }: { live?: LiveWorkout | null }) {
  const { enrollments, loading, error } = useActiveEnrollments()
  const running = enrollments[0]
  const { detail } = useEnrollment(running?.id ?? null)

  /**
   * The open workout, asked for here rather than passed in.
   *
   * It IS a prop, because a page that already resolved it on the server should
   * hand it over rather than make the browser ask again. Neither dashboard
   * does, though, so without this the card could never reach its most important
   * state: somebody standing in a gym was shown today's plan again instead of
   * the way back into the workout they were already in.
   */
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  /**
   * Start today's session from here, rather than sending you to a screen with
   * another Start button on it. Uses the same client key as `TodayCard`, which
   * is what stops a second tap opening a second workout — the database allows
   * one at a time, so without the shared key the second request is refused with
   * a raw error.
   */
  async function startNow(enrollmentId: string) {
    setStarting(true)
    setStartError(null)
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No dayId: `workoutRepo` falls back to `prescription.dayId`, which is
        // today's session — the same one this card just named.
        body: JSON.stringify({ enrollmentId, clientKey: startKeyFor(enrollmentId) }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setStartError(body?.error ?? "Could not start that workout.")
        return
      }
      router.push("/programs/live")
    } catch {
      setStartError("Could not reach the server, so nothing was started.")
    } finally {
      setStarting(false)
    }
  }

  const [fetched, setFetched] = useState<LiveWorkout | null>(null)
  const [liveUnknown, setLiveUnknown] = useState(false)
  useEffect(() => {
    if (given !== undefined) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/workouts/live")
        if (res.ok && !cancelled) setFetched((await res.json()) as LiveWorkout | null)
        else if (!cancelled) setLiveUnknown(true)
      } catch {
        /**
         * NOT "there is no open workout".
         *
         * Assuming that showed "Today: Upper · Start" to somebody with a
         * workout already running — and the database allows one at a time, so
         * the offered action is the one that cannot succeed, and Resume, the
         * whole reason this card exists, is hidden.
         */
        if (!cancelled) setLiveUnknown(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [given])
  const live = given ?? fetched

  // A failed load is not "you have no programs" — say so rather than vanishing.
  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Your training could not be loaded just now.{" "}
            <Link href="/programs" className="underline">
              Open training
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) return null

  const state = trainingCardState(
    live ? { id: live.id, startedAt: live.startedAt } : null,
    detail?.prescription ?? null,
    running?.id ?? null
  )

  // Nothing running and nothing open: the dashboard should not carry an empty
  // training card, so this renders nothing at all.
  if (state.kind === "none" && !liveUnknown) return null

  // Could not find out whether a workout is open. Offer the screen that knows,
  // rather than a Start that would be refused.
  if (liveUnknown) {
    return (
      <Card data-testid="training-card">
        <CardContent className="space-y-2 p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Could not check whether you have a workout open.
          </p>
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/programs">Open training</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="training-card">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Dumbbell className="size-3.5" /> Training
          </span>
          {running && (
            <Link
              href="/programs"
              className="truncate text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {enrollmentName(running)}
            </Link>
          )}
        </div>

        {state.kind === "live" && (
          <>
            <p className="text-sm font-medium">Workout in progress · {state.minutes} min</p>
            <Button asChild size="sm" className="w-full" data-testid="training-card-resume">
              <Link href="/programs/live">Resume</Link>
            </Button>
          </>
        )}

        {state.kind === "stale" && (
          <>
            {/* Six hours in, "Resume · 431 min" is the app pretending not to
                notice. Name the day it started and offer the real choice. */}
            <p className="text-sm font-medium">
              A workout from{" "}
              {new Date(state.startedAt).toLocaleDateString(undefined, { weekday: "long" })} is still
              open.
            </p>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/programs/live">Finish it or throw it away</Link>
            </Button>
          </>
        )}

        {state.kind === "today" && (
          <>
            <p className="text-sm font-medium">
              Today: {state.dayLabel}
              {state.lifts > 0 && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {state.lifts} {state.lifts === 1 ? "lift" : "lifts"}
                </span>
              )}
            </p>
            {/*
              ONE START, NOT TWO.
              This said "Start" and went to /programs, where you found another
              button also saying "Start workout". Two identical-sounding buttons
              for one action, and a screen in between that you did not ask for.
              It starts the workout now and takes you to the screen you log on —
              the same request `TodayCard` makes, with the same retry key, so
              tapping both does not open two workouts.
            */}
            {/*
              SECONDARY, BECAUSE THIS PAGE ALREADY HAS A PRIMARY.
              The Tracking page leads with "Start Session" — its own orange
              call to action — and a second orange button directly under it made
              two equal shouts on one screen, neither of which is obviously the
              main one. Resume stays primary (an open workout is urgent and you
              are being asked to go back to something you left); a session that
              is merely due is an offer, not an interruption.
            */}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              data-testid="training-card-start"
              disabled={starting}
              onClick={() => void startNow(state.enrollmentId)}
            >
              {starting ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
              Start
            </Button>
            {startError && (
              <p className="text-xs text-destructive">
                {startError}{" "}
                <Link href="/programs" className="underline">
                  Open training
                </Link>
              </p>
            )}
          </>
        )}

        {state.kind === "rest" && (
          <p className="text-sm">
            <span className="font-medium">Rest day.</span>{" "}
            <span className="text-muted-foreground">
              Next up is {state.nextLabel}
              {state.nextWeekday ? ` on ${WEEKDAY_SHORT[state.nextWeekday]}` : ""}.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
