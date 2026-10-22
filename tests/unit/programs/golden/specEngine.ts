/**
 * The rebuilt engine behind the golden runner's interface: each built-in is
 * converted to the program format and run there. Golden equivalence
 * (Plans/program-builder.md, Phase 2.5) is this adapter's output against the
 * files the old engine wrote.
 */

import { applySession, legacySeedInputs, prescribe, replay, seed } from "@/src/programs/engine"
import { specFromLegacy } from "@/src/programs/spec/fromLegacy"
import type { ProgramSpec } from "@/src/programs/spec/types"
import type { ProgramDefinition, ProgramEnrollment, UnitSystem } from "@/src/programs/types"
import type { GoldenEngine } from "./goldenRun"

const specs = new Map<string, ProgramSpec>()
function specOf(program: ProgramDefinition, unit: UnitSystem): ProgramSpec {
  const k = `${program.id}:${unit}`
  if (!specs.has(k)) specs.set(k, specFromLegacy(program, { unit }))
  return specs.get(k)!
}

export const specEngine: GoldenEngine<ProgramEnrollment> = {
  start(program, level, unit, oneRepMaxes) {
    const spec = specOf(program, unit)
    const { exerciseState, cursor } = seed(spec, legacySeedInputs(program, level, unit, oneRepMaxes), unit)
    return {
      id: "golden",
      user_id: "golden-user",
      program_id: program.id,
      level,
      unitSystem: unit,
      exerciseState,
      initialExerciseState: exerciseState,
      cursor,
      is_active: true,
      started_at: "2026-01-05T00:00:00.000Z",
      customSchedule: null,
    }
  },
  prescribe: (program, enr) => prescribe(specOf(program, enr.unitSystem), enr, { programId: program.id }),
  log(program, enr, log) {
    const { enrollment, changes } = applySession(specOf(program, enr.unitSystem), enr, { enrollment_id: enr.id, ...log }, { programId: program.id })
    return { enrollment, changes }
  },
  state: (enr) => ({ exerciseState: enr.exerciseState, cursor: enr.cursor }),
  replay: (program, seedEnr, logs) =>
    replay(specOf(program, seedEnr.unitSystem), seedEnr, logs, [], {
      programId: program.id,
      programAt: () => specOf(program, seedEnr.unitSystem),
    }),
}
