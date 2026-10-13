/**
 * THE ONE THING'S TWO REQUEST-ONLY RULES, THROUGH ITS ROUTE, AGAINST THE REAL SCHEMA.
 *
 * Moved from `tests/e2e/one-thing.spec.ts`, where both opened the tracking page
 * only so `page.request` had a session, and read nothing on it. The handler is
 * `app/api/life-answers/route.ts`, with `writeOneThing` and the append-only
 * `life_answers` / `life_chapters` tables behind it. Each test has its own
 * account, so "how many rows" counts only its own. The flows a person sees —
 * the step, the tracking page's header, the history — stay in the browser.
 */

import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { call } from "./call"
import * as answers from "@/app/api/life-answers/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const rowsFor = (userId: string) =>
  asOwner(async (q) => Number((await q("select count(*) as n from public.life_answers where user_id = $1", [userId]))[0]!.n))

const post = (body: Record<string, unknown>) =>
  call<{ error?: string; unchanged?: boolean }>(answers.POST, "/api/life-answers", { method: "POST", body })

describe("the one thing, at its route", () => {
  /**
   * AT8 — A DEADLINE IN THE PAST IS REFUSED, AND SAYS WHY. It used to save
   * perfectly happily, and the countdown then announced that a one thing
   * written ten seconds ago had already run its course.
   */
  it("refuses a deadline that has already been, in words", async () => {
    const user = await newUser("one-thing-past")
    actAs(user)

    const past = await post({ key: "one_thing", act: "start", body: "A deadline behind me", dueOn: "2020-01-01" })
    expect(past.status).toBe(400)
    expect(past.body.error).toMatch(/already been/)

    const nonsense = await post({ key: "one_thing", act: "start", body: "A day that does not exist", dueOn: "2026-13-45" })
    expect(nonsense.status).toBe(400)
    expect(nonsense.body.error).toMatch(/not a date on the calendar/)

    expect(await rowsFor(user.id), "a refused answer writes nothing").toBe(0)
  })

  /**
   * A CALLER THAT NAMES NO DEADLINE IS ASKING ABOUT THE WORDS. The server fills
   * a missing one with a rolling ninety days, so the identical request on two
   * days would have looked like two answers and appended a row. This locks the
   * contract on one day; the cross-day case is the unit test "asks only about
   * the words when no deadline is offered".
   */
  it("does not append a row for the same sentence sent again with no deadline", async () => {
    const user = await newUser("one-thing-same")
    actAs(user)
    const body = "Same words twice"

    const first = await post({ key: "one_thing", body })
    expect(first.status, JSON.stringify(first.body)).toBe(201)

    const again = await post({ key: "one_thing", body })
    expect(again.status).toBe(200)
    expect(again.body.unchanged).toBe(true)
    expect(await rowsFor(user.id), "the same sentence is one row, not two").toBe(1)
  })
})
