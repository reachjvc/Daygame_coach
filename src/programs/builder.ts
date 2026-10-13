/**
 * Designing a training week from nothing.
 *
 * `customize.ts` edits a program that already exists — it starts from a catalog
 * snapshot and changes it. This starts from an empty week, and the difference
 * shows up in what has to be CHOSEN rather than inherited: how a lift is
 * prescribed (straight sets or a rep range), whether and how it progresses, and
 * whether it is paired with another lift.
 *
 * The two modules share everything they can. Days and exercises are added,
 * moved and removed by `customize.ts`'s operations, because a day is a day
 * whether the program was cited or invented, and duplicating that would mean
 * two sets of rules about empty days and colliding ids. What lives here is only
 * what building-from-scratch needs on top.
 *
 * SUPERSETS ARE A TAG, NOT A CONTAINER. Lifts sharing a `supersetGroup` are
 * done alternating. Modelling that as nesting would change the shape the
 * engine, the prescription, the log and the workout_sets bridge all walk, to
 * express something that is really "these two belong together" — and each lift
 * in a superset is still prescribed, logged and progressed on its own, which is
 * precisely what the flat tag preserves.
 */

import type { LibraryExercise, LoadExercise, LoadProgressionRule, ProgramSchedule, UnitSystem } from "./types"
import { toKg, fromKg } from "@/src/shared/weight"
import { roundToLoadable } from "./programsService"

/** The default rule for a lift dropped in from the library. */
function defaultProgression(entry: LibraryExercise): LoadProgressionRule {
  return entry.compound
    ? { kind: "linear_load", incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1 }
    : { kind: "double_progression", incrementKg: 2.5, incrementLb: 5 }
}

/**
 * Build a progression rule of the requested kind, carrying the increment the
 * lift already had where the new rule also has one.
 *
 * Switching a lift from "add weight each time" to "add reps, then weight"
 * should not silently reset a 5 kg increment somebody chose to the 2.5 kg
 * default, so the number survives the switch when both rules use one.
 */
export function progressionOfKind(
  kind: LoadProgressionRule["kind"],
  previous?: LoadProgressionRule
): LoadProgressionRule {
  const kg = previous && "incrementKg" in previous ? previous.incrementKg : 2.5
  const lb = previous && "incrementLb" in previous ? previous.incrementLb : 5
  switch (kind) {
    case "none":
      return { kind: "none" }
    case "linear_load":
      return { kind: "linear_load", incrementKg: kg, incrementLb: lb, deloadAfterFails: 3, deloadPct: 0.1 }
    case "double_progression":
      return { kind: "double_progression", incrementKg: kg, incrementLb: lb }
    case "percentage_tm":
      // Not offered in the builder: a %TM wave is a per-week set table, which
      // is a program's structure rather than one lift's setting. Refused here
      // rather than half-built from a rule that has no table to go with it.
      throw new Error("A percentage-of-training-max wave cannot be built one lift at a time")
  }
}

/**
 * A lift built for a self-designed program.
 *
 * Same library entry the swap picker uses, but the caller chooses the scheme
 * and the rule rather than inheriting the catalog's opinion.
 */
export function buildExercise(
  entry: LibraryExercise,
  exerciseId: string,
  opts?: { schemeKind?: "linear" | "rep_range"; progression?: LoadProgressionRule["kind"] }
): LoadExercise {
  const schemeKind = opts?.schemeKind ?? (entry.compound ? "linear" : "rep_range")
  const progression = opts?.progression
    ? progressionOfKind(opts.progression)
    : defaultProgression(entry)
  return {
    id: exerciseId,
    name: entry.name,
    metricType: "load",
    loadStyle: entry.barbell ? "barbell" : "free",
    scheme:
      schemeKind === "linear"
        ? { kind: "linear", sets: entry.defaultSets, reps: entry.defaultRepMin }
        : {
            kind: "rep_range",
            sets: entry.defaultSets,
            repMin: entry.defaultRepMin,
            repMax: entry.defaultRepMax,
          },
    progression,
  }
}

/**
 * Turn the weight boxes into numbers for the wire.
 *
 * THE EMPTY-STRING TRAP. `Number("")` is 0, and 0 now means bodyweight, so
 * filtering on the parsed number would turn every box somebody left blank into
 * a deliberate "this lift starts at nothing". The raw string is checked first:
 * blank means unanswered and is omitted, and only something that was actually
 * typed becomes a number.
 */
export function numericWeights(raw: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (value == null || value.trim() === "") continue
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) continue
    out[id] = n
  }
  return out
}

/** True when this lift has been given a starting weight — 0 counts, blank does not. */
export function hasWeight(raw: Record<string, string>, exerciseId: string): boolean {
  const value = raw[exerciseId]
  if (value == null || value.trim() === "") return false
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

// ---------------------------------------------------------------------------
// Days of the week
// ---------------------------------------------------------------------------

/**
 * Pin a training day to a weekday, or unpin it with `null`.
 *
 * ONE DAY PER WEEKDAY. Two sessions on the same Tuesday cannot both be "the
 * Tuesday session", and letting it happen would make "what am I doing today?"
 * have two answers — so the weekday is taken off whichever other day held it.
 * Moving Push to Wednesday when Pull was already there leaves Pull unassigned
 * and visibly so, rather than silently refusing the move the user just made.
 */
export function setWeekday(
  schedule: ProgramSchedule,
  dayId: string,
  weekday: number | null
): ProgramSchedule {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") {
    throw new Error("Only a days-and-lifts program has weekdays")
  }
  if (weekday !== null && (!Number.isInteger(weekday) || weekday < 1 || weekday > 7)) {
    throw new Error("A weekday is Monday through Sunday")
  }
  const days = schedule.days.map((d) => {
    if (d.id === dayId) {
      const next = { ...d }
      if (weekday === null) delete next.weekday
      else next.weekday = weekday
      return next
    }
    // Whoever else had this weekday gives it up.
    if (weekday !== null && d.weekday === weekday) {
      const next = { ...d }
      delete next.weekday
      return next
    }
    return d
  })
  return schedule.kind === "linear_rotation"
    ? { kind: "linear_rotation", days }
    : { kind: "weekly_waved", weeks: schedule.weeks, days }
}

/**
 * SWITCHING KG↔LB CONVERTS WHAT YOU TYPED. It used to delete it.
 *
 * The unit buttons on the Templates step called `setWeights({})` and
 * `setOneRms({})` — every number you had typed for every lift, gone, with
 * nothing on screen saying so. Somebody filling in eight starting weights who
 * then noticed the wrong unit lost all eight and had to start again.
 *
 * The builder's own unit button did the opposite wrong thing: it kept the
 * numbers and changed the label, so 60 kg silently became 60 lb.
 *
 * Neither is a conversion. This is: each typed value is converted, then rounded
 * to something you can actually load — a barbell to the nearest plate pair, a
 * dumbbell to the nearest dumbbell. A blank stays blank, and anything that is
 * not a number is left exactly as typed, because a half-typed "6" is not a
 * weight yet and overwriting it as somebody types would be its own bug.
 */
export function convertTyped(
  map: Record<string, string>,
  from: UnitSystem,
  to: UnitSystem,
  styleFor: (exerciseId: string) => "barbell" | "free" | "bodyweight"
): Record<string, string> {
  if (from === to) return map
  const out: Record<string, string> = {}
  for (const [id, raw] of Object.entries(map)) {
    const value = Number(raw)
    if (raw.trim() === "" || !Number.isFinite(value)) {
      out[id] = raw
      continue
    }
    // Through kilograms, which is how every stored weight is held.
    const converted = to === "kg" ? toKg(value, from) : fromKg(toKg(value, from), to)
    out[id] = String(roundToLoadable(converted, to, styleFor(id)))
  }
  return out
}
