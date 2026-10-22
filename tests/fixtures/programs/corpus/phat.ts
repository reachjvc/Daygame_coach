/**
 * PHAT — Power Hypertrophy Adaptive Training, by Dr. Layne Norton, as the
 * Simply Shredded feature "Layne Norton Training Series + Full
 * Power/Hypertrophy Routine" prints it (read 2026-10-22).
 *
 * Two power days (upper, lower), a rest day, three hypertrophy days (back and
 * shoulders, lower, chest and arms), a rest day. Each hypertrophy day opens
 * with speed work on that body part's power lift: 6×3 at 65–70% of "your
 * normal 3–5 rep max" for it — the weight used on the power day. The
 * article's own example: a 300 lb power-day squat gives speed squats at
 * 195–210 lb. That is `{ from: "working", pct: 0.65–0.70, of: <power lift> }`.
 *
 * The article sets no rule for adding weight: the power lifts stay where the
 * lifter puts them (`hold`), which is also what makes the speed work read this
 * week's power weight exactly. Everything after the first lift of a day is
 * chosen on the day.
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, SlotSpec } from "@/src/programs/spec/types"

const r = (min: number, max: number) => ({ min, max })
const HOLD = { kind: "hold" } as const

const ROTATE = "Rotate the power movement every 2–3 weeks."

/** The day's heavy lift: 3×3–5 at the working weight. */
const power = (id: string, ref: LiftRef, stateKey: string, extra: Partial<SlotSpec> = {}): SlotSpec => ({
  id,
  lift: ref,
  stateKey,
  note: `Rest as long as you need to fully recover between sets. ${ROTATE}`,
  sets: [{ id: "work", kind: "working", count: 3, reps: r(3, 5), load: { from: "working" } }],
  progression: HOLD,
  ...extra,
})

/** 6×3 at 65–70% of the power day's weight for the same lift, moved fast. */
const speed = (id: string, ref: LiftRef, of: string, extra: Partial<SlotSpec> = {}): SlotSpec => ({
  id,
  lift: ref,
  restSec: 90,
  note: "Speed work: move the weight as fast as you can, no more than 90 seconds between sets.",
  sets: [{ id: "speed", kind: "working", count: 6, reps: 3, load: { from: "working", pct: r(0.65, 0.7), of } }],
  progression: HOLD,
  ...extra,
})

const chosen = (
  id: string,
  ref: LiftRef,
  count: number,
  reps: number | { min: number; max: number },
  extra: Partial<SlotSpec> = {}
): SlotSpec => ({
  id,
  lift: ref,
  sets: [{ id: "work", kind: "working", count, reps, load: { from: "choose" } }],
  progression: HOLD,
  ...extra,
})

const ROWS: LiftRef[] = [{ lib: "lib_barbell_row" }, { lib: "lib_pendlay_row" }]

export const phat: ProgramFixture = {
  id: "phat",
  title: "PHAT (Power Hypertrophy Adaptive Training), Layne Norton",
  source: {
    url: "https://www.simplyshredded.com/mega-feature-layne-norton-training-series-full-powerhypertrophy-routine-updated-2011.html",
    author: "Dr. Layne Norton",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Published free by Layne Norton in a Simply Shredded feature (updated 2011). Lift Vault's PHAT sheet adds a 4-week percentage wave that Norton's article does not have; not used.",
  },
  coverage: "close",
  gaps: [
    "\"Rotate your power movements every 2–3 weeks\" is a note; the format cannot change a slot's exercise on a schedule.",
    "Avoid failure for the first 3–6 weeks, then allow it on power movements: a note, because the format's effort targets cannot change at a week the lifter decides.",
    "Deload 1–3 weeks at 60–70% of normal weights every 6–12 weeks, \"as needed\": the program has no length, so a deload has no fixed week to sit on.",
    "The article gives no rule for adding weight on power days; they hold until the lifter changes them. With any automatic rule, the speed work (read from the working weight) would show next week's power weight, not this week's.",
  ],
  spec: {
    specVersion: 2,
    name: "PHAT",
    blurb:
      "Five days: heavy upper and lower days for 3–5 reps, then three bodybuilding days that each open with fast triples at 65–70% of that body part's heavy weight.",
    credit: "by Dr. Layne Norton",
    unit: "lb",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "upper_power",
        label: "Upper Body Power",
        weekday: 1,
        slots: [
          power("d1_row", { name: "Bent-Over or Pendlay Row" }, "row", { choices: ROWS }),
          chosen("d1_pull_up", { lib: "lib_weighted_pull_up" }, 2, r(6, 10)),
          chosen("d1_rack_chin", { name: "Rack Chin", loadStyle: "bodyweight" }, 2, r(6, 10)),
          power("d1_db_press", { lib: "lib_db_bench", name: "Flat Dumbbell Press" }, "db_press"),
          chosen("d1_dip", { lib: "lib_dip", name: "Weighted Dip" }, 2, r(6, 10)),
          chosen("d1_shoulder_press", { lib: "lib_seated_db_press" }, 3, r(6, 10)),
          chosen("d1_curl", { lib: "lib_ez_bar_curl", name: "Cambered Bar Curl" }, 3, r(6, 10)),
          chosen("d1_skull", { lib: "lib_skullcrusher" }, 3, r(6, 10)),
        ],
      },
      {
        id: "lower_power",
        label: "Lower Body Power",
        weekday: 2,
        slots: [
          power("d2_squat", { lib: "lib_back_squat", name: "Squat" }, "squat"),
          chosen("d2_hack", { lib: "lib_hack_squat" }, 2, r(6, 10)),
          chosen("d2_leg_ext", { lib: "lib_leg_extension" }, 2, r(6, 10)),
          chosen("d2_sldl", { lib: "lib_stiff_leg_deadlift" }, 3, r(5, 8)),
          chosen("d2_ham", { name: "Glute-Ham Raise or Lying Leg Curl" }, 2, r(6, 10), {
            choices: [{ lib: "lib_glute_ham_raise" }, { lib: "lib_leg_curl" }],
          }),
          chosen("d2_standing_calf", { lib: "lib_standing_calf_raise" }, 3, r(6, 10)),
          chosen("d2_seated_calf", { lib: "lib_seated_calf_raise" }, 2, r(6, 10)),
        ],
      },
      {
        id: "back_shoulders",
        label: "Back and Shoulders Hypertrophy",
        weekday: 4,
        slots: [
          speed("d4_speed_row", { name: "Bent-Over or Pendlay Row" }, "row", { choices: ROWS }),
          chosen("d4_rack_chin", { name: "Rack Chin", loadStyle: "bodyweight" }, 3, r(8, 12)),
          chosen("d4_cable_row", { lib: "lib_cable_row" }, 3, r(8, 12)),
          chosen("d4_row_or_shrug", { name: "Dumbbell Row or Shrug (chest on incline bench)" }, 2, r(12, 15), {
            choices: [{ lib: "lib_db_row" }, { lib: "lib_db_shrug" }],
          }),
          chosen("d4_pulldown", { lib: "lib_close_grip_pulldown" }, 2, r(15, 20)),
          chosen("d4_db_press", { lib: "lib_seated_db_press" }, 3, r(8, 12)),
          chosen("d4_upright_row", { lib: "lib_upright_row" }, 2, r(12, 15)),
          chosen("d4_lateral", { name: "Side Lateral Raise" }, 3, r(12, 20), {
            choices: [{ lib: "lib_lateral_raise" }, { lib: "lib_cable_lateral_raise" }],
          }),
        ],
      },
      {
        id: "lower_hyp",
        label: "Lower Body Hypertrophy",
        weekday: 5,
        slots: [
          speed("d5_speed_squat", { lib: "lib_back_squat", name: "Squat" }, "squat"),
          chosen("d5_hack", { lib: "lib_hack_squat" }, 3, r(8, 12)),
          chosen("d5_leg_press", { lib: "lib_leg_press" }, 2, r(12, 15)),
          chosen("d5_leg_ext", { lib: "lib_leg_extension" }, 3, r(15, 20)),
          chosen("d5_rdl", { lib: "lib_rdl" }, 3, r(8, 12)),
          chosen("d5_lying_curl", { lib: "lib_leg_curl", name: "Lying Leg Curl" }, 2, r(12, 15)),
          chosen("d5_seated_curl", { lib: "lib_seated_leg_curl" }, 2, r(15, 20)),
          chosen("d5_donkey_calf", { lib: "lib_donkey_calf_raise" }, 4, r(10, 15)),
          chosen("d5_seated_calf", { lib: "lib_seated_calf_raise" }, 3, r(15, 20)),
        ],
      },
      {
        id: "chest_arms",
        label: "Chest and Arms Hypertrophy",
        weekday: 6,
        slots: [
          speed("d6_speed_db_press", { lib: "lib_db_bench", name: "Flat Dumbbell Press" }, "db_press"),
          chosen("d6_incline_db", { lib: "lib_incline_db_press" }, 3, r(8, 12)),
          chosen("d6_chest_press", { lib: "lib_machine_chest_press", name: "Hammer Strength Chest Press" }, 3, r(12, 15)),
          chosen("d6_cable_fly", { lib: "lib_cable_fly", name: "Incline Cable Fly" }, 2, r(15, 20)),
          chosen("d6_preacher", { lib: "lib_preacher_curl", name: "Cambered Bar Preacher Curl" }, 3, r(8, 12)),
          chosen("d6_concentration", { lib: "lib_concentration_curl" }, 2, r(12, 15)),
          chosen("d6_spider", { lib: "lib_spider_curl" }, 2, r(15, 20)),
          chosen("d6_triceps_ext", { name: "Seated Cambered Bar Triceps Extension", loadStyle: "barbell" }, 3, r(8, 12)),
          chosen("d6_pressdown", { lib: "lib_rope_pushdown", name: "Rope Cable Pressdown" }, 2, r(12, 15)),
          chosen("d6_kickback", { lib: "lib_triceps_kickback", name: "Cable Kickback" }, 2, r(15, 20)),
        ],
      },
    ],
  },
  start: { working: { row: 200, squat: 300, db_press: 100 } },
  expect: [
    {
      session: 1,
      day: "upper_power",
      slot: "d1_row",
      sets: "3x3-5@200",
      source: "Day 1: bent over or Pendlay rows, 3 sets of 3-5",
    },
    {
      session: 2,
      day: "lower_power",
      slot: "d2_squat",
      sets: "3x3-5@300",
      source: "Day 2: squats, 3 sets of 3-5",
    },
    {
      session: 3,
      day: "back_shoulders",
      slot: "d4_speed_row",
      sets: "6x3@130-140",
      source: "Day 4: speed rows 6 sets of 3 at 65-70% of normal 3-5 rep max — 200 × 0.65 = 130 … × 0.70 = 140",
    },
    {
      session: 4,
      day: "lower_hyp",
      slot: "d5_speed_squat",
      sets: "6x3@195-210",
      source: "Day 5: speed squats 6×3 at 65-70%; the article's own example: \"if squats were 300 lbs for 3-5 reps, speed sets would be 195-210 lbs\"",
    },
    {
      session: 5,
      day: "chest_arms",
      slot: "d6_speed_db_press",
      sets: "6x3@65-70",
      source: "Day 6: speed flat dumbbell presses 6×3 at 65-70% of a 100 lb dumbbell power set",
    },
    {
      session: 9,
      day: "lower_hyp",
      slot: "d5_speed_squat",
      sets: "6x3@195-210",
      source: "Week 2: no stated rule moves the squat, so speed squats stay 65-70% of 300",
    },
  ],
}
