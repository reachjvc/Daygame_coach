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

test("the two doors name the same session and the same other program", async ({ page }) => {
  /**
   * THE WALK'S §2 DISAGREEMENT, from both ends at once.
   *
   * With more than one program running, Tracking showed one card — StrongLifts'
   * session — while /programs showed an inventory, and nothing said the two
   * were describing the same account. `chooseCardEnrollment` is now the one
   * owner of "which program is the card about", but each surface was tested
   * alone: no test opened both screens on one state and asked whether they
   * agreed.
   *
   * Two DISCIPLINES on purpose. Starting a second program of the same kind
   * pauses the first, so a second strength program would leave one running and
   * prove nothing about two.
   */
  await reset(page, true)
  const second = await page.evaluate(async () => {
    const res = await fetch("/api/programs/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: "couch-to-5k", level: "beginner", unitSystem: "kg" }),
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  })
  expect(second.status, "premise: a second discipline must start alongside the first").toBe(201)

  try {
    await openTracking(page)
    const card = page.getByTestId(CARD)
    await expect(card).toBeVisible({ timeout: 30000 })

    // Which program the card decided to be about, and which it names as the other.
    const chosen = card.getByTestId("training-card-program")
    await expect(chosen).toBeVisible()
    const chosenHref = (await chosen.getAttribute("href")) ?? ""
    const chosenId = new URL(chosenHref, "http://x").searchParams.get("program")
    expect(chosenId, "the card names a program, so its link carries that program").toBeTruthy()

    const other = card.locator('[data-testid^="also-running-"]').first()
    await expect(other, "two programs running, so the card names the other one").toBeVisible()
    const otherId = (await other.getAttribute("data-testid"))!.replace("also-running-", "")
    expect(otherId).not.toBe(chosenId)

    /**
     * THE OTHER DOOR. `/programs` lists both, and the ids are the same two —
     * this is the assertion that the two surfaces are reading one answer rather
     * than each working it out.
     */
    await page.goto("/programs", { waitUntil: "networkidle" })
    await expect(page.getByTestId(`running-${chosenId}`)).toBeVisible({ timeout: 30000 })
    await expect(page.getByTestId(`running-${otherId}`)).toBeVisible()

    /**
     * AND THE DEEP LINK LANDS ON THE SESSION, not back on the inventory. The
     * card's label row went to `/programs` full stop, so tapping the name of the
     * program it had just told you about asked you to pick it again.
     */
    await page.goto(chosenHref, { waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 30000 })
    await expect(page).toHaveURL(new RegExp(`program=${chosenId}`))
  } finally {
    await reset(page, false)
  }
})
