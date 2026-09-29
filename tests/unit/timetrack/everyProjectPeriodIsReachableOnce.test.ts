/**
 * STEPPING BACK THROUGH A PROJECT'S PERIODS VISITS EACH ONE EXACTLY ONCE.
 *
 * Found in a browser on 2026-09-28. `Previous period` on a monthly project, pressed ten
 * times from 2026-09-28, read:
 *
 *     -3  2026-06-01 → 2026-06-30
 *     -4  2026-05-01 → 2026-05-31
 *     -5  2026-05-01 → 2026-05-31      May twice
 *     -6  2026-04-01 → 2026-04-30
 *     -7  2026-03-01 → 2026-03-31
 *     -8  2026-01-01 → 2026-01-31      February unreachable
 *
 * The button shifted `todayKey` by `offset × currentPeriodLength` DAYS — 30, September's
 * length — and let the period be re-derived from the shifted date. Thirty days back from
 * 28 September is 31 May, and again is 1 May.
 *
 * This is the same defect as `"Monthly on the last Friday lost September and repeated
 * October"` at the top of this branch: a calendar stepped in days. That one was fixed in
 * `expandRecurrence`; this stepper, the only way to look at a project's history, was
 * not — so the class was closed in one file and open in the one beside it.
 *
 * The second half is the inverted period. On a project that is NOT recurring there is
 * one period, `startDate..today`, and the stepper moved only its END: `2026-09-20 →
 * 2026-09-10`, an end nineteen days before its start, rendered with a burn-up chart
 * under it. Round 12 refused an inverted range in Reports; nothing refused this one.
 */

import { describe, expect, test } from "vitest"

import { projectPeriodAt } from "@/src/timetrack/timetrackService"
import type { Project } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const TODAY = "2026-09-28"

function project(overrides: Partial<Project>): Project {
  return { ...baseState().projects[0], ...overrides }
}

describe("stepping back through a monthly project", () => {
  const monthly = project({ recurring: true, recurringPeriod: "monthly", recurringStart: "2026-01-01" })

  /** offsets 0..-8 — the exact presses the browser round made. */
  const walked = Array.from({ length: 9 }, (_, i) => projectPeriodAt(monthly, TODAY, -i))

  test("every step lands on a different month", () => {
    const starts = walked.map((p) => p?.start ?? "none")
    expect(new Set(starts).size, `repeated a period: ${starts.join(", ")}`).toBe(starts.length)
  })

  test("and lands on consecutive months, so none is skipped", () => {
    expect(walked.map((p) => p?.start)).toEqual([
      "2026-09-01",
      "2026-08-01",
      "2026-07-01",
      "2026-06-01",
      "2026-05-01",
      "2026-04-01",
      "2026-03-01",
      "2026-02-01",
      "2026-01-01",
    ])
  })

  test("February is reachable, which it was not", () => {
    expect(walked.map((p) => p?.start)).toContain("2026-02-01")
  })

  test("each period ends the day before the next one starts", () => {
    for (const period of walked) {
      expect(period).not.toBeNull()
      expect(period!.end >= period!.start, `${period!.start} → ${period!.end} is inverted`).toBe(true)
    }
  })

  test("and stepping past the project's first period answers null rather than inventing one", () => {
    expect(projectPeriodAt(monthly, TODAY, -8)).not.toBeNull()
    expect(projectPeriodAt(monthly, TODAY, -9)).toBeNull()
  })
})

describe("a weekly project", () => {
  const weekly = project({ recurring: true, recurringPeriod: "weekly", recurringStart: "2026-08-03" })

  test("steps one week at a time, with no gaps or repeats", () => {
    const starts = Array.from({ length: 6 }, (_, i) => projectPeriodAt(weekly, TODAY, -i)?.start)
    // 2026-09-28 is itself a period start for a weekly cycle begun 2026-08-03
    expect(starts).toEqual(["2026-09-28", "2026-09-21", "2026-09-14", "2026-09-07", "2026-08-31", "2026-08-24"])
  })

  test("and a period is seven days long, every time", () => {
    for (let i = 0; i < 6; i++) {
      const period = projectPeriodAt(weekly, TODAY, -i)!
      const days = (Date.parse(period.end) - Date.parse(period.start)) / 86_400_000 + 1
      expect(days).toBe(7)
    }
  })
})

describe("a project that is not recurring", () => {
  const once = project({ recurring: false, recurringPeriod: null, recurringStart: null, startDate: "2026-09-20", endDate: null })

  test("has exactly one period", () => {
    expect(projectPeriodAt(once, TODAY, 0)).toEqual({ start: "2026-09-20", end: TODAY })
  })

  test("and no previous one, rather than an end before its start", () => {
    /** The browser saw `2026-09-20 → 2026-09-10` here, and `→ 2026-09-01` a press later. */
    expect(projectPeriodAt(once, TODAY, -1)).toBeNull()
    expect(projectPeriodAt(once, TODAY, -3)).toBeNull()
  })

  test("no offset of any project produces an inverted period", () => {
    /**
     * The property, across every shape rather than the two that were looked at — an
     * inverted range is meaningless whatever produced it.
     */
    const shapes = [
      once,
      project({ recurring: true, recurringPeriod: "monthly", recurringStart: "2026-01-01" }),
      project({ recurring: true, recurringPeriod: "weekly", recurringStart: "2026-08-03" }),
      project({ recurring: true, recurringPeriod: "quarterly", recurringStart: "2025-01-01" }),
      project({ recurring: true, recurringPeriod: "yearly", recurringStart: "2024-01-01" }),
      project({ recurring: false, recurringPeriod: null, recurringStart: null, startDate: null, endDate: null }),
    ]
    const inverted: string[] = []
    for (const shape of shapes) {
      for (let offset = -14; offset <= 3; offset++) {
        const period = projectPeriodAt(shape, TODAY, offset)
        if (period && period.end < period.start) {
          inverted.push(`${shape.recurringPeriod ?? "once"} @${offset}: ${period.start} → ${period.end}`)
        }
      }
    }
    expect(inverted).toEqual([])
  })
})
