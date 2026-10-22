/**
 * Sheiko #29 — the first four-week block of Boris Sheiko's #29–#32 cycle, as
 * the free training-collection sheet on Lift Vault writes it (ChaseT's
 * translation, 2008; read cell by cell on 2026-10-22: Max!A3:B6, "#29"!A1:L204).
 *
 * Three days a week (the sheet's "1 day (Monday)", "3 day (Wednesday)",
 * "5 day (Friday)"). Every competition lift is a ramp of percentages of its
 * 1RM, set by set, and a lift often comes back later the same day — bench
 * twice on week 1 Monday and week 4 Wednesday, squat twice on week 2 Friday
 * and week 3 Monday — so each appearance is its own slot sharing one max.
 * Front squats and the deadlift variations are percentages of the squat and
 * deadlift maxes, as the sheet's formulas (Max!$B$4, Max!$B$6) have it.
 * Accessories are sets × reps with the weight your own.
 *
 * The sheet has no unit and does not round (F = max × %). This file writes it
 * in kg, Sheiko's own unit, rounded to 2.5 kg; the maxes below (200 / 150 /
 * 250) make every percentage land on a 2.5 kg step, so nothing is rounded.
 * #30–#32 are later blocks with their own tabs and are not encoded here.
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, LoadSpec, SetGroup, SlotSpec, WeekOverride } from "@/src/programs/spec/types"
import { formatWeekSet } from "@/src/programs/spec/weeks"

const LENGTH = 4
type Plan = Record<number, SetGroup[]>
const FIELDS = ["count", "reps", "options", "load", "effort", "perSet", "restSec", "note"] as const

/**
 * One lift written week by week — `plan[w]` is that week's set groups, absent
 * when the lift is not done that week — as the format writes it: the groups as
 * first done, and for every other week only what changes.
 */
function weekByWeek(length: number, plan: Plan): Pick<SlotSpec, "sets" | "weeks"> {
  const base = new Map<string, SetGroup>()
  for (let w = 1; w <= length; w++) for (const g of plan[w] ?? []) if (!base.has(g.id)) base.set(g.id, g)
  const changes: { weeks: number[]; change: Omit<WeekOverride, "weeks"> }[] = []
  const seen = new Map<string, number[]>()
  for (let w = 1; w <= length; w++) {
    for (const [id, b] of base) {
      const g = (plan[w] ?? []).find((x) => x.id === id)
      let change: Omit<WeekOverride, "weeks"> | null = null
      if (!g) change = { set: id, skip: true }
      else {
        const diff: Record<string, unknown> = {}
        for (const f of FIELDS) {
          if (JSON.stringify(g[f]) === JSON.stringify(b[f])) continue
          if (g[f] === undefined) throw new Error(`"${id}" in week ${w}: a week change cannot take "${f}" away`)
          diff[f] = g[f]
        }
        if (Object.keys(diff).length) change = { set: id, ...diff } as Omit<WeekOverride, "weeks">
      }
      if (!change) continue
      const key = JSON.stringify(change)
      const weeks = seen.get(key)
      if (weeks) weeks.push(w)
      else {
        const fresh = [w]
        seen.set(key, fresh)
        changes.push({ weeks: fresh, change })
      }
    }
  }
  const weeks = changes.map(({ weeks, change }) => ({ weeks: formatWeekSet(weeks), ...change }))
  return { sets: [...base.values()], ...(weeks.length ? { weeks } : {}) }
}

const HOLD = { kind: "hold" } as const
const CHOOSE: LoadSpec = { from: "choose" }
const BODYWEIGHT: LoadSpec = { from: "bodyweight" }

/** A row of the sheet: % of the max, reps, sets. */
type Row = [number, number, number]

/** A ramp, set by set, as % of `of`'s 1RM (the lift's own when absent). */
const ramp = (rows: Row[], of?: string): SetGroup => {
  const perSet = rows.flatMap(([pct, reps, sets]) => Array.from({ length: sets }, () => ({ reps, pct })))
  const load: LoadSpec = { from: "max", max: "1rm", pct: rows[0][0], ...(of ? { of } : {}) }
  return { id: "work", kind: "working", count: perSet.length, reps: rows[0][1], load, perSet }
}
/** "reps × sets" with no percentage. */
const plain = (reps: number, sets: number, load: LoadSpec = CHOOSE): SetGroup => ({ id: "work", kind: "working", count: sets, reps, load })

const lift = (id: string, liftRef: LiftRef, plan: Plan, stateKey?: string): SlotSpec => ({
  id,
  lift: liftRef,
  ...(stateKey ? { stateKey } : {}),
  ...weekByWeek(LENGTH, plan),
  progression: HOLD,
})

const BENCH: LiftRef = { lib: "lib_bench_press" }
const SQUAT: LiftRef = { lib: "lib_back_squat" }
const DEADLIFT: LiftRef = { lib: "lib_deadlift" }
const FLY: LiftRef = { lib: "lib_db_fly" }
const GM_STANDING: LiftRef = { lib: "lib_good_morning", name: "Good Morning (standing)" }
const GM_SEATED: LiftRef = { name: "Good Morning (sitting)", loadStyle: "barbell" }
const ABS: LiftRef = { name: "Abs" }
const all4 = (g: SetGroup): Plan => ({ 1: [g], 2: [g], 3: [g], 4: [g] })

export const sheiko29: ProgramFixture = {
  id: "sheiko-29-32",
  title: "Sheiko #29 (first block of #29–#32)",
  source: {
    url: "https://liftvault.com/programs/powerlifting/sheiko-spreadsheets/",
    author: "Boris Sheiko (translation and sheet by ChaseT, 2008)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: the numbered Sheiko templates are example programs from Sheiko's writing, translated and passed around openly; Lift Vault shares the 'Sheiko Program Spreadsheets' training collection (Google Sheet 1vBdL47glReiNALmFw1_ieRg6nMYaJ5OFlmidJ9nUNNM) for free. Numbers are its '#29' tab: weight = max × %.",
  },
  coverage: "exact",
  spec: {
    specVersion: 2,
    name: "Sheiko #29",
    blurb:
      "Four weeks, three days a week: squat, bench and deadlift in ramps of 50–90% of your maxes, often a lift twice in one day, with a few accessories. The first block of the #29–#32 cycle.",
    credit: "by Boris Sheiko",
    unit: "kg",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: LENGTH, atEnd: "finish" },
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
          lift("mon_bench_1", BENCH, { 1: [ramp([[0.5, 5, 1], [0.6, 4, 2], [0.7, 3, 2], [0.75, 3, 5]])] }, "bench"),
          lift(
            "mon_squat_1",
            SQUAT,
            {
              1: [ramp([[0.5, 5, 1], [0.6, 5, 2], [0.7, 5, 5]])],
              2: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 2, 5]])],
              3: [ramp([[0.55, 5, 1], [0.65, 4, 1], [0.75, 3, 2], [0.85, 2, 4]])],
              4: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 3, 5]])],
            },
            "squat"
          ),
          lift(
            "mon_bench_2",
            BENCH,
            {
              1: [ramp([[0.5, 5, 1], [0.6, 5, 1], [0.7, 4, 4]])],
              2: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 3, 5]])],
              3: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 3, 6]])],
              4: [ramp([[0.55, 5, 1], [0.65, 5, 1], [0.75, 4, 5]])],
            },
            "bench"
          ),
          lift("mon_fly", FLY, all4(plain(10, 5)), "db_fly"),
          lift("mon_push_up", { lib: "lib_push_up" }, { 2: [plain(10, 5, BODYWEIGHT)], 3: [plain(10, 5, BODYWEIGHT)] }),
          lift("mon_dip", { lib: "lib_dip" }, { 4: [plain(8, 5, BODYWEIGHT)] }, "dip"),
          lift("mon_front_squat", { lib: "lib_front_squat" }, {
            2: [ramp([[0.45, 3, 2], [0.55, 3, 2], [0.6, 2, 4]], "squat")],
            4: [ramp([[0.4, 5, 2], [0.5, 4, 2], [0.6, 3, 3]], "squat")],
          }),
          lift("mon_squat_2", SQUAT, { 3: [ramp([[0.5, 3, 1], [0.6, 3, 1], [0.7, 3, 1], [0.8, 3, 4]])] }, "squat"),
          lift("mon_good_morning", GM_STANDING, all4(plain(5, 5)), "good_morning"),
        ],
      },
      {
        id: "wed",
        label: "Wednesday",
        weekday: 3,
        slots: [
          lift("wed_bench_1", BENCH, { 4: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 3, 2], [0.85, 2, 3]])] }, "bench"),
          lift("wed_deadlift_to_knees", { name: "Deadlift up to Knees", loadStyle: "barbell" }, {
            1: [ramp([[0.5, 3, 1], [0.6, 3, 2], [0.7, 3, 2], [0.75, 3, 4]], "deadlift")],
            2: [ramp([[0.5, 3, 1], [0.6, 3, 1], [0.7, 3, 2], [0.75, 2, 4]], "deadlift")],
          }),
          lift("wed_deficit_deadlift", { lib: "lib_deficit_deadlift" }, { 3: [ramp([[0.5, 3, 2], [0.6, 3, 2], [0.65, 3, 4]], "deadlift")] }),
          lift("wed_deadlift", DEADLIFT, { 4: [ramp([[0.5, 3, 1], [0.6, 3, 1], [0.7, 3, 2], [0.8, 3, 2], [0.85, 2, 3], [0.8, 2, 3]])] }, "deadlift"),
          lift("wed_incline", { lib: "lib_incline_bench" }, { 1: [plain(6, 4)] }),
          lift(
            "wed_bench_2",
            BENCH,
            {
              2: [ramp([[0.5, 6, 1], [0.6, 6, 2], [0.65, 6, 4]])],
              3: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 2, 3], [0.85, 2, 2], [0.8, 3, 2]])],
              4: [ramp([[0.5, 5, 1], [0.6, 5, 1], [0.7, 5, 4]])],
            },
            "bench"
          ),
          lift("wed_dip", { lib: "lib_dip" }, { 1: [plain(5, 5, BODYWEIGHT)] }, "dip"),
          lift("wed_fly", FLY, { 2: [plain(10, 5)], 3: [plain(10, 5)], 4: [plain(10, 5)] }, "db_fly"),
          lift("wed_deadlift_from_boxes", { name: "Deadlift from Boxes", loadStyle: "barbell" }, {
            1: [ramp([[0.55, 4, 1], [0.65, 4, 1], [0.75, 4, 2], [0.85, 3, 4]], "deadlift")],
            2: [ramp([[0.55, 4, 1], [0.65, 4, 1], [0.75, 4, 2], [0.8, 4, 4]], "deadlift")],
            3: [ramp([[0.6, 4, 1], [0.7, 4, 2], [0.8, 3, 2], [0.9, 2, 3]], "deadlift")],
          }),
          lift("wed_lunge", { name: "Lunge" }, { 1: [plain(5, 5)], 2: [plain(5, 5)], 3: [plain(5, 5)] }),
          lift("wed_abs", ABS, { 1: [plain(10, 3)] }, "abs"),
        ],
      },
      {
        id: "fri",
        label: "Friday",
        weekday: 5,
        slots: [
          lift(
            "fri_squat_1",
            SQUAT,
            {
              2: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 2, 5]])],
              3: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 3, 6]])],
              4: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 3, 6]])],
            },
            "squat"
          ),
          lift(
            "fri_bench",
            BENCH,
            {
              1: [ramp([[0.5, 5, 1], [0.6, 5, 1], [0.7, 4, 1], [0.75, 3, 2], [0.8, 2, 2], [0.75, 3, 2], [0.7, 4, 1], [0.6, 6, 1], [0.5, 8, 1]])],
              2: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 2, 2], [0.75, 3, 1], [0.65, 5, 1], [0.55, 7, 1]])],
              3: [ramp([[0.5, 5, 1], [0.6, 4, 1], [0.7, 3, 2], [0.8, 3, 7]])],
              4: [ramp([[0.5, 6, 1], [0.6, 5, 1], [0.7, 4, 2], [0.8, 3, 2], [0.85, 2, 2], [0.8, 3, 2], [0.7, 4, 1], [0.6, 6, 1], [0.5, 8, 1]])],
            },
            "bench"
          ),
          lift("fri_fly", FLY, all4(plain(10, 5)), "db_fly"),
          lift(
            "fri_squat_2",
            SQUAT,
            {
              1: [ramp([[0.5, 5, 1], [0.6, 4, 2], [0.7, 3, 2], [0.75, 3, 5]])],
              2: [ramp([[0.5, 5, 1], [0.6, 5, 2], [0.7, 4, 4]])],
            },
            "squat"
          ),
          lift("fri_press", { lib: "lib_ohp", name: "Press" }, { 3: [plain(4, 5)] }),
          lift("fri_dip", { lib: "lib_dip" }, { 4: [plain(8, 5, BODYWEIGHT)] }, "dip"),
          lift("fri_good_morning_seated", GM_SEATED, { 1: [plain(5, 5)], 4: [plain(5, 5)] }),
          lift("fri_good_morning", GM_STANDING, { 2: [plain(5, 5)], 3: [plain(5, 5)] }, "good_morning"),
          lift("fri_abs", ABS, { 4: [plain(10, 3)] }, "abs"),
        ],
      },
    ],
  },
  start: { maxes: { squat: 200, bench: 150, deadlift: 250 } },
  expect: [
    {
      week: 1,
      day: "mon",
      slot: "mon_bench_1",
      sets: "1x5@75, 2x4@90, 2x3@105, 5x3@112.5",
      source: '"#29"!B7:F10 — bench 50%×5×1, 60%×4×2, 70%×3×2, 75%×3×5 of 150',
    },
    { week: 1, day: "mon", slot: "mon_squat_1", sets: "1x5@100, 2x5@120, 5x5@140", source: '"#29"!B11:F13 — squat 50%×5×1, 60%×5×2, 70%×5×5 of 200' },
    { week: 1, day: "mon", slot: "mon_bench_2", sets: "1x5@75, 1x5@90, 4x4@105", source: '"#29"!B14:F16 — second bench of the day: 50%×5, 60%×5, 70%×4×4' },
    { week: 1, day: "fri", slot: "fri_good_morning_seated", sets: "5x5@?", source: '"#29"!B49:E49 — Good morning (sitting), 5 reps × 5 sets' },
    { week: 2, day: "mon", slot: "mon_front_squat", sets: "2x3@90, 2x3@110, 4x2@120", source: '"#29"!B64:F66 — front squat 45%×3×2, 55%×3×2, 60%×2×4 of the squat max (Max!$B$4)' },
    {
      week: 3,
      day: "wed",
      slot: "wed_deadlift_from_boxes",
      sets: "1x4@150, 2x4@175, 2x3@200, 3x2@225",
      source: '"#29"!B132:F135 — deadlift from boxes 60%×4×1, 70%×4×2, 80%×3×2, 90%×2×3 of 250',
    },
    {
      week: 4,
      day: "wed",
      slot: "wed_bench_1",
      sets: "1x5@75, 1x4@90, 2x3@105, 2x3@120, 3x2@127.5",
      source: '"#29"!B169:F173 — bench 50%×5, 60%×4, 70%×3×2, 80%×3×2, 85%×2×3 of 150',
    },
    { week: 4, day: "wed", slot: "wed_bench_2", sets: "1x5@75, 1x5@90, 4x5@105", source: '"#29"!B180:F182 — second bench of the day: 50%×5, 60%×5, 70%×5×4' },
    { week: 4, day: "fri", slot: "fri_dip", sets: "5x8@bw", source: '"#29"!B200:E200 — Dip, 8 reps × 5 sets' },
  ],
}
