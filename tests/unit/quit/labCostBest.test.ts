import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import { availableMoney, boughtTotal, dailyOf, elapsedDays, fillGoals, grossKept, netMoney, periods, sumSpend, type CostSetup, type Goal, type Spend } from "@/src/quit/lab/cost/best/logic"
import { bestText } from "@/src/quit/lab/cost/best/text"

const DAY = 86_400_000
const goal = (id: string, price: number, bought = false): Goal => ({ id, name: id, price, bought })
const spend = (amount: number): Spend => ({ id: String(amount), day: "2026-11-10", amount, note: "" })

describe("cost best registry", () => {
  it("registers best as the improved variant", () => {
    expect(LAB.cost.variants.best.kind).toBe("best")
    expect(LAB.cost.variants.best.label).toBe("Improved")
    expect(LAB.cost.variants.best.addiction).toBe("nicotine")
  })
})

describe("daily amount and net money", () => {
  const unitSetup: CostSetup = { startMs: 0, unitId: "cigarettes", perDay: 10, price: 0.52, priceOwn: 0, money: 0 }
  it("units times price, or money typed directly", () => {
    expect(dailyOf(unitSetup)).toBe(5.2)
    expect(dailyOf({ ...unitSetup, unitId: "", perDay: 0, price: 0, money: 7.5 })).toBe(7.5)
  })
  it("kept = daily x days; net = kept - spent, and can go below zero", () => {
    const gross = grossKept(5.2, elapsedDays(0, 10 * DAY))
    expect(gross).toBe(52)
    expect(netMoney(gross, sumSpend([spend(20), spend(7.5)]))).toBe(24.5)
    expect(netMoney(10, 25)).toBe(-15)
  })
  it("no days before the start", () => {
    expect(elapsedDays(5 * DAY, 2 * DAY)).toBe(0)
  })
})

describe("goals fill in order", () => {
  it("the first takes what it needs, the next the rest", () => {
    const f = fillGoals([goal("a", 100), goal("b", 100)], 150, 5)
    expect(f.map((x) => x.funded)).toEqual([100, 50])
    expect(f.map((x) => x.pct)).toEqual([100, 50])
    expect(f[0].ready).toBe(true)
    expect(f[1].ready).toBe(false)
  })
  it("negative money funds nothing", () => {
    expect(fillGoals([goal("a", 100)], -20, 5)[0].funded).toBe(0)
  })
  it("equation: kept - bought = available; buying deducts the price", () => {
    const goals = [goal("a", 100), goal("b", 80)]
    const net = 150
    expect(availableMoney(net, boughtTotal(goals))).toBe(150)
    const after = [goal("a", 100, true), goal("b", 80)]
    expect(boughtTotal(after)).toBe(100)
    expect(availableMoney(net, boughtTotal(after))).toBe(50)
    const f = fillGoals(after, 50, 5)
    expect(f).toHaveLength(1)
    expect(f[0].funded).toBe(50)
  })
  it("time to reach counts every unbought goal above it, at his rate", () => {
    const f = fillGoals([goal("a", 100), goal("b", 100)], 50, 10)
    expect(f[0].missing).toBe(50)
    expect(f[0].reach).toEqual({ unit: "days", n: 5 })
    expect(f[1].missing).toBe(150)
    expect(f[1].reach).toEqual({ unit: "days", n: 15 })
  })
  it("long waits turn to months; no rate gives no time", () => {
    expect(fillGoals([goal("a", 5000)], 0, 5)[0].reach?.unit).toBe("months")
    expect(fillGoals([goal("a", 100)], 0, 0)[0].reach).toBeNull()
  })
})

describe("periods", () => {
  it("day, week, month, year, 10 years, flat", () => {
    expect(periods(5.2)).toEqual({ day: 5.2, week: 36.4, month: 158.17, year: 1898, tenYears: 18980 })
  })
  it("a typed yearly rise grows each year after the first", () => {
    const p = periods(5.2, 0.1)
    expect(p.year).toBe(1898)
    expect(p.tenYears).toBeCloseTo((1898 * (Math.pow(1.1, 10) - 1)) / 0.1, 1)
    expect(p.tenYears).toBeGreaterThan(18980)
  })
  it("no rise typed stays flat", () => {
    expect(periods(10, 0).tenYears).toBe(36500)
  })
})

describe("text", () => {
  it("basis line names count, price and start", () => {
    expect(bestText.basis(10, "cigarette", "cigarettes", 0.52, "5 Nov 2026")).toBe("based on: 10 cigarettes a day × $0.52 each, since 5 Nov 2026")
    expect(bestText.basis(1, "cigarette", "cigarettes", 0.52, "5 Nov 2026")).toContain("1 cigarette a day")
  })
  it("no exclamation marks in reader text", () => {
    expect(JSON.stringify(Object.values(bestText).map((v) => (typeof v === "function" ? "" : v)))).not.toContain("!")
  })
})
