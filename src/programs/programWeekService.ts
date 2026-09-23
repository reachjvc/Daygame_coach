/**
 * ONE FUNCTION DECIDES WHAT A RUNNING PROGRAM SAYS ABOUT ITSELF.
 *
 * Four places invented this, and each got it wrong in its own way:
 *
 *   - `RunningPrograms.tsx` read the CATALOGUE's days and ignored the person's
 *     own `customSchedule`, which is where "your written week is not the week
 *     any of these prescribe" came from — printed about the very program they
 *     were running.
 *   - `northStarService.ts` counted named day TEMPLATES as days per week, and
 *     `RoutineCard.tsx` printed that count as "2×/wk" for StrongLifts, which is
 *     trained three times.
 *   - `WorkoutPrograms.tsx` printed nothing at all.
 *   - The fortnight rule behind "you may have started this and forgotten it"
 *     was `(Date.now() - new Date(started_at)) / 86_400_000` — elapsed
 *     milliseconds on the reader's machine, so a program started at 23:00 was
 *     thirteen days old for an hour of its fifteenth day, and the answer
 *     depended on where the phone was.
 *
 * NOTHING IN HERE READS A CLOCK. `now` and `timeZone` are parameters, both
 * required, so the same enrollment can be asked about at a fixed instant in two
 * zones — which is the only way the class of bug above is visible to a test.
 *
 * The week sentence is `describeTrainingWeek`'s, not a second copy of it: that
 * function already reads the enrollment's own schedule and already refuses to
 * give a weekly count for a program worked through in turn.
 */

import { enrollmentName, getProgram } from "./data/catalog"
import { describeTrainingWeek } from "./programsService"
import { getTodayInTimezone, daysBetweenDateKeys } from "@/src/shared/dateUtils"
import type { ProgramEnrollment, ProgramWeekDescription } from "./types"

/**
 * A program is only "forgotten" once it has had time to be forgotten.
 *
 * The band said "you may have started this and forgotten it" about a program
 * started seconds earlier, which is both wrong and faintly rude. Never trained
 * AND started a fortnight ago is a ghost; never trained and started today is a
 * program you have not been to the gym for yet.
 */
export const FORGOTTEN_AFTER_DAYS = 14

/**
 * Throws `Unknown program: <id>` rather than falling back to "Day 1".
 *
 * A retired catalogue id is a real state and the caller has to decide what to
 * draw for it — the Life Mastery card names the id in its failed state rather
 * than taking the whole page down. A silent default here would put a week on
 * screen that belongs to no program at all.
 */
export function describeProgramWeek(
  enrollment: ProgramEnrollment,
  opts: { now: Date; timeZone: string; locale?: string }
): ProgramWeekDescription {
  const program = getProgram(enrollment.program_id)
  if (!program) throw new Error(`Unknown program: ${enrollment.program_id}`)

  const { now, timeZone, locale } = opts
  const day = (instant: string): string =>
    new Date(instant).toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone,
    })

  /**
   * THE COUNT IS THE LOGGED ONE, and this is a deliberate departure from the
   * plan's line for it, which said `cursor.sessionCount`.
   *
   * `skipSession` advances the cursor through `applyLog`, so `sessionCount`
   * counts skips as sessions: "12 sessions" beside "last trained" would be a
   * number about somebody's training that includes the sessions they did not
   * do. `sessionsLogged` is derived from the logs themselves.
   *
   * It is optional, and an absent count is left OUT of the sentence rather than
   * printed as 0 — a number nobody could work out is not a number of none.
   */
  const logged = enrollment.sessionsLogged
  const sessions =
    logged === undefined ? "" : ` · ${logged} ${logged === 1 ? "session" : "sessions"}`

  const described: Omit<ProgramWeekDescription, "lastTrained" | "lastTrainedLine"> = {
    name: enrollmentName(enrollment),
    level: program.levels.find((l) => l.id === enrollment.level)?.label ?? enrollment.level,
    week: describeTrainingWeek(program, enrollment),
  }

  if (enrollment.lastLoggedAt) {
    return {
      ...described,
      lastTrained: "trained",
      lastTrainedLine: `Last trained ${day(enrollment.lastLoggedAt)}${sessions}`,
    }
  }

  // Calendar days in the ACCOUNT's zone, both ends. A program started on the
  // 1st is a fortnight old on the 15th wherever the reader happens to be.
  const age = daysBetweenDateKeys(
    getTodayInTimezone(timeZone, new Date(enrollment.started_at)),
    getTodayInTimezone(timeZone, now)
  )

  if (age >= FORGOTTEN_AFTER_DAYS) {
    return {
      ...described,
      lastTrained: "forgotten",
      lastTrainedLine: `Never trained — started ${day(enrollment.started_at)}`,
    }
  }

  return { ...described, lastTrained: "new", lastTrainedLine: "Not trained yet" }
}
