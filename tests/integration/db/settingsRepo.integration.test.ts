/**
 * DOES THE APP KNOW YOUR CLOCK, OR IS IT GUESSING?
 *
 * `timezone` is NOT NULL DEFAULT 'UTC', which cannot tell somebody who lives on
 * UTC from somebody the app has never asked. Every screen that files a workout
 * by date read the default as a real answer, so a session logged at half eleven
 * at night in Copenhagen landed on tomorrow. `timezone_source` is the fix, and
 * these run against real Postgres because its CHECK and the signup trigger that
 * writes it are the whole mechanism — a fake client cannot refuse a bad value.
 *
 * Removed 2026-10-13 (docs/plans/tests-worth-their-keep.md, Phase 2): nineteen
 * tests that updated a profile and read the same row back (D2/D4), restated a
 * default (D1), or deleted a profile and counted purchases — now one rule for
 * every table in `userDataCascades.integration.test.ts` (D5). Also removed, and
 * not for the plan's reason: the three refusals of a bad approach outcome,
 * review type and sticking-point status. Those refusals come from Postgres ENUM
 * types that exist only in tests/integration/schema.sql. In production all three
 * columns are plain `text` with no CHECK (tests/db/baseline.sql), so the tests
 * proved a guard production does not have (D4) — and the mirror's `review_type`
 * even refuses 'daily', which production and `REVIEW_TYPES` both accept.
 */

import { describe, test, expect, beforeEach } from "vitest"
import fs from "fs"
import path from "path"
import type { Client } from "pg"
import { getClient, truncateAllTables, createTestUser } from "../setup"

describe("whether the account's clock is known", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  test("the source column refuses a value it does not know", async () => {
    const userId = await createTestUser()
    const client = await getClient()

    try {
      // Without the CHECK, a typo stores a fourth state that every reader
      // silently treats as "known" — the exact failure this column prevents.
      await expect(
        client.query(`UPDATE profiles SET timezone_source = $2 WHERE id = $1`, [userId, "guessed"])
      ).rejects.toMatchObject({ code: "23514", constraint: "profiles_timezone_source_check" })
    } finally {
      await client.end()
    }
  })
})

/**
 * THE SIGNUP TRIGGER — PRODUCTION'S OWN BODY, NOT A COPY OF IT.
 *
 * `handle_new_user` reads the browser's zone out of the signup payload, but
 * only if Postgres recognises it as a real zone. That check is not optional:
 * `raw_user_meta_data` is whatever the client sent, and an unrecognised zone
 * makes `toZonedDate` fall back to UTC silently on every call for that account,
 * while the column claims the zone is known.
 *
 * WHICH FUNCTION RUNS. These tests used to paste the body in, so the trigger
 * could change in a migration and these would stay green over the old copy. Now
 * the body is read out of the NEWEST migration in supabase/migrations that
 * defines it — the one production last applied — and executed as written.
 * `auth.users` does not exist in this container, so the table and the trigger
 * that fires the function are built here, as 20260101000000_create_profiles.sql
 * builds the trigger.
 *
 * INSIDE A TRANSACTION THAT IS ROLLED BACK, always. The container is shared with
 * every other integration file, and creating a table in it takes locks that
 * another file's `truncateAllTables()` then waits on.
 */
const MIGRATIONS = path.resolve(__dirname, "../../../supabase/migrations")

/** The newest migration's `create or replace function public.handle_new_user()`, verbatim. */
function liveHandleNewUser(): { file: string; sql: string } {
  const definition = /create\s+or\s+replace\s+function\s+public\.handle_new_user\s*\(\s*\)[\s\S]*?\bas\s+(\$[A-Za-z_]*\$)[\s\S]*?\1\s*;/i
  const files = fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse()
  for (const file of files) {
    const match = fs.readFileSync(path.join(MIGRATIONS, file), "utf8").match(definition)
    if (match) return { file, sql: match[0] }
  }
  throw new Error(`No migration in ${MIGRATIONS} defines public.handle_new_user() — nothing to test.`)
}

describe("the signup trigger, on real Postgres", () => {
  const build = async (client: Client) => {
    const live = liveHandleNewUser()
    // The newest definition as of writing. A newer one is fine — this only
    // guards against the search silently landing on an OLDER one.
    expect(live.file >= "20260917110000_timezone_source.sql", live.file).toBe(true)

    await client.query("BEGIN")
    await client.query(`CREATE TABLE auth.users (
      id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB
    )`)
    await client.query(live.sql)
    await client.query(`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`)
  }

  const signUp = async (client: Client, meta: Record<string, string> | null) => {
    const { rows } = await client.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data)
       VALUES (gen_random_uuid(), 'x-' || gen_random_uuid() || '@t.local', $1) RETURNING id`,
      [meta === null ? null : JSON.stringify(meta)]
    )
    const { rows: profile } = await client.query(
      `SELECT timezone, timezone_source FROM profiles WHERE id = $1`,
      [rows[0].id]
    )
    return profile[0] as { timezone: string; timezone_source: string }
  }

  /** Build, run, and roll every trace of it back — the table, the function and the rows. */
  const inRolledBackSignup = async (run: (client: Client) => Promise<void>) => {
    const client = await getClient()
    try {
      await build(client)
      await run(client)
    } finally {
      await client.query("ROLLBACK").catch(() => {})
      await client.end()
    }
  }

  test("a signup carrying a real zone records it as detected", async () => {
    await inRolledBackSignup(async (client) => {
      expect(await signUp(client, { timezone: "Europe/Copenhagen" })).toEqual({
        timezone: "Europe/Copenhagen",
        timezone_source: "detected",
      })
    })
  })

  test("a zone Postgres does not recognise is refused, and the account stays a known unknown", async () => {
    await inRolledBackSignup(async (client) => {
      // Each of these would otherwise be stored verbatim and then silently
      // treated as UTC by the app, with the column claiming it was known.
      for (const bad of ["Middle/Earth", "", "'; drop table profiles; --", "UTC+2"]) {
        expect(await signUp(client, { timezone: bad }), bad).toEqual({
          timezone: "UTC",
          timezone_source: "signup_default",
        })
      }
    })
  })

  test("a signup with no zone at all still works, and says nobody has said", async () => {
    await inRolledBackSignup(async (client) => {
      expect(await signUp(client, { full_name: "No Zone" })).toEqual({
        timezone: "UTC",
        timezone_source: "signup_default",
      })
      expect(await signUp(client, null)).toEqual({
        timezone: "UTC",
        timezone_source: "signup_default",
      })
    })
  })
})
