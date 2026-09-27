// @vitest-environment node
/**
 * A 90-SECOND JOG AND A 3-MINUTE RUN PRINTED THE SAME NUMBER.
 *
 * `summarizeEndurance` formatted a block as `Math.round(durationSec / 60)m`,
 * so 90s came out "2m" — the same as the 180s block standing next to it. The
 * header above the line comes from `enduranceMinutes`, which sums the true
 * seconds, so the same line contradicted itself:
 *
 *   "About 30 min · Brisk walk 5m · 8×(Jog 1m / Walk 2m) · Walk 5m"
 *
 * The walk is 90s, not 2m, and the printed blocks add to 34 against a header
 * saying 30. Twelve of Couch to 5K's 27 sessions — all of weeks 1 to 4, the
 * beginner half — hold a 90s or 150s block, so the screen told a beginner to
 * run for twice as long as the program asks.
 *
 * `enduranceMinutes` had a unit test. `summarizeEndurance` was unexported and
 * had none, and its own doc comment described a `"jog 60s / walk 90s"` format
 * it did not produce.
 *
 * THE OTHER HALF: the Today card and the live screen printed
 * `blocks.map(b => b.label)` — the label alone, no duration at all — so the
 * session read "2× Jog → Walk → Run → Walk" and there was nothing on screen
 * saying how long to do any of it. Five of the thirteen catalogue programs
 * are endurance. One formatter owns all three screens now.
 */

import { describe, expect, test } from "vitest"
import { describeEnduranceBlock } from "@/src/programs/programsService"
import type { EnduranceBlock } from "@/src/programs/types"

/** The shape the app really holds — `kind` is required and the formatter
 *  never reads it, which is exactly why the first version of this file
 *  typechecked as `{ label, durationSec }` and the ratchet caught it. */
const block = (b: Omit<EnduranceBlock, "kind">): EnduranceBlock => ({ kind: "run", ...b })

describe("describeEnduranceBlock", () => {
  test("a minute and a half is not two minutes", () => {
    expect(describeEnduranceBlock(block({ label: "Walk", durationSec: 90 }))).toBe("Walk 90s")
    expect(describeEnduranceBlock(block({ label: "Jog", durationSec: 90 }))).not.toBe("Jog 2m")
  })

  test("and it is told apart from the block beside it", () => {
    // The whole fault: these two printed identically.
    expect(describeEnduranceBlock(block({ label: "Jog", durationSec: 90 }))).not.toBe(
      describeEnduranceBlock(block({ label: "Jog", durationSec: 180 }))
    )
  })

  test("whole minutes read as minutes", () => {
    expect(describeEnduranceBlock(block({ label: "Brisk walk", durationSec: 300 }))).toBe("Brisk walk 5 min")
    expect(describeEnduranceBlock(block({ label: "Run", durationSec: 180 }))).toBe("Run 3 min")
  })

  test("two and a half minutes keeps its half", () => {
    // 150s is the other length weeks 1-4 use, and `Math.round` made it 3m.
    expect(describeEnduranceBlock(block({ label: "Run", durationSec: 150 }))).toBe("Run 2.5 min")
  })

  test("a short block is seconds, not a fraction of a minute", () => {
    expect(describeEnduranceBlock(block({ label: "Sprint", durationSec: 30 }))).toBe("Sprint 30s")
  })

  test("a distance block says the distance", () => {
    expect(describeEnduranceBlock(block({ label: "Swim", distanceKm: 1.5 }))).toBe("Swim 1.5 km")
  })

  test("a block with neither is just its label, not a dangling unit", () => {
    expect(describeEnduranceBlock(block({ label: "Cool down" }))).toBe("Cool down")
  })

  test("the printed blocks add up to what the header claims", () => {
    /**
     * THE CONTRADICTION, as a number. Couch to 5K week 1: 5 min walk, then
     * 8×(60s jog / 90s walk), then 5 min walk. `enduranceMinutes` sums the
     * true seconds and says 30. The old formatter's blocks read 1m and 2m,
     * which adds to 34.
     */
    const blocks = [
      block({ label: "Brisk walk", durationSec: 300 }),
      block({ label: "Jog", durationSec: 60 }),
      block({ label: "Walk", durationSec: 90 }),
    ]
    const printed = blocks.map(describeEnduranceBlock)
    const seconds = printed.map((text) => {
      const s = text.match(/ (\d+)s$/)
      if (s) return Number(s[1])
      const m = text.match(/ ([\d.]+) min$/)
      return m ? Number(m[1]) * 60 : 0
    })
    expect(seconds).toEqual([300, 60, 90])
  })
})
