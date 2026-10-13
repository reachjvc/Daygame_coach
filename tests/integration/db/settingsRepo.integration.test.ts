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
 * Removed 2026-10-13 (Plans/tests-worth-their-keep.md, Phase 2): nineteen
 * tests that updated a profile and read the same row back (D2/D4), restated a
 * default (D1), or deleted a profile and counted purchases — now one rule for
 * every table in `userDataCascades.integration.test.ts` (D5). Also removed, and
 * not for the plan's reason: the three refusals of a bad approach outcome,
 * review type and sticking-point status. Those refusals come from Postgres ENUM
 * types that existed only in the old hand-written test schema. In production all three
 * columns are plain `text` with no CHECK (tests/db/baseline.sql), so the tests
 * proved a guard production does not have (D4) — and the mirror's `review_type`
 * even refuses 'daily', which production and `REVIEW_TYPES` both accept.
 */

import { describe, test, expect } from "vitest"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
import { getClient, createTestUser } from "../setup"
import { stackEnv } from "@/tests/db/harness"

describe("whether the account's clock is known", () => {
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
 * THE SIGNUP TRIGGER — THE ONE PRODUCTION RUNS, FIRED BY A REAL SIGNUP.
 *
 * `handle_new_user` reads the browser's zone out of the signup payload, but
 * only if Postgres recognises it as a real zone. That check is not optional:
 * `raw_user_meta_data` is whatever the client sent, and an unrecognised zone
 * makes `toZonedDate` fall back to UTC silently on every call for that account,
 * while the column claims the zone is known.
 *
 * WHICH FUNCTION RUNS. The test backend is production's schema plus every newer
 * migration (scripts/db/test-stack.mjs), with the trigger on auth.users attached
 * as production's is (tests/db/shim.sql). So each signup below is the app's own
 * call — `auth.signUp` with the anon key, the zone in `options.data`, as
 * app/auth/sign-up/page.tsx sends it — through Supabase's auth service into the
 * function production has. These used to paste the newest migration's body into
 * a hand-built `auth.users` inside a rolled-back transaction, because the old
 * test database had no auth at all.
 */
describe("the signup trigger, on the real signup path", () => {
  /** Signs a new account up with this payload and returns its profile's clock. */
  const signUp = async (data: Record<string, string> | null) => {
    const env = stackEnv()
    const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: signedUp, error } = await anon.auth.signUp({
      email: `signup-${randomUUID()}@test.local`,
      password: randomUUID(),
      ...(data === null ? {} : { options: { data } }),
    })
    if (error || !signedUp.user) throw new Error(`signUp failed: ${error?.message}`)

    const client = await getClient()
    try {
      const { rows } = await client.query(`SELECT timezone, timezone_source FROM profiles WHERE id = $1`, [
        signedUp.user.id,
      ])
      return rows[0] as { timezone: string; timezone_source: string }
    } finally {
      await client.end()
    }
  }

  test("a signup carrying a real zone records it as detected", async () => {
    expect(await signUp({ timezone: "Europe/Copenhagen" })).toEqual({
      timezone: "Europe/Copenhagen",
      timezone_source: "detected",
    })
  })

  test("a zone Postgres does not recognise is refused, and the account stays a known unknown", async () => {
    // Each of these would otherwise be stored verbatim and then silently
    // treated as UTC by the app, with the column claiming it was known.
    for (const bad of ["Middle/Earth", "", "'; drop table profiles; --", "UTC+2"]) {
      expect(await signUp({ timezone: bad }), bad).toEqual({
        timezone: "UTC",
        timezone_source: "signup_default",
      })
    }
  })

  test("a signup with no zone at all still works, and says nobody has said", async () => {
    expect(await signUp({ full_name: "No Zone" })).toEqual({
      timezone: "UTC",
      timezone_source: "signup_default",
    })
    expect(await signUp(null)).toEqual({
      timezone: "UTC",
      timezone_source: "signup_default",
    })
  })
})
