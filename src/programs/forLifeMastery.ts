/**
 * THE ONE DOOR FROM LIFE MASTERY INTO THE GYM.
 *
 * `src/goals` reaches into `src/programs` through fourteen different modules
 * today — components, hooks, the catalogue, the engine, the builder, the
 * customiser. Every one of them is a place the two slices can be coupled
 * without anybody noticing, and the coupling is exactly what this phase is
 * unpicking: the plan used to keep its own COPY of the program, and each of
 * those imports was a way for the copy to look plausible.
 *
 * So there is one door. Everything Life Mastery legitimately needs to know
 * about training is here, and it is a short list on purpose:
 *
 *   - which programs are running (`useActiveEnrollments`, `refreshEnrollments`)
 *   - what one is called (`enrollmentName`)
 *   - what its week looks like (`describeTrainingWeek`, `getProgram`)
 *
 * Notice what is NOT here: nothing that lets Life Mastery describe a week from
 * its own stored copy, and nothing that lets it edit a program's days. Those
 * were the two faults.
 *
 * `tests/unit/architecture.test.ts` holds a list of the direct imports that
 * exist today and fails if a new one is added. The list only shrinks; a later
 * phase empties it.
 */

export { useActiveEnrollments, refreshEnrollments } from "./hooks/useEnrollment"
export { enrollmentName, getProgram } from "./data/catalog"
export { describeTrainingWeek } from "./programsService"

export type { ProgramEnrollment } from "./types"
