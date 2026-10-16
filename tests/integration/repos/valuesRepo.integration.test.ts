/**
 * valuesRepo against production's real `values` and `user_values` tables.
 *
 * Inner Game's first step: the person picks the values that matter to them from
 * a catalogue, and the choice is saved per account.
 *
 * THE CATALOGUE IS GLOBAL, so it cannot hang off a test user. The test stack
 * starts with it empty (schema only); each test adds catalogue rows under ids
 * nobody else can produce and removes exactly those rows again. Nothing else is
 * deleted. A person's choice must exist in `core_values` as well, because
 * production's foreign key on `user_values.value_id` points there, not at
 * `values` — the catalogue rows are written to both.
 *
 * `user_values` has no UPDATE policy, and a plain upsert's conflict path is an
 * UPDATE, which row security refuses — for the whole statement. The values step
 * re-sends the whole selection on every "Next", so until 2026-10-16 only the
 * first category's choices were ever saved. A row is only its two keys, so the
 * upsert now skips rows that exist (`ignoreDuplicates`).
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { deleteUserValues, getUserValueIds, listValues, upsertUserValues } from "@/src/db/valuesRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

/** Catalogue values only this test can see by id, removed again when it is done. */
async function withCatalogue<T>(
  entries: Array<{ code: string; category: string }>,
  run: (ids: string[]) => Promise<T>
): Promise<T> {
  const tag = randomUUID().slice(0, 8)
  const rows = entries.map((e) => ({ id: `${e.code}-${tag}`, category: e.category }))
  await asOwner(async (q) => {
    for (const r of rows) {
      await q("insert into public.values (id, category) values ($1, $2)", [r.id, r.category])
      await q("insert into public.core_values (id, category) values ($1, $2)", [r.id, r.category])
    }
  })
  try {
    return await run(rows.map((r) => r.id))
  } finally {
    const ids = rows.map((r) => r.id)
    await asOwner(async (q) => {
      await q("delete from public.user_values where value_id = any($1)", [ids])
      await q("delete from public.values where id = any($1)", [ids])
      await q("delete from public.core_values where id = any($1)", [ids])
    })
  }
}

async function storedValueIds(userId: string): Promise<string[]> {
  const rows = await asOwner((q) =>
    q("select value_id from public.user_values where user_id = $1 order by value_id", [userId])
  )
  return rows.map((r) => r.value_id as string)
}

describe("the values catalogue", () => {
  it("lists every value with no display name, because production's table has no such column", async () => {
    // The precondition this test is about. If a migration adds the column, the
    // branch below is no longer the one production takes — rewrite the test.
    const columns = await asOwner((q) =>
      q(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'values'`
      )
    )
    expect(columns.map((c) => c.column_name)).not.toContain("display_name")

    const user = await newUser("values-catalogue")
    actAs(user)

    await withCatalogue(
      [
        { code: "courage", category: "GROW" },
        { code: "honesty", category: "ETH" },
      ],
      async ([courage, honesty]) => {
        const listed = await listValues()

        expect(listed).toContainEqual({ id: courage, category: "GROW", display_name: null })
        expect(listed).toContainEqual({ id: honesty, category: "ETH", display_name: null })
      }
    )
  })
})

describe("a person's chosen values", () => {
  it("are saved and read back", async () => {
    const user = await newUser("values-choice")
    actAs(user)

    await withCatalogue(
      [
        { code: "courage", category: "GROW" },
        { code: "honesty", category: "ETH" },
      ],
      async ([courage, honesty]) => {
        await upsertUserValues(user.id, [courage, honesty])

        expect((await getUserValueIds(user.id)).sort()).toEqual([courage, honesty].sort())
      }
    )
  })

  it("keep everything when the whole selection is saved again with new ones added", async () => {
    const user = await newUser("values-choice")
    actAs(user)

    await withCatalogue(
      [
        { code: "courage", category: "GROW" },
        { code: "honesty", category: "ETH" },
      ],
      async ([courage, honesty]) => {
        await upsertUserValues(user.id, [courage])

        // What the values step sends after its second category: the first
        // category's choice again, plus the new one.
        await upsertUserValues(user.id, [courage, honesty])

        expect((await getUserValueIds(user.id)).sort()).toEqual([courage, honesty].sort())
      }
    )
  })

  it("are cleared for the person resetting, and only for them", async () => {
    const resetting = await newUser("values-reset")
    const bystander = await newUser("values-bystander")

    await withCatalogue([{ code: "courage", category: "GROW" }], async ([courage]) => {
      actAs(resetting)
      await upsertUserValues(resetting.id, [courage])
      actAs(bystander)
      await upsertUserValues(bystander.id, [courage])

      actAs(resetting)
      await deleteUserValues(resetting.id)

      expect(await getUserValueIds(resetting.id)).toEqual([])
      expect(await storedValueIds(bystander.id)).toEqual([courage])
    })
  })

  it("cannot be read, added to or cleared by somebody else, whatever id they pass", async () => {
    const owner = await newUser("values-owner")
    const intruder = await newUser("values-intruder")

    await withCatalogue(
      [
        { code: "courage", category: "GROW" },
        { code: "honesty", category: "ETH" },
      ],
      async ([courage, honesty]) => {
        actAs(owner)
        await upsertUserValues(owner.id, [courage])

        actAs(intruder)
        expect(await getUserValueIds(owner.id)).toEqual([])
        await expect(upsertUserValues(owner.id, [honesty])).rejects.toThrow(/row-level security/)
        await deleteUserValues(owner.id)

        expect(await storedValueIds(owner.id)).toEqual([courage])
      }
    )
  })
})
