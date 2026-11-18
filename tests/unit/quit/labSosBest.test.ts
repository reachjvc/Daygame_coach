import { describe, expect, it } from "vitest"
import {
  addLog,
  buildDeck,
  freshSheet,
  LOG_WINDOW_MS,
  minutesWaited,
  nextCard,
  parseWait,
  pop,
  poppedCount,
  prevCard,
  ringClock,
  ringView,
  sheetDone,
  situationBars,
  BUBBLE_COUNT,
  type LogEntry,
} from "@/src/quit/lab/sos/best/logic"

describe("wait ring with a chosen length", () => {
  it("idle shows the full chosen length", () => {
    const v = ringView({ minutes: 5, startedAt: null }, 1000)
    expect(v).toMatchObject({ running: false, over: false, leftMs: 300_000, fraction: 1 })
    expect(ringClock(v.leftMs)).toBe("05:00")
  })
  it("runs down and ends for 5, 10 and 15", () => {
    for (const m of [5, 10, 15]) {
      const w = { minutes: m, startedAt: 1000 }
      expect(ringView(w, 1000 + 60_000).leftMs).toBe(m * 60_000 - 60_000)
      expect(ringView(w, 1000 + 60_000).running).toBe(true)
      expect(ringView(w, 1000 + m * 60_000)).toMatchObject({ over: true, running: false, leftMs: 0, fraction: 0 })
      expect(ringView(w, 1000 + m * 60_000 * 3).leftMs).toBe(0)
    }
    expect(ringClock(ringView({ minutes: 10, startedAt: 0.5 }, 90_500).leftMs)).toBe("08:30")
  })
  it("counts whole minutes waited, never past the length", () => {
    expect(minutesWaited({ minutes: 5, startedAt: null }, 99)).toBe(0)
    expect(minutesWaited({ minutes: 5, startedAt: 1000 }, 1000 + 125_000)).toBe(2)
    expect(minutesWaited({ minutes: 5, startedAt: 1000 }, 1000 + 9_000_000)).toBe(5)
  })
  it("reads saved state safely, 10 minutes by default", () => {
    expect(parseWait(null)).toEqual({ minutes: 10, startedAt: null })
    expect(parseWait({ minutes: 7, startedAt: "x" })).toEqual({ minutes: 10, startedAt: null })
    expect(parseWait({ minutes: 15, startedAt: 123 })).toEqual({ minutes: 15, startedAt: 123 })
  })
})

describe("log de-duplication", () => {
  const first: LogEntry = { at: 0, strength: 6, situation: "coffee" }
  it("adds the first log", () => {
    const r = addLog([], first, 1_000_000)
    expect(r.updated).toBe(false)
    expect(r.logs).toEqual([{ at: 1_000_000, strength: 6, situation: "coffee" }])
  })
  it("updates the last log inside five minutes", () => {
    const one = addLog([], first, 1_000_000).logs
    const r = addLog(one, { at: 0, strength: 8, situation: "drinks" }, 1_000_000 + LOG_WINDOW_MS - 1)
    expect(r.updated).toBe(true)
    expect(r.logs).toEqual([{ at: 1_000_000, strength: 8, situation: "drinks" }])
  })
  it("adds a new log from five minutes on", () => {
    const one = addLog([], first, 1_000_000).logs
    const r = addLog(one, first, 1_000_000 + LOG_WINDOW_MS)
    expect(r.updated).toBe(false)
    expect(r.logs).toHaveLength(2)
  })
})

describe("situation bar list", () => {
  const moments = [
    { id: "coffee", label: "With a coffee" },
    { id: "drinks", label: "When drinking" },
    { id: "stress", label: "Under stress" },
  ]
  const log = (situation: string | null): LogEntry => ({ at: 1, strength: null, situation })
  it("waits until three logs name a situation", () => {
    expect(situationBars([log("coffee"), log("coffee"), log(null)], moments)).toMatchObject({ total: 2, ready: false })
  })
  it("lists the most frequent first with shares", () => {
    const p = situationBars([log("coffee"), log("stress"), log("stress")], moments)
    expect(p.ready).toBe(true)
    expect(p.bars.map((b) => [b.id, b.count, b.percent])).toEqual([
      ["stress", 2, 67],
      ["coffee", 1, 33],
    ])
  })
  it("ignores situations the data no longer has", () => {
    expect(situationBars([log("gone"), log("gone"), log("gone")], moments)).toMatchObject({ total: 0, ready: false, bars: [] })
  })
})

describe("bubble wrap", () => {
  it("starts unpopped, pops one and keeps it popped", () => {
    const s = freshSheet()
    expect(s).toHaveLength(BUBBLE_COUNT)
    expect(poppedCount(s)).toBe(0)
    const a = pop(s, 3)
    expect(a[3]).toBe(true)
    expect(poppedCount(pop(a, 3))).toBe(1)
    expect(s[3]).toBe(false)
  })
  it("is done when every bubble is popped", () => {
    let s = freshSheet()
    for (let i = 0; i < BUBBLE_COUNT; i++) s = pop(s, i)
    expect(sheetDone(s)).toBe(true)
    expect(sheetDone(freshSheet())).toBe(false)
  })
})

describe("help deck", () => {
  const swap = (id: string, text: string) => ({ id, text, evidence: "none" as const, refs: [] })
  it("puts responses first, adds swaps, never repeats a sentence", () => {
    const deck = buildDeck(
      [
        { id: "r1", text: "Drink water" },
        { id: "r2", text: "Walk" },
      ],
      [{ id: "relief", name: "Relief", swaps: [swap("s1", "walk"), swap("s2", "Call someone")] }],
    )
    expect(deck.map((c) => c.text)).toEqual(["Drink water", "Walk", "Call someone"])
    expect(deck[1].swap?.id).toBe("s1")
  })
  it("wraps in both directions and handles an empty deck", () => {
    expect(nextCard(2, 3)).toBe(0)
    expect(prevCard(0, 3)).toBe(2)
    expect(nextCard(0, 0)).toBe(0)
    expect(buildDeck(null, null)).toEqual([])
  })
})
