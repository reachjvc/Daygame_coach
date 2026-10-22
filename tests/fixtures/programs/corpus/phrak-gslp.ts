/**
 * Phrak's Greyskull LP Variant — r/Fitness wiki page "phraks-gslp" by
 * u/phrakture, read 2026-10-22 from the Wayback Machine's 2016 copy (reddit
 * itself is not fetched).
 *
 *   Day 1 (Monday)     3x5+ Chinups OR Barbell Rows · 3x5+ Overhead Press OR Bench Press · 3x5+ Squats
 *   Day 2 (Wednesday)  3x5+ Chinups OR Barbell Rows · 3x5+ Overhead Press OR Bench Press · 1x5+ Deadlifts
 *   Day 3 (Friday)     3x5+ Chinups OR Barbell Rows · 3x5+ Overhead Press OR Bench Press · 3x5+ Squats
 *
 * "Alternate between Barbell Rows and Chin Ups between each workout.
 * Alternate between Bench Press and Overhead Press between each workout.
 * Pair Bench Press with Barbell Rows and Overhead Press with Chin Ups."
 * Squats stay Monday and Friday, deadlifts Wednesday ("instead of doing
 * squat-deadlift-squat" is the optional change). So the six workouts of two
 * weeks are written here as six days worked through in order, chin-ups and
 * the overhead press first (the order the page lists them).
 *
 * "3x5+" = two sets of 5 and a last set of as many as you can. Progression:
 * +2.5 lb upper body, +5 lb lower body between workouts; "If you reach more
 * than 10 reps on your AMRAP set, you may double the weight added"; "If you
 * fail to perform at least 15 reps combined across all sets, deload that lift
 * by 10%".
 *
 * Chin-ups take the upper-body 2.5 lb too, as added weight from 0 (the page
 * says "all upper-body lifts"; a chin-up with nothing added is logged as 0).
 */

import type { ProgramFixture } from "../fixture"
import type { DaySpec, ProgressionRule, SlotSpec } from "@/src/programs/spec/types"

const UPPER = { kg: 1.25, lb: 2.5 } as const
const LOWER = { kg: 2.5, lb: 5 } as const
const double = (inc: { kg: number; lb: number }) => ({ kg: inc.kg * 2, lb: inc.lb * 2 })

const rule = (inc: { kg: number; lb: number }): ProgressionRule => ({
  kind: "amrap-table",
  group: "amrap",
  table: [
    { minReps: 5, inc },
    { minReps: 11, inc: double(inc) },
  ],
  target: "working",
  failsBeforeDrop: 1,
  dropPct: 0.1,
})

const REST = 150

const threeFivePlus = (id: string, lift: SlotSpec["lift"], stateKey: string, inc: { kg: number; lb: number }): SlotSpec => ({
  id,
  lift,
  stateKey,
  restSec: REST,
  sets: [
    { id: "work", kind: "working", count: 2, reps: 5, load: { from: "working" } },
    { id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: { from: "working" }, note: "Leave 1–2 reps in the tank." },
  ],
  progression: rule(inc),
})

const chins = (d: string): SlotSpec => ({
  ...threeFivePlus(`${d}_chins`, { lib: "lib_chin_up" }, "chins", UPPER),
  note: "Weight is what you add to yourself. Can't do chin-ups yet: negatives, or palms-facing pull-downs.",
})
const rows = (d: string) => threeFivePlus(`${d}_rows`, { lib: "lib_barbell_row" }, "rows", UPPER)
const ohp = (d: string) => threeFivePlus(`${d}_ohp`, { lib: "lib_ohp" }, "ohp", UPPER)
const bench = (d: string) => threeFivePlus(`${d}_bench`, { lib: "lib_bench_press" }, "bench", UPPER)
const squat = (d: string) => threeFivePlus(`${d}_squat`, { lib: "lib_back_squat", name: "Squat" }, "squat", LOWER)
const deadlift = (d: string): SlotSpec => ({
  id: `${d}_deadlift`,
  lift: { lib: "lib_deadlift" },
  stateKey: "deadlift",
  restSec: REST,
  sets: [{ id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: { from: "working" } }],
  progression: rule(LOWER),
})

const vertical = (id: string, label: string, lower: "squat" | "deadlift"): DaySpec => ({
  id,
  label,
  slots: [chins(id), ohp(id), lower === "squat" ? squat(id) : deadlift(id)],
})
const horizontal = (id: string, label: string, lower: "squat" | "deadlift"): DaySpec => ({
  id,
  label,
  slots: [rows(id), bench(id), lower === "squat" ? squat(id) : deadlift(id)],
})

export const phrakGslp: ProgramFixture = {
  id: "phrak-gslp",
  title: "Phrak's Greyskull LP Variant",
  source: {
    url: "https://web.archive.org/web/2016/https://www.reddit.com/r/Fitness/wiki/phraks-gslp",
    author: "u/phrakture (r/Fitness wiki)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "A free r/Fitness wiki page; it calls itself 'a bare-bones implementation of the Greyskull LP program' and links the paid book. " +
      "Read from the Wayback Machine (2016 capture); liftosaur.com/programs/phrakgreyskull read for comparison only (it simplifies the rotation to A/B/A–B/A/B).",
  },
  coverage: "close",
  gaps: [
    "The deload trigger is fewer than 15 reps over all three sets, not the last set under 5; the amrap-table preset only reads the all-out set, so 5, 3, 7 (15 reps, no deload) and 5, 3, 5 (13 reps, deload) both count as made here.",
    "On the deadlift's single 1×5+ set the page's '15 reps combined' would mean 15 reps in one set; it plainly means 5 there, which is what is encoded.",
    "'You may double the weight added' above 10 reps is the lifter's option; encoded as always doubling at 11+.",
  ],
  spec: {
    specVersion: 2,
    name: "Phrak's Greyskull LP",
    blurb:
      "Three days a week. Chin-ups with the overhead press, rows with the bench, alternating every workout; squats Monday and Friday, deadlifts Wednesday. The last set is as many reps as you can.",
    credit: "by u/phrakture, after John Sheaffer's Greyskull LP",
    unit: "lb",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    // The page's upper-body step is 2.5 lb; a 5 lb rounding step would undo it.
    rounding: { stepLb: 2.5, stepKg: 1.25, mode: "nearest" },
    days: [
      vertical("w1_mon", "Week 1 Monday", "squat"),
      horizontal("w1_wed", "Week 1 Wednesday", "deadlift"),
      vertical("w1_fri", "Week 1 Friday", "squat"),
      horizontal("w2_mon", "Week 2 Monday", "squat"),
      vertical("w2_wed", "Week 2 Wednesday", "deadlift"),
      horizontal("w2_fri", "Week 2 Friday", "squat"),
    ],
  },
  start: { working: { chins: 0, rows: 95, ohp: 75, bench: 115, squat: 135, deadlift: 185 } },
  expect: [
    {
      session: 1,
      slot: "w1_mon_ohp",
      sets: "2x5@75, 1x5+@75",
      source: "wiki 'The Program', Day 1: '3x5+ Overhead Press OR Bench Press'; start weight is this fixture's",
    },
    {
      session: 1,
      slot: "w1_mon_squat",
      sets: "2x5@135, 1x5+@135",
      source: "wiki Day 1: '3x5+ Squats'",
    },
    {
      session: 2,
      slot: "w1_wed_deadlift",
      sets: "1x5+@185",
      source: "wiki Day 2: '1x5+ Deadlifts'",
    },
    {
      session: 2,
      slot: "w1_wed_rows",
      sets: "2x5@95, 1x5+@95",
      source: "wiki 'Alternating Lifts': rows alternate with chin-ups and pair with bench",
    },
    {
      session: 7,
      slot: "w1_mon_ohp",
      sets: "2x5@82.5, 1x5+@82.5",
      source: "wiki 'Progression': 'Add 2.5 pounds to all upper-body lifts'; OHP on sessions 1, 3, 5 → 75 + 3 × 2.5",
    },
    {
      session: 7,
      slot: "w1_mon_squat",
      sets: "2x5@155, 1x5+@155",
      source: "wiki 'Progression': 'Add 5 pounds to all lower-body lifts'; squat on sessions 1, 3, 4, 6 → 135 + 4 × 5",
    },
    {
      session: 8,
      slot: "w1_wed_bench",
      sets: "2x5@122.5, 1x5+@122.5",
      source: "wiki 'Progression': +2.5 lb; bench on sessions 2, 4, 6 → 115 + 3 × 2.5",
    },
    {
      session: 8,
      slot: "w1_wed_deadlift",
      sets: "1x5+@195",
      source: "wiki 'Progression': +5 lb; deadlift on sessions 2, 5 → 185 + 2 × 5",
    },
  ],
}
