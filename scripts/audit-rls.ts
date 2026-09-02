/**
 * Audit every table in the live database for Row Level Security.
 *
 * WHY THIS EXISTS
 * ---------------
 * Your web pages talk to Supabase with a key that is public -- anyone can read
 * it out of their browser. So the database itself has to decide who may see and
 * change what; it cannot trust the app to ask nicely. Those rules are called Row
 * Level Security (RLS).
 *
 * A table with RLS switched off is readable AND writable by anyone on the
 * internet who has looked at your public key. That is not a subtle bug and it is
 * not visible anywhere in the app -- the only way to see it is to ask the
 * database. This script asks.
 *
 * Run it after adding ANY table:
 *     npx tsx scripts/audit-rls.ts
 *
 * Exit code 1 means something is exposed. It is meant to be run in CI.
 *
 * Requires: `supabase login` (reads ~/.supabase/access-token) and
 * NEXT_PUBLIC_SUPABASE_URL in .env.local.
 */

import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** Tables that are deliberately reachable without a per-user rule, with the reason. */
const INTENTIONAL: Record<string, string> = {
  beta_invites:
    "RLS on, no policies: readable only by service role and the claim_beta_slot() function.",
  waitlist_emails:
    "RLS on, no policies: inserted server-side via service role only.",
  plan_snapshots:
    "RLS on, no policies: written by the admin client in planSnapshotRepo. Unauthenticated by design, keyed by a browser-generated id.",
  values: "Reference data. Public read is intended; the app reads this table.",
  core_values:
    "RLS on, no policies: no code reads it. Near-duplicate of `values`. Server-only until consolidated.",
  embeddings_test:
    "RLS on, no policies: read only via the service role in embeddingsTestRepo. Retrieval runs server-side.",
  user_xp: "RLS on, no policies: empty, unreferenced, duplicates profiles.xp. Pending a keep-or-drop decision.",
  embeddings: "Shared coaching corpus. Any signed-in user may read all rows.",
}

type Row = {
  tbl: string
  rls_on: boolean
  policies: number
  anon_read: boolean
  anon_write: boolean
}

const QUERY = `
select c.relname as tbl,
       c.relrowsecurity as rls_on,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as policies,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_read,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_write
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
`

function projectRef(): string {
  const env = readFileSync(join(process.cwd(), ".env.local"), "utf8")
  const url = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim()
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing from .env.local")
  const ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
  if (!ref) throw new Error(`Could not read a project ref out of ${url}`)
  return ref
}

function accessToken(): string {
  try {
    return readFileSync(join(homedir(), ".supabase", "access-token"), "utf8").trim()
  } catch {
    throw new Error("No ~/.supabase/access-token. Run `supabase login` first.")
  }
}

async function main() {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef()}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: QUERY }),
    }
  )

  if (!response.ok) {
    throw new Error(`Management API said ${response.status}: ${await response.text()}`)
  }

  const rows = (await response.json()) as Row[]

  const exposed = rows.filter((r) => !r.rls_on)
  const silent = rows.filter((r) => r.rls_on && r.policies === 0 && !INTENTIONAL[r.tbl])
  const guarded = rows.filter((r) => r.rls_on && r.policies > 0)

  console.log(`Checked ${rows.length} tables in the live database.\n`)

  if (exposed.length) {
    console.log(`RLS IS OFF on ${exposed.length} table(s).`)
    console.log("Anyone with your public key can read and change these:\n")
    for (const r of exposed) {
      console.log(`   ${r.tbl.padEnd(28)} read=${r.anon_read} write=${r.anon_write}`)
    }
    console.log("")
  }

  if (silent.length) {
    console.log(`RLS is on but NO rules exist on ${silent.length} table(s).`)
    console.log("Nothing can read them except server-side code. That is safe, but")
    console.log("if the app expects users to read them, it will silently get nothing:\n")
    for (const r of silent) console.log(`   ${r.tbl}`)
    console.log("")
  }

  console.log(`${guarded.length} table(s) have RLS on with rules. ` +
    `${Object.keys(INTENTIONAL).length} known exceptions are listed in this script.`)

  if (exposed.length) {
    console.error(`\nFAIL: ${exposed.length} table(s) are open to the internet.`)
    process.exit(1)
  }
  console.log("\nOK: no table is left open to the internet.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
