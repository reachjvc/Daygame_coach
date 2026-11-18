import { describe, expect, it } from "vitest"
import {
  cellState,
  clearDayKeys,
  dayMilestones,
  fillTargets,
  moneyKept,
  moneyMilestones,
  monthGrid,
  periodMoney,
  stats,
  type Slip,
  type Spend,
} from "@/src/quit/lab/progress/best/logic"

const slip = (day: string, note = ""): Slip => ({ day, note })

describe("clear days, current run, best run", () => {
  it("counts completed days only; today is not counted yet", () => {
    const s = stats("2026-11-01", "2026-11-11", [])
    expect(s).toMatchObject({ total: 10, current: 10, best: 10 })
    expect(s.stretches).toHaveLength(1)
    expect(stats("2026-11-11", "2026-11-11", []).total).toBe(0)
  })

  it("keeps the total across several stretches and the best run after a restart", () => {
    // clear 1-5, slip 6, clear 7-9, slip 10, clear 11-12 (today is the 13th)
    const s = stats("2026-11-01", "2026-11-13", [slip("2026-11-06", "late night"), slip("2026-11-10")])
    expect(s.stretches.map((x) => x.length)).toEqual([5, 3, 2])
    expect(s.total).toBe(10)
    expect(s.current).toBe(2)
    expect(s.best).toBe(5)
    expect(s.stretches[0].endedBy?.note).toBe("late night")
    expect(s.stretches[2].endedBy).toBeNull()
  })

  it("a slip today leaves the total, restarts the run and keeps the best", () => {
    const before = stats("2026-11-01", "2026-11-11", [])
    const after = stats("2026-11-01", "2026-11-11", [slip("2026-11-11", "hard day")])
    expect(after.total).toBe(before.total)
    expect(after.current).toBe(0)
    expect(after.best).toBe(10)
    expect(after.stretches).toHaveLength(2)
  })

  it("an earlier slip day is not a clear day; consecutive slips give an empty stretch; one slip per day", () => {
    const s = stats("2026-11-01", "2026-11-11", [slip("2026-11-04"), slip("2026-11-05"), slip("2026-11-04", "again")])
    expect(s.stretches.map((x) => x.length)).toEqual([3, 0, 5])
    expect(s.total).toBe(8)
    expect(s.stretches[0].endedBy?.note).toBe("again")
  })

  it("ignores slips outside the tracked days", () => {
    expect(stats("2026-11-05", "2026-11-11", [slip("2026-11-01"), slip("2026-11-20")]).total).toBe(6)
  })
})

describe("money", () => {
  it("subtracts spending from clear days times the daily amount", () => {
    expect(moneyKept(5.2, 23, 0)).toBe(119.6)
    expect(moneyKept(5.2, 23, 20)).toBe(99.6)
  })

  it("period windows count clear days and spending inside the window", () => {
    const spends: Spend[] = [{ id: "a", day: "2026-11-10", amount: 4, note: "" }]
    const slips = [slip("2026-11-08")]
    const week = periodMoney(7, "2026-10-01", "2026-11-11", slips, spends, 5)
    // window starts 2026-11-04; completed days 04..10, one slip (08) => 6 clear
    expect(week).toMatchObject({ clear: 6, spent: 4, money: 26, from: "2026-11-04" })
    const day = periodMoney(1, "2026-10-01", "2026-11-11", slips, spends, 5)
    expect(day).toMatchObject({ clear: 1, money: 1 })
    const all = periodMoney(0, "2026-11-01", "2026-11-11", [], [], 5)
    expect(all).toMatchObject({ clear: 10, money: 50 })
    expect(periodMoney(365, "2026-11-01", "2026-11-11", [], [], 5).from).toBe("2026-11-01")
  })
})

describe("targets fill in order", () => {
  const t = [
    { id: "1", name: "a", price: 100 },
    { id: "2", name: "b", price: 50 },
    { id: "3", name: "c", price: 200 },
  ]
  it("fills the first, then the next, then the rest", () => {
    const f = fillTargets(t, 130, 10)
    expect(f.map((x) => x.funded)).toEqual([100, 30, 0])
    expect(f.map((x) => x.done)).toEqual([true, false, false])
    // item 2 misses 150 - 130 = 20 => 2 days; item 3 misses 350 - 130 = 220 => 22 days
    expect(f.map((x) => x.daysToGo)).toEqual([0, 2, 22])
    expect(f[1].missing).toBe(20)
  })
  it("money at or below zero funds nothing; no daily amount gives no days", () => {
    expect(fillTargets(t, -5, 10).map((x) => x.funded)).toEqual([0, 0, 0])
    expect(fillTargets(t, 10, 0).map((x) => x.daysToGo)).toEqual([null, null, null])
  })
  it("rounds days up", () => {
    expect(fillTargets([{ id: "1", name: "", price: 10 }], 0, 3)[0].daysToGo).toBe(4)
  })
})

describe("milestone ladder", () => {
  it("dates each clear-day step by the Nth clear day", () => {
    const keys = clearDayKeys("2026-11-01", "2026-11-11", [slip("2026-11-02")])
    const m = dayMilestones(keys)
    expect(keys).toHaveLength(9)
    expect(m.find((s) => s.threshold === 1)).toMatchObject({ date: "2026-11-01", toGo: 0 })
    // clear days: 01, 03, 04, 05, 06, 07, 08, 09, 10 -> third is 04, seventh is 08
    expect(m.find((s) => s.threshold === 3)?.date).toBe("2026-11-04")
    expect(m.find((s) => s.threshold === 7)?.date).toBe("2026-11-08")
    expect(m.find((s) => s.threshold === 14)).toMatchObject({ date: null, toGo: 5 })
  })

  it("dates money steps at the first day the total reached them", () => {
    // 10 per day, no slips, today = 11-11: after day 1 money 10, after day 3 money 30, ...
    const m = moneyMilestones("2026-11-01", "2026-11-11", [], [], 10, 100)
    expect(m.find((s) => s.threshold === 10)?.date).toBe("2026-11-01")
    expect(m.find((s) => s.threshold === 25)?.date).toBe("2026-11-03")
    expect(m.find((s) => s.threshold === 100)?.date).toBe("2026-11-10")
    expect(m.find((s) => s.threshold === 250)).toMatchObject({ date: null, toGo: 15 })
  })

  it("later spending does not remove a reached money step; no daily amount gives no dates", () => {
    const spends: Spend[] = [{ id: "a", day: "2026-11-10", amount: 90, note: "" }]
    const m = moneyMilestones("2026-11-01", "2026-11-11", [], spends, 10, 10)
    expect(m.find((s) => s.threshold === 50)?.date).toBe("2026-11-05")
    expect(m.find((s) => s.threshold === 100)?.date).toBeNull()
    expect(moneyMilestones("2026-11-01", "2026-11-11", [], [], 0, 0).every((s) => s.date === null && s.toGo === null)).toBe(true)
  })
})

describe("calendar", () => {
  it("lays out Monday-first weeks", () => {
    const g = monthGrid(2026, 10)
    expect(g.every((w) => w.length === 7)).toBe(true)
    expect(g.flat().filter(Boolean)).toHaveLength(30)
    expect(g[0].indexOf("2026-11-01")).toBe(6)
  })
  it("marks clear, slip, today and outside", () => {
    const s = [slip("2026-11-05")]
    expect(cellState("2026-11-04", "2026-11-01", "2026-11-11", s)).toBe("clear")
    expect(cellState("2026-11-05", "2026-11-01", "2026-11-11", s)).toBe("slip")
    expect(cellState("2026-11-11", "2026-11-01", "2026-11-11", s)).toBe("today")
    expect(cellState("2026-10-30", "2026-11-01", "2026-11-11", s)).toBe("outside")
    expect(cellState("2026-11-12", "2026-11-01", "2026-11-11", s)).toBe("outside")
  })
})
