/**
 * WEIGHTS A PERSON CAN ACTUALLY LOAD, for programs in the new format.
 *
 * One context per enrollment: the unit, the gym's plates (the account's bar
 * and smallest plate, or the enrollment's own bar — Phase 2 fixes the bug
 * where neither ever reached a prescription), and the program's own rounding
 * step when it states one ("rounding 2.5" in a spreadsheet).
 *
 * Without a program step this is exactly `roundToLoadable`, so every
 * converted built-in rounds as it always has. With one, BARBELL weights use
 * the program's step and mode — measured from the bar and never below it —
 * and other lifts keep the free-weight precision, because a sheet's MROUND is
 * written for the bar.
 */

import { roundToLoadable } from "../programsService"
import type { PlateSetup } from "../types"
import type { LoadStyle, ProgramSpec, UnitSystem } from "../spec/types"
import { DEFAULT_PLATES } from "../config"

export interface RoundingContext {
  unit: UnitSystem
  plates?: PlateSetup
  rounding?: ProgramSpec["rounding"]
}

export type RoundMode = "nearest" | "down"

export function roundingContext(spec: Pick<ProgramSpec, "rounding">, unit: UnitSystem, plates?: PlateSetup): RoundingContext {
  return { unit, ...(plates ? { plates } : {}), ...(spec.rounding ? { rounding: spec.rounding } : {}) }
}

/** The mode a prescription rounds in when nothing says otherwise: never more than meant. */
export function defaultMode(ctx: RoundingContext): RoundMode {
  return ctx.rounding?.mode ?? "down"
}

/** Round one weight for a lift loaded this way. */
export function roundLoad(weight: number, style: LoadStyle, ctx: RoundingContext, mode: RoundMode = defaultMode(ctx)): number {
  const step = ctx.unit === "kg" ? ctx.rounding?.stepKg : ctx.rounding?.stepLb
  if (step == null || style !== "barbell") return roundToLoadable(weight, ctx.unit, style, ctx.plates, mode)
  const bar = (ctx.plates ?? DEFAULT_PLATES[ctx.unit]).barWeight
  if (weight <= bar) return bar
  const steps = (weight - bar) / step
  const n = mode === "down" ? Math.floor(steps + 1e-9) : Math.round(steps)
  return Math.max(bar, Math.round((bar + n * step) * 100) / 100)
}
