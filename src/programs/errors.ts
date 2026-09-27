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

  /**
   * `changeSaved` IS NOT A DETAIL. When this is thrown from the re-read AFTER a
   * write, the write has already committed — so telling somebody "that change
   * was not saved" is false, and it is false in the direction that makes them
   * do it again. A workout that was DISCARDED took the set with it (the rows
   * cascade), so there the sentence is true; a workout finished on another
   * device kept it.
   *
   * Both halves of the old sentence were wrong in that case: not thrown away,
   * and not unsaved.
   */
  constructor(fate: "discarded" | "finished", changeSaved = false) {
    const what =
      fate === "discarded"
        ? "This workout was thrown away somewhere else"
        : "This workout was finished somewhere else"
    super(
      changeSaved
        ? `${what}. Your change was saved to it — reload to see where it got to.`
        : `${what}, so that change was not saved.`
    )
    this.name = "WorkoutGone"
    this.fate = fate
  }
}

/**
 * THE QUESTION COULD NOT BE ASKED — which is not a no, and not the caller's
 * fault.
 *
 * WHY IT IS A CLASS AND NOT A SENTENCE. A thrown `Error` gets the routes'
 * fallback status, which for the set routes is 400 — and the offline queue
 * reads 4xx as "this will never succeed on a retry", drops the set out of
 * `localStorage`, takes the ✓ off the screen and says "has been removed". So a
 * transient database blip on gym wifi would have thrown a set away and told the
 * person it had. That is the worst outcome in this whole file and it was
 * introduced BY the third state, which was added to be careful.
 *
 * 503 instead: the browser keeps the set, keeps the ✓, and tries again when the
 * connection is back, which is exactly what the queue is for.
 */
export class CouldNotTell extends Error {
  /**
   * `what` names the thing that could not be read, because "could not read your
   * past sets" is a better sentence than a generic one and the status code is
   * what does the work here — folding both into one message would have traded
   * the wording for the code, which is a trade nobody asked for.
   */
  constructor(what?: string) {
    super(
      what
        ? `Could not read ${what}. Reload before trying that again.`
        : "Could not reach the server to check on this workout. Reload before trying that again."
    )
    this.name = "CouldNotTell"
  }
}

/**
 * A REFUSAL THE DATABASE WROTE FOR A PERSON — not Postgres's own words.
 *
 * SQLSTATE 55000 is how every program-write function in this schema says no on
 * purpose, and the sentence it carries was written to be read: "Your program
 * moved on while this was being recalculated — reload and try again". Passing
 * THAT through is right. Passing through "new row violates row-level security
 * policy for table \"workout_sets\"" is what this whole area is being dug out
 * of, and the two are told apart by the code and nothing else.
 *
 * It exists as a named function so the one legitimate `error.message` in a
 * thrown error lives in one place with its reason beside it, instead of being
 * inlined at each call site where the guard in `tests/unit/architecture.test.ts`
 * cannot tell it from a leak.
 *
 * `null` when it is not a deliberate refusal: the caller then decides, and for
 * a workout write that means asking the database which of four states the
 * workout is in rather than guessing from the code.
 */
export function databaseRefusal(error: { code?: string; message: string }): ProgramRefused | null {
  return error.code === "55000" ? new ProgramRefused(error.message) : null
}

/**
 * The HTTP status a thrown error deserves.
 *
 * 409 Conflict for a refusal: the request was well formed and the state of the
 * account is what said no — which is exactly what 409 means, and what makes it
 * different from a 400 (you sent something wrong) and a 500 (we broke).
 */
export function statusFor(e: unknown): number {
  // 503 here too. This file's own header says splitting body and status between
  // two helpers is what lets them drift, and `workoutErrorResponse` knew about
  // `CouldNotTell` while this did not — so `/api/workouts/[id]/revise`, which
  // asks this one, answered 500 for the same error the sets routes call 503.
  if (e instanceof CouldNotTell) return 503
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

/**
 * The body AND the status, together, for a workout route.
 *
 * WHY BOTH FROM ONE CALL. This file's own header says "each route asks
 * `statusFor` what number to put on it", and after the workout routes learned
 * about `WorkoutGone` four of the five were hardcoding 400 — so the same state
 * conflict came back as "you sent something wrong" from the sets routes and as
 * 409 from the finish route. Splitting the body and the status between two
 * helpers is what let them drift; a route that asks once cannot.
 *
 * `fallback` is what a route answers for everything that is NOT a refusal, and
 * it stays the caller's decision: the sets routes mean 400 by it (a set the
 * schema would not take), and that is a different thing from a 500.
 */
export function workoutErrorResponse(
  e: unknown,
  fallback = 400
): { body: { error: string; code?: string }; status: number } {
  if (e instanceof CouldNotTell) {
    // 503, and it matters: anything in the 400s tells the offline queue the
    // write can never succeed, and it answers by deleting the set.
    return { body: errorBody(e), status: 503 }
  }
  const refused = e instanceof ProgramRefused || e instanceof WorkoutGone
  return { body: errorBody(e), status: refused ? 409 : fallback }
}
