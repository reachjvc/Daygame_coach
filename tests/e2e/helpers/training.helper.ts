/**
 * ONE ACCOUNT, AND EVERY TRAINING SPEC LEAVES IT AS IT FOUND IT.
 *
 * These two functions lived inside `programs-live-workout.spec.ts`, and the
 * second browser spec for this screen needed exactly the same pair. Two copies
 * of "clean the account" is two chances to clean it differently — and a spec
 * that half-cleans leaves the next one starting from a workout it did not
 * open, failing for a reason that has nothing to do with the code under test.
 *
 * Everything runs IN THE PAGE, through the real routes with the real session,
 * rather than around them through a service key. A fixture that writes rows the
 * app would refuse is a fixture that tests nothing.
 */

import { test, type Page } from "@playwright/test"
import { TRAINING_STATE } from "../../../playwright.config"

/**
 * THE GUARD THAT MAKES THE THIRD ACCOUNT WORTH HAVING.
 *
 * Everything below deletes every enrollment and every open workout on whatever
 * account the page is signed in as. Until 2026-09-23 that was `TEST_USER` — the
 * account the goals and session specs share, and the one `.claude/rules/ui.md`
 * sends a person to for hand-checking — so `npm run test:e2e` took somebody's
 * program away mid-walkthrough.
 *
 * A spec pasted into the wrong project now fails HERE, before it deletes
 * anything, rather than on an assertion three minutes later with the damage
 * already done.
 */
function refuseUnlessTrainingAccount(): void {
  const state = test.info().project.use.storageState
  if (state !== TRAINING_STATE) {
    throw new Error(
      `This helper wipes the account clean and may only run on the training account.\n` +
        `Project "${test.info().project.name}" is signed in as ${String(state)}.\n` +
        `Move the spec into a training* project, or stop deleting other people's data.`
    )
  }
}

/**
 * THE SAME GUARD, FOR A FILE THAT DELETES ROWS ITSELF.
 *
 * `resetAndEnroll` and `cleanUp` check the account before they touch anything,
 * which protects the specs that go through them — and on 2026-09-24 that turned
 * out to be a minority. Ten spec files run their own `fetch(…, { method:
 * "DELETE" })` loops inside `page.evaluate`, `programs-history-progress` alone
 * seventeen of them, and not one of those calls passes through a function that
 * could refuse. Their only protection was being listed in a training project's
 * `testMatch`.
 *
 * That is one line in `playwright.config.ts`, a file two other sessions edit
 * and which was swept into someone else's commit twice in a single day. Nothing
 * was ever wrong with the assignment; the problem is that a spec which deletes
 * every enrollment on whatever account it is handed should not be relying on a
 * config entry to be pointed at the right one. Until 2026-09-23 it was pointed
 * at `TEST_USER`, and `npm run test:e2e` took somebody's program away
 * mid-walkthrough.
 *
 * So: one call at the top of any spec that deletes training rows, and every
 * test in that file then fails before its body runs if the project is signed in
 * as anybody else. `tests/unit/trainingSpecsGuarded.test.ts` fails when the next
 * such spec forgets.
 */
export function guardTrainingAccount(): void {
  test.beforeEach(() => refuseUnlessTrainingAccount())
}

/** A phone, because that is where a workout is logged. */
export const PHONE = { width: 390, height: 844 }

/**
 * One program, no workout open, no history.
 *
 * `permanent=1` follows the soft delete: an ended enrollment still answers
 * "what are you running", so leaving it behind makes the next spec's Start
 * ambiguous.
 */
export async function resetAndEnroll(page: Page, unit: "kg" | "lb" = "kg"): Promise<void> {
  refuseUnlessTrainingAccount()
  await page.evaluate(async (unitSystem) => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      const detail = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
      for (const l of detail.logs ?? []) {
        await fetch(`/api/programs/enrollments/${e.id}/log/${l.id}`, { method: "DELETE" })
      }
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
    /**
     * AND THE FINISHED WORKOUTS, WHICH THIS RESET USED NOT TO CLEAR.
     *
     * The loop above deletes the OPEN workout and each enrollment's own logs.
     * Neither is a finished workout with `enrollment_id` null — a loose session
     * some earlier FILE started and finished — and one of those is enough to
     * put the card into its `done` state, which deliberately offers "See
     * today's workout" and no Start ("offering one on a day somebody has
     * finished invites a second workout for the same session").
     *
     * Measured 2026-09-25, and the server says it in its own words. After a
     * full run, `/api/programs/today` answered:
     *
     *   recentlyFinished: [{ workoutId: "693bb065…", enrollmentId: null,
     *                        loggedAt: "2026-09-25T19:10:00+00:00",
     *                        durationMin: 1, sets: 4 }]
     *
     * A one-minute, four-set workout belonging to no program: a test's
     * leftover. With that row present, `dashboard-training-card`,
     * `programs-live-workout` and `programs-offline` all failed — the first on
     * a missing "Squat", the other two waiting 180 and 240 seconds for a
     * `start-workout` button the product had correctly taken away. Three
     * failures, one stale row, and nothing in the output pointing at it.
     *
     * `enrollment_id` null is why the enrollment-log route cannot reach it, and
     * `/api/workouts/{id}` cannot either — that one discards an OPEN workout
     * and answers 400 "That workout is not open any more". The route that can
     * is the one History uses, which `cleanUp` below has always used.
     *
     * Safe on this account: `/api/workouts/history?days=400` returns exactly
     * one workout, so there is no seeded year here to destroy — the fixture
     * that warning in `cleanUp` is about belongs to a different account.
     */
    /**
     * LOUDLY, BOTH WAYS — because the whole point of this block is that a row
     * left behind costs three minutes and names nothing.
     *
     * `recentlyFinished ?? []` and an unchecked DELETE were the first version,
     * and both fail soft in exactly the way that brings the original symptom
     * back with the cause hidden behind a fix that looks like it ran: if the
     * key ever stops being returned, the reset quietly stops clearing; if a
     * delete is refused, the loop moves on and the row survives. Either way the
     * next test waits out a 180-second timeout for a Start button, which is
     * where this started.
     */
    const todayRes = await fetch("/api/programs/today")
    if (!todayRes.ok) {
      throw new Error(`reset could not read /api/programs/today: ${todayRes.status}`)
    }
    const facts = await todayRes.json()
    if (!Array.isArray(facts.recentlyFinished)) {
      throw new Error(
        "reset expected `recentlyFinished` from /api/programs/today and got " +
          `${JSON.stringify(Object.keys(facts))}. Without it this reset cannot clear a ` +
          "finished workout, and the card will sit in its `done` state with no Start button."
      )
    }
    for (const done of facts.recentlyFinished) {
      const del = await fetch(`/api/health/workout?id=${done.workoutId}`, { method: "DELETE" })
      if (!del.ok) {
        throw new Error(
          `reset could not delete the finished workout ${done.workoutId}: ` +
            `${del.status} ${await del.text()}. It will remove the Start button for every ` +
            "test after this one."
        )
      }
    }

    await fetch("/api/programs/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem }),
    })
  }, unit)
}

/**
 * The same, minus the enrolment. Called in `afterEach` and allowed to fail: a
 * test that has already failed must not be reported as a cleanup error.
 *
 * `since` IS WHAT MAKES THESE SPECS RE-RUNNABLE. Cleaning up only the OPEN
 * workout left every FINISHED one behind, and a finished workout dated today
 * puts the Tracking card into its `done` state — which deliberately offers
 * "See today's workout" and no Start ("offering one on a day somebody has
 * finished invites a second workout for the same session"). So the first test
 * in a file that finishes a workout removed the Start button for every test
 * after it, and for every later run that day. Four tests in
 * `programs-live-workout.spec.ts` were failing on a button the product had
 * deliberately taken away.
 *
 * A workout started at or after the instant the test began is one THIS test
 * opened — the project runs a single worker on one account, so there is
 * nothing else it could be. The seeded training year is months of workouts and
 * none of them can match, which is the property that makes this safe: an
 * earlier version of this cleanup deleted the account's whole history and
 * silently destroyed the fixture the rest of the suite is measured against.
 */
/**
 * IF YOU ARE HERE BECAUSE A TEST WAITED MINUTES FOR `start-workout`, READ THIS.
 *
 * The symptom: `today-card` is visible, the program and its lifts are on
 * screen, and `getByTestId("start-workout")` never appears, so the test times
 * out after 180 or 240 seconds on a click. The card is in its `done` state and
 * is showing "See today's workout" instead — correctly, because a workout
 * finished TODAY is still on the account. `resetAndEnroll` above does not clear
 * that: it clears the open workout and the current enrollment's logs, and a
 * finished workout from an EARLIER FILE is neither.
 *
 * The tell that separates it from a product bug, visible in the saved snapshot:
 * the card says "See today's workout" while its own History underneath says
 * "Nothing logged yet". "Done today" is decided from the account's workouts;
 * that History is scoped to the current enrollment, which the reset just
 * created. Two true statements that read as a contradiction.
 *
 * Which files can cause it, measured 2026-09-25: six of the eleven in the
 * training projects have no `afterEach` at all — `mobile/mobile-training`,
 * `programs-offline`, `programs-past-workout`, `programs-history-progress`,
 * `programs-drafts`, `health-past-workout`. Any of them that finishes a workout
 * leaves it for whatever file runs next. It surfaced through
 * `mobile-training.spec.ts:153` failing on WebKit and taking two later files
 * down with it, each spending minutes on a button that had been deliberately
 * removed.
 *
 * FIXED IN `resetAndEnroll` INSTEAD, which is the better place: the reset now
 * deletes whatever `/api/programs/today` reports as `recentlyFinished`, so a
 * row left by an earlier file is gone before the next test looks rather than
 * after. It uses the History route this function has always used, because that
 * is the only one that can reach a finished workout with no enrollment.
 *
 * The first version of this note said the fix was "a real piece of work, not a
 * line", on the reasoning that adding `cleanUp(page, since)` to those six
 * specs needed per-file judgement — `since` spares the deliberately PAST-dated
 * workouts that two of them create on purpose, and an earlier widening of this
 * cleanup once destroyed the account's history. All true, and it was the wrong
 * shape: the fix did not belong in six callers at all. Asking the server what
 * it considers recently finished, in the one function every one of those specs
 * already calls, is one place and no judgement.
 *
 * Verified: 67 of 67 in the `training` project after the change, and the two
 * specs that had been timing out at 180 and 240 seconds pass in 32 seconds and
 * 1.8 minutes.
 */
export async function cleanUp(page: Page, since?: string): Promise<void> {
  refuseUnlessTrainingAccount()
  await page.evaluate(async (from) => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      const detail = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
      for (const l of detail.logs ?? []) {
        await fetch(`/api/programs/enrollments/${e.id}/log/${l.id}`, { method: "DELETE" })
      }
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
    if (!from) return
    const recent = (await (await fetch("/api/health/workout?days=2")).json()) as {
      id: string
      started_at?: string | null
      logged_at: string
    }[]
    for (const log of recent) {
      const at = log.started_at ?? log.logged_at
      if (at && at >= from) await fetch(`/api/health/workout?id=${log.id}`, { method: "DELETE" })
    }
  }, since)
}
