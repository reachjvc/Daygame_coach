/**
 * Metallicadpa's PPL — "A Linear Progression Based PPL Program for Beginners",
 * the r/Fitness post by u/Metallicadpa, read in the r/Fitness wiki's own
 * archive of it (thefitness.wiki/reddit-archive/…) on 2026-10-22.
 *
 * Six days in a row, Pull / Push / Legs twice, with a rest day wherever it
 * suits (PPLRPPL or PPLPPLR). The two pull days alternate deadlift (1×5+) and
 * barbell row (4×5, 1×5+); the two push days alternate bench and overhead
 * press (4×5, 1×5+), each followed by 3×8–12 of the other press. Squat is
 * 2×5, 1×5+ on both leg days.
 *
 * The post's own numbers: add 2.5 kg / 5 lb per session to bench, row,
 * overhead press AND squat; 5 kg / 10 lb to the deadlift. Fail the same
 * session three times in a row and take 10% off. Accessories: stay in 8–12;
 * at 3×12 with good form, add weight. The post is written in kilograms first
 * ("a 100kg squat would go back down to 90kg"), so this fixture is in kg.
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, ProgressionRule, SlotSpec } from "@/src/programs/spec/types"

const r = (min: number, max: number) => ({ min, max })
const working = { from: "working" } as const

const UPPER = { kg: 2.5, lb: 5 }
const DEADLIFT = { kg: 5, lb: 10 }
/** The post says "add weight" without an amount; this is the smallest dumbbell/stack jump in kg. */
const ACCESSORY = { kg: 2.5, lb: 5 }

const linear = (inc: { kg: number; lb: number }): ProgressionRule => ({
  kind: "add-on-success",
  inc,
  failsBeforeDrop: 3,
  dropPct: 0.1,
})

/** 4×5 (or 2×5) then one set of at least five, all at the working weight. */
const mainLift = (id: string, lift: LiftRef, stateKey: string, straightSets: number, inc = UPPER): SlotSpec => ({
  id,
  lift,
  stateKey,
  note: "Last set: as many reps as you can with good form. 3–5 minutes rest before it.",
  sets: [
    { id: "work", kind: "working", count: straightSets, reps: 5, load: working },
    { id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: working },
  ],
  progression: linear(inc),
})

const accessory = (
  id: string,
  lift: LiftRef,
  stateKey: string,
  count: number,
  reps: { min: number; max: number },
  extra: Partial<SlotSpec> = {}
): SlotSpec => ({
  id,
  lift,
  stateKey,
  sets: [{ id: "work", kind: "working", count, reps, load: working }],
  progression: { kind: "double", inc: ACCESSORY },
  ...extra,
})

const pullAccessories = (day: string): SlotSpec[] => [
  accessory(`${day}_pulldown`, { name: "Pulldowns, Pull-ups or Chin-ups" }, "pulldown", 3, r(8, 12), {
    choices: [{ lib: "lib_lat_pulldown" }, { lib: "lib_pull_up" }, { lib: "lib_chin_up" }],
  }),
  accessory(`${day}_row2`, { name: "Seated Cable or Chest-Supported Row" }, "row_accessory", 3, r(8, 12), {
    choices: [{ lib: "lib_cable_row" }, { lib: "lib_chest_supported_row" }],
  }),
  accessory(`${day}_face_pull`, { lib: "lib_face_pull" }, "face_pull", 5, r(15, 20)),
  accessory(`${day}_hammer`, { lib: "lib_hammer_curl" }, "hammer_curl", 4, r(8, 12)),
  accessory(`${day}_db_curl`, { lib: "lib_db_curl" }, "db_curl", 4, r(8, 12)),
]

const pushAccessories = (day: string): SlotSpec[] => [
  accessory(`${day}_incline_db`, { lib: "lib_incline_db_press" }, "incline_db", 3, r(8, 12)),
  accessory(`${day}_pushdown`, { lib: "lib_triceps_pushdown" }, "pushdown", 3, r(8, 12), { group: "A" }),
  accessory(`${day}_lateral_a`, { lib: "lib_lateral_raise" }, "lateral_a", 3, r(15, 20), {
    group: "A",
    note: "Superset with the pushdowns: back to back, no rest between.",
  }),
  accessory(`${day}_oh_ext`, { lib: "lib_overhead_triceps" }, "oh_triceps", 3, r(8, 12), { group: "B" }),
  accessory(`${day}_lateral_b`, { lib: "lib_lateral_raise" }, "lateral_b", 3, r(15, 20), {
    group: "B",
    note: "Superset with the overhead extensions: back to back, no rest between.",
  }),
]

const legDay = (day: string): SlotSpec[] => [
  mainLift(`${day}_squat`, { lib: "lib_back_squat", name: "Squat" }, "squat", 2),
  accessory(`${day}_rdl`, { lib: "lib_rdl" }, "rdl", 3, r(8, 12)),
  accessory(`${day}_leg_press`, { lib: "lib_leg_press" }, "leg_press", 3, r(8, 12)),
  accessory(`${day}_leg_curl`, { lib: "lib_leg_curl" }, "leg_curl", 3, r(8, 12)),
  accessory(`${day}_calves`, { lib: "lib_standing_calf_raise", name: "Calf Raise" }, "calf_raise", 5, r(8, 12)),
]

export const metallicadpaPpl: ProgramFixture = {
  id: "metallicadpa-ppl",
  title: "Metallicadpa's PPL (r/Fitness linear progression push/pull/legs)",
  source: {
    url: "https://thefitness.wiki/reddit-archive/a-linear-progression-based-ppl-program-for-beginners/",
    author: "u/Metallicadpa",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Posted free on r/Fitness and archived by the r/Fitness wiki (thefitness.wiki), which lists it among its recommended routines. Read there; reddit.com itself was not fetched. Lift Vault and Boostcamp describe the same program.",
  },
  coverage: "close",
  gaps: [
    "The post says to add weight to accessories at 3×12 but never says how much; 2.5 kg is this file's choice.",
    "The 15–20 rep accessories (face pulls, lateral raises) have no progression rule in the post; they get the same double progression as the 8–12 work.",
    "\"If you can't stay in 8–12, lower the weight\" has no rule in the format; double progression only goes up.",
    "Failures from bad sleep, food or recovery \"don't count\" toward the three-strike reset; the format counts every miss.",
    "The rest day can go after the third or the sixth day (PPLRPPL or PPLPPLR); the format runs the six days in order and leaves rest days to the lifter.",
  ],
  spec: {
    specVersion: 2,
    name: "Metallicadpa's PPL",
    blurb:
      "Six days a week: pull, push, legs, twice. One heavy lift a day with a last set as many reps as you can, then 8–12 rep accessories. Weight goes up every session; three misses in a row take 10% off.",
    credit: "by u/Metallicadpa (r/Fitness)",
    unit: "kg",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "pull_a",
        label: "Pull (deadlift)",
        slots: [
          {
            id: "pull_a_deadlift",
            lift: { lib: "lib_deadlift" },
            stateKey: "deadlift",
            note: "One set of at least five, as many as you can with good form.",
            sets: [{ id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: working }],
            progression: linear(DEADLIFT),
          },
          ...pullAccessories("pull_a"),
        ],
      },
      {
        id: "push_a",
        label: "Push (bench)",
        slots: [
          mainLift("push_a_bench", { lib: "lib_bench_press" }, "bench", 4),
          accessory("push_a_ohp_volume", { lib: "lib_ohp" }, "ohp_volume", 3, r(8, 12)),
          ...pushAccessories("push_a"),
        ],
      },
      { id: "legs_a", label: "Legs", slots: legDay("legs_a") },
      {
        id: "pull_b",
        label: "Pull (row)",
        slots: [mainLift("pull_b_row", { lib: "lib_barbell_row" }, "row", 4), ...pullAccessories("pull_b")],
      },
      {
        id: "push_b",
        label: "Push (overhead press)",
        slots: [
          mainLift("push_b_ohp", { lib: "lib_ohp" }, "ohp", 4),
          accessory("push_b_bench_volume", { lib: "lib_bench_press" }, "bench_volume", 3, r(8, 12)),
          ...pushAccessories("push_b"),
        ],
      },
      { id: "legs_b", label: "Legs", slots: legDay("legs_b") },
    ],
  },
  start: {
    working: {
      deadlift: 140,
      bench: 80,
      squat: 100,
      row: 60,
      ohp: 50,
      // Accessories: plausible starts; no expectation reads them.
      pulldown: 45,
      row_accessory: 50,
      face_pull: 20,
      hammer_curl: 12.5,
      db_curl: 12.5,
      ohp_volume: 35,
      bench_volume: 60,
      incline_db: 22.5,
      pushdown: 25,
      lateral_a: 7.5,
      oh_triceps: 15,
      lateral_b: 7.5,
      rdl: 70,
      leg_press: 120,
      leg_curl: 35,
      calf_raise: 60,
    },
  },
  expect: [
    {
      session: 1,
      day: "pull_a",
      slot: "pull_a_deadlift",
      sets: "1x5+@140",
      source: "Pull day: \"Deadlift 1x5+\"",
    },
    {
      session: 2,
      day: "push_a",
      slot: "push_a_bench",
      sets: "4x5@80, 1x5+@80",
      source: "Push day: \"Bench press 4x5, 1x5+\"",
    },
    {
      session: 3,
      day: "legs_a",
      slot: "legs_a_squat",
      sets: "2x5@100, 1x5+@100",
      source: "Legs day: \"Squat 2x5, 1x5+\"",
    },
    {
      session: 6,
      day: "legs_b",
      slot: "legs_b_squat",
      sets: "2x5@102.5, 1x5+@102.5",
      source: "Progression: \"2.5kg/5lbs for squats\" every session — 100 + 2.5",
    },
    {
      session: 7,
      day: "pull_a",
      slot: "pull_a_deadlift",
      sets: "1x5+@145",
      source: "Progression: \"5kg/10lbs for deadlifts\" — 140 + 5",
    },
    {
      session: 8,
      day: "push_a",
      slot: "push_a_bench",
      sets: "4x5@82.5, 1x5+@82.5",
      source: "Progression: \"2.5kg/5lbs for upper body lifts (bench press, row, overhead press)\" — 80 + 2.5",
    },
  ],
}
