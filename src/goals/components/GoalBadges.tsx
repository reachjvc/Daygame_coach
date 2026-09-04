"use client"

/**
 * WHAT THIS GOAL HAS EARNED, AND THE NUMBER THAT NEVER RESETS.
 *
 * Two things a goal card could not show before:
 *
 *   The badges. There were 103 of them and every one was about approaches, so
 *   a goal you wrote yourself could never earn anything. They are fourteen
 *   rules applied to every goal now — see `data/goalAchievementRules.ts`.
 *
 *   The running total. `current_value` is this period only and is zeroed every
 *   Monday, so "127 days without weed" existed nowhere on screen even though it
 *   has always been computable. Pinning it puts it on the tracking page as a
 *   tile, which is the one surface that already knew how to draw it.
 *
 * Fetched when the card is opened rather than with the goals list: it costs a
 * snapshot query per goal, and paying that for forty collapsed cards to show
 * nothing would be the wrong trade.
 */

import { useEffect, useState } from "react"
import { Loader2, Trophy, Pin, PinOff } from "lucide-react"

interface Badge {
  ruleId: string
  label: string
  blurb: string
  earnedOn: string
}

interface Payload {
  badges: Badge[]
  total: number
  totalPinned: boolean
}

export function GoalBadges({ goalId, canPinTotal }: {
  goalId: string
  /** Only a repeating goal has a total worth pinning — a climb's total is its
   *  current value, and pinning it twice would say the same thing twice. */
  canPinTotal: boolean
}) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pinning, setPinning] = useState(false)

  useEffect(() => {
    let live = true
    fetch(`/api/goals/${goalId}/achievements`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Could not read this goal's history")
        return r.json()
      })
      .then((d: Payload) => { if (live) { setData(d); setError(null) } })
      /* Loud, not silent. A failed read is not "no badges yet", and drawing an
         empty trophy shelf over somebody's year is the worse lie. */
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : "Could not read this goal's history") })
    return () => { live = false }
  }, [goalId])

  const togglePin = async () => {
    if (!data || pinning) return
    setPinning(true)
    const next = !data.totalPinned
    try {
      const res = await fetch(`/api/goals/${goalId}/achievements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalPinned: next }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not change that")
      setData({ ...data, totalPinned: next })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change that")
    } finally {
      setPinning(false)
    }
  }

  if (error) {
    return <p className="text-xs text-rose-400" data-testid="goal-badges-error">{error}</p>
  }
  if (!data) {
    return <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Loading this goal's history" />
  }

  return (
    <div className="space-y-2" data-testid="goal-badges">
      {canPinTotal && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {/* The caveat, on screen rather than in a doc: the total is the sum
                of the periods that actually rolled over, so a goal made today
                reads 0 and is not wrong. */}
            <strong className="text-foreground tabular-nums">{data.total}</strong> in total, all time
          </span>
          <button
            type="button"
            onClick={togglePin}
            disabled={pinning}
            data-testid="goal-total-pin"
            aria-pressed={data.totalPinned}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-muted/50 disabled:opacity-40 transition-colors"
          >
            {data.totalPinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
            {data.totalPinned ? "Remove from tracking page" : "Show on my tracking page"}
          </button>
        </div>
      )}

      {data.badges.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {data.badges.map((b) => (
            <li
              key={b.ruleId}
              title={`${b.blurb} — ${b.earnedOn}`}
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-600 dark:text-amber-300"
            >
              <Trophy className="size-3" />
              {b.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No badges on this one yet.</p>
      )}
    </div>
  )
}
