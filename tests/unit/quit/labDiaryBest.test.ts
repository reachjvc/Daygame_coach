import { describe, expect, it } from "vitest"
import {
  MIN_ENTRIES,
  atFromParts,
  bucketOf,
  byMove,
  bySituation,
  byTime,
  byWeekday,
  dayGroups,
  parseEntries,
  patternMode,
  remove,
  seedEntries,
  upsert,
  type DiaryEntry,
} from "@/src/quit/lab/diary/best/logic"
import { bestText as t } from "@/src/quit/lab/diary/best/text"

const at = (date: string, time: string) => atFromParts(date, time) as number
const entry = (over: Partial<DiaryEntry> & { id: string }): DiaryEntry => ({ at: at("2026-11-16", "09:00"), strength: 5, situation: null, feelings: [], moves: [], used: null, ...over })

describe("diary best: pattern gates", () => {
  it("nothing below 5, counts to 9, shares from 10", () => {
    expect(MIN_ENTRIES).toBe(5)
    expect([0, 4].map(patternMode)).toEqual(["none", "none"])
    expect([5, 9].map(patternMode)).toEqual(["counts", "counts"])
    expect([10, 40].map(patternMode)).toEqual(["percent", "percent"])
  })
})

describe("diary best: time of day", () => {
  it("covers the 24 hours with the stated ranges", () => {
    expect([5, 11].map(bucketOf)).toEqual(["morning", "morning"])
    expect([12, 16].map(bucketOf)).toEqual(["afternoon", "afternoon"])
    expect([17, 21].map(bucketOf)).toEqual(["evening", "evening"])
    expect([22, 23, 0, 4].map(bucketOf)).toEqual(["night", "night", "night", "night"])
  })
  it("counts per part of the day, empty parts kept, percent only from 10", () => {
    const few = [entry({ id: "a", at: at("2026-11-16", "08:00") }), entry({ id: "b", at: at("2026-11-16", "23:30") })]
    const rows = byTime(few, t.timeLabels)
    expect(rows.map((r) => r.count)).toEqual([1, 0, 0, 1])
    expect(rows.every((r) => r.percent === null)).toBe(true)
    const many = Array.from({ length: 10 }, (_, i) => entry({ id: String(i), at: at("2026-11-16", i < 4 ? "08:00" : "13:00") }))
    expect(byTime(many, t.timeLabels).map((r) => r.percent)).toEqual([40, 60, 0, 0])
  })
})

describe("diary best: weekday and situation", () => {
  it("counts weekdays, Monday first", () => {
    // 2026-11-16 is a Monday, 2026-11-22 a Sunday
    const rows = byWeekday([entry({ id: "a" }), entry({ id: "b" }), entry({ id: "c", at: at("2026-11-22", "10:00") })], t.weekdays)
    expect(rows.map((r) => [r.label, r.count])).toEqual([["Monday", 2], ["Tuesday", 0], ["Wednesday", 0], ["Thursday", 0], ["Friday", 0], ["Saturday", 0], ["Sunday", 1]])
  })
  it("lists situations most often first and skips unnamed entries", () => {
    const moments = [{ id: "x", label: "X" }, { id: "y", label: "Y" }, { id: "z", label: "Z" }]
    const r = bySituation([entry({ id: "1", situation: "y" }), entry({ id: "2", situation: "y" }), entry({ id: "3", situation: "x" }), entry({ id: "4" })], moments)
    expect(r.total).toBe(3)
    expect(r.rows.map((x) => [x.key, x.count])).toEqual([["y", 2], ["x", 1]])
  })
})

describe("diary best: moves", () => {
  it("counts how often a move was listed and how often he got through", () => {
    const deck = [{ id: "m1", text: "One" }, { id: "m2", text: "Two" }, { id: "m3", text: "Three" }]
    const es = [
      entry({ id: "1", moves: ["m1", "m2"], used: false }),
      entry({ id: "2", moves: ["m1"], used: true }),
      entry({ id: "3", moves: ["m1"], used: null }),
    ]
    expect(byMove(es, deck)).toEqual([
      { id: "m1", text: "One", used: 3, through: 1 },
      { id: "m2", text: "Two", used: 1, through: 1 },
    ])
  })
})

describe("diary best: days, edit, delete", () => {
  const es = [
    entry({ id: "1", at: at("2026-11-16", "09:00"), strength: 4 }),
    entry({ id: "2", at: at("2026-11-16", "21:00"), strength: 7, used: true }),
    entry({ id: "3", at: at("2026-11-15", "12:00"), strength: 3 }),
  ]
  it("groups by day with count, mean strength and slips, newest first", () => {
    const g = dayGroups(es)
    expect(g.map((d) => [d.date, d.count, d.mean, d.slips])).toEqual([["2026-11-16", 2, 5.5, 1], ["2026-11-15", 1, 3, 0]])
    expect(g[0].entries.map((e) => e.id)).toEqual(["2", "1"])
  })
  it("upsert replaces by id and adds new ones; remove drops one", () => {
    expect(upsert(es, { ...es[0], strength: 9 }).find((e) => e.id === "1")?.strength).toBe(9)
    expect(upsert(es, entry({ id: "n" }))).toHaveLength(4)
    expect(remove(es, "2").map((e) => e.id)).toEqual(["1", "3"])
  })
  it("a past time parses, a bad one does not", () => {
    expect(atFromParts("2026-11-16", "08:30")).not.toBeNull()
    expect(atFromParts("2026-11-16", "25:00")).toBeNull()
    expect(atFromParts("nope", "08:30")).toBeNull()
  })
})

describe("diary best: saved data and example", () => {
  it("drops broken saved entries", () => {
    expect(parseEntries([{ id: "a", at: 1, strength: 3 }, { id: "b", at: 1, strength: 11 }, "x", null])).toHaveLength(1)
    expect(parseEntries("no")).toEqual([])
  })
  it("builds 20 example entries, also with no moments or moves", () => {
    const now = new Date("2026-11-18T12:00:00").getTime()
    const full = seedEntries(now, { moments: [{ id: "a" }, { id: "b" }], moves: [{ id: "m" }], feelings: ["stress"] })
    expect(full).toHaveLength(20)
    expect(full.some((e) => e.used === true)).toBe(true)
    expect(full.every((e) => e.at < now)).toBe(true)
    const bare = seedEntries(now, { moments: [], moves: [], feelings: [] })
    expect(bare.every((e) => e.situation === null && e.moves.length === 0)).toBe(true)
  })
})

describe("diary best: words", () => {
  it("has no exclamation marks and no streak words", () => {
    const flat = JSON.stringify(t, (_k, v) => (typeof v === "function" ? [v(1, 1, 1, 1), v(2, 2)] : v))
    expect(flat).not.toMatch(/!|streak|points|rank/i)
  })
})
