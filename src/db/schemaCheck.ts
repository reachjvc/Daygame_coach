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
    try {
      // Query information_schema to check if column exists
      const { data, error } = await supabase
        .from("information_schema.columns" as never)
        .select("column_name")
        .eq("table_schema", "public")
        .eq("table_name", expectation.table)
        .eq("column_name", expectation.column)
        .maybeSingle()

      if (error || !data) {
        missing.push(expectation)
      }
    } catch {
      // If we can't query information_schema, try a direct approach
      try {
        const { error } = await supabase
          .from(expectation.table)
          .select(expectation.column)
          .limit(0)

        if (error?.message?.includes("does not exist") ||
            error?.message?.includes("unknown column") ||
            error?.code === "42703") {
          missing.push(expectation)
        }
      } catch {
        // Can't verify - assume missing to be safe
        missing.push(expectation)
      }
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
