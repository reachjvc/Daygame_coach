/**
 * Runtime schema validation to catch missing migrations early.
 * Runs on app startup and logs clear warnings if expected schema is missing.
 */

import { createServerSupabaseClient } from "./server"

interface SchemaExpectation {
  table: string
  column: string
  addedIn: string // Migration file name for reference
  critical: boolean // If true, features will break without it
}

/**
 * Define expected schema elements here.
 * When adding new migrations that code depends on, add an entry here.
 */
const EXPECTED_SCHEMA: SchemaExpectation[] = [
  {
    table: "milestones",
    column: "session_id",
    addedIn: "20260209_001_add_session_to_milestones.sql",
    critical: true,
  },
  // Add new schema expectations here as migrations are created
]

interface SchemaCheckResult {
  valid: boolean
  missing: SchemaExpectation[]
  checked: number
}

let cachedResult: SchemaCheckResult | null = null
let lastCheckTime = 0
const CACHE_DURATION_MS = 60 * 1000 // Re-check every 60 seconds max

/**
 * Check if all expected schema elements exist in the database.
 * Results are cached to avoid repeated queries.
 */
export async function checkSchema(): Promise<SchemaCheckResult> {
  const now = Date.now()
  if (cachedResult && now - lastCheckTime < CACHE_DURATION_MS) {
    return cachedResult
  }

  const supabase = await createServerSupabaseClient()
  const missing: SchemaExpectation[] = []

  for (const expectation of EXPECTED_SCHEMA) {
    // ASK THE TABLE, NOT THE CATALOGUE.
    //
    // This used to query `information_schema.columns` through PostgREST, which
    // does not expose that schema — so the query ALWAYS errored, the error was
    // read as "column missing", and every page load printed a CRITICAL warning
    // about a column that has existed for months. A check that cannot pass is
    // worse than no check: it trains everyone to ignore the one time it is right.
    //
    // Selecting the column with `limit(0)` asks the only question that matters —
    // can the app read this column — and costs nothing.
    const { error } = await supabase
      .from(expectation.table)
      .select(expectation.column)
      .limit(0)

    // 42703 is Postgres "undefined column"; PGRST204 is PostgREST's own version
    // of the same answer. Anything else (a network blip, RLS) is not evidence
    // the column is missing, and must not be reported as one.
    if (error && (error.code === "42703" || error.code === "PGRST204")) {
      missing.push(expectation)
    } else if (error) {
      console.warn(
        `[schemaCheck] could not verify ${expectation.table}.${expectation.column}: ${error.message}`
      )
    }
  }

  cachedResult = {
    valid: missing.length === 0,
    missing,
    checked: EXPECTED_SCHEMA.length,
  }
  lastCheckTime = now

  // Log warnings for missing schema
  if (missing.length > 0) {
    console.error("\n" + "=".repeat(70))
    console.error("DATABASE SCHEMA WARNING - MISSING MIGRATIONS")
    console.error("=".repeat(70))
    for (const m of missing) {
      console.error(`
  TABLE: ${m.table}
  COLUMN: ${m.column}
  MIGRATION: ${m.addedIn}
  CRITICAL: ${m.critical ? "YES - Features will break!" : "No"}
`)
    }
    console.error("Run the missing migrations in Supabase SQL Editor:")
    console.error("  supabase/migrations/<filename>")
    console.error("=".repeat(70) + "\n")
  }

  return cachedResult
}

/**
 * Get missing migrations as SQL statements for easy copy-paste.
 */
export function getMissingSchemaSql(missing: SchemaExpectation[]): string[] {
  return missing.map((m) => `-- From: ${m.addedIn}\n-- Check supabase/migrations/${m.addedIn}`)
}

/**
 * Quick check if a specific column exists (uses cache).
 */
export async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await checkSchema()
  return !result.missing.some((m) => m.table === table && m.column === column)
}
