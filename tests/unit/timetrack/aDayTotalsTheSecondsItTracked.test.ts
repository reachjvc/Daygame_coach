/**
 * THE CALENDAR'S DAY TOTAL IS SECONDS TRACKED, NOT RECTANGLES DRAWN.
 *
 * Seen in the product on 2026-09-26: the calendar's column header read **12:02**
 * for a day the entry list, the Reports summary and the CSV export all put at
 * **6:41**. Week view, same day: 11:38 against Reports' 7:19.
 *
 * `entryInterval` floors a block at one minute so a short entry is still wide
 * enough to see. `dayColumnSeconds` then summed those drawing rectangles as if
 * they were durations, so every entry under a minute was counted as sixty
 * seconds. It is not a test-data effect: an ordinary day of one hour plus two
 * short entries of 45s and 30s was reported as 3,720 seconds against a true
 * 3,675.
 *
 * The oracle here is `entrySeconds` — the same function the entry list and
 * Reports total with — so the assertion is not "this looks right" but "the
 * calendar agrees with the other screens".
 */

import { describe, expect, test } from "vitest"

import { dayColumnSeconds, entryInterval, shiftEntryBy } from "@/src/timetrack/calendarService"
import { entrySeconds } from "@/src/timetrack/timetrackService"
import type { TimeEntry } from "@/src/timetrack/types"

/** A stopped entry of exactly `seconds`, starting at a local wall-clock time. */
function at(day: string, hm: string, seconds: number, id = hm): TimeEntry {
  const [h, m] = hm.split(":").map(Number)
  const [y, mo, d] = day.split("-").map(Number)
  const start = new Date(y, mo - 1, d, h, m, 0, 0)
  const stop = new Date(start.getTime() + seconds * 1000)
  return {
    id,
    workspaceId: "1",
    userId: "10",
    description: id,
    projectId: null,
    taskId: null,
    tagIds: [],
    billable: false,
    start: start.toISOString(),
    stop: stop.toISOString(),
    duration: seconds,
    duronly: false,
    sharedWith: [],
    createdWith: "test",
    sourceEventId: null,
    serverDeletedAt: null,
    at: start.toISOString(),
  }
}

const DAY = "2026-08-10"
const NOW_SEC = Math.floor(new Date(2026, 7, 10, 23, 0, 0).getTime() / 1000)

describe("a day totals what was tracked in it", () => {
  test("two ten-second entries are twenty seconds, not two minutes", () => {
    const entries = [at(DAY, "09:00", 10, "a"), at(DAY, "10:00", 10, "b")]

    expect(dayColumnSeconds(entries, DAY, NOW_SEC)).toBe(20)
  })

  test("an ordinary day is not inflated by its short entries", () => {
    const entries = [at(DAY, "09:00", 3600, "hour"), at(DAY, "11:00", 45, "short"), at(DAY, "12:00", 30, "shorter")]

    expect(dayColumnSeconds(entries, DAY, NOW_SEC)).toBe(3675)
  })

  test("it agrees with the function the other screens total with", () => {
    /**
     * The mechanical one. Fifty entries with durations chosen to straddle the
     * minute — that is the point, a generator emitting whole minutes would pass
     * against the old code too.
     */
    const entries = Array.from({ length: 50 }, (_, i) =>
      at(DAY, `${String(6 + (i % 12)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`, (i * 13) % 97, `e${i}`),
    )

    const shown = dayColumnSeconds(entries, DAY, NOW_SEC)
    const truth = entries.reduce((sum, e) => sum + entrySeconds(e, NOW_SEC), 0)

    expect(shown).toBe(truth)
  })

  test("an entry that crosses midnight is split, and the halves sum to the whole", () => {
    const overnight = at("2026-08-10", "23:50", 30 * 60, "night") // 23:50 → 00:20

    const first = dayColumnSeconds([overnight], "2026-08-10", NOW_SEC)
    const second = dayColumnSeconds([overnight], "2026-08-11", NOW_SEC)

    expect(first + second).toBe(entrySeconds(overnight, NOW_SEC))
    expect(first).toBeGreaterThan(0)
    expect(second).toBeGreaterThan(0)
  })

  test("the day the clocks change is still a real day", () => {
    /**
     * Europe/Copenhagen, which is what this runner is on: 2026-10-25 has
     * twenty-five hours. Anything built on `start + 86400` gets this wrong;
     * local midnights do not.
     */
    const acrossTheChange = at("2026-10-25", "02:00", 2 * 3600, "dst")

    expect(dayColumnSeconds([acrossTheChange], "2026-10-25", NOW_SEC)).toBe(entrySeconds(acrossTheChange, NOW_SEC))
  })

  test("a running entry counts up to now and no further", () => {
    const running: TimeEntry = { ...at(DAY, "22:00", 0, "running"), stop: null, duration: -Math.floor(new Date(2026, 7, 10, 22, 0, 0).getTime() / 1000) }

    expect(dayColumnSeconds([running], DAY, NOW_SEC)).toBe(3600)
  })

  test("the layout floor is still there, because a short block must be visible", () => {
    const tiny = at(DAY, "09:00", 10, "tiny")

    const { startMin, endMin } = entryInterval(tiny, DAY, NOW_SEC)
    expect(endMin - startMin).toBe(1)
  })
})

describe("dragging a block moves it without rewriting how long it was", () => {
  test("a twenty-second entry stays twenty seconds", () => {
    /**
     * The drag used to take its new end from `block.heightMinutes` — the same
     * one-minute floor as above — so moving a short entry wrote the floor into
     * the data. Seconds went too: every drag rounded to the whole minute.
     */
    const short = at(DAY, "09:00", 20, "short")

    const moved = shiftEntryBy(short, 30)

    expect(new Date(moved.stop!).getTime() - new Date(moved.start).getTime()).toBe(20_000)
    expect(new Date(moved.start).getTime() - new Date(short.start).getTime()).toBe(30 * 60_000)
  })

  test("an entry that crosses midnight keeps both of its halves", () => {
    /**
     * Dragging the second-day fragment used to write BOTH ends onto the
     * fragment's own day, so a 23:00 → 01:00 entry dragged by its 00:00–01:00
     * block became a one-hour entry on day two: the first hour was gone.
     */
    const overnight = at("2026-08-10", "23:00", 2 * 3600, "night")

    const moved = shiftEntryBy(overnight, 15)

    expect(new Date(moved.stop!).getTime() - new Date(moved.start).getTime()).toBe(2 * 3600 * 1000)
    expect(new Date(moved.start).toISOString()).toBe(new Date(new Date(overnight.start).getTime() + 15 * 60_000).toISOString())
  })

  test("a running entry keeps running when it is moved", () => {
    const running: TimeEntry = { ...at(DAY, "09:00", 0, "r"), stop: null, duration: -1 }

    expect(shiftEntryBy(running, 10).stop).toBeNull()
  })
})
