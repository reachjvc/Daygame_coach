import { test, expect } from "@playwright/test"

/**
 * AT6 — the one thing, end to end.
 *
 * The bug this walks: what you wrote on the One Thing step never reached the
 * tracking page, because the header read a different field that also called
 * itself "the one thing". The assertion that matters is the last one — the
 * words you typed, on the other page.
 */

const PLAN = "/dashboard/goals/plan?step=one"
const TRACKING = "/dashboard/tracking"

/**
 * Serial, because all three tests write to the same account and the one thing
 * is by definition singular: run in parallel, one test's save becomes another
 * test's "current" mid-assertion. That is not a product bug — it is three
 * people sharing one login, which is exactly what parallel workers are here.
 */
test.describe.configure({ mode: "serial" })

test.describe("the one thing", () => {
  test("what you write on the step is what the tracking page shows", async ({ page }) => {
    const written = `Quit weed for ${Date.now() % 1000} days`

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
    // Seeded through the same route the button uses, so this test does not
    // depend on the one above it having run.
    await page.goto(TRACKING)
    await page.request.post("/api/life-answers", {
      data: { key: "one_thing", body: `Something to aim at ${Date.now() % 1000}` },
    })
    await page.goto(TRACKING)
    const header = page.getByTestId("season-band-one-thing")
    await header.waitFor({ state: "visible" })
    await header.click()

    await expect(page).toHaveURL(/\/dashboard\/goals\/plan\?step=one/)
    // …and carries the way back, so you are not stranded in a thirteen-step flow.
    await expect(page.getByTestId("back-link")).toHaveText(/Tracking/)
  })

  test("replacing it moves the old one into the history", async ({ page }) => {
    const replacement = `Bench ${Date.now() % 500} kg`

    await page.goto(TRACKING)
    await page.request.post("/api/life-answers", {
      data: { key: "one_thing", body: `The one before ${Date.now() % 999}` },
    })
    await page.goto(PLAN)
    const box = page.locator("textarea").first()
    await box.waitFor({ state: "visible" })
    const previous = await box.inputValue()

    await box.fill(replacement)
    await box.blur()
    await expect(page.getByTestId("one-thing-save")).toBeEnabled()
    const replaced = page.waitForResponse(
      (r) => r.url().includes("/api/life-answers") && r.request().method() === "POST" && r.status() === 201
    )
    await page.getByTestId("one-thing-save").click()
    await replaced

    // The one before it is kept, and reachable.
    await page.getByRole("button", { name: /before this/ }).click()
    if (previous.trim()) await expect(page.getByText(previous, { exact: false })).toBeVisible()
  })
})
