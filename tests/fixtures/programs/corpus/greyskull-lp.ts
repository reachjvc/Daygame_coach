/**
 * Greyskull LP — John Sheaffer ("Johnny Pain"), as he posted "the gist" on
 * his own forum on 3 Nov 2010 (strengthvillain.com/forum, "greyskull LP",
 * read 2026-10-22 through the Wayback Machine). The book is paid; this file
 * holds only what the public post and his replies in that thread say.
 *
 *   Monday     Bench/ or Press (A/B) 2x5, 1x5+ · Curl 2x10-15 (bench days) · Squat 2x5, 1x5+ · Neck Harness
 *   Wednesday  Bench/ or Press 2x5, 1x5+ · Weighted Chins 2x6-8 (press days) · Deadlift 1x5+ · Neck Harness
 *   Friday     as Monday
 *   Bodyweight chins every day. 5 lb jumps on squat and deadlift, 2.5 lb on
 *   pressing and curls (when rep ranges are satisfied). "When reps on last
 *   set fall below 5, take 10% off of bar and begin process over (on that
 *   lift only)."
 *
 * Bench and press alternate every workout; "the curls are done on benching
 * days regardless of what day of the week, likewise with the weighted
 * chins/pressing days" (Johnny Pain, page 2). That makes a six-workout,
 * two-week rotation, written here as six days worked through in order.
 *
 * The bigger jump: a lifter whose first all-out sets were 185×15 bench and
 * 205×14 squat was told "Go to 195 on your next bench workout … Squat I would
 * go to 215 … Bring both down under ten" (page 4) — +10 lb on each. That is
 * the 15-rep row below; it is a coaching answer, not a numbered rule.
 */

import type { ProgramFixture } from "../fixture"
import type { DaySpec, ProgressionRule, SlotSpec } from "@/src/programs/spec/types"

const LOWER = { kg: 2.5, lb: 5 } as const
const UPPER = { kg: 1.25, lb: 2.5 } as const
const BIG = { kg: 5, lb: 10 } as const

const amrapRule = (inc: { kg: number; lb: number }): ProgressionRule => ({
  kind: "amrap-table",
  group: "amrap",
  table: [
    { minReps: 5, inc },
    { minReps: 15, inc: BIG },
  ],
  target: "working",
  failsBeforeDrop: 1,
  dropPct: 0.1,
})

/** 2×5 then one all-out set of 5+, all at the working weight. */
const twoPlusOne = (id: string, lift: SlotSpec["lift"], stateKey: string, inc: { kg: number; lb: number }): SlotSpec => ({
  id,
  lift,
  stateKey,
  sets: [
    { id: "work", kind: "working", count: 2, reps: 5, load: { from: "working" } },
    { id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: { from: "working" } },
  ],
  progression: amrapRule(inc),
})

const bench = (d: string) => twoPlusOne(`${d}_bench`, { lib: "lib_bench_press" }, "bench", UPPER)
const press = (d: string) => twoPlusOne(`${d}_press`, { lib: "lib_ohp", name: "Press" }, "press", UPPER)
const squat = (d: string) => twoPlusOne(`${d}_squat`, { lib: "lib_back_squat", name: "Squat" }, "squat", LOWER)

const deadlift = (d: string): SlotSpec => ({
  id: `${d}_deadlift`,
  lift: { lib: "lib_deadlift" },
  stateKey: "deadlift",
  note: "With or without power cleans as warm-ups.",
  sets: [{ id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: { from: "working" } }],
  progression: amrapRule(LOWER),
})

const curl = (d: string): SlotSpec => ({
  id: `${d}_curl`,
  lift: { name: "Curl" },
  choices: [{ lib: "lib_barbell_curl" }, { lib: "lib_ez_bar_curl" }, { lib: "lib_db_curl" }],
  stateKey: "curl",
  note: "Bench days only.",
  sets: [{ id: "work", kind: "working", count: 2, reps: { min: 10, max: 15 }, load: { from: "working" } }],
  progression: { kind: "double", inc: UPPER },
})

const weightedChins = (d: string): SlotSpec => ({
  id: `${d}_wchins`,
  lift: { lib: "lib_chin_up", name: "Weighted Chin-up" },
  stateKey: "weighted_chins",
  note: "Press days only, and only if you can do at least 6–8 chin-ups at bodyweight.",
  sets: [{ id: "work", kind: "working", count: 2, reps: { min: 6, max: 8 }, load: { from: "choose" } }],
  progression: { kind: "hold" },
})

const neck = (d: string): SlotSpec => ({
  id: `${d}_neck`,
  lift: { name: "Neck Harness", loadStyle: "free" },
  stateKey: "neck",
  note: "Start with a weight you can do 4×25 with; never fewer than 100 reps in a day; add weight or reps each time.",
  sets: [{ id: "work", kind: "working", count: 4, reps: 25, load: { from: "choose" } }],
  progression: { kind: "hold" },
})

const bwChins = (d: string): SlotSpec => ({
  id: `${d}_chins`,
  lift: { lib: "lib_chin_up" },
  stateKey: "chins",
  note: "Bodyweight chin-ups are done every day, rest days too; how many is yours ('You have to chin to get better at chins').",
  sets: [{ id: "work", kind: "working", count: 1, reps: { atLeast: 1 }, load: { from: "bodyweight" } }],
  progression: { kind: "hold" },
})

const benchDay = (id: string, label: string, lower: "squat" | "deadlift"): DaySpec => ({
  id,
  label,
  slots: [bench(id), curl(id), lower === "squat" ? squat(id) : deadlift(id), neck(id), bwChins(id)],
})
const pressDay = (id: string, label: string, lower: "squat" | "deadlift"): DaySpec => ({
  id,
  label,
  slots: [press(id), weightedChins(id), lower === "squat" ? squat(id) : deadlift(id), neck(id), bwChins(id)],
})

export const greyskullLp: ProgramFixture = {
  id: "greyskull-lp",
  title: "Greyskull LP (Johnny Pain's original)",
  source: {
    url: "https://web.archive.org/web/20191109223836/http://strengthvillain.com/forum/viewtopic.php?f=9&t=89",
    author: "John Sheaffer (Johnny Pain)",
    terms: "paid-public-rules",
    checked: "2026-10-22",
    notes:
      "The Greyskull LP book is sold (strengthvillain.myshopify.com); the author posted the program's gist free on his own forum in 2010, " +
      "quoted again on liftvault.com/programs/strength/greyskull-linear-progression-spreadsheet/. Thread pages 1, 2 and 4 read via web.archive.org.",
  },
  coverage: "close",
  gaps: [
    "Bodyweight chin-ups are 'done every day', rest days included, with no set or rep count; the format has training days only, so they sit on each training day as an open set with a note.",
    "Weighted chins happen only 'if you can do at least 6-8 BW chins' — a condition on the lifter the format cannot test; it is a note.",
    "Neck harness: 'never less than 100 reps in a day … add weight or reps each time' has no preset (it is neither a fixed scheme nor double progression); 4×25 with the weight chosen and a note.",
    "The 15-rep big jump is Johnny Pain's answer to one lifter (bench 185×15 → 195, squat 205×14 → 215, 'bring both down under ten'), not a fixed threshold; encoded as a 15-rep row worth +10 lb on every main lift.",
  ],
  spec: {
    specVersion: 2,
    name: "Greyskull LP",
    blurb:
      "Three days a week. Bench and press alternate every workout, squat Monday and Friday, deadlift Wednesday; the last set of each main lift is as many reps as you can. Below 5 on that set: take 10% off that lift and build back up.",
    credit: "by John Sheaffer (Johnny Pain)",
    unit: "lb",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    // 2.5 lb jumps on the presses and curls: a 5 lb step would round them away.
    rounding: { stepLb: 2.5, stepKg: 1.25, mode: "nearest" },
    days: [
      benchDay("w1_mon", "Week 1 Monday — bench day", "squat"),
      pressDay("w1_wed", "Week 1 Wednesday — press day", "deadlift"),
      benchDay("w1_fri", "Week 1 Friday — bench day", "squat"),
      pressDay("w2_mon", "Week 2 Monday — press day", "squat"),
      benchDay("w2_wed", "Week 2 Wednesday — bench day", "deadlift"),
      pressDay("w2_fri", "Week 2 Friday — press day", "squat"),
    ],
  },
  start: { working: { bench: 135, press: 95, squat: 185, deadlift: 225, curl: 65 } },
  expect: [
    {
      session: 1,
      slot: "w1_mon_bench",
      sets: "2x5@135, 1x5+@135",
      source: "thread p.1 (Johnny Pain, 3 Nov 2010): 'Monday — Bench/ or Press (A/B) 2x 5, 1 x 5+'; start weight is this fixture's",
    },
    {
      session: 1,
      slot: "w1_mon_squat",
      sets: "2x5@185, 1x5+@185",
      source: "thread p.1: 'Squat 2x 5, 1x 5+' Monday and Friday",
    },
    {
      session: 1,
      slot: "w1_mon_curl",
      sets: "2x10-15@65",
      source: "thread p.1: 'Curl 2x 10-15 (bench days)'",
    },
    {
      session: 2,
      slot: "w1_wed_deadlift",
      sets: "1x5+@225",
      source: "thread p.1: 'Wednesday … Deadlift 1x 5+'",
    },
    {
      session: 7,
      slot: "w1_mon_bench",
      sets: "2x5@142.5, 1x5+@142.5",
      source: "thread p.1: '2.5lb jumps on pressing movements'; bench on sessions 1, 3, 5 → 135 + 3 × 2.5",
    },
    {
      session: 7,
      slot: "w1_mon_squat",
      sets: "2x5@205, 1x5+@205",
      source: "thread p.1: '5 lb jumps on Squat'; squat on sessions 1, 3, 4, 6 → 185 + 4 × 5",
    },
    {
      session: 7,
      slot: "w1_mon_curl",
      sets: "2x10-15@72.5",
      source: "thread p.1: '2.5lb jumps on … curls (when rep ranges are satisfied)'; curls on 1, 3, 5 at 15 reps → 65 + 3 × 2.5",
    },
    {
      session: 8,
      slot: "w1_wed_deadlift",
      sets: "1x5+@235",
      source: "thread p.1: '5 lb jumps on … Deadlift'; deadlift on sessions 2, 5 → 225 + 2 × 5",
    },
    {
      session: 8,
      slot: "w1_wed_press",
      sets: "2x5@102.5, 1x5+@102.5",
      source: "thread p.1: 2.5 lb jumps on pressing; press on sessions 2, 4, 6 → 95 + 3 × 2.5",
    },
  ],
}
