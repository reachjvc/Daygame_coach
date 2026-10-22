/**
 * nSuns 5/3/1 LP, 5-day — u/nSuns' high-volume take on 5/3/1, as his own
 * spreadsheet lays it out (the "n_Suns 531LP" and "nSuns LP Complete
 * Bundle" Google Sheets linked from Lift Vault, read cell by cell on
 * 2026-10-22: '5-day'!A5:T23 and '5 Day LP'!B16:U39 — the same
 * percentages in both).
 *
 * Every number is a percentage of a training max (90% of a 1RM), rounded
 * like the sheet's MROUND to 5 lb. Each day is a 9-set T1 and an 8-set T2;
 * the T2 is a percentage of a T1 lift's training max. On the four
 * "5/3/1" days the third set (95%) is "1+", and its reps move that lift's
 * training max for next week: 0–1 → nothing, 2–3 → +5 lb, 4–5 → +5–10 lb,
 * 6+ → +10–15 lb. Monday's bench is volume only; the bench moves on
 * Friday's 1+. The last T1 set of every day is a rep-out too.
 *
 * Assistance is the lifter's: the sheet names body areas per day ("chest,
 * arms and back"), Lift Vault lists lifts per area and says "pick 2 or 3
 * each session", "bodybuilding sets/reps". Each area is one chosen slot
 * here; the 3–4 × 8–12 on them is this file's placeholder, not the source's.
 */

import type { ProgramFixture } from "../fixture"
import type { Increment, LiftRef, SetReps, SlotSpec } from "@/src/programs/spec/types"

const tm = (pct: number, of?: string) => ({ from: "max", max: "tm", pct, ...(of ? { of } : {}) }) as const
const HOLD = { kind: "hold" } as const
const inc = (lb: number, kg: number): Increment => ({ lb, kg })

/** The TM bump read off the 1+ set. */
const ONE_PLUS_TABLE = [
  { minReps: 0, inc: inc(0, 0) },
  { minReps: 2, inc: inc(5, 2.5) },
  { minReps: 4, inc: inc(10, 5) },
  { minReps: 6, inc: inc(15, 7.5) },
]

/**
 * A 5/3/1 day: 75%×5, 85%×3, 95%×1+, then six back-offs whose reps differ by
 * lift, the last one a rep-out.
 */
const fiveThreeOne = (id: string, lift: LiftRef, stateKey: string, backReps: [number, number, number, number, number, number]): SlotSpec => {
  const backPcts = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65]
  return {
    id,
    lift,
    stateKey,
    note: "T1. The 1+ set decides next week's training max.",
    sets: [
      { id: "ramp", kind: "working", count: 2, reps: 5, load: tm(0.75), perSet: [{ reps: 5, pct: 0.75 }, { reps: 3, pct: 0.85 }] },
      { id: "top", kind: "amrap", count: 1, reps: { atLeast: 1 }, load: tm(0.95) },
      {
        id: "back",
        kind: "backoff",
        count: 6,
        reps: backReps[0],
        load: tm(0.9),
        perSet: backPcts.map((pct, i) => ({ pct, reps: (i === 5 ? { atLeast: backReps[5] } : backReps[i]) as SetReps })),
      },
    ],
    progression: { kind: "amrap-table", group: "top", table: ONE_PLUS_TABLE, target: "max" },
  }
}

/** T2: a ramp of three sets, then five at the top percentage. */
const t2 = (id: string, lift: LiftRef, of: string, pcts: [number, number, number], reps: [number, number, number, number, number, number, number, number]): SlotSpec => ({
  id,
  lift,
  note: "T2, a percentage of the main lift's training max.",
  sets: [
    {
      id: "work",
      kind: "working",
      count: 8,
      reps: reps[0],
      load: tm(pcts[0], of),
      perSet: reps.map((r, i) => ({ reps: r, pct: pcts[Math.min(i, 2)] })),
    },
  ],
  progression: HOLD,
})

const ACC_SETS = { min: 3, max: 4 }
const ACC_REPS = { min: 8, max: 12 }
const assistance = (id: string, name: string, choices: LiftRef[] | null, bodyweight = false): SlotSpec => ({
  id,
  lift: { name },
  ...(choices ? { choices } : {}),
  note: "Assistance: bodybuilding sets and reps, picked for your weak points.",
  sets: [{ id: "work", kind: "working", count: ACC_SETS, reps: ACC_REPS, load: bodyweight ? { from: "bodyweight" } : { from: "choose" } }],
  progression: HOLD,
})

const CHEST: LiftRef[] = [{ lib: "lib_spoto_press" }, { lib: "lib_cable_fly" }, { lib: "lib_db_fly" }]
const ARMS: LiftRef[] = [{ lib: "lib_dip" }, { lib: "lib_overhead_triceps" }, { lib: "lib_triceps_pushdown" }, { lib: "lib_incline_db_curl" }, { lib: "lib_hammer_curl" }]
const BACK: LiftRef[] = [{ lib: "lib_barbell_row" }, { lib: "lib_t_bar_row" }, { lib: "lib_face_pull" }, { lib: "lib_lat_pulldown" }, { lib: "lib_pull_up" }]
const LEGS: LiftRef[] = [{ lib: "lib_hack_squat" }, { lib: "lib_leg_extension" }, { lib: "lib_leg_curl" }, { lib: "lib_leg_press" }]
const SHOULDERS: LiftRef[] = [{ lib: "lib_lateral_raise" }, { lib: "lib_rear_delt_fly" }, { lib: "lib_face_pull" }]

export const nsuns5day: ProgramFixture = {
  id: "nsuns-5day",
  title: "nSuns 5/3/1 LP (5-day)",
  source: {
    url: "https://liftvault.com/programs/powerlifting/n-suns-lifting-spreadsheets/",
    author: "u/nSuns",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: u/nSuns shared the spreadsheets openly; Lift Vault hosts them (Google Sheets 1porLn0AiGBDSsoEoSaAsr-XT8SdLS9cjvsourxj3yxw '5-day' and " +
      "1O0scKzbV22jNs3yYcNYymon4fsY7b7PQbWPjstorM4o '5 Day LP', read cell by cell). The sheets do not print the '+' marks; which sets are " +
      "rep-outs (95% 1+, and the last T1 set 8+/5+/3+) is from Lift Vault's text, boostcamp.app/methodology/nsuns and liftosaur.com/programs/nsuns (rules only).",
  },
  coverage: "close",
  gaps: [
    "The TM bump is for NEXT week ('the reps from that set determine the TM increase for the following week'); the engine applies it after the session, so Thursday's front squat (a share of the squat TM) sees Tuesday's bump four days early.",
    "The 4–5 and 6+ rows are ranges (+5–10 lb, +10–15 lb); the table takes one number per row, so the top of each range is used here (+10, +15).",
    "Assistance is 'pick 2 or 3 from this list, bodybuilding sets and reps' with no sets or reps given; the format has no 'pick N of these lifts', so each named area is one chosen slot, and 3–4 × 8–12 is a placeholder.",
  ],
  spec: {
    specVersion: 2,
    name: "nSuns 5/3/1 LP (5-day)",
    blurb:
      "Five days a week of high-volume barbell work. Each day has a nine-set main lift and an eight-set second lift, all worked out from training maxes that go up every week by how many reps you get on one all-out single.",
    credit: "by u/nSuns, built on Jim Wendler's 5/3/1",
    unit: "lb",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    maxes: [
      { lift: "squat", kind: "tm", tmPct: 0.9 },
      { lift: "bench", kind: "tm", tmPct: 0.9 },
      { lift: "deadlift", kind: "tm", tmPct: 0.9 },
      { lift: "ohp", kind: "tm", tmPct: 0.9 },
    ],
    days: [
      {
        id: "mon",
        label: "Monday: Bench volume, OHP",
        weekday: 1,
        slots: [
          {
            id: "mon_bench",
            lift: { lib: "lib_bench_press" },
            stateKey: "bench",
            note: "T1 volume day. No 1+ set today; the bench moves on Friday.",
            sets: [
              {
                id: "work",
                kind: "working",
                count: 9,
                reps: 8,
                load: tm(0.65),
                perSet: [
                  { reps: 8, pct: 0.65 },
                  { reps: 6, pct: 0.75 },
                  { reps: 4, pct: 0.85 },
                  { reps: 4, pct: 0.85 },
                  { reps: 4, pct: 0.85 },
                  { reps: 5, pct: 0.8 },
                  { reps: 6, pct: 0.75 },
                  { reps: 7, pct: 0.7 },
                  { reps: { atLeast: 8 }, pct: 0.65 },
                ],
              },
            ],
            progression: HOLD,
          },
          t2("mon_ohp", { lib: "lib_ohp" }, "ohp", [0.5, 0.6, 0.7], [6, 5, 3, 5, 7, 4, 6, 8]),
          assistance("mon_chest", "Chest assistance", CHEST),
          assistance("mon_arms", "Arm assistance", ARMS),
          assistance("mon_back", "Back assistance", BACK),
        ],
      },
      {
        id: "tue",
        label: "Tuesday: Squat, Sumo deadlift",
        weekday: 2,
        slots: [
          fiveThreeOne("tue_squat", { lib: "lib_back_squat", name: "Squat" }, "squat", [3, 3, 3, 5, 5, 5]),
          t2("tue_sumo", { lib: "lib_sumo_deadlift" }, "deadlift", [0.5, 0.6, 0.7], [5, 5, 3, 5, 7, 4, 6, 8]),
          assistance("tue_legs", "Leg assistance", LEGS),
          assistance("tue_abs", "Hanging Leg Raise", null, true),
        ],
      },
      {
        id: "wed",
        label: "Wednesday: OHP, Incline bench",
        weekday: 3,
        slots: [
          fiveThreeOne("wed_ohp", { lib: "lib_ohp" }, "ohp", [3, 3, 3, 5, 5, 5]),
          t2("wed_incline", { lib: "lib_incline_bench" }, "bench", [0.4, 0.5, 0.6], [6, 5, 3, 5, 7, 4, 6, 8]),
          assistance("wed_shoulders", "Shoulder assistance", SHOULDERS),
          assistance("wed_chest", "Chest assistance", CHEST),
        ],
      },
      {
        id: "thu",
        label: "Thursday: Deadlift, Front squat",
        weekday: 4,
        slots: [
          fiveThreeOne("thu_deadlift", { lib: "lib_deadlift" }, "deadlift", [3, 3, 3, 3, 3, 3]),
          t2("thu_front_squat", { lib: "lib_front_squat" }, "squat", [0.35, 0.45, 0.55], [5, 5, 3, 5, 7, 4, 6, 8]),
          assistance("thu_back", "Back assistance", BACK),
          assistance("thu_abs", "Hanging Leg Raise", null, true),
        ],
      },
      {
        id: "fri",
        label: "Friday: Bench, Close-grip bench",
        weekday: 5,
        slots: [
          fiveThreeOne("fri_bench", { lib: "lib_bench_press" }, "bench", [3, 5, 3, 5, 3, 5]),
          t2("fri_cgbp", { lib: "lib_close_grip_bench" }, "bench", [0.4, 0.5, 0.6], [6, 5, 3, 5, 7, 4, 6, 8]),
          assistance("fri_arms", "Arm assistance", ARMS),
          assistance("fri_other", "Your choice", null),
        ],
      },
    ],
  },
  // Training maxes themselves (90% of 1RMs 333 / 222 / 444 / 111, near enough).
  start: { maxes: { squat: 300, bench: 200, deadlift: 400, ohp: 100 } },
  // Three reps on every 1+ set: +5 lb a week on each training max.
  outcome: { amrapExtra: 2 },
  expect: [
    {
      session: 1,
      day: "mon",
      slot: "mon_bench",
      sets: "1x8@130, 1x6@150, 3x4@170, 1x5@160, 1x6@150, 1x7@140, 1x8+@130",
      source: "'5-day'!C6:T6 — MROUND(TM × 0.65/0.75/0.85/0.85/0.85/0.8/0.75/0.7/0.65, 5) × 8,6,4,4,4,5,6,7,8; TM 200",
    },
    {
      session: 1,
      day: "mon",
      slot: "mon_ohp",
      sets: "1x6@50, 1x5@60, 1x3@70, 1x5@70, 1x7@70, 1x4@70, 1x6@70, 1x8@70",
      source: "'5-day'!C7:R7 — OHP TM × 0.5, 0.6, 0.7 then 0.7 held; reps 6,5,3,5,7,4,6,8; TM 100",
    },
    {
      session: 2,
      day: "tue",
      slot: "tue_squat",
      sets: "1x5@225, 1x3@255, 1x1+@285, 1x3@270, 1x3@255, 1x3@240, 1x5@225, 1x5@210, 1x5+@195",
      source: "'5-day'!C10:T10 — squat TM × 0.75,0.85,0.95,0.9,0.85,0.8,0.75,0.7,0.65; reps 5,3,1,3,3,3,5,5,5; TM 300",
    },
    {
      session: 4,
      day: "thu",
      slot: "thu_deadlift",
      sets: "1x5@300, 1x3@340, 1x1+@380, 1x3@360, 1x3@340, 1x3@320, 1x3@300, 1x3@280, 1x3+@260",
      source: "'5-day'!C18:T18 — deadlift TM × the same nine percentages; reps 5,3,1,3,3,3,3,3,3; TM 400",
    },
    {
      session: 5,
      day: "fri",
      slot: "fri_bench",
      sets: "1x5@150, 1x3@170, 1x1+@190, 1x3@180, 1x5@170, 1x3@160, 1x5@150, 1x3@140, 1x5+@130",
      source: "'5-day'!C22:T22 — bench TM × the nine percentages; reps 5,3,1,3,5,3,5,3,5; TM 200",
    },
    {
      session: 6,
      day: "mon",
      slot: "mon_bench",
      sets: "1x8@135, 1x6@155, 3x4@175, 1x5@165, 1x6@155, 1x7@145, 1x8+@135",
      source: "Friday's 1+ = 3 reps → bench TM +5 ('5 Day LP'!K8: 2-3 reps, +5 lb) = 205; '5-day'!C6:T6 percentages, MROUND 5",
    },
    {
      session: 7,
      day: "tue",
      slot: "tue_squat",
      sets: "1x5@230, 1x3@260, 1x1+@290, 1x3@275, 1x3@260, 1x3@245, 1x5@230, 1x5@215, 1x5+@200",
      source: "Tuesday's 1+ = 3 reps → squat TM +5 = 305; '5-day'!C10:T10 percentages, MROUND 5",
    },
  ],
}
