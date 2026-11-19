/**
 * WHAT THE COPY SPACE'S COUNCIL COPY HANDS THE DATABASE (src/db/roleModelsRepo.ts).
 *
 * `insertCouncilRows` writes every row as the account it was given, never the
 * account the rows were read from, and the council reminder always OFF.
 * `deleteCouncilRows` filters every delete on the account it was given.
 */

import { describe, expect, test } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { deleteCouncilRows, insertCouncilRows } from "@/src/db/roleModelsRepo"

type Call = { table: string; op: string; payload?: unknown; filter?: [string, unknown] }

/** A client that records each call and answers every one with success. */
function recorder(): { client: SupabaseClient; calls: Call[] } {
  const calls: Call[] = []
  const ok = { data: null, error: null }
  const from = (table: string) => {
    const chain = (call: Call) => {
      calls.push(call)
      const thenable = {
        eq: (col: string, val: unknown) => { call.filter = [col, val]; return thenable },
        select: () => thenable,
        maybeSingle: () => Promise.resolve(ok),
        single: () => Promise.resolve(ok),
        then: (res: (v: typeof ok) => unknown) => Promise.resolve(ok).then(res),
      }
      return thenable
    }
    return {
      insert: (payload: unknown) => chain({ table, op: "insert", payload }),
      upsert: (payload: unknown) => chain({ table, op: "upsert", payload }),
      update: (payload: unknown) => chain({ table, op: "update", payload }),
      delete: () => chain({ table, op: "delete" }),
    }
  }
  return { client: { from } as unknown as SupabaseClient, calls }
}

const today = new Date().toISOString().slice(0, 10)

describe("the council copy", () => {
  test("insertCouncilRows writes as the given account, with the reminder off and only this week's marks", async () => {
    const { client, calls } = recorder()
    await insertCouncilRows("copy-id", {
      members: [{ roleModelId: "rm-1", position: 0, takenValues: ["courage"] }],
      settings: { weekValue: "courage", weekOf: today, remindOn: true, remindHour: 8 },
      marks: [{ day: today, value: "courage", lived: true }, { day: "2020-01-06", value: "courage", lived: false }],
    } as never, client)
    const rows = calls.flatMap((c) => (Array.isArray(c.payload) ? c.payload : c.payload ? [c.payload] : [])) as Record<string, unknown>[]
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.user_id).toBe("copy-id")
    const settings = calls.find((c) => c.table === "user_role_model_settings")
    expect(settings, "the settings were written").toBeDefined()
    expect(JSON.stringify(settings!.payload)).toContain('"remind_on":false')
    const marks = calls.find((c) => c.table === "user_role_model_week_marks")!.payload as { day: string }[]
    expect(marks.map((m) => m.day)).toEqual([today])
  })

  test("deleteCouncilRows filters every table on the given account", async () => {
    const { client, calls } = recorder()
    await deleteCouncilRows("copy-id", client)
    expect(calls.map((c) => c.table).sort()).toEqual(["user_role_model_settings", "user_role_model_week_marks", "user_role_models"])
    for (const c of calls) {
      expect(c.op).toBe("delete")
      expect(c.filter).toEqual(["user_id", "copy-id"])
    }
  })
})
