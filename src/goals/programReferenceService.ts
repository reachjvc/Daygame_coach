/**
 * WHICH PROGRAM THE PLAN BELIEVES IT IS TRAINING, CHECKED AGAINST THE DATABASE.
 *
 * WHAT WAS WRONG. The reference was written once, when a program was started
 * from Life Mastery, and removed only by the End button in Life Mastery's own
 * Templates band. Everything else left it wrong:
 *
 *   - End the program on the Training page → the plan still points at a row
 *     that is no longer running, and goes on describing it.
 *   - Start a program on your phone → open the laptop and the plan there knows
 *     nothing about it, because the reference lives in that browser's storage.
 *   - Clear your browser data → the link is gone while the program runs on.
 *
 * The plan cannot be the authority on what is running; the database is. So
 * every time the plan opens, this reconciles the two — and it is the reason the
 * reference could shrink to an id in the first place.
 *
 * ── WHY IT MOVED HERE, AND WHAT CHANGED, 2026-09-23 ─────────────────────────
 *
 * IT TAKES THE WHOLE READ NOW, not a list. The rule that matters most in here
 * is "a read that FAILED is not an empty list" — emptying the list on a flaky
 * request would detach a program somebody is three weeks into. That rule was
 * real but it lived in the CALLER, as an early return in a React effect
 * (`if (!loaded || programsLoading || programsError) return`), where no test
 * could reach it and the next caller had to remember it. `useActiveEnrollments`
 * never returns null on failure — it keeps the last-known list and sets
 * `error` — so a rule keyed on the list alone reads "failed" as "none running".
 * Handing the whole read in makes the guard a property of a pure function with
 * a test, and makes forgetting it impossible rather than merely unlikely.
 *
 * IT SAYS WHAT IT DID. The plan used to change under somebody silently: a
 * program adopted from another device simply appeared, and one that had ended
 * simply vanished from the plan that had been describing it for months.
 * `adopted` and `ended` are returned so the screen can say so once.
 *
 * Returns the SAME plan object when nothing changed, so the effect that calls
 * it does not write to storage on every mount.
 */

import { applyProgramToWorkoutRoutine, detachProgramFromRoutines } from "./northStarService"
import type { NsPlan, NsRoutineProgram } from "./types"

/**
 * What the shared enrollment hook knows, in full.
 *
 * `loading` and `error` are separate from the list on purpose, and both must
 * be passed: they are the two states in which this function must do nothing.
 */
export interface EnrollmentRead {
  enrollments: Array<{ id: string; started_at: string }>
  loading: boolean
  error: string | null
}

export interface ProgramReconciliation {
  plan: NsPlan
  /** A program this plan had never heard of, now referenced. Say so once. */
  adopted: NsRoutineProgram | null
  /**
   * A reference that was pointing at something no longer running, now dropped.
   *
   * THE ID AND NOTHING ELSE — no name, and that is deliberate. The step this
   * comes from wanted the plan to carry `label` and `startedAt` so a finished
   * program could be named from the plan's own copy. `NsRoutineProgram` was
   * narrowed to an id in Phase 2 with its reason written above it — "everything
   * anybody wants to know is read live from this id" — and that decision is
   * newer than the step. An ended enrollment is not in the active list, so the
   * name cannot come from there either; if a screen needs it, the honest source
   * is `GET /api/programs/enrollments?past=1`, not a copy in the plan that
   * nothing keeps up to date.
   */
  ended: NsRoutineProgram | null
}

export function reconcileProgramReference(
  plan: NsPlan,
  read: EnrollmentRead,
  now?: string
): ProgramReconciliation {
  const unchanged = { plan, adopted: null, ended: null }

  /**
   * A READ THAT HAS NOT FINISHED, OR FAILED, CHANGES NOTHING.
   *
   * Not even when the list is empty — especially not then. `[]` with `error`
   * set is the shape of a first failed request, and treating it as the truth
   * detaches a running program on one bad connection.
   */
  if (read.loading || read.error !== null) return unchanged

  const activeIds = new Set(read.enrollments.map((e) => e.id))
  const referenced = plan.routines
    .map((r) => r.program?.enrollmentId)
    .filter((id): id is string => Boolean(id))

  /**
   * A reference to something that is no longer running: drop the claim, keep
   * the week. "Not tracked" is a real state, not an error — the days somebody
   * wrote are not deleted because a program stopped.
   *
   * Detached BEFORE the adoption rules rather than instead of them, so a
   * program that ended and a new one that started on the same day do not leave
   * the plan stuck pointing at the dead one.
   */
  const dead = referenced.filter((id) => !activeIds.has(id))
  const cleaned = dead.reduce((acc, id) => detachProgramFromRoutines(acc, id, now), plan)
  // The workout routine's own dead reference is the one a screen can report;
  // another routine's is not this card's business.
  const endedHere = dead.find(
    (id) => plan.routines.find((r) => r.blueprintId === "workout")?.program?.enrollmentId === id
  )
  const ended: NsRoutineProgram | null = endedHere ? { enrollmentId: endedHere } : null

  // Still pointing at something that is running: leave it exactly alone,
  // including its identity, so no save fires.
  if (referenced.length > dead.length) return { plan: cleaned, adopted: null, ended }

  /**
   * Nothing referenced, but something IS running — started on another device,
   * or from the Training page. Adopt the most recently started one.
   *
   * ADOPTING WITH TWO RUNNING IS DELIBERATE, and a departure from the step,
   * which said adopt nothing and let both cards read "N programs running".
   * Adopting nothing makes `linkedProgram` answer `none`, and the Systems card
   * renders NOTHING at all for `none` — so Life Mastery would go silent about
   * two running programs, which is the state most worth saying out loud. With
   * the newest adopted the card reaches its `several` state and says "2
   * programs running — see Training". Six cases of this were already tested
   * when Phase 2 built it; the step is older.
   */
  if (read.enrollments.length === 0) return { plan: cleaned, adopted: null, ended }
  const newest = [...read.enrollments].sort((a, b) => b.started_at.localeCompare(a.started_at))[0]
  const adopted: NsRoutineProgram = { enrollmentId: newest.id }
  return { plan: applyProgramToWorkoutRoutine(cleaned, now, adopted), adopted, ended }
}
