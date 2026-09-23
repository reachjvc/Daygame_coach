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
/**
 * Everything a running program says about itself, in one object, on the
 * account's clock. The Templates card needs the name, the level, the week and
 * when it was last trained; four separate reads of the enrollment is how those
 * four facts drifted apart on the four screens that used to invent them.
 */
export { describeProgramWeek } from "./programWeekService"
// Switching kg↔lb converts what was typed rather than deleting it; Life
// Mastery's own builder needs the same rule, not a second copy of it.
export { convertTyped } from "./builder"
/**
 * The training card itself. Life Mastery's Track step embeds the SAME card the
 * Tracking page shows — not a second copy — so what it says in one place and
 * what it says in the other cannot drift.
 *
 * It was previously reached by a lazy `import()`, which this door's guard
 * cannot see; direct and through here is the honest version of the same thing.
 */
export { TrainingCard } from "./components/TrainingCard"
/**
 * ONE ROW SHAPE FOR EVERY LIST OF PROGRAMS, including the one on this page.
 *
 * The block inside the plan was the fifth of five different rows — five
 * paddings, five type sizes, and one of them built from 26-px buttons you had
 * to aim at. Nothing about a program changes between those screens.
 */
export { ProgramRow } from "./components/ProgramRow"
/**
 * The picked state of a choice chip. Life Mastery's Templates step has one
 * "Level" row and the training screens have several; written out by hand in
 * both places they drift, which is how this app ended up with four ways of
 * showing that something is selected. A look rather than a fact about the gym,
 * and the only reason it lives under `src/programs` is that training is where
 * the token was first written down.
 */
export { CHIP_ON } from "./components/trainingStyles"
/**
 * GREEN MEANS DONE, and it lives in one file so it cannot come to mean
 * anything else. The Templates card says a program is finished, which is the
 * one thing on it that IS finished.
 */
export { DONE } from "./components/trainingStyles"

export type { ProgramEnrollment } from "./types"
export type { ProgramWeekDescription } from "./types"
