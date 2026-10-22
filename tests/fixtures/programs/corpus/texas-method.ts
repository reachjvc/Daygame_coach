/**
 * The Texas Method — Mark Rippetoe's intermediate week (credited to Glenn
 * Pendlay's athletes at Wichita Falls), from Rippetoe's own article.
 *
 * Monday is volume: squat 5×5 and bench or press 5×5 "with about 90% of
 * 5RM", then one heavy set of 5 deadlifts that "should increase every week".
 * Wednesday is recovery: squat 2×5 at "80% of Monday's work weight", the
 * other press for 3 sets "a little lighter" than its last 5×5, chin-ups 3
 * sets to failure (5 minutes apart), back extensions or glute-ham raises 5×10.
 * Friday is intensity: a new 5-rep max on the squat and on Monday's press,
 * then power cleans 5×3. Bench and press "alternate every other Monday", so
 * the days run as a two-week list, A then B.
 *
 * The numbers live on Friday. Friday's squat, bench and press are the working
 * weights (shared keys across A and B) and go up 5 lb each time they are made;
 * Monday reads 90% of that weight and Wednesday 72% (80% of Monday's 90%).
 * With Friday's squat at 350, Monday is the article's own example: "if your
 * 5 rep max squat is 345, then 315 x 5 x 5 would be Monday's squat workout".
 *
 * This file's readings, said so: +5 lb a week (the article only says loads go
 * up "every week instead of every workout"; 5 lb is what it gives for squats
 * and deadlifts in the novice phase), the same +5 lb for deadlifts and power
 * cleans, and no drop on a miss (the article gives no stall rule).
 */

import type { ProgramFixture } from "../fixture"
import type { LoadSpec, ProgressionRule, SlotSpec } from "@/src/programs/spec/types"

const HOLD = { kind: "hold" } as const
const choose = { from: "choose" } as const
const working = { from: "working" } as const
const bodyweight = { from: "bodyweight" } as const

/** Up 5 lb when the set is made; a miss holds the weight. */
const weekly: ProgressionRule = { kind: "add-on-success", inc: { kg: 2.5, lb: 5 }, failsBeforeDrop: 3, dropPct: 0 }

const squat = { lib: "lib_back_squat", name: "Squat" }
const bench = { lib: "lib_bench_press", name: "Bench Press" }
const press = { lib: "lib_ohp", name: "Press" }

const sets = (id: string, count: number, reps: number, load: LoadSpec): SlotSpec["sets"] => [
  { id, kind: "working", count, reps, load },
]

/** Monday: 5×5 across at 90% of this week's Friday weight. */
const volume = (id: string, lift: SlotSpec["lift"], of: string): SlotSpec => ({
  id,
  lift,
  note: "Five sets of five across, about 90% of your 5-rep max.",
  sets: sets("work", 5, 5, { from: "working", pct: 0.9, of }),
  progression: HOLD,
})

/** Friday: one set of 5 at a new 5-rep max. */
const intensity = (id: string, lift: SlotSpec["lift"], stateKey: string): SlotSpec => ({
  id,
  lift,
  stateKey,
  note: "A new 5-rep max, or within 2% of one. Warm up light, then doubles or singles up to it.",
  sets: sets("work", 1, 5, working),
  progression: weekly,
})

const deadlift = (id: string): SlotSpec => ({
  id,
  lift: { lib: "lib_deadlift", name: "Deadlift" },
  stateKey: "deadlift",
  note: "One heavy set of 5 after the squats and presses. Keep any other assistance to brief arm work.",
  sets: sets("work", 1, 5, working),
  progression: weekly,
})

const lightSquat = (id: string): SlotSpec => ({
  id,
  lift: squat,
  note: "80% of Monday's squat.",
  sets: sets("work", 2, 5, { from: "working", pct: 0.72, of: "squat" }),
  progression: HOLD,
})

const lightPress = (id: string, lift: SlotSpec["lift"], what: string): SlotSpec => ({
  id,
  lift,
  note: `A little lighter than your last ${what} 5×5: feel the load without digging into recovery.`,
  sets: sets("work", 3, 5, choose),
  progression: HOLD,
})

const chins = (id: string): SlotSpec => ({
  id,
  lift: { lib: "lib_chin_up" },
  sets: [{ id: "work", kind: "amrap", count: 3, reps: { atLeast: 1 }, load: bodyweight, restSec: 300, note: "To failure." }],
  progression: HOLD,
})

const backExtensions = (id: string): SlotSpec => ({
  id,
  lift: { lib: "lib_back_extension" },
  choices: [{ lib: "lib_back_extension" }, { lib: "lib_glute_ham_raise" }],
  note: "Optional if you are tired.",
  sets: sets("work", 5, 10, bodyweight),
  progression: HOLD,
})

const powerCleans = (id: string): SlotSpec => ({
  id,
  lift: { name: "Power Clean", loadStyle: "barbell" },
  stateKey: "power_clean",
  note: "Five sets of 3 across, or power snatches for 6 doubles.",
  sets: sets("work", 5, 3, working),
  progression: weekly,
})

export const texasMethod: ProgramFixture = {
  id: "texas-method",
  title: "The Texas Method",
  source: {
    url: "https://startingstrength.com/article/the_texas_method",
    author: "Mark Rippetoe",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Rippetoe's free article on startingstrength.com (May 2013; first on T-Nation 2010); startingstrength.com refuses automated reads, so it was read in full at " +
      "https://web.archive.org/web/20231002043304/https://startingstrength.com/article/the_texas_method . The program is also in the paid Practical Programming; " +
      "everything here is from the article except the 5 lb weekly step.",
  },
  coverage: "close",
  gaps: [
    "Wednesday's squat is '80% of Monday's work weight'; Monday's weight is not stored, so it is written as 72% of Friday's weight, which can round one step away from 80% of Monday's rounded weight.",
    "Friday's pull is 'power cleans for 5 sets of 3 across, or power snatches for 6 doubles'; a choice of lift cannot carry its own sets, so only the power clean is written and the snatch is a note.",
  ],
  spec: {
    specVersion: 2,
    name: "The Texas Method",
    blurb:
      "Three days a week: heavy volume on Monday, a light recovery day on Wednesday, and a new 5-rep max on Friday. Squat every day; bench and press take turns week by week. Deadlift once on Monday, power clean on Friday.",
    credit: "by Mark Rippetoe, after Glenn Pendlay's lifters",
    unit: "lb",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "a_mon",
        label: "Week A Monday: volume, bench",
        slots: [volume("a_mon_squat", squat, "squat"), volume("a_mon_bench", bench, "bench"), deadlift("a_mon_deadlift")],
      },
      {
        id: "a_wed",
        label: "Week A Wednesday: recovery, press",
        slots: [lightSquat("a_wed_squat"), lightPress("a_wed_press", press, "press"), chins("a_wed_chins"), backExtensions("a_wed_back")],
      },
      {
        id: "a_fri",
        label: "Week A Friday: intensity, bench",
        slots: [intensity("a_fri_squat", squat, "squat"), intensity("a_fri_bench", bench, "bench"), powerCleans("a_fri_clean")],
      },
      {
        id: "b_mon",
        label: "Week B Monday: volume, press",
        slots: [volume("b_mon_squat", squat, "squat"), volume("b_mon_press", press, "press"), deadlift("b_mon_deadlift")],
      },
      {
        id: "b_wed",
        label: "Week B Wednesday: recovery, bench",
        slots: [lightSquat("b_wed_squat"), lightPress("b_wed_bench", bench, "bench"), chins("b_wed_chins"), backExtensions("b_wed_back")],
      },
      {
        id: "b_fri",
        label: "Week B Friday: intensity, press",
        slots: [intensity("b_fri_squat", squat, "squat"), intensity("b_fri_press", press, "press"), powerCleans("b_fri_clean")],
      },
    ],
  },
  // Friday's weights: the 5-rep max each lift goes for in its first week.
  start: { working: { squat: 350, bench: 250, press: 150, deadlift: 400, power_clean: 185 } },
  expect: [
    {
      session: 1,
      day: "a_mon",
      slot: "a_mon_squat",
      sets: "5x5@315",
      source: "Monday: '5 sets of 5 across … about 90% of 5RM; if your 5 rep max squat is 345, then 315 x 5 x 5' (90% of Friday's 350 = 315)",
    },
    {
      session: 1,
      day: "a_mon",
      slot: "a_mon_bench",
      sets: "5x5@225",
      source: "Monday: 'The bench press and the press … alternate every other Monday for 5 x 5 with about 90% of 5RM' — 90% of 250",
    },
    {
      session: 2,
      day: "a_wed",
      slot: "a_wed_squat",
      sets: "2x5@250",
      source: "Wednesday: 'Squats are 80% of Monday's work weight for 2 sets of 5' — 80% of 315 = 252 → 250",
    },
    {
      session: 3,
      day: "a_fri",
      slot: "a_fri_squat",
      sets: "1x5@350",
      source: "Friday: 'a new 5RM, or close to it' — 345 + 5",
    },
    {
      session: 4,
      day: "b_mon",
      slot: "b_mon_squat",
      sets: "5x5@320",
      source: "Next Monday after a made Friday: 90% of 355 = 319.5 → 320",
    },
    {
      session: 4,
      day: "b_mon",
      slot: "b_mon_press",
      sets: "5x5@135",
      source: "Week B Monday press 5×5 at about 90% of 5RM: 90% of 150",
    },
    {
      session: 6,
      day: "b_fri",
      slot: "b_fri_press",
      sets: "1x5@150",
      source: "Week B Friday: a new 5RM on the press",
    },
    {
      session: 7,
      day: "a_mon",
      slot: "a_mon_bench",
      sets: "5x5@230",
      source: "Week A again: bench Friday weight 250 → 255 after session 3; 90% = 229.5 → 230",
    },
    {
      session: 7,
      day: "a_mon",
      slot: "a_mon_deadlift",
      sets: "1x5@410",
      source: "Monday deadlift 'should increase every week': 400, 405, 410",
    },
  ],
}
