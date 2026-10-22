/**
 * The Bridge — Barbell Medicine's free 8-week strength program (Jordan
 * Feigenbaum MD and Austin Baraki MD), as the authors' own eBook "The
 * Bridge.pdf" prints it: Chapter 5, the week tables on pages 15–19, read cell
 * by cell on 2026-10-22.
 *
 * Every lift is written "5 reps @ 6, 5 reps @ 7, 5 reps @ 8 x 3 sets": one set
 * at each lower RPE, then the last RPE for that many sets — the tables'
 * Volume column confirms it (15 reps in week 1, 25 in week 2). Every weight is
 * picked by feel against the RPE; the eBook's chart turns a set into an
 * estimated max, and the aim is to raise it week to week. So every set here is
 * `load: effort`, in three set groups — ramp1, ramp2, work — and each week
 * says what changes. From week 6 the lighter ramps give way to one single @8
 * before the work sets ("1 rep @ 8, 4 reps @ 8 x 3 sets").
 *
 * Training days are the tables' days 1, 3 and 5; GPP day 1 is day 4 every
 * week, GPP day 2 is day 6 from week 5 (with sprints from week 6). Variations
 * rotate in week 5 (close-grip → 3ct paused bench, pin bench in week 7; rack
 * pull → 2ct paused deadlift; paused squat → pin squat; tempo squat → squat
 * without a belt), each its own lift, skipped in the weeks it is not done.
 * The tables' days 1–7 are pinned to Monday–Sunday; the eBook names no
 * weekdays. Week 8 is "Low Stress".
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, NumberOrRange, SetGroup, SlotSpec, WeekOverride } from "@/src/programs/spec/types"
import { formatWeekSet } from "@/src/programs/spec/weeks"

const WEEKS = 8

interface Set1 {
  reps: number
  rpe: number
}
interface Rx {
  ramps: Set1[]
  work: Set1 & { count: NumberOrRange }
}

/**
 * The eBook's notation, shortened: "5@6 5@7 5@8x3" is "5 reps @ 6, 5 reps @ 7,
 * 5 reps @ 8 x 3 sets"; "3@7 3@8 3@9x2-3" is "… x 2-3 sets".
 */
function rx(text: string): Rx {
  const parts = text.split(" ")
  const set = (p: string): Set1 => {
    const [reps, rpe] = p.split("@").map(Number)
    return { reps, rpe }
  }
  const [last, times] = parts[parts.length - 1].split("x")
  const [lo, hi] = times.split("-").map(Number)
  return { ramps: parts.slice(0, -1).map(set), work: { ...set(last), count: hi ? { min: lo, max: hi } : lo } }
}

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
 * One lift in the weeks `table` names, skipped in the others. The first
 * week it is done is the resting shape; every other week writes only what
 * differs from it.
 */
function lift(id: string, ref: LiftRef, table: Record<number, string>, extra: Partial<SlotSpec> = {}): SlotSpec {
  const on = Object.keys(table).map(Number).sort((a, b) => a - b)
  const base = rx(table[on[0]])
  if (base.ramps.length !== 2) throw new Error(`${id}: the first week needs two ramp sets`)
  const group = (gid: string, kind: SetGroup["kind"], s: Set1, count: NumberOrRange): SetGroup => ({
    id: gid,
    kind,
    count,
    reps: s.reps,
    load: { from: "effort" },
    effort: { rpe: s.rpe },
  })
  const sets = [group("ramp1", "working", base.ramps[0], 1), group("ramp2", "working", base.ramps[1], 1), group("work", "working", base.work, base.work.count)]

  const changes: { week: number; change: Omit<WeekOverride, "weeks"> }[] = []
  const diff = (week: number, set: string, was: Set1 & { count?: NumberOrRange }, now: (Set1 & { count?: NumberOrRange }) | undefined) => {
    if (!now) return changes.push({ week, change: { set, skip: true } })
    const change: Omit<WeekOverride, "weeks"> = {
      set,
      ...(now.count != null && JSON.stringify(now.count) !== JSON.stringify(was.count) ? { count: now.count } : {}),
      ...(now.reps !== was.reps ? { reps: now.reps } : {}),
      ...(now.rpe !== was.rpe ? { effort: { rpe: now.rpe } } : {}),
    }
    if (Object.keys(change).length > 1) changes.push({ week, change })
  }
  for (let w = 1; w <= WEEKS; w++) {
    if (!table[w]) {
      for (const g of ["ramp1", "ramp2", "work"]) changes.push({ week: w, change: { set: g, skip: true } })
      continue
    }
    const now = rx(table[w])
    diff(w, "ramp1", base.ramps[0], now.ramps[0])
    diff(w, "ramp2", base.ramps[1], now.ramps[1])
    diff(w, "work", base.work, now.work)
  }
  return {
    id,
    lift: ref,
    sets,
    weeks: merge(changes),
    progression: { kind: "by-effort", group: "work" },
    ...extra,
  }
}

/** Squat w/ belt, day 1. */
const SQUAT = { 1: "5@6 5@7 5@8x1", 2: "5@6 5@7 5@8x3", 3: "5@6 5@7 5@8x3", 4: "5@6 5@7 5@8x4", 5: "4@6 4@7 4@8x3", 6: "1@8 4@8x3", 7: "1@8 3@8x4", 8: "1@8 3@8x2" }

/** "Pull ups, chin ups, or rows x 7 min AMRAP done in submaximal sets", on a GPP day. */
const gppPulls = (id: string, skip?: string): SlotSpec => ({
  id,
  lift: { name: "Pull-ups, chin-ups or rows", loadStyle: "bodyweight" },
  choices: [{ lib: "lib_pull_up" }, { lib: "lib_chin_up" }, { lib: "lib_inverted_row" }, { lib: "lib_db_row" }],
  sets: [
    {
      id: "block",
      kind: "amrap",
      count: 1,
      reps: { seconds: 420 },
      load: { from: "choose" },
      note: "7 minutes: as many reps as possible, in sets you stop short of failure. Not a hold.",
    },
  ],
  ...(skip ? { weeks: [{ weeks: skip, set: "block", skip: true }] } : {}),
  progression: { kind: "hold" },
})

/** "Accumulate max work on isometric ab exercise for 7 minutes." */
const gppAbs = (id: string, skip?: string): SlotSpec => ({
  id,
  lift: { name: "Isometric ab exercise", loadStyle: "bodyweight" },
  choices: [{ lib: "lib_plank" }, { lib: "lib_side_plank" }],
  sets: [
    {
      id: "block",
      kind: "working",
      count: 1,
      reps: { seconds: 420 },
      load: { from: "bodyweight" },
      note: "7 minutes: hold as long a total as you can, resting between holds as needed.",
    },
  ],
  ...(skip ? { weeks: [{ weeks: skip, set: "block", skip: true }] } : {}),
  progression: { kind: "hold" },
})

export const barbellMedicineBridge: ProgramFixture = {
  id: "barbell-medicine-bridge",
  title: "Barbell Medicine: The Bridge",
  source: {
    url: "https://www.dropbox.com/s/ze2q4wrnwduq12x/The%20Bridge.pdf",
    author: "Jordan Feigenbaum MD and Austin Baraki MD (Barbell Medicine)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: Barbell Medicine lists The Bridge under 'Free Programs' (https://www.barbellmedicine.com/the-bridge-2/, an email-form download today). The eBook PDF is the one linked from Barbell Medicine's own 2019 page (https://web.archive.org/web/20190401101549/https://www.barbellmedicine.com/the-bridge/). Chapter 5 tables, pages 15–19; FAQ (ch. 7) for warm-ups.",
  },
  coverage: "close",
  gaps: [
    "GPP's 'Pull ups, chin ups, or rows x 7 min As Many Reps as Possible done in submaximal sets' is a time-capped block of reps; the format has holds in seconds and totals in reps, not 'as many reps as you can in N minutes', so it is a 420 s block with a note.",
    "'Accumulate max work on isometric ab exercise for 7 minutes' is the same kind of block for holds, written the same way.",
  ],
  spec: {
    specVersion: 2,
    name: "The Bridge (Barbell Medicine)",
    blurb:
      "Eight weeks, three lifting days and one or two conditioning days a week. Every set is picked by feel: work up through sets at RPE 6 and 7 (each about 5% heavier) to your work sets at RPE 8 or 9, and try to beat last week's estimated max. Variations rotate in week 5; week 8 is light.",
    credit: "by Jordan Feigenbaum and Austin Baraki, Barbell Medicine",
    unit: "lb",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: 8,
      atEnd: "finish",
      phases: [
        { label: "Low stress", weeks: "1" },
        { label: "Moderate stress", weeks: "2-3" },
        { label: "High stress", weeks: "4" },
        { label: "Moderate stress", weeks: "5-6" },
        { label: "High stress", weeks: "7" },
        { label: "Low stress", weeks: "8" },
      ],
      deloadWeeks: "8",
    },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "d1",
        label: "Day 1",
        weekday: 1,
        slots: [
          lift("d1_squat", { lib: "lib_back_squat", name: "Squat w/ belt" }, SQUAT, {
            note: "Warm up with sets of 5 on the empty bar every minute for 8–10 minutes, then sets of the prescribed reps up to RPE 7; add about 5% for each RPE step after that.",
          }),
          lift("d1_cgbench", { lib: "lib_close_grip_bench", name: "Close Grip Bench" }, {
            1: "4@7 4@8 4@9x1",
            2: "4@7 4@8 4@9x2",
            3: "4@7 4@8 4@9x2",
            4: "4@7 4@8 4@9x3",
          }),
          lift("d1_pause3_bench", { lib: "lib_pause_bench", name: "3ct Paused Bench" }, { 5: "4@7 4@8 4@9x2", 6: "3@7 3@8 3@9x2-3", 8: "3@7 3@8 3@9x1" }),
          lift("d1_pin_bench", { name: "Pin Bench", loadStyle: "barbell" }, { 7: "3@7 3@8 3@9x2-3" }),
          lift("d1_rack_pull", { lib: "lib_rack_pull", name: "Rack Pull, mid shin" }, {
            1: "7@6 7@7 7@8x1",
            2: "7@6 7@7 7@8x2",
            3: "7@7 7@8 7@9x2",
            4: "7@7 7@8 7@9x2",
          }),
          lift("d1_paused_dl", { name: '2ct Paused Deadlift @ 1" off the floor', loadStyle: "barbell" }, {
            5: "4@7 4@8 4@9x2",
            6: "4@7 4@8 4@9x2",
            7: "3@7 3@8 3@9x2",
            8: "3@7 3@8 3@9x1",
          }),
        ],
      },
      {
        id: "d3",
        label: "Day 3",
        weekday: 3,
        slots: [
          lift("d3_paused_squat", { lib: "lib_pause_squat", name: "2ct Paused Squat" }, {
            1: "4@7 4@8 4@9x1",
            2: "4@7 4@8 4@9x2",
            3: "4@7 4@8 4@9x2",
            4: "4@7 4@8 4@9x3",
          }),
          lift("d3_pin_squat", { name: "Pin Squat", loadStyle: "barbell" }, {
            5: "4@7 4@8 4@9x2",
            6: "3@7 3@8 3@9x3",
            7: "3@7 3@8 3@9x3",
            8: "4@7 4@8 4@9x1",
          }),
          lift("d3_press", { lib: "lib_ohp", name: "Press w/ belt" }, {
            1: "5@6 5@7 5@8x1",
            2: "5@6 5@7 5@8x4",
            3: "5@6 5@7 5@8x4",
            4: "5@6 5@7 5@8x4",
            5: "4@6 4@7 4@8x5",
            6: "1@8 4@8x4",
            7: "1@8 3@9x4",
            8: "1@8 3@9x1",
          }),
          lift("d3_rows", { lib: "lib_pendlay_row", name: "Barbell Rows" }, {
            1: "8@6 8@7 8@8x2",
            2: "8@6 8@7 8@8x3",
            3: "8@6 8@7 8@8x3",
            4: "8@6 8@7 8@8x4",
            5: "8@6 8@7 8@8x4",
            6: "6@6 6@7 6@8x4",
            7: "6@6 6@7 6@8x4",
            8: "6@6 6@7 6@8x2",
          }),
        ],
      },
      {
        id: "d4",
        label: "Day 4: GPP day 1",
        weekday: 4,
        slots: [
          gppPulls("d4_pulls"),
          gppAbs("d4_abs"),
          {
            id: "d4_cardio",
            lift: { name: "Steady-state cardio", loadStyle: "bodyweight" },
            sets: [
              {
                id: "steady",
                kind: "working",
                count: 1,
                reps: { seconds: 1500 },
                load: { from: "bodyweight" },
                effort: { rpe: 6 },
                note: "Heart rate about 60–70% of max.",
              },
            ],
            weeks: [{ weeks: "5-8", set: "steady", reps: { seconds: 1800 } }],
            progression: { kind: "hold" },
          },
        ],
      },
      {
        id: "d5",
        label: "Day 5",
        weekday: 5,
        slots: [
          lift("d5_deadlift", { lib: "lib_deadlift", name: "Deadlift w/ belt" }, {
            1: "5@6 5@7 5@8x1",
            2: "5@6 5@7 5@8x3",
            3: "5@6 5@7 5@8x3",
            4: "5@6 5@7 5@8x3",
            5: "4@6 4@7 4@8x3",
            6: "1@8 4@8x3",
            7: "1@8 3@8x4",
            8: "1@8 3@9x1",
          }),
          lift("d5_bench", { lib: "lib_bench_press", name: "Bench Press, 1ct paused" }, {
            1: "5@6 5@7 5@8x1",
            2: "5@6 5@7 5@8x4",
            3: "5@6 5@7 5@8x4",
            4: "5@6 5@7 5@8x5",
            5: "4@6 4@7 4@8x5",
            6: "1@8 4@8x4",
            7: "1@8 3@9x4",
            8: "1@8 3@9x1",
          }),
          lift("d5_tempo_squat", { name: "3-0-3 Tempo Squat", loadStyle: "barbell" }, {
            1: "8@6 8@7 8@8x1",
            2: "8@6 8@7 8@8x2",
            3: "8@7 8@8 8@9x2",
            4: "8@6 8@7 8@8x2",
          }),
          lift("d5_squat_nobelt", { lib: "lib_back_squat", name: "Squat, no belt" }, {
            5: "6@7 6@8 6@9x2",
            6: "6@6 6@7 6@8x4",
            7: "6@6 6@7 6@8x4",
            8: "6@6 6@7 6@8x2",
          }),
        ],
      },
      {
        id: "d6",
        label: "Day 6: GPP day 2 (from week 5)",
        weekday: 6,
        slots: [
          gppPulls("d6_pulls", "1-4"),
          gppAbs("d6_abs", "1-4"),
          {
            id: "d6_sprints",
            lift: { name: "Sprint intervals", loadStyle: "bodyweight" },
            choices: [
              { name: "Rower sprints", loadStyle: "bodyweight" },
              { name: "Assault bike sprints", loadStyle: "bodyweight" },
            ],
            sets: [
              { id: "easy", kind: "warmup", count: 1, reps: { seconds: 300 }, load: { from: "bodyweight" }, note: "Easy warm-up." },
              {
                id: "sprint",
                kind: "working",
                count: 6,
                reps: { seconds: 20 },
                load: { from: "bodyweight" },
                restSec: 100,
                note: "One 20 s sprint at the start of every 2 minutes, for 12 minutes (16 in week 8).",
              },
            ],
            weeks: [
              { weeks: "1-5", set: "easy", skip: true },
              { weeks: "1-5", set: "sprint", skip: true },
              { weeks: "8", set: "sprint", count: 8 },
            ],
            progression: { kind: "hold" },
          },
        ],
      },
    ],
  },
  start: {},
  expect: [
    {
      week: 1,
      day: "d1",
      slot: "d1_squat",
      sets: "1x5@? rpe6, 1x5@? rpe7, 1x5@? rpe8",
      source: "p.15, Week 1 Day 1: 'Squat w/ belt — 5 reps @ 6, 5 reps @ 7, 5 reps @ 8 x 1 set' (Volume 15)",
    },
    {
      week: 4,
      day: "d1",
      slot: "d1_squat",
      sets: "1x5@? rpe6, 1x5@? rpe7, 4x5@? rpe8",
      source: "p.16, Week 4 Day 1: 'Squat w/ belt — 5 reps @ RPE 6, 5 reps @ RPE 7, 5 reps @ RPE 8 x 4 sets' (Volume 30)",
    },
    {
      week: 6,
      day: "d1",
      slot: "d1_squat",
      sets: "1x1@? rpe8, 3x4@? rpe8",
      source: "p.18, Week 6 Day 1: 'Squat w/ belt — 1 rep @ 8, 4 reps @ 8 x 3 sets' (Volume 13)",
    },
    {
      week: 5,
      day: "d1",
      slot: "d1_pause3_bench",
      sets: "1x4@? rpe7, 1x4@? rpe8, 2x4@? rpe9",
      source: "p.17, Week 5 Day 1: '3ct Paused Bench — 4 reps @ 7, 4 reps @ 8, 4 reps @ 9 x 2 sets' (Volume 16)",
    },
    {
      week: 7,
      day: "d1",
      slot: "d1_pin_bench",
      sets: "1x3@? rpe7, 1x3@? rpe8, 2-3x3@? rpe9",
      source: "p.18, Week 7 Day 1: 'Pin Bench — 3 @ 7, 3 @ 8, 3 @ 9 x 2-3 sets'",
    },
    {
      week: 8,
      day: "d5",
      slot: "d5_deadlift",
      sets: "1x1@? rpe8, 1x3@? rpe9",
      source: "p.19, Week 8 Day 5: 'Deadlift w/ belt — 1 @ 8, 3 @ 9 x 1 set' (Volume 4)",
    },
    {
      week: 1,
      day: "d4",
      slot: "d4_cardio",
      sets: "1x1500s@bw rpe6",
      source: "p.15, Week 1 Day 4 (GPP Day 1): '25 minutes of steady state cardio @ RPE 6 (Heart rate ~60-70% max)'",
    },
    {
      week: 6,
      day: "d6",
      slot: "d6_sprints",
      sets: "1x300s@bw, 6x20s@bw",
      source: "p.18, Week 6 Day 6 (GPP Day 2): 'Easy warm up for 5 min, then every 2 min x 12 min, sprint for 20s on rower, assault bike or similar'",
    },
  ],
}
