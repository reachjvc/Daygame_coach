/**
 * The Rippler — Cody Lefever's (GZCL) 12-week undulating program, as his own
 * sheet has it ("The Rippler" tab of the GZCL Free Compendium, Nov 2016,
 * read cell by cell on 2026-10-22: goal weights B14:I21, the T1/T2/T3
 * progression tables B23:E64, the schedule M4:AE88).
 *
 * Four days a week (the sheet trains Tuesday, Thursday, Saturday, Sunday).
 * Every day is a T1 at a percentage of a 2RM, a T2 at a percentage of a
 * 5RM, then two T3s done for max reps at a 10RM weight. T1 waves week to
 * week; T2 runs three-week waves of 6/5/4 reps and drops a set each wave;
 * T3 drops a set every three weeks. Week 11 tapers (T1 only), week 12
 * tests the 1RMs. "+" is a rep-out on the last set, always 1–2 reps short
 * of failure; so is every T3 set.
 *
 * Two readings are this file's, and say so: the sheet lets you start the
 * week with Squat or Bench; this file takes Squat, because that is the
 * order the test week uses (squat, bench, deadlift, press). And week 10's
 * T1 "Max × 1 at 100%" is read as one rep-out at the 2RM weight (2+).
 */

import type { ProgramFixture } from "../fixture"
import type { EffortTarget, LiftRef, SlotSpec, WeekOverride } from "@/src/programs/spec/types"

const RESERVE: EffortTarget = { rir: { min: 1, max: 2 } }
const HOLD = { kind: "hold" } as const
const rm = (pct: number) => ({ from: "max", max: "rm", pct }) as const

/** One week of a tier table: % of the rep max, reps per set, sets, and whether the last set is a rep-out. */
type Row = [pct: number, reps: number, sets: number, plus: boolean]

/** Sheet B25:E36. */
const T1: Row[] = [
  [0.85, 5, 3, false],
  [0.9, 3, 4, true],
  [0.875, 4, 3, false],
  [0.925, 2, 5, false],
  [0.9, 4, 3, true],
  [0.95, 2, 4, false],
  [0.925, 3, 3, false],
  [0.975, 1, 9, true],
  [0.95, 2, 3, true],
  [1.0, 2, 1, true], // "Max × 1" at 100% of the 2RM
  [0.9, 2, 4, true],
]
/** Sheet B39:E50; weeks 11–12 rest. */
const T2: Row[] = [
  [0.8, 6, 5, false],
  [0.85, 5, 5, false],
  [0.9, 4, 5, true],
  [0.825, 6, 4, false],
  [0.875, 5, 4, false],
  [0.925, 4, 4, true],
  [0.85, 6, 3, false],
  [0.9, 5, 3, false],
  [0.95, 4, 3, true],
  [1.0, 3, 5, true],
]

/**
 * A tier as two groups — the straight sets and the rep-out — with one week
 * change per week in the table.
 */
function tiered(table: Row[], restWeeks: string | null): Pick<SlotSpec, "sets" | "weeks"> {
  const [p1, r1, s1] = table[0]
  const weeks: WeekOverride[] = []
  table.forEach(([pct, reps, sets, plus], i) => {
    const w = String(i + 1)
    const straight = plus ? sets - 1 : sets
    if (straight > 0) weeks.push({ weeks: w, set: "work", count: straight, reps, load: rm(pct) })
    else weeks.push({ weeks: w, set: "work", skip: true })
    if (plus) weeks.push({ weeks: w, set: "last", reps: { atLeast: reps }, load: rm(pct) })
    else weeks.push({ weeks: w, set: "last", skip: true })
  })
  if (restWeeks) {
    weeks.push({ weeks: restWeeks, set: "work", skip: true }, { weeks: restWeeks, set: "last", skip: true })
  }
  return {
    sets: [
      { id: "work", kind: "working", count: s1, reps: r1, load: rm(p1) },
      { id: "last", kind: "amrap", count: 1, reps: { atLeast: r1 }, load: rm(p1), effort: RESERVE },
    ],
    weeks,
  }
}

const t1 = (id: string, lift: LiftRef): SlotSpec => {
  const { sets, weeks } = tiered(T1, null)
  return {
    id,
    lift,
    note: "T1, a percentage of your 2RM (not your 1RM). Rest 3–5 minutes.",
    sets,
    weeks: [
      ...weeks!,
      { weeks: "12", set: "work", count: 1, reps: 1, load: { from: "effort" }, effort: { rpe: 10 }, note: "Test week: work up to a new 1RM." },
      { weeks: "12", set: "last", skip: true },
    ],
    progression: HOLD,
  }
}

const t2 = (id: string, lift: LiftRef): SlotSpec => ({
  id,
  lift,
  note: "T2, a percentage of your 5RM. Rest 2–3 minutes.",
  ...tiered(T2, "11-12"),
  progression: HOLD,
})

/** T3: max reps on every set at a 10RM weight; 5 sets weeks 1–3, 4 weeks 4–6, 3 weeks 7–9, 2 week 10. */
const t3 = (id: string, lift: LiftRef, load: SlotSpec["sets"][number]["load"] = { from: "working" }): SlotSpec => ({
  id,
  lift,
  note:
    "T3: every set for max reps, 1–2 short of failure, at a weight you can lift 10+ times. Keep the weight for weeks 1–3, then add by total reps across the sets of the block's last week (week 3: >50/60/70 → +5/10/15 lb; week 6: >40/50/60; week 9: >30/40/50).",
  sets: [{ id: "max", kind: "amrap", count: 5, reps: { atLeast: 10 }, load, effort: RESERVE }],
  weeks: [
    { weeks: "4-6", set: "max", count: 4 },
    { weeks: "7-9", set: "max", count: 3 },
    { weeks: "10", set: "max", count: 2 },
    { weeks: "11-12", set: "max", skip: true },
  ],
  progression: HOLD,
})

export const gzclRippler: ProgramFixture = {
  id: "gzcl-rippler",
  title: "GZCL The Rippler (12 weeks)",
  source: {
    url: "https://liftvault.com/programs/powerlifting/gzcl-template-spreadsheets/",
    author: "Cody Lefever (GZCL)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: 'The Rippler' tab of the GZCL Free Compendium, a spreadsheet Cody Lefever released for free (Intro tab: 'GZCL here AKA Cody Lefever'), " +
      "linked from Lift Vault (Google Sheet 19qc-ACGR3ZfoqptHlSfHmboCKAqYmYw8XW516DX2Fl8). Weights are the sheet's ROUND(RM × % × 0.2) × 5; " +
      "the goal weights here are the sheet's own defaults, so its cells can be read off directly.",
  },
  coverage: "close",
  gaps: [
    "T3 weights step up only after weeks 3, 6 and 9, by the TOTAL reps across that day's sets (week 3: more than 50/60/70 → +5/10/15 lb; week 6: 40/50/60; week 9: 30/40/50); the format's rep-driven rules read one '+' set after every session, so T3 holds and the rule is a note.",
  ],
  spec: {
    specVersion: 2,
    name: "The Rippler (GZCL)",
    blurb:
      "Twelve weeks, four days a week. A heavy main lift whose weight rises and dips in waves, a lighter second lift in three-week waves, and accessory work for max reps. Week 11 tapers and week 12 tests your maxes.",
    credit: "by Cody Lefever (GZCL)",
    unit: "lb",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: 12,
      atEnd: "finish",
      phases: [
        { label: "The Trough", weeks: "1-3" },
        { label: "The Shoulder", weeks: "4-6" },
        { label: "The Crest", weeks: "7-9" },
        { label: "The Peak", weeks: "10-11" },
        { label: "Test", weeks: "12" },
      ],
      testWeeks: "12",
    },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    maxes: [
      { lift: "tue_squat", kind: "rm", reps: 2 },
      { lift: "thu_bench", kind: "rm", reps: 2 },
      { lift: "sat_deadlift", kind: "rm", reps: 2 },
      { lift: "sun_ohp", kind: "rm", reps: 2 },
      { lift: "tue_sldl", kind: "rm", reps: 5 },
      { lift: "thu_incline", kind: "rm", reps: 5 },
      { lift: "sat_front_squat", kind: "rm", reps: 5 },
      { lift: "sun_cgbp", kind: "rm", reps: 5 },
    ],
    days: [
      {
        id: "tue",
        label: "Day One: Squat",
        weekday: 2,
        slots: [
          t1("tue_squat", { lib: "lib_back_squat", name: "Squat" }),
          t2("tue_sldl", { lib: "lib_stiff_leg_deadlift" }),
          t3("tue_pull_ups", { lib: "lib_pull_up" }, { from: "bodyweight" }),
          t3("tue_ez_curl", { lib: "lib_ez_bar_curl" }),
        ],
      },
      {
        id: "thu",
        label: "Day Two: Bench",
        weekday: 4,
        slots: [
          t1("thu_bench", { lib: "lib_bench_press" }),
          t2("thu_incline", { lib: "lib_incline_bench" }),
          t3("thu_btnp", { lib: "lib_behind_neck_press" }),
          t3("thu_side_lateral", { lib: "lib_lateral_raise" }),
        ],
      },
      {
        id: "sat",
        label: "Day Three: Deadlift",
        weekday: 6,
        slots: [
          t1("sat_deadlift", { lib: "lib_deadlift" }),
          t2("sat_front_squat", { lib: "lib_front_squat" }),
          t3("sat_row", { lib: "lib_barbell_row" }),
          t3("sat_rear_delt", { lib: "lib_rear_delt_fly" }),
        ],
      },
      {
        id: "sun",
        label: "Day Four: Press",
        weekday: 7,
        slots: [
          t1("sun_ohp", { lib: "lib_ohp" }),
          t2("sun_cgbp", { lib: "lib_close_grip_bench" }),
          t3("sun_incline", { lib: "lib_incline_bench" }),
          t3("sun_pullover", { name: "EZ-Bar Pullover", loadStyle: "free" }),
        ],
      },
    ],
  },
  start: {
    // The sheet's own default goal weights (C16:C19 2RMs, E16:E19 5RMs).
    maxes: {
      tue_squat: 455,
      thu_bench: 315,
      sat_deadlift: 535,
      sun_ohp: 195,
      tue_sldl: 185,
      thu_incline: 225,
      sat_front_squat: 225,
      sun_cgbp: 245,
    },
    // T3 10RMs (G16:I19; the sheet's 10 lb curl and pullover placeholders raised to real weights; BTNP is "Bar").
    working: {
      tue_ez_curl: 65,
      thu_btnp: 45,
      thu_side_lateral: 65,
      sat_row: 105,
      sat_rear_delt: 55,
      sun_incline: 95,
      sun_pullover: 55,
    },
  },
  expect: [
    {
      week: 1,
      day: "tue",
      slot: "tue_squat",
      sets: "3x5@385",
      source: "Rippler!Q8 = ROUND(455 × 0.85 × 0.2) × 5 = 385; R8:S8 5 reps × 3 sets (table B25:E25)",
    },
    {
      week: 2,
      day: "tue",
      slot: "tue_squat",
      sets: "3x3@410, 1x3+@410 rir1-2",
      source: "Rippler!Q15:S15 — 455 × 0.9 → 410, 3 reps × 4+ sets (table B26:E26); P3: '+' = last set a rep-out, 1-2 reps in the tank",
    },
    {
      week: 8,
      day: "tue",
      slot: "tue_squat",
      sets: "8x1@445, 1x1+@445 rir1-2",
      source: "Rippler!Q57:S57 — 455 × 0.975 → 445, 1 rep × 9+ sets (table B32:E32)",
    },
    {
      week: 1,
      day: "thu",
      slot: "thu_bench",
      sets: "3x5@270",
      source: "Rippler!Q6 = ROUND(315 × 0.85 × 0.2) × 5 = 270",
    },
    {
      week: 8,
      day: "thu",
      slot: "thu_bench",
      sets: "8x1@305, 1x1+@305 rir1-2",
      source: "Rippler!Q55:S55 — 315 × 0.975 → 305, 1 × 9+",
    },
    {
      week: 1,
      day: "thu",
      slot: "thu_incline",
      sets: "5x6@180",
      source: "Rippler!U6:W6 — ROUND(225 × 0.8 × 0.2) × 5 = 180, 6 reps × 5 sets (table B39:E39)",
    },
    {
      week: 6,
      day: "thu",
      slot: "thu_incline",
      sets: "3x4@210, 1x4+@210 rir1-2",
      source: "Rippler!U41:W41 — 225 × 0.925 → 210, 4 reps × 4+ sets (table B44:E44)",
    },
    {
      week: 1,
      day: "thu",
      slot: "thu_side_lateral",
      sets: "5x10+@65 rir1-2",
      source: "Rippler!AB6:AE6 — Side Lateral at its 10RM (I16 = 65), Max reps × 5 sets (table B53:E53; F54 '10-or-more reps', F57 '1-2 reps left')",
    },
    {
      week: 4,
      day: "thu",
      slot: "thu_side_lateral",
      sets: "4x10+@65 rir1-2",
      source: "Rippler!AB27:AE27 — Max × 4 sets (table B56:E56); 5 × 10 = 50 reps in week 3 is not more than 50, so no increase (AP14)",
    },
    {
      week: 1,
      day: "tue",
      slot: "tue_pull_ups",
      sets: "5x10+@bw rir1-2",
      source: "Rippler!X8:AA8 — Pull Ups at 'BW', Max reps × 5 sets",
    },
  ],
}
