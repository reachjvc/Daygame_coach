/**
 * WHAT valuesRepo.deleteUserValues LEAVES IN `user_values`.
 *
 * Plans/tests-catch-what-matters.md, Phase 4 (group B). The reset of the Values
 * section deletes the person's chosen values: all of theirs, none of anybody
 * else's, and not the catalogue they point at. Catalogue rows are global, so
 * each test adds its own under unique ids and removes exactly those.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { deleteUserValues, upsertUserValues } from "@/src/db/valuesRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

async function storedRows(userId: string) {
  return asOwner((q) => q("select value_id, created_at::text as created_at from public.user_values where user_id = $1 order by value_id", [userId]))
}

describe("deleteUserValues", () => {
  it("removes every value the person chose, keeps the catalogue, and leaves other people's choices byte-identical", async () => {
    const tag = randomUUID().slice(0, 8)
    const ids = ["courage", "honesty", "calm"].map((c) => `${c}-${tag}`)
    await asOwner(async (q) => {
      for (const id of ids) {
        await q("insert into public.values (id, category) values ($1, 'GROW')", [id])
        await q("insert into public.core_values (id, category) values ($1, 'GROW')", [id])
      }
    })
    try {
      const me = await newUser("values-del")
      const other = await newUser("values-del-other")
      actAs(other)
      await upsertUserValues(other.id, [ids[0], ids[1]])
      actAs(me)
      await upsertUserValues(me.id, ids)
      const othersBefore = await storedRows(other.id)
      expect(await storedRows(me.id)).toHaveLength(3)

      await deleteUserValues(me.id)

      expect(await storedRows(me.id)).toEqual([])
      expect(await storedRows(other.id)).toEqual(othersBefore)
      const catalogue = await asOwner((q) => q("select id from public.values where id = any($1)", [ids]))
      expect(catalogue).toHaveLength(3)
    } finally {
      await asOwner(async (q) => {
        await q("delete from public.user_values where value_id = any($1)", [ids])
        await q("delete from public.values where id = any($1)", [ids])
        await q("delete from public.core_values where id = any($1)", [ids])
      })
    }
  })
})
