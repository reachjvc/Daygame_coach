/**
 * Smolov Jr — the three-week short version of Sergey Smolov's squat cycle, as
 * Lift Vault's free sheet writes it (read cell by cell on 2026-10-22:
 * "Smolov Jr Squat"!A3:E24, Setup!B5:B7).
 *
 * Four days a week at one percentage of the 1RM each (6×6 @ 70, 7×5 @ 75,
 * 8×4 @ 80, 10×3 @ 85), the same every week; week 2 adds a fixed amount to
 * every day and week 3 adds more. Lift Vault's page gives those amounts as
 * ranges (+5–10 lb, +10–20 lb, the lifter's pick); its sheet uses the low
 * ends, +5 lb and +10 lb, and so does this file (+2.5 kg and +5 kg in kg, the
 * sheet's kg plate step).
 *
 * The test is this file's reading: the sheet stops after week 3, and the
 * common rule ("rest 4–7 days, then test", "max at the end of the 4th week")
 * puts a new 1RM on the Saturday of week 4, a week after the last session.
 * The sheet runs the same days for bench or squat; this is the squat tab.
 */

import type { ProgramFixture } from "../fixture"
import type { LoadSpec, SlotSpec } from "@/src/programs/spec/types"

const pctOf1rm = (pct: number): LoadSpec => ({ from: "max", max: "1rm", pct })
const plus = (load: LoadSpec, lb: number): LoadSpec => ({ ...load, plus: { kg: lb / 2, lb } }) as LoadSpec

/** One Smolov Jr day: the same sets every week, heavier in weeks 2 and 3, off in week 4. */
const day = (id: string, count: number, reps: number, pct: number): SlotSpec => ({
  id,
  lift: { lib: "lib_back_squat" },
  stateKey: "squat",
  sets: [{ id: "work", kind: "working", count, reps, load: pctOf1rm(pct) }],
  weeks: [
    { weeks: "2", set: "work", load: plus(pctOf1rm(pct), 5) },
    { weeks: "3", set: "work", load: plus(pctOf1rm(pct), 10) },
    { weeks: "4", set: "work", skip: true },
  ],
  progression: { kind: "hold" },
})

export const smolovJr: ProgramFixture = {
  id: "smolov-jr",
  title: "Smolov Jr (squat)",
  source: {
    url: "https://liftvault.com/programs/powerlifting/smolov/",
    author: "Sergey Smolov (Smolov Jr adaptation; sheet by Lift Vault)",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: Lift Vault's page and its Google Sheet (docs.google.com/spreadsheets/d/1IXzzbbHfPXS6xhJvoC3DDIZYO5Xlsw1hXvDnFu3dMXc) are shared openly, 'Free programs at https://liftvault.com'. Numbers are the sheet's formulas: ROUND(1RM×pct/5)×5, +5 in week 2, +10 in week 3. Weekdays Mon/Wed/Fri/Sat are the sheet's day labels.",
  },
  coverage: "close",
  gaps: [
    "Week 2 adds 5–10 lb and week 3 adds 10–20 lb, whichever the lifter picks (Lift Vault's table); a fixed amount on top of a percentage is one number, so this file uses the sheet's +5 lb and +10 lb.",
  ],
  spec: {
    specVersion: 2,
    name: "Smolov Jr (squat)",
    blurb:
      "Three weeks, four squat days a week: 6×6, 7×5, 8×4 and 10×3 at 70–85% of your max, a little heavier each week. Rest, then test a new max at the end of week 4.",
    credit: "by Sergey Smolov (Smolov Jr)",
    unit: "lb",
    calendar: { days: "weekdays", weekCounting: "calendar", lengthWeeks: 4, atEnd: "finish", testWeeks: "4" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    maxes: [{ lift: "squat", kind: "1rm" }],
    days: [
      { id: "mon", label: "Day 1: 6×6", weekday: 1, slots: [day("mon_squat", 6, 6, 0.7)] },
      { id: "wed", label: "Day 2: 7×5", weekday: 3, slots: [day("wed_squat", 7, 5, 0.75)] },
      { id: "fri", label: "Day 3: 8×4", weekday: 5, slots: [day("fri_squat", 8, 4, 0.8)] },
      {
        id: "sat",
        label: "Day 4: 10×3",
        weekday: 6,
        slots: [
          {
            ...day("sat_squat", 10, 3, 0.85),
            sets: [
              { id: "work", kind: "working", count: 10, reps: 3, load: pctOf1rm(0.85) },
              {
                id: "test",
                kind: "top",
                count: 1,
                reps: 1,
                load: { from: "choose" },
                note: "Test day: work up to a new 1RM after 4–7 days of rest.",
              },
            ],
            weeks: [
              { weeks: "2", set: "work", load: plus(pctOf1rm(0.85), 5) },
              { weeks: "3", set: "work", load: plus(pctOf1rm(0.85), 10) },
              { weeks: "4", set: "work", skip: true },
              { weeks: "1-3", set: "test", skip: true },
            ],
          },
        ],
      },
    ],
  },
  start: { maxes: { squat: 300 } },
  expect: [
    { week: 1, day: "mon", slot: "mon_squat", sets: "6x6@210", source: '"Smolov Jr Squat"!B5:E5 — 70%, 6 reps, 6 sets, ROUND(300×0.7/5)×5 = 210' },
    { week: 1, day: "sat", slot: "sat_squat", sets: "10x3@255", source: '"Smolov Jr Squat"!B8:E8 — 85%, 3 reps, 10 sets = 255' },
    { week: 2, day: "mon", slot: "mon_squat", sets: "6x6@215", source: '"Smolov Jr Squat"!E12 — ROUND(300×0.7/5)×5 + 5 = 215' },
    { week: 3, day: "wed", slot: "wed_squat", sets: "7x5@235", source: '"Smolov Jr Squat"!E20 — ROUND(300×0.75/5)×5 + 10 = 235' },
    { week: 3, day: "sat", slot: "sat_squat", sets: "10x3@265", source: '"Smolov Jr Squat"!E22 — ROUND(300×0.85/5)×5 + 10 = 265' },
    { week: 4, day: "sat", slot: "sat_squat", sets: "1x1@?", source: "Test after 4–7 days' rest — this file's reading of the common rule; the sheet ends at week 3" },
  ],
}
