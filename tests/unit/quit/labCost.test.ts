import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"
import { cascade, clampTo, fmtMoney2, fmtMoneyShort, parseTyped } from "@/src/quit/lab/cost/shared/logic"
import { EMPTY_SETUP, cigsNotSmoked, daysSince, isReady, moneySaved, perCigarette } from "@/src/quit/lab/cost/b/logic"
import { balanceAfter, currentBalance, lastRestart, projectedAt, purchasedTotal, relapseSpend, rewardPct, savingsFromBeginning, savingsSinceRestart, type Entry, type Habit, type Reward } from "@/src/quit/lab/cost/c/logic"
import { countdown, dailyCost, goalPct, perMonth, perTenYears, perYear, reachTime, savedOver, savedSoFar, unitsNot } from "@/src/quit/lab/cost/e/logic"

const DAY = 86_400_000
const NOW = new Date(2026, 10, 18, 12, 0, 0).getTime()

describe("cost registry", () => {
  it("registers copies b, c, e with valid addictions and keeps current", () => {
    expect(Object.keys(LAB.cost.variants).sort()).toEqual(["b", "c", "current", "e"])
    for (const id of ["b", "c", "e"]) {
      expect(LAB.cost.variants[id].kind).toBe("copy")
      expect(LAB.cost.variants[id].label).toBe(`Copy ${id.toUpperCase()}`)
      expect(isAddictionId(LAB.cost.variants[id].addiction)).toBe(true)
    }
  })
})

describe("cost shared maths", () => {
  it("parses typed text and clamps", () => {
    expect(parseTyped("12.5")).toBe(12.5)
    expect(Number.isNaN(parseTyped(""))).toBe(true)
    expect(Number.isNaN(parseTyped("-"))).toBe(true)
    expect(Number.isNaN(parseTyped("abc"))).toBe(true)
    expect(clampTo(-5, 0, 200)).toBe(0)
    expect(clampTo(999, 0, 200)).toBe(200)
    expect(clampTo(7, 0)).toBe(7)
  })
  it("formats money", () => {
    expect(fmtMoneyShort(45.634)).toBe("$45.63")
    expect(fmtMoneyShort(243.33)).toBe("$243")
    expect(fmtMoneyShort(2920)).toBe("$2,920")
    expect(fmtMoney2(1234.5)).toBe("$1,234.50")
    expect(fmtMoney2(-25)).toBe("-$25.00")
    expect(fmtMoneyShort(-25)).toBe("-$25.00")
    expect(fmtMoney2(-0.001)).toBe("$0.00")
  })
  it("pours money into goals in order", () => {
    const r = cascade(150, [50, 2000, 0])
    expect(r[0]).toEqual({ funded: 50, pct: 100 })
    expect(r[1]).toEqual({ funded: 100, pct: 5 })
    expect(r[2]).toEqual({ funded: 0, pct: null })
    expect(cascade(0, [10])[0].pct).toBe(0)
    expect(cascade(10, [50, 50]).map((x) => x.pct)).toEqual([20, 0])
  })
})

describe("copy B formulas", () => {
  const s = { ...EMPTY_SETUP, startMs: NOW - 14.5 * DAY, cigsPerDay: 20, packSize: 20, packPrice: 9 }
  it("counts days, cigarettes not smoked and money", () => {
    expect(isReady(s)).toBe(true)
    expect(isReady(EMPTY_SETUP)).toBe(false)
    expect(daysSince(s, NOW)).toBe(14)
    expect(cigsNotSmoked(s, NOW)).toBe(290)
    expect(perCigarette(s)).toBeCloseTo(0.45)
    expect(moneySaved(s, NOW)).toBe(130.5)
  })
  it("is zero until filled in", () => {
    expect(moneySaved(EMPTY_SETUP, NOW)).toBe(0)
    expect(cigsNotSmoked(EMPTY_SETUP, NOW)).toBe(0)
  })
})

describe("copy C formulas", () => {
  const habit: Habit = { type: 2, spend: 10, startMs: NOW - 10 * DAY }
  const none: Entry[] = []
  it("savings run on spend per day times elapsed days", () => {
    expect(savingsFromBeginning(habit, NOW)).toBe(100)
    expect(savingsSinceRestart(habit, none, NOW)).toBe(100)
    expect(currentBalance(habit, none, [], NOW)).toBe(100)
  })
  it("a relapse restarts the stretch and takes its spend off the balance only", () => {
    const relapse: Entry[] = [{ ms: NOW - 4 * DAY, note: "", relapse: true, spend: 25 }]
    expect(lastRestart(habit, relapse, NOW)).toBe(NOW - 4 * DAY)
    expect(savingsSinceRestart(habit, relapse, NOW)).toBe(40)
    expect(savingsFromBeginning(habit, NOW)).toBe(100)
    expect(relapseSpend(relapse)).toBe(25)
    expect(currentBalance(habit, relapse, [], NOW)).toBe(75)
    expect(lastRestart(habit, [{ ms: NOW - 4 * DAY, note: "", relapse: false, spend: 0 }], NOW)).toBe(habit.startMs)
  })
  it("rewards: progress, purchase and balance after", () => {
    const rewards: Reward[] = [
      { id: "1", name: "x", price: 60, bought: true },
      { id: "2", name: "y", price: 30, bought: false },
    ]
    expect(purchasedTotal(rewards)).toBe(60)
    expect(currentBalance(habit, none, rewards, NOW)).toBe(40)
    expect(rewardPct(40, 30)).toBe(100)
    expect(rewardPct(15, 30)).toBe(50)
    expect(rewardPct(-5, 30)).toBe(0)
    expect(rewardPct(10, 0)).toBe(0)
    expect(balanceAfter(40, 30)).toBe(10)
  })
  it("projects savings to a later date", () => {
    expect(projectedAt(habit, NOW, NOW + 5 * DAY)).toBe(150)
    expect(projectedAt(habit, NOW, NOW - DAY)).toBe(100)
  })
})

describe("copy E formulas", () => {
  const cig = { perDay: 20, price: 8, pack: 20 }
  it("cigarettes: daily, month, year, ten years", () => {
    const d = dailyCost("cigarettes", cig)
    expect(d).toBe(8)
    expect(Math.round(perMonth(d))).toBe(243)
    expect(perYear(d)).toBe(2920)
    expect(perTenYears(d)).toBe(29200)
    expect(Math.round(perMonth(dailyCost("cigarettes", { ...cig, perDay: 10 })))).toBe(122)
    expect(dailyCost("cigarettes", { perDay: 5, price: 8 })).toBe(0)
    expect(dailyCost("cigarettes", {})).toBe(0)
  })
  it("other products", () => {
    expect(dailyCost("vaping", { liquid: 30, pods: 15 })).toBeCloseTo(1.5)
    expect(dailyCost("tobacco", { pouches: 4, price: 15 })).toBe(2)
    expect(dailyCost("snus", { cans: 3, price: 6.5 })).toBeCloseTo(19.5 / 7)
    expect(dailyCost("shisha", { sessions: 2, cost: 15 })).toBeCloseTo(30 / 7)
  })
  it("20 years with and without a yearly rise", () => {
    expect(savedOver(2920, 20, 0)).toBe(58400)
    expect(Math.round(savedOver(2920, 20, 0.03))).toBe(78461)
    expect(Math.round(savedOver(2920, 10, 0.03))).toBe(33475)
  })
  it("time to reach a price rounds up", () => {
    expect(reachTime(70, 6)).toEqual({ unit: "days", n: 12 })
    expect(reachTime(330, 6)).toEqual({ unit: "days", n: 55 })
    expect(reachTime(1500, 6)).toEqual({ unit: "months", n: 9 })
    expect(reachTime(4000, 6)).toEqual({ unit: "months", n: 22 })
    expect(reachTime(0, 8)).toBeNull()
    expect(reachTime(50, 0)).toBeNull()
  })
  it("units not consumed and the app goal", () => {
    expect(unitsNot(20, 20)).toBe(146000)
    expect(savedSoFar(5, NOW - 10 * DAY, NOW)).toBe(50)
    expect(savedSoFar(5, null, NOW)).toBe(0)
    expect(goalPct(58, 100)).toBe(58)
    expect(goalPct(500, 100)).toBe(100)
    expect(goalPct(5, null)).toBe(0)
    expect(countdown(0, 100, 10)).toEqual({ days: 10, hours: 0 })
    expect(countdown(95, 100, 10)).toEqual({ days: 0, hours: 12 })
    expect(countdown(0, 100, 0)).toBeNull()
  })
})
