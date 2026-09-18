/**
 * WHAT THE PROGRAM-SESSION FORM SENDS MUST BE WHAT THE SERVER ASKS FOR.
 *
 * The date picker on that form never worked. It sent the day under the name
 * `entryDate`; this schema asks for `entry_date`; and a validator deletes fields
 * it was not told about. So "I did this on Saturday" was accepted, silently
 * stripped, and filed under the day it was typed — with no error anywhere.
 *
 * The schema is strict now, so the same mistake fails loudly rather than
 * quietly. These tests pin both halves.
 */

import { describe, it, expect } from "vitest"
import { LogSessionSchema } from "@/src/programs/schemas"

const body = {
  // Required, so every fixture carries one. See the retry-key test at the foot
  // of this file for why.
  clientKey: "w-abc12345",
  dayId: "A",
  cycle: 1,
  week: 1,
  durationMin: 45,
  intensity: 3,
  entries: [{ exerciseId: "squat", sets: [{ setNumber: 1, reps: 5, weight: 100 }] }],
}

describe("LogSessionSchema", () => {
  it("accepts a session written up on the day it happened", () => {
    expect(LogSessionSchema.safeParse(body).success).toBe(true)
  })

  it("keeps the date when a past day is given", () => {
    const parsed = LogSessionSchema.safeParse({ ...body, entry_date: "2026-08-22" })
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.entry_date).toBe("2026-08-22")
  })

  it("refuses the misspelling that broke this feature, instead of ignoring it", () => {
    const parsed = LogSessionSchema.safeParse({ ...body, entryDate: "2026-08-22" })
    expect(parsed.success, "an unknown field must be an error, never a silent drop").toBe(false)
  })

  it("keeps a time of day alongside the date", () => {
    const parsed = LogSessionSchema.safeParse({ ...body, entry_date: "2026-08-22", entry_time: "07:30" })
    expect(parsed.success && parsed.data.entry_time).toBe("07:30")
  })

  it("refuses a time with no day, which is not a fact about anything", () => {
    expect(LogSessionSchema.safeParse({ ...body, entry_time: "07:30" }).success).toBe(false)
  })

  it("refuses a date that is not a date", () => {
    expect(LogSessionSchema.safeParse({ ...body, entry_date: "22/08/2026" }).success).toBe(false)
  })
})

/**
 * THE RETRY KEY.
 *
 * A write-up sent twice — the reply lost on gym wifi, the button pressed again
 * because nothing appeared to happen — wrote a second session and advanced the
 * program twice, so a squat went up 5 kg for one session's work. The key is
 * what lets the database recognise the second one as the first.
 */
describe("the retry key", () => {
  it("refuses a write-up without one", () => {
    const { clientKey, ...noKey } = body
    void clientKey
    const parsed = LogSessionSchema.safeParse(noKey)
    expect(parsed.success).toBe(false)
    expect(parsed.success === false && Object.keys(parsed.error.flatten().fieldErrors)).toContain(
      "clientKey"
    )
  })

  it("refuses one too short to be unique, and one absurdly long", () => {
    expect(LogSessionSchema.safeParse({ ...body, clientKey: "w-abc" }).success).toBe(false)
    expect(LogSessionSchema.safeParse({ ...body, clientKey: "w".repeat(65) }).success).toBe(false)
  })
})
