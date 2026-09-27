// @vitest-environment node
/**
 * TWO DEVICES CORRECTING ONE WORKOUT, AND THE SECOND SAVE WON WHOLE.
 *
 * `replace_sets_and_replay` deletes every set of a workout and inserts the
 * payload. There was no version, no comparison and no check that the list being
 * replaced was the list the editor had read — so a save built on a stale read
 * quietly put back the sets somebody else had just deleted.
 *
 * Measured in a browser, two contexts on one account, one receipt of 5 sets:
 *
 *   B removes Squat set 2 and set 3, saves   → receipt reads 2 sets / 650 kg
 *   A (holding its read from before B) edits
 *   a bench weight and saves                 → receipt reads 4 sets / 1675 kg
 *
 * The two sets B deleted came back, and neither device was told anything. B
 * reloaded and found its deletion undone.
 *
 * `WorkoutCorrection`'s own header says "a list that arrived short does not
 * display wrong, it DELETES", and the screen guards against a SHORT read. A
 * STALE read does the same damage in the other direction and was unguarded.
 *
 * Compared as a SET OF IDS rather than a count, because swapping one set for
 * another leaves the count identical.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const WORKOUT = "w1"

const finished = { id: WORKOUT, enrollment_id: null, ended_at: "2026-09-27T09:00:00Z", started_at: "2026-09-27T08:00:00Z", adjustments: {} }

/** A corrected set as the screen sends it, carrying the row it replaces. */
const corrected = (id: string | null, over: Record<string, unknown> = {}) => ({
  id,
  completedAt: "2026-09-27T08:10:00Z",
  prescribedIndex: 0,
  exercise: "Squat",
  exerciseId: "squat",
  weightKg: 100,
  reps: 5,
  setNumber: 1,
  kind: "working" as const,
  side: null,
  notes: null,
  exerciseNotes: null,
  rpe: null,
  ...over,
})

/** `liveIds` is what the workout holds NOW — the other device's version. */
function fakeSupabase(liveIds: string[]) {
  const rpcCalls: string[] = []
  const table = (name: string) => {
    let selected = ""
    const chain: Record<string, unknown> = {
      select: (cols?: string) => {
        selected = cols ?? ""
        return chain
      },
      eq: () => chain,
      or: () => chain,
      order: () => chain,
      range: () => chain,
      limit: () => chain,
      maybeSingle: () =>
        Promise.resolve({ data: name === "workout_logs" ? finished : null, error: null }),
      single: () =>
        Promise.resolve({ data: name === "workout_logs" ? finished : null, error: null }),
      then: (done: (v: unknown) => unknown) => {
        const rows = name === "workout_sets" && selected === "id" ? liveIds.map((id) => ({ id })) : []
        return Promise.resolve({ data: rows, error: null }).then(done)
      },
    }
    return chain
  }
  return {
    rpcCalls,
    client: {
      from: table,
      rpc: (n: string) => {
        rpcCalls.push(n)
        return Promise.resolve({ data: null, error: null })
      },
    },
  }
}

async function repoWith(liveIds: string[]) {
  const fake = fakeSupabase(liveIds)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  vi.doMock("@/src/db/settingsRepo", () => ({
    getUserTimezone: async () => "Europe/Copenhagen",
    getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
  }))
  const repo = await import("@/src/db/workoutRepo")
  return { repo, fake }
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("a correction built on a read that has been overtaken", () => {
  test("is refused, and says to reload rather than replacing the list", async () => {
    // The screen read s1, s2, s3. Another device has since deleted s2 and s3.
    const { repo, fake } = await repoWith(["s1"])
    await expect(
      repo.reviseWorkout(USER, WORKOUT, [corrected("s1"), corrected("s2"), corrected("s3")])
    ).rejects.toThrow(/changed on another device/i)
    expect(fake.rpcCalls, "nothing may be written on the way to the refusal").toEqual([])
  })

  test("a set that no longer exists is caught even when the count matches", async () => {
    // One deleted, one added elsewhere: three then, three now, different rows.
    const { repo } = await repoWith(["s1", "s2", "s9"])
    await expect(
      repo.reviseWorkout(USER, WORKOUT, [corrected("s1"), corrected("s2"), corrected("s3")])
    ).rejects.toThrow(/changed on another device/i)
  })

  test("the refusal is a refusal, so the route answers 409 and not 500", async () => {
    const { statusFor } = await import("@/src/programs/errors")
    const { repo } = await repoWith(["s1"])
    const thrown = await repo
      .reviseWorkout(USER, WORKOUT, [corrected("s1"), corrected("s2")])
      .catch((e: unknown) => e)
    expect(statusFor(thrown)).toBe(409)
  })

  test("an unchanged workout saves, which is the whole point of the screen", async () => {
    const { repo, fake } = await repoWith(["s1", "s2"])
    await repo.reviseWorkout(USER, WORKOUT, [corrected("s1"), corrected("s2")]).catch(() => null)
    expect(fake.rpcCalls).toContain("replace_sets_and_replay")
  })
})
