/**
 * WHAT EVERY USER IS OWED, AND HOW FAR THEIR COUNTERS HAVE DRIFTED.
 *
 * Reads the live database and writes nothing. Run it before the backfill, and
 * again afterwards: a clean second run — no badges owed, no counter deltas — is
 * what "the achievements system is correct" actually means.
 *
 *   npx tsx scripts/tracking/audit-achievements.ts            # every user
 *   npx tsx scripts/tracking/audit-achievements.ts <userId>   # one user
 *
 * It talks to Supabase directly rather than through `trackingRepo`, because the
 * repo's clients assume a Next.js request. The part that decides anything —
 * `buildFacts`, `deriveEarnedMilestones`, `projectTrackingStats` — is imported
 * from the same module the app uses, so this cannot drift from production
 * behaviour.
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import {
  buildFacts,
  deriveEarnedMilestones,
  projectTrackingStats,
} from "../../src/tracking/achievementsService"
import { getMilestoneInfo } from "../../src/tracking/data/milestones"
import type { MilestoneSourceRows } from "../../src/tracking/types"

config({ path: ".env.local" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
}

export const db = createClient(url, serviceKey)

/** PostgREST caps a response at 1000 rows; read in pages or lose the tail. */
const PAGE_SIZE = 1000

export async function readAll<T>(table: string, userId: string): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`Failed to read ${table} for ${userId}: ${error.message}`)

    const page = (data ?? []) as T[]
    all.push(...page)
    if (page.length < PAGE_SIZE) return all
  }
}

export interface AuditedUser {
  userId: string
  timezone: string | null
  rows: MilestoneSourceRows
  /** Badges the rules say are earned but the database has not awarded. */
  owed: Array<{ type: string; label: string; achievedAt: string }>
  /** Badges awarded in the database that no rule accounts for. */
  unexplained: string[]
  /** Counters that disagree, as stored → derived. */
  drift: Array<{ column: string; stored: unknown; derived: unknown }>
  /** Set when the row is correct for an earlier week and nothing has happened since. */
  staleWeek: { storedWeek: string; currentWeek: string } | null
  hasStatsRow: boolean
}

/** Everyone with tracking data or a stats row — including users with neither yet. */
export async function allUserIds(): Promise<string[]> {
  const { data, error } = await db.from("profiles").select("id")
  if (error) throw new Error(`Failed to list profiles: ${error.message}`)
  return (data ?? []).map((p) => p.id as string)
}

export async function auditUser(userId: string): Promise<AuditedUser> {
  const [profile, approaches, sessions, fieldReports, reviews, milestones, statsRows] =
    await Promise.all([
      db.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
      readAll<never>("approaches", userId),
      readAll<never>("sessions", userId),
      readAll<never>("field_reports", userId),
      readAll<never>("reviews", userId),
      readAll<{ milestone_type: string }>("milestones", userId),
      db.from("user_tracking_stats").select("*").eq("user_id", userId).maybeSingle(),
    ])

  // profiles.timezone is NOT NULL DEFAULT 'UTC'; the fallback is for a user
  // with no profile row at all, which is a real fault worth seeing in the output.
  const timezone = (profile.data?.timezone as string | null) ?? "UTC"
  const rows: MilestoneSourceRows = { approaches, sessions, fieldReports, reviews }

  const earned = deriveEarnedMilestones(buildFacts(rows, timezone))
  const held = new Set(milestones.map((m) => m.milestone_type))
  const earnedTypes = new Set(earned.map((e) => e.type))

  const owed = earned
    .filter((e) => !held.has(e.type))
    .map((e) => ({ type: e.type, label: getMilestoneInfo(e.type).label, achievedAt: e.achievedAt }))

  const stored = (statsRows.data ?? {}) as Record<string, unknown>
  const derived = projectTrackingStats(rows, timezone)

  const differs = (column: string, value: unknown) =>
    JSON.stringify(stored[column] ?? null) !== JSON.stringify(value ?? null)

  const disagreements = Object.entries(derived)
    .filter(([column, value]) => differs(column, value))
    .map(([column, value]) => ({ column, stored: stored[column] ?? null, derived: value }))

  // A ROW CAN BE RIGHT AND OUT OF DATE AT THE SAME TIME.
  //
  // The weekly counters are only rewritten when the user writes something, so a
  // user who has logged nothing since Sunday has a row that still names last
  // week — correctly, for last week. Comparing it against a projection computed
  // for THIS week is comparing two different questions, and reporting it as
  // drift makes "0 adrift" unreachable for any idle account, which would train
  // everyone to ignore this script. The read path rolls the row before anyone
  // sees it (`getTrackingStatsForDisplay`).
  //
  // So the honest test is: is the row correct FOR THE WEEK IT NAMES?
  const storedWeek = stored.week_start_date as string | null
  const stale =
    storedWeek !== null &&
    storedWeek !== derived.week_start_date &&
    (() => {
      const asOfStoredWeek = projectTrackingStats(rows, timezone, parseDateOnly(storedWeek))
      return WEEK_SCOPED_COLUMNS.every(
        (column) =>
          JSON.stringify(stored[column] ?? null) ===
          JSON.stringify((asOfStoredWeek as Record<string, unknown>)[column] ?? null)
      )
    })()

  const drift = stale
    ? disagreements.filter((d) => !WEEK_SCOPED_COLUMNS.includes(d.column))
    : disagreements

  return {
    userId,
    timezone,
    rows,
    owed,
    unexplained: [...held].filter((t) => !earnedTypes.has(t as never)).sort(),
    drift,
    staleWeek: stale ? { storedWeek: storedWeek!, currentWeek: derived.week_start_date! } : null,
    hasStatsRow: Boolean(statsRows.data),
  }
}

/** The columns whose meaning depends on which week it is right now. */
const WEEK_SCOPED_COLUMNS = [
  "week_start_date",
  "current_week_approaches",
  "current_week_sessions",
  "current_week_numbers",
  "current_week_instadates",
  "current_week_field_reports",
]

/** A YYYY-MM-DD read as a wall-clock date, not as midnight UTC. */
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d, 12)
}

export function printAudit(a: AuditedUser): void {
  const counts = `${a.rows.approaches.length} approaches, ${a.rows.sessions.length} sessions, ${a.rows.fieldReports.length} reports, ${a.rows.reviews.length} reviews`
  console.log(`\n${"═".repeat(78)}`)
  console.log(`USER ${a.userId}   (${a.timezone ?? "no timezone set — UTC assumed"})`)
  console.log(`  rows: ${counts}${a.hasStatsRow ? "" : "   [no stats row yet — one will be created]"}`)

  if (a.owed.length === 0) {
    console.log("  badges owed: none")
  } else {
    console.log(`  badges owed (${a.owed.length}):`)
    for (const b of a.owed) {
      console.log(`    ${b.type.padEnd(28)} ${b.label.padEnd(24)} earned ${b.achievedAt}`)
    }
  }

  if (a.unexplained.length > 0) {
    // Not deleted, ever. A badge the rules cannot explain is either a rule that
    // is stricter than the code that awarded it, or history worth keeping.
    console.log(`  awarded but no rule explains them (left alone): ${a.unexplained.join(", ")}`)
  }

  if (a.staleWeek) {
    console.log(
      `  counters: correct for the week of ${a.staleWeek.storedWeek}; nothing logged since, so the ` +
        `row still names that week (the read path rolls it to ${a.staleWeek.currentWeek})`
    )
  }

  if (a.drift.length === 0) {
    console.log("  counters: in sync")
  } else {
    console.log(`  counters adrift (${a.drift.length}):`)
    for (const d of a.drift) {
      console.log(
        `    ${d.column.padEnd(28)} stored ${JSON.stringify(d.stored)} → derived ${JSON.stringify(d.derived)}`
      )
    }
  }
}

async function main() {
  const only = process.argv[2]
  const ids = only ? [only] : await allUserIds()

  console.log(`Auditing ${ids.length} user${ids.length === 1 ? "" : "s"}. Nothing is written.`)

  let totalOwed = 0
  let totalDrift = 0
  for (const id of ids) {
    const audit = await auditUser(id)
    printAudit(audit)
    totalOwed += audit.owed.length
    totalDrift += audit.drift.length
  }

  console.log(`\n${"═".repeat(78)}`)
  console.log(`TOTAL: ${totalOwed} badges owed, ${totalDrift} counter values adrift`)
  console.log(totalOwed + totalDrift === 0 ? "Nothing to fix." : "Run backfill-achievements.ts --confirm to fix.")
}

// Only run when invoked directly, so the backfill can import the audit.
if (process.argv[1]?.endsWith("audit-achievements.ts")) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
