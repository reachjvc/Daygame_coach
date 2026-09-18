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
 * The HTTP status a thrown error deserves.
 *
 * 409 Conflict for a refusal: the request was well formed and the state of the
 * account is what said no — which is exactly what 409 means, and what makes it
 * different from a 400 (you sent something wrong) and a 500 (we broke).
 */
export function statusFor(e: unknown): number {
  return e instanceof ProgramRefused ? 409 : 500
}
