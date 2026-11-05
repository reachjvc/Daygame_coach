/**
 * DURATIONS READ LIKE TOGGL'S: A NEW PERSON SEES 0:47:06, AND THE CHOICES CARRY TOGGL'S NAMES.
 *
 * Toggl Track calls 0:47:06 "Improved" and shows it by default [V1 3:17, the
 * Settings › Date and time screen of the Android app]. Ours called h:mm
 * "Improved (1:30)" and h:mm:ss "Classic (1:30:00)", and a new person got h:mm
 * (Plans/toggl-parity.md, Phase 7). The stored keys stay as they were, so
 * nobody's saved choice changes: "classic" is still h:mm:ss and "improved" is
 * still h:mm; only the words beside them and a new person's default change.
 */
import { describe, expect, test } from "vitest"

import { DURATION_FORMATS } from "@/src/timetrack/config"
import { createEmptyWorkspace } from "@/src/timetrack/data/emptyWorkspace"
import { formatDuration } from "@/src/timetrack/timetrackFormatService"

const label = (id: string) => DURATION_FORMATS.find((f) => f.id === id)?.label

describe("duration display format", () => {
  test("a new person sees 0:47:06", () => {
    const fresh = createEmptyWorkspace("2026-11-05T12:00:00.000Z")
    expect(formatDuration(47 * 60 + 6, fresh.user.durationFormat)).toBe("0:47:06")
  })

  test("0:47:06 is called Improved, as in Toggl, and comes first", () => {
    expect(DURATION_FORMATS[0]).toEqual({ id: "classic", label: "Improved (0:47:06)" })
    expect(label("improved")).toBe("Hours and minutes (0:47)")
    expect(label("decimal")).toBe("Decimal (0.79)")
  })

  test("the stored keys still mean what they meant", () => {
    expect(formatDuration(47 * 60 + 6, "classic")).toBe("0:47:06")
    expect(formatDuration(47 * 60 + 6, "improved")).toBe("0:47")
  })
})
