/**
 * A DAY AHEAD OF THE ACCOUNT'S CALENDAR IS REFUSED, NOT STORED.
 *
 * Moved from `tests/e2e/life-mastery-day-persists.spec.ts`, which opened Life
 * Mastery in a browser only to send one PUT. The day the route compares with is
 * the account's — `getUserTimezone`, then `whyNotWritable` — so it runs here
 * through the real handler against a real account, and what is checked
 * afterwards is the database: nothing was written for the refused day.
 */

import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { call } from "./call"
import * as day from "@/app/api/life-plan/day/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const daysWritten = (userId: string) =>
  asOwner(async (q) => Number((await q("select count(*) as n from public.life_plan_days where user_id = $1", [userId]))[0]!.n))

describe("writing a day in Life Mastery", () => {
  it("refuses a day ahead of the account's calendar", async () => {
    const user = await newUser("day-ahead")
    actAs(user)

    const res = await call(day.PUT, "/api/life-plan/day", {
      method: "PUT",
      body: { date: "2099-01-01", note: "from a clock that is wrong" },
    })

    expect(res.status, "a day years ahead is refused rather than stored").toBe(400)
    expect(await daysWritten(user.id)).toBe(0)
  })

  it("stores the same note on the account's today", async () => {
    // The control: the refusal is about the date, not about this account.
    // A new account's clock is UTC until somebody chooses one.
    const user = await newUser("day-today")
    actAs(user)

    const res = await call(day.PUT, "/api/life-plan/day", {
      method: "PUT",
      body: { date: getTodayInTimezone("UTC"), note: "written today" },
    })

    expect(res.status, JSON.stringify(res.body)).toBe(200)
    expect(await daysWritten(user.id)).toBe(1)
  })
})
