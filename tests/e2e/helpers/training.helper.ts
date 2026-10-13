/**
 * EVERY TRAINING TEST STARTS FROM A KNOWN STATE.
 *
 * These functions lived inside `programs-live-workout.spec.ts`, and the
 * second browser spec for this screen needed exactly the same pair. Two copies
 * of "clean the account" is two chances to clean it differently — and a spec
 * that half-cleans leaves the next one starting from a workout it did not
 * open, failing for a reason that has nothing to do with the code under test.
 *
 * SINCE PHASE 8 the account is the worker's own (tests/e2e/fixtures/test.ts),
 * so nothing here protects another FILE any more. What it still protects is the
 * next TEST: one worker runs its tests one after another on one account, and
 * with `fullyParallel` the test before this one may be from any training file.
 * So a test resets at its start (`resetTraining`, `resetAndEnroll`) rather than
 * trusting whoever ran before it to have tidied up.
 *
 * Everything runs IN THE PAGE, through the real routes with the real session,
 * rather than around them through a service key. A fixture that writes rows the
 * app would refuse is a fixture that tests nothing.
 */

import { test, type Page } from "@playwright/test"
import { isOnFixtureAccount } from "../fixtures/test"

/**
 * EVERYTHING BELOW DELETES EVERY ENROLLMENT AND OPEN WORKOUT ON WHATEVER
 * ACCOUNT THE PAGE IS SIGNED IN AS, so it refuses any account but one
 * tests/e2e/fixtures/test.ts made for this worker in the local test backend.
 * Wiping that takes nothing from a person.
 *
 * It used to accept a shared "training account" in the live project, and
 * before 2026-09-23 the account the goals specs and hand-checking used, so
 * `npm run test:e2e` once took somebody's program away mid-walkthrough. Every
 * spec is on the fixture since Phase 8; this stays so a spec that ever signs in
 * some other way fails here, before it deletes anything.
 */
function refuseUnlessFixtureAccount(): void {
  if (isOnFixtureAccount()) return
  throw new Error(
    `This helper wipes the account clean and runs only on an account tests/e2e/fixtures/test.ts made.\n` +
      `Project "${test.info().project.name}" is signed in as ${String(test.info().project.use.storageState)}.\n` +
      `Import \`test\` from fixtures/test, and do not set a storageState of your own.`
  )
}

/**
 * THE SAME GUARD, FOR A FILE THAT DELETES ROWS ITSELF.
 *
 * `resetAndEnroll` and `cleanUp` check the account before they touch anything.
 * A spec that runs its own `fetch(…, { method: "DELETE" })` loops inside
 * `page.evaluate` passes through nothing that could refuse, so it calls this
 * once at the top, and every test in the file fails before its body runs if it
 * is signed in as anybody else. `tests/unit/trainingSpecsGuarded.test.ts` fails
 * when the next such spec forgets.
 */
export function guardTrainingAccount(): void {
  test.beforeEach(() => refuseUnlessFixtureAccount())
}

/** A phone, because that is where a workout is logged. */
export const PHONE = { width: 390, height: 844 }

/**
 * No program, no workout open, nothing finished in the last two days, no ended
 * programs. The page must already be on the app's origin (the routes are
 * called relative to it).
 *
 * `permanent=1` follows the soft delete: an ended enrollment still answers
 * "what are you running", so leaving it behind makes the next test's Start
 * ambiguous. ENDED ones from earlier tests go too: starting a second program
 * of one discipline ends the first, and a past program left by the test before
 * this one lengthens the page and fails "nothing was archived" on its own.
 *
 * IT CHECKS ITS OWN WORK, at the end, by asking the same routes the screens
 * read. A reset that quietly half-ran is a test that fails three minutes later
 * on a Start button the product had correctly taken away.
 */
export async function resetTraining(page: Page): Promise<void> {
  refuseUnlessFixtureAccount()
  const left = await page.evaluate(async () => {
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
    for (const e of await (await fetch("/api/programs/enrollments?past=1")).json()) {
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
     * DRAINED, not read once. `recentlyFinished` is what the CARD needs to
     * choose its state, and the server caps it, so a single pass can leave an
     * older finished workout still putting the card in `done`.
     * `mobile-training.spec.ts` measured exactly that with its own copy of
     * this loop, which this one now replaces.
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
    const recentlyFinished = async (): Promise<{ workoutId: string }[]> => {
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
      return facts.recentlyFinished
    }
    for (let pass = 0; pass < 12; pass++) {
      const done = await recentlyFinished()
      if (done.length === 0) break
      for (const d of done) {
        const del = await fetch(`/api/health/workout?id=${d.workoutId}`, { method: "DELETE" })
        if (!del.ok) {
          throw new Error(
            `reset could not delete the finished workout ${d.workoutId}: ` +
              `${del.status} ${await del.text()}. It will remove the Start button for every ` +
              "test after this one."
          )
        }
      }
    }

    // THE POSTCONDITION, asked of the routes the screens read.
    const problems: string[] = []
    if (await (await fetch("/api/workouts/live")).json()) problems.push("a workout is still open")
    const active = (await (await fetch("/api/programs/enrollments")).json()) as unknown[]
    if (active.length) problems.push(`${active.length} program(s) still running`)
    const past = (await (await fetch("/api/programs/enrollments?past=1")).json()) as unknown[]
    if (past.length) problems.push(`${past.length} ended program(s) still listed`)
    const finished = await recentlyFinished()
    if (finished.length) problems.push(`${finished.length} workout(s) finished in the last 48 hours`)
    return problems
  })
  if (left.length) {
    throw new Error(`the training reset did not leave the account empty: ${left.join("; ")}`)
  }
}

/**
 * One program — StrongLifts 5×5 at beginner, in `unit` — no workout open, no
 * recent history. `resetTraining`, then the enrolment, which is refused loudly:
 * a test that thinks a program is running when none is fails on a screen it
 * did not mean to measure.
 */
export async function resetAndEnroll(page: Page, unit: "kg" | "lb" = "kg"): Promise<void> {
  await resetTraining(page)
  const refused = await page.evaluate(async (unitSystem) => {
    const res = await fetch("/api/programs/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem }),
    })
    return res.ok ? null : `${res.status} ${await res.text()}`
  }, unit)
  if (refused) throw new Error(`could not enrol in StrongLifts 5×5 after the reset: ${refused}`)
}

/**
 * What one test did, undone: the open workout, the programs, and — given
 * `since` — the workouts it finished. Called in `afterEach` and allowed to
 * fail: a test that has already failed must not be reported as a cleanup error.
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
 * opened — a worker runs one test at a time on an account nobody else uses
 * (Phase 8), so there is nothing else it could be. Older history, including a
 * test's deliberately PAST-dated seed, cannot match. (An earlier version of
 * this cleanup deleted a shared account's whole history and with it the
 * fixture the rest of the suite was measured against.)
 *
 * Since `resetTraining` runs at the start of every test, this is a courtesy to
 * the next test in the worker rather than what it depends on.
 */
/**
 * IF YOU ARE HERE BECAUSE A TEST WAITED MINUTES FOR `start-workout`, READ THIS.
 *
 * The symptom: `today-card` is visible, the program and its lifts are on
 * screen, and `getByTestId("start-workout")` never appears, so the test times
 * out after 180 or 240 seconds on a click. The card is in its `done` state and
 * is showing "See today's workout" instead — correctly, because a workout
 * finished TODAY is still on the account. `resetAndEnroll` above did not clear
 * that: it cleared the open workout and the current enrollment's logs, and a
 * finished workout from an EARLIER FILE is neither. (It does now — below.)
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
  refuseUnlessFixtureAccount()
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
