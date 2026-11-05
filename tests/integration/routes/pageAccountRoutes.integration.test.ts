/**
 * A PAGE OPENED FOR ONE ACCOUNT CANNOT WRITE INTO ANOTHER
 * (src/shared/pageAccount.ts; Plans/life-plan-rebuild.md, the account leak).
 *
 * Every tab of a browser shares one sign-in. Here the sign-in is Y's while the
 * request names X, as a `/plan` tab opened for X sends it after somebody
 * signed in as Y in another tab. Every life plan route refuses it with 409 and
 * the header the page reads, and the database shows nothing written for Y:
 * no plan row started, no day stored. The same requests naming Y, or naming
 * nobody (a tab still on the code before the header), go through.
 */

import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { ACCOUNT_CHANGED_HEADER, PAGE_ACCOUNT_HEADER } from "@/src/shared/pageAccount"
import { call } from "./call"
import * as plan from "@/app/api/life-plan/route"
import * as day from "@/app/api/life-plan/day/route"
import * as goalLink from "@/app/api/life-plan/goal-link/route"
import * as goal from "@/app/api/goals/[id]/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const rowsOf = (table: string, userId: string) =>
  asOwner(async (q) => Number((await q(`select count(*) as n from public.${table} where user_id = $1`, [userId]))[0]!.n))

describe("a request naming another account than the one signed in", () => {
  it("is refused by every life plan route, and nothing is written", async () => {
    const x = await newUser("page-for-x")
    const y = await newUser("signed-in-y")
    actAs(y)
    const named = { [PAGE_ACCOUNT_HEADER]: x.id }
    const today = getTodayInTimezone("UTC")

    const answers = [
      await call(plan.GET, "/api/life-plan", { headers: named }),
      await call(plan.POST, "/api/life-plan", { method: "POST", headers: named }),
      await call(plan.PATCH, "/api/life-plan", { method: "PATCH", headers: named, body: { changes: { plan_id: x.id, replace: [] }, revision: 0 } }),
      await call(day.GET, "/api/life-plan/day", { headers: named }),
      await call(day.PUT, "/api/life-plan/day", { method: "PUT", headers: named, body: { date: today, note: "meant for X" } }),
      await call(goalLink.PUT, "/api/life-plan/goal-link", { method: "PUT", headers: named, body: { links: {} } }),
      await call(goal.DELETE, `/api/goals/${x.id}`, { method: "DELETE", headers: named, params: { id: x.id } }),
    ]
    for (const [i, a] of answers.entries()) {
      expect(a.status, `request ${i}: ${JSON.stringify(a.body)}`).toBe(409)
      expect(a.headers.get(ACCOUNT_CHANGED_HEADER), `request ${i}`).toBe("1")
    }
    // Nothing of Y's read back, and nothing written for Y.
    expect(answers[0].body).not.toHaveProperty("plan")
    expect(await rowsOf("life_plans", y.id)).toBe(0)
    expect(await rowsOf("life_plan_days", y.id)).toBe(0)
  })

  it("goes through when it names the account signed in, or names none", async () => {
    const y = await newUser("named-self")
    actAs(y)
    const today = getTodayInTimezone("UTC")

    const own = await call(day.PUT, "/api/life-plan/day", {
      method: "PUT",
      headers: { [PAGE_ACCOUNT_HEADER]: y.id },
      body: { date: today, note: "mine" },
    })
    expect(own.status, JSON.stringify(own.body)).toBe(200)
    expect(own.headers.get(ACCOUNT_CHANGED_HEADER)).toBeNull()

    const unnamed = await call(plan.GET, "/api/life-plan")
    expect(unnamed.status).toBe(200)
    expect(await rowsOf("life_plan_days", y.id)).toBe(1)
  })
})
