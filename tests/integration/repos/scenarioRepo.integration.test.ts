/**
 * scenarioRepo against production's real `scenarios` table.
 *
 * Until 2026-10-16 the code wrote `scenario_data`, `user_response` and
 * `evaluation`, which the table never had, and left out the NOT NULL
 * `difficulty` and `archetype`: every attempt failed to save, silently, and the
 * stats read an error as 0. The code now writes `scenario_type`, `score` and
 * the archetype when there is one, as the server, and
 * 20261016120000_scenario_attempts_save.sql lets the unknowns be empty and
 * takes away a person's own INSERT: the scores feed badges.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { getScenarioStats } from "@/src/db/scenarioRepo"
import { persistScenarioAttempt } from "@/src/scenarios/scenariosService"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

describe("a scenario attempt", () => {
  it("is saved with its score, whichever evaluator scored it", async () => {
    const user = await newUser("scenario")
    actAs(user)

    // What the two routes hand over: a chat milestone names it `score`, the
    // opener evaluator `overallScore`. persistScenarioAttempt never throws, so
    // only the row says whether it worked.
    await persistScenarioAttempt(user.id, "practice-shittests", { score: 8 }, "The Busy Professional")
    await persistScenarioAttempt(user.id, "practice-openers", { overallScore: 6.6 })

    const rows = await asOwner((q) =>
      q("select scenario_type, score, archetype from scenarios where user_id = $1 order by scenario_type", [user.id])
    )
    expect(rows).toEqual([
      { scenario_type: "practice-openers", score: 7, archetype: null },
      { scenario_type: "practice-shittests", score: 8, archetype: "The Busy Professional" },
    ])
  })

  it("still counts when its score is out of range, with no score", async () => {
    const user = await newUser("scenario")
    actAs(user)

    await persistScenarioAttempt(user.id, "practice-openers", { score: 85 })

    const rows = await asOwner((q) => q("select score from scenarios where user_id = $1", [user.id]))
    expect(rows).toEqual([{ score: null }])
  })

  it("cannot be written by the person themselves, so a score cannot be made up", async () => {
    const user = await newUser("scenario")

    const { error } = await user.client
      .from("scenarios")
      .insert({ user_id: user.id, scenario_type: "practice-openers", score: 10 })

    expect(error?.message).toMatch(/row-level security/)
    expect(await asOwner((q) => q("select 1 from scenarios where user_id = $1", [user.id]))).toEqual([])
  })

  it("is counted in the person's practice stats", async () => {
    const user = await newUser("scenario")
    await asOwner((q) =>
      q(
        `insert into scenarios (user_id, difficulty, archetype, scenario_type, score)
         values ($1, 'easy', 'busy', 'opener', 8), ($1, 'easy', 'busy', 'shit-test', 5)`,
        [user.id]
      )
    )
    actAs(user)

    expect(await getScenarioStats(user.id)).toEqual({ totalSessions: 2, uniqueTypes: 2, highScoreCount: 1 })
  })
})
