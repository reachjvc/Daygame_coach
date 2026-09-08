/**
 * Take a copy of the tracked time and write it to a file.
 *
 *     npx tsx scripts/backup-timetrack.ts                  # everything, into ./backups
 *     npx tsx scripts/backup-timetrack.ts --out /some/dir
 *     npx tsx scripts/backup-timetrack.ts --user <uuid>    # one person only
 *
 * The file is plain JSON, so it can be read without this app existing. Keep one
 * somewhere that is not the same database it came from — a copy that dies with
 * the original is not a copy.
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { config } from "dotenv"

import { exportTimetrack } from "../src/db/timetrackBackupRepo"

config({ path: ".env.local" })

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? (process.argv[i + 1] ?? null) : null
}

async function main() {
  const out = arg("out") ?? "backups"
  const userId = arg("user")

  const backup = await exportTimetrack(userId)
  const total = Object.values(backup.counts).reduce((sum, n) => sum + n, 0)

  mkdirSync(out, { recursive: true })
  const name = `timetrack-${backup.takenAt.slice(0, 19).replace(/[:T]/g, "-")}.json`
  const path = join(out, name)
  writeFileSync(path, JSON.stringify(backup, null, 2))

  console.log(`Backed up ${total} rows to ${path}`)
  for (const [table, count] of Object.entries(backup.counts)) {
    if (count > 0) console.log(`  ${String(count).padStart(6)}  ${table.replace("timetrack_", "")}`)
  }
  if (total === 0) {
    // an empty backup is almost always a mistake, and a silent one is worse
    console.error("\nNOTHING WAS BACKED UP. Either the database is empty, or the keys in .env.local point somewhere else.")
    process.exit(1)
  }
  console.log("\nKeep this file somewhere other than the database it came from.")
  console.log("To check it can actually be restored:  npx tsx scripts/restore-timetrack.ts " + path)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
