/**
 * PHUL — Power Hypertrophy Upper Lower, by Brandon Campbell, as Muscle &
 * Strength publishes it (muscleandstrength.com/workouts/phul-workout). The
 * live page refuses automated readers, so the tables were read from the
 * Wayback Machine's 2020 copy of that page on 2026-10-22.
 *
 * Day 1 upper power, day 2 lower power, day 3 off, day 4 upper hypertrophy,
 * day 5 lower hypertrophy, days 6–7 off — Monday, Tuesday, Thursday, Friday.
 * Every exercise, and its sets and reps, is the article's table. "All sets
 * should be completed with at least 1 rep left in the tank" is the RPE 9
 * ceiling on every set.
 *
 * The article gives no progression rule beyond "progressive overload". The
 * site's own staff answer in the article's comments ("increase your weight
 * and drop your sets and reps", once someone is doing the top of every range)
 * is double progression, which is what this file uses; the size of the jump
 * is nowhere, so it is this file's choice and is listed as a gap.
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, SlotSpec } from "@/src/programs/spec/types"

const r = (min: number, max: number) => ({ min, max })
const STEP = { kg: 2.5, lb: 5 }

const lift = (
  id: string,
  ref: LiftRef,
  count: number | { min: number; max: number },
  reps: { min: number; max: number },
  extra: Partial<SlotSpec> = {}
): SlotSpec => ({
  id,
  lift: ref,
  sets: [
    {
      id: "work",
      kind: "working",
      count,
      reps,
      load: { from: "working" },
      effort: { rpe: 9, cap: true },
    },
  ],
  progression: { kind: "double", inc: STEP },
  ...extra,
})

export const phulSource: ProgramFixture = {
  id: "phul-source",
  title: "PHUL (Power Hypertrophy Upper Lower), Brandon Campbell",
  source: {
    url: "https://www.muscleandstrength.com/workouts/phul-workout",
    author: "Brandon Campbell (Muscle & Strength)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free article with a free PDF on Muscle & Strength. The live page answers 403 to fetchers; read from web.archive.org/web/2020id_/https://www.muscleandstrength.com/workouts/phul-workout. Boostcamp's PHUL (3 sets, RPE 9, different leg exercises) is an adaptation and was not used.",
  },
  coverage: "close",
  gaps: [
    "The article names no progression rule. Double progression comes from M&S staff's reply in the comments; the 5 lb / 2.5 kg jump is this file's choice.",
    "\"Start with a lower amount of total volume until you become accustomed\" — the low end of each set range at first — is a note; the format has no rule that moves the set count over time.",
    "\"Calf Exercise\" on lower power is open; it is a slot chosen on the day.",
  ],
  spec: {
    specVersion: 2,
    name: "PHUL",
    blurb:
      "Four days: a heavy upper and lower day early in the week, a higher-rep upper and lower day at the end. Every set stops with at least one rep left. When every set is at the top of its sets and reps, add weight.",
    credit: "by Brandon Campbell (Muscle & Strength)",
    unit: "lb",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "upper_power",
        label: "Upper Power",
        weekday: 1,
        slots: [
          lift("up_bench", { lib: "lib_bench_press", name: "Barbell Bench Press" }, r(3, 4), r(3, 5)),
          lift("up_incline_db", { lib: "lib_incline_db_press", name: "Incline Dumbbell Bench Press" }, r(3, 4), r(6, 10)),
          lift("up_row", { lib: "lib_barbell_row", name: "Bent Over Row" }, r(3, 4), r(3, 5)),
          lift("up_pulldown", { lib: "lib_lat_pulldown", name: "Lat Pull Down" }, r(3, 4), r(6, 10)),
          lift("up_ohp", { lib: "lib_ohp" }, r(2, 3), r(5, 8)),
          lift("up_curl", { lib: "lib_barbell_curl" }, r(2, 3), r(6, 10)),
          lift("up_skull", { lib: "lib_skullcrusher" }, r(2, 3), r(6, 10)),
        ],
      },
      {
        id: "lower_power",
        label: "Lower Power",
        weekday: 2,
        slots: [
          lift("lp_squat", { lib: "lib_back_squat", name: "Squat" }, r(3, 4), r(3, 5)),
          lift("lp_deadlift", { lib: "lib_deadlift" }, r(3, 4), r(3, 5)),
          lift("lp_leg_press", { lib: "lib_leg_press" }, r(3, 5), r(10, 15)),
          lift("lp_leg_curl", { lib: "lib_leg_curl" }, r(3, 4), r(6, 10)),
          lift("lp_calves", { name: "Calf Exercise" }, 4, r(6, 10), {
            choices: [
              { lib: "lib_standing_calf_raise" },
              { lib: "lib_seated_calf_raise" },
              { lib: "lib_leg_press_calf_raise" },
              { lib: "lib_donkey_calf_raise" },
            ],
          }),
        ],
      },
      {
        id: "upper_hyp",
        label: "Upper Hypertrophy",
        weekday: 4,
        slots: [
          lift("uh_incline", { lib: "lib_incline_bench", name: "Incline Barbell Bench Press" }, r(3, 4), r(8, 12)),
          lift("uh_fly", { lib: "lib_db_fly", name: "Flat Bench Dumbbell Flye" }, r(3, 4), r(8, 12)),
          lift("uh_cable_row", { lib: "lib_cable_row" }, r(3, 4), r(8, 12)),
          lift("uh_db_row", { lib: "lib_db_row", name: "One Arm Dumbbell Row" }, r(3, 4), r(8, 12), { perSide: true }),
          lift("uh_lateral", { lib: "lib_lateral_raise", name: "Dumbbell Lateral Raise" }, r(3, 4), r(8, 12)),
          lift("uh_curl", { lib: "lib_incline_db_curl", name: "Seated Incline Dumbbell Curl" }, r(3, 4), r(8, 12)),
          lift("uh_triceps", { name: "Cable Tricep Extension", loadStyle: "free" }, r(3, 4), r(8, 12)),
        ],
      },
      {
        id: "lower_hyp",
        label: "Lower Hypertrophy",
        weekday: 5,
        slots: [
          lift("lh_front_squat", { lib: "lib_front_squat" }, r(3, 4), r(8, 12)),
          lift("lh_lunge", { name: "Barbell Lunge", loadStyle: "barbell" }, r(3, 4), r(8, 12)),
          lift("lh_leg_ext", { lib: "lib_leg_extension" }, r(3, 4), r(10, 15)),
          lift("lh_leg_curl", { lib: "lib_leg_curl" }, r(3, 4), r(10, 15)),
          lift("lh_seated_calf", { lib: "lib_seated_calf_raise" }, r(3, 4), r(8, 12)),
          lift("lh_calf_press", { lib: "lib_leg_press_calf_raise", name: "Calf Press" }, r(3, 4), r(8, 12)),
        ],
      },
    ],
  },
  start: {
    working: {
      up_bench: 185,
      lp_squat: 225,
      lp_deadlift: 275,
      lh_front_squat: 135,
      // The rest: plausible starts; no expectation reads them.
      up_incline_db: 55,
      up_row: 155,
      up_pulldown: 120,
      up_ohp: 95,
      up_curl: 65,
      up_skull: 60,
      lp_leg_press: 360,
      lp_leg_curl: 80,
      lp_calves: 135,
      uh_incline: 135,
      uh_fly: 30,
      uh_cable_row: 120,
      uh_db_row: 60,
      uh_lateral: 20,
      uh_curl: 25,
      uh_triceps: 40,
      lh_lunge: 95,
      lh_leg_ext: 100,
      lh_leg_curl: 70,
      lh_seated_calf: 90,
      lh_calf_press: 180,
    },
  },
  expect: [
    {
      session: 1,
      day: "upper_power",
      slot: "up_bench",
      sets: "3-4x3-5@185 rpe<=9",
      source: "Day 1 Upper Power table: Barbell Bench Press 3-4 sets, 3-5 reps; PHUL Notes: at least 1 rep left in the tank",
    },
    {
      session: 2,
      day: "lower_power",
      slot: "lp_squat",
      sets: "3-4x3-5@225 rpe<=9",
      source: "Day 2 Lower Power table: Squat 3-4 × 3-5",
    },
    {
      session: 2,
      day: "lower_power",
      slot: "lp_deadlift",
      sets: "3-4x3-5@275 rpe<=9",
      source: "Day 2 Lower Power table: Deadlift 3-4 × 3-5",
    },
    {
      session: 4,
      day: "lower_hyp",
      slot: "lh_front_squat",
      sets: "3-4x8-12@135 rpe<=9",
      source: "Day 5 Lower Hypertrophy table: Front Squat 3-4 × 8-12",
    },
    {
      session: 5,
      day: "upper_power",
      slot: "up_bench",
      sets: "3-4x3-5@190 rpe<=9",
      source: "Week 2: top of the range on every set in week 1 → weight up (M&S staff reply: \"increase your weight and drop your sets and reps\"); +5 lb is this file's step",
    },
    {
      session: 6,
      day: "lower_power",
      slot: "lp_squat",
      sets: "3-4x3-5@230 rpe<=9",
      source: "Week 2 squat, same rule: 225 + 5",
    },
  ],
}
