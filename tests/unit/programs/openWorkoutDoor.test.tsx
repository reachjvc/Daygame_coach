/**
 * A WORKOUT THAT IS OPEN HAS TO BE REACHABLE FROM THE SCREEN FOR TRAINING.
 *
 * Only one workout may be open at a time, so an old one refuses every Start
 * everywhere until it is finished or thrown away. That makes "where is the
 * door to it" a question the training screen has to answer, and on 2026-09-26
 * it did not:
 *
 *   an account with TWO active programs (allowed — enrollments only deactivate
 *   within a discipline) and a workout left open on Wednesday saw, at
 *   /programs: a list of programs, no mention of the workout, and no door. One
 *   click deeper, the same. Meanwhile /dashboard/tracking said "Wed's workout
 *   is still open · 0 sets ticked · Finish or discard it".
 *
 * The cause is structural rather than a missed case: the sentence lived inside
 * `TodayCard`, and `TodayCard` renders only when EXACTLY ONE program is
 * running. `openWorkoutInvitation` is that sentence pulled out into one owner,
 * and these are the rules it owns.
 */

import { describe, it, expect } from "vitest"
import { openWorkoutInvitation } from "@/src/programs/programsService"
import type { TrainingCardState } from "@/src/programs/types"

const live = (over: Partial<TrainingCardState> = {}): TrainingCardState =>
  ({
    kind: "live",
    workoutId: "w1",
    enrollmentId: "enr-1",
    dayLabel: "Workout A",
    startedAt: "2026-09-26T18:00:00.000Z",
    setsTicked: 3,
    setsAsked: 15,
    also: [],
    ...over,
  }) as TrainingCardState

const stale = (over: Partial<TrainingCardState> = {}): TrainingCardState =>
  live({ kind: "stale", startedOnWeekday: "Wednesday", setsTicked: 0, ...over } as Partial<TrainingCardState>)

describe("openWorkoutInvitation", () => {
  it("says nothing for every kind that is not an open workout", () => {
    /**
     * ENUMERATED FROM THE TYPE, not from memory. The first version of this test
     * asserted silence for `kind: "due"` — which does not exist. It was cast
     * through `as unknown as` so it compiled, and it proved nothing about any
     * real state. The union is live · stale · today · rest · done · finished ·
     * none (`src/programs/types.ts`), and the five below are all of the ones
     * that must stay silent.
     */
    expect(openWorkoutInvitation(null)).toBeNull()
    const silent = ["today", "rest", "done", "finished", "none"] as const
    for (const kind of silent) {
      expect(
        openWorkoutInvitation({ kind, also: [] } as unknown as TrainingCardState),
        `${kind} is not an open workout`
      ).toBeNull()
    }
  })

  it("tells a screen that belongs to no one program about ANY open workout", () => {
    // The case that was missing. No `enrollmentId` argument: this is the
    // programs list, which is not one program's screen.
    expect(openWorkoutInvitation(live())).toBe("Finish the workout you have open first")
    expect(openWorkoutInvitation(stale())).toBe("Finish or discard Wednesday's workout")
  })

  it("says DISCARD for a stale one, and names the day", () => {
    // The word matters. Finishing a fortnight-old empty workout writes a
    // ten-hour session into somebody's history — `summaryFor` clamps the
    // duration at 599 minutes rather than refusing it.
    const said = openWorkoutInvitation(stale({ startedOnWeekday: "Friday" } as Partial<TrainingCardState>))
    expect(said).toContain("discard")
    expect(said).toContain("Friday")
  })

  it("a program's own card does not call its own workout somebody else's", () => {
    // TodayCard passes its enrollment id, and for its OWN open workout it has a
    // better answer than this one: "Resume · 3 sets in".
    expect(openWorkoutInvitation(live({ enrollmentId: "enr-1" }), "enr-1")).toBeNull()
    expect(openWorkoutInvitation(stale({ enrollmentId: "enr-1" }), "enr-1")).toBeNull()
  })

  it("but it does mention another program's, and a loose one", () => {
    expect(openWorkoutInvitation(live({ enrollmentId: "enr-2" }), "enr-1")).toBe(
      "Finish the workout you have open first"
    )
    // A workout belonging to no program at all still blocks this one's Start.
    expect(openWorkoutInvitation(live({ enrollmentId: null }), "enr-1")).toBe(
      "Finish the workout you have open first"
    )
  })
})
