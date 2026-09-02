/**
 * WHAT A WEEKLY COUNTER DOES WHEN THE WEEK ENDS.
 *
 * Pure. No I/O, no clock, no Supabase — every date arrives as an argument, so
 * every rule here is decidable by reading it, and testable without a database.
 *
 * WHY THIS FILE AND NOT trackingService: `trackingRepo` needs these rules and
 * `trackingService` already imports `trackingRepo`. Putting them in the service
 * would close an import cycle. The service re-exports `isWeekActive` so the
 * call sites that already had it keep working.
 */

/**
 * The counters that belong to one week and must be zeroed when it ends.
 *
 * There used to be three ad-hoc reset blocks — one in the session path, one in
 * the approach path, one in the field-report path — each of which zeroed the
 * OTHER counters on rollover and forgot at least one. The bug that shipped:
 * `current_week_approaches` kept last week's 15 while `current_week_sessions`
 * was reset to 1, so `isWeekActive(1, 15)` said a dead week was active and the
 * streak went to 4. One list, in one place, is the fix.
 */
export const WEEKLY_COUNTER_COLUMNS = [
  "current_week_sessions",
  "current_week_approaches",
  "current_week_numbers",
  "current_week_instadates",
  "current_week_field_reports",
] as const

/** Not exported: the architecture test keeps type exports in `types.ts`, and
 *  nothing outside this file needs to name it. */
type WeeklyCounterColumn = (typeof WEEKLY_COUNTER_COLUMNS)[number]

/** Every weekly counter set to zero — the patch a rollover applies. */
export function zeroedWeeklyCounters(): Record<WeeklyCounterColumn, number> {
  return Object.fromEntries(WEEKLY_COUNTER_COLUMNS.map((c) => [c, 0])) as Record<
    WeeklyCounterColumn,
    number
  >
}

/** A week is "active" if 2+ sessions OR 5+ approaches were logged in it. */
export function isWeekActive(sessions: number, approaches: number): boolean {
  return sessions >= 2 || approaches >= 5
}

/**
 * THE STREAK AFTER A WEEK QUALIFIES AS ACTIVE.
 *
 * A week is counted the moment it qualifies, not when it ends — hitting two
 * sessions on Tuesday moves the number on Tuesday. That is a product decision
 * (a streak that only moves on Sunday night motivates nobody), and it is safe
 * because the number is never trusted on its own: `gateStreaks` shows 0 unless
 * `lastActiveStart` is this week or last week, so a streak that stopped being
 * earned stops being displayed without anything having to write to the row.
 *
 * Three cases and no others:
 *   - this week is already counted            → unchanged, idempotent
 *   - the last active week was the one before → +1
 *   - anything else (a gap, or the first ever) → 1
 *
 * A run of idle weeks needs no loop: any gap lands in the third case.
 */
export function streakOnQualify(args: {
  currentWeekStart: string
  previousWeekStart: string
  lastActiveStart: string | null
  currentStreak: number
}): { streak: number; lastActiveStart: string } {
  const { currentWeekStart, previousWeekStart, lastActiveStart, currentStreak } = args

  if (lastActiveStart === currentWeekStart) {
    return { streak: currentStreak, lastActiveStart: currentWeekStart }
  }
  if (lastActiveStart === previousWeekStart) {
    return { streak: currentStreak + 1, lastActiveStart: currentWeekStart }
  }
  return { streak: 1, lastActiveStart: currentWeekStart }
}
