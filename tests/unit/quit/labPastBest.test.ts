import { describe, expect, it } from "vitest"
import { LAB } from "@/src/quit/lab/registry"
import {
  avgShare,
  averageDays,
  bars,
  barShares,
  dangerWindow,
  emptyTry,
  endingCounts,
  handoffOf,
  helpedCounts,
  longestRun,
  tryDays,
  type LenUnit,
  type Try,
} from "@/src/quit/lab/past/best/logic"
import { bestText } from "@/src/quit/lab/past/best/text"

const mk = (id: string, len: number | null, unit: LenUnit = "days", extra: Partial<Try> = {}): Try => ({ ...emptyTry(id), len, unit, ...extra })
const OPTS = [
  { id: "stress", label: "Stress" },
  { id: "offered", label: "Offered" },
]

describe("past best registry", () => {
  it("registers best as the improved variant", () => {
    expect(LAB.past.variants.best.kind).toBe("best")
    expect(LAB.past.variants.best.label).toBe("Improved")
    expect(LAB.past.variants.best.addiction).toBe("nicotine")
  })
  it("never says failed", () => {
    expect(JSON.stringify(bestText).toLowerCase()).not.toMatch(/fail/)
  })
})

describe("lengths", () => {
  it("weeks count 7 days, months 30, no length is null", () => {
    expect(tryDays(mk("a", 2, "weeks"))).toBe(14)
    expect(tryDays(mk("a", 1, "months"))).toBe(30)
    expect(tryDays(mk("a", null))).toBeNull()
  })
  it("longest run with its count", () => {
    expect(longestRun([mk("a", 3), mk("b", 2, "weeks"), mk("c", null)])).toEqual({ days: 14, of: 2 })
    expect(longestRun([mk("a", null)])).toBeNull()
  })
})

describe("most common ending and most helped", () => {
  const tries = [
    mk("a", 3, "days", { ended: ["stress"], helped: ["told"] }),
    mk("b", 5, "days", { ended: ["offered", "stress"], helped: ["busy", "told"] }),
    mk("c", null, "days", { endedText: " Boredom " }),
    mk("d", 4),
  ]
  it("counts endings and the tries that name one", () => {
    const e = endingCounts(tries, OPTS)
    expect(e.items[0]).toMatchObject({ label: "Stress", count: 2 })
    expect(e.triesNaming).toBe(3)
    expect(e.items.map((i) => i.label)).toContain("Boredom")
  })
  it("most helped, ties keep data order", () => {
    const h = helpedCounts(tries, [{ id: "busy", label: "Busy" }, { id: "told", label: "Told" }])
    expect(h.items[0]).toMatchObject({ label: "Told", count: 2 })
    expect(h.triesNaming).toBe(2)
  })
})

describe("danger window", () => {
  it("needs two tries with lengths", () => {
    expect(dangerWindow([mk("a", 4)])).toBeNull()
    expect(dangerWindow([mk("a", 4), mk("b", null)])).toBeNull()
  })
  it("two tries: the span between them", () => {
    expect(dangerWindow([mk("a", 3), mk("b", 9)])).toEqual({ from: 3, to: 9, count: 2, of: 2 })
  })
  it("narrowest run holding more than half; weeks and months become days", () => {
    const w = dangerWindow([mk("a", 3), mk("b", 4), mk("c", 5), mk("d", 2, "months"), mk("e", 1, "weeks")])
    expect(w).toEqual({ from: 3, to: 5, count: 3, of: 5 })
    expect(dangerWindow([mk("a", 2, "weeks"), mk("b", 1, "months")])).toMatchObject({ from: 14, to: 30 })
  })
})

describe("bar chart", () => {
  const t = [mk("a", 10), mk("b", 20), mk("c", null), mk("d", 30)]
  it("one bar per try with a length, in order", () => {
    expect(bars(t).map((b) => b.days)).toEqual([10, 20, 30])
  })
  it("shares and the average line", () => {
    expect(barShares(bars(t))).toEqual([10 / 30, 20 / 30, 1])
    expect(averageDays(t)).toBe(20)
    expect(avgShare(bars(t))).toBeCloseTo(20 / 30)
    expect(avgShare([])).toBeNull()
  })
})

describe("handoff", () => {
  it("top two endings, window, helped list", () => {
    const tries = [
      mk("a", 3, "days", { ended: ["stress"], helped: ["told"] }),
      mk("b", 5, "days", { ended: ["stress", "offered"] }),
      mk("c", 6, "days", { endedText: "boredom" }),
    ]
    const h = handoffOf(tries, OPTS, [{ id: "told", label: "Told" }])
    expect(h.endings.map((e) => e.id)).toEqual(["stress", "offered"])
    expect(h.window).toEqual({ from: 5, to: 6 })
    expect(h.helped).toEqual([{ id: "told", label: "Told" }])
  })
})
