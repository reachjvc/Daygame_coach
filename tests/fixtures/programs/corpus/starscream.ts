/**
 * Starscream — u/BenchPauper's 12-week, 5-day hypertrophy program, as the
 * owner's own copy of the sheet has it (read cell by cell on 2026-10-18:
 * Master!A10:U119, rounding C8 = 2.5, start date A13 = 2026-10-19).
 *
 * Every day opens with a top set picked by feel at RPE 8.5 (week 12: 1–5
 * reps at RPE 9), and the back-off range is worked out from the top set
 * logged that day — `mround(top × 0.7 … 0.8, 2.5)`, squats 0.7 … 0.9. Friday's
 * bench is volume, with the last set capped at RPE 9. Everything else is sets
 * and reps with the weight chosen on the day.
 *
 * Two readings of the sheet are this file's, and say so: the chin-up/row work
 * "superset with your bench press" has no sets or reps in the sheet, so it
 * follows the back-offs it is paired with (3–5 × 5–10); and "superset core
 * work as much as possible" stays a note rather than a lift, because the sheet
 * never says which or how much.
 */

import type { ProgramFixture } from "../fixture"
import type { SlotSpec } from "@/src/programs/spec/types"

const HOLD = { kind: "hold" } as const
const choose = { from: "choose" } as const

/** A top set picked by feel, then back-offs at a share of it. */
const topAndBackoff = (
  id: string,
  lift: SlotSpec["lift"],
  backoff: {
    count: SlotSpec["sets"][number]["count"]
    reps: number | { min: number; max: number }
    pct: { min: number; max: number }
    options?: { count: number; reps: number }[]
  },
  extra: Partial<SlotSpec> = {}
): SlotSpec => ({
  id,
  lift,
  sets: [
    { id: "top", kind: "top", count: 1, reps: { min: 2, max: 5 }, load: { from: "effort" }, effort: { rpe: 8.5 } },
    {
      id: "back",
      kind: "backoff",
      count: backoff.count,
      reps: backoff.reps,
      ...(backoff.options ? { options: backoff.options } : {}),
      load: { from: "set", group: "top", pct: backoff.pct },
      note: "Pick a weight in this range by how the day feels.",
    },
  ],
  weeks: [{ weeks: "12", set: "top", reps: { min: 1, max: 5 }, effort: { rpe: 9 } }],
  progression: { kind: "by-effort", group: "top" },
  ...extra,
})

/** "Superset chin-ups/rows" with the main lift's back-offs. */
const backWork = (id: string): SlotSpec => ({
  id,
  lift: { name: "Chin-ups or rows" },
  choices: [{ lib: "lib_chin_up" }, { lib: "lib_barbell_row" }, { lib: "lib_db_row" }, { lib: "lib_cable_row" }],
  group: "A",
  note: "Superset with the back-offs above.",
  sets: [{ id: "work", kind: "working", count: { min: 3, max: 5 }, reps: { min: 5, max: 10 }, load: choose }],
  progression: HOLD,
})

const accessory = (
  id: string,
  lift: SlotSpec["lift"],
  count: number | { min: number; max: number },
  reps: number | { min: number; max: number },
  group?: string,
  extra: Partial<SlotSpec> = {}
): SlotSpec => ({
  id,
  lift,
  ...(group ? { group } : {}),
  sets: [{ id: "work", kind: "working", count, reps, load: choose }],
  progression: HOLD,
  ...extra,
})

const r = (min: number, max: number) => ({ min, max })

export const starscream: ProgramFixture = {
  id: "starscream",
  title: "Starscream: 12-week hypertrophy",
  source: {
    url: "https://www.liftvault.com/programs/strength/starscream-12-week-hypertrophy-program/",
    author: "u/BenchPauper",
    terms: "free",
    checked: "2026-10-18",
    notes: "The owner's copy of the Google Sheet linked from Lift Vault; numbers below are its formulas.",
  },
  coverage: "exact",
  spec: {
    specVersion: 2,
    name: "Starscream (12-week hypertrophy)",
    blurb:
      "Five days a week, one body area a day. Each day opens with one heavy set picked by feel, then lighter sets worked out from it; the rest is volume with the weight chosen on the day.",
    credit: "by u/BenchPauper",
    unit: "kg",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: 12, atEnd: "finish" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "mon",
        label: "Bench, chest and triceps",
        weekday: 1,
        slots: [
          topAndBackoff("mon_bench", { lib: "lib_bench_press" }, { count: r(3, 5), reps: r(5, 10), pct: r(0.7, 0.8) }, { group: "A" }),
          backWork("mon_back"),
          accessory("mon_dips", { lib: "lib_dip" }, 5, 10, "B"),
          accessory("mon_row", { lib: "lib_chest_supported_row" }, 5, 10, "B"),
          accessory("mon_triceps", { name: "Triceps Extension", loadStyle: "free" }, 5, r(10, 15), "C"),
          accessory("mon_hammer", { lib: "lib_hammer_curl" }, 5, r(10, 15), "C"),
          accessory("mon_side_delts", { lib: "lib_lateral_raise" }, 5, r(10, 15), "C"),
        ],
      },
      {
        id: "tue",
        label: "Deadlift, hamstrings and glutes",
        weekday: 2,
        slots: [
          {
            ...topAndBackoff("tue_deadlift", { lib: "lib_deadlift" }, { count: r(4, 10), reps: 3, pct: r(0.7, 0.8) }),
            note: "Superset core work with as much of today as you can.",
          },
          accessory("tue_sldl", { lib: "lib_stiff_leg_deadlift" }, 3, r(5, 8), "B"),
          accessory("tue_shrugs", { lib: "lib_shrug" }, 3, r(10, 15), "B"),
          accessory("tue_ghr", { lib: "lib_glute_ham_raise" }, r(3, 5), r(10, 15), "C"),
          accessory("tue_back_ext", { lib: "lib_back_extension" }, r(3, 5), r(10, 15), "C"),
        ],
      },
      {
        id: "wed",
        label: "Incline bench, shoulders and triceps",
        weekday: 3,
        slots: [
          topAndBackoff("wed_incline", { lib: "lib_incline_bench" }, { count: r(3, 5), reps: r(5, 10), pct: r(0.7, 0.8) }, { group: "A" }),
          backWork("wed_back"),
          accessory("wed_incline_db", { lib: "lib_incline_db_press" }, r(3, 5), r(8, 12), "B"),
          accessory("wed_wide_row", { name: "Wide-Grip Row", loadStyle: "barbell" }, r(3, 5), r(8, 12), "B"),
          accessory("wed_db_press", { lib: "lib_db_shoulder_press" }, r(3, 5), r(10, 15), "C"),
          accessory("wed_face_pulls", { lib: "lib_face_pull" }, r(3, 5), r(10, 15), "C"),
          accessory("wed_side_delts", { lib: "lib_lateral_raise" }, r(3, 5), r(10, 15), "C"),
        ],
      },
      {
        id: "thu",
        label: "Squat, quads and core",
        weekday: 4,
        slots: [
          {
            ...topAndBackoff("thu_squat", { name: "Back or Front Squat" }, { count: 3, reps: 10, pct: r(0.7, 0.9), options: [{ count: 3, reps: 10 }, { count: 10, reps: 3 }] }),
            choices: [{ lib: "lib_back_squat" }, { lib: "lib_front_squat" }],
            note: "Back or front squat, your choice each week. Superset core work with as much of today as you can.",
          },
          accessory("thu_leg_press", { lib: "lib_leg_press" }, 5, 10, undefined, {
            note: "Pyramid: add weight every set.",
          }),
          accessory("thu_leg_ext", { lib: "lib_leg_extension" }, 5, 20, "C"),
          accessory("thu_ham_curl", { lib: "lib_leg_curl" }, 5, 20, "C"),
          accessory("thu_calves", { lib: "lib_standing_calf_raise" }, 5, 20, "C"),
        ],
      },
      {
        id: "fri",
        label: "Volume bench, chest and triceps",
        weekday: 5,
        slots: [
          {
            id: "fri_bench",
            lift: { lib: "lib_bench_press" },
            group: "A",
            note: "Avoid touch-and-go reps. Always keep at least one rep in the tank.",
            sets: [
              {
                id: "work",
                kind: "working",
                count: r(4, 6),
                reps: r(5, 6),
                load: { from: "effort" },
                effort: { rpe: 9, lastSetOnly: true, cap: true },
              },
            ],
            progression: { kind: "by-effort", group: "work" },
          },
          backWork("fri_back"),
          accessory("fri_cgbp", { lib: "lib_close_grip_bench" }, 5, r(6, 12), "B"),
          accessory("fri_pullups", { lib: "lib_pull_up" }, 5, r(6, 12), "B"),
          accessory("fri_incline_cgbp", { name: "Incline Close-Grip Bench Press", loadStyle: "barbell" }, r(3, 5), 10, "C"),
          accessory("fri_curls", { name: "Curls" }, r(3, 5), r(10, 15), "C", {
            choices: [{ lib: "lib_barbell_curl" }, { lib: "lib_db_curl" }, { lib: "lib_ez_bar_curl" }, { lib: "lib_cable_curl" }],
          }),
          accessory("fri_delts", { name: "Delt work" }, r(3, 5), r(10, 15), "C", {
            choices: [{ lib: "lib_lateral_raise" }, { lib: "lib_rear_delt_fly" }, { lib: "lib_face_pull" }, { lib: "lib_front_raise" }],
          }),
        ],
      },
    ],
  },
  start: {},
  picks: { mon_bench: 100, tue_deadlift: 110, wed_incline: 80, thu_squat: 100 },
  expect: [
    {
      week: 1,
      day: "mon",
      slot: "mon_bench",
      sets: "1x2-5@? rpe8.5, 3-5x5-10@70-80",
      source: "Master!B12:E13 — 1*2-5 RPE 8.5; 3-5*5-10 at mround(D12*0.7…0.8, 2.5)",
    },
    {
      week: 12,
      day: "mon",
      slot: "mon_bench",
      sets: "1x1-5@? rpe9, 3-5x5-10@70-80",
      source: "Master!B111:E112 — week 12: 1*1-5 RPE 9; back-offs unchanged",
    },
    {
      week: 1,
      day: "tue",
      slot: "tue_deadlift",
      sets: "1x2-5@? rpe8.5, 4-10x3@77.5-87.5",
      source: "Master!F12:I13 — H12 = 110; Speed DL 4-10*3 at mround(110*0.7, 2.5)=77.5 … mround(110*0.8, 2.5)=87.5",
    },
    {
      week: 1,
      day: "wed",
      slot: "wed_incline",
      sets: "1x2-5@? rpe8.5, 3-5x5-10@55-65",
      source: "Master!J12:M13 — mround(80*0.7, 2.5)=55, mround(80*0.8, 2.5)=65",
    },
    {
      week: 1,
      day: "thu",
      slot: "thu_squat",
      sets: "1x2-5@? rpe8.5, 3x10|10x3@70-90",
      source: "Master!N12:Q13 — 3*10-10*3 at mround(P12*0.7…0.9, 2.5)",
    },
    {
      week: 1,
      day: "fri",
      slot: "fri_bench",
      sets: "4-6x5-6@? rpe<=9(last)",
      source: "Master!R12:R13 — Bench Press 4-6*5-6, last set no harder than RPE 9",
    },
    {
      week: 1,
      day: "thu",
      slot: "thu_calves",
      sets: "5x20@?",
      source: "Master!N20:O20 — Calf Raises 5*20, giant set",
    },
  ],
}
