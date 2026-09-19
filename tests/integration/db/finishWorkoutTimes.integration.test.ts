/**
 * A WORKOUT WRITTEN UP AFTERWARDS SAYS WHEN IT HAPPENED.
 *
 * Everything about a workout is written when you finish it — except the time
 * it STARTED, which was fixed at Start and could not be changed. Write up
 * Tuesday's session on Thursday and it was filed under Thursday, its minutes
 * were the wall-clock gap since you pressed Start, and the day you actually
 * trained was recorded nowhere.
 *
 * WHY THESE RUN AGAINST REAL POSTGRES. Every assertion below is about
 * something only the database does: two columns that must move together
 * because a CHECK says so, an end that cannot precede a start, a distance
 * bound that holds for anything holding the service key, and a second finish
 * that must raise rather than quietly advance the program twice. A fake client
 * would agree with whatever the app believes.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

/** A workout open since `startedAt`, with no program attached. */
async function openWorkout(
  client: Awaited<ReturnType<typeof getClient>>,
  userId: string,
  startedAt: string
): Promise<string> {
  // OPEN means duration and intensity are NULL — `workout_logs_lifecycle`
  // enforces the three legal shapes, and "open with a duration" is not one.
  const { rows } = await client.query(
    `INSERT INTO workout_logs (user_id, session_type, started_at, logged_at)
     VALUES ($1, 'weights', $2, $2) RETURNING id`,
    [userId, startedAt]
  )
  return rows[0].id as string
}

/** The finish call, with only the arguments a test cares about. */
function finish(
  client: Awaited<ReturnType<typeof getClient>>,
  workoutId: string,
  over: { endedAt?: string; startedAt?: string | null; sessionType?: string | null; distanceKm?: number | null } = {}
) {
  return client.query(
    `SELECT finish_program_workout(
       $1, $2::timestamptz, 45, 3::smallint, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL,
       $3::timestamptz, $4::text, $5::numeric
     )`,
    [
      workoutId,
      over.endedAt ?? "2026-09-15T11:00:00Z",
      over.startedAt ?? null,
      over.sessionType ?? null,
      over.distanceKm ?? null,
    ]
  )
}

describe("finishing a workout that happened earlier", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("a started_at moves started_at and logged_at together", async () => {
    const userId = await createTestUser()
    const client = await getClient()
    try {
      const id = await openWorkout(client, userId, "2026-09-17T18:00:00Z")

      // Written up on Thursday, but it happened on Tuesday.
      await finish(client, id, { startedAt: "2026-09-15T10:00:00Z", endedAt: "2026-09-15T11:00:00Z" })

      const { rows } = await client.query(
        `SELECT started_at, logged_at, ended_at FROM workout_logs WHERE id = $1`,
        [id]
      )
      // `workout_logs_logged_is_start` requires them equal; a session filed
      // under the day it was typed is the whole fault this fixes.
      expect(new Date(rows[0].started_at).toISOString()).toBe("2026-09-15T10:00:00.000Z")
      expect(new Date(rows[0].logged_at).toISOString()).toBe("2026-09-15T10:00:00.000Z")
    } finally {
      await client.end()
    }
  })

  test("an end before the new start is refused by the constraint, not by the app", async () => {
    const userId = await createTestUser()
    const client = await getClient()
    try {
      const id = await openWorkout(client, userId, "2026-09-17T18:00:00Z")

      // The app could forget this check. The database cannot.
      await expect(
        finish(client, id, { startedAt: "2026-09-15T12:00:00Z", endedAt: "2026-09-15T11:00:00Z" })
      ).rejects.toThrow()
    } finally {
      await client.end()
    }
  })

  test("the kind and the distance are written in the same call as the end", async () => {
    const userId = await createTestUser()
    const client = await getClient()
    try {
      const id = await openWorkout(client, userId, "2026-09-15T10:00:00Z")

      await finish(client, id, { sessionType: "running", distanceKm: 5.2 })

      const { rows } = await client.query(
        `SELECT session_type, distance_km, ended_at FROM workout_logs WHERE id = $1`,
        [id]
      )
      // A run recorded through the loose path used to be stored as a gym
      // session, so it appeared in no running total anywhere.
      expect(rows[0].session_type).toBe("running")
      expect(Number(rows[0].distance_km)).toBeCloseTo(5.2)
      expect(rows[0].ended_at).toBeTruthy()
    } finally {
      await client.end()
    }
  })

  test("nulls leave the start and the kind exactly as they were", async () => {
    const userId = await createTestUser()
    const client = await getClient()
    try {
      const id = await openWorkout(client, userId, "2026-09-15T10:00:00Z")

      await finish(client, id)

      const { rows } = await client.query(
        `SELECT started_at, session_type FROM workout_logs WHERE id = $1`,
        [id]
      )
      expect(new Date(rows[0].started_at).toISOString()).toBe("2026-09-15T10:00:00.000Z")
      expect(rows[0].session_type).toBe("weights")
    } finally {
      await client.end()
    }
  })

  test("a distance of −1 or 1001 is refused whoever writes it", async () => {
    const client = await getClient()
    try {
      // A USER EACH, because a refused finish leaves the workout open and
      // `uq_workout_logs_one_open_per_user` then refuses the next one — which
      // is another constraint doing its job, and not the one under test.
      for (const bad of [-1, 1001]) {
        const id = await openWorkout(client, await createTestUser(), "2026-09-15T10:00:00Z")
        // Not the app's validation — this connection has no app in it.
        await expect(finish(client, id, { distanceKm: bad }), String(bad)).rejects.toThrow()
      }

      const ok = await openWorkout(client, await createTestUser(), "2026-09-15T10:00:00Z")
      await expect(finish(client, ok, { distanceKm: 1000 })).resolves.toBeTruthy()
    } finally {
      await client.end()
    }
  })

  test("a second finish of the same workout is refused", async () => {
    const userId = await createTestUser()
    const client = await getClient()
    try {
      const id = await openWorkout(client, userId, "2026-09-15T10:00:00Z")
      await finish(client, id)

      // A retry must not advance the program a second time.
      await expect(finish(client, id)).rejects.toThrow(/already been finished/)
    } finally {
      await client.end()
    }
  })
})
