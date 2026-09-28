/**
 * ONE BAD ROW SKIPS ITSELF; IT DOES NOT TAKE THE FILE WITH IT.
 *
 * `parseDurationInput` caps the `h:mm:ss` form at three digits of hours but puts no
 * ceiling on the unit form, so a cell reading `999999999999999h` pushed the computed
 * stop past the ±8.64e15 ms a `Date` can hold and `toISOString()` raised `RangeError:
 * Invalid time value`. That escaped `importEntriesCsv` altogether: every row in the
 * file was lost including the good ones, and the handler had no `catch`, so the
 * rejected promise showed nothing — a button that appeared to do nothing at all.
 *
 * Exactly the failure the JSON import beside it carries a comment about having fixed.
 * The two handlers sat ten lines apart and only one of them had the guard.
 */

import { describe, expect, test } from "vitest"

import { importEntriesCsv } from "@/src/timetrack/importExportService"

import { baseState } from "./helpers"

const NOW = "2026-09-28T12:00:00.000Z"
const HEADER = "Description,Start date,Start time,Duration"

describe("a CSV with a duration too big to be a date", () => {
  test("returns a result at all, where it used to throw past its caller", () => {
    /**
     * Asserted as a RETURN rather than as the absence of a throw: the caller needs a `skipped`
     * list to put in the toast, and "did not throw" would also be satisfied by
     * swallowing the row silently — which is the other way this could have been fixed
     * and the wrong one.
     */
    const csv = `${HEADER}\nmoon shot,2026-09-28,09:00,999999999999999h\n`
    const result = importEntriesCsv(baseState(), csv, NOW)
    expect(Array.isArray(result.skipped)).toBe(true)
    expect(result.skipped).toHaveLength(1)
  })

  test("skips that row, with a reason the toast can show", () => {
    const csv = `${HEADER}\nmoon shot,2026-09-28,09:00,999999999999999h\n`
    const result = importEntriesCsv(baseState(), csv, NOW)
    expect(result.imported).toBe(0)
    expect(result.skipped).toEqual([{ line: 2, reason: "Duration is too long to be a date" }])
  })

  test("and the good rows around it still import, which is the whole point", () => {
    const csv =
      `${HEADER}\n` +
      `before,2026-09-28,09:00,1h\n` +
      `moon shot,2026-09-28,10:00,999999999999999h\n` +
      `after,2026-09-28,11:00,30m\n`
    const result = importEntriesCsv(baseState(), csv, NOW)
    expect(result.imported).toBe(2)
    expect(result.state.entries.map((e) => e.description).sort()).toEqual(["after", "before"])
    expect(result.skipped.map((s) => s.line)).toEqual([3])
  })

  /**
   * A CONTROL: it pins that the guard refuses only what it must, so it passes against
   * the old source too and `tests-must-fail-without-the-fix.mjs` reports it as such.
   */
  test("an ordinary early date still imports, so the guard refuses only what it must", () => {
    /**
     * `parseDurationInput` will not return a negative, so this comes at it from the
     * other side: a start date so early that even an ordinary duration cannot land in
     * range would be the mirror case. It parses, so it must import — asserted so the
     * guard is known to refuse only what it must.
     */
    const csv = `${HEADER}\nold,1970-01-02,09:00,1h\n`
    const result = importEntriesCsv(baseState(), csv, NOW)
    expect(result.imported).toBe(1)
    expect(result.skipped).toEqual([])
  })
})
