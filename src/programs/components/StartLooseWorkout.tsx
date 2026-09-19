"use client"

/**
 * A workout that belongs to no program.
 *
 * WHAT WAS MISSING. The set-by-set screen could only be opened by starting
 * today's prescribed session, so anything improvised had to be written up
 * afterwards from memory — the one form that could take it asks for the whole
 * session at once, after the fact. A session you are actually in the middle of
 * had nowhere to go unless a program had asked for it.
 *
 * The server has always allowed a workout with no program attached; nothing
 * ever asked for one. This asks.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { startWorkoutRequest } from "../hooks/useLiveWorkout"
import type { LiveWorkout } from "../types"

/**
 * TWO SHAPES, ONE BUTTON.
 *
 * With no program this is the main thing to do, so it is a full bar. With one
 * running it is the alternative to today's session, so it is a quiet row under
 * it. It used to be mounted twice — once in each place — and the walk found
 * three "Start a workout now" buttons across two tabs, all doing the same
 * thing. One mount, one prop.
 */
export function StartLooseWorkout({
  live,
  variant = "primary",
}: {
  live: LiveWorkout | null
  variant?: "primary" | "row"
}) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // One workout at a time is a rule of the database, so say which one rather
  // than letting the request fail.
  if (live) {
    // As a row this is a second way to say what the card above already says,
    // and a row that means "go to your workout" beside a button that means the
    // same thing is just two of them.
    if (variant === "row") return null
    return (
      <Button variant="outline" className="w-full" onClick={() => router.push("/programs/live")}>
        {live.enrollmentId ? "Finish the workout you have open first" : "Back to your workout"}
      </Button>
    )
  }

  async function start() {
    setStarting(true)
    setError(null)
    // No enrollment and no day: this session is not answering a plan.
    const outcome = await startWorkoutRequest({})
    setStarting(false)
    if (outcome.kind === "started" || outcome.kind === "already-open") {
      router.push("/programs/live")
      return
    }
    setError(outcome.message)
  }

  if (variant === "row") {
    return (
      <div className="space-y-1">
        <button
          type="button"
          data-testid="start-loose-workout"
          disabled={starting}
          onClick={start}
          className="inline-flex min-h-11 items-center text-sm text-primary hover:underline disabled:opacity-60"
        >
          {starting && <Loader2 className="mr-1 size-4 animate-spin" />}
          Start an empty workout instead ›
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Button className="w-full" data-testid="start-loose-workout" disabled={starting} onClick={start}>
        {starting ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Play className="mr-1 size-4" />}
        Start a workout now
      </Button>
      <p className="text-xs text-muted-foreground">
        An empty session you fill in as you go. Add each lift as you get to it.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
