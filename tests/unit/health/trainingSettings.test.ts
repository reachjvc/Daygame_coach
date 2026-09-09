// @vitest-environment node
/**
 * THE SETTINGS THE APP PROMISED AND NEVER OFFERED.
 *
 * `weight_unit`, `bar_weight_kg` and `smallest_plate_kg` were added to `profiles`
 * with CHECK constraints and a column GRANT, and then nothing ever wrote them.
 * A lifter who trains in pounds and is not on a pounds program had no way to say
 * so; a home gym with nothing smaller than 2.5 kg plates got prescriptions it
 * could not load, under a deload message reading "use a lighter bar" — a fix the
 * app had no way to accept.
 *
 * These assert what is handed to the database, which is what the write-coverage
 * ratchet means by "asserted".
 */

import { afterEach, describe, expect, it, vi } from "vitest"

function fakeSupabase() {
  const calls: { table: string; payload?: unknown; eq?: [string, string] }[] = []
  const client = {
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: (col: string, val: string) => {
          calls[calls.length - 1].eq = [col, val]
          return chain
        },
        maybeSingle: async () => ({
          data: { weight_unit: "lb", bar_weight_kg: 15, smallest_plate_kg: 2.5 },
          error: null,
        }),
        update: (payload: unknown) => {
          calls[calls.length - 1].payload = payload
          return chain
        },
        then: (resolve: (v: { error: null }) => unknown) => resolve({ error: null }),
      }
      calls.push({ table })
      return chain
    },
  }
  return { client, calls }
}

afterEach(() => vi.resetModules())

async function withFake() {
  const { client, calls } = fakeSupabase()
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => client }))
  const repo = await import("@/src/db/workoutRepo")
  return { repo, calls }
}

describe("training settings", () => {
  it("reads all three, and does not invent a default for the two that are optional", async () => {
    const { repo } = await withFake()
    const got = await repo.getTrainingSettings("u1")
    expect(got).toEqual({ unit: "lb", barWeightKg: 15, smallestPlateKg: 2.5 })
  })

  it("writes exactly the three columns, scoped to the one account", async () => {
    const { repo, calls } = await withFake()
    await repo.saveTrainingSettings("u1", { unit: "lb", barWeightKg: 15, smallestPlateKg: 2.5 })
    const write = calls.find((c) => c.payload)
    expect(write?.table).toBe("profiles")
    expect(write?.payload).toEqual({
      weight_unit: "lb",
      bar_weight_kg: 15,
      smallest_plate_kg: 2.5,
    })
    // Scoped, so a bug here can never write somebody else's row.
    expect(write?.eq).toEqual(["id", "u1"])
  })

  it("writes the column defaults rather than null, because the columns are NOT NULL", async () => {
    // The first version of this screen sent null for an empty box. Postgres
    // refused it, and the screen reported "Saved." over the 500.
    const { repo, calls } = await withFake()
    await repo.saveTrainingSettings("u1", { unit: "kg", barWeightKg: 20, smallestPlateKg: 1.25 })
    const write = calls.find((c) => c.payload)
    expect(write?.payload).toMatchObject({ bar_weight_kg: 20, smallest_plate_kg: 1.25 })
  })
})
