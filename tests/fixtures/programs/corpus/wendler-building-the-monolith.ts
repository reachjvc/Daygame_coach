/**
 * Building the Monolith — Jim Wendler's six-week, three-day 5/3/1 block for
 * size, as his own article on jimwendler.com lays it out week by week.
 *
 * Monday: squat 70/80% then 5×5 at 90%; press 70/80/90% then an all-out set
 * at 70%; 100 chin-ups, 100 face pulls or band pull-aparts, 100–200 dips.
 * Wednesday: deadlift 70/80% then 3×5 at 90%; bench 70/80% then 5×5 at 90%;
 * dumbbell rows 5×10–20, 100 curls. Friday: squat 70/80/90% then one set of
 * 20 (the "widowmaker"); press 10–15 sets of 5; weighted chin-ups 5×5, 100
 * face pulls or pull-aparts, 100 shrugs. Week 2 drops every main-lift
 * percentage by 5, week 3 raises them by 5; weeks 4–6 repeat that wave, and
 * only Friday's 20-rep squat and press volume keep changing. Training max:
 * "a lower than you think TM (85%)".
 *
 * Read as written, two things the article says are this file's reading:
 * - Monday's press ends "70xAMRAP" with no floor; 5+ is Boostcamp's reading.
 * - The 20-rep squat is 45, 55, 55, 50, 65, 70% in weeks 1–6 exactly as the
 *   table prints it, although the article also says "5% jumps per week",
 *   which would be 45, 50, 55, 60, 65, 70. The table is kept.
 *
 * "Week Four: Adjust TM" gives no amount. Boostcamp's reading: +5 lb upper,
 * +10 lb lower, and only if every set of weeks 1–3 was done.
 */

import type { ProgramFixture } from "../fixture"
import type { Increment, PerSet, SlotSpec } from "@/src/programs/spec/types"

const HOLD = { kind: "hold" } as const
const choose = { from: "choose" } as const
const bodyweight = { from: "bodyweight" } as const
const tm = (pct: number) => ({ from: "max" as const, max: "tm" as const, pct })

const UPPER: Increment = { kg: 2.5, lb: 5 }
const LOWER: Increment = { kg: 5, lb: 10 }
const bump = (inc: Increment) => ({ kind: "cycle-bump" as const, inc, onlyIfAllDone: true })

/** The wave: weeks 1 and 4 at 70/80/90%, weeks 2 and 5 five lower, weeks 3 and 6 five higher. */
const W1 = [0.7, 0.8, 0.9]
const W2 = [0.65, 0.75, 0.85]
const W3 = [0.75, 0.85, 0.95]
/** The first `n` sets of a week's ramp, each a set of the group's reps. */
const ramp = (week: number[], n: number): PerSet[] => week.slice(0, n).map((pct) => ({ pct }))

/** 70%, 80%, then sets across at 90% — the wave moves every percentage together. */
const rampThenAcross = (id: string, lift: SlotSpec["lift"], stateKey: string, across: number, inc: Increment): SlotSpec => ({
  id,
  lift,
  stateKey,
  sets: [
    { id: "ramp", kind: "working", count: 2, reps: 5, load: tm(0.7), perSet: ramp(W1, 2) },
    { id: "across", kind: "working", count: across, reps: 5, load: tm(0.9) },
  ],
  weeks: [
    { weeks: "2,5", set: "ramp", perSet: ramp(W2, 2) },
    { weeks: "2,5", set: "across", load: tm(0.85) },
    { weeks: "3,6", set: "ramp", perSet: ramp(W3, 2) },
    { weeks: "3,6", set: "across", load: tm(0.95) },
  ],
  progression: bump(inc),
})

const total = (id: string, lift: SlotSpec["lift"], reps: number, load: SlotSpec["sets"][number]["load"], extra: Partial<SlotSpec> = {}): SlotSpec => ({
  id,
  lift,
  sets: [{ id: "work", kind: "working", count: 1, reps: { total: reps }, load }],
  progression: HOLD,
  ...extra,
})

const facePulls = (id: string): SlotSpec =>
  total(id, { name: "Face Pulls or Band Pull-aparts" }, 100, choose, {
    choices: [{ lib: "lib_face_pull" }, { name: "Band Pull-apart", loadStyle: "free" }],
  })

const squat = { lib: "lib_back_squat", name: "Squat" }
const press = { lib: "lib_ohp", name: "Press" }

export const wendlerBuildingTheMonolith: ProgramFixture = {
  id: "wendler-building-the-monolith",
  title: "5/3/1 Building the Monolith",
  source: {
    url: "https://jimwendler.com/blogs/jimwendler-com/101078918-building-the-monolith-5-3-1-for-size",
    author: "Jim Wendler",
    terms: "paid-public-rules",
    checked: "2026-10-22",
    notes:
      "Program from the paid book Beyond 5/3/1. Wendler's own free article (url) prints all six weeks set by set and the 85% TM; " +
      "the TM bump after week 3 (+5/+10 lb, only if every set was done) is Boostcamp's reading: http://www.boostcamp.app/jim-wendler/5-3-1-building-the-monlith . " +
      "Also https://liftvault.com/programs/powerlifting/building-monolith-spreadsheet/ . " +
      "Could be marked 'free' if the owner accepts the author's free article as the source, since the bump cannot be encoded anyway.",
  },
  coverage: "close",
  gaps: [
    "The training max goes up after week 3, mid-block, only if every set of weeks 1–3 was done; a cycle bump fires only after the last week, so weeks 4–6 here run on the week-1 training max.",
    "Dips are 100–200 total reps; a rep total is one number, so it is written as 100 and the note says 100–200.",
    "Only the first three exercises of each day are required ('the other exercises are simply window dressing'); a lift cannot be marked optional, so this is a note.",
  ],
  spec: {
    specVersion: 2,
    name: "5/3/1 Building the Monolith",
    blurb:
      "Six weeks, three days a week, for size. Squat twice a week with a 20-rep set on Friday, press twice a week with up to 15 sets of 5, deadlift and bench on Wednesday, and 100-rep totals of chin-ups, face pulls, dips, curls and shrugs. Training max 85%. Eat big; condition 3–4 times a week.",
    credit: "by Jim Wendler",
    unit: "lb",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: 6, atEnd: "finish" },
    maxes: [
      { lift: "squat", kind: "tm", tmPct: 0.85 },
      { lift: "press", kind: "tm", tmPct: 0.85 },
      { lift: "deadlift", kind: "tm", tmPct: 0.85 },
      { lift: "bench", kind: "tm", tmPct: 0.85 },
    ],
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "mon",
        label: "Squat, press, chin-ups",
        weekday: 1,
        slots: [
          rampThenAcross("mon_squat", squat, "squat", 5, LOWER),
          {
            id: "mon_press",
            lift: press,
            stateKey: "press",
            note: "You may swap Monday's and Friday's press workouts.",
            sets: [
              { id: "ramp", kind: "working", count: 3, reps: 5, load: tm(0.7), perSet: ramp(W1, 3) },
              {
                id: "amrap",
                kind: "amrap",
                count: 1,
                reps: { atLeast: 5 },
                load: tm(0.7),
                note: "As many reps as you can at the first set's weight.",
              },
            ],
            weeks: [
              { weeks: "2,5", set: "ramp", perSet: ramp(W2, 3) },
              { weeks: "2,5", set: "amrap", load: tm(0.65) },
              { weeks: "3,6", set: "ramp", perSet: ramp(W3, 3) },
              { weeks: "3,6", set: "amrap", load: tm(0.75) },
            ],
            progression: bump(UPPER),
          },
          total("mon_chins", { lib: "lib_chin_up" }, 100, bodyweight, { note: "100 total reps, as many sets as it takes." }),
          facePulls("mon_face_pulls"),
          total("mon_dips", { lib: "lib_dip" }, 100, bodyweight, { note: "100–200 total reps." }),
        ],
      },
      {
        id: "wed",
        label: "Deadlift, bench, rows",
        weekday: 3,
        slots: [
          rampThenAcross("wed_deadlift", { lib: "lib_deadlift", name: "Deadlift" }, "deadlift", 3, LOWER),
          rampThenAcross("wed_bench", { lib: "lib_bench_press", name: "Bench Press" }, "bench", 5, UPPER),
          {
            id: "wed_db_rows",
            lift: { lib: "lib_db_row" },
            sets: [{ id: "work", kind: "working", count: 5, reps: { min: 10, max: 20 }, load: choose }],
            progression: HOLD,
          },
          total("wed_curls", { name: "Curls" }, 100, choose, {
            choices: [{ lib: "lib_barbell_curl" }, { lib: "lib_db_curl" }, { lib: "lib_ez_bar_curl" }, { lib: "lib_hammer_curl" }],
          }),
        ],
      },
      {
        id: "fri",
        label: "Squat for 20, press volume, weighted chin-ups",
        weekday: 5,
        slots: [
          {
            id: "fri_squat",
            lift: squat,
            stateKey: "squat",
            note: "Squat last on Friday if you like. A safety squat bar is fine for the 20-rep set only.",
            sets: [
              { id: "ramp", kind: "working", count: 3, reps: 5, load: tm(0.7), perSet: ramp(W1, 3) },
              { id: "twenty", kind: "working", count: 1, reps: 20, load: tm(0.45), note: "One set of 20." },
            ],
            weeks: [
              { weeks: "2,5", set: "ramp", perSet: ramp(W2, 3) },
              { weeks: "3,6", set: "ramp", perSet: ramp(W3, 3) },
              { weeks: "2", set: "twenty", load: tm(0.55) },
              { weeks: "3", set: "twenty", load: tm(0.55) },
              { weeks: "4", set: "twenty", load: tm(0.5) },
              { weeks: "5", set: "twenty", load: tm(0.65) },
              { weeks: "6", set: "twenty", load: tm(0.7) },
            ],
            progression: bump(LOWER),
          },
          {
            id: "fri_press",
            lift: press,
            stateKey: "press",
            sets: [{ id: "volume", kind: "working", count: 10, reps: 5, load: tm(0.7) }],
            weeks: [
              { weeks: "2", set: "volume", load: tm(0.5) },
              { weeks: "3", set: "volume", load: tm(0.75) },
              { weeks: "4", set: "volume", count: 12, load: tm(0.6) },
              { weeks: "5", set: "volume", count: 15, load: tm(0.65) },
              { weeks: "6", set: "volume", count: 12, load: tm(0.75) },
            ],
            progression: bump(UPPER),
          },
          {
            id: "fri_weighted_chins",
            lift: { lib: "lib_chin_up", name: "Weighted Chin-up" },
            sets: [{ id: "work", kind: "working", count: 5, reps: 5, load: choose, note: "Weighted." }],
            progression: HOLD,
          },
          facePulls("fri_face_pulls"),
          total("fri_shrugs", { lib: "lib_shrug" }, 100, choose),
        ],
      },
    ],
  },
  start: { maxes: { squat: 300, press: 100, deadlift: 400, bench: 200 } },
  expect: [
    {
      week: 1,
      day: "mon",
      slot: "mon_squat",
      sets: "1x5@210, 1x5@240, 5x5@270",
      source: "Week One Monday: 'Squat - 70x5, 80x5, 90x5, 90x5, 90x5, 90x5, 90x5' of TM 300",
    },
    {
      week: 1,
      day: "mon",
      slot: "mon_press",
      sets: "1x5@70, 1x5@80, 1x5@90, 1x5+@70",
      source: "Week One Monday: 'Press - 70x5, 80x5, 90x5, 70xAMRAP' of TM 100",
    },
    {
      week: 1,
      day: "fri",
      slot: "fri_squat",
      sets: "1x5@210, 1x5@240, 1x5@270, 1x20@135",
      source: "Week One Friday: 'Squat – 70x5, 80x5, 90x5, 45% x 20' of TM 300",
    },
    {
      week: 2,
      day: "wed",
      slot: "wed_deadlift",
      sets: "1x5@260, 1x5@300, 3x5@340",
      source: "Week Two Wednesday: 'Deadlift - 65x5, 75x5, 85x5, 85x5, 85x5' of TM 400",
    },
    {
      week: 3,
      day: "wed",
      slot: "wed_bench",
      sets: "1x5@150, 1x5@170, 5x5@190",
      source: "Week Three Wednesday: 'Bench Press - 75x5, 85x5, 95x5, 95x5, 95x5, 95x5, 95x5' of TM 200",
    },
    {
      week: 3,
      day: "fri",
      slot: "fri_press",
      sets: "10x5@75",
      source: "Week Three Friday: 'Press – 10 sets of 5 reps @ 75%' of TM 100",
    },
    {
      week: 1,
      day: "mon",
      slot: "mon_chins",
      sets: "1xt100@bw",
      source: "Week One Monday: 'Chins – 100 total reps'",
    },
  ],
}
