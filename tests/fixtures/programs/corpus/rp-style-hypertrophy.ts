/**
 * An RP-style hypertrophy mesocycle — Renaissance Periodization's PUBLIC rules
 * only, on a representative upper/lower template. RP's programs and app are
 * paid; nothing here comes from them.
 *
 * The rules, from RP's free articles (read 2026-10-22):
 * - "Complete Chest Training Guide" (Dr. Mike Israetel, RP blog, 2024-01-03),
 *   sample Meso 1: bench 3 sets @ 3 RIR, then 4 @ 2, 4 @ 1, 5 @ 0, and a
 *   deload of 2 sets of 2–5 at 5+ RIR at the week-1 weight. The bar goes
 *   185 → 190 → 195 → 200 (5 lb a week); incline dumbbells 60, 60, 65, 65.
 *   Rep ranges: heavy 5–10, moderate 10–20, light 20–30.
 * - "Progressing for Hypertrophy" (RP blog, 2018-09-20): about 5 lb a week on
 *   the bar, dumbbells every 2–3 weeks; sets climb from MEV toward MRV; deload
 *   at the end.
 *
 * The exercise choice is this file's: one upper/lower 4-day week built from
 * the lifts RP's public muscle guides use. Every lift runs the same meso:
 * sets 3/4/4/5 then 2, RIR 3/2/1/0 then 5, the weight planned per week.
 */

import type { ProgramFixture } from "../fixture"
import type { Increment, LiftRef, SlotSpec, WeekOverride } from "@/src/programs/spec/types"

const r = (min: number, max: number) => ({ min, max })
const plus = (lb: number): Increment => ({ kg: lb / 2, lb })

/**
 * A lift through the meso. `bar` adds 5 lb every week (barbells, machines,
 * cables); otherwise the dumbbells go up 5 lb in week 3, as in RP's sample.
 */
const meso = (
  id: string,
  ref: LiftRef,
  reps: { min: number; max: number },
  bar: boolean,
  deloadReps: { min: number; max: number },
  extra: Partial<SlotSpec> = {}
): SlotSpec => {
  const add = (week: number) => (bar ? 5 * (week - 1) : week >= 3 ? 5 : 0)
  const load = (week: number) =>
    add(week) === 0 ? ({ from: "working" } as const) : ({ from: "working", plus: plus(add(week)) } as const)
  const weeks: WeekOverride[] = [
    { weeks: "2", set: "work", count: 4, effort: { rir: 2 }, load: load(2) },
    { weeks: "3", set: "work", count: 4, effort: { rir: 1 }, load: load(3) },
    { weeks: "4", set: "work", count: 5, effort: { rir: 0 }, load: load(4) },
    {
      weeks: "5",
      set: "work",
      count: 2,
      reps: deloadReps,
      effort: { rir: 5 },
      load: { from: "working" },
      note: "Deload: 5 or more reps in reserve, at week 1's weight.",
    },
  ]
  return {
    id,
    lift: ref,
    sets: [{ id: "work", kind: "working", count: 3, reps, load: { from: "working" }, effort: { rir: 3 } }],
    weeks,
    progression: { kind: "hold" },
    ...extra,
  }
}

const HEAVY = r(5, 10)
const MODERATE = r(10, 20)
const LIGHT = r(20, 30)
const DELOAD_HEAVY = r(2, 5)
const DELOAD_LIGHT = r(5, 10)

export const rpStyleHypertrophy: ProgramFixture = {
  id: "rp-style-hypertrophy",
  title: "RP-style hypertrophy mesocycle (public rules)",
  source: {
    url: "https://rpstrength.com/chest-training-tips-hypertrophy/",
    author: "Renaissance Periodization (Dr. Mike Israetel)",
    terms: "paid-public-rules",
    checked: "2026-10-22",
    notes:
      "RP's programs and app are paid. Only rules RP publishes free were used: the sample Meso 1 in the Complete Chest Training Guide (sets, RIR, weekly load, deload) and https://rpstrength.com/blogs/articles/progressing-for-hypertrophy (5 lb a week on the bar, dumbbells every 2–3 weeks). The exercise list is a representative template, not RP's.",
  },
  coverage: "close",
  gaps: [
    "RP adds sets from soreness, pump and workload feedback (autoregulation between MEV and MRV); the format cannot read feedback, so the sets follow the chest guide's planned 3/4/4/5.",
    "RP really picks each week's weight to land on the RIR target at the same reps; the +5 lb a week (dumbbells every two weeks) is the guide's worked example, written as planned increases.",
    "RP's guides deload differently by lift and article (week-1 weight for presses, about half the weight for flyes, \"half sets, half reps, half load\" in the quad guide); this file uses week-1 weight for all.",
    "\"Use 1 RIR instead of 0 where the bar could fall on you\" is a lifter's call; week 4 is written at 0 RIR as in the sample.",
    "The next mesocycle starts heavier and with more sets (the guide's Meso 2); the format's repeat would rerun the same numbers, so the program finishes after one meso.",
  ],
  spec: {
    specVersion: 2,
    name: "RP-style Hypertrophy Mesocycle",
    blurb:
      "One 5-week mesocycle on an upper/lower split: four weeks that add sets and weight while the reps in reserve fall from 3 to 0, then an easy deload week.",
    credit: "after Renaissance Periodization's public articles",
    unit: "lb",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: 5,
      atEnd: "finish",
      phases: [
        { label: "Accumulation", weeks: "1-4" },
        { label: "Deload", weeks: "5" },
      ],
      deloadWeeks: "5",
    },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "upper_a",
        label: "Upper A",
        weekday: 1,
        slots: [
          meso("ua_bench", { lib: "lib_bench_press", name: "Barbell Bench Press" }, HEAVY, true, DELOAD_HEAVY),
          meso("ua_pulldown", { lib: "lib_lat_pulldown" }, MODERATE, true, DELOAD_LIGHT),
          meso("ua_lateral", { lib: "lib_cable_lateral_raise" }, LIGHT, true, DELOAD_LIGHT),
          meso("ua_curl", { lib: "lib_ez_bar_curl" }, MODERATE, true, DELOAD_LIGHT),
          meso("ua_triceps", { lib: "lib_triceps_pushdown" }, MODERATE, true, DELOAD_LIGHT),
        ],
      },
      {
        id: "lower_a",
        label: "Lower A",
        weekday: 2,
        slots: [
          meso("la_squat", { lib: "lib_back_squat" }, HEAVY, true, DELOAD_HEAVY),
          meso("la_rdl", { lib: "lib_rdl" }, HEAVY, true, DELOAD_HEAVY),
          meso("la_leg_ext", { lib: "lib_leg_extension" }, MODERATE, true, DELOAD_LIGHT),
          meso("la_calves", { lib: "lib_standing_calf_raise" }, MODERATE, true, DELOAD_LIGHT),
        ],
      },
      {
        id: "upper_b",
        label: "Upper B",
        weekday: 4,
        slots: [
          meso("ub_incline_db", { lib: "lib_incline_db_press", name: "Incline Dumbbell Press" }, MODERATE, false, DELOAD_HEAVY),
          meso("ub_row", { lib: "lib_cable_row" }, MODERATE, true, DELOAD_LIGHT),
          meso("ub_fly", { lib: "lib_pec_deck", name: "Machine Flyes" }, MODERATE, true, DELOAD_LIGHT),
          meso("ub_db_curl", { lib: "lib_incline_db_curl" }, MODERATE, false, DELOAD_LIGHT),
          meso("ub_oh_triceps", { lib: "lib_overhead_triceps" }, MODERATE, false, DELOAD_LIGHT),
        ],
      },
      {
        id: "lower_b",
        label: "Lower B",
        weekday: 5,
        slots: [
          meso("lb_leg_press", { lib: "lib_leg_press" }, MODERATE, true, DELOAD_LIGHT),
          meso("lb_leg_curl", { lib: "lib_seated_leg_curl" }, MODERATE, true, DELOAD_LIGHT),
          meso("lb_split_squat", { lib: "lib_bulgarian_split_squat" }, MODERATE, false, DELOAD_LIGHT, { perSide: true }),
          meso("lb_calves", { lib: "lib_seated_calf_raise" }, MODERATE, true, DELOAD_LIGHT),
        ],
      },
    ],
  },
  start: {
    working: {
      ua_bench: 185,
      ub_incline_db: 60,
      ub_fly: 120,
      // The rest: plausible week-1 weights; no expectation reads them.
      ua_pulldown: 120,
      ua_lateral: 15,
      ua_curl: 60,
      ua_triceps: 50,
      la_squat: 225,
      la_rdl: 185,
      la_leg_ext: 100,
      la_calves: 150,
      ub_row: 120,
      ub_db_curl: 25,
      ub_oh_triceps: 40,
      lb_leg_press: 360,
      lb_leg_curl: 80,
      lb_split_squat: 40,
      lb_calves: 90,
    },
  },
  expect: [
    {
      week: 1,
      day: "upper_a",
      slot: "ua_bench",
      sets: "3x5-10@185 rir3",
      source: "Chest guide, Meso 1, Mon: Barbell Bench Press week 1 — 3 sets, 5-10 reps, 185 lb, 3 RIR",
    },
    {
      week: 2,
      day: "upper_a",
      slot: "ua_bench",
      sets: "4x5-10@190 rir2",
      source: "Chest guide, Meso 1 week 2 — 4 sets, 190 lb, 2 RIR",
    },
    {
      week: 4,
      day: "upper_a",
      slot: "ua_bench",
      sets: "5x5-10@200 rir0",
      source: "Chest guide, Meso 1 week 4 — 5 sets, 200 lb, 0 RIR",
    },
    {
      week: 5,
      day: "upper_a",
      slot: "ua_bench",
      sets: "2x2-5@185 rir5",
      source: "Chest guide, Meso 1 deload — 2 sets, 2-5 reps, 185 lb, 5+ RIR",
    },
    {
      week: 1,
      day: "upper_b",
      slot: "ub_incline_db",
      sets: "3x10-20@60 rir3",
      source: "Chest guide, Meso 1: Incline Dumbbell Press week 1 — 3 sets, 10-20 reps, 60 lb, 3 RIR",
    },
    {
      week: 3,
      day: "upper_b",
      slot: "ub_incline_db",
      sets: "4x10-20@65 rir1",
      source: "Chest guide, Meso 1 week 3 — 4 sets, 65 lb, 1 RIR (60 in week 2, 65 from week 3)",
    },
    {
      week: 4,
      day: "upper_b",
      slot: "ub_fly",
      sets: "5x10-20@135 rir0",
      source: "Chest guide, Meso 1: Machine Flyes 120 → 125 → 130 → 135, week 4 — 5 sets, 0 RIR",
    },
  ],
}
