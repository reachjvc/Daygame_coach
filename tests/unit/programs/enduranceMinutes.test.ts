/**
 * How long a cardio session is meant to take.
 *
 * This lived as a private helper inside the old logging form, which is exactly
 * why the live workout screen had nothing to say about a run: the only code
 * that understood one was locked inside the form that recorded it.
 */

import { describe, it, expect } from "vitest"
import { enduranceMinutes } from "@/src/programs/programsService"

describe("enduranceMinutes", () => {
  it("adds up a steady block", () => {
    expect(enduranceMinutes([{ repeat: 1, blocks: [{ kind: "steady", label: "Run", durationSec: 1800 }] }])).toBe(30)
  })

  it("multiplies a repeated interval by how many times it is repeated", () => {
    // 8 × (60s jog + 90s walk) = 20 minutes.
    expect(
      enduranceMinutes([
        {
          repeat: 8,
          blocks: [
            { kind: "run", label: "Jog", durationSec: 60 },
            { kind: "walk", label: "Walk", durationSec: 90 },
          ],
        },
      ])
    ).toBe(20)
  })

  it("adds a warm-up and cool-down around the intervals", () => {
    expect(
      enduranceMinutes([
        { repeat: 1, blocks: [{ kind: "warmup", label: "Walk", durationSec: 300 }] },
        { repeat: 4, blocks: [{ kind: "run", label: "Run", durationSec: 120 }] },
        { repeat: 1, blocks: [{ kind: "cooldown", label: "Walk", durationSec: 300 }] },
      ])
    ).toBe(18)
  })

  it("counts a distance target as no time, because it is not one", () => {
    // "Run 5 km" prescribes a distance, not a duration. Inventing minutes for
    // it would be the app guessing how fast somebody runs.
    expect(
      enduranceMinutes([{ repeat: 1, blocks: [{ kind: "steady", label: "Run 5 km", distanceKm: 5 }] }])
    ).toBe(1)
  })

  it("never reports a session as having taken no time at all", () => {
    expect(enduranceMinutes([])).toBe(1)
  })
})
