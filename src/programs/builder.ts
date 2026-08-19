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

import type { LibraryExercise, LoadExercise, LoadProgressionRule, ProgramSchedule } from "./types"
import { scheduleDays } from "./customize"

/** The progression rules a self-designed lift can be given, with plain names. */
export const PROGRESSION_CHOICES: Array<{
  id: LoadProgressionRule["kind"]
  label: string
  hint: string
}> = [
  {
    id: "linear_load",
    label: "Add weight each time",
    hint: "Hit all your reps and the weight goes up next session. Three misses in a row and it drops back 10% to build up again. How StrongLifts and Starting Strength work.",
  },
  {
    id: "double_progression",
    label: "Add reps, then weight",
    hint: "Work up to the top of the rep range on every set, then add weight and start again at the bottom. The usual way to run accessories and most hypertrophy work.",
  },
  {
    id: "none",
    label: "Leave it to me",
    hint: "The weight stays where you put it until you change it yourself. For lifts you autoregulate, or anything you would rather the app did not have an opinion about.",
  },
]

/** An empty week, ready to have days put in it. */
export function emptyCustomSchedule(): ProgramSchedule {
  return { kind: "linear_rotation", days: [] }
}

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

function mapExercise(
  schedule: ProgramSchedule,
  dayId: string,
  exerciseId: string,
  fn: (ex: LoadExercise) => LoadExercise
): ProgramSchedule {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") {
    throw new Error("Only load programs can be designed this way")
  }
  const day = schedule.days.find((d) => d.id === dayId)
  if (!day) throw new Error(`No day ${dayId} in this program`)
  const days = schedule.days.map((d) =>
    d.id === dayId ? { ...d, exercises: d.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)) } : d
  )
  return schedule.kind === "linear_rotation"
    ? { kind: "linear_rotation", days }
    : { kind: "weekly_waved", weeks: schedule.weeks, days }
}

/** Change how a lift progresses. */
export function setProgression(
  schedule: ProgramSchedule,
  dayId: string,
  exerciseId: string,
  kind: LoadProgressionRule["kind"]
): ProgramSchedule {
  return mapExercise(schedule, dayId, exerciseId, (ex) => ({
    ...ex,
    progression: progressionOfKind(kind, ex.progression),
  }))
}

/** Change the weight step a lift moves in, in the user's own unit. */
export function setIncrement(
  schedule: ProgramSchedule,
  dayId: string,
  exerciseId: string,
  increment: number,
  unit: "kg" | "lb"
): ProgramSchedule {
  if (!Number.isFinite(increment) || increment <= 0) {
    throw new Error("A weight step has to be more than nothing")
  }
  return mapExercise(schedule, dayId, exerciseId, (ex) => {
    if (!("incrementKg" in ex.progression)) {
      throw new Error(`${ex.name} does not add weight on a rule, so it has no step`)
    }
    return {
      ...ex,
      progression:
        unit === "kg"
          ? { ...ex.progression, incrementKg: increment }
          : { ...ex.progression, incrementLb: increment },
    }
  })
}

/**
 * Switch a lift between straight sets and a rep range.
 *
 * The rep numbers are carried across rather than reset: 3×5 becoming a range
 * offers 5–8 (the reps you had, up to a sensible top), and a 8–12 range
 * becoming straight sets keeps the 8. Somebody toggling to see what the other
 * one looks like should not lose what they typed.
 */
export function setSchemeKind(
  schedule: ProgramSchedule,
  dayId: string,
  exerciseId: string,
  kind: "linear" | "rep_range"
): ProgramSchedule {
  // Returned unchanged — the same object, not an equal one — so clicking the
  // scheme you are already on does not hand React a new schedule to re-render
  // the whole day from.
  const current = scheduleDays(schedule)
    .find((d) => d.id === dayId)
    ?.exercises.find((e) => e.id === exerciseId) as LoadExercise | undefined
  if (current?.scheme.kind === kind) return schedule

  return mapExercise(schedule, dayId, exerciseId, (ex) => {
    if (ex.scheme.kind === "percentage_tm") {
      throw new Error(`${ex.name} runs a percentage wave, which is not a sets-and-reps setting`)
    }
    if (ex.scheme.kind === kind) return ex
    if (kind === "rep_range") {
      const reps = ex.scheme.kind === "linear" ? ex.scheme.reps : ex.scheme.repMin
      return {
        ...ex,
        scheme: { kind: "rep_range", sets: ex.scheme.sets, repMin: reps, repMax: reps + 3 },
      }
    }
    const reps = ex.scheme.kind === "rep_range" ? ex.scheme.repMin : ex.scheme.reps
    return { ...ex, scheme: { kind: "linear", sets: ex.scheme.sets, reps } }
  })
}

/**
 * Drops off the last set: strip the weight, go again, do not rack it.
 *
 * Zero clears it, so the same control turns it off — a modifier you can add and
 * cannot remove is worse than no modifier. Capped at 4 to match the schema:
 * two or three strips is a drop set, nine is a typo.
 *
 * Deliberately invisible to `applyLog`. Drops are extra work at a weight you
 * did not choose, and counting them as sets would tell the engine the working
 * weight collapsed and deload a lift that is going fine.
 */
export function setDropSets(
  schedule: ProgramSchedule,
  dayId: string,
  exerciseId: string,
  drops: number
): ProgramSchedule {
  const n = Math.max(0, Math.min(4, Math.round(drops)))
  return mapExercise(schedule, dayId, exerciseId, (ex) => {
    const next = { ...ex }
    if (n > 0) next.dropSets = n
    else delete next.dropSets
    return next
  })
}

/** A short free-text cue under a lift — tempo, "left side first", whatever. */
export function setNote(
  schedule: ProgramSchedule,
  dayId: string,
  exerciseId: string,
  note: string
): ProgramSchedule {
  const trimmed = note.trim().slice(0, 120)
  return mapExercise(schedule, dayId, exerciseId, (ex) => {
    const next = { ...ex }
    if (trimmed) next.note = trimmed
    else delete next.note
    return next
  })
}

// ---------------------------------------------------------------------------
// Supersets
// ---------------------------------------------------------------------------

/** The superset groups in a day, in the order their first lift appears. */
export function supersetGroups(schedule: ProgramSchedule, dayId: string): string[] {
  const day = scheduleDays(schedule).find((d) => d.id === dayId)
  if (!day) return []
  const seen: string[] = []
  for (const ex of day.exercises) {
    const group = (ex as LoadExercise).supersetGroup
    if (group && !seen.includes(group)) seen.push(group)
  }
  return seen
}

/** The next free group letter in a day: A, B, C… */
function nextGroupId(schedule: ProgramSchedule, dayId: string): string {
  const taken = new Set(supersetGroups(schedule, dayId))
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i)
    if (!taken.has(letter)) return letter
  }
  throw new Error("That is enough supersets for one day")
}

/**
 * Pair a lift with the one under it.
 *
 * Supersets are made by joining NEIGHBOURS, not by assigning group letters from
 * a dropdown, because a superset is a thing you do back to back — two lifts
 * that are supersetted but sit five rows apart is a contradiction the UI would
 * then have to explain. Joining moves nothing: the pair is already adjacent, or
 * the caller reorders first.
 */
export function joinWithNext(schedule: ProgramSchedule, dayId: string, index: number): ProgramSchedule {
  const day = scheduleDays(schedule).find((d) => d.id === dayId)
  if (!day) throw new Error(`No day ${dayId} in this program`)
  const here = day.exercises[index] as LoadExercise | undefined
  const next = day.exercises[index + 1] as LoadExercise | undefined
  if (!here || !next) throw new Error("There is no lift under this one to pair it with")

  // Join into whichever group already exists, so a third lift added to an A/B
  // pair extends it rather than starting a rival group.
  const group = here.supersetGroup ?? next.supersetGroup ?? nextGroupId(schedule, dayId)
  let out = mapExercise(schedule, dayId, here.id, (e) => ({ ...e, supersetGroup: group }))
  out = mapExercise(out, dayId, next.id, (e) => ({ ...e, supersetGroup: group }))
  return out
}

/**
 * Take a lift out of its superset.
 *
 * A group left with a single lift is not a superset, so the survivor is
 * released too rather than being left tagged as a pair with nothing to pair
 * with — a state that would render as "A1" beside no A2.
 */
export function unjoin(schedule: ProgramSchedule, dayId: string, exerciseId: string): ProgramSchedule {
  const day = scheduleDays(schedule).find((d) => d.id === dayId)
  if (!day) throw new Error(`No day ${dayId} in this program`)
  const target = day.exercises.find((e) => e.id === exerciseId) as LoadExercise | undefined
  const group = target?.supersetGroup
  if (!group) return schedule

  let out = mapExercise(schedule, dayId, exerciseId, (e) => {
    const next = { ...e }
    delete next.supersetGroup
    return next
  })

  const remaining = (scheduleDays(out).find((d) => d.id === dayId)!.exercises as LoadExercise[]).filter(
    (e) => e.supersetGroup === group
  )
  if (remaining.length === 1) {
    out = mapExercise(out, dayId, remaining[0].id, (e) => {
      const next = { ...e }
      delete next.supersetGroup
      return next
    })
  }
  return out
}

/**
 * The label a lift carries in the session: "A1", "A2", or nothing.
 *
 * Numbered by position within the group, so reordering renumbers rather than
 * leaving the second lift labelled A1.
 */
export function supersetLabel(exercises: LoadExercise[], index: number): string | null {
  const ex = exercises[index]
  if (!ex?.supersetGroup) return null
  const position = exercises.slice(0, index + 1).filter((e) => e.supersetGroup === ex.supersetGroup).length
  return `${ex.supersetGroup}${position}`
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
 * Whether this schedule runs on a calendar or in sequence.
 *
 * Deliberately all-or-nothing. A week where three days have weekdays and two do
 * not has no coherent answer to "what is today's session" on the days nobody
 * assigned, and every way of resolving it is a guess. `designProblems` reports
 * the half-assigned state so it is fixed rather than interpreted.
 */
export function isWeekdayAnchored(schedule: ProgramSchedule): boolean {
  if (schedule.kind === "endurance_weeks") return false
  return schedule.days.length > 0 && schedule.days.every((d) => d.weekday != null)
}

/** The day to do on a given ISO weekday, if this schedule is anchored. */
export function dayForWeekday(schedule: ProgramSchedule, weekday: number) {
  if (schedule.kind === "endurance_weeks") return undefined
  return schedule.days.find((d) => d.weekday === weekday)
}

/**
 * What is stopping this design from being started, in words.
 *
 * Separate from `scheduleProblems` (which guards any schedule) because a
 * from-scratch design has one more way to be unfinished: it can be completely
 * empty, which is the state it starts in and not something to shout about until
 * somebody tries to begin it.
 */
export function designProblems(schedule: ProgramSchedule): string[] {
  const problems: string[] = []
  const days = schedule.kind === "endurance_weeks" ? [] : schedule.days
  if (days.length === 0) {
    problems.push("Add a training day to get started.")
    return problems
  }
  for (const day of days) {
    if (day.exercises.length === 0) problems.push(`${day.label} has no lifts in it yet.`)
  }
  // Half a week on the calendar and half of it in sequence is not a schedule.
  const assigned = days.filter((d) => d.weekday != null)
  if (assigned.length > 0 && assigned.length < days.length) {
    const missing = days.filter((d) => d.weekday == null).map((d) => d.label)
    problems.push(
      missing.length === 1
        ? `${missing[0]} has no day of the week. Give it one, or clear the others to train in order instead.`
        : `${missing.length} days have no day of the week. Give them one, or clear the others to train in order instead.`
    )
  }
  return problems
}
