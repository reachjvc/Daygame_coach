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
} from "@/src/programs/programsService"
import { strongLifts5x5 } from "@/src/programs/data/strength/stronglifts5x5"
import { wendler531 } from "@/src/programs/data/strength/wendler531"
import { pushPullLegs } from "@/src/programs/data/bodybuilding/pushPullLegs"
import { couchTo5k } from "@/src/programs/data/cardio/couchTo5k"
import { recommendedRoutine } from "@/src/programs/data/calisthenics/recommendedRoutine"
import { splitsMobility } from "@/src/programs/data/flexibility/splitsMobility"
import { startingStrength } from "@/src/programs/data/strength/startingStrength"
import { phul } from "@/src/programs/data/bodybuilding/phul"
import { fiveKToTenK } from "@/src/programs/data/cardio/fiveKToTenK"
import { sprintTriathlon, halfIronman } from "@/src/programs/data/endurance/triathlon"
import { ALL_PROGRAMS } from "@/src/programs/data/catalog"
import { resolveProgramForLevel } from "@/src/programs/data/catalog"
import type {
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
      const e: ProgramEnrollment = { id: "x", user_id: "u", program_id: program.id, level, unitSystem: "kg", exerciseState, cursor, is_active: true, started_at: "2026-01-01" }
      expect(() => computePrescription(program, e)).not.toThrow()
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
