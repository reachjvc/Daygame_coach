/**
 * ONE RULE FOR "WEIGHT MOVED", AND FOUR PLACES THAT USED TO GUESS AT IT.
 *
 * The History month total, each History row's summary, the weekly chart and
 * the finish summary each multiplied weight by reps themselves. Three of the
 * four left warm-ups out; exactly ONE left timed lifts out — and the chart's
 * own comment claimed the finish summary did too.
 *
 * Seconds are stored in the same column as reps, so that one difference is
 * enormous: a 3 × 30 s farmer's carry at 40 kg is 3,600 kg if you multiply it,
 * which outranks a 5 × 5 squat at 100 kg on the chart the feature exists for.
 * The same session read 3,600 on the finish screen and 0 on the chart.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { setVolumeKg, weeklyVolume, workingVolumeKg } from "@/src/health/healthService"
import { isTimedLift } from "@/src/programs/data/exerciseLibrary"
import type { WorkoutLogWithSets, WorkoutSetRow } from "@/src/health/types"

const set = (over: Partial<WorkoutSetRow>): WorkoutSetRow =>
  ({
    id: "s1",
    log_id: "w1",
    exercise: "Squat",
    weight_kg: 100,
    reps: 5,
    set_number: 1,
    set_kind: "working",
    exercise_id: null,
    library_id: null,
    prescribed_index: null,
    completed_at: null,
    rpe: null,
    side: null,
    notes: null,
    exercise_notes: null,
    ...over,
  }) as WorkoutSetRow

/** Farmer Carry 40 kg × 30 s × 3, plus Squat 100 × 5 × 5. Weight moved: 2,500. */
const MIXED_SESSION: WorkoutSetRow[] = [
  ...[1, 2, 3].map((n) =>
    set({ id: `c${n}`, exercise: "Farmer's Carry", weight_kg: 40, reps: 30, set_number: n })
  ),
  ...[1, 2, 3, 4, 5].map((n) => set({ id: `s${n}`, exercise: "Squat", weight_kg: 100, reps: 5, set_number: n })),
]

describe("what one set moved", () => {
  it("is weight times reps for a working set", () => {
    expect(setVolumeKg(set({ weight_kg: 100, reps: 5 }))).toBe(500)
  })

  it("is nothing for a warm-up or a drop set, which are not the work", () => {
    expect(setVolumeKg(set({ set_kind: "warmup" }))).toBe(0)
    expect(setVolumeKg(set({ set_kind: "drop" }))).toBe(0)
  })

  it("is nothing for a lift measured in seconds, however heavy it was", () => {
    // 40 kg for 30 seconds is real work and is not 1,200 kg of it.
    expect(setVolumeKg(set({ exercise: "Farmer's Carry", weight_kg: 40, reps: 30 }))).toBe(0)
  })

  it("knows a timed lift by its library id when the name has been changed", () => {
    // A name somebody typed can be anything; the id is the lift's identity.
    expect(isTimedLift({ exercise: "Heavy walk", library_id: "lib_farmer_carry" })).toBe(true)
    expect(isTimedLift({ exercise: "Farmer's Carry" })).toBe(true)
    expect(isTimedLift({ exercise: "Squat" })).toBe(false)
  })

  it("adds up to the same figure for the session, the week and the finish", () => {
    expect(workingVolumeKg(MIXED_SESSION), "the squats only").toBe(2500)

    const log = {
      id: "w1",
      user_id: "u1",
      session_type: "weights",
      duration_min: 60,
      intensity: 3,
      logged_at: new Date(2026, 7, 19, 12).toISOString(),
      sets: MIXED_SESSION,
    } as unknown as WorkoutLogWithSets
    const week = weeklyVolume([log], new Date(2026, 7, 19, 12), 1)
    expect(week[0].volumeKg, "the chart says the same").toBe(2500)
    // And every set that happened is counted as a set, including the carries.
    expect(week[0].sets).toBe(8)
  })
})

describe("nowhere else multiplies a weight by reps", () => {
  it("has exactly one such multiplication in src, and it is the rule itself", () => {
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.tsx?$/.test(entry.name)) {
          const code = fs
            .readFileSync(full, "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/[^\n]*/g, "")
          for (const hit of code.match(/weight(_kg|Kg)\s*\*\s*[\w.]*reps/gi) ?? []) {
            offenders.push(`${path.relative(SRC, full)}: ${hit}`)
          }
        }
      }
    }
    const SRC = path.resolve(__dirname, "../../../src")
    walk(SRC)

    /**
     * `setVolumeKg` is the one place allowed to do it, because it is the only
     * place that has first asked whether the number in `reps` is reps.
     */
    expect(offenders, `These decide "weight moved" for themselves:\n${offenders.join("\n")}`).toEqual([
      "health/healthService.ts: weight_kg * set.reps",
    ])
  })
})
