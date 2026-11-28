/**
 * THE BLACK BOX ACCOUNT KEEPS THE NEWER COPY OF A ROW, AGAINST A REAL POSTGRES.
 *
 * WHAT IS BEING PROVEN, in plain words. Two devices can save the same attempt
 * or report at nearly the same moment. The database, not the app, must make
 * sure the older copy never lands on top of the newer one, that one phone with
 * a wrong clock cannot make every later edit look old, and that a lapse (a new
 * report plus the run it ended) lands as one piece or not at all.
 *
 * Stamps are fixed dates in the past, so nothing here depends on the clock,
 * except the one test about a stamp from the future, which asserts against the
 * database's own clock.
 *
 * Every test makes its own user and reads only that user's rows.
 */
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
import { describe, expect, it } from "vitest"
import { asOwner, newUser, stackEnv, type TestUser } from "@/tests/db/harness"

const OLDER = "2026-10-01T10:00:00.000Z"
const MIDDLE = "2026-10-01T11:00:00.000Z"
const NEWER = "2026-10-01T12:00:00.000Z"

function attempt(id: string, label: string, updated_at: string) {
  return {
    id, vice_id: "nicotine", label, started_on: "2026-09-01", started_by: "", structure: [],
    ended_on: null, ended_by_report_id: null, updated_at, deleted_at: null,
  }
}

function report(id: string, attemptId: string, updated_at: string, ending = "fine") {
  return {
    id, attempt_id: attemptId, at: "2026-10-01T09:00:00", went_through: true, thought: "", ending,
    closeness: null, with_whom: "", where_at: "", factors: [], did_instead: "", updated_at, deleted_at: null,
  }
}

async function labelOf(id: string): Promise<string | undefined> {
  const [row] = await asOwner((q) => q(`SELECT label FROM vice_attempts WHERE id = $1`, [id]))
  return row?.label as string | undefined
}

async function stampOf(table: "vice_attempts" | "vice_reports", id: string): Promise<string | undefined> {
  const [row] = await asOwner((q) => q(`SELECT to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS s FROM ${table} WHERE id = $1`, [id]))
  return row?.s as string | undefined
}

/** Puts a first attempt on the account the way the app does: through the signed-in client. */
async function storedAttempt(user: TestUser, label: string, updated_at: string): Promise<string> {
  const id = randomUUID()
  const { error } = await user.client.from("vice_attempts").insert({ ...attempt(id, label, updated_at), user_id: user.id })
  if (error) throw new Error(`could not arrange an attempt: ${error.message}`)
  return id
}

describe("the keep-the-newer-row trigger", () => {
  it("skips an update older than the stored row, with no error", async () => {
    const user = await newUser("vice-older")
    const id = await storedAttempt(user, "kept", MIDDLE)
    const { error } = await user.client.from("vice_attempts").update({ label: "stale", updated_at: OLDER }).eq("id", id)
    expect(error).toBeNull()
    expect(await labelOf(id)).toBe("kept")
  })

  it("lets an update through that is newer than the stored row", async () => {
    const user = await newUser("vice-newer")
    const id = await storedAttempt(user, "before", MIDDLE)
    const { error } = await user.client.from("vice_attempts").update({ label: "after", updated_at: NEWER }).eq("id", id)
    expect(error).toBeNull()
    expect(await labelOf(id)).toBe("after")
  })

  it("lets an update through that has exactly the stored stamp", async () => {
    const user = await newUser("vice-equal")
    const id = await storedAttempt(user, "before", MIDDLE)
    const { error } = await user.client.from("vice_attempts").update({ label: "same-stamp", updated_at: MIDDLE }).eq("id", id)
    expect(error).toBeNull()
    expect(await labelOf(id)).toBe("same-stamp")
  })

  it("pulls a stamp from far in the future back to five minutes ahead of the database clock", async () => {
    const user = await newUser("vice-future")
    const id = await storedAttempt(user, "wrong-clock", "2099-01-01T00:00:00.000Z")
    const [row] = await asOwner((q) =>
      q(
        `SELECT updated_at <= now() + interval '5 minutes' AS not_past_limit,
                updated_at > now() + interval '4 minutes' AS close_to_limit
         FROM vice_attempts WHERE id = $1`,
        [id]
      )
    )
    expect(row).toEqual({ not_past_limit: true, close_to_limit: true })
  })

  it("applies to reports as well as attempts", async () => {
    const user = await newUser("vice-report")
    const attemptId = await storedAttempt(user, "run", OLDER)
    const reportId = randomUUID()
    await user.client.from("vice_reports").insert({ ...report(reportId, attemptId, MIDDLE, "justone"), user_id: user.id })
    await user.client.from("vice_reports").update({ ending: "drink", updated_at: OLDER }).eq("id", reportId)
    expect(await stampOf("vice_reports", reportId)).toBe(MIDDLE)
    const [row] = await asOwner((q) => q(`SELECT ending FROM vice_reports WHERE id = $1`, [reportId]))
    expect(row!.ending).toBe("justone")
  })
})

describe("vice_write_rows", () => {
  it("writes an attempt and a report together and skips nothing", async () => {
    const user = await newUser("vicew-both")
    const a = randomUUID()
    const r = randomUUID()
    const { data, error } = await user.client.rpc("vice_write_rows", {
      rows: { attempts: [attempt(a, "run", MIDDLE)], reports: [report(r, a, MIDDLE)] },
    })
    expect(error).toBeNull()
    expect(data).toEqual({ skipped: { attempts: [], reports: [] } })
    expect(await labelOf(a)).toBe("run")
    expect(await stampOf("vice_reports", r)).toBe(MIDDLE)
  })

  it("stores the rows under the signed-in person, whatever user_id the payload names", async () => {
    const user = await newUser("vicew-owner")
    const someoneElse = await newUser("vicew-other")
    const a = randomUUID()
    const { error } = await user.client.rpc("vice_write_rows", {
      rows: { attempts: [{ ...attempt(a, "mine", MIDDLE), user_id: someoneElse.id }], reports: [] },
    })
    expect(error).toBeNull()
    const [row] = await asOwner((q) => q(`SELECT user_id FROM vice_attempts WHERE id = $1`, [a]))
    expect(row!.user_id).toBe(user.id)
  })

  it("names an older copy as skipped and keeps the stored one", async () => {
    const user = await newUser("vicew-skip")
    const id = await storedAttempt(user, "kept", MIDDLE)
    const { data, error } = await user.client.rpc("vice_write_rows", {
      rows: { attempts: [attempt(id, "stale", OLDER)], reports: [] },
    })
    expect(error).toBeNull()
    expect(data).toEqual({ skipped: { attempts: [id], reports: [] } })
    expect(await labelOf(id)).toBe("kept")
  })

  it("takes a newer copy over the stored one", async () => {
    const user = await newUser("vicew-take")
    const id = await storedAttempt(user, "before", MIDDLE)
    const { data } = await user.client.rpc("vice_write_rows", { rows: { attempts: [attempt(id, "after", NEWER)], reports: [] } })
    expect(data).toEqual({ skipped: { attempts: [], reports: [] } })
    expect(await labelOf(id)).toBe("after")
  })

  it("will not overwrite or take over another person's row, and names it as skipped", async () => {
    const owner = await newUser("vicew-victim")
    const intruder = await newUser("vicew-intruder")
    const id = await storedAttempt(owner, "theirs", MIDDLE)
    const { data, error } = await intruder.client.rpc("vice_write_rows", {
      rows: { attempts: [attempt(id, "taken", NEWER)], reports: [] },
    })
    expect(error).toBeNull()
    expect(data).toEqual({ skipped: { attempts: [id], reports: [] } })
    const [row] = await asOwner((q) => q(`SELECT user_id, label FROM vice_attempts WHERE id = $1`, [id]))
    expect(row).toEqual({ user_id: owner.id, label: "theirs" })
  })

  it("writes nothing at all when one report is refused (a lapse lands whole or not at all)", async () => {
    const user = await newUser("vicew-atomic")
    const a = randomUUID()
    const { error } = await user.client.rpc("vice_write_rows", {
      rows: { attempts: [attempt(a, "run", MIDDLE)], reports: [report(randomUUID(), a, MIDDLE, "not-an-ending")] },
    })
    expect(error?.code).toBe("23514")
    expect(await labelOf(a)).toBeUndefined()
  })

  it("is refused when nobody is signed in", async () => {
    const env = stackEnv()
    const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const a = randomUUID()
    const { error } = await anon.rpc("vice_write_rows", { rows: { attempts: [attempt(a, "nobody", MIDDLE)], reports: [] } })
    expect(error?.message).toContain("not signed in")
    expect(await labelOf(a)).toBeUndefined()
  })
})
