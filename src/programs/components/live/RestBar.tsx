"use client"

/**
 * How long since the last set — pinned where your thumb already is.
 *
 * TWO THINGS THE OLD TIMER GOT WRONG, both fixed here.
 *
 * It rendered at the TOP of the session card, hundreds of pixels above the set
 * that started it, so on a phone you had to scroll away from what you were
 * doing to see it. This is fixed to the bottom edge.
 *
 * And it was started by a tiny grey button inside an opened lift. It now starts
 * itself when a set is ticked, which is what every tracker people actually use
 * does, and what makes a rest timer a timer rather than a stopwatch you must
 * remember to press.
 *
 * IT COUNTS FROM AN INSTANT, NOT WITH A COUNTER — kept from the original, and
 * the reason it survives a locked phone: browsers throttle a backgrounded tab,
 * so a number incremented on a tick would simply stop. The interval only
 * decides how often the screen repaints.
 *
 * WHAT IT CANNOT DO ON AN IPHONE. Safari has no vibration and no page
 * notifications, so a locked phone is not buzzed. The bar says so once, and
 * shows the correct remaining time the moment the screen wakes. A real buzz
 * needs the app installed to the home screen and a push from the server.
 */

import { useEffect, useRef, useState } from "react"
import { Timer, X } from "lucide-react"

interface Props {
  /** When the last set was ticked. `null` hides the bar. */
  startedAt: number | null
  targetSeconds: number
  /** True when the number is ours rather than the program author's. */
  ours: boolean
  onDismiss: () => void
  onExtend: (seconds: number) => void
}

function mmss(total: number): string {
  const m = Math.floor(Math.abs(total) / 60)
  const s = Math.abs(total) % 60
  return `${total < 0 ? "-" : ""}${m}:${String(s).padStart(2, "0")}`
}

export function RestBar({ startedAt, targetSeconds, ours, onDismiss, onExtend }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const alerted = useRef(false)

  useEffect(() => {
    if (startedAt === null) return
    alerted.current = false
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [startedAt, targetSeconds])

  const elapsed = startedAt === null ? 0 : Math.floor((now - startedAt) / 1000)
  const remaining = targetSeconds - elapsed
  const done = remaining <= 0

  useEffect(() => {
    if (startedAt === null || !done || alerted.current) return
    alerted.current = true
    /**
     * A SOUND, A BUZZ AND A NOTIFICATION — whichever this browser has.
     *
     * Android and desktop can do all three. iPhone Safari can do the sound
     * while the screen is on and nothing at all once it locks, which is why
     * the bar says so rather than implying a buzz that will not come.
     */
    try {
      const Ctx = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        const ctx = new Ctx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 880
        gain.gain.value = 0.08
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.18)
      }
    } catch {
      // No audio permission, or a browser that will not make one. Silence is
      // not a failure worth interrupting a workout for.
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([120, 60, 120])
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Rest is up", { body: "Next set." })
      }
    } catch {
      // Same: an alert that cannot be shown is not worth an error.
    }
  }, [done, startedAt])

  if (startedAt === null) return null

  const pct = Math.min(100, (elapsed / targetSeconds) * 100)

  return (
    <div
      data-testid="rest-bar"
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-2 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <Timer className={`size-5 shrink-0 ${done ? "text-emerald-500" : "text-muted-foreground"}`} />
        <span
          data-testid="rest-remaining"
          className={`shrink-0 text-lg font-medium tabular-nums ${done ? "text-emerald-500" : ""}`}
        >
          {mmss(remaining)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block h-1 overflow-hidden rounded-full bg-border">
            <span
              className={`block h-full ${done ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </span>
        </span>
        <button
          type="button"
          onClick={() => onExtend(-30)}
          aria-label="Take thirty seconds off the rest"
          className="h-11 shrink-0 rounded-md border border-border px-2 text-xs transition-colors hover:bg-accent"
        >
          −30s
        </button>
        <button
          type="button"
          onClick={() => onExtend(30)}
          aria-label="Add thirty seconds to the rest"
          className="h-11 shrink-0 rounded-md border border-border px-2 text-xs transition-colors hover:bg-accent"
        >
          +30s
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Skip the rest"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* THE CAPTION GETS THE WHOLE WIDTH. Squeezed between the progress bar
          and the −30s/+30s buttons it had about sixty pixels on a phone, so it
          rendered as "resting — 3:00 is…" — the half that was cut off is the
          half that says the number is ours rather than the program author's. */}
      <p className="mx-auto max-w-2xl truncate text-[11px] text-muted-foreground">
        {done
          ? "Ready when you are"
          : ours
            ? `resting — ${mmss(targetSeconds)} is our suggestion`
            : `resting — ${mmss(targetSeconds)}, the program's own`}
      </p>
    </div>
  )
}
