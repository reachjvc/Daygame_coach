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

import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { adherenceThisWeek, weeklyVolume, liftBests } from "@/src/health/healthService"
// `fromKg`, not the health slice's `convertWeight`: that one spells the unit
// "lbs" and this slice spells it "lb". Two spellings of one unit is how a
// number ends up converted twice or not at all.
import { fromKg } from "../programsService"
import { UNIT_CONFIG } from "../config"
import type { UnitSystem } from "../types"
import type { WorkoutLogWithSets } from "@/src/health/types"

const LiftHistory = lazy(() => import("./LiftHistory").then((m) => ({ default: m.LiftHistory })))

interface Props {
  /** Training days a week the running program asks for; 0 when none is. */
  plannedPerWeek: number
  unit: UnitSystem
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

export function ProgressTab({ plannedPerWeek, unit }: Props) {
  const [logs, setLogs] = useState<WorkoutLogWithSets[] | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/health/workout?days=365&include=sets")
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as unknown
      if (!Array.isArray(body)) throw new Error("unexpected shape")
      setLogs(body as WorkoutLogWithSets[])
      setState("ready")
    } catch {
      // NOT an empty year. "You have trained nothing in twelve months" is a
      // statement about somebody's life, and a request that did not arrive is
      // no grounds for making it.
      setState("failed")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (state === "failed") {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Your training history could not be loaded, so there is nothing to show yet. This is not
            a statement about your training.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-md border border-amber-500/40 px-2.5 py-1 text-xs text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    )
  }

  if (state === "loading" || !logs) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  const now = new Date()
  const week = adherenceThisWeek(logs, plannedPerWeek, now)
  const volume = weeklyVolume(logs, now, 8)
  const bests = liftBests(logs).slice(0, 8)
  const label = UNIT_CONFIG[unit].label
  const show = (kg: number) => Math.round(fromKg(kg, unit))
  const peak = Math.max(1, ...volume.map((v) => v.volumeKg))

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-4">
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
                      ? "bg-emerald-500"
                      : d.future
                        ? "border border-dashed border-border"
                        : "bg-muted"
                  }`}
                />
                <span className="text-[11px] text-muted-foreground">{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
          {/* A day that has not happened is not a day you missed. */}
          <p className="text-[11px] text-muted-foreground">
            Days still to come are outlined, not empty.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="text-sm font-medium">Weight moved, per week</h3>
          {volume.every((v) => v.volumeKg === 0) ? (
            <p className="text-sm text-muted-foreground">Nothing logged in the last eight weeks.</p>
          ) : (
            <div className="flex items-end gap-1.5" data-testid="volume-bars">
              {volume.map((v) => (
                <div key={v.weekStart} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    title={`Week of ${v.weekStart}: ${show(v.volumeKg)} ${label} over ${v.sets} sets`}
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${Math.max(2, (v.volumeKg / peak) * 72)}px` }}
                  />
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {v.weekStart.slice(8)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Working sets only. Warm-ups are not the work.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="text-sm font-medium">Your bests</h3>
          {bests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No working sets logged yet, so there is nothing to beat.
            </p>
          ) : (
            <ul className="space-y-1.5" data-testid="lift-bests">
              {bests.map((b) => (
                <li key={b.exercise} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{b.exercise}</span>
                  {/* A pull-up has no weight on it, so "0 kg × 12 · est. max 0"
                      is not a fact about anything. Reps are the achievement. */}
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {b.bodyweight ? (
                      `${b.bestWeightReps} reps`
                    ) : (
                      <>
                        {show(b.bestWeightKg)} {label} × {b.bestWeightReps}
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
          <p className="text-[11px] text-muted-foreground">
            The heaviest set you have done, and the best your reps suggest you could.
          </p>
        </CardContent>
      </Card>

      <Suspense fallback={null}>
        <LiftHistory unit={unit} />
      </Suspense>
    </div>
  )
}
