/**
 * What has broken lately, from the command line.
 *
 *     npx tsx scripts/list-errors.ts            # the last week
 *     npx tsx scripts/list-errors.ts --hours 24
 *
 * Reads the database directly with the service key, so it works whether or not
 * the site is running.
 */

import { config } from "dotenv"

import { listErrorReports } from "../src/db/errorReportRepo"

config({ path: ".env.local" })

async function main() {
  const flag = process.argv.indexOf("--hours")
  const hours = flag > -1 ? Number(process.argv[flag + 1]) : 168
  const since = new Date(Date.now() - hours * 3600_000).toISOString()

  const reports = await listErrorReports(since, 200)
  if (reports.length === 0) {
    console.log(`Nothing has broken in the last ${hours} hours.`)
    return
  }

  console.log(`${reports.length} distinct fault(s) in the last ${hours} hours, most recent first:\n`)
  for (const r of reports) {
    const times = r.seen_count === 1 ? "once" : `${r.seen_count} times`
    console.log(`  ${r.last_seen_at.slice(0, 16).replace("T", " ")}  ${times.padEnd(12)} ${r.route}`)
    console.log(`    ${r.message}`)
    if (r.stack) console.log(`    ${r.stack.split("\n").find((l) => l.trim().startsWith("at ")) ?? ""}`)
    console.log()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
