"use client"

/**
 * How long since the last set.
 *
 * IT COUNTS FROM AN INSTANT, NOT WITH A COUNTER. The single most-cited timer
 * complaint about lifting apps is a timer that pauses or resets when the phone
 * locks — which is exactly what a `setInterval` that increments a number does,
 * because browsers throttle or suspend timers in a backgrounded tab. Storing the
 * moment the set finished and subtracting it from `Date.now()` on every tick
 * means the interval only decides how often the screen repaints; the elapsed
 * time is correct even if it never ticked at all.
 *
 * THE DURATIONS ARE OURS AND IT SAYS SO. No program in the catalogue specifies
 * rest — there is no field for it on any type — so the target here is our
 * suggestion, not the author's instruction, and presenting it as the program's
 * would be putting our numbers in somebody else's cited work.
 */

import { useEffect, useState } from "react"
import { Timer, X } from "lucide-react"

/**
 * Our defaults, in seconds. Heavy compound work needs longer than accessory
 * work; both are a starting point somebody can ignore.
 */
export const REST_SECONDS = { compound: 180, accessory: 90 } as const

interface Props {
  /** When the last set finished. `null` hides the timer entirely. */
  startedAt: number | null
  /** Our suggested rest for this lift, in seconds. */
  targetSeconds: number
  onDismiss: () => void
}

function mmss(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function RestTimer({ startedAt, targetSeconds, onDismiss }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null) return
    // Repaint once a second. The number shown is derived from the clock, so a
    // tick that never fires — a locked phone, a backgrounded tab — costs
    // accuracy nothing; the next repaint is simply correct.
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  if (startedAt === null) return null

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  const done = elapsed >= targetSeconds
  const pct = Math.min(100, (elapsed / targetSeconds) * 100)

  return (
    <div
      data-testid="rest-timer"
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm ${
        done
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted/40"
      }`}
    >
      <Timer className="size-4 shrink-0" />
      <span className="shrink-0 font-medium tabular-nums">{mmss(elapsed)}</span>
      <span className="min-w-0 flex-1">
        <span className="block h-1 overflow-hidden rounded-full bg-border">
          <span
            className={`block h-full transition-[width] duration-1000 ease-linear ${done ? "bg-emerald-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {done ? "Ready when you are" : `resting — we suggest ${mmss(targetSeconds)} for this lift`}
        </span>
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss the rest timer"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
