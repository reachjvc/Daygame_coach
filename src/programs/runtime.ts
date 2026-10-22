/**
 * WHICH ENGINE RUNS A PROGRAM, DECIDED ONCE — Plans/program-builder.md, Phase 4.
 *
 * A lifting program runs on the engine built on the program format
 * (`src/programs/engine`): its own stored copy when it has one (every program
 * started since Phase 4), otherwise the program it was handed — the catalogue
 * entry with the person's own week in place — converted on the way in. A
 * running plan or the splits program stays on the engine it always had (Q3).
 *
 * THE FUNCTIONS KEEP THE OLD ENGINE'S SIGNATURES (`prescriptionOf` is
 * `computePrescription`, `applyLogOf` is `applyLog`, and so on), so every
 * caller changed by name only, and the old engine's own tests now run
 * against the new one unchanged. The old lifting code was deleted when
 * nothing called it any more.
 *
 * Pure, like the engines: the caller hands in the clock and the gym's plates.
 */

import { customProgram } from "./data/customProgram"
import { convertLegacy, isLiftingSchedule } from "./spec/fromLegacy"
import { stateKeyOf } from "./spec/schema"
import { readSpec } from "./spec/read"
import type { ProgramSpec, ProgressionRule, SlotSpec } from "./spec/types"
import {
  advance,
  applySession,
  liftLoadStyle,
  liftName,
  legacyFallbackWorking,
  legacySeedInputs,
  prescribe,
  replay,
  seed,
  type Clock,
  type ReplayLog,
} from "./engine"
import {
  advanceRunOrHold as legacyAdvance,
  applyRunOrHoldLog as legacyApplyLog,
  prescribeRunOrHold as legacyPrescription,
  replayRunOrHold as legacyReplay,
  seedRunOrHold,
} from "./programsService"
import type {
  ApplyLogResult,
  EnrollmentCursor,
  DayTemplate,
  ExerciseState,
  LevelId,
  LoadExercise,
  LoadProgressionRule,
  PlateSetup,
  ProgramDefinition,
  ProgramEnrollment,
  ProgramSessionLogInput,
  ReplayEvent,
  SessionPrescription,
  UnitSystem,
} from "./types"

type EnrollmentLike = Pick<ProgramEnrollment, "id" | "level" | "unitSystem" | "exerciseState" | "cursor" | "label"> &
  Partial<Pick<ProgramEnrollment, "plates" | "startedOn" | "spec" | "program_id">>

/** The program in the new format, or null when it is not a lifting program. */
export function specOf(program: ProgramDefinition, enr: Pick<EnrollmentLike, "unitSystem" | "label" | "spec">): ProgramSpec | null {
  if (enr.spec) return readSpec(enr.spec)
  if (!isLiftingSchedule(program.schedule)) return null
  const converted = convertLegacy(program, { unit: enr.unitSystem, name: enr.label })
  return "kept" in converted ? null : converted.spec
}

/**
 * The program as the old screens read it — day names, weekdays, lifts. A
 * program stored only in the new format (one started from a program somebody
 * built) is described from its spec; everything else is the definition handed
 * in.
 */
export function definitionOf(program: ProgramDefinition, enr: Pick<EnrollmentLike, "spec">): ProgramDefinition {
  if (enr.spec && program.id === customProgram.id) return definitionFromSpec(readSpec(enr.spec), program)
  return program
}

/**
 * A program stored only in the new format, described in the old shape for the
 * screens that still read it: days with their weekdays, and per lift its
 * name, its first working group as sets × reps, its superset, note and rest.
 * Lossy on purpose and never run: the engine reads the spec itself.
 */
export function definitionFromSpec(spec: ProgramSpec, base: ProgramDefinition): ProgramDefinition {
  const days: DayTemplate[] = spec.days.map((d) => ({
    id: d.id,
    label: d.label,
    ...(d.weekday != null ? { weekday: d.weekday } : {}),
    exercises: d.slots.map(describedLift),
  }))
  return {
    ...base,
    name: spec.name,
    blurb: spec.blurb ?? base.blurb,
    schedule:
      spec.calendar.lengthWeeks != null
        ? { kind: "weekly_waved", weeks: spec.calendar.lengthWeeks, days }
        : { kind: "linear_rotation", days },
  }
}

function describedLift(slot: SlotSpec): LoadExercise {
  const g = slot.sets.find((x) => x.kind !== "warmup") ?? slot.sets[0]
  const sets = typeof g.count === "number" ? g.count : g.count.min
  const reps = g.reps
  const scheme: LoadExercise["scheme"] =
    typeof reps === "object" && "min" in reps
      ? { kind: "rep_range", sets, repMin: reps.min, repMax: reps.max }
      : { kind: "linear", sets, reps: typeof reps === "number" ? reps : "atLeast" in reps ? reps.atLeast : "total" in reps ? reps.total : typeof reps.seconds === "number" ? reps.seconds : reps.seconds.min }
  return {
    id: stateKeyOf(slot),
    name: liftName(slot.lift),
    metricType: "load",
    scheme,
    progression: describedRule(slot.progression),
    loadStyle: liftLoadStyle(slot.lift),
    ...(slot.group ? { supersetGroup: slot.group } : {}),
    ...(slot.note ? { note: slot.note.slice(0, 120) } : {}),
    ...(slot.restSec != null ? { restSec: slot.restSec } : {}),
    ...(slot.perSide ? { perSide: true } : {}),
    ...(typeof reps === "object" && "seconds" in reps ? { repUnit: "sec" as const } : {}),
  }
}

function describedRule(rule: ProgressionRule): LoadProgressionRule {
  if (rule.kind === "add-on-success") {
    return { kind: "linear_load", incrementKg: rule.inc.kg, incrementLb: rule.inc.lb, deloadAfterFails: rule.failsBeforeDrop, deloadPct: rule.dropPct }
  }
  if (rule.kind === "double") return { kind: "double_progression", incrementKg: rule.inc.kg, incrementLb: rule.inc.lb }
  return { kind: "none" }
}

const withPlates = <E extends EnrollmentLike>(enr: E, plates?: PlateSetup): E => (plates ? { ...enr, plates } : enr)

/** `computePrescription`, on whichever engine runs this program. */
export function prescriptionOf(
  program: ProgramDefinition,
  enr: ProgramEnrollment,
  opts: { dayIndex?: number; clock?: Clock; plates?: PlateSetup } = {}
): SessionPrescription {
  const e = withPlates(enr, opts.plates)
  const spec = specOf(program, e)
  if (!spec) {
    return legacyPrescription(program, opts.dayIndex != null ? { ...e, cursor: { ...e.cursor, dayIndex: opts.dayIndex } } : e)
  }
  return prescribe(spec, e, {
    programId: program.id,
    ...(opts.dayIndex != null ? { dayIndex: opts.dayIndex } : {}),
    ...(opts.clock ? { clock: opts.clock } : {}),
    fallbackWorking: legacyFallbackWorking(program, e.level, e.unitSystem, e.plates),
  })
}

/** `applyLog`, on whichever engine runs this program. */
export function applyLogOf(
  program: ProgramDefinition,
  enr: ProgramEnrollment,
  log: ProgramSessionLogInput,
  opts: { plates?: PlateSetup } = {}
): ApplyLogResult {
  const e = withPlates(enr, opts.plates)
  const spec = specOf(program, e)
  if (!spec) return legacyApplyLog(program, e, log)
  return applySession(spec, e, log, {
    programId: program.id,
    fallbackWorking: legacyFallbackWorking(program, e.level, e.unitSystem, e.plates),
  })
}

/** `advanceCursor`: where the program goes after a session on the cursor's day. */
export function advanceOf(program: ProgramDefinition, cursor: EnrollmentCursor): EnrollmentCursor {
  if (!isLiftingSchedule(program.schedule)) return legacyAdvance(program, cursor)
  const spec = specOf(program, { unitSystem: "kg", label: null })!
  return advance(spec, cursor, cursor.dayIndex)
}

/**
 * `seedEnrollment`: the numbers a program starts from — the person's own where
 * given, else the level's. Refuses by name a lift that needs a number and has
 * none, as before.
 */
export function seedOf(
  program: ProgramDefinition,
  level: LevelId,
  unitSystem: UnitSystem,
  oneRepMaxesByExerciseId?: Record<string, number>,
  workingWeightOverrides?: Record<string, number>,
  plates?: PlateSetup,
  ownSpec?: ProgramSpec | null
): { exerciseState: Record<string, ExerciseState>; cursor: EnrollmentCursor } {
  const spec = ownSpec ?? specOf(program, { unitSystem, label: null })
  if (!spec) return seedRunOrHold(program, level)
  const inputs = ownSpec
    ? { working: workingWeightOverrides, oneRepMaxes: oneRepMaxesByExerciseId }
    : legacySeedInputs(program, level, unitSystem, oneRepMaxesByExerciseId, workingWeightOverrides)
  return seed(spec, inputs, unitSystem, plates)
}

/**
 * `replayEnrollment`: the numbers rebuilt from the seed and the whole history.
 *
 * A recorded change of shape switches the program in force: a stored version
 * when one is named (`versions`, read from `program_versions`), else the old
 * week the event carries, converted. The program a history STARTS from is
 * version 1 when versions are kept, the stored copy when nothing was ever
 * changed, and otherwise the definition handed in — the catalogue's — exactly
 * as the old replay began.
 */
export function replayOf(
  program: ProgramDefinition,
  seedEnr: ProgramEnrollment,
  logs: ReplayLog[],
  events: ReplayEvent[] = [],
  opts: { plates?: PlateSetup; versions?: ReadonlyMap<number, ProgramSpec> } = {}
): ProgramEnrollment {
  const e = withPlates(seedEnr, opts.plates)
  const changed = events.some((ev) => ev.kind === "schedule")
  const initial =
    opts.versions?.get(1) ??
    (seedEnr.spec && !changed ? readSpec(seedEnr.spec) : specOf(program, { unitSystem: e.unitSystem, label: e.label }))
  if (!initial) return legacyReplay(program, e, logs, events)
  return replay(initial, e, logs, events, {
    programId: program.id,
    fallbackWorking: legacyFallbackWorking(program, e.level, e.unitSystem, e.plates),
    programAt: (event) => {
      if (event.version != null) {
        const spec = opts.versions?.get(event.version)
        if (!spec) throw new Error(`Version ${event.version} of this program could not be read, so its history cannot be recalculated.`)
        return spec
      }
      const at: ProgramDefinition = event.schedule ? { ...program, schedule: event.schedule } : program
      const spec = specOf(at, { unitSystem: e.unitSystem, label: e.label })
      if (!spec) throw new Error(`${program.name} is not a lifting program`)
      return spec
    },
  })
}

/**
 * THE OLD ENGINE'S NAMES, kept so every caller — and every test written
 * against the old engine — reaches the new one by changing where it imports
 * from, and nothing else.
 */
export {
  prescriptionOf as computePrescription,
  applyLogOf as applyLog,
  advanceOf as advanceCursor,
  seedOf as seedEnrollment,
  replayOf as replayEnrollment,
}
