/**
 * A PROGRAM STARTED IN THE WRONG UNIT WAS IN IT FOR LIFE.
 *
 * `unitFor` asks the ENROLMENT first and the account second, deliberately:
 * without that, ending your last program silently converted History and
 * Progress to kilograms. The cost was a dead end nobody could get out of. The
 * account toggle in Settings said "Saved." and every training screen stayed in
 * the old unit — measured on 2026-09-27, switching to Pounds and re-walking
 * History, Progress, the receipt and the Today card: all still kg — and the
 * program's own options sheet had no unit control at all. The only way to train
 * in pounds was to end the program and lose the weights it had worked up to.
 *
 * WHY THREE COLUMNS AND NOT ONE. A running enrolment holds its weights in its
 * own unit in three places: `exercise_state` (what it says today),
 * `initial_exercise_state` (the seed every replay folds history over) and the
 * `weight` / `schedule` replay events (the manual changes folded on top).
 * Converting only the live state looks right until the next correction, which
 * replays from the seed and puts the old unit's numbers back wearing the new
 * unit's label. Logged sets need no conversion at all: `workout_sets.weight_kg`
 * is kilograms whatever the enrolment says.
 *
 * THE DOUBLE-TAP IS THE ONE THAT WOULD HURT. Two tabs, or a retry on gym wifi,
 * and 100 kg becomes 220 lb becomes 485 lb on a program whose rule is +5 lb a
 * session. The UPDATE is guarded on the unit it is moving FROM, so the second
 * write matches no row.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row, type RpcCall } from "../../helpers/fakeSupabase"
import { changeEnrollmentUnit } from "@/src/db/programRepo"
import { convertExerciseState, convertReplayEvents } from "@/src/programs/customize"
import { requireProgram } from "@/src/programs/data/catalog"
import { ProgramRefused } from "@/src/programs/errors"
import type { ReplayEvent } from "@/src/programs/types"

const tables: Record<string, Row[]> = { program_enrollments: [], workout_logs: [] }
const calls: RpcCall[] = []
const fake = createFakeSupabase(tables, { calls, rpcResult: () => ({ data: null, error: null }) })

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: vi.fn(async () => fake),
  createAdminSupabaseClient: vi.fn(() => fake),
}))

const USER = "user-1"
const ENROLLMENT = "enr-1"
const SCHEDULE = requireProgram("stronglifts-5x5").schedule
/** Default pounds plates: a 45 lb bar and 2.5 lb plates, so a 5 lb step. */
const LB_PLATES = { barWeight: 45, smallestPlate: 2.5 }

const SEED = { squat: { workingWeight: 60 }, deadlift: { workingWeight: 70 } }

function enrollmentRow(over: Partial<Row> = {}): Row {
  return {
    id: ENROLLMENT,
    user_id: USER,
    program_id: "stronglifts-5x5",
    level: "intermediate",
    unit_system: "kg",
    exercise_state: { squat: { workingWeight: 62.5, consecutiveFails: 1 }, deadlift: { workingWeight: 70 } },
    initial_exercise_state: SEED,
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 3 },
    is_active: true,
    started_at: "2026-01-01T00:00:00.000Z",
    custom_schedule: null,
    replay_events: [],
    bar_weight_kg: null,
    label: null,
    ...over,
  }
}

beforeEach(() => {
  tables.program_enrollments = [enrollmentRow()]
  tables.workout_logs = []
  calls.length = 0
})

describe("converting one enrolment's state", () => {
  it("lands on weights the new unit's bar can actually hold", () => {
    const out = convertExerciseState(
      { squat: { workingWeight: 62.5 }, deadlift: { workingWeight: 70 } },
      "kg",
      "lb",
      SCHEDULE,
      LB_PLATES
    )
    // 62.5 kg is 137.79 lb, which is not loadable; 70 kg is 154.32 lb.
    expect(out.squat.workingWeight).toBe(140)
    expect(out.deadlift.workingWeight).toBe(155)
  })

  it("leaves everything that is not a weight exactly alone", () => {
    /**
     * `currentHoldSec` is SECONDS and `consecutiveFails` is a count. A blanket
     * "convert every number on the way past" would turn a 30-second plank into
     * a 66-second one and invent two failed sessions out of a rounding rule.
     */
    const out = convertExerciseState(
      { squat: { workingWeight: 62.5, consecutiveFails: 1, stalled: true }, plank: { currentHoldSec: 30 } },
      "kg",
      "lb",
      SCHEDULE,
      LB_PLATES
    )
    expect(out.squat).toMatchObject({ consecutiveFails: 1, stalled: true })
    expect(out.plank.currentHoldSec).toBe(30)
  })

  it("keeps a lift the schedule no longer contains, converted but not snapped to the bar", () => {
    // No exercise to ask for a load style. Defaulting to barbell would floor a
    // 6 kg lateral raise at 45 lb — the fault `loadStyleOf` exists to prevent.
    const out = convertExerciseState({ raise: { workingWeight: 6 } }, "kg", "lb", SCHEDULE, LB_PLATES)
    expect(out.raise.workingWeight).toBe(13.23)
  })

  it("is a no-op, by identity, when the unit is not changing", () => {
    const state = { squat: { workingWeight: 62.5 } }
    expect(convertExerciseState(state, "kg", "kg", SCHEDULE)).toBe(state)
  })
})

describe("converting the replay history", () => {
  it("converts a weight somebody set by hand, and leaves skips and resets alone", () => {
    const events: ReplayEvent[] = [
      { at: "2026-01-02T00:00:00.000Z", kind: "skip" },
      { at: "2026-01-03T00:00:00.000Z", kind: "weight", exerciseId: "squat", to: 62.5 },
      { at: "2026-01-04T00:00:00.000Z", kind: "reset", cursor: true, weights: false },
    ]
    const out = convertReplayEvents(events, "kg", "lb", SCHEDULE, SCHEDULE, LB_PLATES)
    expect(out[0]).toEqual(events[0])
    expect(out[1]).toMatchObject({ kind: "weight", exerciseId: "squat", to: 140 })
    expect(out[2]).toEqual(events[2])
  })

  it("converts the lifts a schedule edit seeded, using that edit's own week", () => {
    const events: ReplayEvent[] = [
      {
        at: "2026-01-05T00:00:00.000Z",
        kind: "schedule",
        schedule: null,
        seeded: { squat: { workingWeight: 60, consecutiveFails: 0 } },
      },
    ]
    const out = convertReplayEvents(events, "kg", "lb", SCHEDULE, SCHEDULE, LB_PLATES)
    expect(out[0]).toMatchObject({ seeded: { squat: { workingWeight: 130, consecutiveFails: 0 } } })
  })
})

describe("moving a running program between units", () => {
  it("writes the live state, the seed and the history together", async () => {
    tables.program_enrollments = [
      enrollmentRow({
        replay_events: [{ at: "2026-01-03T00:00:00.000Z", kind: "weight", exerciseId: "squat", to: 62.5 }],
      }),
    ]

    const { changed, enrollment } = await changeEnrollmentUnit(USER, ENROLLMENT, "lb")

    expect(changed).toBe(true)
    expect(enrollment.unitSystem).toBe("lb")
    const row = tables.program_enrollments[0]
    expect(row.unit_system).toBe("lb")
    expect(row.exercise_state).toMatchObject({ squat: { workingWeight: 140 } })
    // THE SEED. Left in kilograms, the next correction replays from it and
    // reads 60 as sixty POUNDS, undoing the switch without a word.
    expect(row.initial_exercise_state).toMatchObject({ squat: { workingWeight: 130 } })
    expect((row.replay_events as ReplayEvent[])[0]).toMatchObject({ to: 140 })
  })

  it("does not touch a single logged set, because those are stored in kilograms", async () => {
    await changeEnrollmentUnit(USER, ENROLLMENT, "lb")
    // The repo reached for no other table on the way.
    expect(tables.workout_logs).toEqual([])
    expect(calls).toEqual([])
  })

  it("converts once when two requests arrive together and BOTH read kilograms", async () => {
    /**
     * CONCURRENT, NOT SEQUENTIAL. Written as two awaited calls this test
     * passed with `.eq("unit_system", from)` deleted — the second call re-read
     * the row, saw "lb" and returned early, so it never reached the UPDATE the
     * guard is on. It asserted the early return and called it the guard.
     *
     * Run together, both reads land before either write, which is the real
     * shape of a double-tap or a retry over gym wifi. Exactly one write may
     * take effect; without the guard the second converts the FIRST one's
     * output and 62.5 kg arrives at 310 lb on a program that adds 5 lb a
     * session.
     */
    const [a, b] = await Promise.all([
      changeEnrollmentUnit(USER, ENROLLMENT, "lb"),
      changeEnrollmentUnit(USER, ENROLLMENT, "lb"),
    ])

    expect([a.changed, b.changed].filter(Boolean)).toHaveLength(1)
    expect(tables.program_enrollments[0].exercise_state).toMatchObject({
      squat: { workingWeight: 140 },
    })
  })

  it("is refused mid-workout, so one session cannot be half in each unit", async () => {
    tables.workout_logs = [
      {
        id: "log-open",
        user_id: USER,
        enrollment_id: ENROLLMENT,
        started_at: "2026-01-04T09:00:00.000Z",
        ended_at: null,
      },
    ]

    await expect(changeEnrollmentUnit(USER, ENROLLMENT, "lb")).rejects.toBeInstanceOf(ProgramRefused)
    expect(tables.program_enrollments[0].unit_system).toBe("kg")
  })

  it("leaves a seed it never had alone rather than inventing one to convert", async () => {
    /**
     * Programs started before 2026-09-07 kept no seed. `replayedState` already
     * refuses to recalculate those, with a sentence of its own; making one up
     * here to have something to convert would be the silent fallback.
     */
    tables.program_enrollments = [enrollmentRow({ initial_exercise_state: null })]

    const { changed } = await changeEnrollmentUnit(USER, ENROLLMENT, "lb")
    expect(changed).toBe(true)
    expect(tables.program_enrollments[0].initial_exercise_state).toBeNull()
  })
})
