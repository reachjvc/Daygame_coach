/**
 * SAVED TRAINING WEEKS, WRITTEN AND DELETED THROUGH THE REPO, AGAINST THE REAL SCHEMA.
 *
 * `programDrafts.integration.test.ts` proves the table's shape rules in raw SQL.
 * This file calls `createDraft`, `updateDraft` and `deleteDraft` themselves:
 * every field they set, that an update changes only what was sent, and that
 * another account's weeks are byte-identical afterwards.
 *
 * "Filter alone" tests swap the signed-in session for the server's key, which
 * row security does not apply to, so the repo's own `user_id` filter is the
 * only thing standing between one account and another's week.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, admin, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import { createDraft, deleteDraft, updateDraft } from "@/src/db/programDraftRepo"
import type { ProgramSchedule } from "@/src/programs/types"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const week = (lift: string): ProgramSchedule =>
  ({
    kind: "linear_rotation",
    days: [
      {
        id: "day1",
        label: "Push",
        exercises: [
          { id: "bench", name: lift, metricType: "load", scheme: { kind: "linear", sets: 3, reps: 5 }, progression: { kind: "none" } },
        ],
      },
    ],
  }) as unknown as ProgramSchedule

function actWithoutRowSecurity(user: TestUser): void {
  actAs({ ...user, client: admin() })
}

async function rowText(id: string): Promise<string | undefined> {
  const [row] = await asOwner((q) => q("select t::text as r from program_drafts t where id = $1", [id]))
  return row ? String(row.r) : undefined
}

describe("createDraft", () => {
  it("writes every field it was given, for the caller, trimming the name", async () => {
    const other = await newUser("pd-other")
    actAs(other)
    const theirs = await createDraft(other.id, { name: "Theirs", schedule: week("Bench Press") })
    const theirsBefore = await rowText(theirs.id)

    const me = await newUser("pd-mine")
    actAs(me)
    const made = await createDraft(me.id, {
      name: "  Push week  ",
      discipline: "bodybuilding",
      unitSystem: "lb",
      schedule: week("Incline Press"),
      workingWeights: { bench: 135.5 },
      source: "catalog",
      sourceProgramId: "stronglifts-5x5",
    })

    const [row] = await asOwner((q) => q("select * from program_drafts where id = $1", [made.id]))
    expect(row).toMatchObject({
      user_id: me.id,
      name: "Push week",
      discipline: "bodybuilding",
      unit_system: "lb",
      working_weights: { bench: 135.5 },
      source: "catalog",
      source_program_id: "stronglifts-5x5",
    })
    expect(row.schedule).toEqual(week("Incline Press"))
    expect(await rowText(theirs.id)).toBe(theirsBefore)
  })

  it("fills the documented defaults when only a name and a week are given", async () => {
    const me = await newUser("pd-defaults")
    actAs(me)
    const made = await createDraft(me.id, { name: "Plain", schedule: week("Row") })
    const [row] = await asOwner((q) => q("select * from program_drafts where id = $1", [made.id]))
    expect(row).toMatchObject({ discipline: "strength", unit_system: "kg", working_weights: {}, source: "built", source_program_id: null })
  })

  it("a name already in use is reported in words and writes no second row", async () => {
    const me = await newUser("pd-dupe")
    actAs(me)
    await createDraft(me.id, { name: "Same", schedule: week("Row") })
    await expect(createDraft(me.id, { name: "Same", schedule: week("Squat") })).rejects.toThrow("You already have a week saved under that name.")
    expect(await asOwner((q) => q("select 1 from program_drafts where user_id = $1", [me.id]))).toHaveLength(1)
  })
})

describe("updateDraft", () => {
  it("changes only the fields sent: a rename leaves the week, unit and weights as they were", async () => {
    const me = await newUser("pd-rename")
    actAs(me)
    const made = await createDraft(me.id, {
      name: "Before",
      unitSystem: "lb",
      schedule: week("Bench Press"),
      workingWeights: { bench: 100 },
      discipline: "calisthenics",
    })
    const [was] = await asOwner((q) => q("select * from program_drafts where id = $1", [made.id]))

    await updateDraft(me.id, made.id, { name: " After " })

    const [now] = await asOwner((q) => q("select * from program_drafts where id = $1", [made.id]))
    expect(now.name).toBe("After")
    for (const column of ["user_id", "discipline", "unit_system", "schedule", "working_weights", "source", "source_program_id", "created_at"]) {
      expect(now[column], column).toEqual(was[column])
    }
  })

  it("writes each field it is given, and another account's week is byte-identical afterwards", async () => {
    const other = await newUser("pd-up-other")
    actAs(other)
    const theirs = await createDraft(other.id, { name: "Theirs", schedule: week("Bench Press") })
    const theirsBefore = await rowText(theirs.id)
    const me = await newUser("pd-up-me")
    actAs(me)
    const made = await createDraft(me.id, { name: "Mine", schedule: week("Bench Press") })

    await updateDraft(me.id, made.id, {
      discipline: "bodybuilding",
      unitSystem: "lb",
      schedule: week("Overhead Press"),
      workingWeights: { bench: 88 },
    })

    const [row] = await asOwner((q) => q("select * from program_drafts where id = $1", [made.id]))
    expect(row).toMatchObject({ name: "Mine", discipline: "bodybuilding", unit_system: "lb", working_weights: { bench: 88 } })
    expect(row.schedule).toEqual(week("Overhead Press"))
    expect(await rowText(theirs.id)).toBe(theirsBefore)
  })

  it("filter alone: another account's week cannot be changed under your own id", async () => {
    const other = await newUser("pd-fa-up-other")
    actAs(other)
    const theirs = await createDraft(other.id, { name: "Theirs", schedule: week("Bench Press") })
    const theirsBefore = await rowText(theirs.id)
    const me = await newUser("pd-fa-up-me")
    actWithoutRowSecurity(me)

    await expect(updateDraft(me.id, theirs.id, { name: "Hijacked" })).rejects.toThrow("That saved week no longer exists.")

    expect(await rowText(theirs.id)).toBe(theirsBefore)
  })

  it("a name taken by another of your weeks is refused in words and the week keeps its name", async () => {
    const me = await newUser("pd-up-dupe")
    actAs(me)
    await createDraft(me.id, { name: "Taken", schedule: week("Row") })
    const second = await createDraft(me.id, { name: "Second", schedule: week("Row") })
    await expect(updateDraft(me.id, second.id, { name: "Taken" })).rejects.toThrow("You already have a week saved under that name.")
    const [row] = await asOwner((q) => q("select name from program_drafts where id = $1", [second.id]))
    expect(row.name).toBe("Second")
  })
})

describe("deleteDraft", () => {
  it("removes the target week only", async () => {
    const other = await newUser("pd-del-other")
    actAs(other)
    const theirs = await createDraft(other.id, { name: "Theirs", schedule: week("Bench Press") })
    const theirsBefore = await rowText(theirs.id)
    const me = await newUser("pd-del-me")
    actAs(me)
    const gone = await createDraft(me.id, { name: "Gone", schedule: week("Row") })
    const kept = await createDraft(me.id, { name: "Kept", schedule: week("Squat") })
    const keptBefore = await rowText(kept.id)

    await deleteDraft(me.id, gone.id)

    expect(await rowText(gone.id)).toBeUndefined()
    expect(await rowText(kept.id)).toBe(keptBefore)
    expect(await rowText(theirs.id)).toBe(theirsBefore)
  })

  it("filter alone: another account's week is not deleted under your own id", async () => {
    const other = await newUser("pd-fa-del-other")
    actAs(other)
    const theirs = await createDraft(other.id, { name: "Theirs", schedule: week("Bench Press") })
    const theirsBefore = await rowText(theirs.id)
    const me = await newUser("pd-fa-del-me")
    actWithoutRowSecurity(me)

    await deleteDraft(me.id, theirs.id)
    await deleteDraft(me.id, randomUUID())

    expect(await rowText(theirs.id)).toBe(theirsBefore)
  })
})
