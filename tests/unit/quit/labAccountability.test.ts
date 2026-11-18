import { describe, expect, it } from "vitest"
import { isAddictionId } from "@/src/quit/menu"
import { LAB } from "@/src/quit/lab/registry"
import { ago, daysBetween, looksLikeEmail } from "@/src/quit/lab/accountability/shared/logic"
import { filterFeed, seedFeed, allHealthy } from "@/src/quit/lab/accountability/a/logic"
import { TOKEN_DAYS, clockDayCount, dayShare, timeLabel, tokenDate, tokenEarned } from "@/src/quit/lab/accountability/b/logic"
import {
  exampleCommitment,
  incentives,
  isReportDue,
  isSuccess,
  nextReportDue,
  periodCount,
  pie,
  progressPct,
  totalStake,
  type Commitment,
} from "@/src/quit/lab/accountability/e/logic"

describe("accountability registry", () => {
  it("registers copies a, b, e with valid addictions", () => {
    const v = LAB.accountability.variants
    expect(Object.keys(v).sort()).toEqual(["a", "b", "e"])
    for (const x of Object.values(v)) {
      expect(isAddictionId(x.addiction)).toBe(true)
      expect(x.kind).toBe("copy")
    }
  })
})

describe("shared logic", () => {
  it("counts whole days and buckets ages", () => {
    expect(daysBetween("2026-11-01", "2026-11-18")).toBe(17)
    expect(daysBetween("2026-11-18", "2026-11-01")).toBe(0)
    expect(ago(36 * 60_000)).toEqual({ unit: "minutes", n: 36 })
    expect(ago(5 * 3_600_000)).toEqual({ unit: "hours", n: 5 })
    expect(ago(3 * 86_400_000)).toEqual({ unit: "days", n: 3 })
  })
  it("checks email shape", () => {
    expect(looksLikeEmail("a@b.co")).toBe(true)
    expect(looksLikeEmail("a@b")).toBe(false)
    expect(looksLikeEmail("")).toBe(false)
  })
})

describe("copy A logic", () => {
  it("filters the feed by flag and search text", () => {
    const f = seedFeed()
    expect(filterFeed(f, false, "")).toHaveLength(f.length)
    expect(filterFeed(f, true, "").every((i) => i.flagged)).toBe(true)
    expect(filterFeed(f, false, "ALBUM")).toHaveLength(1)
    expect(filterFeed(f, true, "nothing like this")).toHaveLength(0)
  })
  it("is healthy only when all three permissions are on", () => {
    expect(allHealthy({ vpn: true, notifications: true, extension: true })).toBe(true)
    expect(allHealthy({ vpn: true, notifications: false, extension: true })).toBe(false)
  })
})

describe("copy B logic", () => {
  it("counts clock days and earns tokens", () => {
    const c = { id: "x", name: "x", start: "2026-11-01", color: "#000" }
    expect(clockDayCount(c, "2026-11-18")).toBe(17)
    expect(tokenEarned(17, 7)).toBe(true)
    expect(tokenEarned(17, 30)).toBe(false)
    expect(tokenDate("2026-11-01", 7)).toBe("2026-11-08")
    expect(TOKEN_DAYS[0]).toBe(1)
  })
  it("places the ring dot and formats times", () => {
    expect(dayShare(new Date(2026, 10, 18, 12, 0, 0).getTime())).toBeCloseTo(0.5)
    expect(timeLabel(new Date(2026, 10, 18, 8, 5).getTime())).toBe("8:05 AM")
    expect(timeLabel(new Date(2026, 10, 18, 0, 5).getTime())).toBe("12:05 AM")
    expect(timeLabel(new Date(2026, 10, 18, 13, 30).getTime())).toBe("1:30 PM")
  })
})

describe("copy E logic", () => {
  const base = (): Commitment => ({ ...exampleCommitment("2026-11-18"), start: "2026-11-01", end: "2026-11-29", kind: "ongoing", required: "3", stake: 5, reports: [] })
  it("counts periods and totals the stake preview", () => {
    expect(periodCount(base())).toBe(4)
    expect(periodCount({ ...base(), kind: "oneshot" })).toBe(1)
    expect(totalStake(base())).toBe(20)
  })
  it("judges reports and the incentive tiles", () => {
    const c = base()
    c.reports = [
      { period: 1, count: 3, note: "", verdict: "confirmed", day: "2026-11-08" },
      { period: 2, count: 1, note: "", verdict: "confirmed", day: "2026-11-15" },
      { period: 3, count: 5, note: "", verdict: "overturned", day: "2026-11-22" },
    ]
    expect(isSuccess(c.reports[0], c.required)).toBe(true)
    expect(isSuccess(c.reports[1], c.required)).toBe(false)
    expect(isSuccess(c.reports[2], c.required)).toBe(false)
    expect(isSuccess(c.reports[0], "")).toBe(false)
    expect(pie(c)).toEqual({ success: 1, failed: 2 })
    expect(incentives(c)).toEqual({ saved: 5, forfeited: 10, remaining: 5, total: 20 })
  })
  it("schedules reports weekly and clamps to the end", () => {
    const c = base()
    expect(nextReportDue(c)).toBe("2026-11-08")
    expect(isReportDue(c, "2026-11-08")).toBe(true)
    expect(isReportDue(c, "2026-11-07")).toBe(false)
    expect(nextReportDue({ ...c, kind: "oneshot" })).toBe("2026-11-29")
    expect(progressPct({ start: "2026-11-01", end: "2026-11-11" }, "2026-11-11")).toBe(100)
  })
})
