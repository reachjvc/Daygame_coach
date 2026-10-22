/**
 * 5/3/1 Boring But Big — Jim Wendler's four-day 5/3/1 with 5 sets of 10 of
 * the day's main lift after the 5/3/1 sets.
 *
 * The BBB layer is Wendler's own free article ("Boring But Big",
 * jimwendler.com), Example 1: each day's main lift for 5/3/1, the same lift
 * for 5×10, then lat work 5×10 (press and bench days) or five sets of abs
 * (deadlift and squat days). "You can push the final 5/3/1 sets – do the 5/3/1
 * program as you normally would", so the last set of weeks 1–3 is all-out.
 *
 * The 5/3/1 wave itself (weeks 1–3, the week-4 deload at 40/50/60%), the
 * training max at 90% of the 1RM and the +5 lb upper / +10 lb lower bump per
 * cycle are the 5/3/1 book's (2nd edition, paid), which the article sends you
 * to; they are restated publicly by Lift Vault and Boostcamp, and weeks 1–3,
 * the 90% and the bump are also in Wendler's free "5/3/1 for Beginners".
 *
 * The 5×10 is at 50% of the training max. The article's rule of thumb is
 * "50–60% of your Training Max"; Wendler's "BBB 3-Month Challenge" article
 * starts at 50% in month one, and Boostcamp's version uses 50% throughout.
 *
 * One reading is this file's and says so: the article gives the abs "5 sets"
 * and no reps; 10–20 is Boostcamp's reading of the same template.
 */

import type { ProgramFixture } from "../fixture"
import type { Increment, PerSet, SlotSpec } from "@/src/programs/spec/types"

const HOLD = { kind: "hold" } as const
const choose = { from: "choose" } as const

const UPPER: Increment = { kg: 2.5, lb: 5 }
const LOWER: Increment = { kg: 5, lb: 10 }

/** The 5/3/1 wave as a share of the training max; "+" is the all-out last set. */
const WAVE: Record<1 | 2 | 3 | 4, PerSet[]> = {
  1: [{ pct: 0.65, reps: 5 }, { pct: 0.75, reps: 5 }, { pct: 0.85, reps: { atLeast: 5 } }],
  2: [{ pct: 0.7, reps: 3 }, { pct: 0.8, reps: 3 }, { pct: 0.9, reps: { atLeast: 3 } }],
  3: [{ pct: 0.75, reps: 5 }, { pct: 0.85, reps: 3 }, { pct: 0.95, reps: { atLeast: 1 } }],
  4: [{ pct: 0.4, reps: 5 }, { pct: 0.5, reps: 5 }, { pct: 0.6, reps: 5 }],
}

/** The day's main lift: 5/3/1 sets, then 5×10 of the same lift. */
const mainLift = (id: string, lift: SlotSpec["lift"], inc: Increment): SlotSpec => ({
  id,
  lift,
  sets: [
    {
      id: "main",
      kind: "working",
      count: 3,
      reps: 5,
      load: { from: "max", max: "tm", pct: 0.65 },
      perSet: WAVE[1],
      note: "Push the last set for as many good reps as you can.",
    },
    {
      id: "bbb",
      kind: "backoff",
      count: 5,
      reps: 10,
      load: { from: "max", max: "tm", pct: 0.5 },
      note: "Boring But Big: 5 sets of 10 at 50% of the training max (Wendler's rule of thumb is 50–60%).",
    },
  ],
  weeks: [
    { weeks: "2", set: "main", perSet: WAVE[2] },
    { weeks: "3", set: "main", perSet: WAVE[3] },
    { weeks: "4", set: "main", perSet: WAVE[4], note: "Deload week: three easy sets of 5, nothing all-out." },
    {
      weeks: "4",
      set: "bbb",
      options: [
        { count: 5, reps: 10 },
        { count: 3, reps: 10 },
      ],
      note: "Deload week: do the 5×10 as normal, or cut it to 3×10.",
    },
  ],
  progression: { kind: "cycle-bump", inc },
})

const latWork = (id: string): SlotSpec => ({
  id,
  lift: { name: "Lat work" },
  choices: [
    { lib: "lib_chin_up" },
    { lib: "lib_pull_up" },
    { lib: "lib_lat_pulldown" },
    { lib: "lib_db_row" },
    { lib: "lib_barbell_row" },
    { lib: "lib_cable_row" },
  ],
  note: "Curls or shrugs may stand in for the lat work. You can superset it with the 5×10 pressing.",
  sets: [{ id: "work", kind: "working", count: 5, reps: 10, load: choose }],
  progression: HOLD,
})

const abs = (id: string): SlotSpec => ({
  id,
  lift: { name: "Abs" },
  choices: [
    { lib: "lib_hanging_leg_raise" },
    { lib: "lib_ab_wheel" },
    { lib: "lib_cable_crunch" },
    { lib: "lib_weighted_crunch" },
    { lib: "lib_decline_sit_up" },
  ],
  note: "Five sets of ab work; the article names no reps.",
  sets: [{ id: "work", kind: "working", count: 5, reps: { min: 10, max: 20 }, load: choose }],
  progression: HOLD,
})

export const wendler531Bbb: ProgramFixture = {
  id: "wendler-531-bbb",
  title: "5/3/1 Boring But Big",
  source: {
    url: "https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big",
    author: "Jim Wendler",
    terms: "paid-public-rules",
    checked: "2026-10-22",
    notes:
      "BBB days, 5×10, lat/abs work and deload 5×10-or-3×10 from Wendler's free jimwendler.com article (Example 1). " +
      "The 4-week wave, the 40/50/60 deload, TM 90% and the +5/+10 lb bump are from the paid 5/3/1 book, publicly restated at " +
      "https://liftvault.com/programs/powerlifting/jim-wendlers-531-spreadsheet/ and https://www.boostcamp.app/jim-wendler/5-3-1-boring-but-big . " +
      "50% from https://jimwendler.com/blogs/jimwendler-com/boring-but-big-3-month-challenge (month one). " +
      "Could become 'free' only if the owner accepts that the deload week is book-only.",
  },
  coverage: "close",
  gaps: [
    "The 5×10 percentage cannot change from one cycle to the next. Wendler's newcomer plan is 30% → 45% → 60% over three cycles and his 3-Month Challenge is 50% → 60% → 70% by month; this file uses 50% every cycle.",
  ],
  spec: {
    specVersion: 2,
    name: "5/3/1 Boring But Big",
    blurb:
      "Four days a week, one main lift a day. Three 5/3/1 sets off a training max, the last one all-out in weeks 1–3, then 5 sets of 10 of the same lift at half the training max. Week 4 is a deload. The training max goes up after every 4-week cycle.",
    credit: "by Jim Wendler",
    unit: "lb",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: 4, atEnd: "repeat", deloadWeeks: "4" },
    maxes: [
      { lift: "press", kind: "tm", tmPct: 0.9 },
      { lift: "deadlift", kind: "tm", tmPct: 0.9 },
      { lift: "bench", kind: "tm", tmPct: 0.9 },
      { lift: "squat", kind: "tm", tmPct: 0.9 },
    ],
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "press_day",
        label: "Press",
        slots: [mainLift("press", { lib: "lib_ohp", name: "Press" }, UPPER), latWork("press_lats")],
      },
      {
        id: "deadlift_day",
        label: "Deadlift",
        slots: [mainLift("deadlift", { lib: "lib_deadlift", name: "Deadlift" }, LOWER), abs("deadlift_abs")],
      },
      {
        id: "bench_day",
        label: "Bench press",
        slots: [mainLift("bench", { lib: "lib_bench_press", name: "Bench Press" }, UPPER), latWork("bench_lats")],
      },
      {
        id: "squat_day",
        label: "Squat",
        slots: [mainLift("squat", { lib: "lib_back_squat", name: "Squat" }, LOWER), abs("squat_abs")],
      },
    ],
  },
  // Training maxes, given as the TM itself.
  start: { maxes: { press: 100, deadlift: 360, bench: 200, squat: 300 } },
  expect: [
    {
      week: 1,
      day: "press_day",
      slot: "press",
      sets: "1x5@65, 1x5@75, 1x5+@85, 5x10@50",
      source: "Week 1 (5s): 65×5, 75×5, 85×5+ of TM 100; BBB Example 1 day one: Press 5×10 at 50% of TM",
    },
    {
      week: 1,
      day: "squat_day",
      slot: "squat",
      sets: "1x5@195, 1x5@225, 1x5+@255, 5x10@150",
      source: "Week 1 of TM 300: 65/75/85% = 195/225/255; Squat 5×10 at 50% = 150",
    },
    {
      week: 2,
      day: "deadlift_day",
      slot: "deadlift",
      sets: "1x3@250, 1x3@290, 1x3+@325, 5x10@180",
      source: "Week 2 (3s): 70/80/90% ×3, 3, 3+ of TM 360 = 252→250, 288→290, 324→325; 5×10 at 50% = 180",
    },
    {
      week: 3,
      day: "squat_day",
      slot: "squat",
      sets: "1x5@225, 1x3@255, 1x1+@285, 5x10@150",
      source: "Week 3 (5/3/1): 75%×5, 85%×3, 95%×1+ of TM 300",
    },
    {
      week: 4,
      day: "squat_day",
      slot: "squat",
      sets: "1x5@120, 1x5@150, 1x5@180, 5x10|3x10@150",
      source: "Week 4 deload: 40/50/60% ×5 of TM 300; article: 'For the deload, I recommend doing the 5x10 work or cutting it down to 3x10'",
    },
    {
      week: 1,
      day: "bench_day",
      slot: "bench",
      sets: "1x5@130, 1x5@150, 1x5+@170, 5x10@100",
      source: "Week 1 (5s) of TM 200: 65/75/85% = 130/150/170; 5×10 at 50% = 100",
    },
    {
      week: 5,
      day: "bench_day",
      slot: "bench",
      sets: "1x5@135, 1x5@155, 1x5+@175, 5x10@105",
      source: "Cycle 2 week 1: bench TM +5 lb = 205; 65/75/85% = 133.25→135, 153.75→155, 174.25→175; 50% = 102.5→105",
    },
    {
      week: 1,
      day: "press_day",
      slot: "press_lats",
      sets: "5x10@?",
      source: "BBB Example 1 day one: 'Lat work – 5 sets of 10 reps'",
    },
  ],
}
