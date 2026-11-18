import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"
import { addDays, dayKey, longestRun, monthGrid, streakEnding } from "@/src/quit/lab/checkin/shared/logic"
import { challengeFill, checklistDone, messageIndex, notesOf, pledgeStreak, seedDaysA } from "@/src/quit/lab/checkin/a/logic"
import { checkinStreak as bStreak, clockDays, gap, holdFill, seedCheckins, seedInventory, valueFromY } from "@/src/quit/lab/checkin/b/logic"
import { clockLabel } from "@/src/quit/lab/checkin/b/text"
import { dayScore, insightOf, MIN_DAYS_FOR_INSIGHT, pointsOf, progressOf, rankIndex, checkinStreak as cStreak, seedDaysC, stepsFor, type DaysC } from "@/src/quit/lab/checkin/c/logic"
import { dayAverage, dryCount, monthAverage, noteCount, oneDecimal, seedDaysD, unitsTotal, withStarter } from "@/src/quit/lab/checkin/d/logic"

const TODAY = dayKey(new Date(2026, 10, 18, 12).getTime())

describe("checkin registry", () => {
  it("has copies a to d, no e, with addictions the site knows", () => {
    const v = LAB.checkin.variants
    expect(Object.keys(v).sort()).toEqual(["a", "b", "c", "d"])
    for (const x of Object.values(v)) {
      expect(x.kind).toBe("copy")
      expect(isAddictionId(x.addiction)).toBe(true)
    }
    expect(v.a.label).toBe("Copy A")
    expect(v.c.addiction).toBe("porn")
  })
})

describe("shared day maths", () => {
  it("streak ends today, or yesterday while today is open", () => {
    const s = new Set([addDays(TODAY, -1), addDays(TODAY, -2), addDays(TODAY, -4)])
    expect(streakEnding(s, TODAY)).toBe(2)
    expect(streakEnding(new Set([...s, TODAY]), TODAY)).toBe(3)
    expect(streakEnding(new Set(), TODAY)).toBe(0)
  })
  it("longest run finds the best gap-free stretch", () => {
    const s = new Set([0, 1, 2, 4, 5].map((n) => addDays(TODAY, -n)))
    expect(longestRun(s)).toBe(3)
  })
  it("month grid starts on Monday", () => {
    const g = monthGrid("2026-11")
    expect(g.filter((c) => c === null)).toHaveLength(6)
    expect(g.filter(Boolean)).toHaveLength(30)
  })
})

describe("copy a pledge logic", () => {
  const days = seedDaysA(TODAY)
  it("example data: streak 6, nothing done today, 14-day window", () => {
    expect(pledgeStreak(days, TODAY)).toBe(6)
    expect(checklistDone(days[TODAY])).toBe(0)
    expect(Object.keys(days).length).toBe(11)
    expect(challengeFill(6)).toBe(6)
    expect(challengeFill(12)).toBe(7)
  })
  it("pledging today adds one to the streak", () => {
    expect(pledgeStreak({ ...days, [TODAY]: { pledge: true } }, TODAY)).toBe(7)
    expect(checklistDone({ pledge: true })).toBe(1)
  })
  it("notes come out newest first; the message of a day is stable", () => {
    const n = notesOf(days)
    expect(n.length).toBeGreaterThan(0)
    expect([...n].sort((a, b) => (a.date < b.date ? 1 : -1))).toEqual(n)
    expect(messageIndex("2026-11-18", 6)).toBe(messageIndex("2026-11-18", 6))
  })
})

describe("copy b clock and inventory logic", () => {
  it("counts clock days and the hold fill", () => {
    expect(clockDays(addDays(TODAY, -187), TODAY)).toBe(187)
    expect(holdFill(750, 1500)).toBe(0.5)
    expect(holdFill(5000, 1500)).toBe(1)
    expect(holdFill(-5, 1500)).toBe(0)
  })
  it("slider: bottom is 0 (easy), top is 100 (hard), clamped", () => {
    expect(valueFromY(300, 100, 200)).toBe(0)
    expect(valueFromY(100, 100, 200)).toBe(100)
    expect(valueFromY(200, 100, 200)).toBe(50)
    expect(valueFromY(0, 100, 200)).toBe(100)
    expect(valueFromY(900, 100, 200)).toBe(0)
  })
  it("gap needs both values; example data fills 14 days", () => {
    expect(gap({ morning: 30, evening: 50 })).toBe(20)
    expect(gap({ morning: 30 })).toBeNull()
    expect(Object.keys(seedInventory(TODAY))).toHaveLength(14)
    expect(seedCheckins(TODAY)).toHaveLength(12)
    expect(bStreak(seedCheckins(TODAY), TODAY)).toBe(4)
  })
  it("formats a reminder time", () => {
    expect(clockLabel("08:05")).toBe("8:05 AM")
    expect(clockLabel("00:30")).toBe("12:30 AM")
    expect(clockLabel("21:00")).toBe("9:00 PM")
  })
})

describe("copy c check-in logic", () => {
  it("setback questions come only after the Setback answer", () => {
    expect(stepsFor("victory")).not.toContain("time")
    expect(stepsFor(null)).not.toContain("where")
    const s = stepsFor("setback")
    expect(s.slice(0, 3)).toEqual(["howdid", "time", "where"])
    expect(s[s.length - 1]).toBe("journal")
  })
  it("progress bar grows to 1", () => {
    const s = stepsFor("victory")
    expect(progressOf(s, "howdid")).toBe(0)
    expect(progressOf(s, "journal")).toBe(1)
    expect(progressOf(s, "positive")).toBeGreaterThan(progressOf(s, "emotion"))
  })
  it("points, rank and streak", () => {
    const d = seedDaysC(TODAY)
    expect(pointsOf(d)).toBe(14 * 450)
    expect(rankIndex(0)).toBe(0)
    expect(rankIndex(450)).toBe(1)
    expect(cStreak(d, TODAY)).toBe(14)
  })
  it("insight rests on shown day counts and needs a minimum of days", () => {
    const d = seedDaysC(TODAY)
    const i = insightOf(d)!
    expect(i).not.toBeNull()
    expect(i.withDays + i.otherDays).toBe(14)
    expect(i.withVictories).toBeLessThanOrEqual(i.withDays)
    expect(i.areas.length).toBeGreaterThan(0)
    expect(i.percentMore === null || i.percentMore > 0).toBe(true)
    const few: DaysC = Object.fromEntries(Object.entries(d).slice(0, MIN_DAYS_FOR_INSIGHT - 1))
    expect(insightOf(few)).toBeNull()
  })
  it("percent more likely: 100% victories against 50% is 100 percent more", () => {
    const mk = (victory: boolean, good: boolean) => ({
      outcome: victory ? ("victory" as const) : ("setback" as const),
      urges: 0, emotion: 0, positive: [], negative: [], title: "", body: "",
      ratings: [4, 4, 4, 4, good ? 0 : 4],
    })
    const d: DaysC = {}
    const add = (n: number, v: boolean, g: boolean, off: number) => { for (let k = 0; k < n; k++) d[addDays(TODAY, -(off + k))] = mk(v, g) }
    add(4, true, true, 1)
    add(2, true, false, 5)
    add(2, false, false, 7)
    const i = insightOf(d)!
    expect(i.areas).toEqual([4])
    expect(i.withDays).toBe(4)
    expect(i.withVictories).toBe(4)
    expect(i.otherDays).toBe(4)
    expect(i.otherVictories).toBe(2)
    expect(i.percentMore).toBe(100)
  })
  it("score of a day is 100 for all best answers and 0 for all worst", () => {
    const base = seedDaysC(TODAY)[addDays(TODAY, -1)]
    expect(dayScore({ ...base, ratings: [0, 0, 0, 0, 0] })).toBe(100)
    expect(dayScore({ ...base, ratings: [4, 4, 4, 4, 4] })).toBe(0)
  })
})

describe("copy d wellbeing logic", () => {
  it("averages only recorded items and months only days with data", () => {
    expect(dayAverage({ status: "dry", wellbeing: { mood: 4, energy: 2 } })).toBe(3)
    expect(dayAverage({ status: "dry", wellbeing: {} })).toBeNull()
    const d = seedDaysD(TODAY)
    const ym = TODAY.slice(0, 7)
    const avg = monthAverage(d, ym)
    expect(avg === null || (avg >= 1 && avg <= 5)).toBe(true)
    expect(Object.keys(d)).toHaveLength(14)
  })
  it("counts dry days, units and notes", () => {
    const d = { "2026-11-01": { status: "dry" as const, wellbeing: {}, note: "x" }, "2026-11-02": { status: "drank" as const, units: 3, wellbeing: {} }, "2026-10-30": { status: "dry" as const, wellbeing: {} } }
    expect(dryCount(d, "2026-11")).toBe(1)
    expect(unitsTotal(d, "2026-11")).toBe(3)
    expect(noteCount(d, "2026-11")).toBe(1)
  })
  it("one decimal drops a trailing zero; starter goes on a new line", () => {
    expect(oneDecimal(4)).toBe("4")
    expect(oneDecimal(3.84)).toBe("3.8")
    expect(withStarter("", "A...")).toBe("A...")
    expect(withStarter("Text\n", "A...")).toBe("Text\nA...")
  })
})
