/**
 * THE TEST DATABASE HAS TO BE THE REAL DATABASE, OR IT PROVES NOTHING.
 *
 * WHAT THE MIRROR IS. The database tests (`npm run test:integration`) start a
 * throwaway Postgres and build it from one hand-written file,
 * `tests/integration/schema.sql`. Production is built from the numbered files in
 * `supabase/migrations/`. Two descriptions of one database, kept in step by
 * hand.
 *
 * WHAT WENT WRONG, and why this file exists. On 2026-09-17 the mirror was
 * missing fifteen row rules — every rule on `workout_logs`, `workout_sets`,
 * `program_enrollments` and `life_answers`. A "row rule" (RLS) is the database's
 * own answer to "whose rows may this person touch". With none of them present,
 * a test asking "is another person refused?" would have passed while the
 * database let everybody through: the right answer for the wrong reason, which
 * is worse than a red test. The finish-a-workout function was absent entirely,
 * and the weight ceiling said 1000 where production says 999.99.
 *
 * WHAT THIS CHECKS. Three things, all of them "does the copy still say what the
 * original says":
 *   1. every row rule production declares — on a table the mirror actually has —
 *      is in the mirror;
 *   2. every database function the app calls by name exists in the mirror;
 *   3. where both places define the same CHECK rule or the same function, the
 *      newest definition in the migrations matches the mirror's, word for word
 *      once spacing, keyword case and comments are set aside.
 *
 * Rule 3 is the one that catches tomorrow's version of this: change a function's
 * parameters in a migration and forget the mirror, and this goes red the same
 * day instead of the mirror quietly testing last month's database.
 */

import { describe, test, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const root = path.resolve(__dirname, "../../..")
const migrationsDir = path.join(root, "supabase/migrations")
const schema = fs.readFileSync(path.join(root, "tests/integration/schema.sql"), "utf8")

/** Migrations in the order Postgres applies them: by filename. */
const migrations = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ file: f, sql: fs.readFileSync(path.join(migrationsDir, f), "utf8") }))

/**
 * Two pieces of SQL that differ only in spacing, keyword case or comments are
 * the same piece of SQL. Text inside quotes is left exactly as written, because
 * there the case IS the meaning — 'Push' and 'push' are different labels.
 */
function sqlNormalise(sql: string): string {
  let out = ""
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    if (c === "'") {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") {
          j += 2
          continue
        }
        if (sql[j] === "'") {
          j++
          break
        }
        j++
      }
      out += sql.slice(i, j)
      i = j
      continue
    }
    if (c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i)
      i = nl < 0 ? sql.length : nl
      out += " "
      continue
    }
    out += c.toLowerCase()
    i++
  }
  return out.replace(/\s+/g, " ").trim()
}

/** The text from an opening bracket to the bracket that closes it. */
function bracketed(text: string, open: number): string | null {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++
    else if (text[i] === ")") {
      depth--
      if (depth === 0) return text.slice(open, i + 1)
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Row rules
// ---------------------------------------------------------------------------

interface Policy {
  table: string
  name: string
  where: string
}

function policiesIn(sql: string, where: string): Policy[] {
  // Case-insensitive on purpose: 20260827000000_create_life_answers.sql writes
  // `create policy ... on public.life_answers` in lower case, and an earlier
  // version of this check missed all three of its rules because of it.
  return [...sql.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+(?:public\.)?([a-z0-9_]+)/gi)].map((m) => ({
    name: m[1],
    table: m[2].toLowerCase(),
    where,
  }))
}

function policyDropsIn(sql: string): Array<{ table: string; name: string }> {
  return [...sql.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+(?:public\.)?([a-z0-9_]+)/gi)].map(
    (m) => ({ name: m[1], table: m[2].toLowerCase() }),
  )
}

/** Tables the mirror actually declares — it does not try to hold every table. */
const mirroredTables = new Set(
  [...schema.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z0-9_]+)/gi)].map((m) =>
    m[1].toLowerCase(),
  ),
)

describe("the test schema mirrors production", () => {
  test("every policy production declares on a table the test schema also declares is in the test schema", () => {
    const live = new Map<string, Policy>()
    for (const { file, sql } of migrations) {
      for (const p of policiesIn(sql, file)) live.set(`${p.table}|${p.name}`, p)
      // A policy dropped by a later migration is gone from production too.
      for (const d of policyDropsIn(sql)) live.delete(`${d.table}|${d.name}`)
    }

    const mirrored = new Set(policiesIn(schema, "schema.sql").map((p) => `${p.table}|${p.name}`))
    const missing = [...live.values()]
      .filter((p) => mirroredTables.has(p.table) && !mirrored.has(`${p.table}|${p.name}`))
      .map((p) => `${p.table}: "${p.name}" (${p.where})`)

    expect(
      missing.sort(),
      "the database tests would pass without these rules being enforced — copy them into tests/integration/schema.sql",
    ).toEqual([])
  })

  /**
   * Functions the app calls with `.rpc("name")`. If the mirror does not have
   * one, no database test can exercise it, which is how `finish_program_workout`
   * — the guard against finishing a workout twice — went untested for a fortnight.
   */
  test("every database function the app calls by name exists in the test schema", () => {
    const called = new Set<string>()
    for (const file of fs.readdirSync(path.join(root, "src/db")).filter((f) => f.endsWith(".ts"))) {
      const text = fs.readFileSync(path.join(root, "src/db", file), "utf8")
      for (const m of text.matchAll(/\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) called.add(m[1])
    }

    // pgvector's similarity search cannot be modelled in a plain Postgres
    // container. This set may only shrink: the day the container gains the
    // extension, delete the entry rather than adding a new excuse beside it.
    const PGVECTOR_ONLY = new Set(["match_embeddings", "match_embeddings_test"])

    const missing = [...called]
      .filter((name) => !PGVECTOR_ONLY.has(name))
      .filter((name) => !new RegExp(`function\\s+(?:public\\.)?${name}\\s*\\(`, "i").test(schema))

    expect(missing.sort(), "the app calls these; the test database has never heard of them").toEqual([])
    expect(called.size, "no .rpc( call found at all — the search above has stopped working").toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Latest definition wins
// ---------------------------------------------------------------------------

/** Every `CONSTRAINT <name> CHECK (…)`, inline or added later, by name. */
function checksIn(sql: string): Map<string, string> {
  const found = new Map<string, string>()
  const re = /(?:add\s+)?constraint\s+([a-z0-9_]+)\s+check\s*\(/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(sql))) {
    const expression = bracketed(sql, re.lastIndex - 1)
    if (expression) found.set(m[1].toLowerCase(), sqlNormalise(expression))
  }
  return found
}

/** Every function definition, from CREATE to the end of its quoted body. */
function functionsIn(sql: string): Map<string, string> {
  const found = new Map<string, string>()
  const re = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\(/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(sql))) {
    const rest = sql.slice(m.index)
    // The body is wrapped in a dollar-quote whose tag is whatever the author
    // chose ($$, $fn$). Find the tag, then its closing twin.
    const tag = rest.match(/\sAS\s+(\$[a-z_]*\$)/i)
    if (!tag) continue
    const bodyStart = rest.indexOf(tag[1]) + tag[1].length
    const bodyEnd = rest.indexOf(tag[1], bodyStart)
    if (bodyEnd < 0) continue
    const definition = sqlNormalise(rest.slice(0, bodyEnd + tag[1].length))
      // The tag itself, "or replace", and a public. prefix are spelling, not
      // meaning: the same function is the same function however it is written.
      .replace(/\$[a-z_]*\$/g, "$$$$")
      .replace(/^create or replace function /, "create function ")
      .replace(/^create function public\./, "create function ")
    found.set(m[1].toLowerCase(), definition)
  }
  return found
}

describe("where both places define the same thing, they say the same thing", () => {
  const latestChecks = new Map<string, { sql: string; file: string }>()
  const latestFunctions = new Map<string, { sql: string; file: string }>()
  for (const { file, sql } of migrations) {
    for (const [name, text] of checksIn(sql)) latestChecks.set(name, { sql: text, file })
    for (const [name, text] of functionsIn(sql)) latestFunctions.set(name, { sql: text, file })
  }
  const mirrorChecks = checksIn(schema)
  const mirrorFunctions = functionsIn(schema)

  test("the latest definition of every CHECK constraint named in both places matches", () => {
    const drifted: string[] = []
    for (const [name, mirrored] of mirrorChecks) {
      const production = latestChecks.get(name)
      if (!production) continue
      if (production.sql !== mirrored) {
        drifted.push(`${name}\n    ${production.file}: ${production.sql}\n    schema.sql: ${mirrored}`)
      }
    }
    expect(drifted.sort(), "the test database enforces a different rule from production").toEqual([])
    // If the parser ever stops finding constraints, everything above passes by
    // comparing nothing. This is the floor that says it is still looking.
    expect([...mirrorChecks.keys()].filter((n) => latestChecks.has(n)).length).toBeGreaterThanOrEqual(9)
  })

  test("the latest definition of every function named in both places matches", () => {
    const drifted: string[] = []
    for (const [name, mirrored] of mirrorFunctions) {
      const production = latestFunctions.get(name)
      if (!production) continue
      if (production.sql !== mirrored) {
        drifted.push(`${name}\n    ${production.file}:\n      ${production.sql}\n    schema.sql:\n      ${mirrored}`)
      }
    }
    expect(
      drifted.sort(),
      "a migration changed a function and the test schema still has the old one — copy the newest definition across",
    ).toEqual([])
    expect([...mirrorFunctions.keys()].filter((n) => latestFunctions.has(n)).length).toBeGreaterThanOrEqual(5)
  })
})
