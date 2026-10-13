// @vitest-environment node
/**
 * EVERY COLUMN THE CODE SELECTS EXISTS IN PRODUCTION'S SCHEMA.
 *
 * Found 2026-10-13, the first time the code met production's real schema
 * (tests/db/baseline.sql) instead of the hand-written test copy: `scenarios`
 * has no `evaluation` column, so every scenario attempt failed to save and the
 * practice stats read 0 — for months, with every test green, because the test
 * copy had the column. PostgREST answers a wrong column with an error, and
 * several repos ignore that error.
 *
 * This reads every `.from("table").select("…")` in src/ and app/ and checks each
 * plain column against the baseline. It does not see `.eq`/`.order` arguments or
 * selects built at runtime; the repo-level tests in tests/integration/repos/ run
 * the code for real. KNOWN_WRONG may only shrink.
 */
import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(__dirname, "../../..")

/** Column references that are wrong today, with why. Delete an entry when it is fixed. */
const KNOWN_WRONG: Record<string, string> = {
  "src/db/scenarioRepo.ts scenarios.evaluation":
    "column does not exist in production — tests/integration/repos/scenarioRepo.integration.test.ts",
  "src/db/settingsRepo.ts scenarios.evaluation": "same defect, the settings page's scenario stats",
  "src/db/valuesRepo.ts values.display_name":
    "deliberate: listValues falls back when the column is missing (it branches on that error)",
}

function productionColumns(): Map<string, Set<string>> {
  const sql = fs.readFileSync(path.join(ROOT, "tests/db/baseline.sql"), "utf8")
  const tables = new Map<string, Set<string>>()
  for (const m of sql.matchAll(/CREATE TABLE IF NOT EXISTS "public"\."(\w+)" \(([\s\S]*?)\n\);/g)) {
    tables.set(m[1], new Set([...m[2].matchAll(/^\s+"(\w+)"/gm)].map((c) => c[1])))
  }
  for (const m of sql.matchAll(/ALTER TABLE "public"\."(\w+)" ADD COLUMN (?:IF NOT EXISTS )?"(\w+)"/g)) {
    tables.get(m[1])?.add(m[2])
  }
  return tables
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : sourceFiles(full)
    return /\.tsx?$/.test(e.name) ? [full] : []
  })
}

/** The top-level column names in a PostgREST select string; embedded relations are skipped. */
function topLevelColumns(select: string): string[] {
  let depth = 0
  let top = ""
  for (const ch of select) {
    if (ch === "(") depth++
    else if (ch === ")") depth--
    else if (depth === 0) top += ch
  }
  return top
    .split(",")
    .map((part) => part.trim().split("::")[0])
    .map((part) => (part.includes(":") ? part.split(":")[1].trim() : part))
    .map((part) => part.split("!")[0].split("->")[0].trim())
    .filter((part) => /^\w+$/.test(part))
}

const SELECT = /\.from\(\s*["'](\w+)["']\s*\)\s*\.select\(\s*(["'`])([\s\S]*?)\2/g

function scan() {
  const tables = productionColumns()
  const found: string[] = []
  let selects = 0
  for (const file of [...sourceFiles(path.join(ROOT, "src")), ...sourceFiles(path.join(ROOT, "app"))]) {
    const rel = path.relative(ROOT, file)
    for (const m of fs.readFileSync(file, "utf8").matchAll(SELECT)) {
      selects++
      const [, table, , body] = m
      const columns = tables.get(table)
      if (!columns) {
        found.push(`${rel} ${table} (no such table)`)
        continue
      }
      for (const col of topLevelColumns(body)) {
        if (!columns.has(col) && !tables.has(col)) found.push(`${rel} ${table}.${col}`)
      }
    }
  }
  return { found: [...new Set(found)].sort(), selects, tables: tables.size }
}

describe("the code and production's schema agree", () => {
  const { found, selects, tables } = scan()

  it("reads the schema and the code at all", () => {
    expect(tables).toBeGreaterThan(50)
    expect(selects).toBeGreaterThan(100)
  })

  it("selects no column production does not have, beyond the known list", () => {
    expect(found.filter((f) => !(f in KNOWN_WRONG))).toEqual([])
  })

  it("keeps no stale entry on the known list", () => {
    expect(Object.keys(KNOWN_WRONG).filter((k) => !found.includes(k))).toEqual([])
  })

  it("would catch a wrong column", () => {
    // An embedded relation keeps its name here; scan() then skips it as a table.
    const columns = topLevelColumns("id, nope, rel:other_table(x, y), score::text")
    expect(columns).toEqual(["id", "nope", "other_table", "score"])
  })
})

/**
 * Production's schema as the test backend builds it: the baseline, plus every
 * migration newer than its stamp (scripts/db/test-stack.mjs does the same).
 */
function productionSql(): string {
  const baseline = fs.readFileSync(path.join(ROOT, "tests/db/baseline.sql"), "utf8")
  const stamp = /^-- baseline-stamp: (\d+)$/m.exec(baseline)?.[1]
  if (!stamp) throw new Error("tests/db/baseline.sql has no baseline-stamp line")
  const version = (file: string) => BigInt((/^(\d+)_/.exec(file)?.[1] ?? "0").padEnd(14, "0"))
  const dir = path.join(ROOT, "supabase/migrations")
  const newer = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".sql") && version(e.name) > BigInt(stamp))
    .map((e) => fs.readFileSync(path.join(dir, e.name), "utf8"))
  return [baseline, ...newer].join("\n")
}

describe("the functions the code calls exist in production's schema", () => {
  /**
   * Moved here 2026-10-13 from tests/unit/db/schemaMirror.test.ts, which
   * checked the same names against the hand-written test schema; that schema
   * is gone, and production's is the one that answers the app. A name that
   * is missing fails every call at runtime with "function not found".
   */
  it("every `.rpc(\"name\")` in src/ and app/ is a function production has", () => {
    const sql = productionSql()
    const called = new Set<string>()
    for (const file of [...sourceFiles(path.join(ROOT, "src")), ...sourceFiles(path.join(ROOT, "app"))]) {
      for (const m of fs.readFileSync(file, "utf8").matchAll(/\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) called.add(m[1])
    }
    expect(called.size, "no .rpc( call found at all — the search has stopped working").toBeGreaterThan(5)

    const defined = (name: string) =>
      new RegExp(`function\\s+(?:"?public"?\\.)?"?${name}"?\\s*\\(`, "i").test(sql)
    expect([...called].filter((name) => !defined(name)).sort(), "the app calls these; production has no such function").toEqual([])
    expect(defined("no_such_function_anywhere"), "the search would accept any name").toBe(false)
  })
})
