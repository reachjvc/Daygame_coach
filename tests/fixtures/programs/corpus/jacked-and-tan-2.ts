/**
 * Jacked & Tan 2.0 — Cody Lefever's (GZCL) 12-week program, as his own sheet
 * has it ("J&T2.0" tab of the GZCL Free Compendium, read cell by cell on
 * 2026-10-22: training maxes D2:O7, percentage table B9:BH50, the four days
 * C52:BJ104), checked against his post "Jacked & Tan 2.0"
 * (swoleateveryheight.blogspot.com, July 2016).
 *
 * Four days in order. Every T1 starts by working up to the day's rep max
 * (10, 8, 6, 4, 2RM in weeks 1–5; 6, 4, 2, 5, 3RM in weeks 7–11), then drop
 * sets: in block 1 a percentage of the training max (the "estimated daily
 * 2RM"), in block 2 a percentage of the rep max just hit. The last drop set
 * is an optional rep-out. T2a is straight sets off a training max. T2b, T2c
 * and every T3 work up to a rep max (15→6 and 20→10 in block 1) and then do
 * 3 max-rep sets (MRS) at that weight, 1–2 reps in the tank. Week 6 tests
 * T1 1RMs (no T2); week 7 rests T3; week 11 rests T2b/c; week 12 tests.
 *
 * Where the lift itself changes between blocks (day 3's T1 is front squat,
 * then deadlift; day 1's T2a goes 2" deficit → 1" deficit → deadlift), each
 * lift is its own slot, skipped in the weeks it is not done. The sheet's
 * per-lift T2a percentages are used (the post gives one 50–80% ladder for all).
 */

import type { ProgramFixture } from "../fixture"
import type { EffortTarget, LiftRef, SetGroup, SlotSpec, WeekOverride } from "@/src/programs/spec/types"
import { formatWeekSet } from "@/src/programs/spec/weeks"

const RESERVE: EffortTarget = { rir: { min: 1, max: 2 } }
const ALL = Array.from({ length: 12 }, (_, i) => i + 1)
const skipWeeks = (active: number[], groups: string[]): WeekOverride[] => {
  const off = ALL.filter((w) => !active.includes(w))
  return off.length ? groups.map((set) => ({ weeks: formatWeekSet(off), set, skip: true })) : []
}

// ---------------------------------------------------------------------------
// T1: rep max, then drop sets
// ---------------------------------------------------------------------------

/** Weeks 1–5: rep max, drop reps, drop sets (sheet rows 57–58). */
const BLOCK1 = [
  [10, 6, 3],
  [8, 5, 3],
  [6, 4, 3],
  [4, 3, 3],
  [2, 2, 4],
] as const
/** Weeks 7–11: rep max, % of it, drop reps, drop sets (sheet AH57:BE58). */
const BLOCK2 = [
  [6, 0.85, 3, 5],
  [4, 0.85, 2, 5],
  [2, 0.85, 1, 5],
  [5, 0.9, 2, 3],
  [3, 0.9, 1, 3],
] as const

/**
 * A T1 slot. `tmPcts` are its block-1 drop-set percentages of the training
 * max (null: not done in block 1); `block2` says whether it runs weeks 7–12.
 */
function t1(id: string, lift: LiftRef, stateKey: string, tmPcts: readonly number[] | null, block2: boolean): SlotSpec {
  const weeks: WeekOverride[] = []
  const active: number[] = []
  if (tmPcts) {
    BLOCK1.forEach(([rmReps, reps, sets], i) => {
      const w = String(i + 1)
      const load = { from: "max", max: "rm", pct: tmPcts[i] } as const
      weeks.push(
        { weeks: w, set: "rm", reps: rmReps },
        { weeks: w, set: "drop", count: sets - 1, reps, load },
        { weeks: w, set: "last", reps: { atLeast: reps }, load }
      )
    })
    weeks.push({ weeks: "6", set: "rm", reps: 1, note: "Test: work up to a 1RM you could confidently double." }, { weeks: "6", set: "drop", skip: true }, { weeks: "6", set: "last", skip: true })
    active.push(1, 2, 3, 4, 5, 6)
  }
  if (block2) {
    BLOCK2.forEach(([rmReps, pct, reps, sets], i) => {
      const w = String(i + 7)
      const load = { from: "set", group: "rm", pct } as const
      weeks.push(
        { weeks: w, set: "rm", reps: rmReps },
        { weeks: w, set: "drop", count: sets - 1, reps, load },
        { weeks: w, set: "last", reps: { atLeast: reps }, load }
      )
    })
    weeks.push({ weeks: "12", set: "rm", reps: 1, note: "Test: work up to a new 1RM." }, { weeks: "12", set: "drop", skip: true }, { weeks: "12", set: "last", skip: true })
    active.push(7, 8, 9, 10, 11, 12)
  }
  weeks.push(...skipWeeks(active, ["rm", "drop", "last"]))
  const firstLoad = tmPcts ? ({ from: "max", max: "rm", pct: tmPcts[0] } as const) : ({ from: "set", group: "rm", pct: 0.85 } as const)
  return {
    id,
    lift,
    stateKey,
    note: "T1. Rest 3–5 minutes. The rep-out on the last drop set is optional: only with fuel in the tank, and never to failure.",
    sets: [
      { id: "rm", kind: "top", count: 1, reps: tmPcts ? 10 : 6, load: { from: "effort" }, note: "Work up to today's rep max: the heaviest set you can do for these reps." },
      { id: "drop", kind: "backoff", count: 2, reps: tmPcts ? 6 : 3, load: firstLoad },
      { id: "last", kind: "amrap", count: 1, reps: { atLeast: tmPcts ? 6 : 3 }, load: firstLoad, effort: RESERVE },
    ],
    weeks,
    progression: { kind: "by-effort", group: "rm" },
  }
}

// ---------------------------------------------------------------------------
// T2a: straight sets off a training max
// ---------------------------------------------------------------------------

/** Reps × sets by week (the post's T2a table; sheet F60:BE60). */
const T2A_SCHEME: Record<number, [number, number]> = {
  1: [10, 4],
  2: [8, 4],
  3: [6, 4],
  4: [4, 5],
  5: [2, 7],
  7: [6, 5],
  8: [5, 5],
  9: [4, 5],
  10: [3, 6],
  11: [2, 7],
}

/** `pcts` maps each week the lift is done to its % of the `of` training max. */
function t2a(id: string, lift: LiftRef, of: string, pcts: Record<number, number>, extra: { test12?: boolean; note?: string; weekNotes?: WeekOverride[] } = {}): SlotSpec {
  const active = Object.keys(pcts).map(Number)
  const first = active[0]
  const weeks: WeekOverride[] = []
  for (const w of active) {
    if (w === first) continue
    const [reps, sets] = T2A_SCHEME[w]
    weeks.push({ weeks: String(w), set: "work", count: sets, reps, load: { from: "max", max: "rm", pct: pcts[w], of } })
  }
  if (extra.test12) {
    weeks.push({ weeks: "12", set: "work", count: 1, reps: 1, load: { from: "effort" }, note: "Work up to a 1RM." })
    active.push(12)
  }
  weeks.push(...(extra.weekNotes ?? []), ...skipWeeks(active, ["work"]))
  const [reps, sets] = T2A_SCHEME[first]
  return {
    id,
    lift,
    note: extra.note ?? "T2a. Rest 2–3 minutes. If the last set cannot be finished, lower this lift's percentages.",
    sets: [{ id: "work", kind: "working", count: sets, reps, load: { from: "max", max: "rm", pct: pcts[first], of } }],
    weeks,
    progression: { kind: "hold" },
  }
}

const range = (from: number, values: number[]): Record<number, number> => Object.fromEntries(values.map((v, i) => [from + i, v]))

// ---------------------------------------------------------------------------
// T2b, T2c, T3: a rep max, then max-rep sets at that weight
// ---------------------------------------------------------------------------

/** Rep max by week; MRS count by week where it is not 3. */
function rmMrs(id: string, lift: LiftRef, rms: Record<number, number>, tier: "T2" | "T3", mrsCounts: Record<number, number> = {}): SlotSpec {
  const active = Object.keys(rms).map(Number)
  const first = active[0]
  const weeks: WeekOverride[] = []
  for (const w of active) {
    if (w !== first) weeks.push({ weeks: String(w), set: "rm", reps: rms[w] })
    if (mrsCounts[w] === 0) weeks.push({ weeks: String(w), set: "mrs", skip: true })
    else if (mrsCounts[w] != null && w !== first) weeks.push({ weeks: String(w), set: "mrs", count: mrsCounts[w] })
  }
  weeks.push(...skipWeeks(active, ["rm", "mrs"]))
  const mrs: SetGroup = {
    id: "mrs",
    kind: "amrap",
    count: mrsCounts[first] ?? 3,
    reps: { atLeast: 1 },
    load: { from: "set", group: "rm", pct: 1 },
    effort: RESERVE,
    note: "Max-rep sets at the rep-max weight; expect the reps to drop each set.",
  }
  return {
    id,
    lift,
    note: tier === "T2" ? "T2. Rest 2–3 minutes." : "T3. Rest 60–90 seconds.",
    sets: [{ id: "rm", kind: "top", count: 1, reps: rms[first], load: { from: "effort" }, note: "Work up to the heaviest weight you can do for these reps." }, mrs],
    weeks,
    progression: { kind: "by-effort", group: "rm" },
  }
}

/** T2b/T2c: 15, 12, 10, 8, 6RM in weeks 1–5; 12, 10, 8, 6RM in weeks 7–10. */
const T2_B1 = range(1, [15, 12, 10, 8, 6])
const T2_B2 = range(7, [12, 10, 8, 6])
/** T3: 20 … 10RM in weeks 1–6; 18 … 12RM in weeks 8–11. */
const T3_B1 = range(1, [20, 18, 16, 14, 12, 10])
const T3_B2 = range(8, [18, 16, 14, 12])
const T3_B2_TO_10 = range(8, [18, 16, 14])

const free = (name: string): LiftRef => ({ name, loadStyle: "free" })

export const jackedAndTan2: ProgramFixture = {
  id: "jacked-and-tan-2",
  title: "GZCL Jacked & Tan 2.0 (12 weeks)",
  source: {
    url: "https://swoleateveryheight.blogspot.com/2016/07/jacked-tan-20.html",
    author: "Cody Lefever (GZCL)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: the author's own blog post, and the 'J&T2.0' tab of the GZCL Free Compendium he released for free (Google Sheet " +
      "19qc-ACGR3ZfoqptHlSfHmboCKAqYmYw8XW516DX2Fl8, linked from liftvault.com/programs/powerlifting/gzcl-template-spreadsheets/). " +
      "Weights are the sheet's ROUND(TM × % × 0.2) × 5.",
  },
  coverage: "close",
  gaps: [
    "Block 2's T2a percentages are of NEW training maxes taken from week 6's 1RM test ('in Week-7 it will be calculated off the 1RM that was found the week prior'); the format has no 'a test week sets the max' rule, so weeks 7–11 keep the starting maxes.",
    "A max-rep set has no rep floor (as many as you can at the rep-max weight, 1–2 in the tank); the format has no 'max reps' without a floor, so it is written 1+.",
  ],
  spec: {
    specVersion: 2,
    name: "Jacked & Tan 2.0 (GZCL)",
    blurb:
      "Twelve weeks, four days in order. Each main lift works up to the day's rep max and follows with lighter drop sets; second lifts are straight sets, and the accessories hunt rep maxes with extra max-rep sets. Weeks 6 and 12 test your one-rep maxes.",
    credit: "by Cody Lefever (GZCL)",
    unit: "lb",
    calendar: {
      days: "in-order",
      weekCounting: "completed",
      lengthWeeks: 12,
      atEnd: "finish",
      phases: [
        { label: "Mesocycle A", weeks: "1-3" },
        { label: "Mesocycle B", weeks: "4-6" },
        { label: "Mesocycle C", weeks: "7-9" },
        { label: "Mesocycle D", weeks: "10-12" },
      ],
      deloadWeeks: "6",
      testWeeks: "6,12",
    },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    // The sheet's "Training Max": an estimated daily 2RM.
    maxes: [
      { lift: "squat", kind: "rm", reps: 2 },
      { lift: "bench", kind: "rm", reps: 2 },
      { lift: "deadlift", kind: "rm", reps: 2 },
      { lift: "ohp", kind: "rm", reps: 2 },
      { lift: "front_squat", kind: "rm", reps: 2 },
    ],
    days: [
      {
        id: "d1",
        label: "Day One: Squat",
        slots: [
          t1("d1_squat", { lib: "lib_back_squat" }, "squat", [0.7, 0.75, 0.8, 0.825, 0.85], true),
          t2a("d1_deficit_dl", { lib: "lib_deficit_deadlift" }, "deadlift", { ...range(1, [0.5, 0.6, 0.7, 0.75, 0.8]), ...range(7, [0.7, 0.75, 0.8]) }, {
            weekNotes: [{ weeks: "7-9", set: "work", note: "1-inch deficit from week 7." }],
            note: "T2a, 2-inch deficit in weeks 1–5, 1-inch in weeks 7–9. Rest 2–3 minutes.",
          }),
          t2a("d1_deadlift_t2", { lib: "lib_deadlift" }, "deadlift", range(10, [0.825, 0.85])),
          rmMrs("d1_single_leg_press", { lib: "lib_leg_press_single" }, { ...T2_B1, ...T2_B2 }, "T2"),
          rmMrs("d1_chest_supported_row", { lib: "lib_chest_supported_row" }, { ...T2_B1, ...T2_B2 }, "T2"),
          rmMrs("d1_vgrip_cable_row", { lib: "lib_cable_row", name: "V-Grip Cable Row" }, { ...T3_B1, ...T3_B2 }, "T3"),
          rmMrs("d1_leg_curl", { lib: "lib_leg_curl" }, { ...T3_B1, ...T3_B2 }, "T3"),
          rmMrs("d1_leg_extension", { lib: "lib_leg_extension" }, { ...T3_B1, ...T3_B2 }, "T3"),
          rmMrs("d1_hammer_curl", { lib: "lib_hammer_curl" }, T3_B1, "T3"),
        ],
      },
      {
        id: "d2",
        label: "Day Two: Bench",
        slots: [
          t1("d2_bench", { lib: "lib_bench_press" }, "bench", [0.65, 0.7, 0.75, 0.775, 0.8], true),
          t2a("d2_cgbp", { lib: "lib_close_grip_bench" }, "bench", { ...range(1, [0.5, 0.55, 0.6, 0.625, 0.65]), ...range(7, [0.7, 0.75, 0.8, 0.825, 0.85]) }, { test12: true }),
          rmMrs("d2_incline", { lib: "lib_incline_bench" }, { ...T2_B1, ...T2_B2 }, "T2"),
          rmMrs("d2_db_shoulder_press", { lib: "lib_db_shoulder_press" }, { ...T2_B1, ...T2_B2 }, "T2"),
          rmMrs("d2_lateral_raise", { lib: "lib_machine_lateral_raise" }, { ...T3_B1, ...T3_B2 }, "T3"),
          rmMrs("d2_rear_delt_fly", { lib: "lib_rear_delt_fly" }, { ...T3_B1, ...T3_B2 }, "T3"),
          rmMrs("d2_pec_fly", free("Pec Fly"), { ...T3_B1, ...T3_B2 }, "T3"),
          rmMrs("d2_pushdown", { lib: "lib_triceps_pushdown" }, T3_B1, "T3"),
        ],
      },
      {
        id: "d3",
        label: "Day Three: Front squat / Deadlift",
        slots: [
          t1("d3_front_squat", { lib: "lib_front_squat" }, "front_squat", [0.7, 0.75, 0.8, 0.825, 0.85], false),
          t1("d3_deadlift", { lib: "lib_deadlift" }, "deadlift", null, true),
          t2a("d3_back_squat_t2", { lib: "lib_back_squat" }, "squat", range(1, [0.5, 0.6, 0.7, 0.75, 0.8])),
          t2a("d3_front_squat_t2", { lib: "lib_front_squat" }, "front_squat", range(7, [0.7, 0.75, 0.8, 0.825, 0.85]), { test12: true }),
          rmMrs("d3_back_step_lunge", { lib: "lib_reverse_lunge", name: "Back Step Lunge" }, T2_B1, "T2"),
          rmMrs("d3_sldl", { lib: "lib_stiff_leg_deadlift" }, T2_B2, "T2"),
          rmMrs("d3_vgrip_pulldown", { lib: "lib_close_grip_pulldown", name: "V-Grip Lat Pulldown" }, T2_B1, "T2"),
          rmMrs("d3_lat_pulldown", { lib: "lib_lat_pulldown" }, T2_B2, "T2"),
          rmMrs("d3_leg_extension", { lib: "lib_leg_extension" }, T3_B1, "T3"),
          rmMrs("d3_leg_curl", { lib: "lib_leg_curl" }, T3_B1, "T3"),
          rmMrs("d3_wide_pulldown", { lib: "lib_lat_pulldown", name: "Wide-Grip Lat Pulldown" }, T3_B1, "T3"),
          rmMrs("d3_wide_cable_row", free("Wide-Grip Cable Row"), T3_B2, "T3"),
          rmMrs("d3_hammer_curl", { lib: "lib_hammer_curl" }, T3_B2, "T3"),
          rmMrs("d3_ez_curl", { lib: "lib_ez_bar_curl" }, { ...T3_B1, ...T3_B2 }, "T3"),
        ],
      },
      {
        id: "d4",
        label: "Day Four: Press",
        slots: [
          t1("d4_ohp", { lib: "lib_ohp", name: "Military Press" }, "ohp", [0.6, 0.65, 0.7, 0.775, 0.8], true),
          // Sheet D96:BJ98: rep max then 4 MRS (weeks 9 and 11: 1; week 10: 3); 1RM in weeks 6 and 12.
          rmMrs(
            "d4_slingshot",
            { name: "Slingshot Bench Press", loadStyle: "barbell" },
            { ...range(1, [10, 8, 6, 4, 2, 1]), ...range(7, [7, 4, 2, 5, 3, 1]) },
            "T2",
            { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 0, 7: 4, 8: 4, 9: 1, 10: 3, 11: 1, 12: 0 }
          ),
          t2a("d4_legs_up_bench", { name: "Legs-Up Bench Press", loadStyle: "barbell" }, "bench", { ...range(1, [0.45, 0.5, 0.55, 0.575, 0.6]), ...range(7, [0.65, 0.7, 0.75, 0.775, 0.8]) }),
          rmMrs("d4_push_press", { lib: "lib_push_press" }, T2_B1, "T2"),
          rmMrs("d4_db_bench", { lib: "lib_db_bench" }, T3_B2_TO_10, "T3"),
          rmMrs("d4_oh_triceps", { lib: "lib_overhead_triceps", name: "Cable Overhead Triceps Extension" }, { ...T3_B1, ...T3_B2_TO_10 }, "T3"),
          rmMrs("d4_lateral_raise", { lib: "lib_machine_lateral_raise" }, T3_B1, "T3"),
          rmMrs("d4_rear_delt_fly", { lib: "lib_rear_delt_fly" }, { ...T3_B1, ...T3_B2 }, "T3"),
          rmMrs("d4_pec_fly", free("Pec Fly"), { ...T3_B1, ...T3_B2 }, "T3"),
        ],
      },
    ],
  },
  // Training maxes (estimated daily 2RMs), chosen so every percentage lands on 5 lb.
  start: { maxes: { squat: 400, bench: 200, deadlift: 600, ohp: 200, front_squat: 200 } },
  picks: { d1_squat: 400, d2_incline: 135, d3_deadlift: 500 },
  expect: [
    {
      week: 1,
      day: "d1",
      slot: "d1_squat",
      sets: "1x10@?, 2x6@280, 1x6+@280 rir1-2",
      source: "J&T2.0!D57:G58 — Find 10RM; RM: ROUND(TM × 0.7 × 0.2) × 5 (E15 = 0.7), 6 reps × 3+ sets; TM 400",
    },
    {
      week: 5,
      day: "d1",
      slot: "d1_squat",
      sets: "1x2@?, 3x2@340, 1x2+@340 rir1-2",
      source: "J&T2.0!X57:AA58 — Find 2RM; TM × 0.85 (Y15), 2 reps × 4+ sets",
    },
    {
      week: 7,
      day: "d1",
      slot: "d1_squat",
      sets: "1x6@?, 4x3@340, 1x3+@340 rir1-2",
      source: "J&T2.0!AH57:AK58 — Find 6RM (picked: 400), then 0.85 of it, 3 reps × 5+ sets",
    },
    {
      week: 1,
      day: "d1",
      slot: "d1_deficit_dl",
      sets: "4x10@300",
      source: "J&T2.0!D60:G60 — 2\" Deficit Deadlift ROUND(DL TM × 0.5 × 0.2) × 5 (E37), 10 reps × 4 sets; TM 600",
    },
    {
      week: 4,
      day: "d1",
      slot: "d1_deficit_dl",
      sets: "5x4@450",
      source: "J&T2.0!S60:V60 — DL TM × 0.75 (T37), 4 reps × 5 sets",
    },
    {
      week: 3,
      day: "d4",
      slot: "d4_ohp",
      sets: "1x6@?, 2x4@140, 1x4+@140 rir1-2",
      source: "J&T2.0!N93:Q94 — Find 6RM; OHP TM × 0.7 (O24), 4 reps × 3+ sets; TM 200",
    },
    {
      week: 1,
      day: "d2",
      slot: "d2_incline",
      sets: "1x15@?, 3x1+@135 rir1-2",
      source: "J&T2.0!D73:G73 — Incline Bench '?' 15 × 3MRS (picked 15RM: 135); E139:X141 — work up to the heaviest 15, then 3 max-rep sets at it",
    },
    {
      week: 8,
      day: "d3",
      slot: "d3_deadlift",
      sets: "1x4@?, 4x2@425, 1x2+@425 rir1-2",
      source: "J&T2.0!AM81:AP82 — Deadlift: Find 4RM (picked: 500), then 0.85 of it, 2 reps × 5+ sets",
    },
  ],
}
