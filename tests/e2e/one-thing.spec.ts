import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"

/**
 * AT6 — the one thing, end to end.
 *
 * The bug this walks: what you wrote on the One Thing step never reached the
 * tracking page, because the header read a different field that also called
 * itself "the one thing". The assertion that matters is the last one — the
 * words you typed, on the other page.
 *
 * SINCE PHASE 3 OF Plans/life-plan-rebuild.md the one thing is the sentence of
 * the plan's current season, saved with the plan (`PATCH /api/life-plan`), and
 * the old `/api/life-answers` route is unused. These tests read the season row
 * back from the account; until they did, they waited for a request to the old
 * route that the page no longer sends, and every one of them timed out.
 */

/**
 * Life Mastery moved to /life-mastery on 2026-09-09; /dashboard/goals/plan is
 * now a redirect that carries the step across. Built from the constant so the
 * next move does not leave this asserting an address that no longer exists.
 */
const PLAN = `${ROUTES.plan}?step=one`
const TRACKING = ROUTES.tracking

const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)

/**
 * ON THE WORKER'S OWN ACCOUNT (Phase 8). The one thing is singular, so these
 * ran one at a time while every worker shared one login; now each worker has
 * its own, and a test that needs a one thing in place puts a season holding it
 * on the account, so none depends on another having run.
 */
async function startOneThing(page: Page, userId: string, sentence: string, endsOn = isoDay(90)): Promise<void> {
  await seedLifePlan(page, userId, {
    version: 1,
    seq: 10,
    northStar: "E2E: a plan with a north star.",
    season: { id: "s1", startedOn: isoDay(-10), endsOn, sentence },
  })
}

interface SeasonOnAccount { sentence: string; started_on: string; ends_on: string | null; ended_on: string | null }

async function seasons(page: Page): Promise<SeasonOnAccount[]> {
  const res = await page.request.get("/api/life-plan")
  const body = (await res.json()) as { plan: { seasons: SeasonOnAccount[] } | null }
  return body.plan?.seasons ?? []
}

const current = async (page: Page) => (await seasons(page)).find((s) => s.ended_on === null) ?? null

test.describe("the one thing", () => {
  test("what you write on the step is what the tracking page shows", async ({ page, account }) => {
    const written = "Quit weed for 90 days"
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })

    await page.goto(PLAN)
    const box = page.getByRole("textbox", { name: "Say it in your own words" })
    await box.fill(written)
    /* Blur before clicking, the way a hand does when it leaves the keyboard for
       the mouse. Clicking straight from the textarea races the blur: the blur
       updates the plan, the plan re-render remounts the box, and the click can
       land on an instance mid-swap. The product no longer loses the text when
       that happens, but the test should still do what a person does. */
    await box.blur()
    await expect(page.getByTestId("one-thing-save")).toBeEnabled()
    await page.getByTestId("one-thing-save").click()

    /* Wait for the write itself, not for a countdown: a countdown can already
       be on screen from an earlier one thing, and the navigation then races
       the save. A proxy for the thing, not the thing. */
    await expect.poll(async () => (await current(page))?.sentence, { timeout: 15_000 }).toBe(written)

    await page.goto(TRACKING)
    const header = page.getByTestId("season-band-one-thing")
    await expect(header).toHaveText(written)
    await expect(page.getByTestId("season-band")).toContainText(/days left/)
  })

  test("clicking it on the tracking page returns you to the step that owns it", async ({ page, account }) => {
    await startOneThing(page, account.id, "Something to aim at")
    await page.goto(TRACKING)
    const header = page.getByTestId("season-band-one-thing")
    await header.waitFor({ state: "visible" })
    await header.click()

    // A client-side navigation into the largest page in the app. On a busy
    // `next dev` it took longer than the 5 s default (3 of 4 runs, 2026-10-13)
    // and always arrived within 20 s. `one` is the Season step's old name.
    await expect(page).toHaveURL(new RegExp(`${ROUTES.plan}\\?step=(one|focus)`), { timeout: 20_000 })
    // …and carries the way back, so you are not stranded in a long flow.
    await expect(page.getByTestId("back-link")).toHaveText(/Tracking/)
  })

  test("starting a new one moves the old one into the history", async ({ page, account }) => {
    const previous = "Read twelve books this season"
    const replacement = "Bench 140 kg"

    await startOneThing(page, account.id, previous)
    await page.goto(PLAN)
    const box = page.getByRole("textbox", { name: "Say it in your own words" })
    await expect(box).toHaveValue(previous)

    await box.fill(replacement)
    await box.blur()
    // Replacing is now a deliberate act with its own control, and it asks first,
    // because it is the one that restarts the clock.
    await page.getByTestId("one-thing-new").click()
    await page.getByTestId("one-thing-start-new").click()

    await expect.poll(async () => {
      const all = await seasons(page)
      return { now: all.find((s) => s.ended_on === null)?.sentence, past: all.filter((s) => s.ended_on !== null).map((s) => s.sentence) }
    }, { timeout: 15_000 }).toEqual({ now: replacement, past: [previous] })

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
  test("rewording it does not restart the clock", async ({ page, account }) => {
    // Relative to today, never a fixed date: a hardcoded deadline is a test
    // that starts failing on a particular morning for no reason anybody
    // remembers, because the page correctly refuses a day that has been.
    const soon = isoDay(60)
    await startOneThing(page, account.id, "Quit weed", soon)
    const startedOn = (await current(page))!.started_on

    await page.goto(PLAN)
    const countdown = page.getByTestId("one-thing-countdown")
    await countdown.waitFor({ state: "visible" })
    const before = await countdown.textContent()

    const box = page.getByRole("textbox", { name: "Say it in your own words" })
    await box.fill("Quit weed, properly")
    await box.blur()
    const save = page.getByTestId("one-thing-save")
    await expect(save).toHaveText(/Save this wording/)
    await save.click()

    // Same season: the same start and the same deadline, under the new words.
    await expect.poll(async () => {
      const now = await current(page)
      return now && { sentence: now.sentence, started_on: now.started_on, ends_on: now.ends_on }
    }, { timeout: 15_000 }).toEqual({ sentence: "Quit weed, properly", started_on: startedOn, ends_on: soon })

    // Same number of days. And the page says it is still running.
    await expect(countdown).toHaveText(before!)
    await expect(page.getByTestId("one-thing-since")).toContainText(/Running since/)
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
  test("changing only the deadline saves, and reaches the tracking page", async ({ page, account }) => {
    const body = "Quit weed for 100 days"
    await startOneThing(page, account.id, body)
    const startedBefore = (await current(page))!.started_on

    await page.goto(PLAN)
    const due = page.getByTestId("one-thing-due")
    await due.waitFor({ state: "visible" })

    // A day nobody could already be on: the deadline the seed set, moved a
    // week further out.
    const before = await due.inputValue()
    const moved = new Date(before + "T00:00:00Z")
    moved.setUTCDate(moved.getUTCDate() + 7)
    const after = moved.toISOString().slice(0, 10)

    // The sentence is untouched. This is the assertion the bug fails on.
    await due.fill(after)
    const save = page.getByTestId("one-thing-save")
    await expect(save).toBeEnabled()
    await expect(save).toHaveText(/Move the deadline/)
    await save.click()

    // Extending moves the deadline and keeps the day it began — that is the
    // difference between extending and starting over.
    await expect.poll(async () => {
      const now = await current(page)
      return now && { ends_on: now.ends_on, started_on: now.started_on }
    }, { timeout: 15_000 }).toEqual({ ends_on: after, started_on: startedBefore })

    // The date the person typed, on the page they read every day.
    const day = new Date(after + "T00:00:00Z").toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    })
    await page.goto(TRACKING)
    await expect(page.getByTestId("season-band-countdown")).toContainText(day)
    // And the sentence did not change underneath them.
    await expect(page.getByTestId("season-band-one-thing")).toHaveText(body)
  })
})
