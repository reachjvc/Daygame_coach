import { describe, expect, it } from "vitest"
import { computeCost, defaultPerDay, formatUsd, parseAmount, pickCostSwap } from "@/src/quit/tools/cost/logic"
import { groupNumbers, groupOf } from "@/src/quit/tools/how/logic"
import { makeValid } from "../fixtures/valid"

describe("computeCost", () => {
  it("is amount x days x 52 x price, ten years x10, hours from minutes", () => {
    const r = computeCost({ perDay: 10, daysPerWeek: 7, priceUsd: 0.5, minutesPerUnit: null })
    expect(r).toEqual({ yearUsd: 1820, tenYearUsd: 18200, hoursYear: null })
    const h = computeCost({ perDay: 2, daysPerWeek: 5, priceUsd: 3, minutesPerUnit: 30 })
    expect(h.yearUsd).toBe(1560)
    expect(h.hoursYear).toBe(260)
  })

  it("handles zero use", () => {
    expect(computeCost({ perDay: 0, daysPerWeek: 7, priceUsd: 10, minutesPerUnit: 10 })).toEqual({ yearUsd: 0, tenYearUsd: 0, hoursYear: 0 })
    expect(computeCost({ perDay: 5, daysPerWeek: 7, priceUsd: 0, minutesPerUnit: null }).yearUsd).toBe(0)
  })

  it("handles the 200 x 100 maximum", () => {
    const r = computeCost({ perDay: 200, daysPerWeek: 7, priceUsd: 100, minutesPerUnit: null })
    expect(r.yearUsd).toBe(7_280_000)
    expect(r.tenYearUsd).toBe(72_800_000)
  })

  it("rounds money to the cent without float noise", () => {
    const r = computeCost({ perDay: 3, daysPerWeek: 7, priceUsd: 0.52, minutesPerUnit: null })
    expect(r.yearUsd).toBe(567.84)
    expect(r.tenYearUsd).toBe(5678.4)
  })

  it("formats whole dollars", () => {
    expect(formatUsd(1820)).toBe("$1,820")
    expect(formatUsd(567.84)).toBe("$568")
  })

  it("defaults to 10 a day for cigarettes, 1 otherwise", () => {
    expect(defaultPerDay("cigarettes")).toBe(10)
    expect(defaultPerDay("vape")).toBe(1)
    expect(defaultPerDay(null)).toBe(1)
  })
})

describe("parseAmount", () => {
  it("parses, clamps and rejects junk", () => {
    expect(parseAmount("0.52", 0, 100)).toBe(0.52)
    expect(parseAmount("2,5", 0, 100)).toBe(2.5)
    expect(parseAmount("250", 0, 100)).toBe(100)
    expect(parseAmount("", 0, 100)).toBeNull()
    expect(parseAmount("abc", 0, 100)).toBeNull()
    expect(parseAmount(".", 0, 100)).toBeNull()
    expect(parseAmount("1.239", 0, 100)).toBe(1.24)
  })
})

describe("pickCostSwap", () => {
  const swaps = [
    { usd: 250, text: "a watch" },
    { usd: 110, text: "shoes" },
    { usd: 5900, text: "a bike" },
  ]
  it("takes the largest swap within a year", () => {
    expect(pickCostSwap(1820, swaps)).toEqual({ swap: swaps[0], years: null })
    expect(pickCostSwap(250, swaps)?.swap.text).toBe("a watch")
  })
  it("else the smallest with years, only up to 10", () => {
    expect(pickCostSwap(50, swaps)).toEqual({ swap: swaps[1], years: 3 })
    expect(pickCostSwap(11, swaps)).toEqual({ swap: swaps[1], years: 10 })
    expect(pickCostSwap(10, swaps)).toBeNull()
  })
  it("gives nothing for zero use or no swaps", () => {
    expect(pickCostSwap(0, swaps)).toBeNull()
    expect(pickCostSwap(1000, [])).toBeNull()
  })
})

describe("how groups", () => {
  it("maps kind prefixes", () => {
    expect(groupOf("who-years")).toBe("who")
    expect(groupOf("how-tries")).toBe("how")
    expect(groupOf("quit-status")).toBe("how")
    expect(groupOf("helps-talk")).toBe("helps")
    expect(groupOf("after-body")).toBe("after")
    expect(groupOf("hope-lifetime")).toBe("other")
  })

  it("orders who, how and quit, helps, after, other; data order inside", () => {
    const base = makeValid().numbers[0]
    const kinds = ["after-a", "other-x", "helps-a", "quit-a", "who-a", "how-a", "helps-b"]
    const groups = groupNumbers(kinds.map((kind) => ({ ...base, kind })))
    expect(groups.map((g) => g.group)).toEqual(["who", "how", "helps", "after", "other"])
    expect(groups[1].items.map((n) => n.kind)).toEqual(["quit-a", "how-a"])
    expect(groups[2].items.map((n) => n.kind)).toEqual(["helps-a", "helps-b"])
  })
})
