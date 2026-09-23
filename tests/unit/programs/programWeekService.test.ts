/**
 * WHAT A RUNNING PROGRAM SAYS ABOUT ITSELF — decided once, on the account's
 * clock.
 *
 * `describeTrainingWeek` already owns the week sentence and has its own suite.
 * What is pinned here is everything that was wrapped around it by four
 * different callers: the name, the level, and the fortnight rule that produced
 * "you may have started this and forgotten it" about a program started seconds
 * earlier — measured with `Date.now()` against an instant, on the reader's
 * machine, so the answer depended on where the phone was.
 *
 * Every test passes `now` and `timeZone`. Nothing in the service reads a clock,
 * which is the only reason the zone half is testable at all.
 */

import { describe, it, expect } from "vitest"
import { describeProgramWeek, FORGOTTEN_AFTER_DAYS } from "@/src/programs/programWeekService"
import { seedEnrollment } from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramDefinition, ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

/** Same fixture shape as `describeTrainingWeek.test.ts`, deliberately. */
function enrolled(program: ProgramDefinition, over: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
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

/** A fixed instant and a fixed locale, so the strings are the subject. */
const AT = { now: new Date("2026-01-08T12:00:00.000Z"), timeZone: "Europe/Copenhagen", locale: "en-GB" }

describe("the week sentence", () => {
  it("says 'in turn' for an unanchored program, and never a weekly count", () => {
    const program = requireProgram("stronglifts-5x5")
    const said = describeProgramWeek(enrolled(program), AT)

    expect(said.week).toMatch(/in turn/)
    expect(said.week).not.toMatch(/\d×\/wk/)
    expect(said.week).not.toMatch(/days a week/)
  })

  it("lists the weekdays of a program pinned to them", () => {
    const program = requireProgram("stronglifts-5x5")
    const base = program.schedule
    if (base.kind !== "linear_rotation") throw new Error("fixture assumes a rotation")
    const pinned: ProgramSchedule = {
      ...base,
      days: base.days.map((d, i) => ({ ...d, label: i === 0 ? "Upper" : "Lower", weekday: i === 0 ? 1 : 4 })),
    }
    const said = describeProgramWeek(enrolled(program, { customSchedule: pinned }), AT)

    expect(said.week).toBe("Mon · Thu — Upper / Lower")
  })

  it("takes a renamed day from the enrollment's own schedule, not the catalogue", () => {
    const program = requireProgram("stronglifts-5x5")
    const base = program.schedule
    if (base.kind !== "linear_rotation") throw new Error("fixture assumes a rotation")
    const renamed: ProgramSchedule = {
      ...base,
      days: base.days.map((d, i) => ({ ...d, label: i === 0 ? "Upper Body" : d.label })),
    }
    const said = describeProgramWeek(enrolled(program, { customSchedule: renamed }), AT)

    // The copies never heard about the rename; this reads the copy-on-write one.
    expect(said.week).toContain("Upper Body")
  })

  it("reads week N of M for an endurance plan", () => {
    const program = requireProgram("couch-to-5k")
    const at = enrolled(program)
    const said = describeProgramWeek({ ...at, cursor: { ...at.cursor, week: 3 } }, AT)

    expect(said.week).toMatch(/^Week 3 of \d+ · \d+ sessions? this week$/)
  })
})

describe("what to call it, and at what level", () => {
  it("uses the person's own name for a week they wrote", () => {
    const program = requireProgram("stronglifts-5x5")
    const said = describeProgramWeek(enrolled(program, { label: "My Tuesday/Friday thing" }), AT)

    // Every week somebody built was called "Your own program" — the shared
    // shell's catalogue name — so three different weeks were indistinguishable.
    expect(said.name).toBe("My Tuesday/Friday thing")
  })

  it("labels the level the way the program itself does", () => {
    const program = requireProgram("stronglifts-5x5")
    const said = describeProgramWeek(enrolled(program), AT)

    expect(said.level).toBe(program.levels[0].label)
  })
})

describe("when it was last trained", () => {
  it("formats the date in the ACCOUNT's zone, not the runner's", () => {
    const program = requireProgram("stronglifts-5x5")
    /**
     * 23:30 UTC on the 7th is 00:30 on the 8th in Copenhagen. Formatted on the
     * machine's clock — which is what `toLocaleDateString()` with no zone does,
     * and what every one of the old callers did — this says the 7th, and names
     * a day the lifter did not train on.
     */
    const said = describeProgramWeek(
      enrolled(program, { lastLoggedAt: "2026-01-07T23:30:00.000Z", sessionsLogged: 12 }),
      AT
    )

    expect(said.lastTrained).toBe("trained")
    expect(said.lastTrainedLine).toBe("Last trained Thu 8 Jan · 12 sessions")
  })

  it("counts LOGGED sessions, not the cursor's, which counts skips", () => {
    const program = requireProgram("stronglifts-5x5")
    const at = enrolled(program)
    const said = describeProgramWeek(
      {
        ...at,
        lastLoggedAt: "2026-01-07T10:00:00.000Z",
        // `skipSession` advances the cursor through `applyLog`, so this number
        // includes sessions nobody did.
        cursor: { ...at.cursor, sessionCount: 9 },
        sessionsLogged: 4,
      },
      AT
    )

    expect(said.lastTrainedLine).toContain("4 sessions")
    expect(said.lastTrainedLine).not.toContain("9")
  })

  it("leaves out a count nobody could work out", () => {
    const program = requireProgram("stronglifts-5x5")
    const said = describeProgramWeek(
      enrolled(program, { lastLoggedAt: "2026-01-07T10:00:00.000Z" }),
      AT
    )

    // An absent count is not a count of none.
    expect(said.lastTrainedLine).toBe("Last trained Wed 7 Jan")
    expect(said.lastTrainedLine).not.toContain("0 sessions")
  })

  it("says one session, not 1 sessions", () => {
    const program = requireProgram("stronglifts-5x5")
    const said = describeProgramWeek(
      enrolled(program, { lastLoggedAt: "2026-01-07T10:00:00.000Z", sessionsLogged: 1 }),
      AT
    )

    expect(said.lastTrainedLine).toBe("Last trained Wed 7 Jan · 1 session")
  })
})

describe("a program never trained on", () => {
  const program = requireProgram("stronglifts-5x5")
  /** 23:30 UTC on the 1st is 00:30 on the 2nd in Copenhagen, which is UTC+1. */
  const STARTED = "2026-01-01T23:30:00.000Z"

  it("is 'new' on its thirteenth day, whatever the hour", () => {
    // 23:30 UTC on the 14th is 00:30 on the 15th in Copenhagen — the 13th day
    // after the 2nd. A program you have not been to the gym for yet.
    const said = describeProgramWeek(enrolled(program, { started_at: STARTED }), {
      ...AT,
      now: new Date("2026-01-14T23:30:00.000Z"),
    })

    expect(said.lastTrained).toBe("new")
    expect(said.lastTrainedLine).toBe("Not trained yet")
  })

  it("is 'forgotten' once a fortnight of calendar days has passed", () => {
    // One day later in the account's calendar: the 16th, fourteen days after
    // the 2nd. The old rule measured elapsed milliseconds from the instant, so
    // a 23:30 start stayed thirteen days old until 23:30 on the fourteenth day
    // — and the crossing moved with the reader's zone.
    const said = describeProgramWeek(enrolled(program, { started_at: STARTED }), {
      ...AT,
      now: new Date("2026-01-15T23:30:00.000Z"),
    })

    expect(said.lastTrained).toBe("forgotten")
    expect(said.lastTrainedLine).toBe("Never trained — started Fri 2 Jan")
  })

  it("is not called forgotten seconds after it was started", () => {
    const said = describeProgramWeek(enrolled(program, { started_at: STARTED }), {
      ...AT,
      now: new Date("2026-01-01T23:30:30.000Z"),
    })

    expect(said.lastTrained).toBe("new")
  })

  it("crosses at exactly FORGOTTEN_AFTER_DAYS, not a day either side", () => {
    // The boundary asserted against the constant rather than against 14, so a
    // change to the rule cannot leave this test agreeing with the old number.
    const dayAfter = (days: number) => {
      const at = new Date(Date.UTC(2026, 0, 2 + days, 12, 0, 0))
      return describeProgramWeek(enrolled(program, { started_at: STARTED }), { ...AT, now: at })
    }

    expect(dayAfter(FORGOTTEN_AFTER_DAYS - 1).lastTrained).toBe("new")
    expect(dayAfter(FORGOTTEN_AFTER_DAYS).lastTrained).toBe("forgotten")
  })
})

describe("a catalogue id this build no longer has", () => {
  it("throws, rather than falling back to a week belonging to no program", () => {
    const program = requireProgram("stronglifts-5x5")
    const gone = { ...enrolled(program), program_id: "retired-in-2025" }

    // The CALLERS catch this and name the id, so a retired program does not
    // take the whole Life Mastery page down. A silent "Day 1" would put a week
    // on screen that nothing prescribes.
    expect(() => describeProgramWeek(gone, AT)).toThrow(/Unknown program: retired-in-2025/)
  })
})
