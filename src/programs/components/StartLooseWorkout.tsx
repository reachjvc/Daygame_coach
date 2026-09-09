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
import { startKeyFor } from "../hooks/useLiveWorkout"
import type { LiveWorkout } from "../types"

export function StartLooseWorkout({ live }: { live: LiveWorkout | null }) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // One workout at a time is a rule of the database, so say which one rather
  // than letting the request fail.
  if (live) {
    return (
      <Button variant="outline" className="w-full" onClick={() => router.push("/programs/live")}>
        {live.enrollmentId ? "Finish the workout you have open first" : "Back to your workout"}
      </Button>
    )
  }

  async function start() {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // No enrollment and no day: this session is not answering a plan.
        body: JSON.stringify({ clientKey: startKeyFor(null) }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? "Could not start that workout.")
        return
      }
      router.push("/programs/live")
    } catch {
      setError(
        "Could not reach the server. Tap Start again — if it did go through, this opens that same workout."
      )
    } finally {
      setStarting(false)
    }
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
