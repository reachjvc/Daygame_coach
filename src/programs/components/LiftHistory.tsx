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

import { Button } from "@/components/ui/button"
import { formatLoad, fromKg } from "../programsService"
import { UNIT_CONFIG } from "../config"
import type { LoadPoint, UnitSystem } from "../types"
import { Sparkline } from "./Sparkline"

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
export function LiftHistory({
  lifts,
  unit,
  timezone,
}: {
  /**
   * The rows, already worked out. This component used to fetch three years of
   * sets for itself — on top of the year the tab around it had loaded — and
   * then compute the same series a second time. One read serves both now.
   */
  lifts: { exercise: string; points: LoadPoint[] }[]
  unit: UnitSystem
  /** The ACCOUNT's zone, for the dates in the chart's own description. */
  timezone: string
}) {
  const label = UNIT_CONFIG[unit].label
  /** Stored kilograms, shown in the lifter's unit, rounded the way this app rounds. */
  const show = (kg: number) => formatLoad(fromKg(kg, unit))
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { timeZone: timezone })

  // Nothing to say until a lift has been done twice.
  if (lifts.length === 0) return null

  return (
    <section className="space-y-2 border-t border-border/60 pt-4" data-testid="lift-history">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Your lifts over time</h3>
        {/*
          THE FILE YOU HOLD — all of it, from the server.
          "I lost years of data" is one of the loudest complaints about training
          apps, and a backup promise is not the answer people want. It used to
          be built in the browser from whatever this panel had fetched: three
          years, while the list beside it showed one, so the file and the screen
          disagreed about how much training existed.
        */}
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <a href="/api/workouts/export" download data-testid="export-csv">
            Export CSV
          </a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Every program and every loose workout together — this does not reset when you change program.
      </p>
      {/* NO CARD. The three blocks on this tab are sections divided by a
          hairline, and a lighter grey box around one of them said "a separate
          object" about the same screen. */}
      <ul className="divide-y divide-border/60">
        {lifts.slice(0, SHOWN).map((l) => {
            const first = l.points[0]
            const last = l.points[l.points.length - 1]
            const moved = last.weight - first.weight
            return (
            <li key={l.exercise} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{l.exercise}</span>
                <Sparkline
                  points={l.points}
                  /* The dates in the account's zone: this is the only text a
                     screen reader gets for the line, so it must not name a day
                     the lifter did not train on. */
                  label={`${l.exercise}: ${show(first.weight)} to ${show(last.weight)} ${label} across ${l.points.length} days, ${day(first.at)} to ${day(last.at)}`}
                />
                <span className="shrink-0 text-muted-foreground">
                  {show(first.weight)} →{" "}
                  <span className="font-medium text-foreground">{show(last.weight)} {label}</span>
                  {/*
                    NO COLOUR ON THE DELTA, and this is a deliberate departure
                    from the plan's line for it.
                    Green in this app means "finished" — a ticked set, a rest
                    that is over, a program complete — and a screen that
                    borrows it for "went up" takes the meaning away from the
                    ticks that need it. That rule is enforced
                    (`tests/unit/architecture.test.ts`, "green typed out
                    instead of taken from DONE") and it is newer than the plan.
                    The sign and the arrow already say the direction.
                  */}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {moved > 0 ? "+" : ""}
                    {moved === 0 ? "held" : show(moved)}
                  </span>
                </span>
            </li>
            )
          })}
      </ul>
    </section>
  )
}
