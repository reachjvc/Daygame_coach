"use client"

/**
 * One lift, across every program and every loose workout you have ever logged.
 *
 * The History panel above this reads a single enrollment, so "my bench" resets
 * the day you change program — backwards, because the lift is the thing that
 * persists and the program is the thing that changes. This reads `workout_sets`,
 * the table that already spans both, and joins on the exercise name.
 *
 * Reuses `Sparkline` rather than drawing a second kind of line, and the same
 * `LoadPoint` shape the program-level progression produces. There is exactly one
 * chart component in this feature and this is a second caller of it, not a
 * second chart.
 */

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { liftsWithHistory, workoutsToCsv } from "@/src/health/healthService"
import type { WorkoutLogWithSets } from "@/src/health/types"
import { formatLoad } from "../programsService"
import { Sparkline } from "./Sparkline"
import type { LoadPoint } from "../types"

/**
 * Three years. The endpoint defaults to 90 days, which would silently truncate
 * exactly the span this exists to show — a lift history that quietly starts in
 * June is worse than no lift history.
 */
const HISTORY_DAYS = 1095

/** Enough to be a list worth reading; the rest are one tap away in the logger. */
const SHOWN = 8

export function LiftHistory() {
  const [lifts, setLifts] = useState<{ exercise: string; points: LoadPoint[] }[] | null>(null)
  /** Kept so the export writes exactly what is on screen, with no second fetch. */
  const [logs, setLogs] = useState<WorkoutLogWithSets[]>([])

  useEffect(() => {
    let alive = true
    fetch(`/api/health/workout?days=${HISTORY_DAYS}&include=sets`)
      .then((r) => (r.ok ? r.json() : []))
      .then((logs: { logged_at: string; sets?: unknown[] }[]) => {
        if (!alive) return
        // The endpoint nests sets under their log; `liftsWithHistory` wants them
        // flat with the day attached, because a set has no date of its own.
        const flat = logs.flatMap((log) =>
          ((log.sets ?? []) as Record<string, unknown>[]).map((s) => ({ ...s, logged_at: log.logged_at }))
        )
        setLogs(logs as WorkoutLogWithSets[])
        setLifts(liftsWithHistory(flat as never))
      })
      .catch(() => alive && setLifts([]))
    return () => {
      alive = false
    }
  }, [])

  // Nothing to say until a lift has been done twice.
  if (!lifts || lifts.length === 0) return null

  return (
    <div className="space-y-2" data-testid="lift-history">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Your lifts over time</h2>
        {/* THE FILE YOU HOLD. "I lost years of data" is one of the loudest
            complaints about training apps, and a backup promise is not the
            answer people want. Built from what is already loaded. */}
        <button
          type="button"
          data-testid="export-csv"
          onClick={() => {
            const blob = new Blob([workoutsToCsv(logs)], { type: "text/csv;charset=utf-8" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `training-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
        >
          Export CSV
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Every program and every loose workout together — this does not reset when you change program.
      </p>
      <Card>
        <CardContent className="divide-y p-0">
          {lifts.slice(0, SHOWN).map((l) => {
            const first = l.points[0]
            const last = l.points[l.points.length - 1]
            const moved = last.weight - first.weight
            return (
              <div key={l.exercise} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{l.exercise}</span>
                <Sparkline
                  points={l.points}
                  label={`${l.exercise}: ${formatLoad(first.weight)} to ${formatLoad(last.weight)} kg across ${l.points.length} days, ${new Date(first.at).toLocaleDateString()} to ${new Date(last.at).toLocaleDateString()}`}
                />
                <span className="shrink-0 text-muted-foreground">
                  {formatLoad(first.weight)} →{" "}
                  <span className="font-medium text-foreground">{formatLoad(last.weight)} kg</span>
                  <span className={`ml-1.5 text-xs ${moved > 0 ? "text-emerald-600" : moved < 0 ? "text-amber-600" : ""}`}>
                    {moved > 0 ? "+" : ""}
                    {moved === 0 ? "held" : formatLoad(moved)}
                  </span>
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
