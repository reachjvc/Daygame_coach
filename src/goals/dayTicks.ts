/**
 * ONE OWNER FOR "IS THIS DONE TODAY".
 *
 * A finished gym session and a hand tick on "Strength session" are two records
 * of one morning, and until this file existed they were free to disagree. Five
 * surfaces answered the question and only one of them had ever heard of the
 * training log:
 *
 *   - the schedule's step row merged the two (the only one that was right),
 *   - the group header two lines above it counted hand ticks only,
 *   - the Today tab's "N of M done" counted hand ticks only,
 *   - the season band at the top of `/dashboard/tracking` counted hand ticks only,
 *   - and the Recap tab's practice rows inlined a fifth copy of the rule, so it
 *     could not even be found by grepping for the function's name.
 *
 * Train in the morning and tick nothing by hand, and the schedule struck a row
 * through under a header reading `0/2` while the page the owner opens daily
 * said `0 of 2 done today`.
 *
 * **Why this is a file of its own.** `northStarTrackService` already imports
 * from `northStarService`, so putting the rule in the former and calling it
 * from the latter would close a cycle between two large modules — and
 * `NO_TRAINING_TICKS` is a `const`, which is exactly the kind of binding a
 * cycle turns into a runtime error rather than a type error. A leaf both can
 * import has no such edge.
 *
 * The one thing this file must never do is write. A derived tick is computed
 * at render and never lands in `plan.logged`: the workout is the record, and
 * copying it into a second store is what let the two disagree in the first
 * place. `toggleStepLogged` therefore asks `stepTickedByHand`, never `stepTick`.
 */

import type { NsPlan } from "@/src/goals/types"
/* The training log's two pure pieces. Nothing here fetches — `workoutsByLocalDate`
   keys finished sessions by the day they happened on the PERSON's calendar, and
   `STEP_FOR_SESSION_TYPE` says which library step each kind of session ticks. */
import { STEP_FOR_SESSION_TYPE, workoutsByLocalDate } from "@/src/health/healthService"
import type { SessionType } from "@/src/health/types"

/**
 * What the training log ticks, by date.
 *
 * A plain record rather than a `Map` for two reasons: it crosses the
 * server/client boundary on the dashboard, where the season band is handed its
 * numbers by a server component; and two of these have to be comparable with
 * `toEqual` in a test.
 */
export type TrainingTicks = Readonly<Record<string, readonly string[]>>

/**
 * NO LOG IN HAND — which is not the same fact as "nothing was trained".
 *
 * Handed in where the log genuinely does not apply (a read-only preview of
 * somebody's week) or could not be read. A caller that could not read it is
 * expected to SAY so on screen as well, rather than let an unreadable log
 * render as an untrained week — see `logUnavailable` on the schedule.
 */
export const NO_TRAINING_TICKS: TrainingTicks = {}

/**
 * Which of THIS plan's steps each day's finished sessions tick.
 *
 * `STEP_FOR_SESSION_TYPE` answers in LIBRARY step ids ("strength"), which are
 * the same on everybody's plan; the step that carries one has an id of its own
 * ("s3") that is not. The translation happens here, once, because every screen
 * that asks "is this done" speaks the plan's ids — and because while it lived
 * inside one tab's `useMemo`, no other screen could reach it.
 *
 * One library step can be carried by more than one step (a morning stack and an
 * evening one can both hold "strength"), so the map's values are lists and a
 * day's session ticks every step that claims it.
 */
export function trainingTicks(
  plan: NsPlan,
  workouts: Array<{ logged_at: string; session_type: SessionType }>,
  timezone: string
): TrainingTicks {
  const stepIdFor = new Map<string, string[]>()
  for (const routine of plan.routines) {
    for (const step of routine.steps) {
      if (!step.libraryStepId) continue
      const already = stepIdFor.get(step.libraryStepId)
      if (already) already.push(step.id)
      else stepIdFor.set(step.libraryStepId, [step.id])
    }
  }

  const out: Record<string, string[]> = {}
  for (const [date, types] of workoutsByLocalDate(workouts, timezone)) {
    const ids = new Set<string>()
    for (const type of types) {
      for (const id of stepIdFor.get(STEP_FOR_SESSION_TYPE[type]) ?? []) ids.add(id)
    }
    if (ids.size > 0) out[date] = [...ids]
  }
  return out
}

/**
 * Whether a routine step was ticked BY HAND on a given day.
 *
 * The narrow question, and the only one the toggle may ask: what the checkbox
 * wrote. This was called `stepLogged` and answered the broad question badly —
 * every caller read it as "is this done", and for anybody who trains it was
 * not. Renamed rather than fixed in place, so the compiler had to stop at all
 * ten call sites and make each one choose which question it was asking.
 */
export function stepTickedByHand(plan: NsPlan, date: string, stepId: string): boolean {
  return (plan.logged[date] ?? []).includes(stepId)
}

/**
 * THE one answer to "is this step done on this day", and whether it may be undone.
 *
 * `fromLog` travels WITH `done` on purpose. A tick the training log made cannot
 * be un-ticked — the workout is the record, and a checkbox that contradicts it
 * is the two-answers problem this exists to end. Returning the two separately
 * is how a caller ends up drawing an enabled checkbox over a fact it cannot
 * change.
 */
export function stepTick(
  plan: NsPlan,
  date: string,
  stepId: string,
  ticks: TrainingTicks
): { done: boolean; fromLog: boolean } {
  const fromLog = (ticks[date] ?? []).includes(stepId)
  return { done: fromLog || stepTickedByHand(plan, date, stepId), fromLog }
}
