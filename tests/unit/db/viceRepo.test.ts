/**
 * WHAT THE BLACK BOX REPO ACTUALLY SENDS.
 *
 * Every test here asserts the PAYLOAD, not that a call happened. A repo test
 * that only checks "it called upsert" passes just as well when the rows go in
 * carrying somebody else's user id, when a report is written before the run it
 * hangs off, or when a tombstone is filtered out of a read — which are the
 * three ways this file can lose or leak somebody's record.
 *
 * The write-coverage ratchet has no slack, so `writeViceRows` ships classified
 * "asserted" rather than adding to the debt.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { createFakeSupabase, type Row } from "@/tests/helpers/fakeSupabase"

const tables: Record<string, Row[]> = {}

vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: async () => createFakeSupabase(tables),
}))

import { accountHasViceRows, readViceRows, writeViceRows } from "@/src/db/viceRepo"
import type { ViceAttemptRow, ViceReportRow } from "@/src/db/viceTypes"

const USER = "11111111-1111-1111-1111-111111111111"
const OTHER = "99999999-9999-9999-9999-999999999999"

function attempt(over: Partial<ViceAttemptRow> = {}): ViceAttemptRow {
  return {
    id: "aaaaaaaa-0000-0000-0000-000000000001",
    user_id: USER,
    vice_id: "nicotine",
    label: "Smoking or vaping",
    started_on: "2026-03-01",
    started_by: "Woke up coughing",
    structure: ["Told a specific person"],
    ended_on: null,
    ended_by_report_id: null,
    updated_at: "2026-03-01T10:00:00.000Z",
    deleted_at: null,
    ...over,
  }
}

function report(over: Partial<ViceReportRow> = {}): ViceReportRow {
  return {
    id: "bbbbbbbb-0000-0000-0000-000000000001",
    user_id: USER,
    attempt_id: "aaaaaaaa-0000-0000-0000-000000000001",
    at: "2026-05-04T21:00:00",
    went_through: false,
    thought: "One wouldn't undo this",
    ending: "fine",
    closeness: 7,
    with_whom: "On my own",
    where_at: "Balcony",
    factors: ["Bored"],
    did_instead: "Went to bed",
    updated_at: "2026-05-04T19:00:00.000Z",
    deleted_at: null,
    ...over,
  }
}

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key]
  tables.vice_attempts = []
  tables.vice_reports = []
})

describe("the owner is stamped here, never taken from the row", () => {
  it("overwrites a user_id the caller sent, on both tables", () => {
    // THE ONE THAT MATTERS. If the row's own `user_id` were trusted, a crafted
    // request would write into somebody else's record — and the row-level
    // policies are deleted rather than ported when the platform moves, so this
    // scoping is what survives that day.
    return writeViceRows(USER, {
      attempts: [attempt({ user_id: OTHER })],
      reports: [report({ user_id: OTHER })],
    }).then(() => {
      expect(tables.vice_attempts[0].user_id).toBe(USER)
      expect(tables.vice_reports[0].user_id).toBe(USER)
    })
  })

  it("writes every other column through unchanged", () => {
    return writeViceRows(USER, { attempts: [attempt()], reports: [report()] }).then(() => {
      expect(tables.vice_attempts[0]).toEqual(attempt())
      expect(tables.vice_reports[0]).toEqual(report())
    })
  })

  it("sends nothing at all when there is nothing to send", async () => {
    await writeViceRows(USER, { attempts: [], reports: [] })
    expect(tables.vice_attempts).toEqual([])
    expect(tables.vice_reports).toEqual([])
  })
})

describe("a removal is written as a row, never as a delete", () => {
  it("upserts the tombstone over the live row", async () => {
    await writeViceRows(USER, { attempts: [attempt()], reports: [report()] })
    await writeViceRows(USER, {
      attempts: [],
      reports: [report({ deleted_at: "2026-05-05T09:00:00.000Z", updated_at: "2026-05-05T09:00:00.000Z" })],
    })
    // One row still, now carrying its tombstone — not zero rows.
    expect(tables.vice_reports).toHaveLength(1)
    expect(tables.vice_reports[0].deleted_at).toBe("2026-05-05T09:00:00.000Z")
  })

  it("hands tombstones back on a read, because that is how a deletion travels", async () => {
    // A device that was offline when the row was removed learns it went. Filter
    // them here and that device would see a row the server "forgot" and upload
    // it again, forever.
    await writeViceRows(USER, {
      attempts: [attempt({ deleted_at: "2026-05-05T09:00:00.000Z" })],
      reports: [],
    })
    const rows = await readViceRows(USER, null)
    expect(rows.attempts).toHaveLength(1)
    expect(rows.attempts[0].deleted_at).not.toBeNull()
  })
})

describe("a read is this account's rows and no one else's", () => {
  it("never returns another account's rows", async () => {
    // Spread, because the fake's tables hold `Record<string, unknown>` and a
    // TypeScript INTERFACE is not assignable to one — interfaces can be
    // augmented by declaration merging, so the compiler cannot promise they
    // have no other keys. Spreading produces an object literal, which can.
    tables.vice_attempts.push({ ...attempt({ id: "theirs", user_id: OTHER }) })
    await writeViceRows(USER, { attempts: [attempt()], reports: [] })
    const rows = await readViceRows(USER, null)
    expect(rows.attempts.map((a) => a.user_id)).toEqual([USER])
  })

  it("asks for everything when nothing has been taken yet", async () => {
    await writeViceRows(USER, { attempts: [attempt()], reports: [report()] })
    const rows = await readViceRows(USER, null)
    expect(rows.attempts).toHaveLength(1)
    expect(rows.reports).toHaveLength(1)
  })

  it("asks only for what changed after the watermark", async () => {
    await writeViceRows(USER, {
      attempts: [
        attempt({ id: "old", updated_at: "2026-03-01T10:00:00.000Z" }),
        attempt({ id: "new", updated_at: "2026-03-03T10:00:00.000Z" }),
      ],
      reports: [],
    })
    const rows = await readViceRows(USER, "2026-03-02T00:00:00.000Z")
    expect(rows.attempts.map((a) => a.id)).toEqual(["new"])
  })

  it("does not hand back a row stamped exactly at the watermark", async () => {
    // Exclusive, not inclusive. With `>=` a quiet page re-takes its newest row
    // on every sync forever.
    await writeViceRows(USER, { attempts: [attempt({ updated_at: "2026-03-03T10:00:00.000Z" })], reports: [] })
    const rows = await readViceRows(USER, "2026-03-03T10:00:00.000Z")
    expect(rows.attempts).toEqual([])
  })
})

describe("an instant comes back spelled the way the app spells it", () => {
  /**
   * FOUND BY DRIVING THE REAL ROUTE AGAINST THE REAL TABLES, and invisible to
   * every test with a fake database, because only Postgres produces Postgres's
   * spelling.
   *
   * `timestamptz` comes back as `2026-09-23T10:00:02+00:00`; the app writes
   * `2026-09-23T10:00:02.000Z`. Same instant, different text — and `+` sorts
   * before `.`, so a row that had been to the server and back compared as OLDER
   * than its own local twin. `viceSyncService` resolves conflicts by comparing
   * these as strings, so the round-tripped copy would lose every merge, a
   * device would re-send the same rows forever, and two devices would never
   * converge on an edit.
   */
  it("converts the database's +00:00 spelling to the app's Z", async () => {
    tables.vice_attempts.push({
      ...attempt(),
      updated_at: "2026-09-23T10:00:02+00:00",
      deleted_at: "2026-09-23T10:00:03+00:00",
    })
    const rows = await readViceRows(USER, null)
    expect(rows.attempts[0].updated_at).toBe("2026-09-23T10:00:02.000Z")
    expect(rows.attempts[0].deleted_at).toBe("2026-09-23T10:00:03.000Z")
  })

  it("keeps a null deleted_at null rather than inventing an instant", async () => {
    await writeViceRows(USER, { attempts: [attempt()], reports: [] })
    const rows = await readViceRows(USER, null)
    expect(rows.attempts[0].deleted_at).toBeNull()
  })

  it("leaves a stamp it cannot parse exactly as it found it", async () => {
    // Refusing or zeroing an unreadable stamp would be worse: it would either
    // drop somebody's row or silently make it the oldest thing on the record.
    tables.vice_attempts.push({ ...attempt(), updated_at: "not a date" })
    const rows = await readViceRows(USER, null)
    expect(rows.attempts[0].updated_at).toBe("not a date")
  })

  it("makes a round-tripped row compare equal to its local twin", async () => {
    // The property that actually matters, stated as the property.
    tables.vice_attempts.push({ ...attempt(), updated_at: "2026-09-23T10:00:02+00:00" })
    const rows = await readViceRows(USER, null)
    expect(rows.attempts[0].updated_at > "2026-09-23T10:00:02.000Z").toBe(false)
    expect(rows.attempts[0].updated_at < "2026-09-23T10:00:02.000Z").toBe(false)
  })
})

describe("whether the account holds anything", () => {
  it("is false for an account with no runs, and true once it has one", async () => {
    expect(await accountHasViceRows(USER)).toBe(false)
    await writeViceRows(USER, { attempts: [attempt()], reports: [] })
    expect(await accountHasViceRows(USER)).toBe(true)
  })

  it("does not count another account's runs", async () => {
    tables.vice_attempts.push({ ...attempt({ id: "theirs", user_id: OTHER }) })
    expect(await accountHasViceRows(USER)).toBe(false)
  })
})
