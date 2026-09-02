/**
 * GIVE EVERY USER THE BADGES THEY ALREADY EARNED.
 *
 * Same derivation as the app, applied once to every account, so the badges and
 * counters stop being whatever the old counter happened to catch and start being
 * what the user actually did. Badges are dated to when they were earned, not to
 * the day this ran.
 *
 *   npx tsx scripts/tracking/backfill-achievements.ts             # rehearsal, writes nothing
 *   npx tsx scripts/tracking/backfill-achievements.ts --confirm   # writes
 *   npx tsx scripts/tracking/backfill-achievements.ts --rollback <snapshot.json>
 *
 * NOTHING IS EVER DELETED. Badges are inserted only — a badge the rules cannot
 * explain (the old streak code awarded a few it had not earned) is left exactly
 * where it is. Counters are overwritten, and the snapshot written before the
 * first write holds every previous value, so --rollback puts them all back.
 */

import fs from "fs"
import path from "path"
import {
  buildFacts,
  deriveEarnedMilestones,
  projectTrackingStats,
} from "../../src/tracking/achievementsService"
import { allUserIds, auditUser, db, printAudit, readAll } from "./audit-achievements"

interface Snapshot {
  takenAt: string
  users: Array<{
    userId: string
    stats: Record<string, unknown> | null
    milestoneIds: string[]
  }>
  inserted: Array<{ userId: string; milestoneType: string; id: string }>
}

async function takeSnapshot(userIds: string[]): Promise<Snapshot> {
  const users = []
  for (const userId of userIds) {
    const [stats, milestones] = await Promise.all([
      db.from("user_tracking_stats").select("*").eq("user_id", userId).maybeSingle(),
      readAll<{ id: string }>("milestones", userId),
    ])
    users.push({
      userId,
      stats: (stats.data as Record<string, unknown> | null) ?? null,
      milestoneIds: milestones.map((m) => m.id),
    })
  }
  return { takenAt: new Date().toISOString(), users, inserted: [] }
}

function snapshotPath(): string {
  const dir = process.env.SCRATCHPAD_DIR || "."
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  return path.join(dir, `backfill-${stamp}.json`)
}

async function backfillUser(userId: string): Promise<Array<{ id: string; milestone_type: string }>> {
  const [profile, approaches, sessions, fieldReports, reviews] = await Promise.all([
    db.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
    readAll<never>("approaches", userId),
    readAll<never>("sessions", userId),
    readAll<never>("field_reports", userId),
    readAll<never>("reviews", userId),
  ])

  // profiles.timezone is NOT NULL DEFAULT 'UTC'; the fallback is for a user
  // with no profile row at all, which is a real fault worth seeing in the output.
  const timezone = (profile.data?.timezone as string | null) ?? "UTC"
  const rows = { approaches, sessions, fieldReports, reviews }

  const earned = deriveEarnedMilestones(buildFacts(rows, timezone))
  const { data: awarded, error: awardError } = await db
    .from("milestones")
    .upsert(
      earned.map((e) => ({
        user_id: userId,
        milestone_type: e.type,
        achieved_at: e.achievedAt,
      })),
      { onConflict: "user_id,milestone_type", ignoreDuplicates: true }
    )
    .select("id, milestone_type")

  if (awardError) throw new Error(`Failed to award for ${userId}: ${awardError.message}`)

  const { error: statsError } = await db.from("user_tracking_stats").upsert(
    {
      user_id: userId,
      ...projectTrackingStats(rows, timezone),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (statsError) throw new Error(`Failed to write stats for ${userId}: ${statsError.message}`)

  return (awarded ?? []) as Array<{ id: string; milestone_type: string }>
}

async function rollback(file: string): Promise<void> {
  const snapshot = JSON.parse(fs.readFileSync(file, "utf-8")) as Snapshot

  console.log(`Rolling back the backfill taken at ${snapshot.takenAt}`)
  console.log(`  removing ${snapshot.inserted.length} inserted badges`)

  for (const row of snapshot.inserted) {
    const { error } = await db.from("milestones").delete().eq("id", row.id)
    if (error) throw new Error(`Failed to delete milestone ${row.id}: ${error.message}`)
  }

  for (const user of snapshot.users) {
    if (!user.stats) {
      // There was no row before; remove the one the backfill created.
      const { error } = await db.from("user_tracking_stats").delete().eq("user_id", user.userId)
      if (error) throw new Error(`Failed to remove stats for ${user.userId}: ${error.message}`)
      continue
    }
    const { error } = await db
      .from("user_tracking_stats")
      .upsert(user.stats, { onConflict: "user_id" })
    if (error) throw new Error(`Failed to restore stats for ${user.userId}: ${error.message}`)
  }

  console.log("Rollback complete. Run the audit to confirm.")
}

async function main() {
  const args = process.argv.slice(2)

  const rollbackIndex = args.indexOf("--rollback")
  if (rollbackIndex !== -1) {
    const file = args[rollbackIndex + 1]
    if (!file) throw new Error("--rollback needs the path to a snapshot file")
    await rollback(file)
    return
  }

  const confirmed = args.includes("--confirm")
  const userIds = await allUserIds()

  console.log(
    confirmed
      ? `BACKFILL — writing to ${userIds.length} users.`
      : `REHEARSAL — showing what would change for ${userIds.length} users. Nothing is written.\n(Add --confirm to apply.)`
  )

  for (const userId of userIds) {
    printAudit(await auditUser(userId))
  }

  if (!confirmed) {
    console.log("\nNothing was written. Re-run with --confirm to apply.")
    return
  }

  const snapshot = await takeSnapshot(userIds)
  const file = snapshotPath()
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
  console.log(`\nSnapshot written to ${file} — undo with --rollback ${file}`)

  for (const userId of userIds) {
    const awarded = await backfillUser(userId)
    snapshot.inserted.push(
      ...awarded.map((a) => ({ userId, milestoneType: a.milestone_type, id: a.id }))
    )
    console.log(
      `  ${userId}: ${awarded.length} badge${awarded.length === 1 ? "" : "s"} awarded, counters rewritten`
    )
  }

  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
  console.log(`\nDone. ${snapshot.inserted.length} badges awarded in total.`)
  console.log("Re-run audit-achievements.ts — it should report nothing owed and nothing adrift.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
