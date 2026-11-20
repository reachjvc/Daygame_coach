import { describe, expect, it } from "vitest"
import {
  DEFAULT_REMINDERS,
  canFill,
  dayLabel,
  firstMonth,
  googleCalendarUrl,
  icsFor,
  lookBack,
  applySlips,
  cellLevel,
  entryCount,
  mergeSlips,
  noSlipCase,
  putDay,
  monthCounts,
  monthGrid,
  pairingCounts,
  parseCheckin,
  patternsOf,
  seedExample,
  shiftMonth,
  showsLastMonth,
  slipDays,
  type Days,
} from "@/src/quit/tools/checkin/logic"
import { checkinText as t, feelingLabel, pastPhrase, urgeWord, verbPhrase } from "@/src/quit/tools/checkin/text"
import { useVerb } from "@/src/quit/wording"

describe("parse of stored state", () => {
  it("gives an empty state for anything that is not an object", () => {
    for (const bad of [undefined, null, 5, "x", []]) {
      expect(parseCheckin(bad)).toEqual({ days: {}, drafts: {}, reminders: DEFAULT_REMINDERS })
    }
  })
  it("keeps good parts and drops bad ones", () => {
    const s = parseCheckin({
      days: {
        "2026-11-18": { pledge: "No smoking at the bar", forecast: 4, hard: 9, urges: 0, slipped: "yes", feelings: ["tired", "nonsense", "tired", 5], note: "x".repeat(600), slipReportId: "abc" },
        "not-a-day": { forecast: 3 },
        "2026-11-17": "junk",
        "2026-11-16": {},
      },
      draft: { kind: "evening", date: "2026-11-18", step: 3, answers: { hard: 4, slipped: true, slipReportId: "z" } },
      reminders: { morning: "7:00", evening: "22:30" },
    })
    expect(Object.keys(s.days)).toEqual(["2026-11-18"])
    expect(s.days["2026-11-18"]).toEqual({ pledge: "No smoking at the bar", forecast: 4, feelings: ["tired"], note: "x".repeat(500), slipReportId: "abc" })
    expect(s.drafts).toEqual({ "evening:2026-11-18": { kind: "evening", date: "2026-11-18", step: 3, answers: { hard: 4 } } })
    expect(s.reminders).toEqual({ morning: "08:00", evening: "22:30" })
  })
  it("drops a draft with a bad kind, date or step", () => {
    expect(parseCheckin({ draft: { kind: "noon", date: "2026-11-18", step: 1, answers: {} } }).drafts).toEqual({})
    expect(parseCheckin({ draft: { kind: "morning", date: "yesterday", step: 1, answers: {} } }).drafts).toEqual({})
    expect(parseCheckin({ draft: { kind: "morning", date: "2026-11-18", step: 3, answers: {} } }).drafts).toEqual({})
  })
  it("keeps one draft per kind and day, and still reads the old single draft", () => {
    const a = { kind: "evening", date: "2026-11-18", step: 2, answers: { hard: 3 } }
    const b = { kind: "evening", date: "2026-11-17", step: 4, answers: { hard: 2 } }
    const s = parseCheckin({ draft: a, drafts: { "evening:2026-11-17": b } })
    expect(Object.keys(s.drafts).sort()).toEqual(["evening:2026-11-17", "evening:2026-11-18"])
    expect(parseCheckin({ draft: a }).drafts["evening:2026-11-18"].step).toBe(2)
  })
  it("cuts a pledge to 140 characters", () => {
    expect(parseCheckin({ days: { "2026-11-18": { pledge: "p".repeat(200) } } }).days["2026-11-18"].pledge).toHaveLength(140)
  })
})

describe("month counts", () => {
  const days: Days = {
    "2026-10-30": { slipped: false },
    "2026-10-31": { slipped: true },
    "2026-11-01": { pledge: "x" },
    "2026-11-02": { slipped: false, hard: 2 },
    "2026-11-03": { slipped: true },
  }
  it("counts each month on its own, a slip or a gap resets nothing", () => {
    expect(monthCounts(days, "2026-11")).toEqual({ checkedIn: 3, clear: 1 })
    expect(monthCounts(days, "2026-10")).toEqual({ checkedIn: 2, clear: 1 })
    expect(monthCounts(days, "2026-09")).toEqual({ checkedIn: 0, clear: 0 })
  })
  it("last month shows on days 1 to 7", () => {
    expect(showsLastMonth("2026-11-01")).toBe(true)
    expect(showsLastMonth("2026-11-07")).toBe(true)
    expect(showsLastMonth("2026-11-08")).toBe(false)
    expect(shiftMonth("2026-01", -1)).toBe("2025-12")
    expect(shiftMonth("2026-12", 1)).toBe("2027-01")
  })
  it("the first month to browse is the month of the first entry, else this month", () => {
    expect(firstMonth(days, "2026-11-19")).toBe("2026-10")
    expect(firstMonth({}, "2026-11-19")).toBe("2026-11")
  })
  it("a month grid starts on Monday", () => {
    const g = monthGrid("2026-11")
    expect(g.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"])
    expect(g.filter(Boolean)).toHaveLength(30)
  })
})

describe("pattern, from the morning forecast only", () => {
  const mk = (n: number, f: (i: number) => { forecast?: number; slipped: boolean }): Days => {
    const out: Days = {}
    for (let i = 0; i < n; i++) out[`2026-10-${String(i + 1).padStart(2, "0")}`] = { hard: 3, urges: 5, feelings: ["bored"], ...f(i) }
    return out
  }
  it("waits for 14 results and says how many there are", () => {
    const p = patternsOf(mk(13, () => ({ forecast: 4, slipped: false })))
    expect(p).toMatchObject({ ready: false, count: 13, forecast: null })
  })
  it("compares hard-forecast days with the others when each side has 3 and the shares differ", () => {
    // 6 hard days (2 slips) and 10 other days (1 slip)
    const p = patternsOf(mk(16, (i) => ({ forecast: i < 6 ? 5 : 2, slipped: i === 0 || i === 1 || i === 6 })))
    expect(p.ready).toBe(true)
    expect(p.forecast).toEqual({ withDays: 6, withSlips: 2, otherDays: 10, otherSlips: 1 })
  })
  it("shows nothing when a side has fewer than 3 days or the shares are equal", () => {
    expect(patternsOf(mk(16, (i) => ({ forecast: i < 2 ? 5 : 2, slipped: i === 0 }))).forecast).toBeNull()
    expect(patternsOf(mk(16, (i) => ({ forecast: i % 2 ? 5 : 2, slipped: i < 4 && i % 2 === 1 ? true : i >= 8 && i < 12 && i % 2 === 0 ? true : false }))).forecast).toBeNull()
  })
  it("never builds an urges or feelings line", () => {
    const p = patternsOf(mk(20, (i) => ({ forecast: 3, slipped: i < 10 })))
    expect(Object.keys(p).sort()).toEqual(["count", "forecast", "pairs", "ready", "reason"])
  })
  it("the example has a forecast line and today's morning", () => {
    expect(patternsOf(seedExample("2026-11-19")).forecast).not.toBeNull()
    expect(seedExample("2026-11-19")["2026-11-19"]).toMatchObject({ forecast: 4 })
  })
  it("says why there is no line: too few days on a side, or equal shares", () => {
    expect(patternsOf(mk(16, (i) => ({ forecast: i < 2 ? 5 : 2, slipped: i === 0 }))).reason).toBe("sides")
    // 4 hard days with 2 slips, 12 other days with 6 slips: the same share
    expect(patternsOf(mk(16, (i) => ({ forecast: i < 4 ? 5 : 2, slipped: i < 2 || (i >= 4 && i < 10) }))).reason).toBe("equal")
    expect(patternsOf(mk(16, (i) => ({ forecast: i < 6 ? 5 : 2, slipped: i < 2 }))).reason).toBeNull()
  })
  it("the lines read as written", () => {
    expect(t.forecastHard(7, 3)).toBe("Expected Hard or Very hard: slipped on 3 of 7 days.")
    expect(t.forecastEasy(14, 1)).toBe("Expected Easy to In between: slipped on 1 of 14 days.")
    expect(t.pairsLine(12, 4, 5, 3)).toBe("On 12 days you rated the day in the morning and the evening: harder than you expected on 4, easier on 5, as expected on 3.")
    expect(t.patternWait("smoke", 3)).toBe('Your pattern shows once you have answered "Did you smoke?" on 14 days. You have 3.')
  })
})

describe("pairs of forecast and result", () => {
  it("counts harder, easier and the same", () => {
    const days: Days = {
      a: { forecast: 2, hard: 4 },
      b: { forecast: 4, hard: 2 },
      c: { forecast: 3, hard: 3 },
      d: { forecast: 3 },
      e: { hard: 3 },
    }
    expect(pairingCounts(days)).toEqual({ n: 3, harder: 1, easier: 1, same: 1 })
  })
})

describe("look-back rule", () => {
  it("offers yesterday only when it has no evening answer and an earlier entry exists", () => {
    expect(lookBack({}, "2026-11-19")).toBeNull()
    expect(lookBack({ "2026-11-19": { pledge: "x" } }, "2026-11-19")).toBeNull()
    expect(lookBack({ "2026-11-16": { slipped: false } }, "2026-11-19")).toBe("2026-11-18")
    expect(lookBack({ "2026-11-16": { slipped: false }, "2026-11-18": { slipped: true } }, "2026-11-19")).toBeNull()
    // an entry on yesterday itself is not an earlier entry
    expect(lookBack({ "2026-11-18": { pledge: "x" } }, "2026-11-19")).toBeNull()
  })
  it("a day can be filled from 60 days back to today, never a future day", () => {
    expect(canFill("2026-11-19", "2026-11-19")).toBe(true)
    expect(canFill("2026-09-20", "2026-11-19")).toBe(true)
    expect(canFill("2026-09-19", "2026-11-19")).toBe(false)
    expect(canFill("2026-11-20", "2026-11-19")).toBe(false)
  })
})

describe("Black Box slip days", () => {
  it("only a report that ended the run with a slip is a slip day", () => {
    const set = slipDays([
      { at: "2026-11-18T12:00:00", wentThrough: true },
      { at: "2026-11-17T09:00:00", wentThrough: false },
    ])
    expect([...set]).toEqual(["2026-11-18"])
  })
  it("a slip day counts as slipped even with no check-in, and keeps the day's other answers", () => {
    const merged = mergeSlips({ "2026-11-18": { hard: 4, slipped: false }, "2026-11-10": { slipped: false } }, new Set(["2026-11-18", "2026-11-12"]))
    expect(merged["2026-11-18"]).toEqual({ hard: 4, slipped: true })
    expect(merged["2026-11-12"]).toEqual({ slipped: true })
    expect(merged["2026-11-10"]).toEqual({ slipped: false })
  })
  it("returns the same days when there is no slip", () => {
    const d: Days = { "2026-11-18": { slipped: false } }
    expect(mergeSlips(d, new Set())).toBe(d)
  })
})

describe("the calendar file", () => {
  const now = new Date("2026-11-19T10:00:00Z")
  const ics = icsFor({ morning: "08:00", evening: "21:00" }, "2026-11-19", now, "https://example.test/quit/nicotine/checkin", { morning: "Morning check-in", evening: "Evening check-in" })
  const unfolded = ics.replace(/\r\n /g, "")
  it("holds two daily repeating events with the stamp of the tap time", () => {
    expect(unfolded.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(unfolded.match(/RRULE:FREQ=DAILY/g)).toHaveLength(2)
    expect(unfolded.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(unfolded.match(/TRIGGER:PT0M/g)).toHaveLength(2)
    expect(unfolded).toContain("SUMMARY:Morning check-in")
    expect(unfolded).toContain("SUMMARY:Evening check-in")
    expect(unfolded).toContain("DTSTAMP:20261119T100000Z")
    expect(unfolded).toContain("DTSTART:20261119T080000")
    expect(unfolded).toContain("DTSTART:20261119T210000")
    expect(unfolded).toContain("DESCRIPTION:How hard will today be? Open the check-in: https://example.test/quit/nicotine/checkin")
    expect(unfolded).toContain("DESCRIPTION:How did today go? Open the check-in: https://example.test/quit/nicotine/checkin")
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
  })
  it("no line is longer than 75 characters", () => {
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75)
  })
  it("the Google link repeats daily", () => {
    const u = googleCalendarUrl("evening", { morning: "08:00", evening: "21:00" }, "2026-11-19", "https://example.test/x", { morning: "Morning check-in", evening: "Evening check-in" })
    expect(u).toContain("text=Evening%20check-in")
    expect(u).toContain("dates=20261119T210000/20261119T211000")
    expect(decodeURIComponent(u)).toContain("recur=RRULE:FREQ=DAILY")
  })
})

describe("words: that day and today, the unit", () => {
  it("the slip question says today, or that day for a past day", () => {
    expect(t.outcomeTitle("smoke", false)).toBe("Did you smoke today?")
    expect(t.outcomeTitle("smoke", true, "Thu 12 Nov")).toBe("Did you smoke on Thu 12 Nov?")
    expect(t.outcomeTitle("smoke", true)).toBe("Did you smoke that day?")
  })
  it("no question of a past day says today", () => {
    const all = [t.outcomeTitle("vape", true), t.hardTitle(true), t.urgesTitle(true), t.feelingsTitle(true), t.noteTitle(true), t.expectedThen(true, 4), t.doneThat, t.pledgeTitle(true), t.forecastTitle(true)]
    for (const q of all) expect(q).toMatch(/that (day|morning)|That morning/i)
    for (const q of all) expect(q.toLowerCase()).not.toContain("today")
  })
  it("the unit sets the verb; no unit says use it", () => {
    expect(t.outcomeTitle(useVerb({ id: "vape" }), false)).toBe("Did you vape today?")
    expect(t.outcomeTitle(useVerb(null), false)).toBe("Did you use nicotine today?")
    expect(t.outcomeTitle(useVerb({ id: "pouches" }), false)).toBe("Did you use a pouch today?")
    expect(pastPhrase(useVerb(null))).toBe("used nicotine")
    expect(pastPhrase("vape")).toBe("vaped")
    expect(verbPhrase("use")).toBe("use nicotine")
  })
  it("dates read like Tool 4", () => {
    expect(dayLabel("2026-11-19")).toBe("Thu 19 Nov")
    expect(t.slipInRecord(dayLabel("2026-11-19"))).toBe("Your slip on Thu 19 Nov is in your record.")
  })
})

describe("never an empty day, the no-slip cases, words", () => {
  it("putDay drops empty parts and removes a day with nothing left", () => {
    expect(putDay({}, "2026-11-19", { slipped: undefined, slipReportId: undefined })).toEqual({})
    expect(putDay({ "2026-11-19": { slipped: true } }, "2026-11-19", { slipped: undefined })).toEqual({})
    expect(putDay({}, "2026-11-19", { note: "  ", feelings: [], hard: 3 })).toEqual({ "2026-11-19": { hard: 3 } })
  })
  it("a Black Box slip is not a check-in, but shows as a slip", () => {
    const own: Days = { "2026-11-18": { slipped: false } }
    const shown = mergeSlips(own, new Set(["2026-11-17"]))
    expect(shown["2026-11-17"]).toEqual({ slipped: true })
    expect(monthCounts(own, "2026-11")).toEqual({ checkedIn: 1, clear: 1 })
    expect(monthCounts(shown, "2026-11").checkedIn).toBe(2)
  })
  it("picks the line by the case", () => {
    const ended = { startedOn: "2026-11-01", endedOn: "2026-11-10" }
    expect(noSlipCase("2026-11-19", [])).toBe("never")
    expect(noSlipCase("2026-10-30", [ended])).toBe("before")
    expect(noSlipCase("2026-11-05", [ended])).toBe("later")
    expect(noSlipCase("2026-11-15", [ended])).toBe("ended")
    expect(noSlipCase("2026-11-15", [ended, { startedOn: "2026-11-12", endedOn: null }])).toBe("other")
  })
  it("the urges scale has its own words, old feeling words keep their labels", () => {
    expect(urgeWord(4)).toBe("Strong")
    expect(urgeWord(1)).toBe("None")
    expect(feelingLabel("tired")).toBe("Tired")
    expect(feelingLabel("short-tempered")).toBe("Short-tempered")
    expect(feelingLabel("angry")).toBe("Angry")
    expect(feelingLabel("clear-headed")).toBe("Clear-headed")
    expect(feelingLabel("happy")).toBe("Happy")
    expect(parseCheckin({ days: { "2026-11-18": { feelings: ["tired", "happy", "zzz"] } } }).days["2026-11-18"].feelings).toEqual(["tired", "happy"])
  })
  it("no word says run, phone or pledge", () => {
    const all = [t.clearResult, t.outcomeClear, t.clearBig, t.countsNote("smoke"), t.noSlipLater, t.noSlipNever, t.noSlipBefore, t.noSlipEnded, t.noSlipOther, t.slipBlocked, t.saving, t.slipGone, t.keptHere, t.savedLocal, t.localOnly, t.remindersLine, t.pledgeLine("x"), t.pledgeTitle(false)].join(" ")
    expect(all).not.toMatch(/\brun\b|phone|pledge|black box|clear|urge/i)
    for (const l of [t.noSlipLater, t.noSlipNever, t.noSlipBefore, t.noSlipEnded, t.noSlipOther]) expect(l.endsWith("It stays in your check-in.")).toBe(true)
  })
})

describe("the Black Box wins over his own No", () => {
  it("a day he answered No that the Black Box holds a slip on counts as slipped, still checked in", () => {
    const own: Days = { "2026-11-18": { slipped: false }, "2026-11-17": { slipped: false } }
    const applied = applySlips(own, new Set(["2026-11-18", "2026-11-12"]))
    expect(applied["2026-11-18"]).toEqual({ slipped: true })
    expect(applied["2026-11-12"]).toBeUndefined()
    expect(monthCounts(applied, "2026-11")).toEqual({ checkedIn: 2, clear: 1 })
  })
  it("the forecast line reads each side", () => {
    expect(t.forecastTitle(true)).toContain("that day")
    expect(t.expectedLine(4)).toBe("You expected Hard (4)")
    expect(t.expectedThen(false, 4)).toBe("This morning you expected Hard (4)")
  })
})

describe("entries, morning-only days, empty drafts", () => {
  it("a day holding only the slip-removed flag is not an entry", () => {
    expect(entryCount({ "2026-11-18": { slipGone: true } })).toBe(0)
    expect(entryCount({ "2026-11-18": { slipGone: true }, "2026-11-17": { hard: 2 } })).toBe(1)
    expect(monthCounts({ "2026-11-18": { slipGone: true } }, "2026-11").checkedIn).toBe(0)
  })
  it("a morning-only day has its own calendar state", () => {
    expect(cellLevel({ pledge: "x" }, "clear").state).toBe("morning")
    expect(cellLevel({ forecast: 3 }, "clear").state).toBe("morning")
    expect(cellLevel({ forecast: 3, slipped: false }, "clear").state).toBe("clear")
    expect(cellLevel({}, "clear").state).toBe("none")
  })
  it("a draft with no answers is dropped", () => {
    expect(parseCheckin({ drafts: { a: { kind: "evening", date: "2026-11-18", step: 2, answers: {} } } }).drafts).toEqual({})
  })
})
