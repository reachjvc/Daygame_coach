/**
 * AN OPEN WORKOUT HAS TO BE REACHABLE FROM THE SCREEN FOR TRAINING.
 *
 * Only one workout may be open at a time, so an old one refuses every Start,
 * everywhere, until it is finished or thrown away. Found on 2026-09-26, on an
 * account with two active programs and a workout left open on Wednesday:
 *
 *     /programs            a list of programs, no mention of the workout, and
 *                          no door — and one click deeper, the same
 *     /dashboard/tracking  "Wed's workout is still open · 0 sets ticked ·
 *                          Finish or discard it"
 *
 * The training screen was the one that did not say it. Not a missed case but a
 * structural one: the sentence lived in `TodayCard`, which renders only when
 * EXACTLY ONE program is running, and two active programs is a state the app
 * allows — enrollments only deactivate within a discipline, so a strength
 * program and a calisthenics one both stay live.
 *
 * TWO PROGRAMS IS THE WHOLE POINT OF THIS FILE. Every other training spec
 * enrols in one, which is why every other training spec passed.
 */

import type { Page } from "@playwright/test"
import { urlOf } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"
import { test, expect } from "./fixtures/test"
import { PHONE, cleanUp, guardTrainingAccount, resetTraining } from "./helpers/training.helper"

// Not serial: every test builds its two programs on the worker's own account
// (tests/e2e/fixtures/test.ts) from an emptied one.
guardTrainingAccount()

let startedAt = new Date().toISOString()

/** Two programs from two disciplines, so neither deactivates the other. */
async function twoProgramsRunning(page: Page): Promise<void> {
  await resetTraining(page)
  await page.evaluate(async () => {
    for (const programId of ["stronglifts-5x5", "bodyweight-foundations"]) {
      const res = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, level: "beginner", unitSystem: "kg" }),
      })
      // Loudly: a half-built fixture would make this file pass for the wrong
      // reason, by falling back to the one-program screen that always worked.
      if (!res.ok) throw new Error(`could not enrol in ${programId}: ${res.status} ${await res.text()}`)
    }
  })

  const running = await page.evaluate(
    async () => ((await (await fetch("/api/programs/enrollments")).json()) as unknown[]).length
  )
  expect(running, "this file is about the two-program screen; one program is a different screen").toBe(2)
}

/** A workout left open days ago, with nothing in it — the state that blocks Start. */
async function leaveAWorkoutOpen(page: Page): Promise<void> {
  const status = await page.evaluate(async (at) => {
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientKey: `stale-${Date.now()}`, startedAt: at }),
    })
    return res.status
  }, new Date(Date.now() - 3 * 24 * 3600_000).toISOString())
  expect(status, "the fixture has to actually open a workout").toBe(201)
}

test.describe("a workout left open, with more than one program running", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000)
    startedAt = new Date(Date.now() - 60_000).toISOString()
    await page.setViewportSize(PHONE)
    await page.goto(ROUTES.training)
    await twoProgramsRunning(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanUp(page, startedAt).catch(() => {})
  })

  test("the training screen names it and opens it", async ({ page }) => {
    await leaveAWorkoutOpen(page)
    await page.reload()

    const door = page.getByTestId("open-workout-door")
    await expect(door, "the screen for training must not be the one screen that hides it").toBeVisible({
      timeout: 30000,
    })
    // The advice for a stale one is DISCARD: finishing a three-day-old empty
    // workout writes a ten-hour session into History.
    await expect(door).toContainText(/discard/i)

    await door.click()
    await page.waitForURL(urlOf(ROUTES.liveWorkout), { timeout: 30000 })
  })

  test("and says nothing at all when no workout is open", async ({ page }) => {
    // The other direction. A door standing open onto nothing is its own defect,
    // and without this the assertion above would pass on a button that is
    // always there.
    await page.reload()
    await expect(page.getByTestId("open-workout-door")).toHaveCount(0)
  })

  test("and on the catalogue and the builder, which also offer a Start", async ({ page }) => {
    /**
     * THE CLAIM WAS "every view that offers to start something" AND THE TEST
     * WAS ONE VIEW.
     *
     * `?view=programs` (the catalogue) and `?view=build` (write your own week)
     * both offer a Start that cannot succeed while a workout is open, and
     * neither renders `StartLooseWorkout`, so neither had a door of its own.
     * They were added in response to one review and left untested until the
     * next one pointed out that deleting all three lines kept the suite green.
     */
    await leaveAWorkoutOpen(page)

    for (const view of ["programs", "build"]) {
      await page.goto(`${ROUTES.training}?view=${view}`)
      await expect(
        page.getByTestId("open-workout-door"),
        `?view=${view} offers a Start, so it has to say a workout is already open`
      ).toBeVisible({ timeout: 30000 })
    }
  })
})
