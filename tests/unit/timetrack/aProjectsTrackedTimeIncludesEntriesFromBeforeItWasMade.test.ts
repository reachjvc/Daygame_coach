/**
 * A PROJECT'S "TRACKED" COUNTS ITS ENTRIES FROM BEFORE IT WAS MADE.
 *
 * Found 2026-11-05 while capturing the screens for the Toggl comparison
 * (Plans/toggl-parity.md, Phase 0): Projects said Gym 0:00 though Gym held
 * 2:20 this week. A project that does not recur has one period, and it began
 * on the day the project was made, so entries from earlier days that were put
 * on the project afterwards (or imported) were never counted. Toggl's project
 * list shows the time tracked on the project. A start date set on the project
 * still bounds it.
 */
import { describe, expect, test } from "vitest"

import { projectTrackedRange } from "@/src/timetrack/timetrackService"

import { baseState, entry } from "./helpers"

describe("a project that does not recur", () => {
  const state = baseState({
    entries: [entry(1, "2026-07-20", "09:00", "10:00", { projectId: "30" }), entry(2, "2026-08-05", "09:00", "09:30", { projectId: "30" })],
  })
  // made on 1 August, no start or end date
  const alpha = { ...state.projects.find((p) => p.id === "30")!, startDate: null, endDate: null }
  state.projects = state.projects.map((p) => (p.id === alpha.id ? alpha : p))

  test("counts from its first entry when that is older than the project", () => {
    expect(alpha.createdAt.slice(0, 10)).toBe("2026-08-01")
    expect(projectTrackedRange(state, alpha, "2026-08-10")).toEqual({ start: "2026-07-20", end: "2026-08-10" })
  })

  test("counts from its start date when one is set", () => {
    const fixed = { ...alpha, startDate: "2026-08-03" }
    expect(projectTrackedRange(state, fixed, "2026-08-10")).toEqual({ start: "2026-08-03", end: "2026-08-10" })
  })

  test("a recurring project keeps its current period", () => {
    const weekly = { ...alpha, recurring: true, recurringPeriod: "weekly" as const, recurringStart: "2026-08-03" }
    expect(projectTrackedRange(state, weekly, "2026-08-10").start).toBe("2026-08-10")
  })
})
