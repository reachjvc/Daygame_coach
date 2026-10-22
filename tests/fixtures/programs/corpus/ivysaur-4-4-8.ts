/**
 * lvysaur's Beginner 4-4-8 Program — u/lvysaur, r/Fitness, 2016 ("A detailed
 * look at why StrongLifts & Starting Strength aren't great beginner
 * programs, and how to fix them"), read 2026-10-22 from the Wayback Machine's
 * copy of the post and the program image it links (i.imgur.com/SKruJBF.png).
 *
 * Week A                                   Week B
 *   D1 Bench 4x4, Squat 4x8, OHP 4x8, Chinups 4x8       D1 Bench 4x8, Deadlift 4x8, OHP 4x4, Rows 4x4
 *   D2 Bench 4x8, Deadlift 4x4, OHP 4x4, Rows 4x8       D2 Bench 4x4, Squat 4x8, OHP 4x8, Chinups 4x8
 *   D3 Bench 3x4+1xAMRAP, Squat 3x4+1xAMRAP,            D3 Bench 4x8, Deadlift 3x4+1xAMRAP,
 *      OHP 4x8, Chinups 4x4                                OHP 3x4+1xAMRAP, Rows 4x8
 *
 * "Progression Rate: Squat/Deadlift 15lb/week, Bench/Rows 10lb/week, Overhead
 * Press 5lb/week. 8 rep weight = 90% of 4 rep weight. If you hit 8+ reps on an
 * AMRAP set, double next week's progression rate for that exercise."
 * Deload after failure: "10% as a beginner".
 *
 * How it is written here: Week A and Week B are weeks 1 and 2 of a repeating
 * two-week calendar, Monday/Wednesday/Friday. Each lift's "4 rep weight" is
 * a 4-rep max; the 4s are 100% of it, the 8s 90%. The weekly add is a
 * once-a-rotation bump of two weeks' worth after the lift's last session of
 * Week B, plus one week's worth laid on Week B's loads (90% of it on the 8s,
 * because the 8s are 90% of that week's 4s). That gives the same numbers as
 * Lift Vault's spreadsheet of this program, which keeps the weight fixed
 * inside a week and adds the rate every week.
 */

import type { ProgramFixture } from "../fixture"
import type { DaySpec, Increment, LoadSpec, SetGroup, SlotSpec, WeekOverride } from "@/src/programs/spec/types"

type Lift = "bench" | "squat" | "deadlift" | "ohp" | "rows"

/** The weekly rate from the program image; kg is Lift Vault's halving. */
const RATE: Record<Lift, Increment> = {
  bench: { lb: 10, kg: 5 },
  squat: { lb: 15, kg: 7.5 },
  deadlift: { lb: 15, kg: 7.5 },
  ohp: { lb: 5, kg: 2.5 },
  rows: { lb: 10, kg: 5 },
}
const LIFT_REF: Record<Lift, SlotSpec["lift"]> = {
  bench: { lib: "lib_bench_press" },
  squat: { lib: "lib_back_squat", name: "Squat" },
  deadlift: { lib: "lib_deadlift" },
  ohp: { lib: "lib_ohp" },
  rows: { lib: "lib_barbell_row" },
}

const times = (inc: Increment, f: number): Increment => ({ lb: Math.round(inc.lb * f * 100) / 100, kg: Math.round(inc.kg * f * 100) / 100 })

/** A scheme in one week: 4x4, 4x8, the 3x4+AMRAP day, or not on this day. */
type Scheme = "4x4" | "4x8" | "amrap" | null

const load = (lift: Lift, scheme: "4x4" | "4x8" | "amrap", weekB: boolean): LoadSpec => ({
  from: "max",
  max: "rm",
  pct: scheme === "4x8" ? 0.9 : 1,
  ...(weekB ? { plus: times(RATE[lift], scheme === "4x8" ? 0.9 : 1) } : {}),
})

const groupsFor = (lift: Lift, scheme: "4x4" | "4x8" | "amrap", weekB: boolean): SetGroup[] =>
  scheme === "amrap"
    ? [
        { id: "main", kind: "working", count: 3, reps: 4, load: load(lift, scheme, weekB) },
        { id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 4 }, load: load(lift, scheme, weekB) },
      ]
    : [{ id: "main", kind: "working", count: 4, reps: scheme === "4x4" ? 4 : 8, load: load(lift, scheme, weekB) }]

/**
 * One lift on one weekday, in Week A (week 1) and Week B (week 2). The
 * written sets are the first week the lift is on this day; the other week
 * changes them or skips them.
 */
function lift(day: string, name: Lift, a: Scheme, b: Scheme, bump: boolean): SlotSpec {
  const baseWeek = a != null ? "1" : "2"
  const otherWeek = baseWeek === "1" ? "2" : "1"
  const baseScheme = (a ?? b)!
  const otherScheme = baseWeek === "1" ? b : null
  const sets = groupsFor(name, baseScheme, baseWeek === "2")
  const weeks: WeekOverride[] = []
  // An all-out set that only the OTHER week has is written once and skipped here.
  const amrapWeek = a === "amrap" ? "1" : b === "amrap" ? "2" : null
  if (amrapWeek != null && baseScheme !== "amrap") {
    sets.push(groupsFor(name, "amrap", amrapWeek === "2").find((g) => g.id === "amrap")!)
    weeks.push({ weeks: baseWeek, set: "amrap", skip: true })
  }
  if (otherScheme == null) {
    for (const g of sets) weeks.push({ weeks: otherWeek, set: g.id, skip: true })
  } else {
    const main = groupsFor(name, otherScheme, otherWeek === "2").find((g) => g.id === "main")!
    weeks.push({ weeks: otherWeek, set: "main", count: main.count, reps: main.reps, load: main.load })
    if (baseScheme === "amrap" && otherScheme !== "amrap") weeks.push({ weeks: otherWeek, set: "amrap", skip: true })
  }
  return {
    id: `${day}_${name}`,
    lift: LIFT_REF[name],
    stateKey: name,
    sets,
    weeks,
    // No `group`: the all-out set is in one week of the rotation and the
    // bump comes after the other; every set of the lift is judged, and a
    // missed all-out set is carried from the week it happened.
    progression: bump ? { kind: "cycle-bump", inc: times(RATE[name], 2), missDropPct: 0.1 } : { kind: "hold" },
  }
}

/** Chin-ups at bodyweight: 4x8 or 4x4, or not on this day. */
function chins(day: string, a: 4 | 8 | null, b: 4 | 8 | null): SlotSpec {
  const reps = (a ?? b)!
  const weeks: WeekOverride[] = []
  if (a == null) weeks.push({ weeks: "1", set: "main", skip: true })
  else if (b == null) weeks.push({ weeks: "2", set: "main", skip: true })
  else if (b !== a) weeks.push({ weeks: "2", set: "main", reps: b })
  return {
    id: `${day}_chins`,
    lift: { lib: "lib_chin_up" },
    stateKey: "chins",
    note: "Can't do them: 30° bent-over rows with a supinated grip. More than 4/8 easily: weighted chin-ups.",
    sets: [{ id: "main", kind: "working", count: 4, reps, load: { from: "bodyweight" } }],
    weeks,
    progression: { kind: "hold" },
  }
}

const days: DaySpec[] = [
  {
    id: "mon",
    label: "Day 1",
    weekday: 1,
    slots: [
      lift("mon", "bench", "4x4", "4x8", false),
      lift("mon", "squat", "4x8", null, false),
      lift("mon", "deadlift", null, "4x8", false),
      lift("mon", "ohp", "4x8", "4x4", false),
      chins("mon", 8, null),
      lift("mon", "rows", null, "4x4", false),
    ],
  },
  {
    id: "wed",
    label: "Day 2",
    weekday: 3,
    slots: [
      lift("wed", "bench", "4x8", "4x4", false),
      // Week B's only squat: the squat's bump follows it.
      lift("wed", "squat", null, "4x8", true),
      lift("wed", "deadlift", "4x4", null, false),
      lift("wed", "ohp", "4x4", "4x8", false),
      lift("wed", "rows", "4x8", null, false),
      chins("wed", null, 8),
    ],
  },
  {
    id: "fri",
    label: "Day 3",
    weekday: 5,
    slots: [
      lift("fri", "bench", "amrap", "4x8", true),
      lift("fri", "squat", "amrap", null, false),
      lift("fri", "deadlift", null, "amrap", true),
      lift("fri", "ohp", "4x8", "amrap", true),
      chins("fri", 4, null),
      lift("fri", "rows", null, "4x8", true),
    ],
  },
]

export const ivysaur448: ProgramFixture = {
  id: "ivysaur-4-4-8",
  title: "lvysaur's Beginner 4-4-8 Program",
  source: {
    url: "https://web.archive.org/web/2016/https://www.reddit.com/r/Fitness/comments/4uijsl/a_detailed_look_at_why_stronglifts_starting/",
    author: "u/lvysaur",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Posted free on r/Fitness (2016); the program itself is the image http://i.imgur.com/SKruJBF.png linked from the post. " +
      "Week-by-week numbers checked against Lift Vault's free sheet of it (liftvault.com/programs/strength/ivysaur-spreadsheet/, 'Weekly Weights' tab, Setup defaults bench 150, squat 210, OHP 95, rows 135, deadlift 200, rounding 5). " +
      "The image's 'Extra Credit' (5 sets, chin-ups every workout, 2 squat sets on deadlift days) is optional and not encoded.",
  },
  coverage: "close",
  gaps: [
    "'If you hit 8+ reps on an AMRAP set, double next week's progression rate' has no preset: the once-a-rotation bump has a fixed size. A table of AMRAP reps → bump size on `cycle-bump` would say it.",
    "The post asks for the 'smallest incremental jumps possible between workouts to meet the weekly goal' — the weight creeps up inside the week. Encoded as Lift Vault's sheet does it: fixed inside a week, +rate each week; the per-workout split is the lifter's.",
    "The weekly add inside the two-week rotation is written as a Week-B `plus` on the loads (the rate on the 4s, 90% of it on the 8s) over a bump of two weeks' worth after Week B; a `cycle-bump` that fired every calendar week would say it directly.",
    "Deload '10% as a beginner' after failure: the bump's miss rule only looks at the all-out sets, and rows have none, so a missed set of rows or of a 4×4/4×8 does not trigger it.",
  ],
  spec: {
    specVersion: 2,
    name: "lvysaur's 4-4-8",
    blurb:
      "Three full-body days a week, alternating a Week A and a Week B. Bench and overhead press every day; heavy 4×4 and lighter 4×8 (90%) trade places; one all-out set a week per main lift decides how fast you move.",
    credit: "by u/lvysaur",
    unit: "lb",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: 2, atEnd: "repeat", phases: [{ label: "Week A", weeks: "1" }, { label: "Week B", weeks: "2" }] },
    maxes: (["bench", "squat", "deadlift", "ohp", "rows"] as const).map((l) => ({ lift: l, kind: "rm" as const, reps: 4 })),
    rounding: { stepLb: 5, stepKg: 2.5, mode: "nearest" },
    days,
  },
  start: { maxes: { bench: 150, squat: 210, ohp: 95, rows: 135, deadlift: 200 } },
  expect: [
    {
      week: 1,
      day: "mon",
      slot: "mon_bench",
      sets: "4x4@150",
      source: "image, Week A Day 1: 'Bench 4x4'; Lift Vault sheet Week A!D6 = 150 (Setup!B3)",
    },
    {
      week: 1,
      day: "mon",
      slot: "mon_squat",
      sets: "4x8@190",
      source: "image: '8 rep weight = 90% of 4 rep weight' → 0.9 × 210 = 189 → 190; sheet Week A!D7 = 190",
    },
    {
      week: 1,
      day: "mon",
      slot: "mon_ohp",
      sets: "4x8@85",
      source: "image, Week A Day 1: 'Overhead Press 4x8'; 0.9 × 95 = 85.5 → 85; sheet Week A!D8 = 85",
    },
    {
      week: 1,
      day: "fri",
      slot: "fri_squat",
      sets: "3x4@210, 1x4+@210",
      source: "image, Week A Day 3: 'Squat 3x4 + 1xAMRAP'; sheet Week A!D21 = 210",
    },
    {
      week: 2,
      day: "mon",
      slot: "mon_deadlift",
      sets: "4x8@195",
      source: "image: deadlift 15lb/week, Week B Day 1 'Deadlift 4x8' → 0.9 × (200 + 15) = 193.5 → 195; sheet Week B!D7 = 195",
    },
    {
      week: 2,
      day: "mon",
      slot: "mon_rows",
      sets: "4x4@145",
      source: "image: rows 10lb/week, Week B Day 1 'Barbell Rows 4x4' → 135 + 10; sheet Week B!D9 = 145",
    },
    {
      week: 2,
      day: "fri",
      slot: "fri_ohp",
      sets: "3x4@100, 1x4+@100",
      source: "image: OHP 5lb/week, Week B Day 3 'Overhead Press 3x4 + 1xAMRAP' → 95 + 5; sheet Week B!D22 = 100",
    },
    {
      week: 5,
      day: "mon",
      slot: "mon_bench",
      sets: "4x4@190",
      source: "image: bench 10lb/week → 150 + 4 × 10 in week 5 (Week A); sheet 'Weekly Weights'!G3 = 190",
    },
    {
      week: 5,
      day: "mon",
      slot: "mon_squat",
      sets: "4x8@245",
      source: "image: squat 15lb/week → 0.9 × (210 + 4 × 15) = 243 → 245; sheet 'Weekly Weights'!G10 = 245",
    },
    {
      week: 5,
      day: "fri",
      slot: "fri_squat",
      sets: "3x4@270, 1x4+@270",
      source: "image: squat 15lb/week → 210 + 4 × 15 = 270; sheet 'Weekly Weights'!G4 = 270",
    },
  ],
}
