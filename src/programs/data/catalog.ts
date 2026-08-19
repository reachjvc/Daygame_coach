/**
 * Program catalog — aggregates all encoded programs + discipline/level index.
 *
 * M1: two cited LOAD programs. Add more program files and list them here as the
 * catalog expands (Starting Strength, GZCLP, PPL, etc.).
 */

import type { Discipline, LevelId, ProgramDefinition } from "../types"
import { strongLifts5x5 } from "./strength/stronglifts5x5"
import { wendler531 } from "./strength/wendler531"
import { startingStrength } from "./strength/startingStrength"
import { pushPullLegs } from "./bodybuilding/pushPullLegs"
import { upperLower } from "./bodybuilding/upperLower"
import { phul } from "./bodybuilding/phul"
import { couchTo5k } from "./cardio/couchTo5k"
import { fiveKToTenK } from "./cardio/fiveKToTenK"
import { recommendedRoutine } from "./calisthenics/recommendedRoutine"
import { splitsMobility } from "./flexibility/splitsMobility"
import { sprintTriathlon, olympicTriathlon, halfIronman } from "./endurance/triathlon"
import { customProgram } from "./customProgram"

/**
 * The programs you can BROWSE. The custom shell is deliberately not here.
 *
 * It is a real program as far as `getProgram`/`requireProgram` are concerned —
 * an enrollment has to resolve through it — but it is not something anybody
 * picks off a list, because until you have designed it there is nothing in it.
 * Keeping it out of this array keeps it out of `programsByDiscipline`,
 * `programsForLevel` and the catalog UI in one move rather than by filtering at
 * each call site.
 */
export const ALL_PROGRAMS: ProgramDefinition[] = [
  strongLifts5x5,
  wendler531,
  startingStrength,
  pushPullLegs,
  upperLower,
  phul,
  couchTo5k,
  fiveKToTenK,
  recommendedRoutine,
  splitsMobility,
  sprintTriathlon,
  olympicTriathlon,
  halfIronman,
]

/** Every program that can be RESOLVED, including the custom shell. */
const RESOLVABLE: ProgramDefinition[] = [...ALL_PROGRAMS, customProgram]

export function getProgram(id: string): ProgramDefinition | undefined {
  return RESOLVABLE.find((p) => p.id === id)
}

export function requireProgram(id: string): ProgramDefinition {
  const p = getProgram(id)
  if (!p) throw new Error(`Unknown program: ${id}`)
  return p
}

export function programsByDiscipline(discipline: Discipline): ProgramDefinition[] {
  return ALL_PROGRAMS.filter((p) => p.discipline === discipline).sort(
    (a, b) => a.popularityRank - b.popularityRank
  )
}

export function hasProgramsForDiscipline(discipline: Discipline): boolean {
  return ALL_PROGRAMS.some((p) => p.discipline === discipline)
}

/** Programs that serve a given level without routing elsewhere. */
export function programsForLevel(level: LevelId): ProgramDefinition[] {
  return ALL_PROGRAMS.filter((p) =>
    p.levels.some((l) => l.id === level && !l.structuralVariantOf)
  )
}

/**
 * Resolve the program a (program, level) pair actually delivers — follows a
 * level's structuralVariantOf route (Layer-1 calibration). Returns the
 * resolved program + the level to enroll at.
 */
export function resolveProgramForLevel(
  programId: string,
  level: LevelId
): { program: ProgramDefinition; level: LevelId } {
  const program = requireProgram(programId)
  const seed = program.levels.find((l) => l.id === level)
  if (seed?.structuralVariantOf) {
    return resolveProgramForLevel(seed.structuralVariantOf, level)
  }
  return { program, level }
}
