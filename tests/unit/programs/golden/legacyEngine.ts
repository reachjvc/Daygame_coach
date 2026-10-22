/**
 * The app's own entry points (`src/programs/runtime.ts`) behind the golden
 * runner's interface.
 *
 * On 2026-10-18 these WERE the old engine, and the golden files were written
 * through them. Since Phase 4 the same names send lifting programs to the
 * rebuilt engine and running and mobility plans to the old one, so this
 * adapter now checks the app as it runs: every built-in, through the exact
 * functions the repos call, against the files the old engine wrote.
 */

import { applyLog, computePrescription, replayEnrollment, seedEnrollment } from "@/src/programs/runtime"
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
