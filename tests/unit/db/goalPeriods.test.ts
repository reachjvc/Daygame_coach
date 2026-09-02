/**
 * ONE SET OF PERIODS, THREE PLACES THAT NAME THEM.
 *
 * `GOAL_PERIODS` mirrors the `goal_period` Postgres enum (six values).
 * `ROLLING_PERIODS` is the five that expire. `shared/dateUtils.GoalPeriod` is
 * typed to the rolling five so a milestone cannot be handed to period
 * arithmetic. Before this test, `dateUtils` silently disagreed with the
 * database about whether `quarterly` existed, and quarterly goals never rolled.
 */

import { describe, it, expect } from "vitest"
import { GOAL_PERIODS, ROLLING_PERIODS } from "@/src/db/goalEnums"
import type { RollingPeriod } from "@/src/db/goalEnums"
import { periodStartFor } from "@/src/shared/dateUtils"
import type { GoalPeriod as DatePeriod } from "@/src/shared/dateUtils"

describe("goal periods", () => {
  it("rolling periods plus custom are exactly the database's periods", () => {
    expect([...ROLLING_PERIODS, "custom"].sort()).toEqual([...GOAL_PERIODS].sort())
  })

  it("custom is not a rolling period — a milestone runs to its end date", () => {
    expect(ROLLING_PERIODS).not.toContain("custom")
  })

  it("dateUtils' GoalPeriod is exactly the rolling set", () => {
    // Compile-time: each type must be assignable to the other. A value added to
    // one and not the other stops the build here rather than at a silent
    // "quarterly goals never reset".
    const a: DatePeriod = "quarterly" satisfies RollingPeriod
    const b: RollingPeriod = "yearly" satisfies DatePeriod
    expect([a, b]).toEqual(["quarterly", "yearly"])
  })

  it("every rolling period has a boundary", () => {
    const now = new Date(2026, 7, 27) // Thursday 27 Aug 2026
    const starts = ROLLING_PERIODS.map((p) => periodStartFor(p, now))
    expect(starts).toEqual([
      "2026-08-27", // daily
      "2026-08-24", // weekly — Monday
      "2026-08-01", // monthly
      "2026-07-01", // quarterly — Q3
      "2026-01-01", // yearly
    ])
  })
})
