/**
 * WHAT innerGameProgressRepo's WRITES LEAVE IN `inner_game_progress`.
 *
 * Plans/tests-catch-what-matters.md, Phase 4 (group B). Each writer: the row as
 * written (every field it sets), a second person's row, created first, compared
 * byte for byte afterwards, and for the two resets, which fields were cleared
 * and which were kept. The first file next to it (innerGameProgressRepo.
 * integration.test.ts) holds the regressions found earlier; this one is the
 * per-function register.
 */
import { describe, it, expect, vi } from "vitest"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import {
  createProgress,
  getOrCreateProgress,
  resetProgress,
  resetSection,
  updateProgress,
  upsertProgress,
  type InnerGameProgressUpdate,
} from "@/src/db/innerGameProgressRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

type Row = Record<string, unknown>

async function rowOf(userId: string): Promise<Row | undefined> {
  const [row] = await asOwner((q) => q("select to_jsonb(p) as j from inner_game_progress p where user_id = $1", [userId]))
  return row?.j as Row | undefined
}

async function countOf(userId: string): Promise<number> {
  const [row] = await asOwner((q) => q("select count(*)::int as n from inner_game_progress where user_id = $1", [userId]))
  return row.n as number
}

/** Somebody most of the way through Inner Game, every resettable field filled. */
const FULL: InnerGameProgressUpdate = {
  current_step: 5,
  current_substep: 3,
  welcome_dismissed: true,
  values_completed: true,
  shadow_completed: true,
  peak_experience_completed: true,
  hurdles_completed: true,
  cutting_completed: true,
  step1_completed: true,
  step2_completed: true,
  step3_completed: true,
  shadow_response: "shadow text",
  shadow_inferred_values: [{ id: "discipline", reason: "r1" }],
  peak_experience_response: "peak text",
  peak_experience_inferred_values: [{ id: "courage", reason: "r2" }],
  hurdles_response: "hurdle text",
  hurdles_inferred_values: [{ id: "calm", reason: "r3" }],
  final_core_values: [{ id: "courage", rank: 1 }],
  aspirational_values: [{ id: "calm" }],
  deathbed_response: "legacy text",
  deathbed_inferred_values: [{ id: "love", reason: "r4" }],
}

/** A bystander with a full row, created first. */
async function bystander() {
  const user = await newUser("ig-bystander")
  actAs(user)
  await upsertProgress(user.id, FULL)
  return { user, before: await rowOf(user.id) }
}

const CLEARED_BY_SECTION = {
  shadow_completed: false,
  shadow_response: null,
  shadow_inferred_values: null,
  peak_experience_completed: false,
  peak_experience_response: null,
  peak_experience_inferred_values: null,
  hurdles_completed: false,
  hurdles_response: null,
  hurdles_inferred_values: null,
  step2_completed: false,
  cutting_completed: false,
  final_core_values: null,
  aspirational_values: null,
}

describe("createProgress", () => {
  it("writes a row for the person with the starting values, and no other row", async () => {
    const other = await bystander()
    const me = await newUser("ig-create")
    actAs(me)

    const made = await createProgress(me.id)

    expect(made.user_id).toBe(me.id)
    expect(await countOf(me.id)).toBe(1)
    expect(await rowOf(me.id)).toMatchObject({
      user_id: me.id,
      current_step: 0,
      current_substep: 0,
      welcome_dismissed: false,
      values_completed: false,
      shadow_completed: false,
      peak_experience_completed: false,
      hurdles_completed: false,
      cutting_completed: false,
      shadow_response: null,
      final_core_values: null,
    })
    expect(await rowOf(other.user.id)).toEqual(other.before)
  })

  it("refuses to create a row for somebody else", async () => {
    const owner = await newUser("ig-create-owner")
    const intruder = await newUser("ig-create-intruder")
    actAs(intruder)

    await expect(createProgress(owner.id)).rejects.toThrow(/row-level security/)

    expect(await countOf(owner.id)).toBe(0)
  })
})

describe("getOrCreateProgress", () => {
  it("creates the row once for a new person and returns the same row afterwards", async () => {
    const other = await bystander()
    const me = await newUser("ig-get-or-create")
    actAs(me)

    const first = await getOrCreateProgress(me.id)
    await updateProgress(me.id, { current_step: 2 })
    const second = await getOrCreateProgress(me.id)

    expect(second.id).toBe(first.id)
    expect(second.current_step).toBe(2)
    expect(await countOf(me.id)).toBe(1)
    expect(await rowOf(other.user.id)).toEqual(other.before)
  })
})

describe("updateProgress", () => {
  it("writes only the fields handed to it, on the person's own row", async () => {
    const other = await bystander()
    const me = await newUser("ig-update")
    actAs(me)
    await upsertProgress(me.id, FULL)
    const before = await rowOf(me.id)

    await updateProgress(me.id, { current_step: 6, shadow_response: "new words", final_core_values: [{ id: "x", rank: 2 }] })

    const after = await rowOf(me.id)
    expect(after).toMatchObject({ current_step: 6, shadow_response: "new words", final_core_values: [{ id: "x", rank: 2 }] })
    for (const key of ["current_substep", "welcome_dismissed", "hurdles_response", "peak_experience_response", "values_completed"]) {
      expect(after![key]).toEqual(before![key])
    }
    expect(await rowOf(other.user.id)).toEqual(other.before)
  })

  it("does not write over somebody else's row, whatever id the caller passes", async () => {
    const owner = await bystander()
    const intruder = await newUser("ig-update-intruder")
    actAs(intruder)

    // The update matches no row of the intruder's, so it falls back to creating
    // one under the id passed, which row security refuses.
    await expect(updateProgress(owner.user.id, { current_step: 0, shadow_response: "overwritten" })).rejects.toThrow(/row-level security/)

    expect(await rowOf(owner.user.id)).toEqual(owner.before)
  })
})

describe("upsertProgress", () => {
  it("writes every field handed to it and keeps one row per person on a second save", async () => {
    const other = await bystander()
    const me = await newUser("ig-upsert")
    actAs(me)

    await upsertProgress(me.id, FULL)
    expect(await rowOf(me.id)).toMatchObject(FULL as Row)

    await upsertProgress(me.id, { current_step: 1 })
    expect(await countOf(me.id)).toBe(1)
    expect(await rowOf(me.id)).toMatchObject({ ...FULL, current_step: 1 } as Row)
    expect(await rowOf(other.user.id)).toEqual(other.before)
  })
})

describe("resetProgress", () => {
  it("puts every field of the person's row back to the start and touches nobody else", async () => {
    const other = await bystander()
    const me = await newUser("ig-reset")
    actAs(me)
    const created = await upsertProgress(me.id, FULL)

    await resetProgress(me.id)

    expect(await rowOf(me.id)).toMatchObject({
      id: created.id,
      user_id: me.id,
      current_step: 0,
      current_substep: 0,
      welcome_dismissed: false,
      values_completed: false,
      shadow_completed: false,
      peak_experience_completed: false,
      hurdles_completed: false,
      cutting_completed: false,
      step1_completed: false,
      step2_completed: false,
      step3_completed: false,
      shadow_response: null,
      shadow_inferred_values: null,
      peak_experience_response: null,
      peak_experience_inferred_values: null,
      hurdles_response: null,
      hurdles_inferred_values: null,
      final_core_values: null,
      aspirational_values: null,
      deathbed_response: null,
      deathbed_inferred_values: null,
    })
    expect(await rowOf(other.user.id)).toEqual(other.before)
  })

  it("cannot reset somebody else's progress", async () => {
    const owner = await bystander()
    const intruder = await newUser("ig-reset-intruder")
    actAs(intruder)

    await expect(resetProgress(owner.user.id)).rejects.toThrow(/Failed to reset progress/)

    expect(await rowOf(owner.user.id)).toEqual(owner.before)
  })
})

describe("resetSection", () => {
  it("values: clears the values step and everything after it, and goes back to step 1", async () => {
    const other = await bystander()
    const me = await newUser("ig-section-values")
    actAs(me)
    await upsertProgress(me.id, FULL)

    await resetSection(me.id, "values")

    expect(await rowOf(me.id)).toMatchObject({
      ...CLEARED_BY_SECTION,
      current_step: 1,
      current_substep: 0,
      values_completed: false,
      step1_completed: false,
      welcome_dismissed: true,
      step3_completed: true,
      deathbed_response: "legacy text",
    })
    expect(await rowOf(other.user.id)).toEqual(other.before)
  })

  it("shadow: keeps the values step and the position, clears shadow onward", async () => {
    const me = await newUser("ig-section-shadow")
    actAs(me)
    await upsertProgress(me.id, FULL)

    await resetSection(me.id, "shadow")

    expect(await rowOf(me.id)).toMatchObject({
      ...CLEARED_BY_SECTION,
      current_step: 5,
      current_substep: 3,
      values_completed: true,
      step1_completed: true,
    })
  })

  it("peak_experience: keeps values and shadow, clears peak experience onward", async () => {
    const me = await newUser("ig-section-peak")
    actAs(me)
    await upsertProgress(me.id, FULL)

    await resetSection(me.id, "peak_experience")

    expect(await rowOf(me.id)).toMatchObject({
      ...CLEARED_BY_SECTION,
      shadow_completed: true,
      shadow_response: "shadow text",
      shadow_inferred_values: [{ id: "discipline", reason: "r1" }],
      values_completed: true,
    })
  })

  it("hurdles: keeps values, shadow and peak experience, clears hurdles onward", async () => {
    const me = await newUser("ig-section-hurdles")
    actAs(me)
    await upsertProgress(me.id, FULL)

    await resetSection(me.id, "hurdles")

    expect(await rowOf(me.id)).toMatchObject({
      ...CLEARED_BY_SECTION,
      shadow_completed: true,
      shadow_response: "shadow text",
      shadow_inferred_values: [{ id: "discipline", reason: "r1" }],
      peak_experience_completed: true,
      peak_experience_response: "peak text",
      peak_experience_inferred_values: [{ id: "courage", reason: "r2" }],
    })
  })

  it("cutting: clears only the cut and the final values", async () => {
    const me = await newUser("ig-section-cutting")
    actAs(me)
    await upsertProgress(me.id, FULL)

    await resetSection(me.id, "cutting")

    expect(await rowOf(me.id)).toMatchObject({
      cutting_completed: false,
      final_core_values: null,
      aspirational_values: null,
      hurdles_completed: true,
      hurdles_response: "hurdle text",
      hurdles_inferred_values: [{ id: "calm", reason: "r3" }],
      shadow_completed: true,
      peak_experience_completed: true,
      values_completed: true,
      current_step: 5,
    })
  })

  it("cannot reset a section of somebody else's progress", async () => {
    const owner = await bystander()
    const intruder = await newUser("ig-section-intruder")
    actAs(intruder)

    await expect(resetSection(owner.user.id, "values")).rejects.toThrow(/Failed to reset section/)

    expect(await rowOf(owner.user.id)).toEqual(owner.before)
  })
})
