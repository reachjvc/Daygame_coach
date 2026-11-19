import { describe, expect, it } from "vitest"
import {
  EMPTY_COST,
  basisFor,
  boxNumber,
  computeCost,
  defaultCountMode,
  formatCents,
  formatCount,
  formatPrice,
  importOldCost,
  parseCost,
  parseCount,
  parsePackSize,
  parsePrice,
  price4,
  importedCountMode,
  usableUnit,
  yearlyCostFromRecord,
} from "@/src/quit/tools/cost/logic"
import { yearlyCost } from "@/src/quit/coaching"
import { groupNumbers, groupOf, isSameNumber } from "@/src/quit/tools/how/logic"
import { makeValid } from "../fixtures/valid"

const UNITS = [
  { id: "cigarettes", defaultPriceUsd: 0.52 },
  { id: "vape", defaultPriceUsd: 14.07 },
  { id: "pouches", defaultPriceUsd: 5.64 },
]

describe("computeCost", () => {
  it("10 a day at $0.52: $5.20, $158.17, $1,898.00, $18,980.00", () => {
    const f = computeCost(10, 0.52)
    expect(f.dayCents).toBe(520)
    expect(f.yearCents).toBe(189_800)
    expect(f.monthCents).toBe(15_817)
    expect(f.tenCents).toBe(1_898_000)
    expect(f.unitsYear).toBe(3650)
    expect(formatCents(f.yearCents)).toBe("$1,898.00")
    expect(formatCents(f.tenCents)).toBe("$18,980.00")
  })
  it("pack 9.00 / 20 = 0.45: $1,642.50 a year", () => {
    expect(computeCost(10, price4(9 / 20)).yearCents).toBe(164_250)
  })
  it("2 a week of a $14.07 vape: $4.02 a day, $1,467.30 a year", () => {
    const f = computeCost(2 / 7, 14.07)
    expect(f.dayCents).toBe(402)
    expect(f.yearCents).toBe(146_730)
  })
  it("a price that is not whole cents: the year is worked from the unrounded numbers", () => {
    const f = computeCost(10, 0.4495)
    expect(f.yearCents).toBe(164_068)
    expect(f.dayCents).toBe(450)
  })
  it("one a week at $0.52 is $27.11 a year, not 7 cents x 365", () => {
    const f = computeCost(1 / 7, 0.52)
    expect(f.yearCents).toBe(2711)
    expect(f.dayCents).toBe(7)
    expect(f.monthCents).toBe(226)
    expect(f.tenCents).toBe(27_110)
  })
  it("a day is the year divided by 365, a month the year divided by 12", () => {
    for (const [n, p] of [[3, 7.5], [0.5, 14.07], [2 / 7, 5.64], [499, 999]] as const) {
      const f = computeCost(n, p)
      expect(f.dayCents).toBe(Math.round(f.yearCents / 365))
      expect(f.monthCents).toBe(Math.round(f.yearCents / 12))
      expect(f.tenCents).toBe(f.yearCents * 10)
    }
  })
  it("zero use and the largest numbers", () => {
    expect(computeCost(0, 5).yearCents).toBe(0)
    expect(formatCents(computeCost(500, 1000).tenCents)).toBe("$1,825,000,000.00")
  })
})

describe("number text", () => {
  it("prices show to the cent or up to 4 decimals", () => {
    expect(formatPrice(0.52)).toBe("$0.52")
    expect(formatPrice(0.4495)).toBe("$0.4495")
    expect(formatPrice(1000)).toBe("$1,000.00")
    expect(formatCount(0.2857142857)).toBe("0.2857")
    expect(formatCount(3650)).toBe("3,650")
    expect(boxNumber(10.4, 2)).toBe("10.40")
    expect(boxNumber(0.4495, 2)).toBe("0.4495")
    expect(boxNumber(3.5)).toBe("3.5")
    expect(boxNumber(2)).toBe("2")
    expect(boxNumber(2 / 7 * 7)).toBe("2")
  })
})

describe("reading the form", () => {
  it("week counts are divided by 7, not rounded", () => {
    expect(parseCount("70", "week")).toEqual({ kind: "ok", value: 10 })
    expect(parseCount("2", "week")).toEqual({ kind: "ok", value: 2 / 7 })
    expect(parseCount("0.5", "day")).toEqual({ kind: "ok", value: 0.5 })
    expect(parseCount("", "day")).toEqual({ kind: "empty" })
  })
  it("refuses junk and numbers over 500 a day or 3,500 a week", () => {
    expect(parseCount("abc", "day").kind).toBe("bad")
    expect(parseCount("501", "day").kind).toBe("bad")
    expect(parseCount("500", "day").kind).toBe("ok")
    expect(parseCount("3501", "week").kind).toBe("bad")
    expect(parseCount("3500", "week").kind).toBe("ok")
  })
  it("a thousands comma is refused (1,000 could be one or a thousand), a decimal comma is not", () => {
    expect(parseCount("1,000", "week").kind).toBe("bad")
    expect(parsePrice("1,000", "one", 20).kind).toBe("bad")
    expect(parsePrice("7,500", "one", 20).kind).toBe("bad")
    expect(parsePrice("7,5", "one", 20)).toEqual({ kind: "ok", value: 7.5 })
    expect(parseCount("2,5", "day")).toEqual({ kind: "ok", value: 2.5 })
  })
  it("a price of one is kept to 4 decimals", () => {
    expect(price4(7 / 3)).toBe(2.3333)
    expect(parsePrice("7", "pack", 3)).toEqual({ kind: "ok", value: 2.3333 })
    expect(price4(0.52)).toBe(0.52)
  })
  it("pack size is a whole number from 1 to 100", () => {
    expect(parsePackSize("20")).toEqual({ kind: "ok", value: 20 })
    for (const bad of ["0", "101", "2.5", "x", "-1"]) expect(parsePackSize(bad).kind, bad).toBe("bad")
    expect(parsePackSize("").kind).toBe("empty")
  })
  it("a pack price is divided by the size; a comma is a decimal mark; empty is refused", () => {
    expect(parsePrice("9,00", "pack", 20)).toEqual({ kind: "ok", value: 0.45 })
    expect(parsePrice("7,50", "one", 20)).toEqual({ kind: "ok", value: 7.5 })
    expect(parsePrice("", "one", 20).kind).toBe("bad")
    expect(parsePrice("abc", "pack", 20).kind).toBe("bad")
    expect(parsePrice("1001", "one", 20).kind).toBe("bad")
  })
  it("a price is typed only when it differs from the starting price", () => {
    expect(basisFor(0.52, UNITS[0])).toBe("default")
    expect(basisFor(10.4 / 20, UNITS[0])).toBe("default")
    expect(basisFor(0.45, UNITS[0])).toBe("typed")
  })
  it("counts a week for vapes and pouches, a day for cigarettes", () => {
    expect(defaultCountMode("cigarettes")).toBe("day")
    expect(defaultCountMode("vape")).toBe("week")
    expect(defaultCountMode("pouches")).toBe("week")
  })
})

describe("saved state", () => {
  it("anything but the v2 shape is the empty state", () => {
    for (const j of [null, undefined, 5, "x", [], {}, { unit: "cigarettes", perDay: 20, daysPerWeek: 5, price: "0.60" }, { v: 1 }]) expect(parseCost(j)).toEqual(EMPTY_COST)
    expect(parseCost({ v: 2, priceMode: "one", packSize: 25, countMode: "week" })).toEqual({ v: 2, priceMode: "one", packSize: 25, countMode: "week", lastByUnit: {} })
    expect(parseCost({ v: 2, priceMode: "x", packSize: 0, countMode: 3 })).toEqual(EMPTY_COST)
  })
  it("lastByUnit keeps usable numbers per unit and drops the rest", () => {
    const s = parseCost({ v: 2, lastByUnit: { cigarettes: { perDay: 10, priceUsd: 0.45, priceBasis: "typed" }, vape: { perDay: 1, priceUsd: "x" }, pouches: { perDay: 9999, priceUsd: 5 }, gum: 5 } })
    expect(s.lastByUnit.cigarettes).toEqual({ perDay: 10, priceUsd: 0.45, priceBasis: "typed" })
    expect(s.lastByUnit.vape).toBeUndefined()
    expect(s.lastByUnit.pouches?.perDay).toBeNull()
    expect(s.lastByUnit.gum).toBeUndefined()
  })
  it("a record out of the typed range counts as not set", () => {
    const u = { id: "vape", perDay: 1, priceUsd: 14.07, priceBasis: "default" as const }
    expect(usableUnit(u)).toEqual(u)
    expect(usableUnit(null)).toBeNull()
    expect(usableUnit({ ...u, priceUsd: 1001 })).toBeNull()
    expect(usableUnit({ ...u, priceUsd: -1 })).toBeNull()
    expect(usableUnit({ ...u, perDay: 501 })).toEqual({ ...u, perDay: null })
    expect(usableUnit({ ...u, perDay: null })).toEqual({ ...u, perDay: null })
  })
})

describe("old wave-1 answers", () => {
  const old = { unit: "cigarettes", perDay: 20, daysPerWeek: 5, price: "0.60", done: 3 }
  it("move into the record: perDay x days / 7, price typed", () => {
    const u = importOldCost(old, UNITS, null)
    expect(u?.id).toBe("cigarettes")
    expect(u?.perDay).toBeCloseTo(14.2857142857, 8)
    expect(u?.priceUsd).toBe(0.6)
    expect(u?.priceBasis).toBe("typed")
  })
  it("a price equal to the starting price is default", () => {
    expect(importOldCost({ ...old, price: "0.52" }, UNITS, null)?.priceBasis).toBe("default")
  })
  it("a record that has a unit is never replaced; a bad price or unknown unit imports nothing", () => {
    expect(importOldCost(old, UNITS, { id: "vape", perDay: 1, priceUsd: 1, priceBasis: "default" })).toBeNull()
    expect(importOldCost({ ...old, price: "abc" }, UNITS, null)).toBeNull()
    expect(importOldCost({ ...old, price: "" }, UNITS, null)).toBeNull()
    expect(importOldCost({ ...old, unit: "gum" }, UNITS, null)).toBeNull()
    expect(importOldCost({ v: 2 }, UNITS, null)).toBeNull()
  })
  it("fewer than 7 days a week reads as a week count", () => {
    expect(importedCountMode(old)).toBe("week")
    expect(importedCountMode({ ...old, daysPerWeek: 7 })).toBe("day")
    expect(importedCountMode(null)).toBe("day")
  })
  it("a missing count is the old default: 10 for cigarettes, 1 otherwise", () => {
    expect(importOldCost({ unit: "vape", perDay: null, daysPerWeek: 7, price: "10" }, UNITS, null)?.perDay).toBe(1)
  })
})

describe("coaching cost line reads the shared record", () => {
  const rec = { unit: { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" } }
  it("count a day x price x 365", () => {
    expect(yearlyCostFromRecord(rec)).toBe(1898)
    expect(yearlyCost(rec)).toBe(1898)
  })
  it.each([[undefined], [null], ["x"], [{}], [{ unit: null }], [{ unit: { id: "vape", perDay: null, priceUsd: 14.07, priceBasis: "default" } }], [{ unit: { id: "vape", perDay: 1, priceUsd: "x" } }]])("ignores %j", (v) => {
    expect(yearlyCost(v)).toBeNull()
  })
})

describe("how groups", () => {
  it("maps kind prefixes", () => {
    expect(groupOf("who-years")).toBe("who")
    expect(groupOf("how-tries")).toBe("how")
    expect(groupOf("quit-status")).toBe("how")
    expect(groupOf("helps-talk")).toBe("helps")
    expect(groupOf("after-body")).toBe("after")
    expect(groupOf("hope-lifetime")).toBe("hope")
    expect(groupOf("misc-x")).toBe("other")
  })

  it("orders hope-, who, how and quit, helps, after, other; data order inside", () => {
    const base = makeValid().numbers[0]
    const kinds = ["after-a", "other-x", "helps-a", "quit-a", "who-a", "hope-lifetime", "how-a", "helps-b"]
    const groups = groupNumbers(kinds.map((kind) => ({ ...base, kind })))
    expect(groups.map((g) => g.group)).toEqual(["hope", "who", "how", "helps", "after", "other"])
    expect(groups[0].items.map((n) => n.kind)).toEqual(["hope-lifetime"])
    expect(groups[2].items.map((n) => n.kind)).toEqual(["quit-a", "how-a"])
    expect(groups[3].items.map((n) => n.kind)).toEqual(["helps-a", "helps-b"])
  })

  it("leaves out a number equal to the hope number, so it shows once", () => {
    const base = makeValid().numbers[0]
    const hope = { ...base, kind: "hope-free-now", big: "19 in 100", headline: "H" }
    const numbers = [{ ...hope }, { ...base, kind: "hope-lifetime" }, { ...base, kind: "hope-free-now", big: "20 in 100", headline: "H" }]
    const all = groupNumbers(numbers, hope).flatMap((g) => g.items)
    expect(all.map((n) => `${n.kind}/${n.big}`)).toEqual([`hope-lifetime/${base.big}`, "hope-free-now/20 in 100"])
    expect(isSameNumber(hope, hope)).toBe(true)
    expect(isSameNumber(base, null)).toBe(false)
  })
})
