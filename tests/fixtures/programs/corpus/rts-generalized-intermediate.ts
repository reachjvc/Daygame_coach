/**
 * The RTS Generalized Intermediate Program — Mike Tuchscherer's free 9-week
 * template, as his own article writes it (Reactive Training Systems,
 * December 1, 2015; read on 2026-10-22).
 *
 * Every lift is "Work up to xN @RPE", then more sets by a fatigue percent:
 *   · Load Drop — drop the bar by the percent and do sets of the same reps
 *     until one is as hard as the top set ("until your reps and RPE matches
 *     that of your initial", Fatigue Percents Revisited, 2016);
 *   · Repeat — the top set's weight and reps again until the RPE has climbed
 *     by that much fatigue.
 * Week 1 has no drop sets. Weeks 2, 4, 5, 7 and 8 are 4–6% fatigue, weeks 3
 * and 6 are 6–9%. Weeks 1–4 train Monday, Tuesday, Thursday, Friday; weeks
 * 5–8 Monday, Wednesday, Friday; week 9 tapers: a single at 92% of the
 * previous 1RM on Monday, warm-ups only on Wednesday, a practice meet on
 * Friday/Saturday.
 *
 * So a load drop of 4–6% is a back-off at 94–96% of the top set done that
 * day, and of 6–9% at 91–94%; a repeat is a back-off at 100% of it. Neither
 * says how many sets — they continue until the RPE says stop — so this file
 * writes the count as 1–10 with the stop in the effort target (load drop: the
 * last set at the top set's RPE) or the note (repeat). The ten is this file's.
 *
 * Exercises rotate every week (weeks 1/3, 2/4, 5/7 and 6/8 share a day plan),
 * so each lift is a slot that is skipped in the weeks it is not done. The
 * same lift on two days shares its numbers through `stateKey`.
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, LoadSpec, SetGroup, SlotSpec, WeekOverride } from "@/src/programs/spec/types"
import { formatWeekSet } from "@/src/programs/spec/weeks"

const WEEKS = 9
const r = (min: number, max: number) => ({ min, max })

/** "Load Drop", "Repeat", or week 1's "No Drop Sets". */
type Method = "drop" | "repeat" | "none"
/** One week's protocol: work up to `reps` @ `rpe`, then `method`. */
type Rx = [reps: number, rpe: number, method: Method]

/** The fatigue percent each week asks for. */
const FATIGUE: Record<number, { min: number; max: number }> = {
  2: r(0.04, 0.06),
  3: r(0.06, 0.09),
  4: r(0.04, 0.06),
  5: r(0.04, 0.06),
  6: r(0.06, 0.09),
  7: r(0.04, 0.06),
  8: r(0.04, 0.06),
}
/** 4–6% fatigue as a share of the top set: 94–96%; 6–9%: 91–94%. */
const DROP_PCT: Record<string, { min: number; max: number }> = { "0.04": r(0.94, 0.96), "0.06": r(0.91, 0.94) }
const pctText = (w: number) => `${Math.round(FATIGUE[w].min * 100)}–${Math.round(FATIGUE[w].max * 100)}%`

const backLoad = (week: number, method: Method): LoadSpec =>
  method === "repeat" ? { from: "set", group: "top", pct: 1 } : { from: "set", group: "top", pct: DROP_PCT[String(FATIGUE[week].min)] }
const backNote = (week: number, method: Method) =>
  method === "repeat"
    ? `Repeat: the top set's weight and reps again until the RPE has climbed by ${pctText(week)} fatigue.`
    : `Load drop: ${pctText(week)} lighter, sets of the same reps until one is as hard as the top set.`
const backEffort = (rx: Rx) => (rx[2] === "drop" ? { effort: { rpe: rx[1], lastSetOnly: true } } : {})

/** Week changes with identical content merged into one week set, in week order. */
function merge(changes: { week: number; change: Omit<WeekOverride, "weeks"> }[]): WeekOverride[] {
  const byContent = new Map<string, { weeks: number[]; change: Omit<WeekOverride, "weeks"> }>()
  for (const { week, change } of changes) {
    const key = JSON.stringify(change)
    const hit = byContent.get(key)
    if (hit) hit.weeks.push(week)
    else byContent.set(key, { weeks: [week], change })
  }
  return [...byContent.values()]
    .sort((a, b) => a.weeks[0] - b.weeks[0])
    .map(({ weeks, change }) => ({ weeks: formatWeekSet(weeks), ...change }))
}

/**
 * One lift worked up to a top set by feel, then a load drop or repeats from
 * it, in the weeks `table` names; skipped in every other week.
 */
function rts(id: string, lift: LiftRef, table: Record<number, Rx>, extra: Partial<SlotSpec> = {}): SlotSpec {
  const on = Object.keys(table).map(Number).sort((a, b) => a - b)
  const first = table[on[0]]
  // The back-off's resting shape: a repeat week when there is one (no effort
  // target, which a week change cannot take away), else the first load drop.
  const backWeek = on.find((w) => table[w][2] === "repeat") ?? on.find((w) => table[w][2] === "drop")!
  const back = table[backWeek]
  const top: SetGroup = { id: "top", kind: "top", count: 1, reps: first[0], load: { from: "effort" }, effort: { rpe: first[1] } }
  const backoff: SetGroup = {
    id: "back",
    kind: "backoff",
    count: r(1, 10),
    reps: back[0],
    load: backLoad(backWeek, back[2]),
    ...backEffort(back),
    note: backNote(backWeek, back[2]),
  }

  const changes: { week: number; change: Omit<WeekOverride, "weeks"> }[] = []
  for (let w = 1; w <= WEEKS; w++) {
    const rx = table[w]
    if (!rx) {
      changes.push({ week: w, change: { set: "top", skip: true } }, { week: w, change: { set: "back", skip: true } })
      continue
    }
    const [reps, rpe, method] = rx
    if (reps !== first[0] || rpe !== first[1]) {
      changes.push({ week: w, change: { set: "top", ...(reps !== first[0] ? { reps } : {}), ...(rpe !== first[1] ? { effort: { rpe } } : {}) } })
    }
    if (method === "none") {
      changes.push({ week: w, change: { set: "back", skip: true } })
      continue
    }
    const load = backLoad(w, method)
    const note = backNote(w, method)
    const change: Omit<WeekOverride, "weeks"> = {
      set: "back",
      ...(reps !== back[0] ? { reps } : {}),
      ...(JSON.stringify(load) !== JSON.stringify(backoff.load) ? { load } : {}),
      ...(method === "drop" && (back[2] !== "drop" || rpe !== back[1]) ? { effort: { rpe, lastSetOnly: true } } : {}),
      ...(note !== backoff.note ? { note } : {}),
    }
    if (Object.keys(change).length > 1) changes.push({ week: w, change })
  }
  return { id, lift, sets: [top, backoff], weeks: merge(changes), progression: { kind: "by-effort", group: "top" }, ...extra }
}

/** Week 9 only: one set from the previous 1RM (Monday's 92% single, Wednesday's warm-ups to 80%). */
function taper(id: string, lift: LiftRef, stateKey: string, kind: "top" | "warmup", pct: number, note: string): SlotSpec {
  return {
    id,
    lift,
    stateKey,
    sets: [{ id: "single", kind, count: 1, reps: 1, load: { from: "max", max: "1rm", pct }, note }],
    weeks: [{ weeks: "1-8", set: "single", skip: true }],
    progression: { kind: "hold" },
  }
}

/** Week 9's practice meet: a new 1RM, by feel. */
function test(id: string, lift: LiftRef, stateKey: string): SlotSpec {
  return {
    id,
    lift,
    stateKey,
    sets: [{ id: "max", kind: "top", count: 1, reps: 1, load: { from: "effort" }, effort: { rpe: 10 }, note: "Practice competition: test your 1RM." }],
    weeks: [{ weeks: "1-8", set: "max", skip: true }],
    progression: { kind: "by-effort", group: "max" },
  }
}

const D: Method = "drop"
const R: Method = "repeat"
const N: Method = "none"

const SQUAT: LiftRef = { lib: "lib_back_squat", name: "Squat w/ belt" }
const SQUAT_WRAPS: LiftRef = { lib: "lib_back_squat", name: "Squat w/ belt, wraps" }
const BENCH: LiftRef = { lib: "lib_bench_press", name: "Competition Raw Bench" }
const BENCH_TNG: LiftRef = { lib: "lib_bench_press", name: "Bench (touch and go)" }
const DEADLIFT: LiftRef = { lib: "lib_deadlift", name: "Deadlift w/ belt" }
const CG_BENCH: LiftRef = { lib: "lib_close_grip_bench", name: "Close Grip Bench" }
const PUSH_PRESS: LiftRef = { lib: "lib_push_press" }
const FRONT_SQUAT: LiftRef = { lib: "lib_front_squat" }
const PAUSE_SQUAT: LiftRef = { lib: "lib_pause_squat", name: "2ct Pause Squat" }
const PAUSE2_BENCH: LiftRef = { lib: "lib_pause_bench", name: "2ct Pause Bench" }
const SG_SLDL: LiftRef = { name: "Snatch Grip SLDL", loadStyle: "barbell" }

export const rtsGeneralizedIntermediate: ProgramFixture = {
  id: "rts-generalized-intermediate",
  title: "RTS Generalized Intermediate Program",
  source: {
    url: "https://store.reactivetrainingsystems.com/blogs/program-articles/the-rts-generalized-intermediate-program-by-mike-tuchscherer",
    author: "Mike Tuchscherer (Reactive Training Systems)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "A public article on RTS's own site, no paywall, written 'for people to use and use as inspiration'. Load drop and repeats as defined in https://store.reactivetrainingsystems.com/blogs/advanced-concepts/fatigue-percents-revisited. Lift Vault's rebuilt sheet (docs.google.com/spreadsheets/d/16EJrBYMCe9T5S9__nb18iFTUfuJ_tyL3IKCBdkUMlYs) reorders the weeks and days; this file follows the author's article instead. The article gives no weights, so the expected weights are this file's picks run through the article's percents.",
  },
  coverage: "close",
  gaps: [
    "Load-drop and repeat sets go on until the RPE says stop, with no set count; a set group needs a count, so this file writes 1–10 sets (the ten is invented) with the last load-drop set at the top set's RPE.",
    "Repeats stop when the estimated max has fallen by the fatigue percent (the RPE climbing at the same weight); the format has no 'stop at this much fatigue' target, so the 4–6% / 6–9% lives in the note.",
    "Week 9 Wednesday is 'go through your warm up routine (not heavier than 80%)', with no sets or reps; written as one single at 80% of the 1RM with a note.",
    "Week 9's practice meet is 'Friday / Saturday'; a weekday program pins it to Friday.",
  ],
  spec: {
    specVersion: 2,
    name: "RTS Generalized Intermediate",
    blurb:
      "Nine weeks for an intermediate powerlifter. Each lift: work up to a top set at an RPE, then extra sets by a fatigue percent — lighter sets of the same reps until one is as hard as the top set (load drop), or the same weight again until the RPE climbs (repeat). Four days a week for weeks 1–4, three for weeks 5–8, then a taper into a practice meet.",
    credit: "by Mike Tuchscherer, Reactive Training Systems",
    unit: "lb",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: 9,
      atEnd: "finish",
      phases: [
        { label: "Four days a week", weeks: "1-4" },
        { label: "Three days a week", weeks: "5-8" },
        { label: "Taper and test", weeks: "9" },
      ],
      testWeeks: "9",
    },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    maxes: [
      { lift: "squat", kind: "1rm" },
      { lift: "bench", kind: "1rm" },
      { lift: "deadlift", kind: "1rm" },
    ],
    days: [
      {
        id: "mon",
        label: "Monday",
        weekday: 1,
        slots: [
          rts("mon_squat", SQUAT, { 1: [4, 9, N], 2: [5, 9, D], 3: [3, 9, D], 4: [4, 9, D], 5: [3, 9, D], 6: [4, 9, D], 7: [2, 9, D], 8: [3, 9, D] }, { stateKey: "squat" }),
          rts("mon_bench", BENCH, { 1: [4, 9, N], 2: [5, 9, D], 3: [3, 9, D], 4: [4, 9, D] }, { stateKey: "bench" }),
          rts("mon_bench_tng", BENCH_TNG, { 5: [7, 10, D], 6: [3, 9, D], 7: [6, 10, D], 8: [2, 9, D] }, { stateKey: "bench_tng" }),
          rts("mon_pause3_bench", { lib: "lib_pause_bench", name: "3ct Pause Bench" }, { 1: [5, 9, N], 3: [5, 9, D] }),
          rts("mon_pause2_bench", PAUSE2_BENCH, { 2: [4, 9, D], 4: [3, 9, D] }, { stateKey: "pause2_bench" }),
          rts("mon_cgbench", CG_BENCH, { 5: [5, 8, R], 7: [4, 8, R] }, { stateKey: "cg_bench" }),
          rts("mon_cg_floor", { name: "Close Grip Floor Press", loadStyle: "barbell" }, { 6: [6, 8, R], 8: [5, 8, R] }),
          taper("mon_w9_squat", SQUAT, "squat", "top", 0.92, "Work up to 92% of your previous 1RM for one single."),
          taper("mon_w9_bench", BENCH, "bench", "top", 0.92, "Work up to 92% of your previous 1RM for one single."),
          taper("mon_w9_deadlift", DEADLIFT, "deadlift", "top", 0.92, "Work up to 92% of your previous 1RM for one single."),
        ],
      },
      {
        id: "tue",
        label: "Tuesday",
        weekday: 2,
        slots: [
          rts("tue_deadlift", DEADLIFT, { 1: [4, 9, N], 2: [5, 9, D], 3: [3, 9, D], 4: [4, 9, D] }, { stateKey: "deadlift" }),
          rts("tue_floor_press", { lib: "lib_floor_press" }, { 1: [4, 9, N], 3: [4, 9, D] }),
          rts("tue_pin_press_mid", { name: "Pin Press (mid range)", loadStyle: "barbell" }, { 2: [3, 9, D], 4: [2, 9, D] }),
          rts("tue_front_squat", FRONT_SQUAT, { 1: [6, 9, N], 3: [5, 9, D] }, { stateKey: "front_squat" }),
          rts("tue_tempo_squat", { name: "303 Tempo Squat", loadStyle: "barbell" }, { 2: [7, 9, D], 4: [6, 9, D] }),
        ],
      },
      {
        id: "wed",
        label: "Wednesday",
        weekday: 3,
        slots: [
          rts("wed_bench", BENCH, { 5: [3, 9, D], 6: [4, 9, D], 7: [2, 9, D], 8: [3, 9, D] }, { stateKey: "bench" }),
          rts("wed_deadlift", DEADLIFT, { 5: [3, 9, D], 6: [4, 9, D], 7: [2, 9, D], 8: [3, 9, D] }, { stateKey: "deadlift" }),
          rts("wed_push_press", PUSH_PRESS, { 5: [5, 8, R], 7: [4, 8, R] }, { stateKey: "push_press" }),
          rts("wed_military", { lib: "lib_ohp", name: "Military Press" }, { 6: [6, 8, R], 8: [5, 8, R] }),
          rts("wed_front_squat", FRONT_SQUAT, { 5: [5, 8, R], 7: [4, 8, R] }, { stateKey: "front_squat" }),
          rts("wed_pause_squat", PAUSE_SQUAT, { 6: [6, 8, R], 8: [5, 8, R] }, { stateKey: "pause_squat" }),
          taper("wed_w9_squat", SQUAT, "squat", "warmup", 0.8, "Go through your warm-up routine; nothing heavier than 80% of your previous 1RM."),
          taper("wed_w9_bench", BENCH, "bench", "warmup", 0.8, "Go through your warm-up routine; nothing heavier than 80% of your previous 1RM."),
          taper("wed_w9_deadlift", DEADLIFT, "deadlift", "warmup", 0.8, "Go through your warm-up routine; nothing heavier than 80% of your previous 1RM."),
        ],
      },
      {
        id: "thu",
        label: "Thursday",
        weekday: 4,
        slots: [
          rts("thu_pin_squat", { name: "Pin Squat", loadStyle: "barbell" }, { 1: [5, 9, N], 3: [5, 9, D] }),
          rts("thu_squat_wraps", SQUAT_WRAPS, { 2: [4, 9, D], 4: [3, 9, D] }, { stateKey: "squat_wraps" }),
          rts("thu_bench_tng", BENCH_TNG, { 1: [6, 10, N], 2: [5, 9, D], 3: [8, 10, D], 4: [4, 9, D] }, { stateKey: "bench_tng" }),
          rts("thu_push_press", PUSH_PRESS, { 1: [6, 9, N], 3: [5, 9, D] }, { stateKey: "push_press" }),
          rts("thu_cg_incline", { name: "Close Grip Incline", loadStyle: "barbell" }, { 2: [7, 9, D], 4: [6, 9, D] }),
        ],
      },
      {
        id: "fri",
        label: "Friday",
        weekday: 5,
        slots: [
          rts("fri_deficit_dl", { lib: "lib_deficit_deadlift", name: '2" Deficit Deadlift' }, { 1: [5, 9, N], 3: [5, 9, D] }),
          rts("fri_rack_pull", { lib: "lib_rack_pull", name: "Rack Pull (below knee)" }, { 2: [4, 9, D], 4: [3, 9, D] }),
          rts("fri_pause_squat", PAUSE_SQUAT, { 5: [4, 9, D], 7: [3, 9, D] }, { stateKey: "pause_squat" }),
          rts("fri_squat_wraps", SQUAT_WRAPS, { 6: [2, 9, D], 8: [2, 9, D] }, { stateKey: "squat_wraps" }),
          rts("fri_cgbench", CG_BENCH, { 1: [6, 9, N], 3: [5, 9, D] }, { stateKey: "cg_bench" }),
          rts("fri_jm_press", { lib: "lib_jm_press", name: "J.M. Press" }, { 2: [7, 9, D], 4: [6, 9, D] }),
          rts("fri_pin_press_chest", { name: "Pin Press (chest level)", loadStyle: "barbell" }, { 5: [4, 9, D], 7: [3, 9, D] }),
          rts("fri_pause2_bench", PAUSE2_BENCH, { 6: [2, 9, D], 8: [2, 9, D] }, { stateKey: "pause2_bench" }),
          rts("fri_sg_sldl", SG_SLDL, { 1: [6, 9, N], 3: [5, 9, D], 5: [5, 8, R], 7: [4, 8, R] }),
          rts("fri_lever_rows", { name: "Lever Rows", loadStyle: "free" }, { 2: [7, 9, D], 4: [6, 9, D] }),
          rts("fri_pendlay", { lib: "lib_pendlay_row", name: "Pendlay Rows" }, { 6: [6, 8, R], 8: [5, 8, R] }),
          test("fri_test_squat", SQUAT, "squat"),
          test("fri_test_bench", BENCH, "bench"),
          test("fri_test_deadlift", DEADLIFT, "deadlift"),
        ],
      },
    ],
  },
  start: { maxes: { squat: 500, bench: 250, deadlift: 500 } },
  picks: { mon_squat: 500, wed_deadlift: 500, mon_cgbench: 200 },
  expect: [
    {
      week: 1,
      day: "mon",
      slot: "mon_squat",
      sets: "1x4@? rpe9",
      source: "Week 1, Monday: 'Squat w/belt — Work up to x4 @9 (Load Drop) No Drop Sets'",
    },
    {
      week: 1,
      day: "thu",
      slot: "thu_bench_tng",
      sets: "1x6@? rpe10",
      source: "Week 1, Thursday: 'Bench (touch and go) — Work up to x6 @10 (Load Drop) No Drop Sets'",
    },
    {
      week: 2,
      day: "mon",
      slot: "mon_squat",
      sets: "1x5@? rpe9, 1-10x5@470-480 rpe9(last)",
      source:
        "Week 2, Monday: 'Squat w/belt — Work up to x5 @9 (Load Drop) 4-6% Fatigue'; top set picked at 500 → 4–6% lighter = 470–480, sets until one is @9 again (the 1–10 count is this file's)",
    },
    {
      week: 3,
      day: "mon",
      slot: "mon_squat",
      sets: "1x3@? rpe9, 1-10x3@455-470 rpe9(last)",
      source: "Week 3, Monday: 'Squat w/belt — Work up to x3 @9 (Load Drop) 6-9% Fatigue'; 500 × 0.91…0.94 = 455–470",
    },
    {
      week: 5,
      day: "mon",
      slot: "mon_cgbench",
      sets: "1x5@? rpe8, 1-10x5@200",
      source: "Week 5, Monday: 'Close Grip Bench — Work up to x5 @8 (Repeat) 4-6% Fatigue'; repeats at the top set's 200",
    },
    {
      week: 6,
      day: "wed",
      slot: "wed_deadlift",
      sets: "1x4@? rpe9, 1-10x4@455-470 rpe9(last)",
      source: "Week 6, Wednesday: 'Deadlift w/belt — Work up to x4 @9 (Load Drop) 6-9% Fatigue'; 500 × 0.91…0.94 = 455–470",
    },
    {
      week: 9,
      day: "mon",
      slot: "mon_w9_squat",
      sets: "1x1@460",
      source: "Week 9, Monday: 'Squat, Bench, and Deadlift — Work up to 92% of previous 1RM for one set of one'; 500 × 0.92 = 460",
    },
    {
      week: 9,
      day: "mon",
      slot: "mon_w9_bench",
      sets: "1x1@230",
      source: "Week 9, Monday: 92% of the previous 1RM; 250 × 0.92 = 230",
    },
    {
      week: 9,
      day: "fri",
      slot: "fri_test_squat",
      sets: "1x1@? rpe10",
      source: "Week 9, Friday / Saturday: 'Practice competition — Test 1RM in Squat, Bench, and Deadlift'",
    },
  ],
}
