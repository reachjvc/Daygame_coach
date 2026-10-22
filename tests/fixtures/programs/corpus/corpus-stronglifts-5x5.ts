/**
 * StrongLifts 5×5 — Mehdi Hadim's novice program, from stronglifts.com
 * (read 2026-10-22), NOT from the app's own built-in: the numbers below are
 * the site's.
 *
 * Two workouts alternated every session, three a week with a day off between:
 * A = Squat 5×5, Bench 5×5, Row 5×5; B = Squat 5×5, Overhead Press 5×5,
 * Deadlift 1×5. Add weight after every session where every set was made
 * ("The default increment is 5lb (2.5/side). In kilograms, that's 2.5kg");
 * men add 10 lb (5 kg) on the deadlift "for a few weeks", then 5 lb (2.5 kg).
 * A miss repeats the weight; "repeat the weight three times but still fail?
 * Stop trying and deload. Reduce the weight by about 10%".
 *
 * Starting weights are the site's own for a new lifter in kg: the empty
 * 20 kg bar on squat, bench and press, 40 kg deadlift, 30 kg rows.
 *
 * Assistance work is optional and comes as three whole templates on
 * /stronglifts-5x5/assistance-work/ (Biceps/Abs, Chest/Back, Glutes & Abs).
 * Each assistance slot below lists the lifts the templates put in that
 * position; the weight is the lifter's ("add weight over time").
 */

import type { ProgramFixture } from "../fixture"
import type { SlotSpec } from "@/src/programs/spec/types"

const SMALL = { kg: 2.5, lb: 5 } as const
const MICRO = { kg: 1.25, lb: 2.5 } as const
const REST = 180

/** 5×5 straight sets at the working weight; add on success, −10% after three misses in a row. */
const fiveByFive = (id: string, lift: SlotSpec["lift"], extra: Partial<SlotSpec> = {}): SlotSpec => ({
  id,
  lift,
  restSec: REST,
  sets: [{ id: "work", kind: "working", count: 5, reps: 5, load: { from: "working" } }],
  progression: { kind: "add-on-success", inc: SMALL, failsBeforeDrop: 3, dropPct: 0.1 },
  ...extra,
})

const assistance = (id: string, lift: SlotSpec["lift"], choices: SlotSpec["lift"][], note: string, reps: SlotSpec["sets"][number]["reps"] = 8): SlotSpec => ({
  id,
  lift,
  choices,
  note,
  sets: [{ id: "work", kind: "working", count: 3, reps, load: { from: "choose" } }],
  progression: { kind: "hold" },
})

const WARMUP_NOTE =
  "Warm up first: two sets of 5 with the empty bar, then heavier sets of 5 (+10–20 kg a set) until the work weight; no rest between warm-ups."

export const corpusStronglifts5x5: ProgramFixture = {
  id: "corpus-stronglifts-5x5",
  title: "StrongLifts 5×5 (from stronglifts.com)",
  source: {
    url: "https://stronglifts.com/stronglifts-5x5/workout-program/",
    author: "Mehdi Hadim (StrongLifts)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "The program, increments, starting weights and failure rule are published free on stronglifts.com " +
      "(/stronglifts-5x5/workout-program/, /progress/, /failure/, /assistance-work/); only the app's Pro tier is paid. " +
      "Deadlift +5 kg is the site's 'Deadlift can progress by 10lb' in kg; its own kg table says 2.5–5 kg for squat/deadlift.",
  },
  coverage: "close",
  gaps: [
    "Warm-up sets (2×5 with the empty bar, then +10–20 kg jumps to the work weight) are a note, not sets: the jump size is the lifter's.",
    "The deadlift drops from +5 kg to +2.5 kg 'once this becomes hard' and the bench, press and row drop to +1.25 kg 'once you've failed reps'; both are written as the smaller step after the first stall, which is the closest preset.",
    "Assistance is one of three whole templates; `choices` picks per slot, so nothing keeps the two picks of one day in the same template, and the B-day second slot is Planks 3×30 s in two templates but Barbell Curl 3×8 in Chest/Back, which the format cannot offer as one choice.",
    "'Repeat the weight three times but still fail' is read as three failed sessions in a row; it could also mean a fourth.",
  ],
  spec: {
    specVersion: 2,
    name: "StrongLifts 5×5",
    blurb:
      "Two alternating full-body workouts, three days a week with a day off between. Squat every session; bench and row on A, overhead press and deadlift on B. Add weight every time you make all your reps.",
    credit: "by Mehdi Hadim (stronglifts.com)",
    unit: "kg",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    // 1.25 kg is the site's own microload step ("2.5lb (1.25/side)" / "1.25kg").
    rounding: { stepKg: 1.25, stepLb: 2.5, mode: "nearest" },
    days: [
      {
        id: "a",
        label: "Workout A",
        slots: [
          fiveByFive("a_squat", { lib: "lib_back_squat", name: "Squat" }, { stateKey: "squat", note: WARMUP_NOTE }),
          fiveByFive("bench", { lib: "lib_bench_press" }, {
            progression: { kind: "add-on-success", inc: SMALL, afterStallInc: MICRO, failsBeforeDrop: 3, dropPct: 0.1 },
          }),
          fiveByFive("row", { lib: "lib_barbell_row" }, {
            progression: { kind: "add-on-success", inc: SMALL, afterStallInc: MICRO, failsBeforeDrop: 3, dropPct: 0.1 },
          }),
          assistance(
            "a_assist_1",
            { name: "Pull-up or Romanian Deadlift" },
            [{ lib: "lib_pull_up" }, { lib: "lib_rdl" }],
            "Optional. Pull-ups in the Biceps/Abs and Chest/Back templates; Romanian Deadlift in Glutes & Abs."
          ),
          assistance(
            "a_assist_2",
            { name: "Hanging Knee Raise or Skullcrusher" },
            [{ name: "Hanging Knee Raise", loadStyle: "free" }, { lib: "lib_skullcrusher" }],
            "Optional. Hanging Knee Raises in Biceps/Abs and Glutes & Abs; Skullcrushers in Chest/Back."
          ),
        ],
      },
      {
        id: "b",
        label: "Workout B",
        slots: [
          fiveByFive("b_squat", { lib: "lib_back_squat", name: "Squat" }, { stateKey: "squat", note: WARMUP_NOTE }),
          fiveByFive("ohp", { lib: "lib_ohp" }, {
            progression: { kind: "add-on-success", inc: SMALL, afterStallInc: MICRO, failsBeforeDrop: 3, dropPct: 0.1 },
          }),
          {
            id: "deadlift",
            lift: { lib: "lib_deadlift" },
            restSec: REST,
            note: "One heavy set of 5 after ramping up in sets of 5.",
            sets: [{ id: "work", kind: "working", count: 1, reps: 5, load: { from: "working" } }],
            progression: { kind: "add-on-success", inc: { kg: 5, lb: 10 }, afterStallInc: SMALL, failsBeforeDrop: 3, dropPct: 0.1 },
          },
          assistance(
            "b_assist_1",
            { name: "Barbell Curl, Dip or Hip Thrust" },
            [{ lib: "lib_barbell_curl" }, { lib: "lib_dip" }, { lib: "lib_hip_thrust" }],
            "Optional. Barbell Curls in Biceps/Abs, Dips in Chest/Back, Hip Thrusts in Glutes & Abs."
          ),
          {
            ...assistance(
              "b_assist_2",
              { lib: "lib_plank" },
              [{ lib: "lib_plank" }, { lib: "lib_barbell_curl" }],
              "Optional. Planks 3×30 s in Biceps/Abs and Glutes & Abs; the Chest/Back template does Barbell Curls 3×8 here instead.",
              { seconds: 30 }
            ),
          },
        ],
      },
    ],
  },
  start: { working: { squat: 20, bench: 20, row: 30, ohp: 20, deadlift: 40 } },
  expect: [
    {
      session: 1,
      slot: "a_squat",
      sets: "5x5@20",
      source: "workout-program, 'Starting weights': 'Start with the empty bar on the Squat, Bench and Overhead Press… 45lb/20kg'",
    },
    {
      session: 1,
      slot: "row",
      sets: "5x5@30",
      source: "workout-program, 'Starting weights': '…65lb/30kg on Barbell Rows'",
    },
    {
      session: 2,
      slot: "deadlift",
      sets: "1x5@40",
      source: "workout-program, 'Starting weights': 'Start with 95lb/40kg on Deadlifts'; 'Deadlift is 1×5'",
    },
    {
      session: 5,
      slot: "a_squat",
      sets: "5x5@30",
      source: "progress: 'In kilograms, that's 2.5kg'; squat every session → 20 + 4 × 2.5 = 30 on the fifth workout",
    },
    {
      session: 5,
      slot: "bench",
      sets: "5x5@25",
      source: "progress: +2.5 kg a workout on the Bench; bench on sessions 1, 3, 5 → 20 + 2 × 2.5 = 25",
    },
    {
      session: 6,
      slot: "deadlift",
      sets: "1x5@50",
      source: "progress: 'Deadlift can progress by 10lb' (5 kg); deadlift on sessions 2, 4, 6 → 40 + 2 × 5 = 50",
    },
    {
      session: 6,
      slot: "ohp",
      sets: "5x5@25",
      source: "progress: +2.5 kg on the OHP; press on sessions 2, 4, 6 → 20 + 2 × 2.5 = 25",
    },
  ],
}
