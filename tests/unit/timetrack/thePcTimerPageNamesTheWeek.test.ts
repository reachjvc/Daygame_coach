// @vitest-environment jsdom
/**
 * THE PC TIMER PAGE'S WEEK ROW: "‹ This week · W45 ›" (D-PC-SHELL in
 * Plans/toggl-parity.md, Phase 5 item 2).
 *
 * Toggl Track's web timer page names the week it shows, with its ISO week
 * number, and steps it a week at a time; the list and the calendar show that
 * week. The "Calendar | List view" choice is kept per browser, List view first.
 */

import { afterEach, describe, expect, test } from "vitest"

import { TIMER_VIEW_KEY } from "@/src/timetrack/config"
import { keepTimerView, readTimerView, stepWeek, weekLabel, weekNumber, weekOf } from "@/src/timetrack/pcTimerPageService"

afterEach(() => window.localStorage.clear())

describe("the week row", () => {
  test("numbers the week as Toggl does: 2–8 Nov 2026 is W45", () => {
    expect(weekNumber("2026-11-05", 1)).toBe(45)
    expect(weekNumber("2026-11-02", 1)).toBe(45)
    expect(weekNumber("2026-11-08", 1)).toBe(45)
    expect(weekNumber("2026-11-09", 1)).toBe(46)
  })

  test("numbers the weeks at the turn of a year by their Thursday", () => {
    // Thu 1 Jan 2026 makes 29 Dec 2025 – 4 Jan 2026 week 1
    expect(weekNumber("2025-12-29", 1)).toBe(1)
    expect(weekNumber("2026-01-04", 1)).toBe(1)
    // 2020 had 53 weeks: 28 Dec 2020 – 3 Jan 2021 is W53
    expect(weekNumber("2020-12-31", 1)).toBe(53)
    expect(weekNumber("2021-01-03", 1)).toBe(53)
  })

  test("a week that starts on Sunday is numbered by the ISO week most of it is in", () => {
    // Sun 1 – Sat 7 Nov 2026
    expect(weekNumber("2026-11-01", 0)).toBe(45)
    expect(weekNumber("2026-11-07", 0)).toBe(45)
  })

  test("runs from the person's first day of the week", () => {
    expect(weekOf("2026-11-05", 1)).toEqual({ from: "2026-11-02", to: "2026-11-08" })
    expect(weekOf("2026-11-05", 0)).toEqual({ from: "2026-11-01", to: "2026-11-07" })
  })

  test("says This week and Last week, and the dates for any other", () => {
    expect(weekLabel("2026-11-05", "2026-11-05", 1)).toBe("This week")
    expect(weekLabel("2026-11-02", "2026-11-05", 1)).toBe("This week")
    expect(weekLabel("2026-10-28", "2026-11-05", 1)).toBe("Last week")
    expect(weekLabel("2026-10-20", "2026-11-05", 1)).toBe("19 – 25 Oct")
    expect(weekLabel("2026-11-12", "2026-11-05", 1)).toBe("9 – 15 Nov")
    expect(weekLabel("2026-10-01", "2026-11-05", 1)).toBe("28 Sep – 4 Oct")
    expect(weekLabel("2025-12-30", "2026-11-05", 1)).toBe("29 Dec – 4 Jan")
    expect(weekLabel("2025-11-05", "2026-11-05", 1)).toBe("3 – 9 Nov 2025")
  })

  test("‹ and › step a week", () => {
    expect(stepWeek("2026-11-05", -1)).toBe("2026-10-29")
    expect(stepWeek("2026-11-05", 1)).toBe("2026-11-12")
  })
})

describe("the Calendar | List view choice", () => {
  test("is List view in a browser that chose nothing", () => {
    expect(readTimerView()).toBe("list")
  })

  test("is remembered by this browser", () => {
    keepTimerView("calendar")
    expect(window.localStorage.getItem(TIMER_VIEW_KEY)).toBe("calendar")
    expect(readTimerView()).toBe("calendar")
    keepTimerView("list")
    expect(readTimerView()).toBe("list")
  })

  test("is not one of the keys that follow the account (they are cleared when another account claims the browser)", () => {
    expect(TIMER_VIEW_KEY.startsWith("toggl-clone:")).toBe(false)
  })
})
