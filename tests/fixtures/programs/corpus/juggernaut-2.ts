/**
 * The Juggernaut Method 2.0 — Chad Wesley Smith's 16-week wave program, from
 * its publicly stated rules only: Lift Vault's free "Juggernaut Method Base
 * Template" sheet, which credits The Juggernaut Method 2.0 (read cell by cell
 * on 2026-10-22: Setup!A1:C11, every formula on "10 Rep Wave" … "3 Rep Wave").
 * The book itself is paid and was not used.
 *
 * Four waves — 10s, 8s, 5s, 3s — of four weeks each: accumulation (straight
 * sets, the last one "+"), intensification (two lighter ramp sets, then
 * heavier straight sets, the last "+"), realization (a ramp to one all-out set,
 * AMAP) and a deload (40 / 50 / 60% for 5). Every weight is a percentage of a
 * training max set at 90% of the 1RM. After each realization week the AMAP
 * reps past the wave's standard (10, 8, 5, 3) raise the training max 5 lb
 * each for squat and deadlift, 2.5 lb each for bench and press.
 *
 * The sheet names no weekdays and no assistance; this file runs the four days
 * in order (squat, bench, press, deadlift — the order is this file's) and puts
 * the assistance in a note. The kg steps per extra rep (2.5 kg, 1.25 kg) are
 * this file's halving of the sheet's lb numbers.
 */

import type { ProgramFixture } from "../fixture"
import type { Increment, LiftRef, LoadSpec, SetGroup, SlotSpec, WeekOverride } from "@/src/programs/spec/types"
import { formatWeekSet } from "@/src/programs/spec/weeks"

const LENGTH = 16
type Plan = Record<number, SetGroup[]>
const FIELDS = ["count", "reps", "options", "load", "effort", "perSet", "restSec", "note"] as const

/**
 * One lift written week by week — `plan[w]` is that week's set groups — as the
 * format writes it: the groups as first done, and for every other week only
 * what changes, weeks with the same change joined ("4,8,12,16").
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

const tm = (pct: number): LoadSpec => ({ from: "max", max: "tm", pct })

/** [reps, % of TM] per set. */
type Ramp = [number, number][]
const ramp = (rows: Ramp): SetGroup => ({
  id: "ramp",
  kind: "working",
  count: rows.length,
  reps: rows[0][0],
  load: tm(rows[0][1]),
  perSet: rows.map(([reps, pct]) => ({ reps, pct })),
})
const work = (count: number, reps: number, pct: number): SetGroup => ({ id: "work", kind: "working", count, reps, load: tm(pct) })
/** The "+" set closing accumulation and intensification: max reps at that weight; it moves nothing. */
const plus = (reps: number, pct: number): SetGroup => ({
  id: "plus",
  kind: "amrap",
  count: 1,
  reps: { atLeast: reps },
  load: tm(pct),
  note: "Max reps at this weight. Stop the other working sets 1–3 reps shy of failure.",
})
/** Realization's all-out set: its reps move the training max. */
const amap = (reps: number, pct: number): SetGroup => ({ id: "amap", kind: "amrap", count: 1, reps: { atLeast: reps }, load: tm(pct), note: "As many reps as possible." })
const DELOAD: SetGroup = {
  id: "work",
  kind: "working",
  count: 3,
  reps: 5,
  load: tm(0.4),
  perSet: [
    { reps: 5, pct: 0.4 },
    { reps: 5, pct: 0.5 },
    { reps: 5, pct: 0.6 },
  ],
}

/** One wave as the sheet lays it out, the percentages of the training max. */
interface Wave {
  reps: number
  accumulation: { sets: number; pct: number }
  intensification: { ramp: Ramp; sets: number; pct: number }
  realization: { ramp: Ramp; pct: number }
}
const WAVES: Wave[] = [
  {
    reps: 10,
    accumulation: { sets: 4, pct: 0.6 },
    intensification: { ramp: [[5, 0.55], [5, 0.625]], sets: 2, pct: 0.675 },
    realization: { ramp: [[5, 0.5], [3, 0.6], [1, 0.7]], pct: 0.75 },
  },
  {
    reps: 8,
    accumulation: { sets: 4, pct: 0.65 },
    intensification: { ramp: [[3, 0.6], [3, 0.675]], sets: 2, pct: 0.725 },
    realization: { ramp: [[5, 0.5], [3, 0.6], [2, 0.7], [1, 0.75]], pct: 0.8 },
  },
  {
    reps: 5,
    accumulation: { sets: 5, pct: 0.7 },
    intensification: { ramp: [[2, 0.65], [2, 0.725]], sets: 3, pct: 0.775 },
    realization: { ramp: [[5, 0.5], [3, 0.6], [2, 0.7], [1, 0.75], [1, 0.8]], pct: 0.85 },
  },
  {
    reps: 3,
    accumulation: { sets: 6, pct: 0.75 },
    intensification: { ramp: [[1, 0.7], [1, 0.775]], sets: 4, pct: 0.825 },
    realization: { ramp: [[5, 0.5], [3, 0.6], [2, 0.7], [1, 0.75], [1, 0.8], [1, 0.85]], pct: 0.9 },
  },
]

const PLAN: Plan = Object.fromEntries(
  WAVES.flatMap((v, i) => {
    const w = i * 4
    return [
      [w + 1, [work(v.accumulation.sets, v.reps, v.accumulation.pct), plus(v.reps, v.accumulation.pct)]],
      [w + 2, [ramp(v.intensification.ramp), work(v.intensification.sets, v.reps, v.intensification.pct), plus(v.reps, v.intensification.pct)]],
      [w + 3, [ramp(v.realization.ramp), amap(v.reps, v.realization.pct)]],
      [w + 4, [DELOAD]],
    ]
  })
)

const LOWER: Increment = { kg: 2.5, lb: 5 }
const UPPER: Increment = { kg: 1.25, lb: 2.5 }

const mainLift = (id: string, lift: LiftRef, perRep: Increment): SlotSpec => ({
  id,
  lift,
  note: "Follow with supplemental and accessory work of your choice.",
  ...weekByWeek(LENGTH, PLAN),
  progression: { kind: "per-extra-rep", group: "amap", standard: 10, perRep, target: "max" },
})

export const juggernaut2: ProgramFixture = {
  id: "juggernaut-2",
  title: "The Juggernaut Method 2.0 (public rules)",
  source: {
    url: "https://liftvault.com/programs/strength/juggernaut-method-base-template-spreadsheet/",
    author: "Chad Wesley Smith (Juggernaut Training Systems); sheet by Lift Vault",
    terms: "paid-public-rules",
    checked: "2026-10-22",
    notes:
      "The Juggernaut Method 2.0 is a paid e-book (Lift Vault links it for purchase on Amazon). Only the rules Lift Vault publishes for free are used: its page and its 'Juggernaut Method Base Template' Google Sheet (1VF786Bzk-3hoqKr1FZEMtkH7Z1HUsiMj2dQs5PoeDxU), whose Read Me credits 2.0. Weights are CEILING(TM × %, 5); the new TM is CEILING((AMAP reps − standard) × 5 or 2.5 + TM, 5).",
  },
  coverage: "close",
  gaps: [
    "The AMAP reps are counted past each wave's own standard (10, 8, 5, then 3); the rule holds one standard, so it is written as 10 — exact for the 10s wave, and the later waves would count from 10 too.",
    "The sheet's new training max takes effect at the next wave; the engine moves it right after the realization session, so the deload week (4, 8, 12, 16) already uses the raised max.",
    "The sheet rounds every weight and the new training max UP to 5 lb (CEILING); the format rounds to the nearest step or down. The maxes below make every percentage exact.",
    "Supplemental and accessory work is left to the lifter with no sets or reps in the public rules; it is a note.",
  ],
  spec: {
    specVersion: 2,
    name: "The Juggernaut Method 2.0",
    blurb:
      "Sixteen weeks in four waves — 10s, 8s, 5s, 3s — each with an accumulation, an intensification and a realization week ending in an all-out set, then a deload. The all-out set's extra reps raise your training max for the next wave.",
    credit: "by Chad Wesley Smith",
    unit: "lb",
    calendar: {
      days: "in-order",
      weekCounting: "completed",
      lengthWeeks: LENGTH,
      atEnd: "repeat",
      phases: [
        { label: "10s wave", weeks: "1-4" },
        { label: "8s wave", weeks: "5-8" },
        { label: "5s wave", weeks: "9-12" },
        { label: "3s wave", weeks: "13-16" },
      ],
      deloadWeeks: "4,8,12,16",
    },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    maxes: [
      { lift: "squat", kind: "tm", tmPct: 0.9 },
      { lift: "bench", kind: "tm", tmPct: 0.9 },
      { lift: "ohp", kind: "tm", tmPct: 0.9 },
      { lift: "deadlift", kind: "tm", tmPct: 0.9 },
    ],
    days: [
      { id: "squat_day", label: "Squat", slots: [mainLift("squat", { lib: "lib_back_squat" }, LOWER)] },
      { id: "bench_day", label: "Bench press", slots: [mainLift("bench", { lib: "lib_bench_press" }, UPPER)] },
      { id: "ohp_day", label: "Overhead press", slots: [mainLift("ohp", { lib: "lib_ohp" }, UPPER)] },
      { id: "deadlift_day", label: "Deadlift", slots: [mainLift("deadlift", { lib: "lib_deadlift" }, LOWER)] },
    ],
  },
  start: { maxes: { squat: 400, bench: 200, ohp: 200, deadlift: 400 } },
  expect: [
    { week: 1, day: "squat_day", slot: "squat", sets: "4x10@240, 1x10+@240", source: '"10 Rep Wave"!B10:C14 — CEILING(400×0.6, 5) = 240: four ×10, then ×10+' },
    {
      week: 2,
      day: "squat_day",
      slot: "squat",
      sets: "1x5@220, 1x5@250, 2x10@270, 1x10+@270",
      source: '"10 Rep Wave"!F10:G14 — 55%×5 = 220, 62.5%×5 = 250, then 67.5% = 270 ×10, ×10, ×10+',
    },
    {
      week: 3,
      day: "squat_day",
      slot: "squat",
      sets: "1x5@200, 1x3@240, 1x1@280, 1x10+@300",
      source: '"10 Rep Wave"!J10:K13 — 50%×5, 60%×3, 70%×1, then 75% = 300 × AMAP',
    },
    { week: 4, day: "squat_day", slot: "squat", sets: "1x5@160, 1x5@200, 1x5@240", source: '"10 Rep Wave"!N10:O12 — deload 40/50/60% × 5 of the wave\'s TM 400' },
    {
      week: 5,
      day: "bench_day",
      slot: "bench",
      sets: "4x8@130, 1x8+@130",
      source: '"8 Rep Wave"!B4:C8 — CEILING(new TM × 0.65, 5); new TM = CEILING((10 − 10) × 2.5 + 200, 5) = 200 → 130',
    },
    {
      week: 7,
      day: "deadlift_day",
      slot: "deadlift",
      sets: "1x5@200, 1x3@240, 1x2@280, 1x1@300, 1x8+@320",
      source: '"8 Rep Wave"!J22:K26 — 50%×5, 60%×3, 70%×2, 75%×1, 80% × AMAP of TM 400 (no reps past 10 in week 3)',
    },
  ],
}
