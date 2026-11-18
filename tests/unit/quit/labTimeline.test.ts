import { describe, expect, it } from "vitest"
import { DAY_MS, beforeStart, countdown, doneCount, fill, fraction, remainingMs, seedStart, stateOf } from "@/src/quit/lab/timeline/shared/logic"
import { A_ITEMS } from "@/src/quit/lab/timeline/a/logic"
import { B_ITEMS } from "@/src/quit/lab/timeline/b/logic"
import { C_ORGANS } from "@/src/quit/lab/timeline/c/logic"
import { D_ITEMS } from "@/src/quit/lab/timeline/d/logic"
import { E_ITEMS } from "@/src/quit/lab/timeline/e/logic"
import { LAB } from "@/src/quit/lab/registry"
import { isAddictionId } from "@/src/quit/menu"

const NOW = new Date(2026, 10, 18, 12, 0, 0).getTime()
const seeded = { startMs: seedStart(NOW), seeded: 1 }
const own = { startMs: seedStart(NOW), seeded: 0 }

describe("timeline progress maths", () => {
  it("fraction is elapsed over duration, clamped", () => {
    expect(fraction(5, 10)).toBe(0.5)
    expect(fraction(20, 10)).toBe(1)
    expect(fraction(-5, 10)).toBe(0)
    expect(fraction(5, 0)).toBe(0)
  })
  it("fills from the example duration only in example mode", () => {
    expect(fill(seeded, { key: "x", exampleDays: 40 }, NOW)).toBeCloseTo((23 * DAY_MS + 4 * 3_600_000 + 23 * 60_000) / (40 * DAY_MS), 6)
    expect(fill(own, { key: "x", exampleDays: 40 }, NOW)).toBe(0)
  })
  it("states: locked, progress, done", () => {
    expect(stateOf(0)).toBe("locked")
    expect(stateOf(0.3)).toBe("progress")
    expect(stateOf(1)).toBe("done")
  })
  it("countdown counts down to zero and formats days, hours, minutes, seconds", () => {
    expect(countdown(16 * DAY_MS + 2 * 3_600_000 + 4 * 60_000 + 24_000)).toBe("16d 2h 4m 24s")
    expect(countdown(-5)).toBe("0d 0h 0m 0s")
    const m = { key: "x", exampleDays: 31 }
    const a = remainingMs(seeded, m, NOW)
    expect(remainingMs(seeded, m, NOW + 1000)).toBe(a - 1000)
    expect(remainingMs(seeded, m, NOW + 40 * DAY_MS)).toBe(0)
    expect(remainingMs(own, m, NOW)).toBe(0)
  })
  it("a future start date is before the quit date and fills nothing", () => {
    const future = { startMs: NOW + DAY_MS, seeded: 1 }
    expect(beforeStart(future, NOW)).toBe(true)
    expect(fill(future, { key: "x", exampleDays: 5 }, NOW)).toBe(0)
  })
  it("the example data gives the same mix as the demos: some done, some in progress", () => {
    expect(doneCount(seeded, A_ITEMS, NOW)).toBe(3)
    expect(doneCount(seeded, B_ITEMS, NOW)).toBe(2)
    expect(C_ORGANS.map((m) => Math.round(fill(seeded, m, NOW) * 100))).toEqual([70, 45, 50])
    expect(D_ITEMS.map((m) => Math.round(fill(seeded, m, NOW) * 100))).toEqual([100, 70, 47])
    expect(doneCount(seeded, E_ITEMS, NOW)).toBe(0)
  })
})

describe("timeline registry", () => {
  it("has copies a to e with valid addictions", () => {
    const v = LAB.timeline.variants
    expect(Object.keys(v).sort()).toEqual(["a", "b", "c", "current", "d", "e"])
    for (const l of ["a", "b", "c", "d", "e"]) {
      expect(v[l].kind).toBe("copy")
      expect(v[l].label).toBe(`Copy ${l.toUpperCase()}`)
      expect(isAddictionId(v[l].addiction)).toBe(true)
    }
    expect(v.e.addiction).toBe("weed")
  })
})
