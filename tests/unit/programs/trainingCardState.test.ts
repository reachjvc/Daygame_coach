/**
 * WHAT THE TRACKING CARD SAYS ABOUT TRAINING RIGHT NOW.
 *
 * The owner's complaint about this page was that it is "just not functional at
 * all". It was, in the most literal way: with no program running the card
 * returned nothing, so the one screen meant to be the door into training
 * showed no door.
 *
 * The rest was almost worse, because it looked like it worked:
 *
 *   - It said "Start" on a day you had already trained, inviting a second
 *     workout on top of the one you had just finished.
 *   - A rest day was a dead end: "nothing today", with nowhere to go.
 *   - It showed "3 lifts", which does not tell anybody whether to bring a belt.
 *   - An endurance day showed "0 lifts", because a run has none.
 *   - With two programs running it showed one and never mentioned the other.
 *
 * WHOSE TODAY. The last group of tests is the one that cannot be got right by
 * accident: the same two instants, read in two zones, must give opposite
 * answers. That is what makes a 23:45 Copenhagen session count as Monday.
 */

import { describe, it, expect } from "vitest"
import { trainingCardState, STALE_WORKOUT_HOURS, seedEnrollment } from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramEnrollment, SessionPrescription, TrainingDoorFacts } from "@/src/programs/types"

const NOW = new Date("2026-09-14T12:00:00.000Z")

function enrollment(over: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  const program = requireProgram("stronglifts-5x5")
  const { exerciseState, cursor } = seedEnrollment(program, "beginner", "kg")
  return {
    id: "e1",
    user_id: "u1",
    program_id: "stronglifts-5x5",
    level: "beginner",
    unitSystem: "kg",
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-02-03T10:00:00.000Z",
    customSchedule: null,
    ...over,
  }
}

function prescription(over: Partial<SessionPrescription> = {}): SessionPrescription {
  return {
    programId: "stronglifts-5x5",
    dayId: "A",
    dayLabel: "Workout A",
    cycle: 1,
    week: 1,
    sessionCount: 3,
    periodised: false,
    exercises: [
      { exerciseId: "squat", name: "Squat", sets: [] },
      { exerciseId: "bench", name: "Bench Press", sets: [] },
    ],
    ...over,
  } as SessionPrescription
}

function facts(over: Partial<TrainingDoorFacts> = {}): TrainingDoorFacts {
  return {
    timezone: "UTC",
    todayDate: "2026-09-14",
    todayWeekday: 1,
    live: null,
    programs: [
      {
        enrollment: enrollment(),
        prescription: prescription(),
        next: { dayId: "B", label: "Workout B", weekday: 3 },
        lastTimeThisDay: null,
      },
    ],
    recentlyFinished: [],
    ...over,
  }
}

const finished = (over: Partial<TrainingDoorFacts["recentlyFinished"][number]> = {}) => ({
  workoutId: "w1",
  enrollmentId: "e1",
  dayLabel: "Workout A",
  loggedAt: "2026-09-14T09:00:00.000Z",
  durationMin: 45,
  sets: 14,
  ...over,
})

describe("a workout that is happening", () => {
  it("beats everything, and counts its ticked sets", () => {
    const state = trainingCardState(
      facts({
        live: {
          id: "w9",
          enrollmentId: "e1",
          dayId: "A",
          dayLabel: "Workout A",
          startedAt: "2026-09-14T11:37:00.000Z",
          setsTicked: 6,
          setsAsked: 15,
        },
        // Even with a session due AND one already finished today.
        recentlyFinished: [finished()],
      }),
      NOW
    )

    expect(state.kind).toBe("live")
    expect(state.kind === "live" && state.setsTicked).toBe(6)
    expect(state.kind === "live" && state.setsAsked).toBe(15)
  })

  it("is still-open rather than running once it has been open for hours", () => {
    const startedAt = new Date(NOW.getTime() - (STALE_WORKOUT_HOURS + 1) * 3_600_000).toISOString()
    const state = trainingCardState(
      facts({
        live: { id: "w9", enrollmentId: "e1", dayId: "A", dayLabel: "Workout A", startedAt, setsTicked: 3, setsAsked: 15 },
      }),
      NOW
    )
    // "Resume · 431 min" is the app pretending not to notice.
    expect(state.kind).toBe("stale")
  })

  it("a loose workout asked for no sets, and says so rather than showing zero", () => {
    const state = trainingCardState(
      facts({
        live: {
          id: "w9",
          enrollmentId: null,
          dayId: null,
          dayLabel: null,
          startedAt: "2026-09-14T11:50:00.000Z",
          setsTicked: 2,
          setsAsked: null,
        },
      }),
      NOW
    )
    expect(state.kind === "live" && state.setsAsked).toBeNull()
    expect(state.kind === "live" && state.dayLabel).toBeNull()
  })
})

describe("today's session", () => {
  it("names its lifts, never a count", () => {
    const state = trainingCardState(facts(), NOW)
    expect(state.kind).toBe("today")
    // "3 lifts" does not tell anybody whether to bring their belt.
    expect(state.kind === "today" && state.lifts).toEqual(["Squat", "Bench Press"])
  })

  it("carries what happened the last time this day came round", () => {
    const state = trainingCardState(
      facts({
        programs: [
          {
            enrollment: enrollment(),
            prescription: prescription(),
            next: null,
            lastTimeThisDay: { loggedAt: "2026-09-11T09:00:00.000Z", setsDone: 15, complete: true },
          },
        ],
      }),
      NOW
    )
    expect(state.kind === "today" && state.lastTime?.setsDone).toBe(15)
    expect(state.kind === "today" && state.lastTime?.complete).toBe(true)
  })

  it("an endurance day carries its blocks and minutes and no lift list", () => {
    const state = trainingCardState(
      facts({
        programs: [
          {
            enrollment: enrollment(),
            prescription: prescription({
              dayLabel: "Run 3",
              exercises: [],
              enduranceSets: [
                {
                  repeat: 4,
                  blocks: [
                    { kind: "run" as const, label: "jog 60s", durationSec: 60 },
                    { kind: "walk" as const, label: "walk 90s", durationSec: 90 },
                  ],
                },
              ],
            } as Partial<SessionPrescription>),
            next: null,
            lastTimeThisDay: null,
          },
        ],
      }),
      NOW
    )
    expect(state.kind === "today" && state.lifts).toEqual([])
    // A run showed "0 lifts" before this.
    expect(state.kind === "today" && state.endurance?.blocks).toContain("4 ×")
    expect(state.kind === "today" && state.endurance?.minutes).toBeGreaterThan(0)
  })
})

describe("a rest day", () => {
  it("carries what is next, so it is not a dead end", () => {
    const state = trainingCardState(
      facts({
        programs: [
          {
            enrollment: enrollment(),
            prescription: prescription({ restDay: true } as Partial<SessionPrescription>),
            next: { dayId: "B", label: "Workout B", weekday: 3 },
            lastTimeThisDay: null,
          },
        ],
      }),
      NOW
    )
    expect(state.kind).toBe("rest")
    expect(state.kind === "rest" && state.nextLabel).toBe("Workout B")
    expect(state.kind === "rest" && state.nextDayId).toBe("B")
    expect(state.kind === "rest" && state.nextWeekday).toBe(3)
  })
})

describe("a day you have already trained", () => {
  it("is done, and the next session is not offered", () => {
    const state = trainingCardState(facts({ recentlyFinished: [finished()] }), NOW)

    expect(state.kind).toBe("done")
    expect(state.kind === "done" && state.durationMin).toBe(45)
    expect(state.kind === "done" && state.sets).toBe(14)
    // The card used to say Start here, inviting a second workout.
    expect(state.kind).not.toBe("today")
  })

  it("still says what is next, without offering to start it", () => {
    const state = trainingCardState(facts({ recentlyFinished: [finished()] }), NOW)
    expect(state.kind === "done" && state.next?.label).toBe("Workout B")
  })
})

describe("whose day it was", () => {
  /** 23:45 Copenhagen on Monday 14 September. 21:45 UTC, the same day. */
  const MONDAY_LATE_CPH = "2026-09-14T21:45:00.000Z"
  /** 00:10 Copenhagen on Tuesday 15th. 22:10 UTC, still Monday in UTC. */
  const TUESDAY_EARLY_CPH = "2026-09-14T22:10:00.000Z"

  const on = (timezone: string, loggedAt: string) =>
    trainingCardState(
      facts({ timezone, todayDate: "2026-09-14", recentlyFinished: [finished({ loggedAt })] }),
      new Date("2026-09-14T23:00:00.000Z")
    ).kind

  it("a workout at 23:45 Copenhagen counts as Monday", () => {
    expect(on("Europe/Copenhagen", MONDAY_LATE_CPH)).toBe("done")
  })

  it("and one at 00:10 counts as Tuesday, so Monday is still due", () => {
    expect(on("Europe/Copenhagen", TUESDAY_EARLY_CPH)).toBe("today")
  })

  it("the same two instants give the OPPOSITE answers in UTC", () => {
    // Which is the whole point: the timezone decides, not the instant. If this
    // pair ever matched the pair above, the account's clock is being ignored.
    expect(on("UTC", MONDAY_LATE_CPH)).toBe("done")
    expect(on("UTC", TUESDAY_EARLY_CPH)).toBe("done")
  })
})

describe("what there is to say when there is no session", () => {
  it("with no program running the state is none — but there is still a state", () => {
    expect(trainingCardState(facts({ programs: [] }), NOW).kind).toBe("none")
  })

  it("a finished program says so", () => {
    const state = trainingCardState(
      facts({
        programs: [
          {
            enrollment: enrollment(),
            prescription: prescription({ isComplete: true } as Partial<SessionPrescription>),
            next: null,
            lastTimeThisDay: null,
          },
        ],
      }),
      NOW
    )
    expect(state.kind).toBe("finished")
    expect(state.kind === "finished" && state.sessions).toBe(3)
  })
})

describe("two programs running at once", () => {
  it("the chosen one leads and the other is named, with its own today", () => {
    const state = trainingCardState(
      facts({
        programs: [
          {
            enrollment: enrollment({ id: "e1", lastLoggedAt: "2026-09-12T10:00:00.000Z" }),
            prescription: prescription(),
            next: null,
            lastTimeThisDay: null,
          },
          {
            enrollment: enrollment({
              id: "e2",
              program_id: "custom",
              label: "Sprint Triathlon",
              lastLoggedAt: "2026-09-01T10:00:00.000Z",
            }),
            prescription: prescription({ dayLabel: "Run 3", dayId: "R3" }),
            next: null,
            lastTimeThisDay: null,
          },
        ],
      }),
      NOW
    )

    expect(state.kind === "today" && state.enrollmentId).toBe("e1")
    // Half of somebody's training used to be invisible on this card.
    expect(state.kind === "today" && state.also).toHaveLength(1)
    expect(state.kind === "today" && state.also[0].name).toBe("Sprint Triathlon")
    expect(state.kind === "today" && state.also[0].todayLabel).toBe("Run 3")
  })

  it("a program resting today is named with no session of its own", () => {
    const state = trainingCardState(
      facts({
        programs: [
          {
            enrollment: enrollment({ id: "e1", lastLoggedAt: "2026-09-12T10:00:00.000Z" }),
            prescription: prescription(),
            next: null,
            lastTimeThisDay: null,
          },
          {
            enrollment: enrollment({ id: "e2", label: "Couch to 5K" }),
            prescription: prescription({ restDay: true } as Partial<SessionPrescription>),
            next: null,
            lastTimeThisDay: null,
          },
        ],
      }),
      NOW
    )
    expect(state.kind === "today" && state.also[0].todayLabel).toBeNull()
  })
})
