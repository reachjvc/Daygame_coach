/**
 * Lyle McDonald's Generic Bulking Routine, from his own posts on his forum
 * (monkeyisland.lylemcdonald.com, the bodyrecomposition.com forum), as the
 * "Lyle McDonald Generic Bulking Routine – FAQ" compiles them (Alisenon, Jan
 * 2009, hosted by JCD Fitness; read 2026-10-22). Every quote below is Lyle's.
 *
 * The routine (FAQ 1.1): Monday lower, Tuesday upper, Thursday and Friday
 * "either repeat the first two or make some slight exercise substitutions" —
 * repeated here, sharing each lift's working weight across the two days.
 *
 * The cycle (FAQ 2.1, 2.3): "week 1: 80-85% of previous maxes; week 2: 90-95%
 * of previous maxes; week 3-n: push the weights as much as you can", and
 * "each cycle lasts 6-8 weeks (2 week submax runup + 4-6 weeks pushing the
 * weights)". The working weight here IS the previous max: the run-up is a
 * percentage of it, and from week 3 it is lifted itself and pushed up —
 * "add weight when you get your target reps with one in the tank … Big
 * movements can usually go 2.5-5 lbs, littler movements 1-2.5 lbs" (FAQ 2.11).
 *
 * The run-up and the push are two set groups. Each is skipped in the other's
 * weeks, and the progression rule follows the push group, so the run-up does
 * not move the working weight. On repeat, the weight the last cycle reached is
 * the next cycle's "previous max".
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, SlotSpec } from "@/src/programs/spec/types"

const r = (min: number, max: number) => ({ min, max })
const BIG = { kg: 2.5, lb: 5 }
const SMALL = { kg: 1, lb: 2.5 }

/** One lift of the routine: a submax run-up in weeks 1–2, the real sets from week 3. */
const lift = (
  id: string,
  ref: LiftRef,
  stateKey: string,
  count: { min: number; max: number },
  reps: { min: number; max: number },
  restSec: number,
  inc: { kg: number; lb: number },
  extra: Partial<SlotSpec> = {}
): SlotSpec => ({
  id,
  lift: ref,
  stateKey,
  restSec,
  sets: [
    {
      id: "runup",
      kind: "working",
      count,
      reps,
      load: { from: "working", pct: r(0.8, 0.85) },
      note: "Run-up: a percentage of last cycle's weight.",
    },
    {
      id: "work",
      kind: "working",
      count,
      reps,
      load: { from: "working" },
      effort: { rir: r(1, 2) },
      note: "First set heaviest, a rep or two short of failure; keep the weight or drop it a little to stay in the range.",
    },
  ],
  weeks: [
    { weeks: "2", set: "runup", load: { from: "working", pct: r(0.9, 0.95) } },
    { weeks: "3-8", set: "runup", skip: true },
    { weeks: "1-2", set: "work", skip: true },
  ],
  progression: { kind: "double", inc, group: "work" },
  ...extra,
})

const lowerDay = (d: string): SlotSpec[] => [
  lift(`${d}_squat`, { lib: "lib_back_squat", name: "Squat" }, "squat", r(3, 4), r(6, 8), 180, BIG),
  lift(`${d}_sldl`, { name: "SLDL or Leg Curl" }, "sldl_or_curl", r(3, 4), r(6, 8), 180, BIG, {
    choices: [{ lib: "lib_stiff_leg_deadlift" }, { lib: "lib_leg_curl" }],
  }),
  lift(`${d}_leg_press`, { lib: "lib_leg_press" }, "leg_press", r(2, 3), r(10, 12), 120, BIG),
  lift(`${d}_leg_curl`, { name: "Another Leg Curl" }, "leg_curl_2", r(2, 3), r(10, 12), 120, SMALL, {
    choices: [{ lib: "lib_leg_curl" }, { lib: "lib_seated_leg_curl" }],
  }),
  lift(`${d}_calf`, { lib: "lib_standing_calf_raise", name: "Calf Raise" }, "calf_raise", r(3, 4), r(6, 8), 180, SMALL),
  lift(`${d}_seated_calf`, { lib: "lib_seated_calf_raise", name: "Seated Calf" }, "seated_calf", r(2, 3), r(10, 12), 120, SMALL),
]

const upperDay = (d: string): SlotSpec[] => [
  lift(`${d}_bench`, { lib: "lib_bench_press", name: "Flat Bench" }, "bench", r(3, 4), r(6, 8), 180, BIG),
  lift(`${d}_row`, { lib: "lib_barbell_row", name: "Row" }, "row", r(3, 4), r(6, 8), 180, BIG, {
    note: "Lyle prefers a close, underhand grip with the elbows near the body.",
  }),
  lift(`${d}_incline`, { name: "Incline Bench or Shoulder Press" }, "incline_or_press", r(2, 3), r(10, 12), 120, BIG, {
    choices: [{ lib: "lib_incline_bench" }, { lib: "lib_ohp" }],
  }),
  lift(`${d}_pulldown`, { name: "Pulldown or Chin" }, "pulldown_or_chin", r(2, 3), r(10, 12), 120, BIG, {
    choices: [{ lib: "lib_lat_pulldown" }, { lib: "lib_chin_up" }],
  }),
  lift(`${d}_triceps`, { name: "Triceps" }, "triceps", r(1, 2), r(12, 15), 90, SMALL, {
    choices: [{ lib: "lib_triceps_pushdown" }, { lib: "lib_skullcrusher" }, { lib: "lib_overhead_triceps" }],
  }),
  lift(`${d}_biceps`, { name: "Biceps" }, "biceps", r(1, 2), r(12, 15), 90, SMALL, {
    choices: [{ lib: "lib_barbell_curl" }, { lib: "lib_db_curl" }, { lib: "lib_ez_bar_curl" }],
  }),
]

export const lyleGbr: ProgramFixture = {
  id: "lyle-gbr",
  title: "Lyle McDonald's Generic Bulking Routine",
  source: {
    url: "https://www.jcdfitness.com/wp-content/download/Lyle_McDonald_Generic_Bulking_Routine_FAQ.pdf",
    author: "Lyle McDonald",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Lyle posted the routine free on his own forum; the FAQ PDF quotes each post with its link (routine: FAQ 1.1; cycle: 2.1 and 2.3; progression: 2.11). Lift Vault's \"week 1 at 80-85% of your 8RM, +5% a week\" sheet is a reading of the same posts.",
  },
  coverage: "close",
  gaps: [
    "The run-up must not move the working weight. The format has no way to pause a progression rule for some weeks; this file leans on the rule's group being skipped in weeks 1–2, so nothing is judged. A `weeks` field on the progression rule would say it outright.",
    "The cycle is 6–8 weeks, ended when performance falls 2–3 workouts in a row (\"if you start losing strength, it is time to start a new cycle\"); fixed at 8 here.",
    "Jumps are ranges in the source (2.5–5 lb big, 1–2.5 lb small); the top of each is used.",
    "\"Add weight when you get your target reps with one in the tank\" judges effort as well as reps; double progression judges reps only.",
    "Sets across or a slight descending pyramid (about 5% off a set to stay in the rep range) are both allowed; the file prescribes sets across.",
    "Thursday and Friday may instead swap exercises (deadlift/leg press on Thursday, incline and pulldown first on Friday); this file repeats Monday and Tuesday.",
  ],
  spec: {
    specVersion: 2,
    name: "Lyle McDonald's Generic Bulking Routine",
    blurb:
      "Four days of upper/lower, each body part twice a week. Each 8-week cycle starts with two easier weeks (80–85%, then 90–95% of last cycle's weights), then you push the weights up whenever you make the top of the rep range. Too much? Go to 2–3×6–8 and 1–2×10–12.",
    credit: "by Lyle McDonald",
    unit: "lb",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: 8,
      atEnd: "repeat",
      phases: [
        { label: "Run-up", weeks: "1-2" },
        { label: "Push", weeks: "3-8" },
      ],
    },
    rounding: { stepKg: 1, stepLb: 2.5, mode: "nearest" },
    days: [
      { id: "mon", label: "Lower", weekday: 1, slots: lowerDay("mon") },
      { id: "tue", label: "Upper", weekday: 2, slots: upperDay("tue") },
      { id: "thu", label: "Lower", weekday: 4, slots: lowerDay("thu") },
      { id: "fri", label: "Upper", weekday: 5, slots: upperDay("fri") },
    ],
  },
  start: {
    working: {
      squat: 200,
      bench: 150,
      // The rest: plausible starts (last cycle's weights); no expectation reads them.
      sldl_or_curl: 185,
      leg_press: 360,
      leg_curl_2: 70,
      calf_raise: 180,
      seated_calf: 90,
      row: 135,
      incline_or_press: 115,
      pulldown_or_chin: 120,
      triceps: 50,
      biceps: 50,
    },
  },
  expect: [
    {
      week: 1,
      day: "mon",
      slot: "mon_squat",
      sets: "3-4x6-8@160-170",
      source: "FAQ 1.1 Squat 3-4X6-8/3'; FAQ 2.1 \"week 1: 80-85% of previous maxes\" — 200 × 0.80 = 160 … × 0.85 = 170",
    },
    {
      week: 1,
      day: "tue",
      slot: "tue_bench",
      sets: "3-4x6-8@120-127.5",
      source: "FAQ 1.1 Flat bench 3-4X6-8/3'; week 1 at 80-85% of 150",
    },
    {
      week: 2,
      day: "mon",
      slot: "mon_squat",
      sets: "3-4x6-8@180-190",
      source: "FAQ 2.1 \"week 2: 90-95% of previous maxes\" — 200 × 0.90 … × 0.95",
    },
    {
      week: 3,
      day: "mon",
      slot: "mon_squat",
      sets: "3-4x6-8@200 rir1-2",
      source: "FAQ 2.1 \"week 3-n: push the weights as much as you can\" — starts at the previous max; FAQ 1.8 first set 1-2 reps short of a true RM",
    },
    {
      week: 4,
      day: "mon",
      slot: "mon_squat",
      sets: "3-4x6-8@210 rir1-2",
      source: "FAQ 2.11 add weight at target reps, big movements up to 5 lb — week 3 Monday (200) and Thursday (205) both made → 210",
    },
    {
      week: 3,
      day: "fri",
      slot: "fri_bench",
      sets: "3-4x6-8@155 rir1-2",
      source: "Week 3 Tuesday bench 150 made at the top of 6-8 → +5 lb for Friday",
    },
  ],
}
