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
      data: { key: "one_thing", act: "start", body: `Something to aim at ${Date.now() % 1000}` },
    })
    await page.goto(TRACKING)
    const header = page.getByTestId("season-band-one-thing")
    await header.waitFor({ state: "visible" })
    await header.click()

    await expect(page).toHaveURL(/\/dashboard\/goals\/plan\?step=one/)
    // …and carries the way back, so you are not stranded in a thirteen-step flow.
    await expect(page.getByTestId("back-link")).toHaveText(/Tracking/)
  })

  test("starting a new one moves the old one into the history", async ({ page }) => {
    const replacement = `Bench ${Date.now() % 500} kg`

    await page.goto(TRACKING)
    await page.request.post("/api/life-answers", {
      data: { key: "one_thing", act: "start", body: `The one before ${Date.now() % 999}` },
    })
    await page.goto(PLAN)
    const box = page.locator("textarea").first()
    await box.waitFor({ state: "visible" })
    const previous = await box.inputValue()

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
    if (previous.trim()) await expect(page.getByText(previous, { exact: false })).toBeVisible()
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
    await page.goto(TRACKING)
    await page.request.post("/api/life-answers", {
      data: { key: "one_thing", act: "start", body: `Quit weed ${Date.now() % 1000}`, dueOn: soon },
    })

    await page.goto(PLAN)
    const countdown = page.getByTestId("one-thing-countdown")
    await countdown.waitFor({ state: "visible" })
    const before = await countdown.textContent()

    const box = page.locator("textarea").first()
    await box.fill(`Quit weed, properly ${Date.now() % 1000}`)
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
    const body = `Quit weed for ${Date.now() % 1000} days`
    await page.goto(TRACKING)
    await page.request.post("/api/life-answers", { data: { key: "one_thing", act: "start", body } })

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

  /**
   * AT8 — A DEADLINE IN THE PAST IS REFUSED, AND SAYS WHY.
   *
   * It used to save perfectly happily, and the countdown then announced that a
   * one thing written ten seconds ago had already run its course.
   */
  test("refuses a deadline that has already been, in words", async ({ page }) => {
    await page.goto(TRACKING)
    const res = await page.request.post("/api/life-answers", {
      data: { key: "one_thing", act: "start", body: "A deadline behind me", dueOn: "2020-01-01" },
    })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/already been/)

    const nonsense = await page.request.post("/api/life-answers", {
      data: { key: "one_thing", act: "start", body: "A day that does not exist", dueOn: "2026-13-45" },
    })
    expect(nonsense.status()).toBe(400)
    expect((await nonsense.json()).error).toMatch(/not a date on the calendar/)
  })

  /**
   * A CALLER THAT NAMES NO DEADLINE IS ASKING ABOUT THE WORDS.
   *
   * The deadline joining the sameness check nearly broke this: the server fills
   * a missing one in with a rolling ninety days, so the identical request sent
   * on two different days would have looked like two different answers and
   * appended a row — the exact duplication the check exists to stop.
   *
   * Honest about its reach: this locks the contract on ONE day. The cross-day
   * case is covered by the unit test "asks only about the words when no
   * deadline is offered", which is where the rule actually lives.
   */
  test("does not append a row for the same sentence sent again with no deadline", async ({ page }) => {
    const body = `Same words twice ${Date.now() % 1000}`
    await page.goto(TRACKING)
    const first = await page.request.post("/api/life-answers", { data: { key: "one_thing", body } })
    expect(first.status()).toBe(201)

    const again = await page.request.post("/api/life-answers", { data: { key: "one_thing", body } })
    expect(again.status()).toBe(200)
    expect((await again.json()).unchanged).toBe(true)
  })
})
