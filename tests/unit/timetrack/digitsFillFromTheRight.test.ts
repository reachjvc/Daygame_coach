/**
 * EVERY DURATION BOX READS DIGITS THE SAME WAY: THE LAST TWO ARE MINUTES.
 *
 * The phone's sheet read "200" as 2:00 (Toggl's phone field) while the PC's
 * timer bar, list and calendar read "120" as 120 minutes, so two hours was
 * typed differently on each (owner, 2026-11-25: "makes no sense").
 */

import { describe, expect, test } from "vitest"

import { typedIntoPair } from "@/src/timetrack/drumService"
import { readTypedDuration } from "@/src/timetrack/phoneSheetService"
import { parseTypedDuration } from "@/src/timetrack/timetrackFormatService"

describe("parseTypedDuration", () => {
  test.each([
    ["200", 2 * 3600],
    ["120", 3600 + 20 * 60],
    ["45", 45 * 60],
    ["90", 90 * 60],
    ["2", 2 * 60],
    ["0", 0],
    ["1.30", 90 * 60],
    ["1:30", 90 * 60],
    ["2h", 2 * 3600],
  ])("%s", (typed, seconds) => {
    expect(parseTypedDuration(typed)).toBe(seconds)
    // and the phone's sheet agrees, box for box
    expect(readTypedDuration(typed)).toBe(seconds)
  })
})

test("200 typed into a PC duration box makes a two-hour entry", () => {
  const pair = { start: "2026-11-25T09:00:00.000Z", stop: "2026-11-25T09:30:00.000Z" }
  expect(typedIntoPair(pair, "duration", "200", "2026-11-25T12:00:00.000Z")?.stop).toBe("2026-11-25T11:00:00.000Z")
})
