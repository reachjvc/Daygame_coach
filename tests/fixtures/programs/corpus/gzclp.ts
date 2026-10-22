/**
 * GZCLP — Cody Lefever's (u/gzcl) linear progression, the 4-day version:
 * Squat/Bench, OHP/Deadlift, Bench/Squat, Deadlift/OHP, every day one T1,
 * one T2 and one T3, worked through in order.
 *
 * Rules as the author wrote them ("GZCLP" in "GZCL Applications &
 * Adaptations", swoleateveryheight.blogspot.com, Feb 2016) and as the
 * community sheet he endorsed lays them out (GZCLP 3 or 4-Day v4.1 by
 * /u/Blacknoir, read cell by cell on 2026-10-22):
 *
 * - T1 5×3+ → 6×2+ → 10×1+ (last set AMRAP, 1–2 reps in the tank). Weight
 *   goes up every session; a missed session keeps the weight and drops to
 *   the next stage. After 10×1+ fails: rest, test a new 5RM, restart at 85%.
 * - T2 3×10 → 3×8 → 3×6, same increments, same "miss → next stage". After
 *   3×6 fails: back to 3×10 a little heavier than the last 3×10.
 * - T3 3×15+; add weight once the last set reaches 25 reps.
 * - +10 lb (5 kg) squat and deadlift, +5 lb (2.5 kg) bench and press.
 *
 * Two readings are this file's, and say so: the T2 restart takes +15 lb
 * (the author says "slightly heavier … no more than 20 lb"; the r/Fitness
 * wiki "15–20 lb"); and the T3 lat pulldown and dumbbell row each keep ONE
 * weight across their two days (the DrWorkout 4-day sheet carries Day 1's
 * pulldown into Day 3; the v4.1 sheet keeps them apart).
 */

import type { ProgramFixture } from "../fixture"
import type { EffortTarget, Increment, LiftRef, SetGroup, SlotSpec } from "@/src/programs/spec/types"

const UPPER: Increment = { kg: 2.5, lb: 5 }
const LOWER: Increment = { kg: 5, lb: 10 }
const T3_STEP: Increment = { kg: 2.5, lb: 5 }
/** "Leave 1–2 reps in the tank" on every AMRAP. */
const RESERVE: EffortTarget = { rir: { min: 1, max: 2 } }
const working = { from: "working" } as const

/** A T1 stage: N sets of R, the last one "+". */
const t1Stage = (sets: number, reps: number): SetGroup[] => [
  { id: "work", kind: "working", count: sets - 1, reps, load: working },
  { id: "amrap", kind: "amrap", count: 1, reps: { atLeast: reps }, load: working, effort: RESERVE },
]
const T1_STAGES = [t1Stage(5, 3), t1Stage(6, 2), t1Stage(10, 1)]

const t2Stage = (reps: number): SetGroup[] => [{ id: "work", kind: "working", count: 3, reps, load: working }]
const T2_STAGES = [t2Stage(10), t2Stage(8), t2Stage(6)]

const t1 = (id: string, lift: LiftRef, inc: Increment): SlotSpec => ({
  id,
  lift,
  note: "T1. Rest 3–5 minutes. A miss is fewer total reps than the stage asks (15, 12, 10).",
  sets: T1_STAGES[0],
  progression: { kind: "stages", stages: T1_STAGES, inc, onFailLast: { retest: true, resetPct: 0.85 } },
})

const t2 = (id: string, lift: LiftRef, inc: Increment): SlotSpec => ({
  id,
  lift,
  note: "T2. Rest 2–3 minutes. After 3×6 fails, restart at 3×10 slightly heavier than your last 3×10 (no more than 20 lb).",
  sets: T2_STAGES[0],
  progression: { kind: "stages", stages: T2_STAGES, inc, onFailLast: { resetInc: { kg: 7.5, lb: 15 } } },
})

const t3 = (id: string, lift: LiftRef, stateKey: string): SlotSpec => ({
  id,
  lift,
  stateKey,
  note: "T3. Rest 60–90 seconds. Back work to start with; swap in other T3s as you like.",
  sets: [
    { id: "work", kind: "working", count: 2, reps: 15, load: working },
    { id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 15 }, load: working, effort: RESERVE },
  ],
  progression: { kind: "amrap-table", group: "amrap", table: [{ minReps: 25, inc: T3_STEP }], target: "working" },
})

export const gzclp: ProgramFixture = {
  id: "gzclp",
  title: "GZCLP (4-day linear progression)",
  source: {
    url: "https://swoleateveryheight.blogspot.com/2016/02/gzcl-applications-adaptations.html",
    author: "Cody Lefever (u/gzcl)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: published on the author's own blog, and the free community spreadsheets on liftvault.com/programs/strength/gzclp-program-spreadsheets/ " +
      "(v4.1 by /u/Blacknoir, read cell by cell: 4D Week sheets, Start!A16/A25/A38/I21). Increments per lift and T3 rule cross-checked " +
      "on thefitness.wiki/routines/gzclp/ and saynotobroscience.com/gzclp-infographic/.",
  },
  coverage: "close",
  gaps: [
    "A stage is failed when the TOTAL reps fall short of the stage's base volume (T1 15/12/10, T2 30/24/18), so a short early set made up on the AMRAP still counts as success; the format judges a stage by every set being made.",
    "The first T1 weight is 85% of a tested 5RM; the format has no way to say a lift's starting working weight is a share of a max, so `start.working` gives it directly. (The same 85% on a restart is said, by `onFailLast.resetPct`.)",
    "The T2 restart is 'slightly heavier than the last 3×10, no more than 20 lb'; the format takes one number, so +15 lb / +7.5 kg is this file's reading.",
  ],
  spec: {
    specVersion: 2,
    name: "GZCLP (4-day)",
    blurb:
      "Four days in a row: a heavy main lift, a lighter second lift for more reps, then accessory work. Weight goes up every session; when a scheme stops working, the reps per set drop and the weight keeps climbing.",
    credit: "by Cody Lefever (GZCL)",
    unit: "lb",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    maxes: [
      { lift: "d1_squat_t1", kind: "rm", reps: 5 },
      { lift: "d2_ohp_t1", kind: "rm", reps: 5 },
      { lift: "d3_bench_t1", kind: "rm", reps: 5 },
      { lift: "d4_deadlift_t1", kind: "rm", reps: 5 },
    ],
    days: [
      {
        id: "d1",
        label: "Day 1 (A1): Squat, Bench",
        slots: [
          t1("d1_squat_t1", { lib: "lib_back_squat", name: "Squat" }, LOWER),
          t2("d1_bench_t2", { lib: "lib_bench_press" }, UPPER),
          t3("d1_lat_pulldown", { lib: "lib_lat_pulldown" }, "lat_pulldown"),
        ],
      },
      {
        id: "d2",
        label: "Day 2 (B1): OHP, Deadlift",
        slots: [
          t1("d2_ohp_t1", { lib: "lib_ohp" }, UPPER),
          t2("d2_deadlift_t2", { lib: "lib_deadlift" }, LOWER),
          t3("d2_db_row", { lib: "lib_db_row" }, "db_row"),
        ],
      },
      {
        id: "d3",
        label: "Day 3 (A2): Bench, Squat",
        slots: [
          t1("d3_bench_t1", { lib: "lib_bench_press" }, UPPER),
          t2("d3_squat_t2", { lib: "lib_back_squat", name: "Squat" }, LOWER),
          t3("d3_lat_pulldown", { lib: "lib_lat_pulldown" }, "lat_pulldown"),
        ],
      },
      {
        id: "d4",
        label: "Day 4 (B2): Deadlift, OHP",
        slots: [
          t1("d4_deadlift_t1", { lib: "lib_deadlift" }, LOWER),
          t2("d4_ohp_t2", { lib: "lib_ohp" }, UPPER),
          t3("d4_db_row", { lib: "lib_db_row" }, "db_row"),
        ],
      },
    ],
  },
  start: {
    // 5RMs 300 / 100 / 200 / 400; T1 starts at 85% of each.
    maxes: { d1_squat_t1: 300, d2_ohp_t1: 100, d3_bench_t1: 200, d4_deadlift_t1: 400 },
    working: {
      d1_squat_t1: 255,
      d2_ohp_t1: 85,
      d3_bench_t1: 170,
      d4_deadlift_t1: 340,
      d1_bench_t2: 130,
      d2_deadlift_t2: 260,
      d3_squat_t2: 195,
      d4_ohp_t2: 65,
      lat_pulldown: 100,
      db_row: 50,
    },
  },
  // 15 + 10 = 25 reps on the T3 AMRAP, so the T3 weight steps up every time.
  outcome: { amrapExtra: 10 },
  expect: [
    {
      session: 1,
      day: "d1",
      slot: "d1_squat_t1",
      sets: "4x3@255, 1x3+@255 rir1-2",
      source: "v4.1 '4D Week 1'!A3:C3 — Squat 5x3+ at the starting weight (Start!I21: 85% of the 5RM, 300 × 0.85 = 255)",
    },
    {
      session: 5,
      day: "d1",
      slot: "d1_squat_t1",
      sets: "4x3@265, 1x3+@265 rir1-2",
      source: "Next Day 1 ('4D Week 2'!B3): base volume 15 made, so + the squat increment (+10 lb, thefitness.wiki 'Increments') at the same stage",
    },
    {
      session: 1,
      day: "d1",
      slot: "d1_bench_t2",
      sets: "3x10@130",
      source: "v4.1 '4D Week 1'!A5:C5 — Bench T2 3x10 at its starting weight",
    },
    {
      session: 5,
      day: "d1",
      slot: "d1_bench_t2",
      sets: "3x10@135",
      source: "Base volume 30 made → + the bench increment (+5 lb) at 3x10 (Start!A25 'adding weight workout to workout')",
    },
    {
      session: 3,
      day: "d3",
      slot: "d3_bench_t1",
      sets: "4x3@170, 1x3+@170 rir1-2",
      source: "v4.1 '4D Week 1'!A23:C23 — Bench T1 5x3+ at 85% of a 200 lb 5RM",
    },
    {
      session: 1,
      day: "d1",
      slot: "d1_lat_pulldown",
      sets: "2x15@100, 1x15+@100 rir1-2",
      source: "Blog post, T3: 15 x 3+ (three sets of 15, last set AMRAP)",
    },
    {
      session: 3,
      day: "d3",
      slot: "d3_lat_pulldown",
      sets: "2x15@105, 1x15+@105 rir1-2",
      source: "25 reps on Day 1's last set → add weight (blog T3 rule; DrWorkout sheet 'Week 1'!B27 = IF(F7>24, B7+5, B7))",
    },
  ],
}
