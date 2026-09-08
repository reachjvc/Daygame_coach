/**
 * Put a backup back into the database.
 *
 *     npx tsx scripts/restore-timetrack.ts backups/timetrack-....json            # says what it WOULD do
 *     npx tsx scripts/restore-timetrack.ts backups/timetrack-....json --confirm  # actually writes
 *
 * It does not delete anything. Rows are matched by their own ids, so anything
 * created since the backup survives and anything the backup holds is written
 * over the top. Running it twice changes nothing the second time.
 *
 * WITHOUT --confirm IT WRITES NOTHING. Restoring over live data is the kind of
 * thing that should take two deliberate acts, not one mistyped command.
 */

import { readFileSync } from "node:fs"

import { config } from "dotenv"

import { assertRestorable, restoreTimetrack } from "../src/db/timetrackBackupRepo"

config({ path: ".env.local" })

async function main() {
  const path = process.argv[2]
  if (!path) {
    console.error("Which file? Usage: npx tsx scripts/restore-timetrack.ts <file> [--confirm]")
    process.exit(1)
  }

  const backup = JSON.parse(readFileSync(path, "utf8")) as unknown
  assertRestorable(backup)

  const total = Object.values(backup.counts).reduce((sum, n) => sum + n, 0)
  console.log(`This backup was taken ${backup.takenAt} and holds ${total} rows:`)
  for (const [table, count] of Object.entries(backup.counts)) {
    if (count > 0) console.log(`  ${String(count).padStart(6)}  ${table.replace("timetrack_", "")}`)
  }

  if (!process.argv.includes("--confirm")) {
    console.log("\nNothing was written. Add --confirm to actually restore it.")
    return
  }

  const result = await restoreTimetrack(backup)
  console.log(`\nRestored ${result.total} rows.`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
