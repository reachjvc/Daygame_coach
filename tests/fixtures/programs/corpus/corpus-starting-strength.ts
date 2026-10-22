/**
 * Starting Strength novice linear progression — Mark Rippetoe, as the rules
 * are published free on startingstrength.com/get-started/programs (read
 * 2026-10-22 through the Wayback Machine; the live page sits behind a bot
 * check). The book "Starting Strength: Basic Barbell Training" is paid; only
 * what that public page and the site's own article on resets say is used.
 *
 * Phase 1 (the start, "usually 1–3 weeks"): Day A and Day B are the same —
 * Squat 3×5, Press or Bench 3×5, Deadlift 1×5 — "except that the press and
 * bench press alternate". Three non-consecutive days a week. Add weight every
 * workout; after the first few big jumps "jumps become 5 lbs per workout",
 * and later "2.5 lb or smaller jumps … when 5 lbs becomes too much".
 *
 * Stalls: "The Reset: Why and How" (Rori Alter, startingstrength.com, 2018):
 * missed reps at the same load two workouts in a row → reset 5%.
 *
 * Phases 2 and 3 are NOT in the spec (see gaps): the format cannot switch
 * the days when the lifter's deadlift "is now heavy enough".
 */

import type { ProgramFixture } from "../fixture"
import type { SlotSpec } from "@/src/programs/spec/types"

const PROGRESS = {
  kind: "add-on-success",
  inc: { kg: 2.5, lb: 5 },
  afterStallInc: { kg: 1.25, lb: 2.5 },
  failsBeforeDrop: 2,
  dropPct: 0.05,
} as const

const threeByFive = (id: string, lift: SlotSpec["lift"], extra: Partial<SlotSpec> = {}): SlotSpec => ({
  id,
  lift,
  sets: [{ id: "work", kind: "working", count: 3, reps: 5, load: { from: "working" } }],
  progression: PROGRESS,
  ...extra,
})

const deadlift = (id: string): SlotSpec => ({
  id,
  lift: { lib: "lib_deadlift" },
  stateKey: "deadlift",
  sets: [{ id: "work", kind: "working", count: 1, reps: 5, load: { from: "working" } }],
  progression: PROGRESS,
})

const WORKSETS = "Work sets only; warm up to them."

export const corpusStartingStrength: ProgramFixture = {
  id: "corpus-starting-strength",
  title: "Starting Strength novice program (Phase 1)",
  source: {
    url: "https://startingstrength.com/get-started/programs",
    author: "Mark Rippetoe (Starting Strength)",
    terms: "paid-public-rules",
    checked: "2026-10-22",
    notes:
      "The book is sold; the novice program's phases, sets, reps and jump sizes are on the free page startingstrength.com/get-started/programs " +
      "(read via web.archive.org, 2025 capture). The reset rule is the site's free article https://startingstrength.com/article/the-reset-why-and-how. " +
      "The '10% after three stalls' rule often quoted for Starting Strength is from Practical Programming (paid) via forum posts; the site's own article says 5% after two.",
  },
  coverage: "close",
  gaps: [
    "Phase 2 (Day B's deadlift becomes Power Clean 5×3) and Phase 3 (Day A alternates Deadlift 1×5 and Power Clean 5×3; Day B gets chin-ups, weighted 3×5 every other chin day once 3×10 at bodyweight is done) begin when the lifter's pulls get heavy — 'several weeks to several months' — not on a week number; the format's phases are week labels on a fixed calendar, so only Phase 1 is encoded.",
    "Early jumps are bigger: 'add 10 lbs to the squat the first 2-3 times', '15-20 lbs to the deadlift the first couple times, and 10 lbs the next several times', maybe one 10 lb jump on press and bench. The format has one jump per lift plus one smaller jump after a stall, so the steady 5 lb is encoded.",
    "The first stall also changes the program, not only the weight: a light squat day (80% of Day 1's load for 2×5), or 5×3 on squat/bench/press and 2×3 or a triple with back-offs on the deadlift; a second stall at the same load ends the novice phase for that lift. None of these can be triggered by a stall in the format.",
    "'Advanced novice': squat weight goes up only twice a week with a lighter Wednesday — again a lifter's decision, not a week number.",
  ],
  spec: {
    specVersion: 2,
    name: "Starting Strength (novice, Phase 1)",
    blurb:
      "Three full-body workouts a week on non-consecutive days. Squat every time, press and bench press alternating, one heavy set of deadlifts. Add weight every workout.",
    credit: "by Mark Rippetoe",
    unit: "lb",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    // 2.5 lb is the page's own small jump; a 5 lb step would round it away.
    rounding: { stepLb: 2.5, stepKg: 1.25, mode: "nearest" },
    days: [
      {
        id: "a",
        label: "Day A",
        slots: [
          threeByFive("a_squat", { lib: "lib_back_squat", name: "Squat" }, { stateKey: "squat", note: WORKSETS }),
          threeByFive("press", { lib: "lib_ohp", name: "Press" }, { note: WORKSETS }),
          deadlift("a_deadlift"),
        ],
      },
      {
        id: "b",
        label: "Day B",
        slots: [
          threeByFive("b_squat", { lib: "lib_back_squat", name: "Squat" }, { stateKey: "squat", note: WORKSETS }),
          threeByFive("bench", { lib: "lib_bench_press" }, { note: WORKSETS }),
          deadlift("b_deadlift"),
        ],
      },
    ],
  },
  start: { working: { squat: 135, press: 75, bench: 115, deadlift: 185 } },
  expect: [
    {
      session: 1,
      slot: "a_squat",
      sets: "3x5@135",
      source: "programs page, Phase 1 table: 'Squat 5 reps x 3 sets' (work sets); start weight is this fixture's",
    },
    {
      session: 1,
      slot: "press",
      sets: "3x5@75",
      source: "Phase 1 notes: 'if you began the program on Monday and pressed, you'll bench press Wednesday and press again Friday'",
    },
    {
      session: 2,
      slot: "b_deadlift",
      sets: "1x5@190",
      source: "Phase 1 table: 'Deadlift 5 reps x 1 set' on both days; +5 lb a workout → 185 + 5",
    },
    {
      session: 5,
      slot: "a_squat",
      sets: "3x5@155",
      source: "General Notes: 'jumps become 5 lbs per workout'; squat every workout → 135 + 4 × 5",
    },
    {
      session: 5,
      slot: "press",
      sets: "3x5@85",
      source: "General Notes: 5 lb jumps on the press; press on sessions 1, 3, 5 → 75 + 2 × 5",
    },
    {
      session: 5,
      slot: "a_deadlift",
      sets: "1x5@205",
      source: "Phase 1: deadlift every workout, +5 lb → 185 + 4 × 5",
    },
    {
      session: 6,
      slot: "bench",
      sets: "3x5@125",
      source: "General Notes: 5 lb jumps on the bench press; bench on sessions 2, 4, 6 → 115 + 2 × 5",
    },
  ],
}
