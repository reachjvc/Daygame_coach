"use client"

/**
 * What you are doing today, and the one button that starts it.
 *
 * WHAT THIS REPLACES. The session card WAS the form: every lift pre-filled,
 * every set a pair of boxes, and one save at the end. Reading what today is and
 * doing it were the same screen, so the thing you look at for three seconds was
 * built for the thing you use for an hour.
 *
 * They are now separate. This says what today is — the program, the day, the
 * lifts, and whether you are behind — and hands off to `/programs/live`. It is
 * also the only place that can say "you have a workout open", which nothing
 * could before, because an unfinished workout was not a thing that existed.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Play } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { describeSets } from "../programsService"
import { UNIT_CONFIG, WEEKDAY_SHORT } from "../config"
import { startKeyFor } from "../hooks/useLiveWorkout"
import type { LiveWorkout, SessionPrescription, UnitSystem } from "../types"

interface Props {
  enrollmentId: string
  programName: string
  prescription: SessionPrescription
  unit: UnitSystem
  /** A workout already open — this one, or another program's. */
  live: LiveWorkout | null
  /** Every day in the program, so you can log the one you actually did. */
  days?: Array<{ id: string; label: string; weekday?: number }>
  onPickDay?: (dayId: string) => void
  /** Extra notices — coming back after time off, a finished program. */
  children?: React.ReactNode
}

/** Hours after which an open workout is probably forgotten rather than running. */
const STALE_HOURS = 6

export function TodayCard({
  enrollmentId,
  programName,
  prescription,
  unit,
  live,
  days,
  onPickDay,
  children,
}: Props) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unitLabel = UNIT_CONFIG[unit].label
  const openHere = live?.enrollmentId === enrollmentId
  const openMinutes = live ? Math.floor((Date.now() - new Date(live.startedAt).getTime()) / 60000) : 0
  const stale = openMinutes > STALE_HOURS * 60

  async function start() {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          dayId: prescription.dayId,
          // The SAME key on every attempt, kept in this browser until a start
          // succeeds — a fresh one per tap is how the retry protection came to
          // do nothing at all.
          clientKey: startKeyFor(enrollmentId),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? "Could not start that workout.")
        return
      }
      router.push("/programs/live")
    } catch {
      /**
       * The request may well have landed — a reply lost on the way back looks
       * exactly like a request that never arrived. Saying "nothing was started"
       * was a guess, and the wrong one often enough to strand people on a card
       * showing Start for a workout that was already running.
       */
      setError("Could not reach the server. Tap Start again — if it did go through, this opens that same workout.")
    } finally {
      setStarting(false)
    }
  }

  return (
    <Card data-testid="today-card">
      <CardContent className="space-y-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">
            {prescription.restDay ? "Rest day" : prescription.dayLabel}
            {!prescription.restDay && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">{programName}</span>
            )}
          </p>
          {prescription.restDay && (
            <p className="text-xs text-muted-foreground">
              Nothing scheduled today. Next up is {prescription.dayLabel}
              {prescription.scheduledWeekday
                ? ` on ${WEEKDAY_SHORT[prescription.scheduledWeekday]}`
                : ""}
              .
            </p>
          )}
        </div>

        {/* WHICH DAY YOU ACTUALLY DID. The app's guess is a good default and a
            bad rule — people swap Push and Pull, or come back on a rest day. */}
        {days && days.length > 1 && onPickDay && (
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onPickDay(d.id)}
                aria-pressed={d.id === prescription.dayId}
                className={`min-h-9 rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  d.id === prescription.dayId
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {d.label}
                {d.weekday != null && <span className="ml-1 opacity-60">{WEEKDAY_SHORT[d.weekday]}</span>}
              </button>
            ))}
          </div>
        )}

        {children}

        <ul className="space-y-0.5 text-sm">
          {prescription.exercises.map((ex) => (
            <li key={ex.exerciseId} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{ex.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {describeSets(ex, unitLabel)}
              </span>
            </li>
          ))}
          {prescription.enduranceSets?.map((set, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              {set.repeat > 1 ? `${set.repeat}× ` : ""}
              {set.blocks.map((b) => b.label).join(" → ")}
            </li>
          ))}
        </ul>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {live && !openHere ? (
          // Another program's workout is open. Two workouts at once is not a
          // state the database allows, so say which one rather than failing.
          <Button variant="outline" className="w-full" onClick={() => router.push("/programs/live")}>
            Finish the workout you have open first
          </Button>
        ) : openHere ? (
          <Button
            className="w-full"
            data-testid="resume-workout"
            onClick={() => router.push("/programs/live")}
          >
            {stale
              ? `Finish or discard ${new Date(live!.startedAt).toLocaleDateString(undefined, { weekday: "long" })}'s workout`
              : `Resume · ${openMinutes} min`}
          </Button>
        ) : (
          <Button className="w-full" data-testid="start-workout" disabled={starting} onClick={start}>
            {starting ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Play className="mr-1 size-4" />}
            Start workout
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
