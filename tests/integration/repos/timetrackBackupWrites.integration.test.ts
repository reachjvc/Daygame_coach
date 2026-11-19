/**
 * RESTORING THE TIME LOG FROM A BACKUP, AGAINST THE REAL SCHEMA.
 *
 * `restoreTimetrack` is the one way back if the owner's daily Time Log is
 * damaged, and until this file nothing automated had ever called it (the
 * comment on the repo said so). What a restore must do, and what is proven:
 *
 *   1. every row in the backup is written exactly as the backup holds it;
 *   2. the account's rows are the backup's, with what was lost put back and
 *      what was changed since put back as it was;
 *   3. nothing the backup does not hold is deleted (rows made after it stay);
 *   4. another account's rows are byte-identical afterwards;
 *   5. a second restore changes nothing the first did not.
 *
 * It runs as the server's own key, which bypasses row security: for this
 * function the backup's contents are the only fence there is.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { asOwner, newUser } from "@/tests/db/harness"
import { exportTimetrack, restoreTimetrack } from "@/src/db/timetrackBackupRepo"
import { TIMETRACK_TABLES } from "@/src/db/timetrackTypes"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

interface Account {
  id: string
  ws: string
  client: string
  project: string
  task: string
  tag: string
  entry: string
  entry2: string
}

/** A whole little Time Log: every table the restore orders by parent, plus the link and the settings. */
async function aTimeLog(label: string): Promise<Account> {
  const user = await newUser(label)
  const a: Account = {
    id: user.id,
    ws: randomUUID(),
    client: randomUUID(),
    project: randomUUID(),
    task: randomUUID(),
    tag: randomUUID(),
    entry: randomUUID(),
    entry2: randomUUID(),
  }
  await asOwner(async (q) => {
    await q("insert into timetrack_workspaces (id, user_id, name, currency, config) values ($1,$2,'Work','USD','{\"a\":1}')", [a.ws, a.id])
    await q("insert into timetrack_clients (id, user_id, workspace_id, name) values ($1,$2,$3,'Acme')", [a.client, a.id, a.ws])
    await q(
      "insert into timetrack_projects (id, user_id, workspace_id, client_id, name, color, billable, rate, member_ids) values ($1,$2,$3,$4,'Site','#112233',true,42.5,'{x,y}')",
      [a.project, a.id, a.ws, a.client]
    )
    await q("insert into timetrack_tasks (id, user_id, project_id, name, estimated_seconds) values ($1,$2,$3,'Header',7200)", [a.task, a.id, a.project])
    await q("insert into timetrack_tags (id, user_id, workspace_id, name) values ($1,$2,$3,'deep')", [a.tag, a.id, a.ws])
    await q(
      `insert into timetrack_entries (id, user_id, workspace_id, project_id, task_id, description, billable, started_at, stopped_at, duration_seconds)
       values ($1,$2,$3,$4,$5,'Wrote the header',true,'2026-11-01T09:00:00Z','2026-11-01T10:30:00Z',5400)`,
      [a.entry, a.id, a.ws, a.project, a.task]
    )
    await q(
      `insert into timetrack_entries (id, user_id, workspace_id, description, started_at, stopped_at, duration_seconds)
       values ($1,$2,$3,'Second one','2026-11-02T09:00:00Z','2026-11-02T09:15:00Z',900)`,
      [a.entry2, a.id, a.ws]
    )
    await q("insert into timetrack_entry_tags (entry_id, tag_id, user_id) values ($1,$2,$3)", [a.entry, a.tag, a.id])
    await q("insert into timetrack_settings (user_id, prefs) values ($1,'{\"theme\":\"dark\"}') on conflict (user_id) do update set prefs = excluded.prefs", [a.id])
  })
  return a
}

/** Every row of one account across every backed-up table, as text, for byte comparison. */
async function snapshot(userId: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {}
  await asOwner(async (q) => {
    for (const table of TIMETRACK_TABLES) {
      const rows = await q(`select t::text as r from ${table} t where user_id = $1 order by 1`, [userId])
      out[table] = rows.map((r) => String(r.r))
    }
  })
  return out
}

/** Backed-up rows as JSON, ordered, for comparison with what the database now holds. */
async function storedRows(table: string, userId: string): Promise<Record<string, unknown>[]> {
  const rows = await asOwner((q) => q(`select to_jsonb(t) as r from ${table} t where user_id = $1`, [userId]))
  return rows.map((r) => r.r as Record<string, unknown>)
}

/** The database stamps `updated_at` on every update of these tables, so it is the one column that may differ. */
const withoutStamp = (row: Record<string, unknown>) => {
  const { updated_at: _stamp, ...rest } = row
  void _stamp
  return JSON.stringify(Object.entries(rest).sort(([x], [y]) => x.localeCompare(y)))
}

describe("restoreTimetrack", () => {
  it("writes every row of the backup back as it was, after rows were lost and changed", async () => {
    const a = await aTimeLog("restore-own")
    const backup = await exportTimetrack(a.id)

    // damage: one entry and its tag link deleted outright, others edited
    await asOwner(async (q) => {
      await q("delete from timetrack_entry_tags where entry_id = $1", [a.entry])
      await q("delete from timetrack_entries where id = $1", [a.entry])
      await q("update timetrack_entries set description = 'Overwritten', duration_seconds = 1, billable = true where id = $1", [a.entry2])
      await q("update timetrack_projects set name = 'Renamed', rate = 1, member_ids = '{}' where id = $1", [a.project])
      await q("update timetrack_workspaces set name = 'Gone', config = '{}' where id = $1", [a.ws])
      await q("update timetrack_settings set prefs = '{}' where user_id = $1", [a.id])
    })

    const result = await restoreTimetrack(backup)

    expect(result.total).toBe(Object.values(backup.counts).reduce((sum, n) => sum + n, 0))
    expect(result.written.timetrack_entries).toBe(2)
    expect(result.written.timetrack_entry_tags).toBe(1)
    let compared = 0
    for (const table of TIMETRACK_TABLES) {
      const saved = (backup.tables[table] as Record<string, unknown>[]).map(withoutStamp).sort()
      const now = (await storedRows(table, a.id)).map(withoutStamp).sort()
      expect(now, `${table} as the backup holds it`).toEqual(saved)
      compared += saved.length
    }
    expect(compared, "the backup held a row in every table this test arranged").toBeGreaterThanOrEqual(8)
  })

  it("leaves another account's rows byte-identical, and writes only rows the backup holds", async () => {
    const mine = await aTimeLog("restore-mine")
    const theirs = await aTimeLog("restore-theirs")
    const backup = await exportTimetrack(mine.id)
    const theirsBefore = await snapshot(theirs.id)

    await asOwner((q) => q("update timetrack_entries set description = 'changed since' where id = $1", [mine.entry]))
    await restoreTimetrack(backup)

    expect(await snapshot(theirs.id)).toEqual(theirsBefore)
    // the backup was one person's: no row of anyone else's is in it
    for (const table of TIMETRACK_TABLES) {
      for (const row of backup.tables[table] as { user_id: string }[]) expect(row.user_id).toBe(mine.id)
    }
  })

  it("deletes nothing: a row made after the backup survives the restore", async () => {
    const a = await aTimeLog("restore-keeps")
    const backup = await exportTimetrack(a.id)
    const later = randomUUID()
    await asOwner((q) =>
      q(
        `insert into timetrack_entries (id, user_id, workspace_id, description, started_at, stopped_at, duration_seconds)
         values ($1,$2,$3,'Made after the backup','2026-11-10T09:00:00Z','2026-11-10T09:10:00Z',600)`,
        [later, a.id, a.ws]
      )
    )

    await restoreTimetrack(backup)

    const [kept] = await asOwner((q) => q("select description from timetrack_entries where id = $1", [later]))
    expect(kept).toEqual({ description: "Made after the backup" })
  })

  it("restoring twice changes nothing the first restore did not", async () => {
    const a = await aTimeLog("restore-twice")
    const backup = await exportTimetrack(a.id)
    await asOwner((q) => q("delete from timetrack_entries where id = $1", [a.entry2]))

    await restoreTimetrack(backup)
    const once: Record<string, string[]> = {}
    for (const table of TIMETRACK_TABLES) once[table] = (await storedRows(table, a.id)).map(withoutStamp).sort()
    await restoreTimetrack(backup)

    for (const table of TIMETRACK_TABLES) {
      expect((await storedRows(table, a.id)).map(withoutStamp).sort(), table).toEqual(once[table])
    }
    expect(once.timetrack_entries).toHaveLength(2)
  })
})
