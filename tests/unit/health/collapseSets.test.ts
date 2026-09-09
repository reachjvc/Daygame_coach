/**
 * A 5×5 is one line, and the set you missed is the one that stands out.
 */
import { describe, it, expect } from "vitest"
import { collapseSets } from "@/src/health/healthService"

const set = (n: number, weight: number, reps: number, kind = "working") => ({
  exercise: "Squat", weight_kg: weight, reps, set_kind: kind, set_number: n,
})

describe("collapseSets", () => {
  it("says five identical sets once", () => {
    const out = collapseSets([1, 2, 3, 4, 5].map((n) => set(n, 100, 5)))
    expect(out).toHaveLength(1)
    expect(out[0].count).toBe(5)
    expect(out[0].setNumbers).toEqual([1, 2, 3, 4, 5])
  })

  it("makes the miss stand out instead of hiding it", () => {
    const out = collapseSets([set(1, 100, 5), set(2, 100, 5), set(3, 100, 5), set(4, 100, 3)])
    expect(out).toHaveLength(2)
    expect(out[0].count).toBe(3)
    expect(out[1]).toMatchObject({ count: 1, reps: 3 })
  })

  it("does not merge across a gap, because order is information", () => {
    // 100, 100, a miss, then 100 again is not "three sets of 100" — the miss is
    // in the middle and merging the outer two would say it happened elsewhere.
    const out = collapseSets([set(1, 100, 5), set(2, 100, 5), set(3, 100, 2), set(4, 100, 5)])
    expect(out.map((r) => r.count)).toEqual([2, 1, 1])
  })

  it("keeps a warm-up separate from a working set at the same weight", () => {
    const out = collapseSets([set(1, 60, 5, "warmup"), set(1, 60, 5, "working")])
    expect(out).toHaveLength(2)
    expect(out[0].kind).toBe("warmup")
  })

  it("returns nothing for nothing", () => {
    expect(collapseSets([])).toEqual([])
  })
})
