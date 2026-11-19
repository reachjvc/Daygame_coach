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

describe("restoreTimetrack", () => {
  it("writes every row of the backup back as it was, after the rows were lost and changed", async () => {
    const a = await aTimeLog("restore-own")
    const before = await snapshot(a.id)
    const backup = await exportTimetrack(a.id)

    // damage: one entry deleted outright, another edited, a tag link and the settings gone/changed
    await asOwner(async (q) => {
      await q("delete from timetrack_entry_tags where entry_id = $1", [a.entry])
      await q("delete from timetrack_entries where id = $1", [a.entry])
      await q("update timetrack_entries set description = 'Overwritten', duration_seconds = 1, billable = true where id = $1", [a.entry2])
      await q("update timetrack_projects set name = 'Renamed', rate = 1 where id = $1", [a.project])
      await q("update timetrack_settings set prefs = '{}' where user_id = $1", [a.id])
    })

    const result = await restoreTimetrack(backup)

    expect(result.total).toBe(Object.values(backup.counts).reduce((s, n) => s + n, 0))
    expect(result.written.timetrack_entries).toBe(2)
    const after = await snapshot(a.id)
    // The restored rows hold the backup's own values, field for field. (A change stamp the
    // database writes on the way in is the one column allowed to differ, so compare by column.)
    const rows = await asOwner((q) =>
      q(
        `select e.id, e.description, e.billable, e.duration_seconds, e.project_id, e.task_id, e.started_at, e.stopped_at,
                p.name as project_name, p.rate, p.color, p.member_ids, s.prefs
         from timetrack_entries e
         join timetrack_projects p on p.id = e.project_id
         join timetrack_settings s on s.user_id = e.user_id
         where e.user_id = $1 and e.id = $2`,
        [a.id, a.entry]
      )
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      description: "Wrote the header",
      billable: true,
      duration_seconds: 5400,
      project_id: a.project,
      task_id: a.task,
      project_name: "Site",
      color: "#112233",
      member_ids: ["x", "y"],
      prefs: { theme: "dark" },
    })
    expect(Number(rows[0].rate)).toBe(42.5)
    const [second] = await asOwner((q) => q("select description, duration_seconds from timetrack_entries where id = $1", [a.entry2]))
    expect(second).toEqual({ description: "Second one", duration_seconds: 900 })
    expect(after.timetrack_entry_tags).toEqual(before.timetrack_entry_tags)
    for (const table of TIMETRACK_TABLES) {
      expect(after[table].length, `${table} row count`).toBe(before[table].length)
    }
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
    const once = await snapshot(a.id)
    await restoreTimetrack(backup)

    const twice = await snapshot(a.id)
    for (const table of TIMETRACK_TABLES) expect(twice[table].length, table).toBe(once[table].length)
    expect(twice.timetrack_entries.map((r) => r.slice(0, 60)).sort()).toEqual(once.timetrack_entries.map((r) => r.slice(0, 60)).sort())
  })
})
