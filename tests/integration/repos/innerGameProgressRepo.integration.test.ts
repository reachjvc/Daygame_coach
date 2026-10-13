/**
 * innerGameProgressRepo against production's real `inner_game_progress` table.
 *
 * One row per account (`inner_game_progress_user_id_key`) holds where the person
 * is in Inner Game and everything they wrote on the way.
 *
 * KNOWN WRONG, PINNED WITH `it.fails` (found 2026-10-13, first run against the
 * real schema):
 *
 * Production's `inner_game_progress` has no `essential_selection` column — not
 * in the baseline, not in any migration. `resetProgress` and `resetSection`
 * both write `essential_selection: null`, and PostgREST refuses the whole
 * update:
 *
 *   Could not find the 'essential_selection' column of 'inner_game_progress' in the schema cache
 *
 * So neither reset can ever succeed. `resetSection` is the live one: it is what
 * POST /api/inner-game/reset-section calls, so "redo this section" answers 500
 * and nothing is reset. (`updateUserProgress` writes the same column when the
 * client sends `essentialSelection`; not tested here.) Which way to fix it —
 * add the column, or stop writing it — is a product decision, so it is not made
 * here. Each `it.fails` goes red the day the reset works; delete the `.fails`
 * then.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import {
  getProgress,
  resetProgress,
  updateProgress,
  resetSection,
  upsertProgress,
  type InnerGameProgressUpdate,
} from "@/src/db/innerGameProgressRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

/** Somebody most of the way through Inner Game — only columns production has. */
const WELL_UNDERWAY: InnerGameProgressUpdate = {
  current_step: 4,
  current_substep: 2,
  welcome_dismissed: true,
  values_completed: true,
  shadow_completed: true,
  peak_experience_completed: true,
  hurdles_completed: true,
  shadow_response: "I resent people who coast.",
  shadow_inferred_values: [{ id: "discipline", reason: "resents coasting" }],
  peak_experience_response: "Summit at dawn.",
  hurdles_response: "Fear of looking stupid.",
  final_core_values: [{ id: "courage", rank: 1 }],
  aspirational_values: [{ id: "calm" }],
}

async function rowsFor(userId: string) {
  return asOwner((q) => q("select * from public.inner_game_progress where user_id = $1", [userId]))
}

describe("a person's Inner Game progress", () => {
  it("is one row per person: a second save changes that row rather than adding another", async () => {
    const user = await newUser("inner-game")
    actAs(user)

    const first = await upsertProgress(user.id, { current_step: 1, welcome_dismissed: true })
    const second = await upsertProgress(user.id, { current_step: 2, shadow_response: "Envy." })

    expect(second.id).toBe(first.id)
    const rows = await rowsFor(user.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ current_step: 2, welcome_dismissed: true, shadow_response: "Envy." })
  })

  it.fails("starts again from nothing when reset", async () => {
    const user = await newUser("inner-game")
    actAs(user)
    const before = await upsertProgress(user.id, WELL_UNDERWAY)

    const after = await resetProgress(user.id)

    expect(after.id).toBe(before.id)
    expect(await rowsFor(user.id)).toEqual([
      expect.objectContaining({
        current_step: 0,
        current_substep: 0,
        welcome_dismissed: false,
        values_completed: false,
        shadow_completed: false,
        peak_experience_completed: false,
        hurdles_completed: false,
        shadow_response: null,
        shadow_inferred_values: null,
        peak_experience_response: null,
        hurdles_response: null,
        final_core_values: null,
        aspirational_values: null,
      }),
    ])
  })

  it.fails("redoing the shadow section clears it and everything after it, and keeps the values step", async () => {
    const user = await newUser("inner-game")
    actAs(user)
    await upsertProgress(user.id, WELL_UNDERWAY)

    await resetSection(user.id, "shadow")

    expect(await rowsFor(user.id)).toEqual([
      expect.objectContaining({
        values_completed: true,
        shadow_completed: false,
        shadow_response: null,
        peak_experience_completed: false,
        peak_experience_response: null,
        hurdles_completed: false,
        hurdles_response: null,
        final_core_values: null,
      }),
    ])
  })

  it("cannot be read or overwritten by somebody else, whatever id they pass", async () => {
    const owner = await newUser("inner-game-owner")
    const intruder = await newUser("inner-game-intruder")
    actAs(owner)
    await upsertProgress(owner.id, WELL_UNDERWAY)

    actAs(intruder)
    expect(await getProgress(owner.id)).toBeNull()
    await expect(upsertProgress(owner.id, { current_step: 0, shadow_response: "overwritten" })).rejects.toThrow(
      /row-level security/
    )

    const [row] = await rowsFor(owner.id)
    expect(row).toMatchObject({ current_step: 4, shadow_response: "I resent people who coast." })
  })
})

/**
 * THE FIRST SAVE FROM A FRESH ACCOUNT. Only a read used to create the row, so a
 * save that arrived first updated zero rows and the route answered 500
 * ("Cannot coerce the result to a single JSON object") — found 2026-10-13 by
 * the browser tests' first run on empty accounts.
 */
describe("a person's first Inner Game save", () => {
  it("is kept even when they never read their progress first", async () => {
    const user = await newUser("ig-first-save")
    actAs(user)

    const saved = await updateProgress(user.id, { welcome_dismissed: true, current_step: 1 })

    expect(saved).toMatchObject({ welcome_dismissed: true, current_step: 1 })
    const rows = await asOwner((q) =>
      q("select welcome_dismissed, current_step from public.inner_game_progress where user_id = $1", [user.id])
    )
    expect(rows).toEqual([{ welcome_dismissed: true, current_step: 1 }])
  })
})
