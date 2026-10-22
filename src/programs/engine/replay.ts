/**
 * REBUILDING A PROGRAM'S NUMBERS FROM ITS HISTORY — `replayEnrollment`, on the
 * new format.
 *
 * Everything that changed the state, in the order it happened: workouts, and
 * the things that were not workouts — a skip, a reset, a weight somebody set
 * by hand, and the program itself changing shape. A change of shape switches
 * the program in force from that moment (Q14: history keeps the version it
 * was trained on), so an old session is judged against the week that was in
 * force when it was logged, not today's.
 *
 * `programAt` turns a recorded change of shape into the program it describes:
 * a stored copy for programs saved in the new format, a conversion of the old
 * week for older history. The walk itself does not care which.
 */

import type { LoggedExercise, ReplayEvent } from "../types"
import type { ProgramSpec } from "../spec/types"
import { applySession } from "./progress"
import { START_CURSOR } from "./seed"
import type { EngineEnrollment } from "./prescribe"

export interface ReplayLog {
  entries: LoggedExercise[]
  logged_at: string
  dayId: string
  cycle: number
  week: number
}

export function replay<E extends EngineEnrollment>(
  initial: ProgramSpec,
  seed: E,
  logs: ReplayLog[],
  events: ReplayEvent[],
  opts: {
    programId: string
    programAt: (event: Extract<ReplayEvent, { kind: "schedule" }>) => ProgramSpec
    fallbackWorking?: Record<string, number>
  }
): E {
  const timeline: Array<{ at: string; kind: "log"; log: ReplayLog } | { at: string; kind: "event"; event: ReplayEvent }> = [
    ...logs.map((log) => ({ at: log.logged_at, kind: "log" as const, log })),
    ...events.map((event) => ({ at: event.at, kind: "event" as const, event })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  let state: E = { ...seed, cursor: { ...START_CURSOR } }
  let current = initial
  const run = (log: Omit<ReplayLog, "logged_at">) =>
    applySession(current, state, { enrollment_id: seed.id, ...log }, { programId: opts.programId, fallbackWorking: opts.fallbackWorking })
      .enrollment as E

  for (const step of timeline) {
    if (step.kind === "log") {
      state = run(step.log)
      continue
    }
    const event = step.event
    if (event.kind === "schedule") {
      current = opts.programAt(event)
      // THE CURSOR HAS TO LAND ON A DAY THAT EXISTS in the program now in force.
      const days = current.days.length
      state = {
        ...state,
        exerciseState: { ...event.seeded, ...state.exerciseState },
        cursor: { ...state.cursor, dayIndex: days === 0 ? 0 : Math.min(Math.max(state.cursor.dayIndex, 0), days - 1) },
      }
    } else if (event.kind === "skip") {
      // The same call the skip makes: no entries, so every lift holds and the cursor moves.
      state = run({ dayId: "", cycle: state.cursor.cycle, week: state.cursor.week, entries: [] })
    } else if (event.kind === "reset") {
      // Rewinds the plan and KEEPS the weights — exactly what the button does.
      state = { ...state, cursor: { ...START_CURSOR } }
    } else {
      // The lifter set the weight themselves: it survives, and the fail counter clears.
      const prev = state.exerciseState[event.exerciseId]
      if (prev) {
        state = {
          ...state,
          exerciseState: { ...state.exerciseState, [event.exerciseId]: { ...prev, workingWeight: event.to, consecutiveFails: 0 } },
        }
      }
    }
  }
  return state
}
