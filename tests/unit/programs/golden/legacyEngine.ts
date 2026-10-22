/**
 * The engine as it stood on 2026-10-18, behind the golden runner's interface.
 *
 * Kept separate from the runner so the rebuilt engine can sit beside it behind
 * the same interface, and the two can be run over the same scripted lifters.
 */

import { applyLog, computePrescription, replayEnrollment, seedEnrollment } from "@/src/programs/programsService"
import type { ProgramEnrollment } from "@/src/programs/types"
import type { GoldenEngine } from "./goldenRun"

export const legacyEngine: GoldenEngine<ProgramEnrollment> = {
  start(program, level, unit, oneRepMaxes) {
    const { exerciseState, cursor } = seedEnrollment(program, level, unit, oneRepMaxes)
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
  prescribe: (program, enrollment) => computePrescription(program, enrollment),
  log(program, enrollment, log) {
    const { enrollment: next, changes } = applyLog(program, enrollment, { enrollment_id: enrollment.id, ...log })
    return { enrollment: next, changes }
  },
  state: (enrollment) => ({ exerciseState: enrollment.exerciseState, cursor: enrollment.cursor }),
  replay: (program, seed, logs) => replayEnrollment(program, seed, logs),
}
