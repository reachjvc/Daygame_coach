/**
 * A refusal is not a failure, and the app has to be able to tell them apart.
 *
 * THE DIFFERENCE, in plain language. "Finish the workout you have open first"
 * is the app working correctly and telling you what to do — nothing is broken,
 * and the answer changes the moment you do that one thing. "The database could
 * not be reached" is a failure: there is nothing you can do about it and the
 * words on screen should not pretend otherwise.
 *
 * They used to arrive at the screen identically, as a 500 with a sentence, so
 * every one of them read as "something went wrong". Worse, three of the buttons
 * never looked at the answer at all: "End program" navigated away from a
 * program that was still running and still prescribing.
 *
 * WHY IT LIVES HERE AND NOT IN A REPO. The database functions added on
 * 2026-09-18 raise every refusal with the same SQL state (55000), each repo
 * turns that into one of these, and each route asks `statusFor` what number to
 * put on it. One owner for "which of the two is this", instead of an
 * `instanceof` ladder growing a rung in every route — which is what pushed
 * `app/api/health/workout/route.ts` to within four lines of the 50-line limit
 * the architecture test holds routes to.
 */

/**
 * Something the person can act on. The message is shown to them as written, so
 * it is a sentence and not a code.
 */
export class ProgramRefused extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProgramRefused"
  }
}

/**
 * THE WORKOUT THIS REQUEST IS ABOUT IS NOT OPEN ANY MORE.
 *
 * Two devices, one account, and this is ordinary: the workout is discarded on
 * the laptop while the phone is still ticking sets, or finished on the phone
 * while the laptop's tab still shows it. Neither is a failure and neither is
 * the person's mistake, so both get a sentence rather than a stack trace.
 *
 * WHY IT IS A CLASS AND NOT A STRING. The screen has to DO something — stop
 * showing a workout that no longer exists — and it cannot do that by matching
 * on prose. `fate` says which of the two happened, the routes turn it into
 * `code: "workout_gone"`, and the live screen reads that one field.
 *
 * WHAT IT REPLACES. Until 2026-09-26 the database's own words went to the
 * screen. The owner saw, mid-workout:
 *
 *     That Squat set could not be saved: new row violates row-level security
 *     policy for table "workout_sets"
 *
 * Nothing was wrong with their permissions. A set row has no user of its own —
 * its policy asks whether the PARENT workout exists and is yours — so an RLS
 * refusal is how Postgres says "there is no such workout". Reproduced on
 * demand: discard on one device while five ticks are in flight from another and
 * it happens 18 times in 40.
 */
export class WorkoutGone extends Error {
  readonly fate: "discarded" | "finished"

  constructor(fate: "discarded" | "finished") {
    super(
      fate === "discarded"
        ? "This workout was thrown away somewhere else, so that change was not saved."
        : "This workout was already finished somewhere else, so that change was not saved."
    )
    this.name = "WorkoutGone"
    this.fate = fate
  }
}

/**
 * The HTTP status a thrown error deserves.
 *
 * 409 Conflict for a refusal: the request was well formed and the state of the
 * account is what said no — which is exactly what 409 means, and what makes it
 * different from a 400 (you sent something wrong) and a 500 (we broke).
 */
export function statusFor(e: unknown): number {
  return e instanceof ProgramRefused || e instanceof WorkoutGone ? 409 : 500
}

/**
 * The body a workout route sends for a thrown error.
 *
 * ONE OWNER, because the alternative is each route deciding for itself whether
 * to pass a `code` — and the screen then acts on the workout being gone in the
 * three routes that remembered and not in the two that did not.
 */
export function errorBody(e: unknown): { error: string; code?: string } {
  return e instanceof WorkoutGone
    ? { error: e.message, code: "workout_gone" }
    : { error: (e as Error).message }
}
