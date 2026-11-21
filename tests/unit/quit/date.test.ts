import { describe, expect, it } from "vitest"
import { emptyRecord as emptyBox, living } from "@/src/vice/blackbox/blackboxStore"
import { startRunOn } from "@/src/quit/blackboxLogic"
import { addDays } from "@/src/quit/record"
import { countText } from "@/src/quit/tools/common"
import { priceBasisOne } from "@/src/quit/tools/priceBasis"
import {
  breakEnd,
  calendarWeeks,
  chipDate,
  dateAllowed,
  dateBounds,
  dateChips,
  dayLine,
  daysBetween,
  googleCalendarUrl,
  icsFor,
  mondayIndex,
  parseTyped,
  showsInfo,
} from "@/src/quit/tools/date/logic"
import { EMPTY_DATE, firstUnanswered, parseDateState, screensFor } from "@/src/quit/tools/date/state"
import { stretchAt, stretches } from "@/src/quit/tools/date/hardDays"
import { getAddiction } from "@/src/quit/data"

// 2026-11-16 is a Monday.
const MONDAY = "2026-11-16"

describe("date chips", () => {
  for (let i = 0; i < 7; i++) {
    const today = addDays(MONDAY, i)
    it(`weekday ${i} (${today}): date order, no two on one day, today first, 14 days last`, () => {
      expect(mondayIndex(today)).toBe(i)
      const chips = dateChips(today)
      const dates = chips.map((c) => c.date)
      expect(dates).toEqual([...dates].sort())
      expect(new Set(dates).size).toBe(dates.length)
      expect(chips[0]).toEqual({ id: "today", date: today })
      expect(chips[1].id).toBe("tomorrow")
      expect(chips.at(-1)).toEqual({ id: "in14", date: addDays(today, 14) })
      // the earlier chip of a pair that meets is the one that stays
      const all = (["today", "tomorrow", "in3", "weekend", "monday", "in14"] as const).map((c) => chipDate(c, today))
      for (const c of chips) expect(all.indexOf(c.date)).toBe((["today", "tomorrow", "in3", "weekend", "monday", "in14"] as const).indexOf(c.id))
    })
  }
  it("this weekend is Saturday; on Saturday it is tomorrow, on Sunday next Saturday; next Monday is never today", () => {
    expect(chipDate("weekend", MONDAY)).toBe("2026-11-21")
    expect(chipDate("weekend", "2026-11-21")).toBe("2026-11-22")
    expect(chipDate("weekend", "2026-11-22")).toBe("2026-11-28")
    expect(chipDate("monday", MONDAY)).toBe("2026-11-23")
    expect(chipDate("monday", "2026-11-22")).toBe("2026-11-23")
  })
  it("a Thursday puts the weekend before In 3 days", () => {
    expect(dateChips("2026-11-19").map((c) => c.id)).toEqual(["today", "tomorrow", "weekend", "in3", "monday", "in14"])
  })
})

describe("date limits", () => {
  const today = "2026-11-19"
  it("allows one year back to 42 days ahead", () => {
    const { min, max } = dateBounds(today)
    expect(min).toBe("2025-11-19")
    expect(max).toBe("2026-12-31")
    expect(dateAllowed(min, today)).toBe(true)
    expect(dateAllowed(max, today)).toBe(true)
    expect(dateAllowed(addDays(max, 1), today)).toBe(false)
    expect(dateAllowed(addDays(min, -1), today)).toBe(false)
    expect(dateAllowed(null, today)).toBe(false)
  })
  it("the information lines show past 28 days ahead only", () => {
    expect(showsInfo(addDays(today, 28), today)).toBe(false)
    expect(showsInfo(addDays(today, 20), today)).toBe(false)
    expect(showsInfo(addDays(today, 29), today)).toBe(true)
    expect(showsInfo(addDays(today, 30), today)).toBe(true)
    expect(showsInfo(addDays(today, -5), today)).toBe(false)
  })
})

describe("break and day lines", () => {
  it("break end", () => {
    expect(breakEnd("2026-11-19", "w2", null)).toBe("2026-12-03")
    expect(breakEnd("2026-11-19", "set", "2026-11-19")).toBeNull()
    expect(breakEnd("2026-11-19", "set", "2026-11-25")).toBe("2026-11-25")
    expect(breakEnd("2026-11-19", "set", null)).toBeNull()
  })
  it("days to go, day 1, day N", () => {
    expect(dayLine("2026-11-22", "2026-11-19")).toEqual({ kind: "ahead", n: 3 })
    expect(dayLine("2026-11-19", "2026-11-19")).toEqual({ kind: "dayOne" })
    expect(dayLine("2026-10-30", "2026-11-19")).toEqual({ kind: "day", n: 21 })
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1)
  })
})

describe("typed numbers", () => {
  it("comma and dot both work; blank is empty; letters are bad", () => {
    expect(parseTyped("7,50", 1000)).toEqual({ kind: "ok", value: 7.5 })
    expect(parseTyped("7.50", 1000)).toEqual({ kind: "ok", value: 7.5 })
    expect(parseTyped(" 12 ", 1000)).toEqual({ kind: "ok", value: 12 })
    // a comma and exactly three digits could be a thousand or one: refused, not guessed
    expect(parseTyped("1,000", 1000000)).toEqual({ kind: "bad" })
    expect(parseTyped("1,00", 1000)).toEqual({ kind: "ok", value: 1 })
    expect(parseTyped("", 1000)).toEqual({ kind: "empty" })
    expect(parseTyped("abc", 1000)).toEqual({ kind: "bad" })
    expect(parseTyped("1.2.3", 1000)).toEqual({ kind: "bad" })
    expect(parseTyped("-4", 1000)).toEqual({ kind: "bad" })
    expect(parseTyped("5000", 1000)).toEqual({ kind: "bad" })
  })
})

describe("calendar file", () => {
  it("one event, one reminder, summary Day 1, stamp is the time it was made", () => {
    const now = new Date("2026-11-19T10:15:30.123Z")
    const ics = icsFor("2026-11-22", now)
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR")
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1)
    expect(ics).toContain("SUMMARY:Day 1\r\n")
    expect(ics).toContain("DTSTAMP:20261119T101530Z\r\n")
    expect(ics).toContain("DTSTART;VALUE=DATE:20261122\r\n")
    expect(ics).toContain("DTEND;VALUE=DATE:20261123\r\n")
    // all-day event starts at 00:00; 5 hours before is 19:00 the evening before
    expect(ics).toContain("TRIGGER:-PT5H\r\n")
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
  })
  it("google link names the event Day 1", () => {
    const url = googleCalendarUrl("2026-11-22")
    expect(url).toContain("text=Day%201")
    expect(url).toContain("dates=20261122/20261123")
  })
})

describe("six-week calendar", () => {
  it("Monday first, 42 days, day 1 in its weekday column", () => {
    for (let i = 0; i < 7; i++) {
      const day1 = addDays(MONDAY, i)
      const weeks = calendarWeeks(day1)
      expect(weeks.every((w) => w.length === 7)).toBe(true)
      const cells = weeks.flat().filter((c) => c !== null)
      expect(cells).toHaveLength(42)
      expect(weeks[0][i]?.dayNo).toBe(1)
      expect(cells.at(-1)?.date).toBe(addDays(day1, 41))
      expect(weeks.length).toBeLessThanOrEqual(7)
    }
  })
})

describe("the hard days", () => {
  const data = getAddiction("nicotine")!
  const list = stretches(data.symptomCourse as never, data.symptomCourseNote as string)
  it("three stretches with the data file's own sources", () => {
    expect(list.map((s) => [s.id, s.from, s.to])).toEqual([
      ["hard", 1, 7],
      ["fade", 8, 10],
      ["cue", 35, 42],
    ])
    for (const s of list) {
      expect(s.refs.length).toBeGreaterThan(0)
      expect(s.basis.who && s.basis.n && s.basis.design && s.basis.when && s.basis.caveat).toBeTruthy()
    }
    expect(list[0].refs[0].pmid).toBe("17365764")
    expect(list[1].refs[0].pmid).toBe("17156182")
    expect(list[2].refs[0].pmid).toBe("20817135")
    expect(list[0].basis.design).toMatch(/single-author review/i)
    expect(list[2].basis.caveat).toMatch(/days 7, 14 and 35/)
    expect(stretchAt(list, 5)?.id).toBe("hard")
    expect(stretchAt(list, 12)).toBeNull()
    expect(stretchAt(list, 35)?.id).toBe("cue")
  })
  it("makes no promise in minutes or hours", () => {
    expect(JSON.stringify(list)).not.toMatch(/\b\d+\s*(minutes?|min|hours?)\b/i)
  })
})

describe("answers and screens", () => {
  const today = "2026-11-19"
  it("the path follows the goal", () => {
    expect(screensFor(null)).toEqual(["goal"])
    expect(screensFor("stop")).toEqual(["goal", "date", "use", "plan"])
    expect(screensFor("break")).toEqual(["goal", "date", "length", "use", "plan"])
    expect(screensFor("later")).toEqual(["goal"])
    expect(screensFor("break", true)).toEqual(["goal", "date", "length"])
  })
  it("resumes on the first screen not passed with Continue; answering alone moves nothing", () => {
    expect(firstUnanswered(EMPTY_DATE, today)).toBe(1)
    expect(firstUnanswered({ ...EMPTY_DATE, goal: "stop" }, today)).toBe(1)
    expect(firstUnanswered({ ...EMPTY_DATE, goal: "stop", done: 1 }, today)).toBe(2)
    expect(firstUnanswered({ ...EMPTY_DATE, goal: "stop", start: today, done: 2 }, today)).toBe(3)
    expect(firstUnanswered({ ...EMPTY_DATE, goal: "stop", start: today, done: 4 }, today)).toBe(5)
    expect(firstUnanswered({ ...EMPTY_DATE, goal: "break", start: today, done: 2 }, today)).toBe(3)
    expect(firstUnanswered({ ...EMPTY_DATE, goal: "break", start: today, len: "w2", done: 5 }, today)).toBe(6)
    expect(firstUnanswered({ ...EMPTY_DATE, goal: "later", done: 1 }, today)).toBe(2)
    // a date past the limit is not an answer that holds
    expect(firstUnanswered({ ...EMPTY_DATE, goal: "stop", start: "2027-06-01", done: 4 }, today)).toBe(2)
  })
  it("reads garbage as empty", () => {
    expect(parseDateState(null)).toEqual(EMPTY_DATE)
    expect(parseDateState({ goal: "nope", start: "x", len: 3, perDay: 9 })).toEqual(EMPTY_DATE)
  })
})

describe("starting a Black Box run", () => {
  it("starts a living run on a past day or today, never on a future day or a second time", () => {
    const today = "2026-11-19"
    const past = startRunOn(emptyBox(), "nicotine", "2026-10-30", today)
    const runs = living(past.attempts)
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ viceId: "nicotine", startedOn: "2026-10-30", endedOn: null, label: "Smoking or vaping" })
    expect(startRunOn(emptyBox(), "nicotine", "2026-11-20", today).attempts).toHaveLength(0)
    expect(startRunOn(past, "nicotine", "2026-11-01", today)).toBe(past)
    expect(living(startRunOn(emptyBox(), "nicotine", today, today).attempts)).toHaveLength(1)
  })
})

describe("shared price basis and count text", () => {
  it("every unit's basis names its amount in dollars and its source", () => {
    expect(priceBasisOne.cigarettes).toMatch(/\$0\.52/)
    expect(priceBasisOne.cigarettes).toMatch(/each state counts the same/)
    expect(priceBasisOne.cigarettes).toMatch(/State and federal tax are included; city taxes/)
    expect(priceBasisOne.cigarettes).toMatch(/\$9\.95/)
    expect(priceBasisOne.cigarettes).toMatch(/does not date its prices/)
    expect(priceBasisOne.vape).toMatch(/\$14\.07/)
    expect(priceBasisOne.vape).toMatch(/4 weeks to 3 Sep 2022/)
    expect(priceBasisOne.vape).toMatch(/vape shops and online sales are left out/i)
    expect(priceBasisOne.vape).toMatch(/61%/)
    expect(priceBasisOne.pouches).not.toMatch(/sales tax/)
    expect(priceBasisOne.pouches).toMatch(/Starts at \$5\.69/)
  })
  it("a count shows at most two decimals", () => {
    expect(countText(1 / 7)).toBe("0.14")
    expect(countText(2.5)).toBe("2.5")
    expect(countText(10)).toBe("10")
  })
})
