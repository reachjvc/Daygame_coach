/**
 * YOUR COUNCIL, against the real schema (Plans/role-models.md, Phase 7).
 *
 * The table, its row security, its checks and the trigger refusing a sixth
 * member, through the app's own repo functions and as raw clients trying to get
 * round them.
 */
import { describe, it, expect, vi } from "vitest"
import { createClient } from "@supabase/supabase-js"
import { actAs, asOwner, newUser, stackEnv } from "@/tests/db/harness"
import {
  CouncilFullError,
  readCouncil,
  removeCouncilMember,
  saveCouncilMember,
  writeCouncilOrder,
} from "@/src/db/roleModelsRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const pick = (id: string, position: number, takenValues = ["Discipline"]) => ({ roleModelId: id, takenValues, position })

describe("the council rows", () => {
  it("save, change, reorder and remove through the repo", async () => {
    const a = await newUser("council-owner")
    actAs(a)
    await saveCouncilMember(a.id, pick("marcus-aurelius", 0, ["Discipline", "Wisdom"]), true)
    await saveCouncilMember(a.id, pick("baruch-spinoza", 1), true)
    await saveCouncilMember(a.id, pick("marcus-aurelius", 0, ["Wisdom"]), false)
    await writeCouncilOrder(a.id, new Map([["baruch-spinoza", 0], ["marcus-aurelius", 1]]))
    expect((await readCouncil(a.id)).map((m) => [m.roleModelId, m.position, m.takenValues])).toEqual([
      ["baruch-spinoza", 0, ["Discipline"]],
      ["marcus-aurelius", 1, ["Wisdom"]],
    ])
    await removeCouncilMember(a.id, "baruch-spinoza")
    expect((await readCouncil(a.id)).map((m) => m.roleModelId)).toEqual(["marcus-aurelius"])
  })

  it("refuses a sixth member in the database itself", async () => {
    const a = await newUser("council-full")
    actAs(a)
    for (let i = 0; i < 5; i++) await saveCouncilMember(a.id, pick(`p${i}`, i), true)
    await expect(saveCouncilMember(a.id, pick("p5", 4), true)).rejects.toBeInstanceOf(CouncilFullError)
    const [{ n }] = await asOwner((q) => q(`select count(*)::int as n from user_role_models where user_id = $1`, [a.id]))
    expect(n).toBe(5)
  })

  it("refuses six at once, sent side by side", async () => {
    const a = await newUser("council-race")
    actAs(a)
    const results = await Promise.allSettled([0, 1, 2, 3, 4, 5].map((i) => a.client.from("user_role_models").insert({ user_id: a.id, role_model_id: `r${i}`, position: i % 5, taken_values: ["Discipline"] })))
    const ok = results.filter((r) => r.status === "fulfilled" && !(r.value as { error: unknown }).error).length
    expect(ok).toBe(5)
  })

  it("refuses an empty value list, six values, a bad id, and a value that is not a short word", async () => {
    const a = await newUser("council-checks")
    for (const row of [
      { role_model_id: "x", position: 0, taken_values: [] },
      { role_model_id: "x", position: 0, taken_values: ["a", "b", "c", "d", "e", "f"] },
      { role_model_id: "../x", position: 0, taken_values: ["a"] },
      { role_model_id: "x", position: 5, taken_values: ["a"] },
      { role_model_id: "x", position: 0, taken_values: ["a".repeat(41)] },
      { role_model_id: "x", position: 0, taken_values: [""] },
      { role_model_id: "x", position: 0, taken_values: ["a", null] },
    ]) {
      const res = await a.client.from("user_role_models").insert({ user_id: a.id, ...row })
      expect(res.error, JSON.stringify(row)).not.toBeNull()
    }
  })

  it("is its owner's only: another account cannot read, add to, change or remove it, and anon cannot read", async () => {
    const a = await newUser("council-a")
    const b = await newUser("council-b")
    actAs(a)
    await saveCouncilMember(a.id, pick("marcus-aurelius", 0), true)

    const read = await b.client.from("user_role_models").select("role_model_id").eq("user_id", a.id)
    expect(read.data ?? []).toEqual([])
    const add = await b.client.from("user_role_models").insert({ user_id: a.id, role_model_id: "intruder", position: 1, taken_values: ["x"] })
    expect(add.error).not.toBeNull()
    await b.client.from("user_role_models").update({ taken_values: ["Hacked"] }).eq("user_id", a.id)
    await b.client.from("user_role_models").delete().eq("user_id", a.id)
    const env = stackEnv()
    const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const anonRead = await anon.from("user_role_models").select("role_model_id").eq("user_id", a.id)
    expect(anonRead.data ?? []).toEqual([])

    const rows = await asOwner((q) => q(`select role_model_id, taken_values from user_role_models where user_id = $1`, [a.id]))
    expect(rows).toEqual([{ role_model_id: "marcus-aurelius", taken_values: ["Discipline"] }])
  })
})
