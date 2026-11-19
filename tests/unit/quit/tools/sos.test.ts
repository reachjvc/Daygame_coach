import { describe, expect, it } from "vitest"
import nicotine from "@/src/quit/data/nicotine.json"
import {
  EMPTY_SOS,
  freshVisit,
  isNewVisit,
  moneyKept,
  niceDay,
  parseSos,
  recentCloseCall,
  ringClock,
  ringView,
  situationBars,
  VISIT_MS,
} from "@/src/quit/tools/sos/logic"
import { didYouUse } from "@/src/quit/wording"

describe("the ring", () => {
  const t0 = 1_000_000
  it("starts full and ends at zero for 5, 10 and 15", () => {
    for (const m of [5, 10, 15]) {
      expect(ringView(m, t0, t0).leftMs).toBe(m * 60_000)
      expect(ringView(m, t0, t0 + m * 60_000)).toMatchObject({ leftMs: 0, over: true, running: false })
      expect(ringView(m, t0, t0 + 1000).running).toBe(true)
    }
  })
  it("a clock moved back never shows more than the full time; no start means idle", () => {
    expect(ringView(10, t0, t0 - 30_000).leftMs).toBe(600_000)
    expect(ringView(10, null, t0)).toMatchObject({ running: false, over: false, fraction: 1 })
  })
  it("formats mm:ss rounding up", () => {
    expect(ringClock(600_000)).toBe("10:00")
    expect(ringClock(59_001)).toBe("01:00")
    expect(ringClock(1)).toBe("00:01")
    expect(ringClock(0)).toBe("00:00")
  })
})

describe("a visit is fresh when the last ended or began over 60 minutes ago", () => {
  const now = 10 * VISIT_MS
  it("none yet, ended, old", () => {
    expect(isNewVisit(EMPTY_SOS, now)).toBe(true)
    expect(isNewVisit({ ...EMPTY_SOS, visit: now - 1000, ended: true }, now)).toBe(true)
    expect(isNewVisit({ ...EMPTY_SOS, visit: now - VISIT_MS - 1, ended: false }, now)).toBe(true)
  })
  it("a running visit under 60 minutes old goes on", () => {
    expect(isNewVisit({ ...EMPTY_SOS, visit: now - VISIT_MS + 1000 }, now)).toBe(false)
    expect(isNewVisit({ ...EMPTY_SOS, visit: now - 61 * 60_000 }, now)).toBe(true)
  })
  it("a fresh visit starts a ten-minute ring, drops the result, keeps reasons and best score", () => {
    const old = { ...EMPTY_SOS, visit: 5, ended: true, belief: "b1", reportId: "r", reportKind: "slip" as const, reasons: "my kids", best2048: 512, ringMinutes: 5 as const }
    expect(freshVisit(old, now)).toEqual({ ...EMPTY_SOS, visit: now, ringStartedAt: now, reasons: "my kids", best2048: 512 })
  })
})

describe("saved state is checked", () => {
  it("junk gives the empty state", () => {
    for (const j of [null, undefined, 5, "x", [], {}]) expect(parseSos(j)).toEqual(EMPTY_SOS)
  })
  it("keeps a good shape and drops bad fields", () => {
    const s = parseSos({ visit: 5, ended: true, ringMinutes: 15, ringStartedAt: 9, belief: "b2", reasons: "x".repeat(400), best2048: -3 })
    expect(s).toMatchObject({ visit: 5, ended: true, ringMinutes: 15, ringStartedAt: 9, belief: "b2", best2048: 0 })
    expect(s.reasons).toHaveLength(300)
  })
})

describe("a second close call inside five minutes updates the first", () => {
  const r = (id: string, at: string, wentThrough = false) => ({ id, at, wentThrough })
  it("finds the latest close call within five minutes", () => {
    const list = [r("a", "2026-11-19T10:00:00"), r("b", "2026-11-19T10:03:00")]
    expect(recentCloseCall(list, "2026-11-19T10:05:00")?.id).toBe("b")
    expect(recentCloseCall(list, "2026-11-19T10:09:00")).toBeNull()
    expect(recentCloseCall(list, "2026-11-19T10:08:01")).toBeNull()
  })
  it("never merges into a slip", () => {
    expect(recentCloseCall([r("s", "2026-11-19T10:00:00", true)], "2026-11-19T10:01:00")).toBeNull()
  })
})

describe("his own pattern", () => {
  const moments = (nicotine.riskyMoments as { id: string; label: string }[]).slice(0, 3)
  it("waits for three saves that name a situation", () => {
    const logs = [{ at: "x", where: moments[0].id }, { at: "y", where: "" }, { at: "z", where: moments[1].id }]
    expect(situationBars(logs, moments)).toMatchObject({ total: 2, ready: false })
  })
  it("orders bars by count and shares add to 100", () => {
    const logs = [moments[1].id, moments[1].id, moments[0].id].map((where) => ({ at: "x", where }))
    const p = situationBars(logs, moments)
    expect(p.ready).toBe(true)
    expect(p.bars.map((b) => [b.id, b.count, b.percent])).toEqual([[moments[1].id, 2, 67], [moments[0].id, 1, 33]])
  })
})

describe("money kept comes from his numbers", () => {
  it("10 cigarettes a day, 0.517 each (10.34 a pack of 20), 30 days is about 155", () => {
    const k = moneyKept("2026-10-20", "2026-11-19", { id: "cigarettes", perDay: 10, priceUsd: 0.517 })
    expect(k?.days).toBe(30)
    expect(Math.round(k!.amountUsd)).toBe(155)
    expect(k?.eachUsd).toBe(0.517)
  })
  it("a vape is the price of one times the count", () => {
    const k = moneyKept("2026-11-17", "2026-11-19", { id: "vape", perDay: 1, priceUsd: 14.07 })
    expect(k?.amountUsd).toBeCloseTo(28.14, 2)
  })
  it("nothing without a past date, a count or a price", () => {
    const u = { id: "vape", perDay: 1, priceUsd: 14 }
    expect(moneyKept(null, "2026-11-19", u)).toBeNull()
    expect(moneyKept("2026-11-19", "2026-11-19", u)).toBeNull()
    expect(moneyKept("2026-11-25", "2026-11-19", u)).toBeNull()
    expect(moneyKept("2026-11-01", "2026-11-19", null)).toBeNull()
    expect(moneyKept("2026-11-01", "2026-11-19", { ...u, perDay: 0 })).toBeNull()
    expect(moneyKept("2026-11-01", "2026-11-19", { ...u, perDay: null })).toBeNull()
    expect(moneyKept("2026-11-01", "2026-11-19", { ...u, priceUsd: 0 })).toBeNull()
  })
  it("writes a day plainly", () => {
    expect(niceDay("2026-10-20")).toBe("20 Oct 2026")
  })
})

describe("the question after", () => {
  it("fits the unit, or says it", () => {
    expect(didYouUse({ id: "vape" })).toBe("Did you vape?")
    expect(didYouUse(null)).toBe("Did you use it?")
  })
})
