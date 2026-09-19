/**
 * WHAT YOUR TRAINING WEEK LOOKS LIKE — said once, from the enrollment.
 *
 * Four places invented this from the plan's own copy of the program. The
 * visible failure was the count: StrongLifts is two day TEMPLATES trained
 * three times a week, so the plan read "2 days a week"; the Recommended
 * Routine has one template and read "1×/wk". The number of named days is not
 * the number of training days.
 *
 * The deeper failure was reading the CATALOGUE rather than the person's own
 * copy: somebody who swapped Bench for Dip was still told they were benching.
 */

import { describe, it, expect } from "vitest"
import { describeTrainingWeek, seedEnrollment } from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramDefinition, ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

function enrolled(program: ProgramDefinition, over: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  // Whatever level the program actually ships — the triathlon plans have only
  // "beginner", and asking for one they do not have throws.
  const level = program.levels[0].id
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
    ...over,
  }
}

describe("a program worked through in turn", () => {
  it("names its days and says 'in turn' — never a per-week count", () => {
    const program = requireProgram("stronglifts-5x5")
    const said = describeTrainingWeek(program, enrolled(program))

    expect(said).toMatch(/in turn/)
    // The two shapes the four old callers printed. A/B alternating is three
    // sessions one week and two the next; there is no honest weekly number.
    expect(said).not.toMatch(/\d×\/wk/)
    expect(said).not.toMatch(/days a week/)
  })
})

describe("a week pinned to weekdays", () => {
  const pinned = (weekdays: number[]): ProgramSchedule => {
    const base = requireProgram("stronglifts-5x5").schedule
    if (base.kind !== "linear_rotation") throw new Error("fixture assumes a rotation")
    return {
      ...base,
      days: base.days.map((d, i) => ({ ...d, label: i === 0 ? "Upper" : "Lower", weekday: weekdays[i] })),
    }
  }

  it("reads in weekday order, whatever order the days were typed in", () => {
    const program = requireProgram("stronglifts-5x5")
    // Upper is Friday, Lower is Monday — typed the other way round.
    const said = describeTrainingWeek(program, enrolled(program, { customSchedule: pinned([5, 1]) }))

    expect(said).toBe("Mon · Fri — Lower / Upper")
  })

  it("names the days as the person renamed them", () => {
    const program = requireProgram("stronglifts-5x5")
    const said = describeTrainingWeek(program, enrolled(program, { customSchedule: pinned([1, 4]) }))
    expect(said).toBe("Mon · Thu — Upper / Lower")
  })
})

describe("an endurance plan", () => {
  it("counts weeks and this week's sessions, because that is how it is written", () => {
    const program = requireProgram("sprint-triathlon")
    const at = enrolled(program)
    const said = describeTrainingWeek(program, { ...at, cursor: { ...at.cursor, week: 3 } })

    expect(said).toMatch(/^Week 3 of \d+ · \d+ sessions? this week$/)
  })

  it("starts at week 1 rather than week 0 for a cursor that has not moved", () => {
    const program = requireProgram("sprint-triathlon")
    expect(describeTrainingWeek(program, enrolled(program))).toMatch(/^Week 1 of /)
  })
})

describe("it reads the person's own copy, not the catalogue", () => {
  it("names the lift they swapped in", () => {
    const program = requireProgram("stronglifts-5x5")
    const base = program.schedule
    if (base.kind !== "linear_rotation") throw new Error("fixture assumes a rotation")

    // Renaming the day is the visible half of the same fault: the plan's copy
    // of the day names never heard about an edit made on the Training page.
    const mine: ProgramSchedule = {
      ...base,
      days: base.days.map((d, i) => (i === 0 ? { ...d, label: "Dip day" } : d)),
    }
    const said = describeTrainingWeek(program, enrolled(program, { customSchedule: mine }))

    expect(said).toContain("Dip day")
    expect(said).not.toContain(base.days[0].label)
  })
})
