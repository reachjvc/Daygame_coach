/**
 * RUNNING A PROGRAM FORWARD WITHOUT A PERSON — Plans/program-builder.md, Phase 2.6.
 *
 * For the builder's preview ("what will week 8 look like with my numbers")
 * and for the coverage fixtures. A simulated lifter trains every day in order
 * and makes every set at the top of what was asked; a set picked by feel uses
 * the weight given in `picks`, and back-offs are worked out from it exactly as
 * the live screen does.
 */

import type { ExerciseState, PlateSetup, PrescribedExercise, ProgressionChange } from "../types"
import type { ProgramSpec, UnitSystem } from "../spec/types"
import { applySession } from "./progress"
import { prescribeSlot, type EngineEnrollment } from "./prescribe"
import { deriveFromEarlierSets, type DoneSet } from "./sameDay"
import { roundingContext } from "./rounding"
import { seed, type SeedInputs } from "./seed"

export interface SimulateOptions {
  unit: UnitSystem
  start: SeedInputs
  plates?: PlateSetup
  /** Weeks to run, for a program with weeks; sessions to run, for one without. */
  weeks?: number
  sessions?: number
  /** Reps past the floor on every all-out set. */
  amrapExtra?: number
  /** The weight a by-feel set is done at, per slot: one number or one per week. */
  picks?: Record<string, number | Record<number, number>>
}

export interface SimSession {
  /** 1-based: the n-th workout. */
  session: number
  /** The program's week, as the screen shows it: back to 1 when a repeating program starts again. */
  week: number
  /** The n-th week since the start, never wrapping — "week 5" of a four-week cycle is pass 5. */
  pass: number
  dayId: string
  /** What the day asked for, with back-offs worked out from the sets done before them. */
  exercises: PrescribedExercise[]
  changes: ProgressionChange[]
  state: Record<string, ExerciseState>
}

function pickFor(picks: SimulateOptions["picks"], slot: string, week: number): number | undefined {
  const p = picks?.[slot]
  if (p == null) return undefined
  return typeof p === "number" ? p : p[week]
}

export function simulate(spec: ProgramSpec, opts: SimulateOptions): SimSession[] {
  const seeded = seed(spec, opts.start, opts.unit, opts.plates)
  let enr: EngineEnrollment = { id: "simulation", unitSystem: opts.unit, plates: opts.plates, ...seeded }
  const ctx = roundingContext(spec, opts.unit, opts.plates)
  const length = spec.calendar.lengthWeeks
  const calendarWeeks = spec.calendar.weekCounting === "calendar"
  const total = length == null ? (opts.sessions ?? spec.days.length) : (opts.weeks ?? length) * spec.days.length
  const order = spec.calendar.days === "weekdays" ? [...spec.days.keys()].sort((a, b) => (spec.days[a].weekday ?? 0) - (spec.days[b].weekday ?? 0)) : [...spec.days.keys()]
  const out: SimSession[] = []

  for (let n = 0; n < total; n++) {
    const dayIndex = calendarWeeks ? order[n % order.length] : enr.cursor.dayIndex
    const pass = calendarWeeks ? Math.floor(n / order.length) + 1 : length != null ? (enr.cursor.cycle - 1) * length + Math.min(enr.cursor.week, length) : 1
    const week =
      length == null ? 1 : spec.calendar.atEnd === "repeat" ? ((pass - 1) % length) + 1 : Math.min(pass, length)
    const day = spec.days[dayIndex]

    // Work through the day lift by lift: each lift's sets are "done" before
    // the next lift is prescribed, so a back-off can read the top set before it.
    const done: DoneSet[] = []
    const exercises: PrescribedExercise[] = []
    for (const slot of day.slots) {
      const raw = prescribeSlot(spec, slot, week, enr)
      const pick = pickFor(opts.picks, slot.id, week)
      let resolved = { ...raw, sets: raw.sets.map((s) => (s.pick && pick != null ? { ...s, weight: pick } : s)) }
      // Set by set, in order: a back-off is worked out from what was done
      // before it — this lift's own top set included.
      for (const row of resolved.sets.map((s) => s.setNumber)) {
        if (resolved.sets.find((s) => s.setNumber === row)!.derive) [resolved] = deriveFromEarlierSets([resolved], done, ctx)
        const s = resolved.sets.find((x) => x.setNumber === row)!
        done.push({ slot: slot.id, groupId: s.groupId, setNumber: s.setNumber, weight: s.weight, reps: s.repRangeMax ?? s.reps })
      }
      // What the screen shows: a picked weight stays "picked on the day".
      exercises.push({ ...resolved, sets: resolved.sets.map((s, i) => (s.pick ? { ...s, weight: raw.sets[i].weight } : s)) })
    }

    const entries = day.slots.map((slot, i) => {
      const ex = exercises[i]
      const doneHere = done.filter((d) => d.slot === slot.id)
      return {
        exerciseId: ex.exerciseId,
        slotId: slot.id,
        sets: ex.sets.map((s) => {
          const d = doneHere.find((x) => x.setNumber === s.setNumber)!
          return {
            setNumber: s.setNumber,
            reps: (s.repRangeMax ?? s.reps) + (s.amrap ? (opts.amrapExtra ?? 0) : 0),
            weight: d.weight,
            ...(s.groupId ? { groupId: s.groupId } : {}),
            ...(s.rpe != null ? { rpe: s.rpe } : {}),
          }
        }),
      }
    })
    const result = applySession(spec, enr, { enrollment_id: enr.id, dayId: day.id, cycle: enr.cursor.cycle, week, entries }, { programId: "simulation" })
    enr = result.enrollment
    out.push({ session: n + 1, week, pass, dayId: day.id, exercises, changes: result.changes, state: enr.exerciseState })
  }
  return out
}
