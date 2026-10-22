/**
 * Madcow 5×5 — "Bill Starr 5x5, Linear Version for Intermediate Lifters" by
 * Madcow (madcow2), from his own GeoCities page and spreadsheet, read
 * 2026-10-22: the page through the Wayback Machine
 * (web.archive.org/web/20071014011825/…/Linear_5x5.htm) and the sheet
 * 5x5_intermediate_v0.3.xls from the oocities.org mirror. StrongLifts' guide
 * (stronglifts.com/madcow-5x5/workout-guide/) is the second source, for the
 * per-lift weekly jumps.
 *
 *   Monday     Squat, Bench, Barbell Row 5×5 — "ramping weight to top set of 5"
 *              Assistance: 2 sets weighted hypers, 4 sets weighted sit-ups
 *   Wednesday  Squat 4×5 — "first 3 sets are the same as Monday, the 4th set is
 *              repeating the 3rd set again"; Incline or Military 4×5 and
 *              Deadlift 4×5, ramping to a top set of 5. Assistance: 3 sets sit-ups
 *   Friday     Squat, Bench, Row 4×5, 1×3, 1×8 — "First 4 sets are the same as
 *              Monday's, the triple is 2.5% above your Monday top set of 5, use
 *              the weight from the 3rd set for a final set of 8". Assistance:
 *              3 sets weighted dips (5-8), barbell curls ×8, triceps extensions ×8
 *
 * The ramp is the sheet's "Set Interval 0.125": Monday 50 / 62.5 / 75 / 87.5 /
 * 100% of the top set; Wednesday's 4-set ramps 62.5 / 75 / 87.5 / 100%. The
 * working weight of each lift here IS its Monday (or Wednesday) top set of 5.
 *
 * Progression: "weekly increases of 2.5% of your top set … The Friday triple
 * is always the next week's Monday set of 5."
 *
 * - Squat, bench, row: the rule follows Friday's triple and adds nothing.
 *   Made at 102.5% of the working weight, the triple is the heaviest weight
 *   all the judged sets were made at, and the engine carries that weight
 *   forward as the new working weight (`judgeLoadEntry`'s "achieved") — so
 *   next Monday's top set is this Friday's triple, compounding 2.5% a week
 *   exactly as the sheet does (rounded to 2.5 lb each week).
 * - Incline/press and deadlift (Wednesday only): "you just increase by the
 *   percentage week to week". The format adds a fixed weight, so these add
 *   StrongLifts' weekly jumps, 2.5 lb and 5 lb — exactly 2.5% at this file's
 *   starting weights (deadlift 200, incline 100). Only the top set is judged:
 *   the ramp sets are lighter on purpose.
 */

import type { ProgramFixture } from "../fixture"
import type { ProgressionRule, SetGroup, SlotSpec } from "@/src/programs/spec/types"

const BIG = { kg: 2.5, lb: 5 } as const
const SMALL = { kg: 1.25, lb: 2.5 } as const

/**
 * "If you miss reps, keep the weight constant"; a stall of several weeks
 * resets about four weeks (see gaps). `group` is the one set at or above the
 * working weight that day.
 */
const weekly = (inc: { kg: number; lb: number }, group: string): ProgressionRule => ({ kind: "add-on-success", inc, failsBeforeDrop: 3, dropPct: 0.1, group })
const HOLD = { kind: "hold" } as const

const ramp = (pcts: number[]): SetGroup => ({
  id: "ramp",
  kind: "working",
  count: pcts.length,
  reps: 5,
  load: { from: "working" },
  perSet: pcts.map((pct) => ({ pct })),
})

const MONDAY_RAMP = [0.5, 0.625, 0.75, 0.875, 1]

/** Wednesday's incline/press and deadlift: three ramp sets, then the top set of 5. */
const wednesdayRamp = (): SetGroup[] => [
  ramp([0.625, 0.75, 0.875]),
  { id: "top", kind: "working", count: 1, reps: 5, load: { from: "working" } },
]

const monday = (id: string, lift: SlotSpec["lift"], stateKey: string): SlotSpec => ({
  id,
  lift,
  stateKey,
  note: "Top set of 5 = last Friday's triple.",
  sets: [ramp(MONDAY_RAMP)],
  progression: HOLD,
})

const friday = (id: string, lift: SlotSpec["lift"], stateKey: string): SlotSpec => ({
  id,
  lift,
  stateKey,
  sets: [
    ramp([0.5, 0.625, 0.75, 0.875]),
    { id: "triple", kind: "top", count: 1, reps: 3, load: { from: "working", pct: 1.025 }, note: "2.5% above Monday's top set of 5; next Monday's top set." },
    { id: "eight", kind: "backoff", count: 1, reps: 8, load: { from: "working", pct: 0.75 }, note: "The third set's weight." },
  ],
  // +0: the triple itself is next week's top set (see the header).
  progression: weekly({ kg: 0, lb: 0 }, "triple"),
})

const assistance = (id: string, lift: SlotSpec["lift"], count: number, reps: SlotSpec["sets"][number]["reps"], note?: string): SlotSpec => ({
  id,
  lift,
  ...(note ? { note } : {}),
  sets: [{ id: "work", kind: "working", count, reps, load: { from: "choose" } }],
  progression: HOLD,
})

const NO_REPS = "Reps are not given; your choice."

export const madcow5x5: ProgramFixture = {
  id: "madcow-5x5",
  title: "Madcow 5×5 (Bill Starr 5×5, linear intermediate version)",
  source: {
    url: "https://web.archive.org/web/20071014011825/http://www.geocities.com/elitemadcow1/5x5_Program/Linear_5x5.htm",
    author: "Madcow (madcow2), after Bill Starr",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Posted free by the author on his GeoCities site with a free spreadsheet (http://www.oocities.org/elitemadcow1/5x5_Program/5x5_intermediate_v0.3.zip, sheet 'Single Factor', Set Interval 0.125, no rounding). " +
      "StrongLifts' free guide https://stronglifts.com/madcow-5x5/workout-guide/ gives the per-lift weekly jumps (5 lb squat/deadlift, 2.5 lb bench/row/press).",
  },
  coverage: "close",
  gaps: [
    "Wednesday's incline/press and deadlift go up 2.5% a week, compounding (the sheet: 185 → 189.6 → 194.4 …); the format adds a fixed weight, so StrongLifts' fixed weekly jumps are encoded. At these starting weights they agree to the 2.5 lb step until about week 8. (Squat, bench and row compound exactly: their rule carries Friday's triple forward.)",
    "The squat/bench/row step rides on the engine carrying a heavier-than-asked weight forward as the new working weight; the format itself has no 'next working weight = this set's weight' rule, which is what Madcow says ('The Friday triple is always the next week's Monday set of 5').",
    "The new week's weight should follow from Monday's 5×5 ('If you miss reps, keep the weight constant the next week'), but the rule has to sit on the lift's LAST session of the week (Friday) so Wednesday and Friday keep this week's weight; it judges Friday's triple instead of Monday's sets.",
    "Stalls: 'several weeks of no progress … reset back several weeks', or 'reset the whole program and build back up to PRs over 4 weeks'; no numbers. Encoded as 3 missed weeks → −10% (about four weeks of 2.5%).",
    "Starting weights are worked back from the 5RM: 'Put your current 5 rep maxes at week 4 … take 2.5% off … back until you get to week 1'. The format takes a starting weight, not a target week for the max.",
    "Assistance sets have no reps for hypers and sit-ups; they are open ('1+') with a note.",
  ],
  spec: {
    specVersion: 2,
    name: "Madcow 5×5",
    blurb:
      "Three full-body days a week: Monday medium, Wednesday light, Friday heavy. Every lift ramps up in sets of 5 to one top set; Friday ends with a triple 2.5% above Monday and a set of 8. The top sets go up every week.",
    credit: "by Madcow, after Bill Starr",
    unit: "lb",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: null, atEnd: "repeat" },
    // The sheet does not round; StrongLifts' tables round to plates with 2.5 lb microloads.
    rounding: { stepLb: 2.5, stepKg: 1.25, mode: "nearest" },
    days: [
      {
        id: "mon",
        label: "Monday (medium)",
        weekday: 1,
        slots: [
          monday("mon_squat", { lib: "lib_back_squat", name: "Squat" }, "squat"),
          monday("mon_bench", { lib: "lib_bench_press" }, "bench"),
          monday("mon_row", { lib: "lib_barbell_row" }, "row"),
          assistance("mon_hypers", { name: "Weighted Hyperextension", loadStyle: "free" }, 2, { atLeast: 1 }, NO_REPS),
          assistance("mon_situps", { name: "Weighted Sit-up", loadStyle: "free" }, 4, { atLeast: 1 }, NO_REPS),
        ],
      },
      {
        id: "wed",
        label: "Wednesday (light)",
        weekday: 3,
        slots: [
          {
            id: "wed_squat",
            lift: { lib: "lib_back_squat", name: "Squat" },
            stateKey: "squat",
            note: "Monday's first three sets, then the third set again.",
            sets: [ramp([0.5, 0.625, 0.75, 0.75])],
            progression: HOLD,
          },
          {
            id: "wed_incline",
            lift: { name: "Incline Bench or Military Press" },
            choices: [{ lib: "lib_incline_bench" }, { lib: "lib_ohp", name: "Military Press" }],
            stateKey: "incline",
            sets: wednesdayRamp(),
            progression: weekly(SMALL, "top"),
          },
          {
            id: "wed_deadlift",
            lift: { lib: "lib_deadlift" },
            stateKey: "deadlift",
            sets: wednesdayRamp(),
            progression: weekly(BIG, "top"),
          },
          assistance("wed_situps", { name: "Sit-up", loadStyle: "bodyweight" }, 3, { atLeast: 1 }, NO_REPS),
        ],
      },
      {
        id: "fri",
        label: "Friday (heavy)",
        weekday: 5,
        slots: [
          friday("fri_squat", { lib: "lib_back_squat", name: "Squat" }, "squat"),
          friday("fri_bench", { lib: "lib_bench_press" }, "bench"),
          friday("fri_row", { lib: "lib_barbell_row" }, "row"),
          assistance("fri_dips", { lib: "lib_dip", name: "Weighted Dip" }, 3, { min: 5, max: 8 }),
          assistance("fri_curls", { lib: "lib_barbell_curl" }, 3, 8),
          assistance("fri_triceps", { name: "Triceps Extension", loadStyle: "free" }, 3, 8),
        ],
      },
    ],
  },
  start: { working: { squat: 200, bench: 100, row: 100, incline: 100, deadlift: 200 } },
  expect: [
    {
      session: 1,
      slot: "mon_squat",
      sets: "1x5@100, 1x5@125, 1x5@150, 1x5@175, 1x5@200",
      source: "Linear_5x5.htm Monday 'Squat 5x5 ramping to top set of 5'; sheet Single Factor B55 'Set Interval 0.125' → 50/62.5/75/87.5/100% (e.g. G62:G66 = 157.5, 196.875, 236.25, 275.625, 315 for a 315 top set)",
    },
    {
      session: 1,
      slot: "mon_bench",
      sets: "1x5@50, 1x5@62.5, 1x5@75, 1x5@87.5, 1x5@100",
      source: "Linear_5x5.htm Monday 'Bench 5x5' ramp; sheet G67:G71 = 50/62.5/75/87.5/100% of the top set",
    },
    {
      session: 2,
      slot: "wed_squat",
      sets: "1x5@100, 1x5@125, 2x5@150",
      source: "Linear_5x5.htm Wednesday: 'First 3 sets are the same as Monday, the 4th set is repeating the 3rd set again'; sheet G81:G84",
    },
    {
      session: 2,
      slot: "wed_deadlift",
      sets: "1x5@125, 1x5@150, 1x5@175, 1x5@200",
      source: "Linear_5x5.htm Wednesday 'Deadlift 4x5 ramping to top set of 5'; sheet G89:G92 = 62.5/75/87.5/100% (196.875, 236.25, 275.625, 315)",
    },
    {
      session: 3,
      slot: "fri_squat",
      sets: "1x5@100, 1x5@125, 1x5@150, 1x5@175, 1x3@205, 1x8@150",
      source: "Linear_5x5.htm Friday: 'First 4 sets are the same as Monday's, the triple is 2.5% above your Monday top set of 5, use the weight from the 3rd set for a final set of 8'; sheet G96:G101 (… 322.875 = 315 × 1.025, 236.25)",
    },
    {
      session: 3,
      slot: "fri_bench",
      sets: "1x5@50, 1x5@62.5, 1x5@75, 1x5@87.5, 1x3@102.5, 1x8@75",
      source: "Linear_5x5.htm Friday bench, same rule; sheet G102:G107",
    },
    {
      session: 13,
      slot: "mon_squat",
      sets: "1x5@110, 1x5@137.5, 1x5@165, 1x5@192.5, 1x5@220",
      source: "week 5 Monday: 'weekly increases of 2.5% of your top set' — 200 × 1.025⁴ = 220.76 (rounded week by week: 205, 210, 215, 220; StrongLifts' +5 lb a week gives the same) → 50/62.5/75/87.5/100% of 220",
    },
    {
      session: 14,
      slot: "wed_deadlift",
      sets: "1x5@137.5, 1x5@165, 1x5@192.5, 1x5@220",
      source: "week 5 Wednesday: 'For the non-squat Wednesday lifts you just increase by the percentage week to week' → 200 × 1.025⁴ = 220.76; StrongLifts 'adding 5lb on the top set each week' → 220; 62.5/75/87.5/100%",
    },
  ],
}
