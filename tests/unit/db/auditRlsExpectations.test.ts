/**
 * AN EXCUSE MUST NOT OUTLIVE THE THING IT EXCUSES.
 *
 * `scripts/audit-rls.ts` asks the live database which tables have no per-person
 * row rules and shouts about the ones that should. `INTENTIONAL` is the list of
 * tables that are meant to have none — reference data everybody may read, or a
 * table only the server ever touches — each with the reason written beside it.
 *
 * THE FAULT THIS CATCHES. The audit only runs by hand, and only for somebody
 * signed in to Supabase, so nothing noticed when `user_xp` sat in that list
 * reading "pending a keep-or-drop decision" days after the table had actually
 * been dropped (20260914120000_drop_four_orphan_tables.sql). A stale excuse is
 * worse than no excuse: it is a note saying a decision is still open when it was
 * made and acted on, and the next person to read the list trusts it.
 *
 * WHAT CAN AND CANNOT BE PROVEN HERE. Several of these tables were created
 * before this repo kept migrations at all, so "it exists" cannot be read off the
 * migration files for every one of them. What can be read off them, and is the
 * half that actually went wrong, is the opposite: a table a migration has
 * DROPPED and never recreated is gone, and an excuse naming it is dead text.
 */

import { describe, test, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { INTENTIONAL } from "../../../scripts/auditRlsExpectations"

const root = path.resolve(__dirname, "../../..")
const migrationsDir = path.join(root, "supabase/migrations")
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ file: f, sql: fs.readFileSync(path.join(migrationsDir, f), "utf8") }))

describe("the RLS audit's list of deliberate exceptions", () => {
  test("every table the RLS audit excuses still exists", () => {
    // Applied in filename order, the last word on a table is what is true now:
    // created, then dropped, means gone; dropped, then created again, means back.
    const alive = new Map<string, boolean>()
    const known = new Set<string>()
    for (const { sql } of migrations) {
      for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi)) {
        alive.set(m[1].toLowerCase(), true)
        known.add(m[1].toLowerCase())
      }
      for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi)) {
        alive.set(m[1].toLowerCase(), false)
        known.add(m[1].toLowerCase())
      }
    }

    const dropped = Object.keys(INTENTIONAL).filter((table) => alive.get(table) === false)
    expect(
      dropped.sort(),
      "these tables were dropped by a migration — delete their line from scripts/auditRlsExpectations.ts",
    ).toEqual([])

    // The weaker half, for the tables that predate the migrations folder: the
    // name has to appear in the repo's SQL as a TABLE, not just as a word. A
    // typo, or a table that was never in this project, gets caught here.
    //
    // The "as a table" part is load-bearing. Searching for the bare word would
    // let `values` pass on the `VALUES (...)` in any INSERT in the repo — the
    // excuse would look checked while nothing had been checked at all. So the
    // name has to follow one of the words that can only be followed by a table.
    const allSql = migrations.map((m) => m.sql).join("\n") + fs.readFileSync(path.join(root, "tests/integration/schema.sql"), "utf8")
    const namedAsATable = (table: string) =>
      new RegExp(`\\b(?:table|on|from|into|update)\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?"?${table}"?\\b`, "i")
    const unheardOf = Object.keys(INTENTIONAL).filter((table) => !namedAsATable(table).test(allSql))
    expect(unheardOf.sort(), "no SQL in this repo mentions these tables at all").toEqual([])
  })

  test("every excuse has a reason", () => {
    const silent = Object.entries(INTENTIONAL)
      .filter(([, reason]) => typeof reason !== "string" || reason.trim().length < 20)
      .map(([table]) => table)
    expect(silent.sort(), "a table with no reason beside it is a table nobody decided about").toEqual([])
  })

  test("the audit script reads this list rather than keeping its own copy", () => {
    const script = fs.readFileSync(path.join(root, "scripts/audit-rls.ts"), "utf8")
    expect(script).toMatch(/import \{ INTENTIONAL \} from "\.\/auditRlsExpectations"/)
    // A second `const INTENTIONAL = {` in the script means the list was forked,
    // and a forked list is one that drifts without anyone noticing.
    expect(script).not.toMatch(/const INTENTIONAL/)
  })
})
