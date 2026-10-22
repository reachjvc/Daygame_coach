/**
 * The program engine, rebuilt on the program format (Plans/program-builder.md,
 * Phase 2). Pure functions only: no clock, no database.
 */

export { place, advance, calendarWeek, dayForToday, type Clock, type Placement } from "./calendar"
export { prescribe, prescribeSlot, groupsForWeek, liftName, liftLoadStyle, type EngineEnrollment, type PrescribeOptions } from "./prescribe"
export { applySession } from "./progress"
export { deriveFromEarlierSets, referenceWeight, type DoneSet } from "./sameDay"
export { seed, START_CURSOR, type SeedInputs } from "./seed"
export { replay, type ReplayLog } from "./replay"
export { simulate, type SimSession, type SimulateOptions } from "./simulate"
export { describeResolved } from "./describe"
export { e1rm, rtsPercent, weightForEffort } from "./e1rm"
export { roundLoad, roundingContext, type RoundingContext } from "./rounding"
export { legacySeedInputs, legacyFallbackWorking } from "./legacy"
