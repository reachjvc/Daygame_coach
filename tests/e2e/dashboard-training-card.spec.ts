/**
 * THE TRACKING PAGE'S DOOR INTO TRAINING.
 *
 * The owner's complaint about this page was that it is "just not functional at
 * all". It was, literally: with no program running the card returned nothing,
 * so the one screen meant to be the way into training had no way in. While
 * loading it returned nothing too, so it appeared late and then FLIPPED from
 * Start to Resume when the last of its three requests landed.
 *
 * Every state is unit-tested in `trainingCardState`. What a browser has to
 * prove is different, and is what this file does:
 *
 *   - the card is on the page in the states that used to render nothing
 *   - the button is REAL, and pressing it opens a real workout
 *   - it says the right thing after you have trained, rather than "Start"
 *   - a failed door says so, and offers no Start it cannot honour
 *
 * In the `training` project: it starts and ends programs on the shared account.
 */

import { test, expect, type Page } from "@playwright/test"
import { TRAINING_STATE } from "../../playwright.config"

test.describe.configure({ mode: "serial" })

const CARD = "training-card"

/** Nothing running, nothing open, and optionally one program enrolled. */
async function reset(page: Page, enrol: boolean): Promise<void> {
  await page.goto("/programs")
  await page.evaluate(async (withProgram) => {
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
    if (withProgram) {
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
    }
  }, enrol)
}

async function openTracking(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto("/dashboard/tracking", { waitUntil: "networkidle" })
}

test.beforeEach(() => {
  // The door waits on the real programs API, and this project runs one worker.
  test.setTimeout(180000)
})

test("with a program running it names today's session and its lifts", async ({ page }) => {
  await reset(page, true)
  await openTracking(page)

  const card = page.getByTestId(CARD)
  await expect(card).toBeVisible({ timeout: 30000 })
  // BY NAME. "3 lifts" does not tell anybody whether to bring their belt.
  await expect(card).toContainText("Squat")
  await expect(card).not.toContainText(/\d+ lifts/)

  // EXACTLY ONE BUTTON on the card, and it is a real button — not a link
  // dressed as one, which is what the count is here to catch.
  await expect(card.locator("button")).toHaveCount(1)
  await expect(page.getByTestId("training-card-start")).toBeVisible()
})

test("with NO program the card is still there, with a way in", async ({ page }) => {
  await reset(page, false)
  await openTracking(page)

  // THE COMPLAINT. This rendered nothing at all.
  const card = page.getByTestId(CARD)
  await expect(card).toBeVisible({ timeout: 30000 })
  await expect(card).toContainText(/No program running/i)
  await expect(page.getByTestId("training-card-start")).toBeVisible()
})

test("pressing Start opens a real workout, and the card then offers Resume", async ({ page }) => {
  await reset(page, true)
  await openTracking(page)

  await page.getByTestId("training-card-start").click()

  // It really started one: the live screen, with a workout on the server.
  await page.waitForURL(/\/programs\/live/, { timeout: 30000 })
  const live = await page.evaluate(async () => await (await fetch("/api/workouts/live")).json())
  expect(live, "a workout should be open on the server").toBeTruthy()

  // And the card now offers the way back in rather than a second Start.
  await openTracking(page)
  await expect(page.getByTestId("training-card-resume")).toBeVisible({ timeout: 30000 })
  await expect(page.getByTestId("training-card-start")).toHaveCount(0)
})

test("after finishing, it says you trained rather than offering Start again", async ({ page }) => {
  await reset(page, true)
  await openTracking(page)
  await page.getByTestId("training-card-start").click()
  await page.waitForURL(/\/programs\/live/, { timeout: 30000 })

  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    await fetch(`/api/workouts/${live.id}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intensity: 3 }),
    })
  })

  await openTracking(page)
  const card = page.getByTestId(CARD)
  await expect(card).toContainText(/Trained today/i, { timeout: 30000 })
  // It used to say Start here, inviting a second workout on a day you finished.
  await expect(page.getByTestId("training-card-start")).toHaveCount(0)
  await expect(page.getByTestId("training-card-see")).toBeVisible()
})

test("when the door cannot be loaded the card says so and offers no Start", async ({ page }) => {
  await reset(page, true)
  await page.route("**/api/programs/today", (route) => route.fulfill({ status: 500, body: "{}" }))
  await openTracking(page)

  await expect(page.getByTestId("training-card-unavailable")).toBeVisible({ timeout: 30000 })
  // A Start here could collide with a workout this card cannot currently see.
  await expect(page.getByTestId("training-card-start")).toHaveCount(0)
  // And it must never read as "you have no program", which is a claim.
  await expect(page.getByTestId(CARD)).not.toContainText(/No program/i)
})

test.afterAll(async ({ browser }) => {
  /**
  * THE SAME ACCOUNT ON ANOTHER DEVICE — which is the whole claim. This
  * said `.auth/user.json` and passed only while the training projects
  * shared that account; once they moved to their own it became a second
  * browser signed in as a DIFFERENT PERSON, which proves nothing about
  * what a phone and a laptop see.
  */
  const page = await browser.newPage({ storageState: TRAINING_STATE })
  await reset(page, false)
  await page.close()
})
