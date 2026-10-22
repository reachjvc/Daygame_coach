/**
 * BACK-OFFS FROM THE TOP SET YOU JUST DID — Plans/program-builder.md, Phase 2.3.
 *
 * Starscream's back-off range is 70–80% of the top set logged that day, so it
 * cannot be known until that set is ticked. This fills it in from the sets
 * already done. It is the ONE function both sides use (Q12): the phone runs it
 * the moment the top set is ticked, with no signal if need be, and the server
 * runs it again at finish, so the two cannot disagree about the numbers.
 *
 * The reference is the HEAVIEST completed set of the named group: a top set
 * that was redone heavier is the one the day is measured from.
 */

import type { PrescribedExercise, PrescribedSet } from "../types"
import type { LoadStyle } from "../spec/types"
import { roundLoad, type RoundingContext } from "./rounding"
import { toKg } from "../programsService"

/** A set already ticked today. */
export interface DoneSet {
  /** The slot it belongs to (`PrescribedExercise.slotId`), else the lift's id. */
  slot: string
  groupId?: string | null
  /** Which prescribed row it answered, when the group is not recorded. */
  setNumber?: number
  weight: number
  reps: number
}

/** The heaviest done set of one group of one slot, or null. */
export function referenceWeight(
  done: readonly DoneSet[],
  slot: string,
  group: string,
  rowsOfGroup: readonly number[] = []
): number | null {
  const hits = done.filter(
    (d) => d.slot === slot && d.reps > 0 && (d.groupId != null ? d.groupId === group : d.setNumber != null && rowsOfGroup.includes(d.setNumber))
  )
  if (hits.length === 0) return null
  return Math.max(...hits.map((d) => d.weight))
}

/**
 * The day's prescription with every derived weight that CAN be known filled
 * in. Sets whose reference has not been done yet keep `weight: 0` and their
 * `derive`, so the screen can say "after your top set" rather than "0 kg".
 */
export function deriveFromEarlierSets(
  exercises: readonly PrescribedExercise[],
  done: readonly DoneSet[],
  ctx: RoundingContext
): PrescribedExercise[] {
  const rowsByGroup = new Map<string, number[]>()
  for (const ex of exercises) {
    const slot = ex.slotId ?? ex.exerciseId
    for (const s of ex.sets) {
      if (!s.groupId) continue
      const k = `${slot}\u0000${s.groupId}`
      rowsByGroup.set(k, [...(rowsByGroup.get(k) ?? []), s.setNumber])
    }
  }
  return exercises.map((ex) => {
    if (!ex.sets.some((s) => s.derive)) return ex
    const style: LoadStyle = ex.loadStyle ?? "barbell"
    const sets = ex.sets.map((s): PrescribedSet => {
      if (!s.derive) return s
      const ref = referenceWeight(done, s.derive.slot, s.derive.group, rowsByGroup.get(`${s.derive.slot}\u0000${s.derive.group}`))
      if (ref == null) return s
      // A range is rounded as a sheet rounds it: each end to the nearest step
      // (MROUND) unless the program says "down".
      const mode = ctx.rounding?.mode ?? "nearest"
      const a = roundLoad(ref * s.derive.pct.min, style, ctx, mode)
      const b = roundLoad(ref * s.derive.pct.max, style, ctx, mode)
      const rest: PrescribedSet = { ...s }
      delete rest.weightMax
      return {
        ...rest,
        weight: a,
        weightKg: Math.round(toKg(a, ctx.unit) * 100) / 100,
        ...(b !== a ? { weightMax: b } : {}),
      }
    })
    return { ...ex, sets }
  })
}
