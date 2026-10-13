/**
 * WHICH DAY DID YOU TRAIN ON — yours, not the server's.
 *
 * The Track step's ticks lived only in the plan in the browser, so a week with
 * three finished gym sessions showed zero on "Strength session" until somebody
 * ticked it by hand: two records of one workout, kept apart, free to disagree,
 * and the one the person actually did was the one being ignored.
 *
 * Deriving the tick means answering "which day was that workout on", and the
 * existing answer (`workoutsOnDate`) keys by the running process's clock —
 * UTC on the server. A 23:45 session in Copenhagen would tick the next day's
 * column. Three separate bugs in this codebase have come from exactly that.
 */

import { describe, it, expect } from "vitest"
import { workoutsByLocalDate } from "@/src/health/healthService"

/** Monday 23:45 in Copenhagen is Monday 21:45 UTC — the same day, in UTC. */
const MONDAY_LATE_CPH = "2026-09-14T21:45:00.000Z"
/** Monday 23:45 UTC is already Tuesday 01:45 in Copenhagen. */
const MONDAY_LATE_UTC = "2026-09-14T23:45:00.000Z"

describe("grouping finished workouts by the person's own day", () => {
  it("a 23:45 Copenhagen workout lands on Monday, not Tuesday", () => {
    const byDate = workoutsByLocalDate(
      [{ logged_at: MONDAY_LATE_CPH, session_type: "weights" }],
      "Europe/Copenhagen"
    )
    expect([...byDate.keys()]).toEqual(["2026-09-14"])
  })

  it("the same instant is filed on a different day in a different zone", () => {
    const logs = [{ logged_at: MONDAY_LATE_UTC, session_type: "weights" as const }]
    expect([...workoutsByLocalDate(logs, "UTC").keys()]).toEqual(["2026-09-14"])
    // Already Tuesday where the person is.
    expect([...workoutsByLocalDate(logs, "Europe/Copenhagen").keys()]).toEqual(["2026-09-15"])
  })

  it("two workouts on one day are both kept", () => {
    const byDate = workoutsByLocalDate(
      [
        { logged_at: "2026-09-14T08:00:00.000Z", session_type: "weights" },
        { logged_at: "2026-09-14T18:00:00.000Z", session_type: "running" },
      ],
      "UTC"
    )
    expect(byDate.get("2026-09-14")).toEqual(["weights", "running"])
  })

  it("a date it cannot read is left out rather than filed under today", () => {
    // Becoming NaN and then becoming "today" would tick a day nobody trained.
    const byDate = workoutsByLocalDate([{ logged_at: "not a date", session_type: "weights" }], "UTC")
    expect(byDate.size).toBe(0)
  })

  it("no workouts is an empty map, not a map of empty days", () => {
    expect(workoutsByLocalDate([], "UTC").size).toBe(0)
  })
})
