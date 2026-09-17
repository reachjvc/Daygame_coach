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

import { useLoad } from "@/src/shared/useLoad"
import { Card, CardContent } from "@/components/ui/card"
import { liftsWithHistory, workoutsToCsv } from "@/src/health/healthService"
import type { WorkoutLogWithSets } from "@/src/health/types"
import { formatLoad, fromKg } from "../programsService"
import { UNIT_CONFIG } from "../config"
import type { UnitSystem } from "../types"
import { Sparkline } from "./Sparkline"

/**
 * Three years. The endpoint defaults to 90 days, which would silently truncate
 * exactly the span this exists to show — a lift history that quietly starts in
 * June is worse than no lift history.
 */
const HISTORY_DAYS = 1095

/** Enough to be a list worth reading; the rest are one tap away in the logger. */
const SHOWN = 8

/**
 * `unit` is REQUIRED, not optional with a kilogram default.
 *
 * This panel printed "kg" unconditionally, directly under "Your bests" which
 * prints the lifter's own unit — so a pounds lifter read "Bench Press 225 lb × 5"
 * and, an inch below, "Bench Press 61 → 102 kg" for the same lift on the same
 * screen. Making it a required prop is what stops the next caller forgetting.
 */
export function LiftHistory({ unit }: { unit: UnitSystem }) {
  const label = UNIT_CONFIG[unit].label
  /** Stored kilograms, shown in the lifter's unit, rounded the way this app rounds. */
  const show = (kg: number) => formatLoad(fromKg(kg, unit))

  /**
   * THE SHARED LOADER, NOT A HAND-WRITTEN ONE.
   *
   * This used to be `.then((r) => (r.ok ? r.json() : []))`, which turned any
   * server error into an empty list — and an empty list renders as nothing at
   * all here, so a 500 removed the whole section and the Export CSV button with
   * it, silently. Only a thrown request reached the failure branch, so the
   * commonest failure was the one that lied.
   *
   * `useLoad` treats a non-ok response as a failure, which is the entire
   * difference.
   */
  const loaded = useLoad(`/api/health/workout?days=${HISTORY_DAYS}&include=sets`, (body) => {
    const logs = (body ?? []) as { logged_at: string; sets?: unknown[] }[]
    // The endpoint nests sets under their log; `liftsWithHistory` wants them
    // flat with the day attached, because a set has no date of its own.
    const flat = logs.flatMap((log) =>
      ((log.sets ?? []) as Record<string, unknown>[]).map((s) => ({ ...s, logged_at: log.logged_at }))
    )
    return {
      /** Kept so the export writes exactly what is on screen, with no second fetch. */
      logs: logs as WorkoutLogWithSets[],
      lifts: liftsWithHistory(flat as never),
    }
  })

  if (loaded.state === "failed") {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11.5px] text-amber-600 dark:text-amber-400" data-testid="lift-history-failed">
        Your lifts over time could not be loaded.{" "}
        <button type="button" onClick={loaded.retry} className="underline" data-testid="lift-history-retry">
          Try again
        </button>
      </div>
    )
  }

  if (loaded.state === "loading") return null

  const { logs, lifts } = loaded.data

  // Nothing to say until a lift has been done twice.
  if (lifts.length === 0) return null

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
                  label={`${l.exercise}: ${show(first.weight)} to ${show(last.weight)} ${label} across ${l.points.length} days, ${new Date(first.at).toLocaleDateString()} to ${new Date(last.at).toLocaleDateString()}`}
                />
                <span className="shrink-0 text-muted-foreground">
                  {show(first.weight)} →{" "}
                  <span className="font-medium text-foreground">{show(last.weight)} {label}</span>
                  <span className={`ml-1.5 text-xs ${moved > 0 ? "text-emerald-600" : moved < 0 ? "text-amber-600" : ""}`}>
                    {moved > 0 ? "+" : ""}
                    {moved === 0 ? "held" : show(moved)}
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
