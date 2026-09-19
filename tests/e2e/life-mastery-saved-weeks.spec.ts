/**
 * A training week built in the Life Mastery plan follows you.
 *
 * THE COMPLAINT THIS ANSWERS. A week you designed here existed only while the
 * page was open. Close the tab before pressing "Start tracking this" and it was
 * gone; it lived in this browser's local storage and nowhere else, so it could
 * not follow you to another device and nothing else in the app could see it.
 * Separately, "saved workouts" on the health screen were a different thing
 * entirely that could not be started as a program at all.
 *
 * There is one saved week now. It lives on the account, it is listed here, it
 * loads back into the builder, and it can be started as a program under its own
 * name rather than as "Your own program".
 */

import { test, expect } from "@playwright/test"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

test.describe.configure({ mode: "serial" })

const WEEK = {
  kind: "linear_rotation",
  days: [
    {
      id: "mon",
      label: "Push",
      weekday: 1,
      exercises: [
        {
          id: "bench",
          name: "Bench Press",
          metricType: "load",
          scheme: { kind: "linear", sets: 3, reps: 5 },
          progression: { kind: "none" },
        },
      ],
    },
  ],
}

/**
 * Open the builder: Templates → Build my own.
 *
 * BY NAME, NOT BY NUMBER. This went through the `/dashboard/goals/plan`
 * redirect and clicked `/^5/` — the rail button whose accessible name begins
 * with its position. One step inserted anywhere before Templates and this spec
 * silently opens a different screen and fails somewhere else entirely.
 */
async function openBuilder(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${LIFE_MASTERY}?step=templates`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: /Templates/ }).first().click()
  await page.getByRole("button", { name: /build my own/i }).first().click()
  await expect(page.getByText(/Your saved weeks/i)).toBeVisible({ timeout: 20000 })
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto("/programs")
  await page.evaluate(async () => {
    for (const d of await (await fetch("/api/programs/drafts")).json()) {
      await fetch(`/api/programs/drafts/${d.id}`, { method: "DELETE" })
    }
  })
})

test.afterEach(async ({ page }) => {
  await page
    .evaluate(async () => {
      for (const d of await (await fetch("/api/programs/drafts")).json()) {
        await fetch(`/api/programs/drafts/${d.id}`, { method: "DELETE" })
      }
    })
    .catch(() => {})
})

test("a saved week is listed here and loads back into the builder", async ({ page }) => {
  await page.goto("/programs")
  await page.evaluate(async (week) => {
    await fetch("/api/programs/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Monday Push",
        schedule: week,
        unitSystem: "kg",
        workingWeights: { bench: 60 },
      }),
    })
  }, WEEK)

  await openBuilder(page)

  // Anchored: the row also has a "Delete Monday Push" button beside it.
  // It is listed, with what is actually in it.
  const row = page.getByTestId("saved-weeks-list").getByRole("button", { name: /^Monday Push/ })
  await expect(row).toBeVisible()
  await expect(row).toContainText("1 day")
  await expect(row).toContainText("1 lift")

  // And loading it puts the week back in the builder.
  await row.click()
  await expect(page.getByText(/Bench Press/i).first()).toBeVisible({ timeout: 10000 })
  // The day's own name is back in its box. Checked by value rather than by
  // text, because a controlled input does not put its value in the markup.
  const dayNamed = await page
    .locator("input")
    .evaluateAll((els) => els.some((e) => (e as HTMLInputElement).value === "Push"))
  expect(dayNamed, "the day keeps the name it was saved under").toBe(true)
})

test("saving a week keeps it after the page is closed and reopened", async ({ page }) => {
  await page.goto("/programs")
  await page.evaluate(async (week) => {
    await fetch("/api/programs/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Seed", schedule: week, unitSystem: "kg", workingWeights: { bench: 60 } }),
    })
  }, WEEK)

  await openBuilder(page)
  await page.getByTestId("saved-weeks-list").getByRole("button", { name: /^Seed/ }).click()
  await expect(page.getByText(/Bench Press/i).first()).toBeVisible({ timeout: 10000 })

  /**
   * SAVE THE LOADED WEEK UNDER A SECOND NAME — which is "Save as new".
   *
   * "Save this week" now means the week you opened, by id. It used to match on
   * the TYPED NAME, so renaming the week on screen quietly made a second one
   * and left the original behind with nothing saying which you were looking
   * at. "Save as new" is the button that means what this test means, and it is
   * offered only while something is loaded.
   */
  await page.getByLabel(/Name for the week you are saving/i).fill("Kept Week")
  await page.getByRole("button", { name: /save as new/i }).click()
  await expect(page.getByText(/Saved as "Kept Week"/)).toBeVisible({ timeout: 20000 })

  /**
   * THE WHOLE POINT: a full reload, which throws away everything this browser
   * was holding. What comes back is what the account holds.
   */
  await openBuilder(page)
  await expect(
    page.getByTestId("saved-weeks-list").getByRole("button", { name: /^Kept Week/ })
  ).toBeVisible({ timeout: 20000 })
})

test("a week that is not finished can still be saved", async ({ page }) => {
  await page.goto("/programs")
  const status = await page.evaluate(async () => {
    // A day with nothing in it yet. Building a week over two sittings is the
    // ordinary case, and refusing to SAVE one is how the builder used to lose
    // everything when the tab was closed.
    const res = await fetch("/api/programs/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Half Built",
        schedule: { kind: "linear_rotation", days: [{ id: "d1", label: "Monday", exercises: [] }] },
      }),
    })
    return res.status
  })
  expect(status).toBe(201)

  await openBuilder(page)
  const row = page.getByTestId("saved-weeks-list").getByRole("button", { name: /^Half Built/ })
  await expect(row).toBeVisible()
  await expect(row, "and it says what is still missing").toContainText("0 lifts")
})

test("a started week appears under its own name, not \"Your own program\"", async ({ page }) => {
  await page.goto("/programs")
  // Clear any running self-built program, then save and start a named week.
  const started = await page.evaluate(async (week) => {
    // A WORKOUT LEFT OPEN NOW REFUSES THE END. `end_enrollment` will not stop a
    // program somebody is mid-workout on, so a spec that left one open used to
    // leave this program running too — and the next spec found it and failed
    // somewhere else entirely. The same two lines the other training specs have.
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      if (e.program_id === "custom") {
        await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      }
    }
    const made = await (
      await fetch("/api/programs/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tuesday Club",
          schedule: week,
          unitSystem: "kg",
          workingWeights: { bench: 60 },
        }),
      })
    ).json()
    const res = await fetch(`/api/programs/drafts/${made.id}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
    return res.status
  }, WEEK)
  expect(started).toBe(201)

  await page.goto("/programs", { waitUntil: "networkidle" })
  const body = await page.locator("body").innerText()
  expect(body, "the week is named by what you called it").toContain("Tuesday Club")
  expect(body, "and never by the shared shell it is built on").not.toContain("Your own program")

  // Clean up the program this test started.
  await page.evaluate(async () => {
    // A WORKOUT LEFT OPEN NOW REFUSES THE END. `end_enrollment` will not stop a
    // program somebody is mid-workout on, so a spec that left one open used to
    // leave this program running too — and the next spec found it and failed
    // somewhere else entirely. The same two lines the other training specs have.
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      if (e.program_id === "custom") {
        await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      }
    }
  })
})
