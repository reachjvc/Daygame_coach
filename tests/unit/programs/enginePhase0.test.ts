/**
 * The rules the engine was getting wrong, pinned.
 *
 * Every test here fails on the code as it was before 2026-09-07. They are
 * grouped by the complaint they answer rather than by the function they call,
 * because that is what makes a regression legible a year from now: "skipping is
 * not failing" is the thing that must stay true, `judgeLoadEntry` is only where
 * it currently lives.
 */

import { describe, test, expect } from "vitest"
import {
  applyLog,
  computePrescription,
  judgeLoadEntry,
  entriesFromSets,
  needsInput,
  pickTodaysDay,
  replayEnrollment,
  restSecondsFor,
  roundToLoadable,
  seedEnrollment,
} from "@/src/programs/programsService"
import { strongLifts5x5 } from "@/src/programs/data/strength/stronglifts5x5"
import { upperLower } from "@/src/programs/data/bodybuilding/upperLower"
import { recommendedRoutine } from "@/src/programs/data/calisthenics/recommendedRoutine"
import { splitsMobility } from "@/src/programs/data/flexibility/splitsMobility"
import { REST_SECONDS } from "@/src/programs/config"
import { isoWeekdayInTimezone } from "@/src/shared/dateUtils"
import type { LevelId, LoggedExercise, ProgramDefinition, ProgramEnrollment } from "@/src/programs/types"

function enroll(program: ProgramDefinition, level: LevelId = "beginner"): ProgramEnrollment {
  const { exerciseState, cursor } = seedEnrollment(program, level, "kg")
  return {
    id: "e1",
    user_id: "u1",
    program_id: program.id,
    level,
    unitSystem: "kg",
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-01-01T00:00:00.000Z",
    customSchedule: null,
  }
}

/** Log a session doing exactly what was asked. */
function asPrescribed(program: ProgramDefinition, enr: ProgramEnrollment) {
  const p = computePrescription(program, enr)
  return {
    enrollment_id: enr.id,
    dayId: p.dayId,
    cycle: p.cycle,
    week: p.week,
    entries: p.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => ({ setNumber: s.setNumber, reps: s.repRangeMax ?? s.reps, weight: s.weight })),
    })),
  }
}

// ============================================================================
// Skipping is not failing
// ============================================================================

describe("a lift you did not do", () => {
  test("holds its weight and does not count as a miss", () => {
    const enr = enroll(strongLifts5x5)
    const before = enr.exerciseState.squat.workingWeight
    // The squat is simply absent from the log — the machine was broken.
    const res = applyLog(strongLifts5x5, enr, {
      enrollment_id: enr.id,
      dayId: "A",
      cycle: 1,
      week: 1,
      entries: [{ exerciseId: "bench", sets: [] }],
    })
    expect(res.enrollment.exerciseState.squat.workingWeight).toBe(before)
    expect(res.enrollment.exerciseState.squat.consecutiveFails ?? 0).toBe(0)
    expect(res.changes.find((c) => c.exerciseId === "squat")!.kind).toBe("hold")
  })

  test("three skips in a row still do not deload it", () => {
    // THE BUG. `deloadAfterFails` is 3, and an absent lift counted as a failure,
    // so three sessions where the leg press was out of order took ten per cent
    // off a weight that had never been attempted.
    let enr = enroll(strongLifts5x5)
    const before = enr.exerciseState.squat.workingWeight
    for (let i = 0; i < 3; i++) {
      enr = applyLog(strongLifts5x5, enr, {
        enrollment_id: enr.id,
        dayId: "A",
        cycle: 1,
        week: 1,
        entries: [],
      }).enrollment
    }
    expect(enr.exerciseState.squat.workingWeight).toBe(before)
  })

  test("a lift marked skipped is held, not failed, even inside a full session", () => {
    const enr = enroll(strongLifts5x5)
    const before = enr.exerciseState.bench.workingWeight
    const log = asPrescribed(strongLifts5x5, enr)
    const res = applyLog(strongLifts5x5, enr, {
      ...log,
      entries: log.entries.map((e): LoggedExercise =>
        e.exerciseId === "bench" ? { ...e, sets: [], skipped: true } : e
      ),
    })
    expect(res.enrollment.exerciseState.bench.workingWeight).toBe(before)
    expect(res.enrollment.exerciseState.bench.consecutiveFails ?? 0).toBe(0)
    // …while the rest of the session progressed as normal.
    expect(res.changes.find((c) => c.exerciseId === "squat")!.kind).toBe("advance")
  })
})

// ============================================================================
// The weight you actually lifted
// ============================================================================

/** A logged exercise from `[weight, reps]` pairs. Shared by the judging tests. */
const sets = (pairs: [number, number][]) => ({
  exerciseId: "x",
  sets: pairs.map(([weight, reps], i) => ({ setNumber: i + 1, reps, weight })),
})

describe("what the weight on the bar counts for", () => {
  const prescribed = { sets: 5, reps: 5, weight: 80 }

  test("all five at the weight asked for is an advance from that weight", () => {
    const j = judgeLoadEntry(prescribed, sets([[80, 5], [80, 5], [80, 5], [80, 5], [80, 5]]))
    expect(j.verdict).toBe("advance")
    expect(j.achieved).toBe(80)
  })

  test("four at 80 and one heavy single is a session at 80, not at 85", () => {
    // Ratcheting off the heaviest SET would prescribe 87.5 next time after one
    // heavy single on the end. The program's answer is 82.5.
    const j = judgeLoadEntry(prescribed, sets([[80, 5], [80, 5], [80, 5], [80, 5], [85, 5]]))
    expect(j.verdict).toBe("advance")
    expect(j.achieved).toBe(80)
  })

  test("all five heavier than asked ratchets from what was actually done", () => {
    const j = judgeLoadEntry(prescribed, sets([[85, 5], [85, 5], [85, 5], [85, 5], [85, 5]]))
    expect(j.verdict).toBe("advance")
    expect(j.achieved).toBe(85)
  })

  test("every rep at a lighter weight holds — it is a decision, not a miss", () => {
    const j = judgeLoadEntry(prescribed, sets([[60, 5], [60, 5], [60, 5], [60, 5], [60, 5]]))
    expect(j.verdict).toBe("hold_lighter")
    expect(j.achieved).toBe(60)
  })

  test("missing reps at the weight asked for is the only failure", () => {
    const j = judgeLoadEntry(prescribed, sets([[80, 5], [80, 5], [80, 4], [80, 3], [80, 2]]))
    expect(j.verdict).toBe("fail")
  })

  test("three lighter-but-complete sessions never deload the prescribed weight", () => {
    // Somebody easing back after a cold. The old rule scored each as a failure
    // and took ten per cent off a weight they had not touched.
    let enr = enroll(strongLifts5x5)
    const start = enr.exerciseState.squat.workingWeight!
    for (let i = 0; i < 3; i++) {
      const p = computePrescription(strongLifts5x5, enr)
      const squat = p.exercises.find((e) => e.exerciseId === "squat")!
      enr = applyLog(strongLifts5x5, enr, {
        enrollment_id: enr.id,
        dayId: p.dayId,
        cycle: p.cycle,
        week: p.week,
        entries: [
          {
            exerciseId: "squat",
            sets: squat.sets.map((s) => ({ setNumber: s.setNumber, reps: s.reps, weight: start - 20 })),
          },
        ],
      }).enrollment
    }
    expect(enr.exerciseState.squat.workingWeight).toBe(start)
    expect(enr.exerciseState.squat.consecutiveFails ?? 0).toBe(0)
  })
})

// ============================================================================
// The plates your gym actually has
// ============================================================================

describe("a gym with no small plates", () => {
  const coarse = { barWeight: 20, smallestPlate: 2.5 } // 5 kg steps

  test("prescribes only weights that can be loaded, never more than intended", () => {
    // "down" is what a prescription uses: asking for more than the program
    // intended is how a 2.5 kg increment turns into a 5 kg one.
    expect(roundToLoadable(62.5, "kg", "barbell", coarse, "down")).toBe(60)
    expect(roundToLoadable(64.9, "kg", "barbell", coarse, "down")).toBe(60)
    expect(roundToLoadable(65, "kg", "barbell", coarse, "down")).toBe(65)
  })

  test("a 2.5 kg program adds a whole step every SECOND session, not every one", () => {
    /**
     * THE TRAP, IN BOTH DIRECTIONS. The increment is finer than the plates. If
     * the next weight rounds to the nearest loadable one, the bench climbs 5 kg
     * a session — twice the program's rate. If it rounds down, it sits on 20
     * for ever while the summary claims "+2.5 kg" every time.
     *
     * Keeping the intent exact and flooring only what is ASKED FOR gives what a
     * person with those plates actually does: same weight twice, then up a step.
     */
    // The squat, because it is on both of StrongLifts' alternating days and so
    // is prescribed again on the very next session.
    const enr: ProgramEnrollment = { ...enroll(strongLifts5x5), plates: coarse }
    const asked = (e: ProgramEnrollment) =>
      computePrescription(strongLifts5x5, e).exercises.find((x) => x.exerciseId === "squat")!.sets[0]
        .weight
    const start = asked(enr)

    const first = applyLog(strongLifts5x5, enr, asPrescribed(strongLifts5x5, enr))
    expect(asked(first.enrollment)).toBe(start)
    expect(first.changes.find((c) => c.exerciseId === "squat")!.reason).toContain("plates cannot make")

    const second = applyLog(strongLifts5x5, first.enrollment, asPrescribed(strongLifts5x5, first.enrollment))
    expect(asked(second.enrollment)).toBe(start + 5)
  })

  test("a lighter bar can be prescribed, and is not rounded up to an Olympic one", () => {
    const womensBar = { barWeight: 15, smallestPlate: 1.25 }
    expect(roundToLoadable(15, "kg", "barbell", womensBar)).toBe(15)
    expect(roundToLoadable(17.5, "kg", "barbell", womensBar)).toBe(17.5)
    // The old rule floored everything at 20, so a 15 kg press was impossible.
    expect(roundToLoadable(15, "kg", "barbell")).toBe(20)
  })
})

// ============================================================================
// Rest, decided by the lift
// ============================================================================

describe("how long to rest", () => {
  test("a heavy compound gets the long rest and a curl does not", () => {
    // It used to be picked by SET COUNT — four or more meant "compound" — so a
    // 3×5 squat got ninety seconds and 4×12 curls got three minutes.
    expect(restSecondsFor({ name: "Squat" }).seconds).toBe(REST_SECONDS.compound)
    expect(restSecondsFor({ name: "Lateral Raise" }).seconds).toBe(REST_SECONDS.accessory)
  })

  test("our number says it is ours; the author's says it is theirs", () => {
    expect(restSecondsFor({ name: "Squat" }).ours).toBe(true)
    expect(restSecondsFor({ name: "Squat", restSec: 240 })).toEqual({ seconds: 240, ours: false })
  })

  test("a warm-up does not start a three-minute clock", () => {
    expect(restSecondsFor({ name: "Squat" }, { warmup: true }).seconds).toBe(REST_SECONDS.warmup)
  })
})

// ============================================================================
// Whose today
// ============================================================================

describe("which day it is", () => {
  test("is read where the person is, not where the server is", () => {
    // One instant, two calendars: 23:30 Sunday in Los Angeles is already
    // Monday in Berlin. The server ran on UTC and answered for everybody.
    const instant = new Date("2026-09-07T06:30:00.000Z") // Monday morning UTC
    expect(isoWeekdayInTimezone("America/Los_Angeles", instant)).toBe(7) // still Sunday
    expect(isoWeekdayInTimezone("Europe/Berlin", instant)).toBe(1) // Monday
  })

  test("an unanchored program has no weekday to pick, and says so", () => {
    // StrongLifts is A/B/A whenever you get to the gym; its author never said
    // which days, and inventing them would be a rule the source does not have.
    expect(pickTodaysDay(strongLifts5x5.schedule, 1)).toBeNull()
  })

  test("an anchored week picks today, and names a rest day as one", () => {
    const anchored = {
      ...upperLower.schedule,
      days: (upperLower.schedule as { days: { id: string }[] }).days.map((d, i) => ({
        ...d,
        weekday: i === 0 ? 1 : 3, // Upper Monday, Lower Wednesday
      })),
    } as typeof upperLower.schedule

    const monday = pickTodaysDay(anchored, 1)!
    expect(monday.dayIndex).toBe(0)
    expect(monday.restDay).toBe(false)

    // Tuesday trains nothing. The next session is still resolved so the screen
    // can say what is coming, but it must not be served as today's work.
    const tuesday = pickTodaysDay(anchored, 2)!
    expect(tuesday.restDay).toBe(true)
    expect(tuesday.dayIndex).toBe(1)
    expect(tuesday.scheduledWeekday).toBe(3)
  })
})

// ============================================================================
// Calisthenics and mobility progress the day you did
// ============================================================================

describe("the other two engines", () => {
  test("calisthenics advances from the day that was logged", () => {
    // The fix made for lifting in August was never made here: both engines read
    // the CURSOR's day, so logging one session progressed another.
    const enr = enroll(recommendedRoutine)
    const res = applyLog(recommendedRoutine, enr, {
      enrollment_id: enr.id,
      dayId: "fullbody",
      cycle: 1,
      week: 1,
      entries: [],
    })
    expect(res.enrollment.cursor.sessionCount).toBe(1)
  })

  test("a mobility session logged by day id does not throw", () => {
    const enr = enroll(splitsMobility)
    const p = computePrescription(splitsMobility, enr)
    expect(() =>
      applyLog(splitsMobility, enr, {
        enrollment_id: enr.id,
        dayId: p.dayId,
        cycle: 1,
        week: 1,
        entries: [],
      })
    ).not.toThrow()
  })
})

// ============================================================================
// A rep range has no single right answer
// ============================================================================

describe("a lift with a rep range", () => {
  test("cannot be logged closed", () => {
    // "6–8" was seeded as 6, so the one-tap save recorded the bottom of every
    // range — and adding weight needs the TOP on every set. On the programs
    // built out of rep ranges the weight could never move.
    const enr = enroll(upperLower, "intermediate")
    const p = computePrescription(upperLower, enr)
    const bench = p.exercises.find((e) => e.exerciseId === "ul_bench")!
    expect(bench.sets[0].repRangeMax).toBeGreaterThan(bench.sets[0].reps)
    expect(needsInput(bench)).toBe(true)
  })
})

// ============================================================================
// Replay remembers what was not a workout
// ============================================================================

describe("rebuilding the weights", () => {
  const seed = () => enroll(strongLifts5x5)
  const session = (at: string, dayId: string, reps: number, weight: number) => ({
    logged_at: at,
    dayId,
    cycle: 1,
    week: 1,
    entries: [
      { exerciseId: "squat", sets: Array.from({ length: 5 }, (_, i) => ({ setNumber: i + 1, reps, weight })) },
    ],
  })

  test("starts from what the person typed, never from the catalogue", () => {
    // Somebody who entered their real 100 kg squat and then deleted a session
    // had it silently replaced by the catalogue's beginner 60.
    const typed = seed()
    typed.exerciseState = { ...typed.exerciseState, squat: { workingWeight: 100, consecutiveFails: 0 } }
    const replayed = replayEnrollment(strongLifts5x5, typed, [])
    expect(replayed.exerciseState.squat.workingWeight).toBe(100)
  })

  test("a skip in the middle is not re-prescribed as a session", () => {
    const start = seed()
    const withSkip = replayEnrollment(
      strongLifts5x5,
      start,
      [session("2026-01-01T10:00:00.000Z", "A", 5, start.exerciseState.squat.workingWeight!)],
      [{ at: "2026-01-02T10:00:00.000Z", kind: "skip" }]
    )
    const withoutSkip = replayEnrollment(strongLifts5x5, start, [
      session("2026-01-01T10:00:00.000Z", "A", 5, start.exerciseState.squat.workingWeight!),
    ])
    // The skip advanced the plan and moved no weight, so it shows in the count
    // and not in the numbers.
    expect(withSkip.cursor.sessionCount).toBe(withoutSkip.cursor.sessionCount + 1)
    expect(withSkip.exerciseState.squat.workingWeight).toBe(withoutSkip.exerciseState.squat.workingWeight)
  })

  test("a reset rewinds the plan and keeps the weights, as the button does", () => {
    const start = seed()
    const w = start.exerciseState.squat.workingWeight!
    const replayed = replayEnrollment(
      strongLifts5x5,
      start,
      [session("2026-01-01T10:00:00.000Z", "A", 5, w)],
      [{ at: "2026-01-03T10:00:00.000Z", kind: "reset", cursor: true, weights: false }]
    )
    expect(replayed.cursor).toEqual({ cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 })
    expect(replayed.exerciseState.squat.workingWeight).toBeGreaterThan(w)
  })

  test("a weight set by hand survives a later correction", () => {
    const start = seed()
    const replayed = replayEnrollment(
      strongLifts5x5,
      start,
      [session("2026-01-01T10:00:00.000Z", "A", 5, start.exerciseState.squat.workingWeight!)],
      [{ at: "2026-01-05T10:00:00.000Z", kind: "weight", exerciseId: "squat", to: 42.5 }]
    )
    expect(replayed.exerciseState.squat.workingWeight).toBe(42.5)
    expect(replayed.exerciseState.squat.consecutiveFails).toBe(0)
  })
})

/**
 * WHAT FELL SHORT, NAMED.
 *
 * The summary answered every incomplete session with "Missed reps (1/3)". Two
 * separate lies in one line: somebody who did one clean set of five and then
 * had to leave missed no reps at all, and "(1/3)" — meant as the first of three
 * misses before a deload — reads as one rep out of three.
 */
describe("what fell short", () => {
  const prescribed = { sets: 5, reps: 5, weight: 80 }

  test("calls a short session short on SETS when every set made its reps", () => {
    const j = judgeLoadEntry(prescribed, sets([[80, 5]]))
    expect(j.verdict).toBe("fail")
    expect(j.shortfall).toBe("sets")
    expect(j.setsDone).toBe(1)
  })

  test("calls it short on REPS when all five sets were done and some fell short", () => {
    const j = judgeLoadEntry(prescribed, sets([[80, 5], [80, 5], [80, 5], [80, 3], [80, 2]]))
    expect(j.verdict).toBe("fail")
    expect(j.shortfall).toBe("reps")
    expect(j.setsDone).toBe(5)
  })

  test("says both when the sets ran out AND the reps were missed", () => {
    const j = judgeLoadEntry(prescribed, sets([[80, 5], [80, 2]]))
    expect(j.verdict).toBe("fail")
    expect(j.shortfall).toBe("both")
  })

  test("reports nothing short when the session was completed", () => {
    const j = judgeLoadEntry(prescribed, sets([[80, 5], [80, 5], [80, 5], [80, 5], [80, 5]]))
    expect(j.verdict).toBe("advance")
    expect(j.shortfall).toBeUndefined()
  })
})

/**
 * "DON'T COUNT IT" ON A LIFT THAT WAS PARTLY DONE.
 *
 * The finish sheet offers this exactly when a lift was started and cut short,
 * and it did nothing: the mark was only applied to a lift with NO sets at all.
 * Two of three squat sets, tapped "Don't count it", and the engine still scored
 * a miss and stepped towards a deload off a weight that was never failed.
 */
describe("a lift the person said not to count", () => {
  const stored = (reps: number, setNumber: number) => ({
    exercise: "Squat",
    exercise_id: "squat",
    weight_kg: 100,
    reps,
    set_number: setNumber,
    set_kind: "working" as const,
    side: null,
  })

  test("is marked skipped even though its sets were logged", () => {
    const entries = entriesFromSets([stored(5, 1), stored(5, 2)], { skipped: ["squat"] }, "kg")
    const squat = entries.find((e) => e.exerciseId === "squat")
    expect(squat?.skipped).toBe(true)
  })

  test("keeps the sets, because they were done and they count everywhere else", () => {
    const entries = entriesFromSets([stored(5, 1), stored(5, 2)], { skipped: ["squat"] }, "kg")
    expect(entries.find((e) => e.exerciseId === "squat")?.sets).toHaveLength(2)
  })

  test("is not marked skipped when nothing said to skip it", () => {
    const entries = entriesFromSets([stored(5, 1), stored(5, 2)], {}, "kg")
    expect(entries.find((e) => e.exerciseId === "squat")?.skipped).toBeUndefined()
  })

  test("a lift stopped short counts the same way", () => {
    const entries = entriesFromSets([stored(5, 1)], { incomplete: ["squat"] }, "kg")
    expect(entries.find((e) => e.exerciseId === "squat")?.skipped).toBe(true)
  })
})
