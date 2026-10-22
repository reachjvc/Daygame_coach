/**
 * THE COVERAGE FIXTURES — real programs, written in the program format, with
 * the numbers their own sources give.
 *
 * Plans/program-builder.md, "Coverage test": every free program in the
 * research corpus is encoded here, and each one states what week 1 and one
 * later week prescribe according to its source. Phase 1 checks that every
 * fixture is a valid program; Phase 2 runs each through the engine's
 * `simulate` and checks the numbers.
 *
 * WRITING `expect.sets` — what the engine shows for that lift, resolved:
 *
 *     sets  := run (", " run)*          consecutive identical sets merge into one run
 *     run   := COUNT "x" REPS ["@" LOAD] [" " EFFORT]
 *     COUNT := 3 | 3-5                  a fixed count or a range of sets
 *     REPS  := 5 | 8-12 | 5+ | 30s | 20-30s | t100
 *                                       fixed, range, at-least, seconds, a total
 *     LOAD  := 100 | 70-80 | bw | bw+10 | ?
 *                                       weight in the program's unit after rounding,
 *                                       a range, bodyweight, or "picked on the day"
 *     EFFORT:= rpe8.5 | rpe8-9 | rir2 | rpe<=9 | rpe<=9(last)
 *                                       "<=" is a ceiling; "(last)" the last set only
 *
 * Options ("3×10 … 10×3") are written as their first and last joined by "|":
 * `3x10|10x3@70-90`.
 *
 * WHICH SESSION. A program on a weekly calendar names `week` and `day`. A
 * program worked through in order with no weeks names `session`, counting
 * from 1 — the n-th workout done.
 *
 * THE SIMULATED LIFTER makes every set at the top of what was asked (the top
 * of a range, the floor of a "+" plus `outcome.amrapExtra`), every session,
 * in order. A set whose weight is picked by feel (an RPE top set) uses
 * `picks`, so back-offs worked out from it have something to work from.
 */

import type { ProgramSpec } from "@/src/programs/spec/types"

export interface FixtureExpectation {
  week?: number
  day?: string
  session?: number
  slot: string
  sets: string
  /** Where in the source this number is, so a mismatch can be checked against it. */
  source: string
}

export interface ProgramFixture {
  id: string
  title: string
  source: {
    url: string
    author: string
    /** "free": shared openly and may ship. "paid-public-rules": the rules are public; never ships. */
    terms: "free" | "paid-public-rules"
    checked: string
    notes?: string
  }
  /** "close": the format says it with a note; `gaps` says what it cannot say. */
  coverage: "exact" | "close"
  gaps?: string[]
  spec: ProgramSpec
  /** What the lifter starts with, in the spec's unit, keyed by lift (state key). */
  start: { working?: Record<string, number>; maxes?: Record<string, number> }
  /** The weight a by-feel set is done at, per slot: one number, or one per week. */
  picks?: Record<string, number | Record<number, number>>
  outcome?: { amrapExtra?: number }
  expect: FixtureExpectation[]
}
