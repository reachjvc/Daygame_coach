/**
 * settingsRepo's clock, through the app's own code, against the real schema.
 *
 * The first repo-level database tests in this repository: the functions below
 * run unchanged — real PostgREST, real row security, the real signup trigger —
 * as the test's own user (tests/db/harness.ts explains how).
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { getUserClock, updateTimezone } from "@/src/db/settingsRepo"

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
