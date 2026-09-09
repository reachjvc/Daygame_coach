/**
 * Training on the dashboard, in one card.
 *
 * WHAT IT REPLACES. The dashboard embedded the whole session form — every lift,
 * every set, two number boxes each — inside a panel meant to be glanced at.
 * Somebody checking their day was shown an eight-lift data-entry form they had
 * not asked for, and the one thing they might actually want (the way back into
 * a workout they were already in) was not on it at all.
 *
 * The four states are unit-tested in `trainingCardState`. This checks the two
 * that matter most actually reach a screen, and that the card stays out of the
 * way when there is nothing to say.
 */

import { test, expect } from "@playwright/test"

test.describe.configure({ mode: "serial" })

async function reset(page: import("@playwright/test").Page, enrol: boolean) {
  await page.goto("/programs")
  await page.evaluate(async (withProgram) => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
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

test("names today's session and offers a way in", async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 390, height: 900 })
  await reset(page, true)

  await page.goto("/dashboard/tracking", { waitUntil: "networkidle" })
  const card = page.getByTestId("training-card")
  await expect(card).toBeVisible({ timeout: 20000 })
  const text = await card.innerText()
  expect(text, "the program is named").toContain("StrongLifts")
  expect(text, "and so is today").toMatch(/Today:/)
  expect(text, "with how much is in it").toMatch(/lifts?/)
  await expect(page.getByTestId("training-card-start")).toBeVisible()
})

test("a running workout beats today's session, and offers the way back in", async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 390, height: 900 })
  await reset(page, true)

  // Start one, the way the training screen does.
  await page.evaluate(async () => {
    const [enrollment] = await (await fetch("/api/programs/enrollments")).json()
    await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId: enrollment.id, clientKey: "card-test-key-1234" }),
    })
  })

  await page.goto("/dashboard/tracking", { waitUntil: "networkidle" })
  const card = page.getByTestId("training-card")
  await expect(card).toBeVisible({ timeout: 20000 })
  await expect(card).toContainText(/Workout in progress/)
  await expect(page.getByTestId("training-card-resume")).toBeVisible()
  // Somebody standing in a gym needs the way back in, not today's plan again.
  await expect(page.getByTestId("training-card-start")).toHaveCount(0)

  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
  })
})

test("stays off the dashboard entirely when there is nothing to say", async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 390, height: 900 })
  await reset(page, false)

  await page.goto("/dashboard/tracking", { waitUntil: "networkidle" })
  await page.waitForTimeout(2500)
  // An empty training card on a dashboard is clutter, not information.
  await expect(page.getByTestId("training-card")).toHaveCount(0)
})
