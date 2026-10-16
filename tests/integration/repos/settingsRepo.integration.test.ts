/**
 * settingsRepo's clock, through the app's own code, against the real schema.
 *
 * The first repo-level database tests in this repository: the functions below
 * run unchanged — real PostgREST, real row security, the real signup trigger —
 * as the test's own user (tests/db/harness.ts explains how).
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { getScenarioStats, getUserClock, updateTimezone } from "@/src/db/settingsRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

describe("a user's clock", () => {
  it("is UTC and marked as never set for a brand-new account", async () => {
    const user = await newUser("clock")
    actAs(user)

    expect(await getUserClock(user.id)).toEqual({ timezone: "UTC", known: false })
  })

  it("is known once somebody chooses a zone, and the zone and its source land together", async () => {
    const user = await newUser("clock")
    actAs(user)

    await updateTimezone(user.id, "Europe/Copenhagen")

    expect(await getUserClock(user.id)).toEqual({ timezone: "Europe/Copenhagen", known: true })
    const [row] = await asOwner((q) =>
      q("select timezone, timezone_source from profiles where id = $1", [user.id])
    )
    expect(row).toEqual({ timezone: "Europe/Copenhagen", timezone_source: "chosen" })
  })

  it("cannot be changed for somebody else, whatever id the caller passes", async () => {
    const owner = await newUser("clock-owner")
    const intruder = await newUser("clock-intruder")
    actAs(intruder)

    await updateTimezone(owner.id, "Pacific/Kiritimati")

    const [row] = await asOwner((q) => q("select timezone from profiles where id = $1", [owner.id]))
    expect(row.timezone).toBe("UTC")
  })
})

describe("the practice stats on the settings page", () => {
  it("count every attempt and average the latest ten scores, an attempt with no time counting as oldest", async () => {
    const user = await newUser("settings-scenarios")
    // Eleven timed attempts: the oldest scores 1, the ten after it 4 each.
    // One with no time and a 10, which a plain newest-first order puts first
    // (Postgres sorts NULL first when descending): then the average is 5.
    await asOwner(async (q) => {
      for (let i = 0; i < 11; i++) {
        await q(
          `insert into scenarios (user_id, scenario_type, score, completed_at)
           values ($1, 'practice-openers', $2, now() - make_interval(mins => $3))`,
          [user.id, i === 10 ? 1 : 4, i]
        )
      }
      await q(`insert into scenarios (user_id, scenario_type, score, completed_at) values ($1, 'x', 10, null)`, [
        user.id,
      ])
    })
    actAs(user)

    expect(await getScenarioStats(user.id)).toEqual({ totalScenarios: 12, averageScore: 4 })
  })
})
