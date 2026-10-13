import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

/**
 * AT6 — the one thing, end to end.
 *
 * The bug this walks: what you wrote on the One Thing step never reached the
 * tracking page, because the header read a different field that also called
 * itself "the one thing". The assertion that matters is the last one — the
 * words you typed, on the other page.
 */

/**
 * Life Mastery moved to /life-mastery on 2026-09-09; /dashboard/goals/plan is
 * now a redirect that carries the step across. Built from the constant so the
 * next move does not leave this asserting an address that no longer exists.
 */
const PLAN = `${LIFE_MASTERY}?step=one`
const TRACKING = "/dashboard/tracking"

/**
 * ON THE WORKER'S OWN ACCOUNT (Phase 8). The one thing is singular, so these
 * ran one at a time while every worker shared one login; now each worker has
 * its own, and a test that needs a one thing in place starts one itself
 * through the route the button uses, so none depends on another having run.
 */
async function startOneThing(page: Page, body: string, dueOn?: string): Promise<void> {
  const res = await page.request.post("/api/life-answers", {
    data: { key: "one_thing", act: "start", body, ...(dueOn ? { dueOn } : {}) },
  })
  expect(res.status(), `could not start a one thing: ${await res.text()}`).toBe(201)
}

test.describe("the one thing", () => {
  test("what you write on the step is what the tracking page shows", async ({ page }) => {
    const written = "Quit weed for 90 days"

    await page.goto(PLAN)
    const box = page.locator("textarea").first()
    await box.waitFor({ state: "visible" })
    await box.fill(written)
    /* Blur before clicking, the way a hand does when it leaves the keyboard for
       the mouse. Clicking straight from the textarea races the blur: the blur
       updates the plan, the plan re-render remounts the box, and the click can
       land on an instance mid-swap. The product no longer loses the text when
       that happens, but the test should still do what a person does. */
    await box.blur()
    await expect(page.getByTestId("one-thing-save")).toBeEnabled()

    /* Wait for the write itself, not for a countdown.
       The first version of this test waited for "days left, until…" to appear —
       which was already on screen from the PREVIOUS one thing, so the wait
       passed instantly and the navigation raced the save. A proxy for the
       thing, not the thing. */
    const saved = page.waitForResponse(
      (r) => r.url().includes("/api/life-answers") && r.request().method() === "POST" && r.status() === 201
    )
    await page.getByTestId("one-thing-save").click()
    await saved

    await page.goto(TRACKING)
    const header = page.getByTestId("season-band-one-thing")
    await expect(header).toHaveText(written)
    await expect(page.getByTestId("season-band")).toContainText(/days left/)
  })

  test("clicking it on the tracking page returns you to the step that owns it", async ({ page }) => {
    await startOneThing(page, "Something to aim at")
    await page.goto(TRACKING)
    const header = page.getByTestId("season-band-one-thing")
    await header.waitFor({ state: "visible" })
    await header.click()

    // A client-side navigation into the largest page in the app. On a busy
    // `next dev` it took longer than the 5 s default (3 of 4 runs, 2026-10-13)
    // and always arrived within 20 s.
    await expect(page).toHaveURL(new RegExp(`${LIFE_MASTERY}\\?step=one`), { timeout: 20_000 })
    // …and carries the way back, so you are not stranded in a thirteen-step flow.
    await expect(page.getByTestId("back-link")).toHaveText(/Tracking/)
  })

  test("starting a new one moves the old one into the history", async ({ page }) => {
    const previous = "Read twelve books this season"
    const replacement = "Bench 140 kg"

    await startOneThing(page, previous)
    await page.goto(PLAN)
    const box = page.locator("textarea").first()
    await expect(box).toHaveValue(previous)

    await box.fill(replacement)
    await box.blur()
    // Replacing is now a deliberate act with its own control, and it asks first,
    // because it is the one that restarts the clock.
    await page.getByTestId("one-thing-new").click()
    const replaced = page.waitForResponse(
      (r) => r.url().includes("/api/life-answers") && r.request().method() === "POST" && r.status() === 201
    )
    await page.getByTestId("one-thing-start-new").click()
    await replaced

    // The one before it is kept, and reachable.
    await page.getByRole("button", { name: /before this/ }).click()
    await expect(page.getByText(previous, { exact: false })).toBeVisible()
  })

  /**
   * AT14 — THE WHOLE POINT, WALKED.
   *
   * "When I change something, I would still want it to be the tracking from the
   * initial first date." So: write one, reword it, and check the countdown did
   * not budge. Before chapters this was impossible — every save carried its own
   * deadline, so fixing a typo silently restarted the clock.
   */
  test("rewording it does not restart the clock", async ({ page }) => {
    // Relative to today, never a fixed date: a hardcoded deadline is a test
    // that starts failing on a particular morning for no reason anybody
    // remembers, because the server correctly refuses a day that has been.
    const soon = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
    await startOneThing(page, "Quit weed", soon)

    await page.goto(PLAN)
    const countdown = page.getByTestId("one-thing-countdown")
    await countdown.waitFor({ state: "visible" })
    const before = await countdown.textContent()

    const box = page.locator("textarea").first()
    await box.fill("Quit weed, properly")
    await box.blur()
    const save = page.getByTestId("one-thing-save")
    await expect(save).toHaveText(/Save this wording/)
    const saved = page.waitForResponse(
      (r) => r.url().includes("/api/life-answers") && r.request().method() === "POST" && r.status() === 201
    )
    await save.click()
    await saved

    // Same deadline, same number of days. And the page now says so out loud.
    await expect(countdown).toHaveText(before!)
    await expect(page.getByTestId("one-thing-since")).toContainText(/Running since/)
    // Still one chapter: a reword is not a new commitment.
    const after = await (await page.request.get("/api/life-answers")).json()
    expect(after.current.wordings).toBeGreaterThan(1)
    expect(after.current.dueOn).toBe(soon)
  })

  /**
   * AT7 — MOVING THE DEADLINE, WITHOUT REWRITING THE SENTENCE.
   *
   * The bug: "quit weed for 100 days" showing 120 days left, and no way to make
   * it 100. The save button compared the words alone and stayed grey; the
   * server compared the words alone and would have written nothing. Two silent
   * refusals over a control that looked editable.
   *
   * This walks the whole thing: change only the date, save, and read the new
   * date back off the tracking page — which is where the request was that the
   * date should end up.
   */
  test("changing only the deadline saves, and reaches the tracking page", async ({ page }) => {
    const body = "Quit weed for 100 days"
    await startOneThing(page, body)

    await page.goto(PLAN)
    const due = page.getByTestId("one-thing-due")
    await due.waitFor({ state: "visible" })

    // A day nobody could already be on: the deadline the seed defaulted to,
    // moved a week further out.
    const before = await due.inputValue()
    const moved = new Date(before + "T00:00:00Z")
    moved.setUTCDate(moved.getUTCDate() + 7)
    const after = moved.toISOString().slice(0, 10)

    // The sentence is untouched. This is the assertion the bug fails on.
    await due.fill(after)
    const save = page.getByTestId("one-thing-save")
    await expect(save).toBeEnabled()
    await expect(save).toHaveText(/Move the deadline/)
    const startedBefore = (await (await page.request.get("/api/life-answers")).json()).current.startedOn

    const saved = page.waitForResponse(
      (r) => r.url().includes("/api/life-answers") && r.request().method() === "POST" && r.status() === 201
    )
    await save.click()
    await saved

    // The date the person typed, on the page they read every day.
    const day = new Date(after + "T00:00:00Z").toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    })
    // Extending moves the deadline and keeps the day it began — that is the
    // difference between extending and starting over.
    const now = (await (await page.request.get("/api/life-answers")).json()).current
    expect(now.dueOn).toBe(after)
    expect(now.startedOn).toBe(startedBefore)

    await page.goto(TRACKING)
    await expect(page.getByTestId("season-band-countdown")).toContainText(day)
    // And the sentence did not change underneath them.
    await expect(page.getByTestId("season-band-one-thing")).toHaveText(body)
  })
})
