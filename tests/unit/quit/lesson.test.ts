import { describe, expect, it } from "vitest"
import nicotine from "@/src/quit/data/nicotine.json"
import {
  dayFrom,
  doneCount,
  EMPTY_LESSON,
  parseDayParam,
  parseLessonState,
  placeFor,
  proofRepeats,
  setDone,
  setNote,
  shownTitle,
  sortLessons,
  validLesson,
} from "@/src/quit/tools/lesson/logic"
import type { QuitLesson } from "@/src/quit/types"

const lessons = sortLessons((nicotine.lessons as unknown[]).filter(validLesson) as QuitLesson[])
const base = { today: "2026-11-19", runStart: null, quitDate: null, goal: null, lastSlip: null, lastDay: 14 } as const

describe("dayFrom", () => {
  it("counts the start day as day 1 and has no day 0", () => {
    expect(dayFrom("2026-11-19", "2026-11-19")).toBe(1)
    expect(dayFrom("2026-11-15", "2026-11-19")).toBe(5)
    expect(dayFrom("2026-11-20", "2026-11-19")).toBe(-1)
    expect(dayFrom("2026-11-22", "2026-11-19")).toBe(-3)
  })
})

describe("placeFor", () => {
  it("without a date starts at the first lesson, saying why", () => {
    expect(placeFor(base)).toEqual({ kind: "none", reason: "nodate" })
    expect(placeFor({ ...base, quitDate: "2026-11-10", goal: "later" })).toEqual({ kind: "none", reason: "nodate" })
  })
  it("follows the living run before the record's date", () => {
    expect(placeFor({ ...base, runStart: "2026-11-15", quitDate: "2026-11-01", goal: "stop" })).toEqual({ kind: "day", day: 5 })
  })
  it("counts from a past quit date when no run lives yet", () => {
    expect(placeFor({ ...base, quitDate: "2026-11-19", goal: "stop" })).toEqual({ kind: "day", day: 1 })
  })
  it("counts down before a future date and waits further out", () => {
    expect(placeFor({ ...base, quitDate: "2026-11-21", goal: "stop" })).toEqual({ kind: "day", day: -2 })
    expect(placeFor({ ...base, quitDate: "2026-11-29", goal: "break" })).toEqual({ kind: "early", startsOn: "2026-11-26", daysToGo: 10 })
  })
  it("ends after the last lesson", () => {
    expect(placeFor({ ...base, runStart: "2026-10-30" })).toEqual({ kind: "end", day: 21 })
  })
  it("after a slip with no new day 1, starts over; a new future day 1 counts down", () => {
    expect(placeFor({ ...base, quitDate: "2026-11-01", goal: "stop", lastSlip: "2026-11-10" })).toEqual({ kind: "none", reason: "slip", slipDay: "2026-11-10" })
    expect(placeFor({ ...base, quitDate: "2026-11-20", goal: "stop", lastSlip: "2026-11-18" })).toEqual({ kind: "day", day: -1 })
    expect(placeFor({ ...base, lastSlip: "2026-11-18" })).toEqual({ kind: "none", reason: "slip", slipDay: "2026-11-18" })
  })
  it("an old slip before the current date does not stop the count", () => {
    expect(placeFor({ ...base, quitDate: "2026-11-15", goal: "stop", lastSlip: "2026-11-01" })).toEqual({ kind: "day", day: 5 })
  })
})

describe("saved state", () => {
  it("keeps notes and done marks, drops anything bad", () => {
    const s = parseLessonState({ done: { "5": 1, "x": 2, "6": "no" }, notes: { "-1": "hi", "7": 3 } })
    expect(s).toEqual({ done: { "5": 1 }, notes: { "-1": "hi" } })
    expect(parseLessonState("junk")).toEqual(EMPTY_LESSON)
  })
  it("undoing done keeps the note", () => {
    let s = setNote(EMPTY_LESSON, 3, "walked")
    s = setDone(s, 3, true, 10)
    s = setDone(s, 3, false, 11)
    expect(s.notes["3"]).toBe("walked")
    expect(s.done).toEqual({})
  })
  it("counts only lesson days", () => {
    const s = setDone(setDone(EMPTY_LESSON, 1, true, 1), 99, true, 1)
    expect(doneCount(s, lessons)).toBe(1)
  })
  it("caps a note at 1000 characters", () => {
    expect(setNote(EMPTY_LESSON, 1, "a".repeat(1200)).notes["1"]).toHaveLength(1000)
  })
})

describe("proofRepeats", () => {
  it("spots a proof the body already says", () => {
    expect(proofRepeats("In 469 heavily hooked heart patients who wanted to stop, stress fell. Walk.", "In 469 heavily hooked heart patients who wanted to stop, stress fell.")).toBe(true)
    expect(proofRepeats("Something else entirely.", "In 469 heart patients, stress fell.")).toBe(false)
  })
})

describe("the lessons in the data file", () => {
  it("run from day -3 to day 14 with no day 0", () => {
    expect(lessons.map((l) => l.day)).toEqual([-3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
  })
  it("each shows a counted line and a source", () => {
    for (const l of lessons) {
      expect(l.counted, `day ${l.day}`).toBeTruthy()
      expect(l.refs.length, `day ${l.day}`).toBeGreaterThan(0)
    }
  })
  it("no longer cite the alcohol sleep trial or the unchecked vaping count", () => {
    const text = JSON.stringify(lessons)
    expect(text).not.toContain("Miller MB")
    expect(text).not.toContain("3,446")
  })
  it("titles drop the day prefix", () => {
    expect(shownTitle("Day 5: the empty hour")).toBe("The empty hour")
    expect(shownTitle("Pick the day")).toBe("Pick the day")
  })
  it("reads ?day only for an existing lesson", () => {
    expect(parseDayParam("-3", lessons)).toBe(-3)
    expect(parseDayParam("0", lessons)).toBeNull()
    expect(parseDayParam("abc", lessons)).toBeNull()
  })
})
