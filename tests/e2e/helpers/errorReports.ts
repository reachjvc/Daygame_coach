/**
 * THE CRASH REPORTS THE TEST BACKEND HOLDS.
 *
 * `error_reports` has no access policies — only the server's service key
 * reads or writes it (src/db/errorReportRepo.ts) — so a spec reads it here,
 * as the database owner of the LOCAL stack, to check that a crash it caused
 * actually landed rather than that the route answered 200.
 */
import { Client } from 'pg'
import { testStackEnv } from '../fixtures/stack'

export interface StoredCrash {
  message: string
  route: string
  seen_count: number
  user_id: string | null
}

/**
 * Reports whose message is exactly `message`, or whose route is `route` and
 * that were last seen at or after `since`. A repeat of a known fault bumps
 * `seen_count` and `last_seen_at` on its old row instead of adding one, so
 * "since" is what tells this run's crash from a previous run's.
 */
export async function storedCrashReports(
  match: { message: string } | { route: string; since: Date },
): Promise<StoredCrash[]> {
  const db = new Client({ connectionString: testStackEnv().DB_URL })
  await db.connect()
  try {
    const { rows } =
      'message' in match
        ? await db.query<StoredCrash>(
            'select message, route, seen_count, user_id from public.error_reports where message = $1',
            [match.message],
          )
        : await db.query<StoredCrash>(
            'select message, route, seen_count, user_id from public.error_reports where route = $1 and last_seen_at >= $2',
            [match.route, match.since.toISOString()],
          )
    return rows
  } finally {
    await db.end()
  }
}
