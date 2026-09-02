/**
 * WRITING THE DERIVED ANSWERS BACK.
 *
 * The imperative half of the achievements system: read the user's rows, ask
 * `achievementsService` (pure) what they earn, write the difference. Everything
 * that decides anything lives there; everything that touches the database lives
 * here or in `trackingRepo`.
 *
 * See docs/plans/achievement_counters.md.
 */

import {
  countApproaches,
  getMilestoneSourceRows,
  insertMilestones,
  replaceUserTrackingStats,
} from "@/src/db/trackingRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import type { MilestoneRow } from "@/src/db/trackingTypes"
import {
  buildFacts,
  deriveEarnedMilestones,
  projectTrackingStats,
} from "./achievementsService"
import type { MilestoneFacts, MilestoneSourceRows } from "./types"

/** The fact sheet for one user, straight from their rows. */
export async function getMilestoneFacts(userId: string): Promise<MilestoneFacts> {
  const timezone = await getUserTimezone(userId)
  return buildFacts(await getMilestoneSourceRows(userId), timezone)
}

/**
 * BRING A USER'S BADGES AND COUNTERS UP TO DATE WITH WHAT THEY HAVE DONE.
 *
 * Called after every write that can change either. Idempotent: badges are
 * inserted with `ignoreDuplicates`, counters are overwritten with a freshly
 * computed value rather than incremented, so running this twice changes nothing
 * and running it late fixes everything.
 *
 * Which session a badge belongs to is WORKED OUT, not passed in: a badge is
 * stamped with the session whose window contains the moment it was earned. That
 * matters because most badges are earned mid-session, by an approach — if the
 * caller had to supply the session, every approach-logging path would have to
 * remember to, and forgetting means the session card shows no achievements even
 * though the badge was won inside it.
 *
 * Returns the badges this call awarded (empty when there was nothing new).
 */
export async function reconcileUserProgress(userId: string): Promise<MilestoneRow[]> {
  const timezone = await getUserTimezone(userId)
  let rows = await getMilestoneSourceRows(userId)
  let awarded = await applyReconcile(userId, rows, timezone)

  // A write that landed while this one was reading leaves the counters one row
  // behind. The re-check is a COUNT, not another full read — it runs on every
  // logged approach, and re-reading a long history to discover that nothing
  // changed is the expensive way to learn it. Anything still racing after this
  // is settled by the next reconcile, because nothing here accumulates.
  if ((await countApproaches(userId)) !== rows.approaches.length) {
    rows = await getMilestoneSourceRows(userId)
    const second = await applyReconcile(userId, rows, timezone)
    awarded = [...awarded, ...second]
  }

  return awarded
}

async function applyReconcile(
  userId: string,
  rows: MilestoneSourceRows,
  timezone: string
): Promise<MilestoneRow[]> {
  const earned = deriveEarnedMilestones(buildFacts(rows, timezone))

  const awarded = await insertMilestones(
    userId,
    earned.map((e) => ({
      milestone_type: e.type,
      achieved_at: e.achievedAt,
      session_id: sessionContaining(e.achievedAt, rows.sessions),
    }))
  )

  await replaceUserTrackingStats(userId, projectTrackingStats(rows, timezone))

  return awarded
}

/**
 * The session this badge was earned inside, if any.
 *
 * A session's window runs from `started_at` to `ended_at`, and a session still
 * running has no end — anything after it started belongs to it. Badges earned
 * outside any session (a quick-added approach, a field report, a review) get
 * null, which is what the session cards then correctly show nothing for.
 */
function sessionContaining(achievedAt: string, sessions: MilestoneSourceRows["sessions"]): string | null {
  const match = sessions.find(
    (s) => achievedAt >= s.started_at && (s.ended_at === null || achievedAt <= s.ended_at)
  )
  return match?.id ?? null
}
