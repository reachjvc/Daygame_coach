/**
 * THE UNIT THE PARSER TAKES FROM A TITLE'S OWN WORDS (Plans/plan-new-from-real.md, Phase 5, item 10).
 *
 * The phone walk found two titles whose unit came out as a fragment of the sentence, and the Review step shows that
 * unit back to the person as theirs:
 *   "Run 5k on Sundays"  -> unit "k on"  (the word after the unit is joined on: `on` is not in NOT_A_NOUN)
 *   "Do 15 pull-ups"     -> unit "pull"  (a hyphenated noun is cut at the hyphen; "pull ups" with a space is fine)
 *
 * The parser is `parseGoalTarget` in src/goals/northStarService.ts, a file another branch owns while this one
 * is open, so the fix is NOT made here. These cases are written as they should read once it is fixed and are marked
 * `it.fails`: they pass while the bug stands and go RED the day it is fixed, which is the cue to delete the marker.
 * The cases that already work stay as plain tests so the fix cannot break them.
 */

import { describe, it, expect } from "vitest"
import { parseGoalTarget } from "@/src/goals/northStarService"

const unitOf = (title: string) => parseGoalTarget(title)?.unit ?? ""

describe("units that already read right", () => {
  it("a bare k before a month name", () => expect(unitOf("Run 10k in April")).toBe("k"))
  it("a measurement stops at one word", () => expect(unitOf("Swim 2km on Fridays")).toBe("km"))
  it("a two-word noun with a space", () => expect(unitOf("Do 15 pull ups")).toBe("pull ups"))
})

describe("DEBT: units that come out as a fragment (fix in northStarService.ts, then remove `.fails`)", () => {
  it.fails("a weekday phrase is not part of the unit: 'Run 5k on Sundays' has the unit 'k'", () => expect(unitOf("Run 5k on Sundays")).toBe("k"))
  it.fails("a hyphenated noun is one unit: 'Do 15 pull-ups' has the unit 'pull-ups'", () => expect(unitOf("Do 15 pull-ups")).toBe("pull-ups"))
  it.fails("the same for push-ups: 'Do 20 push-ups a day' has the unit 'push-ups'", () => expect(unitOf("Do 20 push-ups a day")).toBe("push-ups"))
})
