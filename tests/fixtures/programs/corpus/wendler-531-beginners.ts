/**
 * 5/3/1 for Beginners — Jim Wendler's three-day, full-body 5/3/1, posted free
 * by Wendler and kept by the /r/Fitness wiki.
 *
 * Monday squat and bench, Wednesday deadlift and press, Friday bench and
 * squat. Every main lift is 5/3/1 off a training max (90% of an estimated
 * 1RM), the last set all-out, then First Set Last: 5×5 at the day's first-set
 * percentage. After each three-week cycle the training max goes up 5 lb
 * (bench, press) or 10 lb (squat, deadlift) "no matter how many reps you hit
 * on your AMRAP sets". There is no deload week.
 *
 * Assistance is one exercise each from push, pull and single-leg/core, 50–100
 * total reps each, sets your choice. Squat and bench are trained twice a week
 * from one training max each, so their Monday and Friday slots share a key.
 *
 * Left as notes: the optional ramp (5 @ 40%, 5 @ 50%, 3 @ 60%), the jumps or
 * throws before lifting, and conditioning on the off days.
 */

import type { ProgramFixture } from "../fixture"
import type { Increment, LiftRef, PerSet, SlotSpec } from "@/src/programs/spec/types"

const HOLD = { kind: "hold" } as const
const choose = { from: "choose" } as const

const UPPER: Increment = { kg: 2.5, lb: 5 }
const LOWER: Increment = { kg: 5, lb: 10 }

/** The 5/3/1 wave as a share of the training max; "+" is the all-out last set. */
const WAVE: Record<1 | 2 | 3, PerSet[]> = {
  1: [{ pct: 0.65, reps: 5 }, { pct: 0.75, reps: 5 }, { pct: 0.85, reps: { atLeast: 5 } }],
  2: [{ pct: 0.7, reps: 3 }, { pct: 0.8, reps: 3 }, { pct: 0.9, reps: { atLeast: 3 } }],
  3: [{ pct: 0.75, reps: 5 }, { pct: 0.85, reps: 3 }, { pct: 0.95, reps: { atLeast: 1 } }],
}

/** 5/3/1 sets, then First Set Last 5×5 at the first set's percentage. */
const mainLift = (id: string, stateKey: string, lift: SlotSpec["lift"], inc: Increment): SlotSpec => ({
  id,
  lift,
  stateKey,
  note: "Optional ramp first: 5 @ 40%, 5 @ 50%, 3 @ 60% of the training max.",
  sets: [
    {
      id: "main",
      kind: "working",
      count: 3,
      reps: 5,
      load: { from: "max", max: "tm", pct: 0.65 },
      perSet: WAVE[1],
      note: "Last set: as many good reps as you can, not to failure.",
    },
    {
      id: "fsl",
      kind: "backoff",
      count: 5,
      reps: 5,
      load: { from: "max", max: "tm", pct: 0.65 },
      note: "First Set Last: 5×5 with the day's first-set weight.",
    },
  ],
  weeks: [
    { weeks: "2", set: "main", perSet: WAVE[2] },
    { weeks: "2", set: "fsl", load: { from: "max", max: "tm", pct: 0.7 } },
    { weeks: "3", set: "main", perSet: WAVE[3] },
    { weeks: "3", set: "fsl", load: { from: "max", max: "tm", pct: 0.75 } },
  ],
  progression: { kind: "cycle-bump", inc },
})

const PUSH: LiftRef[] = [
  { lib: "lib_dip" },
  { lib: "lib_push_up" },
  { lib: "lib_db_bench" },
  { lib: "lib_incline_db_press" },
  { lib: "lib_db_shoulder_press" },
  { lib: "lib_overhead_triceps" },
  { lib: "lib_triceps_pushdown" },
]
const PULL: LiftRef[] = [
  { lib: "lib_chin_up" },
  { lib: "lib_pull_up" },
  { lib: "lib_inverted_row" },
  { lib: "lib_db_row" },
  { lib: "lib_machine_row" },
  { lib: "lib_barbell_row" },
  { lib: "lib_face_pull" },
  { name: "Band Pull-apart", loadStyle: "free" },
  { lib: "lib_lat_pulldown" },
  { lib: "lib_db_curl" },
]
const LEG_CORE: LiftRef[] = [
  { lib: "lib_hanging_leg_raise" },
  { lib: "lib_ab_wheel" },
  { lib: "lib_back_extension" },
  { lib: "lib_reverse_hyper" },
  { lib: "lib_walking_lunge" },
  { lib: "lib_step_up" },
  { lib: "lib_bulgarian_split_squat" },
  { name: "Kettlebell Snatch", loadStyle: "free" },
  { lib: "lib_kettlebell_swing" },
]

/** One exercise from a category, 50–100 reps in as many sets as it takes. */
const assistance = (id: string, name: string, choices: LiftRef[]): SlotSpec => ({
  id,
  lift: { name },
  choices,
  note: "50–100 total reps, any sets. Too weak to reach 50 on a bodyweight move? Add a second exercise to make up the total.",
  sets: [{ id: "work", kind: "working", count: 1, reps: { total: 100 }, load: choose }],
  progression: HOLD,
})

const assistanceFor = (day: string): SlotSpec[] => [
  assistance(`${day}_push`, "Push", PUSH),
  assistance(`${day}_pull`, "Pull", PULL),
  assistance(`${day}_legcore`, "Single leg or core", LEG_CORE),
]

const squat = { lib: "lib_back_squat", name: "Squat" }
const bench = { lib: "lib_bench_press", name: "Bench Press" }

export const wendler531Beginners: ProgramFixture = {
  id: "wendler-531-beginners",
  title: "5/3/1 for Beginners",
  source: {
    url: "https://thefitness.wiki/routines/5-3-1-for-beginners/",
    author: "Jim Wendler",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Wendler posted this template free (Reddit /r/Fitness, and https://www.jimwendler.com/blogs/jimwendler-com/5-3-1-for-beginners for the days and assistance); " +
      "the /r/Fitness wiki page keeps the full rules: week table with FSL, TM 90%, +5/+10 lb per cycle regardless of AMRAP reps. " +
      "Cross-checked against https://liftvault.com/programs/strength/5-3-1-for-beginners/ and https://www.boostcamp.app/jim-wendler/5-3-1-for-beginners .",
  },
  coverage: "close",
  gaps: [
    "Assistance is 50–100 total reps; a rep total is one number in the format, so it is written as 100 and the note says 50–100.",
    "The wiki's training-max test week every 10th week (after three cycles) cannot be placed: a repeating 3-week calendar has no 'every third cycle'.",
    "The stall rule — miss reps across a whole cycle, then take three bumps off the training max (15 lb upper, 30 lb lower) — cannot be said: the cycle bump's drop is a percentage and fires on any missed all-out set.",
  ],
  spec: {
    specVersion: 2,
    name: "5/3/1 for Beginners",
    blurb:
      "Three full-body days a week, two main lifts a day. Each lift is three 5/3/1 sets off a training max, the last one all-out, then 5×5 at the first set's weight. Then 50–100 reps each of a push, a pull and a single-leg or core exercise. The training max goes up every three weeks. Warm up with 10–15 jumps or throws; condition on the off days.",
    credit: "by Jim Wendler",
    unit: "lb",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: 3, atEnd: "repeat" },
    maxes: [
      { lift: "squat", kind: "tm", tmPct: 0.9 },
      { lift: "bench", kind: "tm", tmPct: 0.9 },
      { lift: "deadlift", kind: "tm", tmPct: 0.9 },
      { lift: "press", kind: "tm", tmPct: 0.9 },
    ],
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "mon",
        label: "Squat and bench",
        weekday: 1,
        slots: [
          mainLift("mon_squat", "squat", squat, LOWER),
          mainLift("mon_bench", "bench", bench, UPPER),
          ...assistanceFor("mon"),
        ],
      },
      {
        id: "wed",
        label: "Deadlift and press",
        weekday: 3,
        slots: [
          mainLift("wed_deadlift", "deadlift", { lib: "lib_deadlift", name: "Deadlift" }, LOWER),
          mainLift("wed_press", "press", { lib: "lib_ohp", name: "Press" }, UPPER),
          ...assistanceFor("wed"),
        ],
      },
      {
        id: "fri",
        label: "Bench and squat",
        weekday: 5,
        slots: [
          mainLift("fri_bench", "bench", bench, UPPER),
          mainLift("fri_squat", "squat", squat, LOWER),
          ...assistanceFor("fri"),
        ],
      },
    ],
  },
  // Training maxes: 90% of 1RMs of 250, 200, 350 and about 111. Squat 225 and
  // bench 180 keep cycle 2 (235, 185) off rounding ties.
  start: { maxes: { squat: 225, bench: 180, deadlift: 315, press: 100 } },
  expect: [
    {
      week: 1,
      day: "mon",
      slot: "mon_squat",
      sets: "1x5@145, 1x5@170, 1x5+@190, 5x5@145",
      source: "Wiki table week 1: 5@65%, 5@75%, 5+@85%, FSL 5×5@65% of TM 225 = 146.25→145, 168.75→170, 191.25→190",
    },
    {
      week: 1,
      day: "mon",
      slot: "mon_bench",
      sets: "1x5@115, 1x5@135, 1x5+@155, 5x5@115",
      source: "Week 1 of TM 180: 117→115, 135, 153→155; FSL 5×5@65%",
    },
    {
      week: 2,
      day: "wed",
      slot: "wed_deadlift",
      sets: "1x3@220, 1x3@250, 1x3+@285, 5x5@220",
      source: "Wiki table week 2: 3@70%, 3@80%, 3+@90%, FSL 5×5@70% of TM 315 = 220.5→220, 252→250, 283.5→285",
    },
    {
      week: 3,
      day: "wed",
      slot: "wed_press",
      sets: "1x5@75, 1x3@85, 1x1+@95, 5x5@75",
      source: "Wiki table week 3: 5@75%, 3@85%, 1+@95%, FSL 5×5@75% of TM 100",
    },
    {
      week: 4,
      day: "mon",
      slot: "mon_bench",
      sets: "1x5@120, 1x5@140, 1x5+@155, 5x5@120",
      source: "Cycle 2 week 1: bench TM +5 lb once per cycle = 185; 120.25→120, 138.75→140, 157.25→155",
    },
    {
      week: 4,
      day: "fri",
      slot: "fri_squat",
      sets: "1x5@155, 1x5@175, 1x5+@200, 5x5@155",
      source: "Cycle 2 week 1: squat TM +10 lb once per cycle (not once per squat day) = 235; 152.75→155, 176.25→175, 199.75→200",
    },
    {
      week: 1,
      day: "mon",
      slot: "mon_push",
      sets: "1xt100@?",
      source: "Assistance: one push exercise, 'Do 50-100 reps of each' (written as the top, 100)",
    },
  ],
}
