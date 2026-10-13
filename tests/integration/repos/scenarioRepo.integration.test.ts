/**
 * scenarioRepo against production's real `scenarios` table.
 *
 * KNOWN WRONG, PINNED WITH `it.fails` (found 2026-10-13, the first day these
 * tests ran against the real schema rather than the hand-written copy):
 *
 * Production's `scenarios` has `difficulty` and `archetype` (both NOT NULL),
 * `score`, `feedback`, `xp_earned`, `completed_at` — and no `scenario_data`,
 * `user_response` or `evaluation`. The old test copy of the schema had exactly
 * the columns the code expects, so nothing noticed. So:
 *
 *   - `createScenarioAttempt` writes columns that do not exist and omits two
 *     required ones. `persistScenarioAttempt` catches the error and logs it, so
 *     every scenario attempt is silently never saved.
 *   - `getScenarioStats` selects `evaluation`, gets an error, ignores it and
 *     reports zero sessions — a value it could not compute, shown as a real 0.
 *
 * Each `it.fails` goes red the day the code and the table agree; delete the
 * `.fails` then. The fix is a product decision (which columns are right), so it
 * is not made here.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { createScenarioAttempt, getScenarioStats } from "@/src/db/scenarioRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

describe("a scenario attempt", () => {
  it.fails("is saved the way the scenario screen sends it", async () => {
    const user = await newUser("scenario")
    actAs(user)

    await createScenarioAttempt({
      user_id: user.id,
      scenario_type: "opener",
      user_response: "Hi",
      scenario_data: { archetype: "busy" },
      evaluation: { score: 8 },
    })

    const rows = await asOwner((q) => q("select id from scenarios where user_id = $1", [user.id]))
    expect(rows).toHaveLength(1)
  })

  it.fails("is counted in the person's practice stats", async () => {
    const user = await newUser("scenario")
    await asOwner((q) =>
      q(
        `insert into scenarios (user_id, difficulty, archetype, scenario_type, score)
         values ($1, 'easy', 'busy', 'opener', 8), ($1, 'easy', 'busy', 'shit-test', 5)`,
        [user.id]
      )
    )
    actAs(user)

    expect(await getScenarioStats(user.id)).toMatchObject({ totalSessions: 2, uniqueTypes: 2 })
  })
})
