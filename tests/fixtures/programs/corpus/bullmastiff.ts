/**
 * Bullmastiff — Alex Bromley's 18-week base-and-peak program from his paid
 * book Peak Strength, from its publicly stated rules only: Lift Vault's page
 * and free sheet (read cell by cell on 2026-10-22: Input!A2:D47 and every
 * formula on "Base Wave 1" … "Peak Wave 3"), and the program summary Lift
 * Vault hosts with them (Bullmastiff-PS-PDF.pdf, the book's pages 154–166).
 *
 * Four days (Monday squat, Wednesday bench, Friday deadlift, Saturday press),
 * each main lift followed by a developmental variation of another lift and,
 * in the base phase, bodybuilding accessories; the peak phase adds targeted
 * variations and cuts the accessories. Six three-week waves: the base phase
 * runs 4×6+ @ 65%, 5×5+ @ 70%, 6×4+ @ 75% of the 1RM; the peak phase 5/3/1
 * sets of 3+ @ 80%, 2+ @ 85%, 1+ @ 90%. The last set of the main lift is an
 * AMRAP; every rep past the target adds 1% of the 1RM to next week's weight,
 * and each wave starts again from its percentage.
 *
 * Week 1 of each wave is written as a percentage of the 1RM, weeks 2 and 3 as
 * the working weight the AMRAP moves (started at 65% of the 1RM). Base wave 1
 * accessories are 2, 3, 4 sets as the summary and Lift Vault's page give them;
 * the sheet has 2, 3, 3.
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, LoadSpec, SetGroup, SlotSpec, WeekOverride } from "@/src/programs/spec/types"
import { formatWeekSet } from "@/src/programs/spec/weeks"

const LENGTH = 18
type Plan = Record<number, SetGroup[]>
const FIELDS = ["count", "reps", "options", "load", "effort", "perSet", "restSec", "note"] as const

/**
 * One lift written week by week — `plan[w]` is that week's set groups, absent
 * or empty when the lift is not done that week — as the format writes it: the
 * groups as first done, and for every other week only what changes.
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
      const g = (plan[w] ?? []).find((x) => x.id === id)
      let change: Omit<WeekOverride, "weeks"> | null = null
      if (!g) change = { set: id, skip: true }
      else {
        if (g.kind !== b.kind) throw new Error(`"${id}" changes kind in week ${w}`)
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

const CHOOSE: LoadSpec = { from: "choose" }
const EFFORT: LoadSpec = { from: "effort" }
const r = (min: number, max: number) => ({ min, max })
const WEEKS = Array.from({ length: LENGTH }, (_, i) => i + 1)
const waveOf = (w: number) => Math.ceil(w / 3) // 1–3 base, 4–6 peak
const stepOf = (w: number) => (w - 1) % 3 // 0, 1, 2 within the wave
const plan = (f: (w: number) => SetGroup[]): Plan => Object.fromEntries(WEEKS.map((w) => [w, f(w)]))

/** The main lift: straight sets, the last one an AMRAP; week 1 of a wave from the 1RM, then the working weight. */
const MAIN = {
  pct: [0.65, 0.7, 0.75, 0.8, 0.85, 0.9],
  reps: [6, 5, 4, 3, 2, 1],
  sets: (w: number) => (waveOf(w) <= 3 ? [4, 5, 6][waveOf(w) - 1] : [5, 3, 1][stepOf(w)]),
}
const mainPlan = plan((w) => {
  const wave = waveOf(w)
  const reps = MAIN.reps[wave - 1]
  const load: LoadSpec = stepOf(w) === 0 ? { from: "max", max: "1rm", pct: MAIN.pct[wave - 1] } : { from: "working" }
  const sets = MAIN.sets(w)
  return [
    ...(sets > 1 ? [{ id: "work", kind: "working" as const, count: sets - 1, reps, load }] : []),
    {
      id: "amrap",
      kind: "amrap" as const,
      count: 1,
      reps: { atLeast: reps },
      load,
      note: "As many reps as you can. Each rep past the target adds 1% of your 1RM to next week's weight; the next wave starts again from its percentage.",
    },
  ]
})

/** Developmental (and, in the peak, targeted) variations: by feel at RPE 6, 7, 8. */
const variationPlan = (weeks: "base" | "peak") =>
  plan((w) => {
    const wave = waveOf(w)
    if ((weeks === "base") !== (wave <= 3)) return []
    const step = stepOf(w)
    const reps = weeks === "base" ? [12, 10, 8][wave - 1] : [6, 5, 4][wave - 4]
    const count = weeks === "base" ? [3, 4, 5][step] : [4, 3, 2][step]
    return [{ id: "work", kind: "working", count, reps, load: EFFORT, effort: { rpe: [6, 7, 8][step] } }]
  })

/** Bodybuilding accessories: base 2/3/4 × 12–15, then 3/4/5 × 8–12; peak waves 1–2 3–5 × 8–12; none in peak wave 3. */
const accessoryPlan = (alsoPeak: boolean) =>
  plan((w) => {
    const wave = waveOf(w)
    const step = stepOf(w)
    if (wave === 1) return [{ id: "work", kind: "working", count: [2, 3, 4][step], reps: r(12, 15), load: CHOOSE }]
    if (wave <= 3) return [{ id: "work", kind: "working", count: [3, 4, 5][step], reps: r(8, 12), load: CHOOSE }]
    if (alsoPeak && wave <= 5) return [{ id: "work", kind: "working", count: r(3, 5), reps: r(8, 12), load: CHOOSE }]
    return []
  })

const BY_EFFORT = { kind: "by-effort", group: "work" } as const
const HOLD = { kind: "hold" } as const

const main = (id: string, lift: LiftRef): SlotSpec => ({
  id,
  lift,
  ...weekByWeek(LENGTH, mainPlan),
  progression: { kind: "per-extra-rep", group: "amrap", standard: 6, pct: 0.01, target: "working" },
})
const variation = (id: string, lift: LiftRef, choices: LiftRef[] | undefined, weeks: "base" | "peak"): SlotSpec => ({
  id,
  lift,
  ...(choices ? { choices } : {}),
  ...weekByWeek(LENGTH, variationPlan(weeks)),
  progression: BY_EFFORT,
})
const accessory = (id: string, name: string, stateKey: string, alsoPeak: boolean): SlotSpec => ({
  id,
  lift: { name },
  stateKey,
  ...weekByWeek(LENGTH, accessoryPlan(alsoPeak)),
  progression: HOLD,
})

const barbell = (name: string): LiftRef => ({ name, loadStyle: "barbell" })
const DEV_SQUAT: LiftRef[] = [
  { lib: "lib_front_squat" },
  barbell("Long Pause Squat"),
  barbell("Alternate-Stance Squat"),
  barbell("Tempo Squat"),
  { lib: "lib_safety_bar_squat" },
  barbell("Low Box Squat"),
]
const DEV_BENCH: LiftRef[] = [
  { lib: "lib_spoto_press" },
  { lib: "lib_pause_bench" },
  barbell("Tempo Bench Press"),
  { lib: "lib_close_grip_bench" },
  barbell("Buffalo Bar Bench Press"),
  barbell("Wide-Grip Bench Press"),
  barbell("Feet-Up Bench Press"),
]
const DEV_DEADLIFT: LiftRef[] = [
  { lib: "lib_rdl" },
  barbell("Snatch-Grip Deadlift"),
  { lib: "lib_stiff_leg_deadlift" },
  barbell("Tempo Deadlift"),
  barbell("Axle Deadlift"),
  { lib: "lib_sumo_deadlift" },
]
const TEMPO_OHP = barbell("Tempo Overhead Press")
const TARGET_SQUAT: LiftRef[] = [{ lib: "lib_box_squat" }, barbell("Pin Squat from the Bottom"), barbell("Short Pause Squat"), barbell("Squat with Bands or Chains")]
const TARGET_BENCH: LiftRef[] = [barbell("Board or Pin Press"), { lib: "lib_floor_press" }, barbell("Bench Press, Pause at Sticking Point"), barbell("Bench Press with Bands or Chains")]
const TARGET_DEADLIFT: LiftRef[] = [barbell("Deadlift, Bar at Sticking Point"), barbell("Deadlift, Pause at Sticking Point"), barbell("Deadlift with Bands or Chains")]
const TARGET_OHP: LiftRef[] = [barbell("Pin Press at Sticking Point"), barbell("Overhead Press, Pause at Sticking Point"), barbell("Overhead Press with Bands or Chains")]

const lowerAccessories = (day: string, back: boolean): SlotSpec[] => [
  ...(back ? [accessory(`${day}_back`, "Back accessory", "back", true)] : []),
  accessory(`${day}_hamstrings`, "Hamstring accessory", "hamstrings", false),
  accessory(`${day}_quads`, "Quad accessory", "quads", false),
  accessory(`${day}_abs`, "Ab accessory", "abs", false),
]
const upperAccessories = (day: string): SlotSpec[] => [
  accessory(`${day}_triceps`, "Triceps accessory", "triceps", true),
  accessory(`${day}_biceps`, "Biceps accessory", "biceps", false),
  accessory(`${day}_rear_delts_cuff`, "Rear delt / rotator cuff accessory", "rear_delts_cuff", true),
]

export const bullmastiff: ProgramFixture = {
  id: "bullmastiff",
  title: "Bullmastiff (public rules)",
  source: {
    url: "https://liftvault.com/programs/strength/alex-bromley-bullmastiff-program-spreadsheet/",
    author: "Alex Bromley (Empire Barbell); sheet by Lift Vault",
    terms: "paid-public-rules",
    checked: "2026-10-22",
    notes:
      "Bullmastiff is from Alex Bromley's paid book Peak Strength. Only what Lift Vault publishes for free is used: the program page, its Google Sheet (1SIwTI2suL5CM3QX_RUv8GD6GWQ4T_SrzhgJJvu4_IGI, 'an honest interpretation … not associated with Alex or Empire Barbell') and the program summary it links (liftvault.com/wp-content/uploads/2024/01/Bullmastiff-PS-PDF.pdf). Weights are the sheet's MROUND(1RM × %, 5) and MROUND(1RM × (AMRAP reps − target)/100 + last week's weight, 5).",
  },
  coverage: "close",
  gaps: [
    "Each wave starts again from its percentage of the 1RM, and the AMRAP's jumps only carry within the wave. Week 1 of each wave is written from the 1RM, but the working weight the jumps are added to cannot be reset, so weeks 2–3 of every wave after the first carry the earlier waves' jumps.",
    "The reps are counted past each wave's own target (6, 5, 4, then 3, 2, 1); the rule holds one target, so it is written as 6 — right for the first wave only.",
    "Week 3's AMRAP of a wave moves nothing in the source (the next wave restarts); the rule adds it to the working weight anyway.",
    "The summary's table ends the peak phase with a deload week and a test (or meet) week but gives them no sets; they are left out.",
  ],
  spec: {
    specVersion: 2,
    name: "Bullmastiff",
    blurb:
      "Eighteen weeks, four days: squat, bench, deadlift and press, each with a lighter variation and bodybuilding work. Three-week waves of percentage work end every session with an all-out set whose extra reps set next week's weight.",
    credit: "by Alex Bromley (Empire Barbell)",
    unit: "lb",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: LENGTH,
      atEnd: "finish",
      phases: [
        { label: "Base wave 1", weeks: "1-3" },
        { label: "Base wave 2", weeks: "4-6" },
        { label: "Base wave 3", weeks: "7-9" },
        { label: "Peak wave 1", weeks: "10-12" },
        { label: "Peak wave 2", weeks: "13-15" },
        { label: "Peak wave 3", weeks: "16-18" },
      ],
    },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    maxes: [
      { lift: "squat", kind: "1rm" },
      { lift: "bench", kind: "1rm" },
      { lift: "deadlift", kind: "1rm" },
      { lift: "ohp", kind: "1rm" },
    ],
    days: [
      {
        id: "mon",
        label: "Monday: squat",
        weekday: 1,
        slots: [
          main("squat", { lib: "lib_back_squat" }),
          variation("mon_dev_deadlift", { name: "Developmental deadlift variation" }, DEV_DEADLIFT, "base"),
          variation("mon_targeted_deadlift", { name: "Targeted deadlift variation" }, TARGET_DEADLIFT, "peak"),
          variation("mon_dev_squat", { name: "Developmental squat variation" }, DEV_SQUAT, "peak"),
          ...lowerAccessories("mon", true),
        ],
      },
      {
        id: "wed",
        label: "Wednesday: bench",
        weekday: 3,
        slots: [
          main("bench", { lib: "lib_bench_press" }),
          variation("wed_dev_ohp", TEMPO_OHP, undefined, "base"),
          variation("wed_targeted_ohp", { name: "Targeted overhead variation" }, TARGET_OHP, "peak"),
          variation("wed_dev_bench", { name: "Developmental bench variation" }, DEV_BENCH, "peak"),
          ...upperAccessories("wed"),
        ],
      },
      {
        id: "fri",
        label: "Friday: deadlift",
        weekday: 5,
        slots: [
          main("deadlift", { lib: "lib_deadlift" }),
          variation("fri_dev_squat", { name: "Developmental squat variation" }, DEV_SQUAT, "base"),
          variation("fri_targeted_squat", { name: "Targeted squat variation" }, TARGET_SQUAT, "peak"),
          variation("fri_dev_deadlift", { name: "Developmental deadlift variation" }, DEV_DEADLIFT, "peak"),
          ...lowerAccessories("fri", true),
        ],
      },
      {
        id: "sat",
        label: "Saturday: press",
        weekday: 6,
        slots: [
          main("ohp", { lib: "lib_ohp" }),
          variation("sat_dev_bench", { name: "Developmental bench variation" }, DEV_BENCH, "base"),
          variation("sat_targeted_bench", { name: "Targeted bench variation" }, TARGET_BENCH, "peak"),
          variation("sat_dev_ohp", TEMPO_OHP, undefined, "peak"),
          ...upperAccessories("sat"),
        ],
      },
    ],
  },
  start: {
    maxes: { squat: 400, bench: 300, deadlift: 500, ohp: 200 },
    // 65% of each 1RM: where week 1's weight is, and what the AMRAP jumps add to.
    working: { squat: 260, bench: 195, deadlift: 325, ohp: 130 },
  },
  outcome: { amrapExtra: 6 },
  expect: [
    {
      week: 1,
      day: "mon",
      slot: "squat",
      sets: "3x6@260, 1x6+@260",
      source: 'Summary p.156, 400 lb squatter: "Week 1 — Squat 260 x 6,6,6,12"; sheet "Base Wave 1"!E5 = MROUND(400×0.65, 5) = 260',
    },
    {
      week: 2,
      day: "mon",
      slot: "squat",
      sets: "3x6@285, 1x6+@285",
      source: 'Summary p.156: "Week 2 — Squat 285" after 12 reps (6 past 6 → +6% of 400 = 24); sheet K5 = MROUND(400×6/100 + 260, 5) = 285',
    },
    { week: 4, day: "mon", slot: "squat", sets: "4x5@280, 1x5+@280", source: 'Summary p.156: "Week 4 — Squat 280 x 5,5,5,5,12" — 70% of 400, the wave starts again' },
    { week: 7, day: "mon", slot: "squat", sets: "5x4@300, 1x4+@300", source: 'Summary p.156: "Week 7 — Squat 300 x 4,4,4,4,4,11" — 75% of 400' },
    { week: 10, day: "mon", slot: "squat", sets: "4x3@320, 1x3+@320", source: '"Peak Wave 1"!B5:E5 — 5 sets of 3, last one AMRAP, MROUND(400×0.8, 5) = 320' },
    { week: 1, day: "wed", slot: "bench", sets: "3x6@195, 1x6+@195", source: '"Base Wave 1"!B14:E14 — 4×6, last set AMRAP, MROUND(300×0.65, 5) = 195' },
    { week: 1, day: "wed", slot: "wed_dev_ohp", sets: "3x12@? rpe6", source: '"Base Wave 1"!A15:D15 — Tempo OHP 3×12 @ RPE 6' },
    { week: 3, day: "mon", slot: "mon_back", sets: "4x12-15@?", source: 'Summary p.161 "2x12, 3x12, 4x12" and Lift Vault\'s table "4 x 12-15" for base wave 1, week 3' },
  ],
}
