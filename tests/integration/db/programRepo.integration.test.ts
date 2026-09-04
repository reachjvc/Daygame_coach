/**
 * Workout programs — SCHEMA TESTS.
 *
 * THE BUG THESE EXIST FOR. Ending a program used to be a hard `DELETE` on
 * `program_enrollments`. `program_session_logs.enrollment_id` is declared
 * `ON DELETE CASCADE`, so one click erased every session the person had ever
 * logged — a year of training, gone, behind a confirm() that said "your logged
 * sessions will be removed" and was treated as a feature. Ending a program now
 * archives it (`is_active = false`) and only a program you have already ended
 * can be erased on purpose.
 *
 * That fix rests entirely on two schema facts, and this file pins both:
 *
 *   1. **The cascade is real.** If it ever stopped being real, someone would
 *      reasonably conclude a hard delete was safe again. The test that proves
 *      the danger is the test that keeps the fix necessary.
 *   2. **The unique index is PARTIAL.** `… WHERE is_active` is what lets any
 *      number of finished enrollments of one program sit beside a single live
 *      one. Drop the `WHERE` and archiving breaks the moment somebody returns to
 *      a program they did before — and it breaks at *enrollment* time, far from
 *      the change that caused it.
 *
 * Like the other files here, these run raw SQL against the testcontainers
 * PostgreSQL rather than calling `programRepo` — the container is plain Postgres
 * and the repo needs a Supabase client. See the same note in
 * `goalRepo.integration.test.ts`. What can be proven at this layer is the shape
 * of the database, which is exactly where this feature's danger lives.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

const CURSOR = JSON.stringify({ cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 })

async function enroll(
  userId: string,
  programId = "stronglifts-5x5",
  isActive = true
): Promise<string> {
  const client = await getClient()
  try {
    const r = await client.query(
      `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, cursor, is_active)
       VALUES ($1, $2, 'beginner', 'kg', $3::jsonb, $4) RETURNING id`,
      [userId, programId, CURSOR, isActive]
    )
    return r.rows[0].id
  } finally {
    await client.end()
  }
}

async function logSessions(enrollmentId: string, userId: string, n: number): Promise<void> {
  const client = await getClient()
  try {
    for (let i = 0; i < n; i++) {
      await client.query(
        `INSERT INTO program_session_logs (enrollment_id, user_id, day_id, cycle, week, entries)
         VALUES ($1, $2, 'A', 1, 1, '[]'::jsonb)`,
        [enrollmentId, userId]
      )
    }
  } finally {
    await client.end()
  }
}

async function countSessions(enrollmentId: string): Promise<number> {
  const client = await getClient()
  try {
    const r = await client.query(
      `SELECT count(*)::int AS n FROM program_session_logs WHERE enrollment_id = $1`,
      [enrollmentId]
    )
    return r.rows[0].n
  } finally {
    await client.end()
  }
}

describe("program schema", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  describe("archiving keeps the training; deleting destroys it", () => {
    test("setting is_active = false keeps every logged session", async () => {
      // This is what "End program" does now. A year of training survives it.
      const userId = await createTestUser("archive@example.com")
      const enrollmentId = await enroll(userId)
      await logSessions(enrollmentId, userId, 3)

      const client = await getClient()
      try {
        await client.query(`UPDATE program_enrollments SET is_active = false WHERE id = $1`, [enrollmentId])
      } finally {
        await client.end()
      }

      expect(await countSessions(enrollmentId)).toBe(3)
    })

    test("deleting the enrollment cascades and the sessions are gone", async () => {
      // The danger, pinned. This is what "End program" used to do, and it is why
      // it must not do it again. If this test ever fails because the cascade was
      // removed, do not celebrate — the archive/delete split was designed around
      // it and needs rethinking.
      const userId = await createTestUser("cascade@example.com")
      const enrollmentId = await enroll(userId)
      await logSessions(enrollmentId, userId, 3)
      expect(await countSessions(enrollmentId)).toBe(3)

      const client = await getClient()
      try {
        await client.query(`DELETE FROM program_enrollments WHERE id = $1`, [enrollmentId])
      } finally {
        await client.end()
      }

      expect(await countSessions(enrollmentId)).toBe(0)
    })

    test("deleting a person takes their programs and sessions with them", async () => {
      const userId = await createTestUser("gdpr@example.com")
      const enrollmentId = await enroll(userId)
      await logSessions(enrollmentId, userId, 2)

      const client = await getClient()
      try {
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])
        const left = await client.query(
          `SELECT count(*)::int AS n FROM program_enrollments WHERE user_id = $1`,
          [userId]
        )
        expect(left.rows[0].n).toBe(0)
      } finally {
        await client.end()
      }
      expect(await countSessions(enrollmentId)).toBe(0)
    })
  })

  describe("the active-enrollment index is partial, so a past program is not in the way", () => {
    test("refuses two ACTIVE enrollments of the same program", async () => {
      const userId = await createTestUser("dupe@example.com")
      await enroll(userId, "stronglifts-5x5", true)
      await expect(enroll(userId, "stronglifts-5x5", true)).rejects.toThrow()
    })

    test("allows returning to a program you finished — the archived one does not block it", async () => {
      // The case the partial index exists for. Without `WHERE is_active` this
      // throws, and it throws at enrollment time, nowhere near the change.
      const userId = await createTestUser("return@example.com")
      const first = await enroll(userId, "stronglifts-5x5", true)

      const client = await getClient()
      try {
        await client.query(`UPDATE program_enrollments SET is_active = false WHERE id = $1`, [first])
      } finally {
        await client.end()
      }

      await expect(enroll(userId, "stronglifts-5x5", true)).resolves.toBeTruthy()
    })

    test("allows many finished runs of the same program side by side", async () => {
      // Somebody who has run StrongLifts three times over three years.
      const userId = await createTestUser("thrice@example.com")
      await enroll(userId, "stronglifts-5x5", false)
      await enroll(userId, "stronglifts-5x5", false)
      await expect(enroll(userId, "stronglifts-5x5", false)).resolves.toBeTruthy()
    })

    test("two people may run the same program at once", async () => {
      const a = await createTestUser("a@example.com")
      const b = await createTestUser("b@example.com")
      await enroll(a, "stronglifts-5x5", true)
      await expect(enroll(b, "stronglifts-5x5", true)).resolves.toBeTruthy()
    })
  })

  describe("what may be written", () => {
    test("rejects a level the app does not have", async () => {
      const userId = await createTestUser("level@example.com")
      const client = await getClient()
      try {
        await expect(
          client.query(
            `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, cursor)
             VALUES ($1, 'x', 'expert', 'kg', $2::jsonb)`,
            [userId, CURSOR]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("rejects an RPE outside 1-10, and accepts none at all", async () => {
      const userId = await createTestUser("rpe@example.com")
      const enrollmentId = await enroll(userId)
      const client = await getClient()
      try {
        await expect(
          client.query(
            `INSERT INTO program_session_logs (enrollment_id, user_id, day_id, cycle, week, entries, rpe)
             VALUES ($1, $2, 'A', 1, 1, '[]'::jsonb, 11)`,
            [enrollmentId, userId]
          )
        ).rejects.toThrow()
        await expect(
          client.query(
            `INSERT INTO program_session_logs (enrollment_id, user_id, day_id, cycle, week, entries, rpe)
             VALUES ($1, $2, 'A', 1, 1, '[]'::jsonb, NULL)`,
            [enrollmentId, userId]
          )
        ).resolves.toBeTruthy()
      } finally {
        await client.end()
      }
    })

    test("a session cannot belong to no enrollment", async () => {
      const userId = await createTestUser("orphan@example.com")
      const client = await getClient()
      try {
        await expect(
          client.query(
            `INSERT INTO program_session_logs (enrollment_id, user_id, day_id, cycle, week, entries)
             VALUES (gen_random_uuid(), $1, 'A', 1, 1, '[]'::jsonb)`,
            [userId]
          )
        ).rejects.toThrow()
      } finally {
        await client.end()
      }
    })

    test("custom_schedule is null until somebody edits the program", async () => {
      // Copy-on-write: null means "follow the catalogue and keep getting its
      // corrections", which is a different fact from an empty schedule.
      const userId = await createTestUser("cow@example.com")
      const enrollmentId = await enroll(userId)
      const client = await getClient()
      try {
        const r = await client.query(
          `SELECT custom_schedule FROM program_enrollments WHERE id = $1`,
          [enrollmentId]
        )
        expect(r.rows[0].custom_schedule).toBeNull()
      } finally {
        await client.end()
      }
    })
  })
})
