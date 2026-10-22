/**
 * THE CATALOGUE'S STARTING NUMBERS, FOR THE NEW ENGINE.
 *
 * The built-ins keep their level seeds (beginner, intermediate, advanced) in
 * kilograms on the catalogue entry, outside the program itself. These turn a
 * level, the person's own numbers and their unit into what `seed` takes —
 * the same arithmetic `seedEnrollment` did, so a converted program starts
 * exactly where the old one did.
 */

import { fromKg, loadStyleOf, roundToLoadable } from "../programsService"
import type { LevelId, PlateSetup, ProgramDefinition, UnitSystem } from "../types"
import type { SeedInputs } from "./seed"

function levelOf(program: ProgramDefinition, level: LevelId) {
  const seed = program.levels.find((l) => l.id === level)
  if (!seed) throw new Error(`Program ${program.id} has no level ${level}`)
  if (seed.structuralVariantOf) {
    throw new Error(`Level ${level} of ${program.id} routes to program ${seed.structuralVariantOf}; enroll there instead`)
  }
  return seed
}

/** What `seed` needs: the person's numbers where given, else the level's, in their unit. */
export function legacySeedInputs(
  program: ProgramDefinition,
  level: LevelId,
  unit: UnitSystem,
  oneRepMaxes?: Record<string, number>,
  workingOverrides?: Record<string, number>
): SeedInputs {
  const seeds = levelOf(program, level).seedWorkingWeightKg ?? {}
  const working: Record<string, number> = {}
  for (const [id, kg] of Object.entries(seeds)) working[id] = fromKg(kg, unit)
  for (const [id, w] of Object.entries(workingOverrides ?? {})) working[id] = w
  return { working, ...(oneRepMaxes ? { oneRepMaxes } : {}) }
}

/**
 * Starting weights for lifts a program gained after somebody started it:
 * the level's seed, rounded as the old engine rounded it there.
 */
export function legacyFallbackWorking(
  program: ProgramDefinition,
  level: LevelId,
  unit: UnitSystem,
  plates?: PlateSetup
): Record<string, number> {
  const seed = program.levels.find((l) => l.id === level)
  const out: Record<string, number> = {}
  if (!seed?.seedWorkingWeightKg || program.schedule.kind === "endurance_weeks") return out
  const names = new Map<string, { name: string; loadStyle?: "barbell" | "free" | "bodyweight" }>()
  if (program.schedule.kind === "linear_rotation" || program.schedule.kind === "weekly_waved") {
    for (const d of program.schedule.days) for (const ex of d.exercises) names.set(ex.id, ex)
  }
  for (const [id, kg] of Object.entries(seed.seedWorkingWeightKg)) {
    const ex = names.get(id)
    out[id] = roundToLoadable(fromKg(kg, unit), unit, ex ? loadStyleOf(ex) : "barbell", plates)
  }
  return out
}
