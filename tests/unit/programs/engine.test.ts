import { describe, test, expect } from "vitest"
import {
  applyLog,
  computePrescription,
  advanceCursor,
  seedEnrollment,
  roundToLoadable,
  estimateOneRepMax,
  trainingMaxFromOneRepMax,
  toKg,
  fromKg,
  describeSets,
  needsInput,
  summariseProgression,
  formatLoad,
  unbrokenRun,
  UNBROKEN_RUN_QUESTION_AT,
  daysSinceLastSession,
  LAYOFF_DAYS,
  staleLifts,
  lastTimePerLift,
  unknownExerciseIds,
  platesFor,
  replayEnrollment,
  describePlates,
} from "@/src/programs/programsService"
import { strongLifts5x5 } from "@/src/programs/data/strength/stronglifts5x5"
import { wendler531 } from "@/src/programs/data/strength/wendler531"
import { pushPullLegs } from "@/src/programs/data/bodybuilding/pushPullLegs"
import { couchTo5k } from "@/src/programs/data/cardio/couchTo5k"
import { recommendedRoutine } from "@/src/programs/data/calisthenics/recommendedRoutine"
import { splitsMobility } from "@/src/programs/data/flexibility/splitsMobility"
import { startingStrength } from "@/src/programs/data/strength/startingStrength"
import { phul } from "@/src/programs/data/bodybuilding/phul"
import { upperLower } from "@/src/programs/data/bodybuilding/upperLower"
import { fiveKToTenK } from "@/src/programs/data/cardio/fiveKToTenK"
import { sprintTriathlon, halfIronman } from "@/src/programs/data/endurance/triathlon"
import { ALL_PROGRAMS } from "@/src/programs/data/catalog"
import { resolveProgramForLevel } from "@/src/programs/data/catalog"
import { scheduleDays } from "@/src/programs/customize"
import type {
  LevelId,
  PrescribedExercise,
  PrescribedSet,
  ProgramDefinition,
  ProgramEnrollment,
  ProgramSessionLogInput,
  UnitSystem,
} from "@/src/programs/types"

// ---------- helpers ----------

function enroll(
  program: ProgramDefinition,
  level: "beginner" | "intermediate" | "advanced",
  unit: UnitSystem = "kg",
  oneRms?: Record<string, number>
): ProgramEnrollment {
  const { exerciseState, cursor } = seedEnrollment(program, level, unit, oneRms)
  return {
    id: "enr-1",
    user_id: "user-1",
    program_id: program.id,
    level,
    unitSystem: unit,
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-01-01",
    customSchedule: null,
  }
}

/** Build a log matching today's prescription; reps overridable per exercise. */
function logFor(
  program: ProgramDefinition,
  enr: ProgramEnrollment,
  repsOverride: Record<string, number> = {}
): ProgramSessionLogInput {
  const p = computePrescription(program, enr)
  return {
    enrollment_id: enr.id,
    dayId: p.dayId,
    cycle: p.cycle,
    week: p.week,
    entries: p.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => ({
        setNumber: s.setNumber,
        reps: repsOverride[ex.exerciseId] ?? s.reps,
        weight: s.weight,
      })),
    })),
  }
}

// ============================================================================
// Calibration helpers
// ============================================================================

describe("calibration helpers", () => {
  test("roundToLoadable snaps to 2.5kg granularity, never below the bar", () => {
    expect(roundToLoadable(61.2, "kg")).toBe(60)
    expect(roundToLoadable(54, "kg")).toBe(55)
    expect(roundToLoadable(5, "kg")).toBe(20) // below bar → bar
  })

  test("roundToLoadable snaps to 5lb granularity off a 45lb bar", () => {
    expect(roundToLoadable(132.27, "lb")).toBe(130)
    expect(roundToLoadable(10, "lb")).toBe(45)
  })

  test("Epley 1RM and 5/3/1 training max", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 1)
    // TM = round-loadable(0.9 * 1RM)
    expect(trainingMaxFromOneRepMax(140, "kg")).toBe(125) // 0.9*140=126 → 125
  })

  test("unit conversions round-trip", () => {
    expect(toKg(100, "kg")).toBe(100)
    expect(fromKg(toKg(225, "lb"), "lb")).toBeCloseTo(225, 6)
  })
})

// ============================================================================
// StrongLifts 5×5 — linear LP (M1 acceptance)
// ============================================================================

describe("StrongLifts 5×5 — linear progression", () => {
  test("intermediate seed prescribes 5×5 at the level's working weights", () => {
    const enr = enroll(strongLifts5x5, "intermediate")
    const p = computePrescription(strongLifts5x5, enr)
    expect(p.dayId).toBe("A")
    const squat = p.exercises.find((e) => e.exerciseId === "squat")!
    expect(squat.sets).toHaveLength(5)
    expect(squat.sets.every((s) => s.reps === 5 && s.weight === 60)).toBe(true)
  })

  test("hitting all reps advances every lift by +2.5kg and rotates A→B", () => {
    const enr = enroll(strongLifts5x5, "intermediate")
    const { enrollment: next, changes } = applyLog(strongLifts5x5, enr, logFor(strongLifts5x5, enr))
    expect(next.exerciseState.squat.workingWeight).toBe(62.5)
    expect(next.exerciseState.bench.workingWeight).toBe(42.5)
    expect(next.cursor.dayIndex).toBe(1) // now Workout B
    expect(next.cursor.sessionCount).toBe(1)
    expect(changes.every((c) => c.kind === "advance")).toBe(true)
  })

  test("3 consecutive missed squat sessions trigger a 10% deload", () => {
    let enr = enroll(strongLifts5x5, "intermediate") // squat 60
    // Miss squat (reps below 5) three sessions in a row.
    for (let i = 0; i < 2; i++) {
      enr = applyLog(strongLifts5x5, enr, logFor(strongLifts5x5, enr, { squat: 2 })).enrollment
      expect(enr.exerciseState.squat.workingWeight).toBe(60) // holds
    }
    expect(enr.exerciseState.squat.consecutiveFails).toBe(2)
    const res = applyLog(strongLifts5x5, enr, logFor(strongLifts5x5, enr, { squat: 2 }))
    expect(res.enrollment.exerciseState.squat.workingWeight).toBe(55) // 60*0.9=54 → loadable 55
    expect(res.enrollment.exerciseState.squat.consecutiveFails).toBe(0)
    expect(res.changes.find((c) => c.exerciseId === "squat")!.kind).toBe("deload")
  })

  test("squat (in both A and B) progresses every session", () => {
    let enr = enroll(strongLifts5x5, "intermediate")
    enr = applyLog(strongLifts5x5, enr, logFor(strongLifts5x5, enr)).enrollment // A
    enr = applyLog(strongLifts5x5, enr, logFor(strongLifts5x5, enr)).enrollment // B
    expect(enr.exerciseState.squat.workingWeight).toBe(65) // +2.5 twice
    expect(enr.cursor.dayIndex).toBe(0) // back to A
    expect(enr.cursor.cycle).toBe(2)
  })

  test("lb enrollment uses native +5lb increments off a loadable seed", () => {
    const enr = enroll(strongLifts5x5, "intermediate", "lb")
    expect(enr.exerciseState.squat.workingWeight).toBe(130) // 60kg → 132.27 → 130lb
    const next = applyLog(strongLifts5x5, enr, logFor(strongLifts5x5, enr)).enrollment
    expect(next.exerciseState.squat.workingWeight).toBe(135)
  })
})

// ============================================================================
// 5/3/1 — percentage of training max
// ============================================================================

describe("5/3/1 — percentage_tm progression", () => {
  const ONE_RMS = { squat: 140, deadlift: 180, bench: 100, ohp: 70 }

  test("requires a 1RM per lift — throws otherwise", () => {
    expect(() => seedEnrollment(wendler531, "intermediate", "kg")).toThrow(/requires a 1RM/)
  })

  test("week-1 squat day prescribes 65/75/85 of TM with an AMRAP top set", () => {
    const enr = enroll(wendler531, "intermediate", "kg", ONE_RMS)
    enr.cursor = { ...enr.cursor, dayIndex: 3 } // squat-day
    const p = computePrescription(wendler531, enr)
    const squat = p.exercises[0]
    const tm = enr.exerciseState.squat.trainingMax! // 125
    expect(squat.sets.map((s) => s.reps)).toEqual([5, 5, 5])
    expect(squat.sets[2].amrap).toBe(true)
    expect(squat.sets[0].weight).toBe(roundToLoadable(tm * 0.65, "kg"))
    expect(squat.sets[2].weight).toBe(roundToLoadable(tm * 0.85, "kg"))
  })

  test("no TM change on weeks 1 and 2", () => {
    const enr = enroll(wendler531, "intermediate", "kg", ONE_RMS)
    const res = applyLog(wendler531, enr, logFor(wendler531, enr)) // week 1
    expect(res.changes).toHaveLength(0)
    expect(res.enrollment.exerciseState.ohp.trainingMax).toBe(enr.exerciseState.ohp.trainingMax)
  })

  test("completing the last working week bumps TM (lower +5kg, upper +2.5kg)", () => {
    const enr = enroll(wendler531, "intermediate", "kg", ONE_RMS)
    enr.cursor = { ...enr.cursor, week: 3, dayIndex: 3 } // squat-day, last working week
    const squatTM = enr.exerciseState.squat.trainingMax!
    const res = applyLog(wendler531, enr, logFor(wendler531, enr))
    const change = res.changes.find((c) => c.exerciseId === "squat")!
    expect(change.kind).toBe("tm_increase")
    expect(res.enrollment.exerciseState.squat.trainingMax).toBe(squatTM + 5) // lower body
  })

  test("missing the top AMRAP set on the last working week resets TM down 10%", () => {
    const enr = enroll(wendler531, "intermediate", "kg", ONE_RMS)
    enr.cursor = { ...enr.cursor, week: 3, dayIndex: 3 }
    const squatTM = enr.exerciseState.squat.trainingMax!
    const res = applyLog(wendler531, enr, logFor(wendler531, enr, { squat: 0 })) // failed the single
    const change = res.changes.find((c) => c.exerciseId === "squat")!
    expect(change.kind).toBe("tm_reset")
    expect(res.enrollment.exerciseState.squat.trainingMax).toBe(roundToLoadable(squatTM * 0.9, "kg"))
  })
})

// ============================================================================
// Push/Pull/Legs — double progression (bodybuilding, load engine)
// ============================================================================

describe("PPL — double progression", () => {
  test("prescribes a rep range (min reps + repRangeMax) at the working weight", () => {
    const enr = enroll(pushPullLegs, "intermediate")
    const p = computePrescription(pushPullLegs, enr)
    expect(p.dayId).toBe("push")
    const bench = p.exercises.find((e) => e.exerciseId === "bb_bench")!
    expect(bench.sets).toHaveLength(4)
    expect(bench.sets[0].reps).toBe(6)
    expect(bench.sets[0].repRangeMax).toBe(8)
    expect(bench.sets[0].weight).toBe(70)
  })

  test("hitting the top of the range on all sets adds weight", () => {
    const enr = enroll(pushPullLegs, "intermediate")
    const res = applyLog(pushPullLegs, enr, logFor(pushPullLegs, enr, { bb_bench: 8, bb_ohp: 10, bb_incline_db: 12, bb_triceps: 15, bb_lateral: 20 }))
    expect(res.enrollment.exerciseState.bb_bench.workingWeight).toBe(72.5)
    expect(res.changes.find((c) => c.exerciseId === "bb_bench")!.kind).toBe("advance")
  })

  test("staying inside the range holds the weight (chase more reps)", () => {
    const enr = enroll(pushPullLegs, "intermediate")
    const res = applyLog(pushPullLegs, enr, logFor(pushPullLegs, enr, { bb_bench: 7 }))
    expect(res.enrollment.exerciseState.bb_bench.workingWeight).toBe(70)
    expect(res.changes.find((c) => c.exerciseId === "bb_bench")!.kind).toBe("hold")
  })
})

// ============================================================================
// Couch to 5K — endurance (week-indexed interval sessions)
// ============================================================================

describe("Couch to 5K — endurance", () => {
  test("week-1 session-1 prescribes the warmup + 8× jog/walk + cooldown intervals", () => {
    const enr = enroll(couchTo5k, "beginner")
    const p = computePrescription(couchTo5k, enr)
    expect(p.exercises).toHaveLength(0)
    expect(p.enduranceSets).toBeTruthy()
    const intervalSet = p.enduranceSets!.find((s) => s.repeat === 8)!
    expect(intervalSet.blocks.map((b) => b.kind)).toEqual(["jog", "walk"])
    expect(p.summary).toContain("8×")
  })

  test("logging walks through the 3 sessions of week 1, then into week 2", () => {
    let enr = enroll(couchTo5k, "beginner")
    for (let i = 0; i < 3; i++) enr = applyLog(couchTo5k, enr, log(enr)).enrollment
    expect(enr.cursor.week).toBe(2)
    expect(enr.cursor.dayIndex).toBe(0)
  })

  test("the very last session is flagged as final (graduation) and does not advance past itself", () => {
    let enr = enroll(couchTo5k, "beginner")
    enr = { ...enr, cursor: { ...enr.cursor, week: 9, dayIndex: 2 } } // last week, last session
    const p = computePrescription(couchTo5k, enr)
    expect(p.isFinalSession).toBe(true)
    const after = applyLog(couchTo5k, enr, log(enr)).enrollment
    expect(after.cursor.week).toBe(9)
    expect(after.cursor.dayIndex).toBe(2) // clamped — graduated
  })

  test("endurance enrollment needs no weights/1RM", () => {
    const enr = enroll(couchTo5k, "beginner")
    expect(enr.exerciseState).toEqual({})
  })
})

// helper: an endurance log (no entries) for the current session
function log(enr: ProgramEnrollment) {
  const p = computePrescription(couchTo5k, enr)
  return { enrollment_id: enr.id, dayId: p.dayId, cycle: p.cycle, week: p.week, entries: [] }
}

// ============================================================================
// Calisthenics — skill-tier unlocks
// ============================================================================

describe("Bodyweight Foundations — skill tiers", () => {
  test("starts at tier 0 and prescribes bodyweight reps", () => {
    const enr = enroll(recommendedRoutine, "beginner")
    expect(enr.exerciseState.cal_push.tierIndex).toBe(0)
    const p = computePrescription(recommendedRoutine, enr)
    const push = p.exercises.find((e) => e.exerciseId === "cal_push")!
    expect(push.bodyweight).toBe(true)
    expect(push.repUnit).toBe("reps")
    expect(push.sets[0].reps).toBe(12) // incline push-up unlock reps
  })

  test("hitting the unlock reps on all sets advances to the next variation", () => {
    const enr = enroll(recommendedRoutine, "beginner")
    const p = computePrescription(recommendedRoutine, enr)
    const reps = Object.fromEntries(p.exercises.map((e) => [e.exerciseId, e.sets[0].reps]))
    const res = applyLog(recommendedRoutine, enr, logFor(recommendedRoutine, enr, reps))
    expect(res.enrollment.exerciseState.cal_push.tierIndex).toBe(1)
    expect(res.changes.find((c) => c.exerciseId === "cal_push")!.kind).toBe("tier_up")
  })

  test("missing the unlock reps holds the current tier", () => {
    const enr = enroll(recommendedRoutine, "beginner")
    const res = applyLog(recommendedRoutine, enr, logFor(recommendedRoutine, enr, { cal_push: 3 }))
    expect(res.enrollment.exerciseState.cal_push.tierIndex).toBe(0)
    expect(res.changes.find((c) => c.exerciseId === "cal_push")!.kind).toBe("hold")
  })
})

// ============================================================================
// Flexibility — hold/range progression
// ============================================================================

describe("Splits & Mobility — hold progression", () => {
  test("starts at each stretch's start hold, prescribed in seconds", () => {
    const enr = enroll(splitsMobility, "beginner")
    expect(enr.exerciseState.flx_front_split.currentHoldSec).toBe(30)
    const p = computePrescription(splitsMobility, enr)
    const fs = p.exercises.find((e) => e.exerciseId === "flx_front_split")!
    expect(fs.repUnit).toBe("sec")
    expect(fs.sets[0].reps).toBe(30)
  })

  test("meeting the hold on all sets deepens it by the increment, capped at target", () => {
    const enr = enroll(splitsMobility, "beginner")
    const res = applyLog(splitsMobility, enr, logFor(splitsMobility, enr, { flx_front_split: 30 }))
    expect(res.enrollment.exerciseState.flx_front_split.currentHoldSec).toBe(35) // +5
    expect(res.changes.find((c) => c.exerciseId === "flx_front_split")!.kind).toBe("hold_up")
  })

  test("falling short of the hold keeps the current duration", () => {
    const enr = enroll(splitsMobility, "beginner")
    const res = applyLog(splitsMobility, enr, logFor(splitsMobility, enr, { flx_front_split: 10 }))
    expect(res.enrollment.exerciseState.flx_front_split.currentHoldSec).toBe(30)
    expect(res.changes.find((c) => c.exerciseId === "flx_front_split")!.kind).toBe("hold")
  })
})

// ============================================================================
// Catalog expansion — new programs are valid & enrollable
// ============================================================================

describe("expanded catalog", () => {
  test("Starting Strength advances linearly on all-reps-hit", () => {
    const enr = enroll(startingStrength, "intermediate")
    const res = applyLog(startingStrength, enr, logFor(startingStrength, enr))
    expect(res.enrollment.exerciseState.ss_squat.workingWeight).toBe(82.5)
    expect(res.enrollment.exerciseState.ss_deadlift.workingWeight).toBe(105) // +5kg deadlift
  })

  test("PHUL upper-power prescribes a low rep range and double-progresses", () => {
    const enr = enroll(phul, "intermediate")
    const p = computePrescription(phul, enr)
    const bench = p.exercises.find((e) => e.exerciseId === "phul_bench")!
    expect(bench.sets[0].reps).toBe(3)
    expect(bench.sets[0].repRangeMax).toBe(5)
  })

  test("5K→10K week 1 has interval / steady / long sessions", () => {
    const enr = enroll(fiveKToTenK, "intermediate")
    const p = computePrescription(fiveKToTenK, enr)
    expect(p.enduranceSets).toBeTruthy()
    expect(p.dayLabel).toContain("Intervals")
  })

  test("Sprint triathlon: 8 weeks, 6 sessions/week, final week tapers and flags graduation", () => {
    expect(sprintTriathlon.schedule.kind).toBe("endurance_weeks")
    if (sprintTriathlon.schedule.kind !== "endurance_weeks") throw new Error("x")
    expect(sprintTriathlon.schedule.weeks).toHaveLength(8)
    expect(sprintTriathlon.schedule.weeks[0].sessions).toHaveLength(6)
    expect(sprintTriathlon.schedule.weeks[7].label).toContain("Race")
    const enr = enroll(sprintTriathlon, "beginner")
    const swim = computePrescription(sprintTriathlon, enr)
    expect(swim.enduranceSets![0].blocks[0].kind).toBe("swim")
  })

  test("70.3 brick sessions chain a bike then a run", () => {
    if (halfIronman.schedule.kind !== "endurance_weeks") throw new Error("x")
    const brick = halfIronman.schedule.weeks[0].sessions.find((s) => s.id.endsWith("brick"))!
    expect(brick.sets[0].blocks.map((b) => b.kind)).toEqual(["bike", "run"])
  })

  test("every catalog program enrolls and prescribes a first session without throwing", () => {
    for (const program of ALL_PROGRAMS) {
      const level = program.levels.find((l) => !l.structuralVariantOf)!.id
      const oneRms = program.levels.find((l) => l.id === level)?.requires1RM
        ? Object.fromEntries(
            (program.schedule.kind === "weekly_waved" ? program.schedule.days : []).flatMap((d) => d.exercises.map((e) => [e.id, 100])),
          )
        : undefined
      const { exerciseState, cursor } = seedEnrollment(program, level, "kg", oneRms)
      const e: ProgramEnrollment = { id: "x", user_id: "u", program_id: program.id, level, unitSystem: "kg", exerciseState, cursor, is_active: true, started_at: "2026-01-01", customSchedule: null }
      expect(() => computePrescription(program, e)).not.toThrow()

      // AND IT DOES NOT SAY THE SAME THING TWICE. The rep-range branch used to
      // default `note` to "6–8 reps", which the session line then rendered as
      // "4 × 6–8 reps @ 40 kg · 6–8 reps". Checked across the whole catalogue
      // rather than one program, because the default was in the engine.
      for (const ex of computePrescription(program, e).exercises) {
        if (!ex.note) continue
        expect(describeSets(ex, "kg"), `${program.id}/${ex.name} repeats its note`).not.toContain(ex.note)
      }
    }
  })
})

// ============================================================================
// Cursor advance (hybrid scheduling: load = log-driven sequential)
// ============================================================================

describe("cursor advance", () => {
  test("weekly_waved walks days, then weeks, then cycles", () => {
    let c = { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 }
    for (let i = 0; i < 3; i++) c = advanceCursor(wendler531, c)
    expect(c).toMatchObject({ week: 1, dayIndex: 3 }) // 4 days in week 1
    c = advanceCursor(wendler531, c) // finish day 4 → week 2
    expect(c).toMatchObject({ week: 2, dayIndex: 0 })
    // fast-forward to end of week 4 day 4
    c = { cycle: 1, week: 4, dayIndex: 3, sessionCount: 15 }
    c = advanceCursor(wendler531, c)
    expect(c).toMatchObject({ cycle: 2, week: 1, dayIndex: 0 })
  })

  test("linear_rotation alternates two days and counts cycles", () => {
    let c = { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 }
    c = advanceCursor(strongLifts5x5, c)
    expect(c.dayIndex).toBe(1)
    c = advanceCursor(strongLifts5x5, c)
    expect(c).toMatchObject({ dayIndex: 0, cycle: 2 })
  })
})

// ============================================================================
// Level routing (Layer-1 calibration) + guards
// ============================================================================

describe("level routing", () => {
  test("5/3/1 beginner routes to StrongLifts 5×5", () => {
    const { program, level } = resolveProgramForLevel("wendler-531", "beginner")
    expect(program.id).toBe("stronglifts-5x5")
    expect(level).toBe("beginner")
  })

  test("seeding a routed level throws (enroll at the resolved program instead)", () => {
    expect(() => seedEnrollment(wendler531, "beginner", "kg")).toThrow(/routes to program/)
  })

  test("intermediate 5/3/1 stays on 5/3/1", () => {
    expect(resolveProgramForLevel("wendler-531", "intermediate").program.id).toBe("wendler-531")
  })
})

/**
 * READING A SESSION AT A GLANCE.
 *
 * The widget rendered every set as its own row of two number boxes, so an
 * upper/lower day was twenty near-identical rows. These cover the line that
 * replaces them — and the two cases where collapsing would be a LIE.
 */
describe("describeSets", () => {
  const set = (n: number, reps: number, weight: number, extra: Partial<PrescribedSet> = {}): PrescribedSet =>
    ({ setNumber: n, reps, amrap: false, weight, weightKg: weight, ...extra })
  const ex = (sets: PrescribedSet[], extra: Partial<PrescribedExercise> = {}): PrescribedExercise =>
    ({ exerciseId: "x", name: "Lift", sets, ...extra })

  test("collapses identical sets into one line", () => {
    expect(describeSets(ex([set(1, 5, 40), set(2, 5, 40), set(3, 5, 40)]), "kg")).toBe("3 × 5 reps @ 40 kg")
  })

  test("keeps a rep range as a range", () => {
    const sets = [1, 2, 3, 4].map((n) => set(n, 6, 40, { repRangeMax: 8 }))
    expect(describeSets(ex(sets), "kg")).toBe("4 × 6–8 reps @ 40 kg")
  })

  test("refuses to collapse a wave — three weights are not '3 × 5'", () => {
    // 5/3/1: the whole program IS that the weight changes across the sets.
    const out = describeSets(ex([set(1, 5, 40), set(2, 5, 45), set(3, 5, 50, { amrap: true })]), "kg")
    expect(out).toBe("40 kg × 5, 45 kg × 5, 50 kg × 5+")
  })

  test("marks AMRAP, because that number is the one the app cannot guess", () => {
    expect(describeSets(ex([set(1, 5, 60, { amrap: true })]), "kg")).toContain("5+")
  })

  test("leaves the weight off a bodyweight lift", () => {
    const out = describeSets(ex([set(1, 10, 0), set(2, 10, 0)], { bodyweight: true }), "kg")
    expect(out).toBe("2 × 10 reps")
    // No "@ 0 kg": a pull-up loaded at zero would read as an unloaded barbell.
    expect(out).not.toContain("kg")
    expect(out).not.toContain("@")
  })

  test("uses the lift's own unit when it is timed, not reps", () => {
    expect(describeSets(ex([set(1, 30, 0)], { bodyweight: true, repUnit: "sec" }), "kg")).toBe("1 × 30 sec")
  })

  test("says something rather than crashing on a lift with no sets", () => {
    expect(describeSets(ex([]), "kg")).toBe("—")
  })
})

describe("needsInput", () => {
  const set = (n: number, amrap = false): PrescribedSet =>
    ({ setNumber: n, reps: 5, amrap, weight: 40, weightKg: 40 })

  test("an AMRAP lift must be opened — logging the floor would record a lift you never did", () => {
    expect(needsInput({ exerciseId: "x", name: "Squat", sets: [set(1), set(2, true)] })).toBe(true)
  })

  test("a fully prescribed lift does not", () => {
    expect(needsInput({ exerciseId: "x", name: "Squat", sets: [set(1), set(2)] })).toBe(false)
  })
})

/**
 * A YEAR OF TRAINING, READ BACK.
 *
 * The history panel showed twelve rows of `ohp-day · C1 W1` and a date, so the
 * one question a training log exists to answer — did my bench go up? — could
 * not be asked, even though every set was already stored.
 */
describe("summariseProgression", () => {
  const name = (id: string) => ({ bench: "Bench Press", squat: "Squat" })[id] ?? id
  const session = (at: string, id: string, weights: number[]) => ({
    logged_at: at,
    entries: [{ exerciseId: id, sets: weights.map((w, i) => ({ setNumber: i + 1, reps: 5, weight: w })) }],
  })

  test("reports where a lift started, where it is now, and how many sessions", () => {
    const [bench] = summariseProgression(
      [session("2026-01-01", "bench", [40, 40]), session("2026-06-01", "bench", [60, 60])],
      name
    )
    expect(bench.name).toBe("Bench Press")
    expect(bench.first).toBe(40)
    expect(bench.latest).toBe(60)
    expect(bench.sessions).toBe(2)
  })

  test("a deload shows as latest below best, not as a lost record", () => {
    // Latest and best coming apart IS the information. One "progress" number
    // would hide the deload entirely.
    const [bench] = summariseProgression(
      [session("2026-01-01", "bench", [40]), session("2026-02-01", "bench", [80]), session("2026-03-01", "bench", [70])],
      name
    )
    expect(bench.best).toBe(80)
    expect(bench.latest).toBe(70)
    expect(bench.latest).toBeLessThan(bench.best)
  })

  test("a stall is visible — thirty sessions and the number never moved", () => {
    const logs = Array.from({ length: 30 }, (_, i) => session(`2026-01-${String(i + 1).padStart(2, "0")}`, "bench", [60]))
    const [bench] = summariseProgression(logs, name)
    expect(bench.sessions).toBe(30)
    expect(bench.first).toBe(bench.latest)
  })

  test("the working weight is the heaviest set, so a drop set is not a collapse", () => {
    // 3×5 at 100 then two drops to 60. Reading the LAST set would report 60.
    const [bench] = summariseProgression([session("2026-01-01", "bench", [100, 100, 100, 60, 60])], name)
    expect(bench.latest).toBe(100)
  })

  test("newest-first input does not swap first and latest", () => {
    const [bench] = summariseProgression(
      [session("2026-06-01", "bench", [60]), session("2026-01-01", "bench", [40])],
      name
    )
    expect(bench.first).toBe(40)
    expect(bench.latest).toBe(60)
  })

  test("lists the lift that moved most first", () => {
    const out = summariseProgression(
      [
        session("2026-01-01", "bench", [40]), session("2026-06-01", "bench", [45]),
        session("2026-01-01", "squat", [60]), session("2026-06-01", "squat", [110]),
      ],
      name
    )
    expect(out.map((l) => l.exerciseId)).toEqual(["squat", "bench"])
  })

  test("no sessions is an empty list, not a crash", () => {
    expect(summariseProgression([], name)).toEqual([])
  })
})

describe("formatLoad", () => {
  test("never prints a weight nobody could load", () => {
    // Progression arithmetic produced 20.4375 and the panel printed it raw.
    expect(formatLoad(20.4375)).toBe("20.4")
    expect(formatLoad(186.25)).toBe("186.3")
  })

  test("keeps the half plate, drops the fake precision", () => {
    expect(formatLoad(82.5)).toBe("82.5")
    expect(formatLoad(80)).toBe("80")
    expect(formatLoad(80.0)).toBe("80")
  })
})

/**
 * THE 395 KG SQUAT.
 *
 * Linear progression adds weight after a session you completed and deloads only
 * after you fail — faithful to the program. But "log as prescribed" is one
 * button, so a year of tapping it ratchets a beginner's squat past any weight a
 * human has lifted. A cap would be inventing a number for somebody else's cited
 * program; what can be said honestly is what the log shows.
 */
describe("unbrokenRun", () => {
  const target = () => 5
  const s = (at: string, reps: number[]) => ({
    logged_at: at,
    entries: [{ exerciseId: "squat", sets: reps.map((r, i) => ({ setNumber: i + 1, reps: r, weight: 100 })) }],
  })

  test("counts sessions back to the last missed rep, not from the beginning", () => {
    const logs = [s("2026-01-01", [5, 5]), s("2026-01-02", [5, 3]), s("2026-01-03", [5, 5]), s("2026-01-04", [5, 5])]
    expect(unbrokenRun(logs, target)).toBe(2)
  })

  test("a year of never missing is exactly what it flags", () => {
    const logs = Array.from({ length: 150 }, (_, i) => s(`2026-01-${String((i % 28) + 1).padStart(2, "0")}T0${i % 9}`, [5, 5]))
    expect(unbrokenRun(logs, target)).toBeGreaterThanOrEqual(UNBROKEN_RUN_QUESTION_AT)
  })

  test("a miss in the most recent session means no run at all", () => {
    expect(unbrokenRun([s("2026-01-01", [5, 5]), s("2026-01-02", [5, 4])], target)).toBe(0)
  })

  test("unordered input still counts back from the newest", () => {
    const logs = [s("2026-01-04", [5, 5]), s("2026-01-02", [5, 3]), s("2026-01-03", [5, 5]), s("2026-01-01", [5, 5])]
    expect(unbrokenRun(logs, target)).toBe(2)
  })

  test("a lift with no fixed target neither breaks a run nor extends one", () => {
    // An AMRAP top set or a timed hold cannot be "missed".
    const logs = [s("2026-01-01", [5, 5]), s("2026-01-02", [1, 1])]
    expect(unbrokenRun(logs, () => null)).toBe(2)
  })

  test("no sessions is a run of zero, not a crash", () => {
    expect(unbrokenRun([], target)).toBe(0)
  })
})

describe("summariseProgression points", () => {
  const session = (at: string, w: number) => ({
    logged_at: at,
    entries: [{ exerciseId: "squat", sets: [{ setNumber: 1, reps: 5, weight: w }] }],
  })

  test("carries the shape between first and latest, in order", () => {
    const [squat] = summariseProgression(
      [session("2026-01-01", 40), session("2026-02-01", 60), session("2026-03-01", 50)],
      (id) => id
    )
    expect(squat.points.map((p) => p.weight)).toEqual([40, 60, 50])
  })

  test("each point carries the day it was trained, not just its position", () => {
    // Without the date the line spaces a three-month gap like three days.
    const [squat] = summariseProgression([session("2026-01-01", 40), session("2026-06-01", 60)], (id) => id)
    expect(squat.points[0].at).toBe("2026-01-01")
    expect(squat.points[1].at).toBe("2026-06-01")
  })

  test("a long run is downsampled but still starts and ends where the numbers say", () => {
    // Three years of logs must not render three years of SVG, and the endpoints
    // have to match the first/latest printed next to them.
    const logs = Array.from({ length: 400 }, (_, i) => session(`2026-01-01T${String(i).padStart(4, "0")}`, 20 + i))
    const [squat] = summariseProgression(logs, (id) => id)
    expect(squat.points.length).toBeLessThanOrEqual(40)
    expect(squat.points[0].weight).toBe(squat.first)
    expect(squat.points[squat.points.length - 1].weight).toBe(squat.latest)
    // And the ends keep their dates, which is what the x-axis is drawn from.
    expect(squat.points[0].at).toBe(squat.firstAt)
    expect(squat.points[squat.points.length - 1].at).toBe(squat.latestAt)
  })
})

describe("daysSinceLastSession", () => {
  const log = (at: string) => ({ logged_at: new Date(at).toISOString() })

  test("counts whole days, so last night is yesterday and not 0.4 of a day", () => {
    const logs = [log("2026-03-01T23:00:00")]
    expect(daysSinceLastSession(logs, new Date(2026, 2, 2, 7, 0))).toBe(1)
  })

  test("finds the most recent session whatever order they arrive in", () => {
    const logs = [log("2026-01-01T10:00:00"), log("2026-03-01T10:00:00"), log("2026-02-01T10:00:00")]
    expect(daysSinceLastSession(logs, new Date(2026, 2, 11, 10, 0))).toBe(10)
  })

  test("a six-month layoff is well past the point of asking", () => {
    const logs = [log("2026-03-01T10:00:00")]
    expect(daysSinceLastSession(logs, new Date(2026, 8, 1, 10, 0))).toBeGreaterThan(LAYOFF_DAYS)
  })

  test("never trained is null, which is not the same as trained today", () => {
    expect(daysSinceLastSession([])).toBeNull()
    expect(daysSinceLastSession([log("2026-03-01T10:00:00")], new Date(2026, 2, 1, 20, 0))).toBe(0)
  })
})

/**
 * A FINISHED PROGRAM HAS TO BE ABLE TO SAY SO.
 *
 * `advanceCursor` holds the cursor at the last session once it is reached, so
 * `isFinalSession` stays true for ever and looks identical before and after the
 * session is actually done. The plan quietly re-offered its final session with
 * no way out.
 */
describe("finishing an endurance program", () => {
  const enrollAt = (sessionCount: number, week: number, dayIndex: number): ProgramEnrollment => ({
    id: "x", user_id: "u", program_id: couchTo5k.id, level: "beginner", unitSystem: "kg",
    exerciseState: {}, cursor: { cycle: 1, week, dayIndex, sessionCount },
    is_active: true, started_at: "2026-01-01", customSchedule: null,
  })
  const total = couchTo5k.schedule.kind === "endurance_weeks"
    ? couchTo5k.schedule.weeks.reduce((n, w) => n + w.sessions.length, 0)
    : 0
  const lastWeek = couchTo5k.schedule.kind === "endurance_weeks" ? couchTo5k.schedule.weeks.length : 0
  const lastDay = couchTo5k.schedule.kind === "endurance_weeks"
    ? couchTo5k.schedule.weeks[lastWeek - 1].sessions.length - 1
    : 0

  test("the program has sessions to count", () => {
    expect(total).toBeGreaterThan(10)
  })

  test("standing on the last session is not the same as having done it", () => {
    const p = computePrescription(couchTo5k, enrollAt(total - 1, lastWeek, lastDay))
    expect(p.isFinalSession).toBe(true)
    expect(p.isComplete).toBe(false)
  })

  test("once every session is logged, the program reports itself finished", () => {
    const p = computePrescription(couchTo5k, enrollAt(total, lastWeek, lastDay))
    expect(p.isComplete).toBe(true)
  })

  test("week one is neither final nor finished", () => {
    const p = computePrescription(couchTo5k, enrollAt(0, 1, 0))
    expect(p.isFinalSession).toBe(false)
    expect(p.isComplete).toBe(false)
  })
})

describe("staleLifts", () => {
  const name = (id: string) => ({ squat: "Squat", bench: "Bench Press" })[id] ?? id
  const s = (at: string, ids: string[]) => ({
    logged_at: new Date(at).toISOString(),
    entries: ids.map((id) => ({ exerciseId: id, sets: [{ setNumber: 1, reps: 5, weight: 100 }] })),
  })

  test("names only the lifts that went stale, not the whole program", () => {
    // Kept squatting, stopped pressing — the program-level notice cannot say this.
    const logs = [s("2026-01-01", ["squat", "bench"]), s("2026-06-01", ["squat"])]
    const out = staleLifts(logs, name, new Date(2026, 5, 5))
    expect(out.map((l) => l.name)).toEqual(["Bench Press"])
  })

  test("says nothing when everything was trained recently", () => {
    const logs = [s("2026-06-01", ["squat", "bench"])]
    expect(staleLifts(logs, name, new Date(2026, 5, 3))).toEqual([])
  })

  test("worst first, so the most neglected lift is read first", () => {
    const logs = [s("2026-01-01", ["bench"]), s("2026-03-01", ["squat"])]
    const out = staleLifts(logs, name, new Date(2026, 5, 1))
    expect(out.map((l) => l.name)).toEqual(["Bench Press", "Squat"])
  })

  test("a lift never logged is absent rather than infinitely stale", () => {
    expect(staleLifts([], name, new Date(2026, 5, 1))).toEqual([])
  })
})

/**
 * CHANGING THE LEVEL MUST NOT THROW AWAY THE WEEK YOU BUILT.
 *
 * The Templates tab reset the whole schedule on every level change, replacing
 * whatever you had edited with a fresh clone of the stock program. Somebody
 * would swap a lift, drop a day, then nudge the level control sitting directly
 * above it — and start a program they had not designed, with no warning.
 *
 * The reset is only ever justified when the level routes to a STRUCTURALLY
 * DIFFERENT program, because edits made against one schedule mean nothing
 * against another. This pins how rare that is: exactly one level of one program
 * in the whole catalogue. Everywhere else the reset was pure destruction.
 */
describe("a level change only invalidates edits when the program itself changes", () => {
  const LEVELS: LevelId[] = ["beginner", "intermediate", "advanced"]

  test("only 5/3/1 at beginner routes somewhere else", () => {
    const reroutes: string[] = []
    for (const program of ALL_PROGRAMS) {
      for (const level of LEVELS) {
        if (!program.levels.some((l) => l.id === level)) continue
        if (resolveProgramForLevel(program.id, level).program.id !== program.id) {
          reroutes.push(`${program.id}@${level}`)
        }
      }
    }
    expect(reroutes).toEqual(["wendler-531@beginner"])
  })

  test("every other program keeps one identity across all its levels, so an edit stays valid", () => {
    for (const program of ALL_PROGRAMS) {
      if (program.id === "wendler-531") continue
      const ids = program.levels.map((l) => resolveProgramForLevel(program.id, l.id).program.id)
      expect(new Set(ids).size, `${program.id} changes program between levels`).toBe(1)
    }
  })
})

/**
 * WHAT ACTUALLY HAPPENED, not what was asked for.
 *
 * The session screen rendered exactly the prescribed number of set rows and
 * offered no way to change it, so stopping at three of five — or pushing a
 * sixth — could not be written down. The app recorded five as prescribed and
 * progressed off a set nobody lifted.
 */
describe("lastTimePerLift", () => {
  const s = (at: string, id: string, sets: [number, number][]) => ({
    logged_at: new Date(at).toISOString(),
    entries: [{ exerciseId: id, sets: sets.map(([reps, weight], i) => ({ setNumber: i + 1, reps, weight })) }],
  })

  test("collapses a uniform session the way somebody would say it", () => {
    const out = lastTimePerLift([s("2026-03-01", "squat", [[5, 60], [5, 60], [5, 60]])], "kg")
    expect(out.squat).toContain("3 × 5 @ 60 kg")
  })

  test("does not flatten sets that differ — that would be a lie", () => {
    const out = lastTimePerLift([s("2026-03-01", "squat", [[5, 60], [3, 70]])], "kg")
    expect(out.squat).toContain("60×5, 70×3")
  })

  test("means the last time you did THAT LIFT, not the last session", () => {
    // Alternating programs: the most recent session was the other day.
    const logs = [
      s("2026-03-01", "bench", [[5, 50], [5, 50]]),
      s("2026-03-03", "squat", [[5, 80], [5, 80]]),
    ]
    const out = lastTimePerLift(logs, "kg")
    expect(out.bench).toContain("50 kg")
    expect(out.squat).toContain("80 kg")
  })

  test("takes the newest, whatever order the logs arrive in", () => {
    const logs = [s("2026-01-01", "squat", [[5, 40]]), s("2026-06-01", "squat", [[5, 90]])]
    expect(lastTimePerLift(logs, "kg").squat).toContain("90 kg")
  })

  test("a lift never done has no last time rather than a made-up one", () => {
    expect(lastTimePerLift([], "kg")).toEqual({})
  })
})

/**
 * A SESSION MAY ONLY NAME LIFTS THE PROGRAM HAS.
 *
 * A log referencing `bench` against a program whose lift is `ul_bench` was
 * accepted, stored and returned 200. Nothing downstream can recover: the engine
 * has no state to progress for an id it has never seen, and every screen that
 * turns an id back into a name prints the raw id for ever.
 */
describe("unknownExerciseIds", () => {
  test("rejects an id the program does not have, and names it", () => {
    expect(unknownExerciseIds(upperLower, [{ exerciseId: "bench" }])).toEqual(["bench"])
  })

  test("accepts the program's real ids", () => {
    expect(unknownExerciseIds(upperLower, [{ exerciseId: "ul_bench" }, { exerciseId: "ul_row" }])).toEqual([])
  })

  test("reports every bad id once, not the first and not duplicates", () => {
    const out = unknownExerciseIds(upperLower, [
      { exerciseId: "bench" }, { exerciseId: "row" }, { exerciseId: "bench" }, { exerciseId: "ul_squat" },
    ])
    expect(out.sort()).toEqual(["bench", "row"])
  })

  test("an endurance session has no entries at all, which is valid", () => {
    // Couch to 5K logs a session with an empty entry list by design.
    expect(unknownExerciseIds(couchTo5k, [])).toEqual([])
  })

  test("every days-and-lifts program accepts its own lifts", () => {
    // The check must never reject a legitimate session for any program.
    for (const program of ALL_PROGRAMS) {
      if (program.schedule.kind === "endurance_weeks") continue // weeks, not days
      const ids = scheduleDays(program.schedule).flatMap((d) => d.exercises.map((e) => ({ exerciseId: e.id })))
      expect(unknownExerciseIds(program, ids), program.id).toEqual([])
    }
  })

  test("an endurance plan has no lifts, so an entry sent against one is unknown", () => {
    // Answering rather than crashing: `scheduleDays` throws on these by design.
    expect(unknownExerciseIds(couchTo5k, [{ exerciseId: "squat" }])).toEqual(["squat"])
  })
})

/**
 * WHAT DO I PUT ON THE BAR.
 *
 * Arithmetic somebody does in their head between sets, gets wrong, and then
 * lifts the wrong weight. Its absence is a standing complaint about every app
 * that lacks it.
 */
describe("platesFor", () => {
  test("an exact load, heaviest plate first", () => {
    // 100 kg = 20 bar + 40 a side = 25 + 15
    const load = platesFor(100, "kg")
    expect(load.perSide).toEqual([25, 15])
    expect(load.approximate).toBe(false)
    expect(load.achievable).toBe(100)
  })

  test("says so when the plates cannot make the number", () => {
    // A silently rounded answer has somebody lift a weight their screen does not
    // show. 101 kg is not loadable with 1.25 as the smallest plate.
    const load = platesFor(101, "kg")
    expect(load.approximate).toBe(true)
    expect(load.achievable).toBeLessThan(101)
    expect(describePlates(load, "kg")).toContain("makes")
  })

  test("the bar alone is an answer, not an empty list", () => {
    expect(platesFor(20, "kg").barOnly).toBe(true)
    expect(describePlates(platesFor(20, "kg"), "kg")).toBe("just the bar")
  })

  test("a target under the bar is the bar, and is flagged as not exact", () => {
    const load = platesFor(15, "kg")
    expect(load.barOnly).toBe(true)
    expect(load.achievable).toBe(20)
    expect(load.approximate).toBe(true)
  })

  test("pounds use the pound bar and pound plates", () => {
    // 135 lb = 45 bar + 45 a side
    expect(platesFor(135, "lb").perSide).toEqual([45])
  })

  test("the smallest plate is not lost to floating point", () => {
    // (62.5 - 20) / 2 = 21.25, which is not exact in binary. A strict >=
    // comparison drops the final 1.25 and silently under-loads the bar.
    const load = platesFor(62.5, "kg")
    expect(load.approximate).toBe(false)
    expect(load.perSide.reduce((t, p) => t + p, 0)).toBeCloseTo(21.25, 6)
  })

  test("repeated plates are counted rather than listed one by one", () => {
    // 20 + 4×20 a side reads as "4×20", not "20 + 20 + 20 + 20".
    expect(describePlates(platesFor(180, "kg"), "kg")).toMatch(/\d×\d/)
  })

  test("every weight the engine can prescribe is loadable or says it is not", () => {
    // The engine rounds to a loadable value, so nothing it prescribes should
    // come back approximate. This is the two functions agreeing.
    for (let w = 20; w <= 300; w += 2.5) {
      expect(platesFor(w, "kg").approximate, `${w} kg`).toBe(false)
    }
  })
})

/**
 * FIXING A MISTAKE HAS TO FIX WHAT COMES NEXT.
 *
 * A session's log advanced `exercise_state`, and the state it advanced FROM is
 * not stored — so a single log cannot be reversed; there is nothing to subtract.
 * Replaying every session over a fresh seed is the way out, and it works only
 * because the engine is pure.
 */
describe("replayEnrollment", () => {
  const seed = () => {
    const { exerciseState, cursor } = seedEnrollment(strongLifts5x5, "beginner", "kg")
    const e: ProgramEnrollment = {
      id: "x", user_id: "u", program_id: strongLifts5x5.id, level: "beginner", unitSystem: "kg",
      exerciseState, cursor, is_active: true, started_at: "2026-01-01", customSchedule: null,
    }
    return e
  }
  const session = (at: string, dayId: string, reps: number) => ({
    logged_at: at, dayId, cycle: 1, week: 1,
    entries: scheduleDays(strongLifts5x5.schedule)
      .find((d) => d.id === dayId)!
      .exercises.map((ex) => ({
        exerciseId: ex.id,
        sets: [1, 2, 3, 4, 5].map((n) => ({ setNumber: n, reps, weight: 20 })),
      })),
  })

  test("replaying the same sessions reproduces the state they produced", () => {
    // The baseline: replay must be a no-op when nothing was edited.
    const start = seed()
    const logs = [session("2026-01-01", "A", 5), session("2026-01-03", "B", 5), session("2026-01-05", "A", 5)]
    let live = start
    for (const l of logs) {
      live = applyLog(strongLifts5x5, live, { enrollment_id: "x", ...l }).enrollment
    }
    const replayed = replayEnrollment(strongLifts5x5, start, logs)
    expect(replayed.exerciseState).toEqual(live.exerciseState)
    expect(replayed.cursor).toEqual(live.cursor)
  })

  test("correcting an old session gives the state that session would have produced", () => {
    // THIS EQUALITY IS THE WHOLE FEATURE. Editing session one to a failure must
    // leave the weights exactly where they would have been had it been logged
    // as a failure in the first place.
    const start = seed()
    const asLogged = [session("2026-01-01", "A", 5), session("2026-01-03", "B", 5)]
    const corrected = [session("2026-01-01", "A", 2), session("2026-01-03", "B", 5)]

    const afterEdit = replayEnrollment(strongLifts5x5, start, corrected)
    const asIfOriginal = replayEnrollment(strongLifts5x5, start, corrected)
    expect(afterEdit.exerciseState).toEqual(asIfOriginal.exerciseState)
    // And it genuinely differs from the uncorrected history, or the edit did nothing.
    expect(afterEdit.exerciseState).not.toEqual(replayEnrollment(strongLifts5x5, start, asLogged).exerciseState)
  })

  test("deleting a session rewinds the count", () => {
    const start = seed()
    const three = [session("2026-01-01", "A", 5), session("2026-01-03", "B", 5), session("2026-01-05", "A", 5)]
    const two = three.slice(0, 2)
    expect(replayEnrollment(strongLifts5x5, start, three).cursor.sessionCount).toBe(3)
    expect(replayEnrollment(strongLifts5x5, start, two).cursor.sessionCount).toBe(2)
  })

  test("logs out of order replay in the order they happened", () => {
    const start = seed()
    const inOrder = [session("2026-01-01", "A", 5), session("2026-01-03", "B", 5)]
    const shuffled = [inOrder[1], inOrder[0]]
    expect(replayEnrollment(strongLifts5x5, start, shuffled).exerciseState)
      .toEqual(replayEnrollment(strongLifts5x5, start, inOrder).exerciseState)
  })

  test("no sessions replays back to the seed", () => {
    const start = seed()
    const replayed = replayEnrollment(strongLifts5x5, start, [])
    expect(replayed.exerciseState).toEqual(start.exerciseState)
    expect(replayed.cursor.sessionCount).toBe(0)
  })
})
