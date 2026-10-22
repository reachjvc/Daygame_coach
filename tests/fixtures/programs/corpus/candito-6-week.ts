/**
 * Candito 6-Week Strength Program — Jonnie Candito's free upper/lower
 * program, as Lift Vault's copy of his spreadsheet writes it (read cell by
 * cell on 2026-10-22: Inputs!A1:N27 and every formula on "Week 1"…"Week 6"),
 * with his own PDF write-up for what the sheet leaves out.
 *
 * Every main-lift weight is MROUND(1RM × %, 5) — 2.5 in kg — sometimes plus
 * or minus one plate step (5 lb / 2.5 kg). The sheet dates every session from
 * the start date, and the days trained move from week to week (week 1: days
 * 1, 2, 4, 5, 6; week 3: days 1, 3, 5, 6; week 5: days 1, 3, 5), so this file
 * pins the start to a Monday and writes all seven weekdays, each lift skipped
 * in the weeks it is not done that day. Thursday and Friday swap between
 * upper and lower body.
 *
 * THREE READINGS ARE THIS FILE'S, AND SAY SO:
 *  - A fixed step below a percentage ("80% − 5 lb", the back-offs "10 lb under
 *    the max-rep set") and a step on one set of several ("90% + 5 lb" as the
 *    third triple) cannot be written; they are written as ±2.5% per 5 lb, which
 *    is exactly the sheet's number at a 200 lb (or 100 kg) 1RM — the 1RMs below.
 *  - Week 6 offers three options; this file takes the third, "find your 1 rep
 *    max", and tests squat on Monday, bench on Wednesday and deadlift on Friday,
 *    the order week 5 trains them in. The sheet names no days for it.
 *  - The lower-day optional exercises have no sets or reps in the sheet; they
 *    are a note on the squat (the PDF: 8–12 reps for hypertrophy moves, 4-rep
 *    sets for explosive ones).
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, LoadSpec, SetGroup, SetReps, SlotSpec, WeekOverride } from "@/src/programs/spec/types"
import { formatWeekSet } from "@/src/programs/spec/weeks"

const LENGTH = 6
type Plan = Record<number, SetGroup[]>
const FIELDS = ["count", "reps", "options", "load", "effort", "perSet", "restSec", "note"] as const

/**
 * One lift written week by week — `plan[w]` is that week's set groups, absent
 * or empty when the lift is not done that week — as the format writes it: the
 * groups as first done, and for every other week only what changes, weeks with
 * the same change joined ("2,4").
 */
function weekByWeek(length: number, plan: Plan): Pick<SlotSpec, "sets" | "weeks"> {
  const order: string[] = []
  for (let w = 1; w <= length; w++) {
    const ids = (plan[w] ?? []).map((g) => g.id)
    ids.forEach((id, i) => {
      if (order.includes(id)) return
      const next = ids.slice(i + 1).find((x) => order.includes(x))
      if (next) order.splice(order.indexOf(next), 0, id)
      else order.push(id)
    })
    const at = ids.map((id) => order.indexOf(id))
    if (at.some((p, i) => i > 0 && p < at[i - 1])) throw new Error(`Week ${w} does its set groups in another order`)
  }
  const base = new Map<string, SetGroup>()
  for (let w = 1; w <= length; w++) for (const g of plan[w] ?? []) if (!base.has(g.id)) base.set(g.id, g)
  const changes: { weeks: number[]; change: Omit<WeekOverride, "weeks"> }[] = []
  const seen = new Map<string, number[]>()
  for (let w = 1; w <= length; w++) {
    for (const id of order) {
      const b = base.get(id)!
      let g = (plan[w] ?? []).find((x) => x.id === id)
      let change: Omit<WeekOverride, "weeks"> | null = null
      if (!g) change = { set: id, skip: true }
      else {
        if (g.kind !== b.kind) throw new Error(`"${id}" changes kind in week ${w}`)
        // A week of identical sets in a group that elsewhere goes set by set.
        if (b.perSet && !g.perSet && typeof g.count === "number") {
          const p = g.load.from === "max" && typeof g.load.pct === "number" ? { pct: g.load.pct } : {}
          g = { ...g, perSet: Array.from({ length: g.count }, () => ({ reps: g!.reps, ...p })) }
        }
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
  return { sets: order.map((id) => base.get(id)!), ...(weeks.length ? { weeks } : {}) }
}

const HOLD = { kind: "hold" } as const
const CHOOSE: LoadSpec = { from: "choose" }
const r = (min: number, max: number) => ({ min, max })

/** % of the 1RM, plus a plate step or two (the sheet's kg version adds 2.5 kg per 5 lb). */
const pct = (p: number, plusLb = 0): LoadSpec =>
  plusLb ? { from: "max", max: "1rm", pct: p, plus: { kg: plusLb / 2, lb: plusLb } } : { from: "max", max: "1rm", pct: p }

/** Sets that change one by one: [reps, % of 1RM] each. */
const ramp = (rows: [SetReps, number][]): SetGroup => ({
  id: "work",
  kind: "working",
  count: rows.length,
  reps: rows[0][0],
  load: pct(rows[0][1]),
  perSet: rows.map(([reps, p]) => ({ reps, pct: p })),
})
const straight = (count: number, reps: SetReps, load: LoadSpec): SetGroup => ({ id: "work", kind: "working", count, reps, load })
const test = (lift: string): SetGroup => ({
  id: "test",
  kind: "top",
  count: 1,
  reps: 1,
  load: CHOOSE,
  note: `Week 6: work up to a new ${lift} 1RM.`,
})
const maxReps = (load: LoadSpec): SetGroup => ({ id: "mr", kind: "amrap", count: 1, reps: { atLeast: 1 }, load, note: "Max reps." })
const mr10 = (load: LoadSpec, note: string): SetGroup => ({ id: "mr10", kind: "amrap", count: 1, reps: r(8, 10), load, note })
/** Accessory reps set by set, weight your own. */
const acc = (reps: number[]): SetGroup[] =>
  reps.length === 0
    ? []
    : reps.every((n) => n === reps[0])
      ? [{ id: "work", kind: "working", count: reps.length, reps: reps[0], load: CHOOSE }]
      : [{ id: "work", kind: "working", count: reps.length, reps: reps[0], load: CHOOSE, perSet: reps.map((n) => ({ reps: n })) }]
const optional = (sets: number): SetGroup[] => (sets ? [{ id: "work", kind: "working", count: sets, reps: r(8, 12), load: CHOOSE }] : [])

const SQUAT: LiftRef = { lib: "lib_back_squat" }
const BENCH: LiftRef = { lib: "lib_bench_press" }
const DEADLIFT: LiftRef = { lib: "lib_deadlift" }
const VARIATION: LiftRef = { name: "Deadlift variation" }
const VARIATIONS: LiftRef[] = [
  { lib: "lib_stiff_leg_deadlift" },
  { name: "Snatch-Grip Deadlift", loadStyle: "barbell" },
  { lib: "lib_deficit_deadlift" },
  { name: "Pause Deadlift", loadStyle: "barbell" },
]
const BACK1: LiftRef = { name: "Upper back #1 (horizontal pull)" }
const BACK1S: LiftRef[] = [{ lib: "lib_db_row" }, { lib: "lib_barbell_row" }, { lib: "lib_machine_row" }]
const SHOULDERS: LiftRef = { name: "Shoulders" }
const SHOULDERSS: LiftRef[] = [
  { lib: "lib_seated_db_press" },
  { name: "Standing Dumbbell Overhead Press", loadStyle: "free" },
  { lib: "lib_ohp", name: "Military Press" },
  { lib: "lib_lateral_raise" },
]
const BACK2: LiftRef = { name: "Upper back #2 (vertical pull)" }
const BACK2S: LiftRef[] = [{ lib: "lib_weighted_pull_up" }, { name: "Weighted Chin-up", loadStyle: "free" }, { lib: "lib_lat_pulldown" }]
const OPTIONAL: LiftRef = { name: "Optional exercise" }
const OPTIONAL_NOTE =
  "Optional, and free to change every workout: a low-impact isolation lift, light, for 8–12 reps (lateral raises, incline flyes, skull crushers, preacher curls…). Skip it if you like."
const LOWER_NOTE =
  "Up to two optional lower-body exercises may follow: hypertrophy moves (leg curl, leg extension, calf raises) for 8–12 reps, or explosive ones (box jumps, power cleans) in sets of 4. The sheet gives no number of sets. If you fail a required rep, lower your 1RM 2.5% and carry on."

interface Upper {
  bench: SetGroup[]
  back1: number[]
  shoulders: number[]
  back2: number[]
  optional: number
}
interface Lower {
  squat: SetGroup[]
  deadlift: SetGroup[]
  variation: SetGroup[]
}

/** Week 1, days 2 and 4: 10 @ 50, 10 @ 67.5, 8 @ 75, 6 @ 77.5. */
const U1 = (bench: SetGroup[]): Upper => ({ bench, back1: [10, 10, 8, 6], shoulders: [12, 12, 10, 8], back2: [12, 12, 10, 8], optional: 4 })
const U2 = (bench: SetGroup[]): Upper => ({ bench, back1: [10, 8, 8], shoulders: [10, 8, 6], back2: [10, 8, 6], optional: 4 })
const U3 = (bench: SetGroup[]): Upper => ({ bench, back1: [6, 6, 6], shoulders: [6, 6, 6], back2: [6, 6, 6], optional: 0 })
const U4 = (bench: SetGroup[]): Upper => U1(bench)
const U5 = (bench: SetGroup[]): Upper => ({ bench, back1: [8, 6, 6], shoulders: [8, 6, 6], back2: [8, 6, 6], optional: 3 })
const U6: Upper = { bench: [test("bench")], back1: [], shoulders: [], back2: [], optional: 0 }

const UPPER: Record<string, Upper> = {
  w1a: U1([ramp([[10, 0.5], [10, 0.675], [8, 0.75], [6, 0.775]])]),
  w1b: U1([maxReps(pct(0.8))]),
  // Third set: MROUND(80%) + 5 lb, written 82.5%.
  w2a: U2([ramp([[10, 0.725], [8, 0.775], [r(6, 8), 0.825]])]),
  // MROUND(80%) − 5 lb, written 77.5%.
  w2b: U2([maxReps(pct(0.775))]),
  w3a: U3([straight(3, r(4, 6), pct(0.85))]),
  w3b: U3([straight(3, r(4, 6), pct(0.85, 5))]),
  // MROUND(87.5% − 5 lb), MROUND(90% − 5 lb), 90%: written 85, 87.5, 90%.
  w4a: U4([ramp([[3, 0.85], [3, 0.875], [3, 0.9]])]),
  w4b: U4([ramp([[3, 0.875], [r(2, 4), 0.9], [r(1, 2), 0.95]])]),
  w5: U5([straight(1, r(1, 4), pct(0.975))]),
}

const MR10_MON = "Max reps, but stop at 10. Fewer than 8: lower your 1RM 2.5% from here on — and still do the 5×3 below."
const MR10_THU = "Max reps, but stop at 10. How many you get decides the back-off sets below."
const LOWER: Record<string, Lower> = {
  w1a: { squat: [straight(4, 6, pct(0.8))], deadlift: [straight(2, 6, pct(0.8))], variation: [] },
  w1b: { squat: [straight(4, 8, pct(0.7))], deadlift: [straight(2, 8, pct(0.7))], variation: [] },
  w2a: {
    squat: [
      mr10(pct(0.8), MR10_MON),
      { id: "extra", kind: "backoff", count: 5, reps: 3, load: pct(0.8, 5), restSec: 60, note: "Extra volume: 5 lb (2.5 kg) over the max-rep set, 60 s between sets." },
    ],
    deadlift: [],
    variation: [straight(3, 8, CHOOSE)],
  },
  w2b: {
    squat: [
      mr10(pct(0.8, 5), MR10_THU),
      {
        id: "backoff",
        kind: "backoff",
        count: 10,
        reps: 3,
        options: [
          { count: 10, reps: 3 },
          { count: 8, reps: 3 },
          { count: 5, reps: 3 },
        ],
        // 10 lb (5 kg) under the max-rep set: MROUND(80%) + 5 − 10, written 77.5%.
        load: pct(0.775),
        restSec: 60,
        note: "10 lb (5 kg) under the max-rep set. 10 reps on it: 10×3; 8–9: 8×3; 7: 5×3; fewer than 7: skip these and lower your 1RM at least 2.5%.",
      },
    ],
    deadlift: [],
    variation: [straight(3, 8, CHOOSE)],
  },
  w3a: { squat: [straight(3, r(4, 6), pct(0.85, 5))], deadlift: [straight(2, r(3, 6), pct(0.875))], variation: [] },
  // MROUND(85% + 5) + 5: 85% plus 10 lb.
  w3b: { squat: [straight(1, r(4, 6), pct(0.85, 10))], deadlift: [], variation: [straight(1, 8, CHOOSE)] },
  // MROUND(90%) − 5, 90%, MROUND(90%) + 5: written 87.5, 90, 92.5%.
  w4a: { squat: [ramp([[3, 0.875], [3, 0.9], [3, 0.925]])], deadlift: [], variation: [straight(2, 6, CHOOSE)] },
  // MROUND(90%) + 5, then 95%: written 92.5, 95%.
  w4b: {
    squat: [ramp([[3, 0.925], [r(1, 2), 0.95]])],
    deadlift: [ramp([[3, 0.925], [r(1, 2), 0.95]])],
    variation: [],
  },
  w5a: { squat: [straight(1, r(1, 4), pct(0.975))], deadlift: [ramp([[4, 0.675], [4, 0.7], [2, 0.725]])], variation: [] },
  w5b: { squat: [], deadlift: [straight(1, r(1, 4), pct(0.975))], variation: [] },
  w6mon: { squat: [test("squat")], deadlift: [], variation: [] },
  w6fri: { squat: [], deadlift: [test("deadlift")], variation: [] },
}

const byWeek = <T,>(weeks: Record<number, T>, pick: (t: T) => SetGroup[]) =>
  weekByWeek(LENGTH, Object.fromEntries(Object.entries(weeks).map(([w, t]) => [Number(w), pick(t)])))

function upperSlots(day: string, weeks: Record<number, Upper>): SlotSpec[] {
  return [
    { id: `${day}_bench`, lift: BENCH, stateKey: "bench", ...byWeek(weeks, (u) => u.bench), progression: HOLD },
    { id: `${day}_back1`, lift: BACK1, choices: BACK1S, stateKey: "upper_back_1", ...byWeek(weeks, (u) => acc(u.back1)), progression: HOLD },
    { id: `${day}_shoulders`, lift: SHOULDERS, choices: SHOULDERSS, stateKey: "shoulders", ...byWeek(weeks, (u) => acc(u.shoulders)), progression: HOLD },
    { id: `${day}_back2`, lift: BACK2, choices: BACK2S, stateKey: "upper_back_2", ...byWeek(weeks, (u) => acc(u.back2)), progression: HOLD },
    ...[1, 2].flatMap((n): SlotSpec[] =>
      Object.values(weeks).some((u) => u.optional)
        ? [{ id: `${day}_optional${n}`, lift: OPTIONAL, stateKey: `optional_${n}`, note: OPTIONAL_NOTE, ...byWeek(weeks, (u) => optional(u.optional)), progression: HOLD }]
        : []
    ),
  ]
}

function lowerSlots(day: string, weeks: Record<number, Lower>): SlotSpec[] {
  const all = Object.values(weeks)
  const out: SlotSpec[] = []
  if (all.some((l) => l.squat.length)) out.push({ id: `${day}_squat`, lift: SQUAT, stateKey: "squat", note: LOWER_NOTE, ...byWeek(weeks, (l) => l.squat), progression: HOLD })
  if (all.some((l) => l.deadlift.length)) out.push({ id: `${day}_deadlift`, lift: DEADLIFT, stateKey: "deadlift", ...byWeek(weeks, (l) => l.deadlift), progression: HOLD })
  if (all.some((l) => l.variation.length)) {
    out.push({ id: `${day}_variation`, lift: VARIATION, choices: VARIATIONS, stateKey: "deadlift_variation", ...byWeek(weeks, (l) => l.variation), progression: HOLD })
  }
  return out
}

export const canditoSixWeek: ProgramFixture = {
  id: "candito-6-week",
  title: "Candito 6-Week Strength Program",
  source: {
    url: "https://liftvault.com/programs/powerlifting/jonnie-candito-6-week-strength-program-spreadsheet/",
    author: "Jonnie Candito",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: Candito gave the program and spreadsheet away on canditotraininghq.com; Lift Vault shares the copy openly (Google Sheet 1IN1BnGszZnIg8nvALiDIVc2oTJ9oGXivM2M-M-Ynkqo) with his PDF (web.archive.org/web/20171010194828/http://www.canditotraininghq.com:80/app/download/911765404/Candito%206%20Week%20Strength%20Program.pdf). Numbers are the sheet's formulas. The sheet's three required upper-day accessories are a horizontal pull, shoulders and a vertical pull; the PDF says back, shoulders and biceps.",
  },
  coverage: "close",
  gaps: [
    "A fixed step below a percentage (week 2's bench max-rep set at 80% − 5 lb, Thursday's back-offs 10 lb under the max-rep set, week 4's 87.5% − 5 lb and 90% − 5 lb) cannot be written — `plus` is never negative — and a step on one set of several (week 4's 90% + 5 lb triple, week 2's 80% + 5 lb third set) cannot either, because a set-by-set entry has no `plus`. They are written as ±2.5% per 5 lb, which matches the sheet only at a 200 lb (or 100 kg) 1RM.",
    "MR10 is 'max reps, but no more than 10'; a '+' set has no ceiling, so it is written as 8–10 reps with the rule in a note.",
    "Week 2 Thursday: the number of back-off triples depends on the reps of the max-rep set (10 → 10×3, 8–9 → 8×3, 7 → 5×3, fewer → none); it is written as a choice of 10×3 … 5×3 with the rule in a note.",
    "Failing a required rep lowers the 1RM 2.5% for the rest of the cycle (and fewer than 8 on week 2's MR10 does the same); no rule moves a 1RM down on a miss, so it is a note.",
    "Week 6's projected-max option — week 5's weight × 1.03, 1.06 or 1.09 for 2, 3 or 4 reps — is a sum the format cannot do; the week is written as a 1RM test picked on the day.",
    "The days trained change from week to week and Thursday and Friday swap between upper and lower body; a day cannot be absent from a week, so seven weekdays are written with every lift skipped in its off weeks, under labels that cannot change by week.",
    "The lower days' optional exercises have no sets in the sheet; they are a note.",
  ],
  spec: {
    specVersion: 2,
    name: "Candito 6-Week Strength Program",
    blurb:
      "Six weeks of upper/lower training on percentages of your squat, bench and deadlift maxes: conditioning, hypertrophy, heavy triples, then singles, and a test in week 6.",
    credit: "by Jonnie Candito",
    unit: "lb",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: LENGTH,
      atEnd: "finish",
      phases: [
        { label: "Muscular conditioning", weeks: "1" },
        { label: "Hypertrophy", weeks: "2" },
        { label: "Linear max OT", weeks: "3" },
        { label: "Heavy weight acclimation", weeks: "4" },
        { label: "High-intensity strength", weeks: "5" },
        { label: "Test", weeks: "6" },
      ],
      testWeeks: "6",
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
        label: "Monday: lower",
        weekday: 1,
        slots: lowerSlots("mon", { 1: LOWER.w1a, 2: LOWER.w2a, 3: LOWER.w3a, 4: LOWER.w4a, 5: LOWER.w5a, 6: LOWER.w6mon }),
      },
      { id: "tue", label: "Tuesday: upper (weeks 1, 2, 4)", weekday: 2, slots: upperSlots("tue", { 1: UPPER.w1a, 2: UPPER.w2a, 4: UPPER.w4a }) },
      { id: "wed", label: "Wednesday: upper (weeks 3, 5, 6)", weekday: 3, slots: upperSlots("wed", { 3: UPPER.w3a, 5: UPPER.w5, 6: U6 }) },
      {
        id: "thu",
        label: "Thursday: upper (week 1), lower (weeks 2, 4)",
        weekday: 4,
        slots: [...upperSlots("thu", { 1: UPPER.w1a }), ...lowerSlots("thu", { 2: LOWER.w2b, 4: LOWER.w4b })],
      },
      {
        id: "fri",
        label: "Friday: lower (weeks 1, 3, 5, 6), upper (weeks 2, 4)",
        weekday: 5,
        slots: [...lowerSlots("fri", { 1: LOWER.w1b, 3: LOWER.w3b, 5: LOWER.w5b, 6: LOWER.w6fri }), ...upperSlots("fri", { 2: UPPER.w2a, 4: UPPER.w4b })],
      },
      { id: "sat", label: "Saturday: upper (weeks 1, 3)", weekday: 6, slots: upperSlots("sat", { 1: UPPER.w1b, 3: UPPER.w3b }) },
      { id: "sun", label: "Sunday: upper (week 2)", weekday: 7, slots: upperSlots("sun", { 2: UPPER.w2b }) },
    ],
  },
  start: { maxes: { squat: 200, bench: 200, deadlift: 200 } },
  expect: [
    { week: 1, day: "mon", slot: "mon_squat", sets: "4x6@160", source: '"Week 1"!C5:J5 — MROUND(200×0.8, 5) = 160, ×6, four sets' },
    { week: 1, day: "mon", slot: "mon_deadlift", sets: "2x6@160", source: '"Week 1"!C6:F6 — MROUND(200×0.8, 5) = 160, ×6, two sets' },
    {
      week: 1,
      day: "tue",
      slot: "tue_bench",
      sets: "1x10@100, 1x10@135, 1x8@150, 1x6@155",
      source: '"Week 1"!C12:J12 — MROUND(200×0.5/0.675/0.75/0.775, 5) = 100×10, 135×10, 150×8, 155×6',
    },
    { week: 1, day: "sat", slot: "sat_bench", sets: "1x1+@160", source: '"Week 1"!C37:D37 — MROUND(200×0.8, 5) = 160 × MR' },
    {
      week: 2,
      day: "mon",
      slot: "mon_squat",
      sets: "1x8-10@160, 5x3@165",
      source: '"Week 2"!C5:D5 and A6 — 160 × MR10, then "add 5 lbs … 5 sets x 3 reps" = 165',
    },
    {
      week: 2,
      day: "thu",
      slot: "thu_squat",
      sets: "1x8-10@165, 10x3|5x3@155",
      source: '"Week 2"!C24:D24 and A25:A28 — MROUND(200×0.8, 5) + 5 = 165 × MR10; back-offs 10 lb lighter = 155, 10, 8 or 5 sets of 3',
    },
    {
      week: 2,
      day: "tue",
      slot: "tue_bench",
      sets: "1x10@145, 1x8@155, 1x6-8@165",
      source: '"Week 2"!C15:H15 — MROUND(200×0.725, 5) = 145×10, MROUND(200×0.775, 5) = 155×8, MROUND(200×0.8, 5) + 5 = 165×6-8',
    },
    { week: 3, day: "fri", slot: "fri_squat", sets: "1x4-6@180", source: '"Week 3"!C19:D19 — MROUND(200×0.85 + 5, 5) + 5 = 180 × 4-6' },
    {
      week: 4,
      day: "fri",
      slot: "fri_bench",
      sets: "1x3@175, 1x2-4@180, 1x1-2@190",
      source: '"Week 4"!C28:H28 — MROUND(200×0.875/0.9/0.95, 5) = 175×3, 180×2-4, 190×1-2',
    },
    { week: 5, day: "mon", slot: "mon_squat", sets: "1x1-4@195", source: '"Week 5"!C5:D5 — MROUND(200×0.975, 5) = 195 × 1-4' },
    {
      week: 5,
      day: "mon",
      slot: "mon_deadlift",
      sets: "1x4@135, 1x4@140, 1x2@145",
      source: '"Week 5"!C6:H6 — MROUND(200×0.675/0.7/0.725, 5) = 135×4, 140×4, 145×2',
    },
  ],
}
