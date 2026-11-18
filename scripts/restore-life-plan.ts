/**
 * Put a life-plan backup back into a database.
 *
 *   npx tsx scripts/restore-life-plan.ts <decrypted.json> --target <database url>             # says what it WOULD do
 *   npx tsx scripts/restore-life-plan.ts <decrypted.json> --target <url> --confirm            # writes
 *
 * Options
 *   --user <id>         restore only that account (default: every account in the file)
 *   --replace           delete the target's existing rows for those accounts first
 *   --live-i-mean-it    needed for any target that is not this machine
 *   --confirm           without it nothing is written
 *
 * Same ids as in the backup (no remapping). Everything runs in ONE transaction
 * and is checked before it commits: row counts and a hash of every restored
 * table must equal what the backup holds, or the whole thing rolls back.
 * The accounts must already exist in the target's auth.users; routines whose
 * program enrollment is missing in the target get that link cleared.
 * See scripts/backup/plan-backup.sh for how to decrypt a backup.
 */

import { readFileSync } from "node:fs"

import { Client } from "pg"

type Backup = { taken_at: string; tables: Record<string, Record<string, unknown>[]> }

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : undefined
}
const flag = (name: string) => process.argv.includes(name)

/** Parents before children, from the target's own foreign keys. */
async function fkOrder(db: Client, names: string[]) {
  const { rows } = await db.query<{ child: string; parent: string }>(
    `select conrelid::regclass::text as child, confrelid::regclass::text as parent
       from pg_constraint where contype = 'f'`,
  )
  const strip = (s: string) => s.replace(/^public\./, "").replace(/"/g, "")
  const set = new Set(names)
  const deps = new Map(names.map((n) => [n, new Set<string>()]))
  for (const r of rows) {
    const c = strip(r.child), p = strip(r.parent)
    if (set.has(c) && set.has(p) && c !== p) deps.get(c)!.add(p)
  }
  const out: string[] = []
  while (out.length < names.length) {
    const next = names.filter((n) => !out.includes(n) && [...deps.get(n)!].every((p) => out.includes(p)))
    if (next.length === 0) throw new Error("foreign keys form a cycle; cannot order tables")
    out.push(...next)
  }
  return out
}

async function main() {
  const file = process.argv[2]
  const target = arg("--target")
  if (!file || file.startsWith("--") || !target) {
    console.error("Usage: npx tsx scripts/restore-life-plan.ts <decrypted.json> --target <database url> [--user <id>] [--replace] [--confirm] [--live-i-mean-it]")
    process.exit(1)
  }
  const host = new URL(target).hostname
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) && !flag("--live-i-mean-it")) {
    throw new Error(`Refusing: ${host} is not this machine. Add --live-i-mean-it if you really mean it.`)
  }

  const backup = JSON.parse(readFileSync(file, "utf8")) as Backup
  if (!backup.tables || typeof backup.tables !== "object") throw new Error("Not a life-plan backup file.")
  const user = arg("--user")
  const names = Object.keys(backup.tables)
  const rowsOf = (t: string) => backup.tables[t].filter((r) => !user || r.user_id === user)
  const users = [...new Set(names.flatMap((t) => rowsOf(t).map((r) => r.user_id as string)))]

  console.log(`Backup taken ${backup.taken_at}. Accounts: ${users.length}${user ? " (filtered)" : ""}.`)
  for (const t of names) if (rowsOf(t).length) console.log(`  ${String(rowsOf(t).length).padStart(6)}  ${t}`)
  if (users.length === 0) throw new Error("Nothing to restore for that account.")

  const db = new Client({ connectionString: target })
  await db.connect()
  try {
    const order = await fkOrder(db, names)

    const known = await db.query(`select id from auth.users where id = any($1::uuid[])`, [users])
    if (known.rowCount !== users.length) {
      throw new Error(`${users.length - (known.rowCount ?? 0)} account(s) in the backup do not exist in the target's auth.users.`)
    }
    let existing = 0
    for (const t of names) {
      const r = await db.query(`select count(*)::int as n from public.${t} where user_id = any($1::uuid[])`, [users])
      existing += r.rows[0].n
    }
    if (existing > 0 && !flag("--replace")) {
      throw new Error(`The target already has ${existing} rows for these accounts. Add --replace to delete them first.`)
    }
    if (!flag("--confirm")) {
      console.log(`\nNothing was written. Add --confirm to restore${existing ? ` (it would delete ${existing} existing rows first)` : ""}.`)
      return
    }

    // Links to tables that are not part of the backup (program enrollments):
    // clear the ones the target lacks.
    const outside = await db.query<{ child: string; col: string; parent: string }>(
      `select conrelid::regclass::text as child, a.attname as col, confrelid::regclass::text as parent
         from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
        where contype = 'f' and array_length(conkey, 1) = 1
          and conrelid::regclass::text = any($1) and confrelid::regclass::text not like 'public.life_plan%'
          and confrelid::regclass::text <> 'auth.users'`,
      [names.map((n) => n)],
    )
    for (const o of outside.rows) {
      const t = o.child.replace(/^public\./, "")
      const vals = [...new Set(rowsOf(t).map((r) => r[o.col]).filter((v) => v != null))]
      const have = new Set((await db.query(`select id::text from ${o.parent} where id::text = any($1)`, [vals])).rows.map((r) => r.id))
      let cleared = 0
      for (const r of rowsOf(t)) if (r[o.col] != null && !have.has(String(r[o.col]))) { r[o.col] = null; cleared++ }
      if (cleared) console.log(`Cleared ${cleared} ${t}.${o.col} link(s) missing in the target.`)
    }

    await db.query("begin")
    if (existing > 0) {
      for (const t of [...order].reverse()) await db.query(`delete from public.${t} where user_id = any($1::uuid[])`, [users])
    }
    for (const t of order) {
      const rows = rowsOf(t)
      if (rows.length === 0) continue
      await db.query(`insert into public.${t} select * from json_populate_recordset(null::public.${t}, $1::json)`, [JSON.stringify(rows)])
    }

    // Verify inside the transaction: counts and content hash per table.
    let bad = 0
    console.log("\nVerify (backup vs restored):")
    for (const t of order) {
      const rows = rowsOf(t)
      const hash = (from: string) =>
        `select count(*)::int as n, md5(coalesce(string_agg(r::text, '|' order by r::text), '')) as h from ${from} r`
      const a = (await db.query(hash(`json_populate_recordset(null::public.${t}, $1::json)`), [JSON.stringify(rows)])).rows[0]
      const b = (await db.query(hash(`public.${t}`) + " where user_id = any($1::uuid[])", [users])).rows[0]
      const ok = a.n === b.n && a.h === b.h
      if (!ok) bad++
      if (rows.length || !ok) console.log(`  ${ok ? "match" : "MISMATCH"}  ${t}  ${a.n} / ${b.n}`)
    }
    if (bad) throw new Error(`${bad} table(s) differ after restore; rolled back.`)
    await db.query("commit")
    console.log("\nRestored and verified.")
  } catch (e) {
    await db.query("rollback").catch(() => {})
    throw e
  } finally {
    await db.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
