/**
 * DC Training ("DoggCrapp"), Dante Trudel's method, from his own answers in
 * Greg Merritt's interview "Dante Trudel Interview: All About Doggcrapp" (The
 * Barbell, 2024-06-07) and Merritt's companion write-up "Doggcrapp Training:
 * Everything You Need To Know" (The Barbell) for the per-body-part rep ranges
 * and a sample three-exercise rotation. Read 2026-10-22.
 *
 * Two workouts — A: chest, shoulders, triceps, back width, back thickness;
 * B: biceps, forearms, calves, hamstrings, quads — on Monday, Wednesday,
 * Friday: A B A one week, B A B the next. Each body part keeps three
 * exercises and does one of them each time, in turn; one working set.
 *
 * The rotation is written as six days run in order — A1 B1 A2 B2 A3 B3 —
 * so each exercise has its own day, its own logbook, and comes back every
 * sixth workout (two weeks), which is exactly when Trudel compares it.
 *
 * Most sets are rest-paused: to failure, 15 deep breaths, to failure, 15
 * breaths, to failure — the total is the set's reps (11–15 typically). Quads
 * and back thickness are NOT rest-paused: quads are a heavy 4–8 then a
 * 20-rep "widowmaker" with less weight; back thickness a heavy 6–8 then a
 * lighter 10–12, both to failure. "Beat the logbook" — more weight or more
 * reps than last time, "even by 5 lbs or one rep" — is double progression:
 * reps climb to the top of the range, then 5 lb goes on.
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, SlotSpec } from "@/src/programs/spec/types"

const r = (min: number, max: number) => ({ min, max })
const STEP = { kg: 2.5, lb: 5 }
const STRETCH = "Then an extreme stretch for this body part: 60–90 seconds, loaded."
const RP_NOTE = "Rest-pause: to failure, 15 deep breaths, to failure, 15 breaths, to failure. The reps are the total."

/** One rest-paused set: three failure points, the total in the range. */
const restPause = (id: string, ref: LiftRef, reps: { min: number; max: number }, extra: Partial<SlotSpec> = {}): SlotSpec => ({
  id,
  lift: ref,
  note: `${RP_NOTE} ${STRETCH}`,
  sets: [{ id: "rp", kind: "restpause", count: 1, reps, load: { from: "working" } }],
  progression: { kind: "double", inc: STEP },
  ...extra,
})

/** A heavy straight set, then a lighter one chosen on the day; the heavy set carries the logbook. */
const heavyThenLighter = (
  id: string,
  ref: LiftRef,
  heavy: { min: number; max: number },
  second: number | { min: number; max: number },
  note: string
): SlotSpec => ({
  id,
  lift: ref,
  note,
  sets: [
    { id: "heavy", kind: "working", count: 1, reps: heavy, load: { from: "working" } },
    { id: "second", kind: "backoff", count: 1, reps: second, load: { from: "choose" } },
  ],
  progression: { kind: "double", inc: STEP, group: "heavy" },
})

const straight = (
  id: string,
  ref: LiftRef,
  count: number | { min: number; max: number },
  reps: { min: number; max: number },
  note: string
): SlotSpec => ({
  id,
  lift: ref,
  note,
  sets: [{ id: "work", kind: "working", count, reps, load: { from: "working" } }],
  progression: { kind: "double", inc: STEP },
})

const CHEST = r(11, 15)
const SHOULDERS = r(11, 20)
const TRICEPS = r(15, 30)
const BACK_WIDTH = r(11, 15)
const BICEPS = r(11, 15)
const HAMSTRINGS = r(15, 30)

const THICKNESS = `Not rest-paused. One heavy set of 6–8 to failure, rest, then a slightly lighter set of 10–12 to failure. ${STRETCH}`
const QUADS = `Not rest-paused. One heavy set of 4–8, rest, then a 20-rep "widowmaker" with less (still heavy) weight. ${STRETCH}`
const FOREARMS = "One straight set to failure, not rest-paused."
const CALVES = "Straight sets: lower over 3–5 seconds, hold the bottom stretch 10–20 seconds, then push up explosively."

/** Workout A, rotation n: chest, shoulders, triceps, back width, back thickness. */
const workoutA = (
  n: number,
  lifts: { chest: LiftRef; shoulders: LiftRef; triceps: LiftRef; width: LiftRef; thickness: LiftRef }
): SlotSpec[] => [
  restPause(`a${n}_chest`, lifts.chest, CHEST),
  restPause(`a${n}_shoulders`, lifts.shoulders, SHOULDERS),
  restPause(`a${n}_triceps`, lifts.triceps, TRICEPS),
  restPause(`a${n}_back_width`, lifts.width, BACK_WIDTH),
  heavyThenLighter(`a${n}_back_thickness`, lifts.thickness, r(6, 8), r(10, 12), THICKNESS),
]

/** Workout B, rotation n: biceps, forearms, calves, hamstrings, quads. */
const workoutB = (
  n: number,
  lifts: { biceps: LiftRef; forearms: LiftRef; calves: LiftRef; hamstrings: LiftRef; quads: LiftRef }
): SlotSpec[] => [
  restPause(`b${n}_biceps`, lifts.biceps, BICEPS),
  straight(`b${n}_forearms`, lifts.forearms, 1, r(10, 30), FOREARMS),
  straight(`b${n}_calves`, lifts.calves, r(1, 2), r(10, 20), CALVES),
  restPause(`b${n}_hamstrings`, lifts.hamstrings, HAMSTRINGS),
  heavyThenLighter(`b${n}_quads`, lifts.quads, r(4, 8), 20, QUADS),
]

export const dcTraining: ProgramFixture = {
  id: "dc-training",
  title: "DC Training (DoggCrapp), Dante Trudel",
  source: {
    url: "https://thebarbell.com/dante-trudel/",
    author: "Dante Trudel (interviewed by Greg Merritt)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Trudel gave the method away on the IntenseMuscle forums and in interviews; there is no paid DC program (his paid offer is personal coaching). Split, rest-pause, quads, back thickness, rotation and \"beat the logbook\" are Trudel's own words in the interview; the other rep ranges and the sample exercises are from https://thebarbell.com/doggcrapp-training/ (Trudel says to pick your own best three per body part).",
  },
  coverage: "close",
  gaps: [
    "Rest-pause is a label: the set is one total of 11–15 (or the body part's range) and the three failure points with 15 breaths between them are a note.",
    "\"Beat the logbook\" counts any gain — one more rep at the same weight, or more weight — every time; double progression only adds weight once the top of the range is reached.",
    "An exercise you fail to beat drops out of the rotation and is replaced; the format has no rule that swaps a lift when it stalls.",
    "The three exercises per body part are the lifter's own best three; these are The Barbell's samples.",
    "Blast 6–8 weeks, then cruise 10–14 days of maintenance training with straight sets: the program has no length, and the cruise is not written.",
    "The extreme stretch after each body part (60–90 s loaded, not for calves) is a note, not a set.",
  ],
  spec: {
    specVersion: 2,
    name: "DC Training",
    blurb:
      "Three days a week, alternating two workouts. One all-out set per body part, mostly rest-paused, on one of three exercises taken in turn. Beat last time's weight or reps every time.",
    credit: "by Dante Trudel",
    unit: "lb",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "a1",
        label: "Workout A (rotation 1)",
        slots: workoutA(1, {
          chest: { lib: "lib_incline_bench" },
          shoulders: { lib: "lib_ohp" },
          triceps: { lib: "lib_close_grip_bench" },
          width: { lib: "lib_weighted_pull_up" },
          thickness: { lib: "lib_deadlift" },
        }),
      },
      {
        id: "b1",
        label: "Workout B (rotation 1)",
        slots: workoutB(1, {
          biceps: { lib: "lib_db_curl" },
          forearms: { lib: "lib_hammer_curl" },
          calves: { lib: "lib_leg_press_calf_raise" },
          hamstrings: { lib: "lib_rdl" },
          quads: { lib: "lib_back_squat" },
        }),
      },
      {
        id: "a2",
        label: "Workout A (rotation 2)",
        slots: workoutA(2, {
          chest: { lib: "lib_db_fly" },
          shoulders: { lib: "lib_push_press" },
          triceps: { lib: "lib_dip", name: "Triceps Dip" },
          width: { lib: "lib_lat_pulldown" },
          thickness: { lib: "lib_rack_pull" },
        }),
      },
      {
        id: "b2",
        label: "Workout B (rotation 2)",
        slots: workoutB(2, {
          biceps: { lib: "lib_barbell_curl" },
          forearms: { lib: "lib_reverse_curl" },
          calves: { name: "Hack Squat Calf Raise", loadStyle: "free" },
          hamstrings: { lib: "lib_seated_leg_curl" },
          quads: { lib: "lib_front_squat" },
        }),
      },
      {
        id: "a3",
        label: "Workout A (rotation 3)",
        slots: workoutA(3, {
          chest: { lib: "lib_dip", name: "Weighted Dip (lean forward)" },
          shoulders: { lib: "lib_behind_neck_press" },
          triceps: { lib: "lib_overhead_triceps" },
          width: { name: "Lever Pulldown", loadStyle: "free" },
          thickness: { lib: "lib_barbell_row" },
        }),
      },
      {
        id: "b3",
        label: "Workout B (rotation 3)",
        slots: workoutB(3, {
          biceps: { lib: "lib_cable_curl" },
          forearms: { lib: "lib_wrist_curl" },
          calves: { lib: "lib_standing_calf_raise" },
          hamstrings: { lib: "lib_glute_ham_raise" },
          quads: { lib: "lib_leg_press" },
        }),
      },
    ],
  },
  start: {
    working: {
      a1_chest: 185,
      a1_back_thickness: 365,
      b1_quads: 275,
      b1_biceps: 40,
      // The rest: plausible logbook weights; no expectation reads them.
      a1_shoulders: 135,
      a1_triceps: 185,
      a1_back_width: 45,
      b1_forearms: 40,
      b1_calves: 270,
      b1_hamstrings: 225,
      a2_chest: 40,
      a2_shoulders: 155,
      a2_triceps: 45,
      a2_back_width: 160,
      a2_back_thickness: 405,
      b2_biceps: 85,
      b2_forearms: 65,
      b2_calves: 225,
      b2_hamstrings: 100,
      b2_quads: 205,
      a3_chest: 45,
      a3_shoulders: 115,
      a3_triceps: 60,
      a3_back_width: 160,
      a3_back_thickness: 225,
      b3_biceps: 60,
      b3_forearms: 75,
      b3_calves: 225,
      b3_hamstrings: 25,
      b3_quads: 450,
    },
  },
  expect: [
    {
      session: 1,
      day: "a1",
      slot: "a1_chest",
      sets: "1x11-15@185",
      source: "Interview: incline bench rest-pause set, 11-15 total reps (8 to failure, 15 breaths, 2-4, 15 breaths, 1-2)",
    },
    {
      session: 1,
      day: "a1",
      slot: "a1_back_thickness",
      sets: "1x6-8@365, 1x10-12@?",
      source: "Interview: back thickness — one heavy set of 6-8, then a slightly lighter set of 10-12, both to failure",
    },
    {
      session: 2,
      day: "b1",
      slot: "b1_quads",
      sets: "1x4-8@275, 1x20@?",
      source: "Interview: quads — one heavy set of 4-8, then a 20-rep widowmaker with less weight",
    },
    {
      session: 2,
      day: "b1",
      slot: "b1_biceps",
      sets: "1x11-15@40",
      source: "The Barbell guide: biceps 1 working set, 11-15 reps, rest-pause",
    },
    {
      session: 7,
      day: "a1",
      slot: "a1_chest",
      sets: "1x11-15@190",
      source: "Interview: beat the logbook \"even by 5 lbs or one rep\" — 15 reps last time → +5 lb two weeks later",
    },
    {
      session: 7,
      day: "a1",
      slot: "a1_back_thickness",
      sets: "1x6-8@370, 1x10-12@?",
      source: "Deadlift back two weeks later: 8 on the heavy set → +5 lb",
    },
    {
      session: 8,
      day: "b1",
      slot: "b1_quads",
      sets: "1x4-8@280, 1x20@?",
      source: "Squat back two weeks later: 8 on the heavy set → +5 lb",
    },
  ],
}
