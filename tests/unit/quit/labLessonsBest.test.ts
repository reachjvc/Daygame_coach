import { describe, expect, it } from "vitest"
import nicotine from "@/src/quit/data/nicotine.json"
import { LAB } from "@/src/quit/lab/registry"
import type { QuitLesson } from "@/src/quit/types"
import {
  dayNumber,
  isDone,
  lessonFor,
  markDone,
  nextLesson,
  parseDayInput,
  parseDone,
  parseThumbs,
  readMinutes,
  setThumb,
  validTime,
} from "@/src/quit/lab/lessons/best/logic"

const lessons = nicotine.lessons as unknown as QuitLesson[]

describe("lessons best: registry", () => {
  it("is registered as the improved nicotine variant", () => {
    const v = LAB.lessons.variants.best
    expect(v.kind).toBe("best")
    expect(v.label).toBe("Improved")
    expect(v.addiction).toBe("nicotine")
  })
})

describe("lessons best: day number", () => {
  it("quit date is day 1, the day before is -1, earlier clamps to -3", () => {
    expect(dayNumber("2026-11-10", "2026-11-10")).toBe(1)
    expect(dayNumber("2026-11-12", "2026-11-10")).toBe(3)
    expect(dayNumber("2026-11-09", "2026-11-10")).toBe(-1)
    expect(dayNumber("2026-11-07", "2026-11-10")).toBe(-3)
    expect(dayNumber("2026-09-01", "2026-11-10")).toBe(-3)
  })
})

describe("lessons best: day to lesson", () => {
  it("maps the setup days -3..0", () => {
    expect(lessonFor(lessons, -3)?.day).toBe(-3)
    expect(lessonFor(lessons, -2)?.day).toBe(-2)
    expect(lessonFor(lessons, -1)?.day).toBe(-1)
    expect(lessonFor(lessons, 0)?.day).toBe(-1)
    expect(lessonFor(lessons, -9)?.day).toBe(-3)
  })
  it("maps program days and returns none beyond the last lesson", () => {
    expect(lessonFor(lessons, 1)?.day).toBe(1)
    expect(lessonFor(lessons, 14)?.day).toBe(14)
    expect(lessonFor(lessons, 15)).toBeNull()
    expect(lessonFor(lessons, 90)).toBeNull()
    expect(lessonFor([], 1)).toBeNull()
  })
  it("finds tomorrow's lesson, across the gap at day 0", () => {
    expect(nextLesson(lessons, -3)?.day).toBe(-2)
    expect(nextLesson(lessons, -1)?.day).toBe(1)
    expect(nextLesson(lessons, 14)).toBeNull()
  })
})

describe("lessons best: read time", () => {
  it("is words over 200, rounded up, at least 1", () => {
    expect(readMinutes("one two")).toBe(1)
    expect(readMinutes(Array(200).fill("w").join(" "))).toBe(1)
    expect(readMinutes(Array(201).fill("w").join(" "))).toBe(2)
    expect(readMinutes("")).toBe(1)
  })
})

describe("lessons best: done marks and thumbs", () => {
  it("marks a day done with a trimmed note and parses stored data safely", () => {
    const d = markDone({}, -3, "  wrote it  ", 5)
    expect(isDone(d, -3)).toBe(true)
    expect(isDone(d, 1)).toBe(false)
    expect(d["-3"].note).toBe("wrote it")
    expect(parseDone(JSON.parse(JSON.stringify(d)))).toEqual(d)
    expect(parseDone("junk")).toEqual({})
    expect(parseDone({ x: { at: 1 }, "2": { at: 3, note: 4 } })).toEqual({ "2": { at: 3, note: "" } })
  })
  it("sets a thumb, switches it, and clears it on a second tap", () => {
    let m = setThumb({}, 2, "more")
    expect(m).toEqual({ "2": "more" })
    m = setThumb(m, 2, "less")
    expect(m).toEqual({ "2": "less" })
    expect(setThumb(m, 2, "less")).toEqual({})
    expect(parseThumbs({ "2": "more", "3": "great", a: "less" })).toEqual({ "2": "more" })
  })
  it("validates the reminder time and the lab day input", () => {
    expect(validTime("08:30")).toBe(true)
    expect(validTime("24:00")).toBe(false)
    expect(parseDayInput("10")).toBe(10)
    expect(parseDayInput("-3")).toBe(-3)
    expect(parseDayInput("-4")).toBeNull()
    expect(parseDayInput("")).toBeNull()
  })
})
