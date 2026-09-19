/**
 * WRITING UP A SESSION YOU ALREADY DID, END TO END.
 *
 * The two forms this replaces each had their own save path, and what a browser
 * has to prove is exactly what a unit test cannot: that the workout that comes
 * out the other side is DATED WHEN YOU SAID, not when you typed it, and that
 * the live screen it opens knows it is describing the past.
 *
 * The date is the whole point. A session written up on Thursday used to be
 * filed under Thursday, so a Tuesday workout was invisible on Tuesday and
 * Thursday claimed one that never happened.
 *
 * In the `training` project: it starts and deletes workouts on the shared
 * account, at 390px, one worker.
 */

import { test, expect, type Page } from "@playwright/test"

test.describe.configure({ mode: "serial" })

/** Nothing running, nothing open, one StrongLifts enrollment. */
async function reset(page: Page): Promise<void> {
  await page.goto("/programs")
  await page.evaluate(async () => {
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
    await fetch("/api/programs/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
    })
  })
}

/** Two days ago at 18:00, as a `datetime-local` string. */
function twoDaysAgoAt18(): { local: string; day: string } {
  const d = new Date(Date.now() - 2 * 24 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, "0")
  const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return { local: `${day}T18:00`, day }
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 390, height: 900 })
  await reset(page)
})

test("History opens the live screen at the time you choose, and it knows it is the past", async ({
  page,
}) => {
  const { local, day } = twoDaysAgoAt18()

  await page.goto("/programs", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "History" }).first().click()

  const openDialog = page.getByTestId("log-past-workout")
  await expect(openDialog).toBeVisible()
  await openDialog.click()

  await page.getByLabel("When the workout was").fill(local)
  /**
   * AN EMPTY WORKOUT, not a program session, and that is not a shortcut.
   *
   * A program session dated before the enrollment began is refused — see the
   * next test — and nothing in the app can backdate an enrollment, so a
   * program created by this spec cannot own a session from two days ago. The
   * past-mode behaviour being checked here is the live screen's, and it does
   * not depend on which door opened the workout.
   */
  await page.getByRole("button", { name: "Empty workout" }).click()
  await page.getByTestId("open-past-workout").click()

  // The live screen, not a form.
  await page.waitForURL(/\/programs\/live/)

  // PAST MODE: "since <day>", never a climbing minute count.
  await expect(page.getByText(/^since /i)).toBeVisible()
  await expect(page.getByText(/^\d+ min$/)).toHaveCount(0)

  // A lift you did two days ago, ticked now: no 90-second timer.
  await page.getByTestId("add-lift").click()
  await page.getByTestId("add-lift-search").fill("ZZPast Lift")
  await page.getByTestId("add-lift-own").click()
  // An invented lift starts blank, and the tick stays disabled until there are
  // numbers to save — the screen refusing to record a set nobody described.
  await page.getByLabel("Weight for set 1 in kg").fill("60")
  await page.getByLabel("Reps for set 1").fill("5")
  await page.getByTestId("tick-1").first().click()
  await expect(page.getByTestId("rest-bar")).toHaveCount(0)

  // The database has it dated two days ago, not today.
  const started = await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    return live?.startedAt as string | undefined
  })
  expect(started).toBeTruthy()
  expect(new Date(started!).toISOString().slice(0, 10)).toBe(day)
})

test("a program session from before the program started is refused, in the dialog", async ({
  page,
}) => {
  const { local } = twoDaysAgoAt18()

  await page.goto("/programs", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "History" }).first().click()
  await page.getByTestId("log-past-workout").click()
  await page.getByLabel("When the workout was").fill(local)
  await page.getByRole("button", { name: /^Workout A/ }).click()
  await page.getByTestId("open-past-workout").click()

  // Advancing a program on a session from before it existed would move weights
  // for work it never prescribed. The refusal is the server's own sentence,
  // shown where the person is looking, and the button comes back.
  await expect(page.getByRole("alert")).toContainText("before you started this program")
  await expect(page).toHaveURL(/\/programs(?!\/live)/)
  await expect(page.getByTestId("open-past-workout")).toBeEnabled()
})

test("a session dated a minute ago opens LIVE, not in past mode", async ({ page }) => {
  /**
   * The six-hour line, from the other side. An empty workout, because a
   * program session's date is bounded by when the enrollment began and nothing
   * in the app can backdate one — the refusal above is that rule, and this
   * test is about the live screen, which does not care which door opened it.
   *
   * The bulk tick is past-mode only and needs a prescription, so a program is
   * the one thing that could prove it in a browser. It is unit-tested instead,
   * in tests/unit/programs/liveScreenPastMode.test.tsx, and revert-proved.
   */
  await page.goto("/programs", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "History" }).first().click()
  await page.getByTestId("log-past-workout").click()

  /**
   * "Now" IN THE ACCOUNT'S ZONE, taken from the box's own ceiling.
   *
   * Built from the machine's clock instead, this said 19:35 while the account
   * reads that wall-clock in a zone two hours behind, so the server refused it
   * as being in the future — the dialog working exactly as it should, and a
   * test that had not noticed whose clock it was using.
   */
  const when = page.getByLabel("When the workout was")
  const nowThere = await when.getAttribute("max")
  await when.fill(nowThere!)
  await page.getByRole("button", { name: "Empty workout" }).click()
  await page.getByTestId("open-past-workout").click()
  await page.waitForURL(/\/programs\/live/)

  // Counting minutes, and no bulk tick anywhere on the screen.
  await expect(page.getByText(/^\d+ min$/)).toBeVisible()
  await expect(page.getByText(/^since /i)).toHaveCount(0)
  await expect(page.locator('[data-testid^="tick-all-"]')).toHaveCount(0)
})

test("a workout already open blocks the dialog and points at it", async ({ page }) => {
  await page.goto("/programs", { waitUntil: "networkidle" })
  await page.evaluate(async () => {
    const [e] = await (await fetch("/api/programs/enrollments")).json()
    await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId: e.id, dayId: "A", clientKey: `w-${Date.now()}` }),
    })
  })
  await page.reload({ waitUntil: "networkidle" })
  await page.getByRole("button", { name: "History" }).first().click()
  await page.getByTestId("log-past-workout").click()

  // Only one workout may be open, so this has to say so rather than fail later.
  await expect(page.getByTestId("past-blocked-by-live")).toBeVisible()
  await expect(page.getByTestId("open-past-workout")).toHaveCount(0)
})
